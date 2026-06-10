import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type FinanceRange = "month" | "quarter" | "year" | "all";

export interface FinanceKpis {
  cashPosition: number;
  outstanding: number;
  overdue: number;
  mtdRevenue: number;
  avgDsoDays: number | null;
  topClient: { name: string; amount: number } | null;
  currency: string;
  // Counts for sub-displays:
  invoiceCounts: { draft: number; sent: number; paid: number; partial: number; overdue: number; cancelled: number };
  paidInvoiceCount: number;
  unpaidInvoiceCount: number;
  // Invoice Phase B (2026-06-10): receivables aging — owed amounts bucketed by days
  // past due_at (only past-due invoices; the existing `overdue` total is their sum).
  aging: { b0_30: number; b31_60: number; b61_90: number; b90p: number };
}

interface RawInvoice {
  id: string;
  client_id: string | null;
  invoice_no: string | null;
  amount: number | string;
  currency: string | null;
  status: string;
  sent_at: string | null;
  due_at: string | null;
  paid_at: string | null;
}
interface RawPayment {
  id: string;
  invoice_id: string | null;
  amount: number | string;
  currency: string | null;
  payment_date: string | null;
}
interface RawClient {
  id: string;
  name: string;
}

function rangeBounds(range: FinanceRange): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (range === "all") return { start: null, end: null };
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }
  // year
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function isWithin(value: string | null, start: Date | null, end: Date | null): boolean {
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function useFinanceKpis(range: FinanceRange = "month") {
  const { tenantId } = useTenant();

  const invoicesQ = useQuery({
    queryKey: ["finance_invoices", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_invoices")
        .select("id, client_id, invoice_no, amount, currency, status, sent_at, due_at, paid_at")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as RawInvoice[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["finance_payments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_payments")
        .select("id, invoice_id, amount, currency, payment_date")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;
      return (data ?? []) as unknown as RawPayment[];
    },
  });

  const clientsQ = useQuery({
    queryKey: ["finance_clients_lite", tenantId],
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

  const kpis: FinanceKpis | null = useMemo(() => {
    if (!invoicesQ.data || !paymentsQ.data || !clientsQ.data) return null;
    const invoices = invoicesQ.data;
    const payments = paymentsQ.data;
    const clients = clientsQ.data;
    const { start, end } = rangeBounds(range);

    // Currency: GBP by default; mix-detection just picks the most common
    const currency =
      invoices.find((i) => i.currency)?.currency ??
      payments.find((p) => p.currency)?.currency ??
      "GBP";

    // Cash position = sum of payments WITHIN range, by payment_date
    let cashPosition = 0;
    for (const p of payments) {
      if (isWithin(p.payment_date, start, end)) cashPosition += toNum(p.amount);
    }

    // Outstanding = sum of (invoice.amount - matched payments) for invoices not fully paid
    // For simplicity: include any invoice with status NOT IN ('paid','cancelled'),
    // subtract any matched payments to that invoice
    const paymentsByInvoice = new Map<string, number>();
    for (const p of payments) {
      if (!p.invoice_id) continue;
      paymentsByInvoice.set(p.invoice_id, (paymentsByInvoice.get(p.invoice_id) ?? 0) + toNum(p.amount));
    }
    let outstanding = 0;
    let overdue = 0;
    const aging = { b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0 };
    const todayMs = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    for (const inv of invoices) {
      if (inv.status === "paid" || inv.status === "cancelled" || inv.status === "draft") continue;
      const amt = toNum(inv.amount);
      const paid = paymentsByInvoice.get(inv.id) ?? 0;
      const owed = Math.max(0, amt - paid);
      outstanding += owed;
      // Overdue = explicit status OR due_at in the past
      const dueMs = inv.due_at ? new Date(inv.due_at).getTime() : NaN;
      const isPastDue = Number.isFinite(dueMs) && dueMs < todayMs;
      if (inv.status === "overdue" || isPastDue) {
        overdue += owed;
        // Phase B aging: bucket by days past due. status='overdue' without a due_at
        // can't be aged — count it in 0-30 (most-recent bucket) rather than dropping it.
        const daysPast = isPastDue ? Math.floor((todayMs - dueMs) / DAY) : 0;
        if (daysPast <= 30) aging.b0_30 += owed;
        else if (daysPast <= 60) aging.b31_60 += owed;
        else if (daysPast <= 90) aging.b61_90 += owed;
        else aging.b90p += owed;
      }
    }

    // MTD revenue = sum of payment_date within current month
    const mtdStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let mtdRevenue = 0;
    for (const p of payments) {
      if (isWithin(p.payment_date, mtdStart, null)) mtdRevenue += toNum(p.amount);
    }

    // Avg DSO = mean (paid_at - sent_at) over paid invoices in range
    const dsoDays: number[] = [];
    for (const inv of invoices) {
      if (inv.status !== "paid") continue;
      if (!inv.sent_at || !inv.paid_at) continue;
      const sent = new Date(inv.sent_at).getTime();
      const paid = new Date(inv.paid_at).getTime();
      if (!Number.isFinite(sent) || !Number.isFinite(paid)) continue;
      if (!isWithin(inv.paid_at, start, end)) continue;
      const days = Math.max(0, Math.floor((paid - sent) / (24 * 60 * 60 * 1000)));
      dsoDays.push(days);
    }
    const avgDsoDays = dsoDays.length === 0 ? null : Math.round(dsoDays.reduce((s, n) => s + n, 0) / dsoDays.length);

    // Top client = client with highest paid total in range (use paid_at of invoice)
    const clientName = new Map<string, string>(clients.map((c) => [c.id, c.name]));
    const paidByClient = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status !== "paid") continue;
      if (!isWithin(inv.paid_at, start, end)) continue;
      if (!inv.client_id) continue;
      paidByClient.set(inv.client_id, (paidByClient.get(inv.client_id) ?? 0) + toNum(inv.amount));
    }
    let topClient: { name: string; amount: number } | null = null;
    for (const [clientId, amount] of paidByClient.entries()) {
      if (!topClient || amount > topClient.amount) {
        topClient = { name: clientName.get(clientId) ?? "(unknown client)", amount };
      }
    }

    // Counts
    const invoiceCounts = { draft: 0, sent: 0, paid: 0, partial: 0, overdue: 0, cancelled: 0 };
    for (const inv of invoices) {
      const s = inv.status as keyof typeof invoiceCounts;
      if (s in invoiceCounts) invoiceCounts[s] += 1;
    }
    const paidInvoiceCount = invoiceCounts.paid;
    const unpaidInvoiceCount =
      invoiceCounts.draft + invoiceCounts.sent + invoiceCounts.partial + invoiceCounts.overdue;

    return {
      cashPosition,
      outstanding,
      overdue,
      mtdRevenue,
      avgDsoDays,
      topClient,
      currency,
      invoiceCounts,
      paidInvoiceCount,
      unpaidInvoiceCount,
      aging,
    };
  }, [invoicesQ.data, paymentsQ.data, clientsQ.data, range]);

  return {
    kpis,
    isLoading,
    error,
    hasNoData:
      !isLoading &&
      (invoicesQ.data?.length ?? 0) === 0 &&
      (paymentsQ.data?.length ?? 0) === 0,
  };
}
