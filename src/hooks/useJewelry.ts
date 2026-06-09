/**
 * Jewelry vertical data hooks (Project JX, Phase 4).
 *
 * Mirrors the clinic hook pattern: react-query + supabase client, scoped by the
 * tenant SLUG from useTenant() (`tenantId`). jx_* tables are SLUG-keyed and RLS
 * auto-filters by get_user_tenant_id(); we ALSO .eq("tenant_id", tenantId) for
 * parity/clarity. NEVER use tenantConfig.id (the UUID) here — that returns 0 rows.
 *
 * Reuses src/lib/jewelry/calc.ts for tola math (no re-implementation).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { TOLA_GRAMS, tolaToGrams, round2, round3 } from "@/lib/jewelry/calc";

export const JX_KARATS = [24, 22, 21, 18] as const;

export interface GoldRateRow {
  id: string;
  tenant_id: string;
  metal: string | null;
  karat: number | null;
  rate_per_gram: number | null;
  rate_per_tola: number | null;
  source: string | null;
  effective_at: string | null;
}

export interface JewelrySetting {
  id: string;
  tenant_id: string;
  currency: string | null;
  tola_grams: number | null;
  hallmark_standard: string | null;
  whatsapp_number: string | null;
  collections: unknown;
}

/** jx_setting (one row per tenant). */
export function useJewelrySetting() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_setting", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_setting" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as JewelrySetting) ?? null;
    },
  });
  const tolaGrams = Number(data?.tola_grams) || TOLA_GRAMS;
  const currency = data?.currency || "PKR";
  return { setting: data ?? null, tolaGrams, currency, isLoading };
}

/** Latest jx_gold_rate per karat + a save mutation (manual upsert per karat). */
export function useGoldRates() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const { tolaGrams } = useJewelrySetting();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["jx_gold_rate", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_gold_rate" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("effective_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GoldRateRow[];
    },
  });

  // latest row per karat (rows already sorted newest-first)
  const latestByKarat: Record<number, GoldRateRow> = {};
  for (const r of rows) {
    if (r.karat != null && latestByKarat[r.karat] === undefined) latestByKarat[r.karat] = r;
  }
  const hasPlaceholder = JX_KARATS.some((k) => latestByKarat[k]?.source === "placeholder");
  const anyRealRate = JX_KARATS.some((k) => latestByKarat[k] && latestByKarat[k].source !== "placeholder");

  // Save: for each karat, UPDATE the existing row in place (placeholder → manual) or INSERT.
  const saveRates = useMutation({
    mutationFn: async (perGram: Record<number, number>) => {
      const nowIso = new Date().toISOString();
      for (const karat of JX_KARATS) {
        const rpg = perGram[karat];
        if (rpg == null || Number.isNaN(rpg)) continue;
        const ratePerGram = round2(rpg);
        const ratePerTola = round2(tolaToGrams(ratePerGram, tolaGrams)); // per-tola = per-gram × grams/tola
        const existing = latestByKarat[karat];
        if (existing) {
          const { error } = await supabase
            .from("jx_gold_rate" as any)
            .update({ rate_per_gram: ratePerGram, rate_per_tola: ratePerTola, source: "manual", effective_at: nowIso, updated_at: nowIso } as any)
            .eq("id", existing.id)
            .eq("tenant_id", tenantId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("jx_gold_rate" as any)
            .insert({ tenant_id: tenantId, metal: "gold", karat, rate_per_gram: ratePerGram, rate_per_tola: ratePerTola, source: "manual", effective_at: nowIso } as any);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jx_gold_rate", tenantId] }); },
  });

  return { rows, latestByKarat, hasPlaceholder, anyRealRate, tolaGrams, isLoading, saveRates };
}

/** Live fine-gold position (grams) by karat, summed from jx_gold_ledger. */
export function useGoldPosition() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_gold_ledger_position", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_gold_ledger" as any)
        .select("karat, fine_grams")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as unknown as { karat: number | null; fine_grams: number | null }[];
    },
  });
  const byKarat: Record<number, number> = {};
  let totalFine = 0;
  for (const r of data || []) {
    const f = Number(r.fine_grams) || 0;
    if (r.karat != null) byKarat[r.karat] = (byKarat[r.karat] || 0) + f;
    totalFine += f;
  }
  return { byKarat, totalFine: round3(totalFine), hasRows: (data || []).length > 0, isLoading };
}

/** Cash collected today (sum paid_cash over jx_sale rows dated today). */
export function useCashToday() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_cash_today", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("jx_sale" as any)
        .select("paid_cash, net_bill, sale_date")
        .eq("tenant_id", tenantId)
        .gte("sale_date", start.toISOString());
      if (error) throw error;
      return (data || []) as unknown as { paid_cash: number | null; net_bill: number | null }[];
    },
  });
  const cashToday = round2((data || []).reduce((s, r) => s + (Number(r.paid_cash) || 0), 0));
  const salesToday = (data || []).length;
  return { cashToday, salesToday, isLoading };
}

/** Custom orders awaiting delivery (status not delivered/cancelled). */
export function useOrdersDue() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_orders_due", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_order" as any)
        .select("id, status, delivery_date")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as unknown as { id: string; status: string | null }[];
    },
  });
  const done = new Set(["delivered", "cancelled", "completed"]);
  const ordersDue = (data || []).filter((o) => !o.status || !done.has(o.status)).length;
  return { ordersDue, isLoading };
}
