import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface RevenueTrendPoint {
  monthKey: string;        // 'YYYY-MM'
  monthLabel: string;      // 'Dec 2025'
  revenue: number;         // sum of payments in month
  invoicedAmount: number;  // sum of sent invoices in month (signal of pipeline)
}

interface RawInvoice {
  amount: number | string;
  sent_at: string | null;
}
interface RawPayment {
  amount: number | string;
  payment_date: string | null;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Returns an array of trailing N months (oldest → newest). */
function trailingMonths(n: number): Array<{ key: string; label: string; year: number; monthIndex: number }> {
  const now = new Date();
  const out: Array<{ key: string; label: string; year: number; monthIndex: number }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    out.push({ key, label, year: d.getFullYear(), monthIndex: d.getMonth() });
  }
  return out;
}

export function useRevenueTrend(monthCount: number = 6) {
  const { tenantId } = useTenant();

  const invoicesQ = useQuery({
    queryKey: ["trend_invoices", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_invoices")
        .select("amount, sent_at")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as RawInvoice[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["trend_payments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_payments")
        .select("amount, payment_date")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as RawPayment[];
    },
  });

  const isLoading = invoicesQ.isLoading || paymentsQ.isLoading;
  const error = invoicesQ.error || paymentsQ.error;

  const data: RevenueTrendPoint[] = useMemo(() => {
    const buckets = trailingMonths(monthCount);
    const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
    const points: RevenueTrendPoint[] = buckets.map((b) => ({
      monthKey: b.key,
      monthLabel: b.label,
      revenue: 0,
      invoicedAmount: 0,
    }));

    if (paymentsQ.data) {
      for (const p of paymentsQ.data) {
        if (!p.payment_date) continue;
        const d = new Date(p.payment_date);
        if (Number.isNaN(d.getTime())) continue;
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const idx = bucketIndex.get(k);
        if (idx !== undefined) points[idx].revenue += toNum(p.amount);
      }
    }
    if (invoicesQ.data) {
      for (const inv of invoicesQ.data) {
        if (!inv.sent_at) continue;
        const d = new Date(inv.sent_at);
        if (Number.isNaN(d.getTime())) continue;
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const idx = bucketIndex.get(k);
        if (idx !== undefined) points[idx].invoicedAmount += toNum(inv.amount);
      }
    }

    return points;
  }, [invoicesQ.data, paymentsQ.data, monthCount]);

  return { data, isLoading, error };
}
