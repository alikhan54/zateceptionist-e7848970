/**
 * Jewelry GL reads (Project JX, Phase 8a). Chart of accounts, cash book, trial balance.
 * SLUG-keyed / RLS. Gold position lives in useJewelry.useGoldPosition (jx_gold_ledger grams).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { round2 } from "@/lib/jewelry/calc";

const num = (v: any): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };

export interface JxAccount { id: string; code: string; name: string; type: string; }

export function useChartOfAccounts() {
  const { tenantId } = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jx_account", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("jx_account" as any).select("id, code, name, type").eq("tenant_id", tenantId).order("code");
      if (error) throw error;
      return (data || []) as unknown as JxAccount[];
    },
  });
  return { accounts: data, isLoading };
}

export interface CashEntry { date: string | null; narration: string | null; ref_table: string | null; debit: number; credit: number; running: number; }

/** Daily Cash Book — movements on account 1000 (Cash in Hand) with a running balance. */
export function useCashBook() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_cashbook", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data: acc } = await supabase.from("jx_account" as any).select("id").eq("tenant_id", tenantId).eq("code", "1000").maybeSingle();
      if (!acc) return [] as any[];
      const { data, error } = await supabase
        .from("jx_voucher_line" as any)
        .select("debit, credit, voucher:jx_voucher(voucher_date, narration, ref_table)")
        .eq("tenant_id", tenantId).eq("account_id", (acc as any).id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const sorted = [...(data || [])].sort((a, b) => new Date(a.voucher?.voucher_date || 0).getTime() - new Date(b.voucher?.voucher_date || 0).getTime());
  let run = 0;
  const entries: CashEntry[] = sorted.map((r) => {
    run += num(r.debit) - num(r.credit);
    return { date: r.voucher?.voucher_date ?? null, narration: r.voucher?.narration ?? null, ref_table: r.voucher?.ref_table ?? null, debit: num(r.debit), credit: num(r.credit), running: round2(run) };
  });
  return { entries, balance: round2(run), isLoading };
}

export interface AccountBalance { code: string; name: string; type: string; debit: number; credit: number; net: number; }

/** Trial balance — per-account Σdebit / Σcredit across all vouchers (totals must match). */
export function useTrialBalance() {
  const { tenantId } = useTenant();
  const { accounts } = useChartOfAccounts();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_trial_balance", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("jx_voucher_line" as any).select("account_id, debit, credit").eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const byAcc: Record<string, { debit: number; credit: number }> = {};
  for (const r of data || []) { const a = r.account_id; byAcc[a] = byAcc[a] || { debit: 0, credit: 0 }; byAcc[a].debit += num(r.debit); byAcc[a].credit += num(r.credit); }
  const rows: AccountBalance[] = accounts
    .map((a) => ({ code: a.code, name: a.name, type: a.type, debit: round2(byAcc[a.id]?.debit || 0), credit: round2(byAcc[a.id]?.credit || 0), net: round2((byAcc[a.id]?.debit || 0) - (byAcc[a.id]?.credit || 0)) }))
    .filter((r) => r.debit !== 0 || r.credit !== 0);
  const totalDr = round2(rows.reduce((s, r) => s + r.debit, 0));
  const totalCr = round2(rows.reduce((s, r) => s + r.credit, 0));
  return { rows, totalDr, totalCr, balanced: Math.abs(totalDr - totalCr) < 0.01, isLoading };
}
