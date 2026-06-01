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
  type SectionVital,
  type Vital,
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

/** Batch-1 helper: fetch a few rows (not just a count) for headline/agentLine/
 *  savings logic. Same fail-safe contract as countQuery — returns null on any
 *  error so the caller falls back gracefully. */
async function rowsQuery(
  table: string,
  eqFilters: Record<string, unknown>,
  select: string,
  opts: { orderCol?: string; ascending?: boolean; limit?: number } = {},
): Promise<Record<string, unknown>[] | null> {
  try {
    let q = supabase.from(table).select(select);
    for (const [k, v] of Object.entries(eqFilters)) {
      q = q.eq(k, v as never);
    }
    if (opts.orderCol) {
      q = q.order(opts.orderCol, { ascending: opts.ascending ?? false });
    }
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) {
      console.warn(`[Pulse] ${table} rows query failed:`, error.message);
      return null;
    }
    return (data as Record<string, unknown>[]) ?? [];
  } catch (e) {
    console.warn(
      `[Pulse] ${table} rows threw:`,
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

// ---------- Batch 1 — SectionVital resolvers (operations/omega/analytics) ----

function asNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "AED 22,432" — thousands-separated, currency-prefixed. */
function fmtMoney(currency: string, n: number): string {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

interface Batch1Reads {
  aaTotal: number | string | null;
  aaWeek: number | string | null;
  aaSuccess: number | string | null;
  aaConvos: number | string | null;
  aaLatest: Record<string, unknown>[] | null;
  invRows: Record<string, unknown>[] | null;
  vendors: number | string | null;
  savingsRows: Record<string, unknown>[] | null;
  opsTasks: Record<string, unknown>[] | null;
}

/** Build the 3 Batch-1 SectionVitals from the consolidated reads. Honesty-first:
 *  null (failed) → graceful neutral; 0 (real empty) → module-ready, never faked. */
function buildBatch1Vitals(b: Batch1Reads, currency: string): SectionVital[] {
  const out: SectionVital[] = [];

  // ----- OMEGA (P2: real agent activity, kills 81/12/99.9%) -----
  {
    const total = asNum(b.aaTotal);
    const week = asNum(b.aaWeek);
    const success = asNum(b.aaSuccess);
    const convos = asNum(b.aaConvos);
    const latest = Array.isArray(b.aaLatest) && b.aaLatest.length ? b.aaLatest[0] : null;
    const successPct =
      total && total > 0 && success !== null ? Math.round((success / total) * 100) : null;
    const hasData = total !== null || convos !== null;
    const vitals: Vital[] = [];
    if (total !== null) vitals.push({ label: "actions", value: String(total), tone: "good" });
    if (week !== null) vitals.push({ label: "this week", value: String(week), tone: "neutral" });
    if (convos !== null) vitals.push({ label: "conversations", value: String(convos), tone: "neutral" });
    if (successPct !== null)
      vitals.push({ label: "success", value: `${successPct}%`, tone: successPct >= 95 ? "good" : "warn" });
    const agentLine = latest
      ? `Last · ${(latest.agent_name as string) || "OMEGA"} → ${(latest.tool_name as string) || (latest.action_type as string) || "action"}`
      : null;
    out.push({
      id: "omega",
      state: hasData ? "active" : "module-ready",
      headline: hasData ? `${total ?? 0} actions · ${convos ?? 0} conversations` : null,
      vitals,
      agentLine,
    });
  }

  // ----- OPERATIONS (P1: ops_* universal supply chain, industry-aware) -----
  {
    const invRows = Array.isArray(b.invRows) ? b.invRows : null;
    const invTotal = invRows ? invRows.length : null;
    const low = invRows
      ? invRows.filter((r) => {
          const cs = asNum(r.current_stock);
          const rp = asNum(r.reorder_point);
          return cs !== null && rp !== null && cs <= rp;
        }).length
      : null;
    const vendors = asNum(b.vendors);
    const savingsRows = Array.isArray(b.savingsRows) ? b.savingsRows : null;
    const savings = savingsRows
      ? savingsRows
          .filter((r) => r.status !== "rejected")
          .reduce((s, r) => s + (asNum(r.estimated_saving) ?? 0), 0)
      : null;
    const hasOps = (invTotal ?? 0) > 0 || (vendors ?? 0) > 0 || (savings ?? 0) > 0;

    if (!hasOps) {
      out.push({ id: "operations", state: "module-ready", headline: null, vitals: [], agentLine: null });
    } else {
      const attention = (low ?? 0) > 0;
      const headline =
        `${attention ? "Operations need attention" : "Operations healthy"} — ` +
        `${invTotal ?? 0} stocked${(low ?? 0) > 0 ? `, ${low} low` : ""}` +
        `${savings && savings > 0 ? `; ${fmtMoney(currency, savings)} saved` : ""}`;
      const vitals: Vital[] = [{ label: "stocked", value: String(invTotal ?? 0), tone: "good" }];
      if ((low ?? 0) > 0) vitals.push({ label: "low stock", value: String(low), tone: "warn" });
      if (vendors !== null) vitals.push({ label: "vendors", value: String(vendors), tone: "neutral" });
      if (savings && savings > 0)
        vitals.push({ label: "saved", value: fmtMoney(currency, savings), tone: "good" });
      const parts: string[] = [];
      if ((low ?? 0) > 0) parts.push(`STOCKMASTER flagged ${low} low-stock`);
      if (savings && savings > 0) parts.push(`OPTIMIZER found ${fmtMoney(currency, savings)} saved`);
      const agentLine = parts.length ? parts.join(" · ") : null;
      out.push({ id: "operations", state: "active", headline, vitals: vitals.slice(0, 4), agentLine });
    }
  }

  // ----- ANALYTICS (P2: no per-tenant events table populated → module-ready,
  //        never the fabricated 14/522/18M) -----
  out.push({
    id: "analytics",
    state: "module-ready",
    headline: "Live dashboards",
    vitals: [],
    agentLine: null,
  });

  return out;
}

/** Map Batch-1 SectionVitals onto the existing PulseSection shape. hidden →
 *  section omitted; module-ready → keep registry pill; active → pill reflects
 *  warn tone. headline→meta, vitals→metrics, agentLine→the new span. */
function applyBatch1(base: PulseSection[], vitals: SectionVital[]): PulseSection[] {
  if (vitals.length === 0) return base;
  const map = new Map(vitals.map((v) => [v.id, v]));
  return base.flatMap((s) => {
    const sv = map.get(s.id);
    if (!sv) return [s];
    if (sv.state === "hidden") return [];
    const metrics = sv.vitals.map((v) => ({
      value: `${v.value}${v.unit ?? ""}`,
      label: v.label,
      isWarning: v.tone === "warn",
      notConfigured: v.tone === "empty",
    }));
    let pillType = s.pillType;
    let pillText = s.pillText;
    if (sv.state === "active") {
      const warnCount = sv.vitals.filter((v) => v.tone === "warn").length;
      if (warnCount > 0) {
        pillType = "warning";
        pillText = `${warnCount} need attention`;
      }
      // healthy path keeps the loved registry pill ("live" / "all healthy")
    }
    // module-ready keeps the registry pill (e.g. "open analytics")
    return [
      {
        ...s,
        meta: sv.headline ?? s.meta,
        metrics: metrics.length ? metrics : s.metrics,
        agentLine: sv.agentLine ?? null,
        pillType,
        pillText,
      },
    ];
  });
}

// ---------- the fetch ------------------------------------------------------

interface FetchInputs {
  tenantSlug: string;
  tenantUuid: string | null;
  tenantIndustry: string | null;
  /** Phase 2B.1 — channel-flag bag from tenantConfig, used for the
   *  derived "channels active" metric (no Supabase query). */
  channelsCount: number;
  /** Batch 1 — tenant currency (for the Operations savings vital). Default AED. */
  currency: string;
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
): Promise<{ updates: MetricUpdate[]; heroStats: CathedralStat[]; batch1: SectionVital[] }> {
  const { tenantSlug, tenantUuid, tenantIndustry, channelsCount, currency } = inputs;
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
    // (Batch 1 P1) estimation_projects queries REMOVED — Operations is now
    // resolved from universal ops_* in the Batch-1 reads below + buildBatch1Vitals.

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

  // Batch-1 consolidated reads (operations/omega) — run in the SAME batch.
  // Analytics needs no read (module-ready). All SLUG [VERIFIED-DB 2026-06-01].
  const b1Promises: Promise<unknown>[] = [
    countQuery("agent_actions", { tenant_id: tenantSlug }), // 0 aaTotal
    countQuery("agent_actions", { tenant_id: tenantSlug }, { gte: { created_at: weekAgoISO } }), // 1 aaWeek
    countQuery("agent_actions", { tenant_id: tenantSlug, success: true }), // 2 aaSuccess
    countQuery("agent_conversations", { tenant_id: tenantSlug }), // 3 aaConvos
    rowsQuery("agent_actions", { tenant_id: tenantSlug }, "agent_name,tool_name,action_type", { orderCol: "created_at", ascending: false, limit: 1 }), // 4 aaLatest
    rowsQuery("ops_inventory_items", { tenant_id: tenantSlug }, "current_stock,reorder_point", { limit: 2000 }), // 5 invRows
    countQuery("ops_vendors", { tenant_id: tenantSlug }), // 6 vendors
    rowsQuery("ops_cost_savings", { tenant_id: tenantSlug }, "estimated_saving,status", { limit: 1000 }), // 7 savingsRows
    rowsQuery("ops_agent_tasks", { tenant_id: tenantSlug }, "agent_name,status", { orderCol: "created_at", ascending: false, limit: 20 }), // 8 opsTasks
  ];

  // Single batch with global 5s timeout. Promise.allSettled never throws,
  // so the timeout is the only escape hatch.
  const allPromises = [
    ...queryDefs.map((d) => d.promise),
    ...heroDefs.map((d) => d.promise),
    ...b1Promises,
  ];

  const settled = await withTimeout(
    Promise.allSettled(allPromises),
    TIMEOUT_MS,
  );

  // Extract Batch-1 results (after queryDefs + heroDefs in the settled array).
  const b1Base = queryDefs.length + heroDefs.length;
  const b1val = (i: number): unknown => {
    const r = settled[b1Base + i];
    return r && r.status === "fulfilled" ? r.value : null;
  };
  const batch1 = buildBatch1Vitals(
    {
      aaTotal: b1val(0) as number | null,
      aaWeek: b1val(1) as number | null,
      aaSuccess: b1val(2) as number | null,
      aaConvos: b1val(3) as number | null,
      aaLatest: b1val(4) as Record<string, unknown>[] | null,
      invRows: b1val(5) as Record<string, unknown>[] | null,
      vendors: b1val(6) as number | null,
      savingsRows: b1val(7) as Record<string, unknown>[] | null,
      opsTasks: b1val(8) as Record<string, unknown>[] | null,
    },
    currency,
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

  return { updates, heroStats, batch1 };
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
    const currency = tenantConfig?.currency || "AED"; // Batch 1 — savings vital

    fetchAllMetrics({ tenantSlug, tenantUuid, tenantIndustry, channelsCount, currency })
      .then(({ updates, heroStats, batch1 }) => {
        // Batch 1: overlay the count-based metrics, THEN enrich operations/omega/
        // analytics with their resolved SectionVitals (headline/vitals/agentLine/pill).
        const sections = applyBatch1(applyUpdates(FALLBACK_SECTIONS, updates), batch1);
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
