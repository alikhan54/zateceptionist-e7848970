/**
 * Phase 2B — usePulseData
 *
 * Fetches per-tenant metrics from Supabase in parallel and overlays them on
 * top of the hardcoded SECTIONS / CATHEDRAL_STATS fallback. Any query that
 * fails or whose column doesn't exist falls back silently to the hardcoded
 * value — Pulse always renders, even on a brand-new tenant or schema mismatch.
 *
 * Multi-tenant safety:
 * - Every Supabase query has an explicit .eq('tenant_id', X). Never relies
 *   on RLS alone.
 * - tenant_id format (UUID vs SLUG) chosen per-table from the verified
 *   mapping in docs/NEURAL_CORE_PHASE1.md (Phase 2B section).
 * - Read-only. Zero writes, zero schema changes, zero n8n calls.
 * - 5s global timeout — Pulse never blocks the UI on a slow round-trip.
 * - fetchedRef debounces — one fetch per isOpen flip; opening/closing
 *   Pulse repeatedly does NOT hammer the database.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import {
  CATHEDRAL_STATS as FALLBACK_STATS,
  SECTIONS as FALLBACK_SECTIONS,
  type CathedralStat,
  type PulseSection,
} from "./sectionsRegistry";

export interface PulseData {
  sections: PulseSection[];
  heroStats: CathedralStat[];
  loading: boolean;
  error: string | null;
}

// ---------- helpers --------------------------------------------------------

const TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Pulse query batch timeout after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

function timeAgo(spec: "1d" | "24h" | "7d"): string {
  const now = Date.now();
  const ms =
    spec === "7d" ? 7 * 86400000 : spec === "1d" ? 86400000 : 86400000;
  return new Date(now - ms).toISOString();
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Pretty label for tenantConfig.industry (raw values are snake_case). */
function formatIndustry(s: string | null | undefined): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    technology: "Technology",
    real_estate: "Real Estate",
    healthcare: "Healthcare",
    healthcare_clinic: "Clinic",
    healthcare_staffing: "Healthcare",
    restaurant: "Restaurant",
    salon: "Salon",
    banking_collections: "Banking",
    construction_estimation: "Construction",
    youtube_agency: "YouTube",
    legal: "Legal",
    fitness: "Fitness",
    education: "Education",
    automotive: "Automotive",
    professional: "Professional",
    retail: "Retail",
    laboratory_instruments: "Lab Instruments",
    roofing: "Roofing",
    forex_trading: "Forex",
    general: "General",
  };
  if (map[s]) return map[s];
  return s
    .split("_")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Wrapped count query with a single fail-safe try/catch. Returns null on any
 *  error (column missing, table missing, RLS denial, network). The caller
 *  treats null as "use fallback". */
