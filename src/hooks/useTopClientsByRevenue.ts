import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { FinanceRange } from "@/hooks/useFinanceKpis";

export interface TopClientRow {
  clientId: string;
  name: string;
  paid: number;
  invoiced: number;
  outstanding: number;
  lastPaidAt: string | null;
}

interface RawInvoice {
  client_id: string | null;
  amount: number | string;
  status: string;
  paid_at: string | null;
  sent_at: string | null;
}
interface RawPayment {
  invoice_id: string | null;
  amount: number | string;
  payment_date: string | null;
}
interface RawClient {
  id: string;
  name: string;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rangeBounds(range: FinanceRange): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (range === "all") return { start: null, end: null };
  if (range === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
  }
  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { start: new Date(now.getFullYear(), q * 3, 1), end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999) };
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
}

function isWithin(value: string | null, start: Date | null, end: Date | null): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

export function useTopClientsByRevenue(range: FinanceRange = "month", limit: number = 5) {
  const { tenantId } = useTenant();

  const invoicesQ = useQuery({
    queryKey: ["top_clients_invoices", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_invoices")
        .select("id, client_id, amount, status, paid_at, sent_at")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as Array<RawInvoice & { id: string }>;
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["top_clients_payments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_payments")
        .select("invoice_id, amount, payment_date")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as RawPayment[];
    },
  });

  const clientsQ = useQuery({
    queryKey: ["top_clients_clients", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_clients")
        .select("id, name")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as RawClient[];
    },
  });

  const isLoading = invoicesQ.isLoading || paymentsQ.isLoading || clientsQ.isLoading;
  const error = invoicesQ.error || paymentsQ.error || clientsQ.error;

  const data: TopClientRow[] = useMemo(() => {
    if (!invoicesQ.data || !paymentsQ.data || !clientsQ.data) return [];
    const { start, end } = rangeBounds(range);
    const clientName = new Map(clientsQ.data.map((c) => [c.id, c.name]));

    // Map invoice.id → client_id (for payment-to-client tracing)
    const invoiceClient = new Map<string, string>();
    for (const inv of invoicesQ.data) {
      if (inv.client_id) invoiceClient.set(inv.id, inv.client_id);
    }

    const agg = new Map<string, { paid: number; invoiced: number; outstanding: number; lastPaidAt: string | null }>();

    // Paid totals from invoices.paid_at (cleaner attribution than tracking payments)
    for (const inv of invoicesQ.data) {
      const cid = inv.client_id;
      if (!cid) continue;
      if (!agg.has(cid)) agg.set(cid, { paid: 0, invoiced: 0, outstanding: 0, lastPaidAt: null });
      const row = agg.get(cid)!;
      const amt = toNum(inv.amount);
      if (isWithin(inv.sent_at, start, end)) row.invoiced += amt;
      if (inv.status === "paid" && isWithin(inv.paid_at, start, end)) {
        row.paid += amt;
        if (!row.lastPaidAt || (inv.paid_at && inv.paid_at > row.lastPaidAt)) row.lastPaidAt = inv.paid_at;
      } else if (inv.status !== "cancelled" && inv.status !== "draft") {
        // Outstanding: subtract matched payments
        const matched = paymentsQ.data
          .filter((p) => p.invoice_id === inv.id)
          .reduce((s, p) => s + toNum(p.amount), 0);
        row.outstanding += Math.max(0, amt - matched);
      }
    }

    const rows: TopClientRow[] = [];
    for (const [clientId, v] of agg.entries()) {
      if (v.paid === 0 && v.invoiced === 0 && v.outstanding === 0) continue;
      rows.push({
        clientId,
        name: clientName.get(clientId) ?? "(unknown client)",
        paid: v.paid,
        invoiced: v.invoiced,
        outstanding: v.outstanding,
        lastPaidAt: v.lastPaidAt,
      });
    }
    rows.sort((a, b) => b.paid - a.paid);
    return rows.slice(0, limit);
  }, [invoicesQ.data, paymentsQ.data, clientsQ.data, range, limit]);

  return { data, isLoading, error };
}
