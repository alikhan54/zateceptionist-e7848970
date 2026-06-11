/**
 * Phase F — Organization Brain: per-tenant live counts.
 *
 * Mirrors usePulseData.ts patterns exactly:
 * - Every query has an explicit .eq('tenant_id', X) — never relies on RLS alone.
 * - tenant_id format per the verified mapping: sales_leads / customers /
 *   appointments = SLUG; conversations = UUID preferred, SLUG fallback
 *   (same conv_id convention as usePulseData).
 * - Read-only. Zero writes, zero schema changes, zero n8n calls.
 * - 5s global timeout via Promise.race — the Brain never blocks on a slow
 *   round-trip. Promise.allSettled so one failed table can't sink the rest.
 * - null = "no data / failed" (renderer omits the count); 0 is real.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface BrainLiveCounts {
  leads: number | null;
  customers: number | null;
  conversations: number | null;
  appointments: number | null;
}

export interface BrainData extends BrainLiveCounts {
  loading: boolean;
}

const TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Brain query batch timeout after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

/** Wrapped count query with a single fail-safe try/catch. Returns null on any
 *  error (column missing, table missing, RLS denial, network). */
async function countQuery(
  table: string,
  eqFilters: Record<string, unknown>,
): Promise<number | null> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    for (const [k, v] of Object.entries(eqFilters)) {
      q = q.eq(k, v as never);
    }
    const { count, error } = await q;
    if (error) {
      console.warn(`[Brain] ${table} query failed:`, error.message);
      return null;
    }
    return count ?? 0;
  } catch (e) {
    console.warn(
      `[Brain] ${table} threw:`,
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

const EMPTY: BrainLiveCounts = {
  leads: null,
  customers: null,
  conversations: null,
  appointments: null,
};

export function useBrainData(): BrainData {
  const { tenantId, tenantConfig } = useTenant();
  const [counts, setCounts] = useState<BrainLiveCounts>(EMPTY);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const tenantSlug = tenantId ?? null;
    const tenantUuid = tenantConfig?.id ?? null; // UUID (may be null mid-bootstrap)
    if (!tenantSlug) return;

    // One fetch per tenant — re-renders don't hammer the database.
    const key = `${tenantSlug}|${tenantUuid ?? ""}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    let cancelled = false;
    setLoading(true);

    const convId = tenantUuid || tenantSlug; // conversations supports either; UUID preferred

    withTimeout(
      Promise.allSettled([
        countQuery("sales_leads", { tenant_id: tenantSlug }),
        countQuery("customers", { tenant_id: tenantSlug }),
        countQuery("conversations", { tenant_id: convId }),
        countQuery("appointments", { tenant_id: tenantSlug }),
      ]),
      TIMEOUT_MS,
    )
      .then((results) => {
        if (cancelled) return;
        const val = (i: number): number | null =>
          results[i].status === "fulfilled"
            ? (results[i] as PromiseFulfilledResult<number | null>).value
            : null;
        setCounts({
          leads: val(0),
          customers: val(1),
          conversations: val(2),
          appointments: val(3),
        });
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn(
          "[Brain] live counts timed out — rendering without counts:",
          e instanceof Error ? e.message : String(e),
        );
        setCounts(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, tenantConfig?.id]);

  return { ...counts, loading };
}