async function countQuery(
  table: string,
  eqFilters: Record<string, unknown>,
  opts: { in?: Record<string, unknown[]>; gte?: Record<string, string> } = {},
): Promise<number | null> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    for (const [k, v] of Object.entries(eqFilters)) {
      q = q.eq(k, v as never);
    }
    if (opts.in) {
      for (const [k, vs] of Object.entries(opts.in)) {
        q = q.in(k, vs as never[]);
      }
    }
    if (opts.gte) {
      for (const [k, v] of Object.entries(opts.gte)) {
        q = q.gte(k, v);
      }
    }
    const { count, error } = await q;
    if (error) {
      console.warn(`[Pulse] ${table} query failed:`, error.message);
      return null;
    }
    return count ?? 0;
  } catch (e) {
    console.warn(
      `[Pulse] ${table} threw:`,
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

// ---------- the fetch ------------------------------------------------------

interface FetchInputs {
  tenantSlug: string;
  tenantUuid: string | null;
  tenantIndustry: string | null;
  /** Phase 2B.1 — channel-flag bag from tenantConfig, used for the
   *  derived "channels active" metric (no Supabase query). */
  channelsCount: number;
}

interface MetricUpdate {
  /** "sectionId|metricLabel" — must match exactly. */
  key: string;
  /** Present on successful query. Sets metric.value, clears notConfigured. */
  value?: string;
  /** Phase 2B.1 — true when the query was attempted and failed (null result).
   *  The merger sets metric.notConfigured = true so the renderer shows "—". */
  notConfigured?: boolean;
}

// ARR helper removed — ltv_cac_snapshots has no `arr` column. The metric stays
// notConfigured via the registry default. If we ever need ARR, derive it from
// SUM(deals.value) WHERE stage='closed_won'.

/** Count enabled communication channels from tenantConfig flags. Always
 *  succeeds — no Supabase query needed. */
function deriveChannelsActive(
  tenantConfig: {
    has_whatsapp?: boolean;
    has_email?: boolean;
    has_voice?: boolean;
    has_instagram?: boolean;
    has_facebook?: boolean;
    has_linkedin?: boolean;
  } | null,
): number {
  if (!tenantConfig) return 0;
  let n = 0;
  if (tenantConfig.has_whatsapp) n++;
  if (tenantConfig.has_email) n++;
  if (tenantConfig.has_voice) n++;
  if (tenantConfig.has_instagram) n++;
  if (tenantConfig.has_facebook) n++;
  if (tenantConfig.has_linkedin) n++;
  return n;
}

async function fetchAllMetrics(
  inputs: FetchInputs,
): Promise<{ updates: MetricUpdate[]; heroStats: CathedralStat[] }> {
  const { tenantSlug, tenantUuid, tenantIndustry, channelsCount } = inputs;
  const conv_id = tenantUuid || tenantSlug; // conversations supports either; UUID preferred
  const dayAgoISO = timeAgo("24h");
  const weekAgoISO = timeAgo("7d");
  const todayISO = startOfTodayISO();

  /** Each entry: a key (sectionId|metricLabel) + a result promise.
   *  Phase 2B.1 widens the result type to allow string (e.g. ARR formatted as $1.2M). */
  const queryDefs: Array<{
    key: string;
    promise: Promise<number | string | null>;
  }> = [
    // ===== Sales AI =====
    {
      key: "sales|in pipeline",
      promise: countQuery("sales_leads", { tenant_id: tenantSlug }),
    },
    // Phase 2B.1: sequences (SLUG, status='active')
    {
      key: "sales|sequences active",
      promise: countQuery("sequences", {
        tenant_id: tenantSlug,
        status: "active",
      }),
    },
    // ARR metric dropped — ltv_cac_snapshots has no `arr` column. Registry
    // already marks this notConfigured; we no longer push an update for it.
    // TODO: when deals start closing, compute ARR from
    //   SUM(deals.value) WHERE stage='closed_won' AND tenant_id=slug
    {
      key: "sales|hot leads",
      promise: countQuery(
        "sales_leads",
        { tenant_id: tenantSlug },
        { gte: { lead_score: "75" } },
      ),
    },
    {
      key: "sales|contacted today",
      promise: countQuery(
        "sales_leads",
        { tenant_id: tenantSlug },
        { gte: { last_contact_at: dayAgoISO } },
      ),
    },

    // ===== Marketing AI =====
    {
      key: "marketing|campaigns live",
      promise: tenantUuid
        ? countQuery(
            "marketing_campaigns",
            { tenant_id: tenantUuid },
            { in: { status: ["active", "sending", "scheduled"] } },
          )
        : Promise.resolve(null),
    },
    {
      key: "marketing|posts this week",
      promise: tenantUuid
        ? countQuery(
            "social_posts",
            { tenant_id: tenantUuid },
            { gte: { created_at: weekAgoISO } },
          )
        : Promise.resolve(null),
    },

    // ===== Operations =====
    {
      key: "operations|active projects",
      promise: countQuery(
        "estimation_projects",
        { tenant_id: tenantSlug },
        { in: { status: ["active", "in-progress", "in_progress"] } },
      ),
    },
    {
      key: "operations|estimates pending",
      promise: countQuery("estimation_projects", {
        tenant_id: tenantSlug,
        status: "estimating",
      }),
    },

    // ===== Communications =====
    // Phase 2B.1: calls today via voice_usage (SLUG)
    {
      key: "comms|calls today",
      promise: countQuery(
        "voice_usage",
        { tenant_id: tenantSlug },
        { gte: { created_at: dayAgoISO } },
      ),
    },
    // Phase 2B.1: HR onboarding (UUID, speculative status='onboarding')
    {
      key: "hr|onboarding",
      promise: tenantUuid
        ? countQuery("hr_candidates", {
            tenant_id: tenantUuid,
            status: "onboarding",
          })
        : Promise.resolve(null),
    },
    // Phase 2B.1: HR reviews due (UUID, speculative status='pending')
    {
      key: "hr|reviews due",
      promise: tenantUuid
        ? countQuery("hr_performance_reviews", {
            tenant_id: tenantUuid,
            status: "pending",
          })
        : Promise.resolve(null),
    },
    {
      key: "comms|WhatsApp chats",
      promise: countQuery(
        "conversations",
        { tenant_id: conv_id, channel: "whatsapp" },
        { gte: { last_message_at: dayAgoISO } },
      ),
    },
    {
      key: "comms|emails sent",
      promise: countQuery(
        "outbound_messages",
        { tenant_id: tenantSlug, channel: "email" },
        { gte: { created_at: dayAgoISO } },
      ),
    },

    // ===== Industry Verticals =====
    {
      key: "industry|competitors tracked",
      promise: tenantUuid
        ? countQuery("competitor_tracking", { tenant_id: tenantUuid })
        : Promise.resolve(null),
    },
    {
      key: "industry|moves this week",
      promise: tenantUuid
        ? countQuery(
            "competitor_tracking",
            { tenant_id: tenantUuid },
            { gte: { last_analyzed_at: weekAgoISO } },
          )
        : Promise.resolve(null),
    },

    // ===== Unified Inbox =====
    {
      key: "inbox|conversations",
      promise: countQuery(
        "conversations",
        { tenant_id: conv_id },
        { in: { status: ["open", "active"] } },
      ),
    },

    // ===== Clients =====
    {
      key: "clients|total clients",
      promise: countQuery("customers", { tenant_id: tenantSlug }),
    },
    {
      key: "clients|today",
      promise: countQuery(
        "customers",
        { tenant_id: tenantSlug },
        { gte: { created_at: todayISO } },
      ),
    },

    // ===== Settings =====
    // tenant_integrations has no `status` column — `is_active` (boolean) is the
    // closest available signal for a connected provider.
    {
      key: "settings|integrations connected",
      promise: countQuery("tenant_integrations", {
        tenant_id: tenantSlug,
        is_active: true,
      }),
    },
  ];

  // Hero stats run in the same batch
  const heroDefs: Array<{ label: string; promise: Promise<number | null> }> = [
    {
      label: "Active leads",
      promise: countQuery("sales_leads", { tenant_id: tenantSlug }),
    },
    {
      label: "Conversations",
      promise: countQuery("conversations", { tenant_id: conv_id }),
    },
    {
      label: "Booked appointments",
      // appointments.start_time is `time without time zone` (HH:MM:SS only) —
      // it can't be compared to an ISO timestamp. Use scheduled_at (timestamptz).
      promise: countQuery(
        "appointments",
        { tenant_id: tenantSlug },
        {
          in: { status: ["scheduled", "confirmed", "pending"] },
          gte: { scheduled_at: todayISO },
        },
      ),
    },
  ];

  // Single batch with global 5s timeout. Promise.allSettled never throws,
  // so the timeout is the only escape hatch.
  const allPromises = [
    ...queryDefs.map((d) => d.promise),
    ...heroDefs.map((d) => d.promise),
  ];

  const settled = await withTimeout(
    Promise.allSettled(allPromises),
    TIMEOUT_MS,
  );

  // ---- Process metric results
  const updates: MetricUpdate[] = [];

  // Industry-card "tenant industry" — direct from tenantConfig, always succeeds when present
  if (tenantIndustry) {
    updates.push({
      key: "industry|tenant industry",
      value: formatIndustry(tenantIndustry),
    });
  }

  // Phase 2B.1: derived "channels active" from tenantConfig (no Supabase query)
  updates.push({
    key: "inbox|channels active",
    value: String(channelsCount),
  });

  for (let i = 0; i < queryDefs.length; i++) {
    const r = settled[i];
    if (r.status === "fulfilled" && r.value !== null && r.value !== undefined) {
      // Success — clear notConfigured, set value
      updates.push({ key: queryDefs[i].key, value: String(r.value) });
    } else {
      // Phase 2B.1 — query was attempted but failed (column missing, RLS,
      // network, etc.). Flip notConfigured:true so the renderer shows "—"
      // instead of the registry's hardcoded fallback.
      updates.push({ key: queryDefs[i].key, notConfigured: true });
    }
  }

  // ---- Process hero results
  const heroStats: CathedralStat[] = FALLBACK_STATS.map((stat) => {
    const heroIdx = heroDefs.findIndex((h) => h.label === stat.label);
    if (heroIdx === -1) return stat; // Agents healthy — keep fallback
    const r = settled[queryDefs.length + heroIdx];
    if (r.status === "fulfilled" && r.value !== null && r.value !== undefined) {
      return { ...stat, value: String(r.value) };
    }
    return stat;
  });

  return { updates, heroStats };
}

// ---------- merger ---------------------------------------------------------

function applyUpdates(
  base: PulseSection[],
  updates: MetricUpdate[],
): PulseSection[] {
  if (updates.length === 0) return base;
  const map = new Map<string, MetricUpdate>();
  for (const u of updates) map.set(u.key, u);
  return base.map((s) => ({
    ...s,
    metrics: s.metrics.map((m) => {
      const u = map.get(`${s.id}|${m.label}`);
      if (!u) return m;
      // Successful query — set value, clear notConfigured
      if (u.value !== undefined) {
        return { ...m, value: u.value, notConfigured: false };
      }
      // Failed query — flag notConfigured so renderer shows "—"
      if (u.notConfigured) {
        return { ...m, notConfigured: true };
      }
      return m;
    }),
  }));
}

// ---------- the hook -------------------------------------------------------

export function usePulseData(isOpen: boolean): PulseData {
  const { tenantId, tenantConfig } = useTenant();
  const [data, setData] = useState<PulseData>({
    sections: FALLBACK_SECTIONS,
    heroStats: FALLBACK_STATS,
    loading: false,
    error: null,
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Reset the once-flag every time Pulse closes — so reopening triggers a fresh fetch.
    if (!isOpen) {
      fetchedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;
    if (!tenantId) return;

    fetchedRef.current = true;
    setData((d) => ({ ...d, loading: true }));

    const tenantSlug = tenantId; // SLUG
    const tenantUuid = tenantConfig?.id ?? null; // UUID (may be null mid-bootstrap)
    const tenantIndustry = tenantConfig?.industry ?? null;
    const channelsCount = deriveChannelsActive(tenantConfig); // Phase 2B.1

    fetchAllMetrics({ tenantSlug, tenantUuid, tenantIndustry, channelsCount })
      .then(({ updates, heroStats }) => {
        const sections = applyUpdates(FALLBACK_SECTIONS, updates);
        setData({ sections, heroStats, loading: false, error: null });
        console.info(
          `[Pulse] fetched — ${updates.length}/${updates.length + (FALLBACK_SECTIONS.reduce((n, s) => n + s.metrics.length, 0) - updates.length)} metrics overlaid; rest fell back to hardcoded.`,
        );
      })
      .catch((err) => {
        console.warn(
          "[Pulse] fetch batch failed, using full hardcoded fallback:",
          err instanceof Error ? err.message : String(err),
        );
        setData({
          sections: FALLBACK_SECTIONS,
          heroStats: FALLBACK_STATS,
          loading: false,
          error: err instanceof Error ? err.message : "fetch failed",
        });
      });
  }, [isOpen, tenantId, tenantConfig?.id, tenantConfig?.industry]);

  return data;
}
