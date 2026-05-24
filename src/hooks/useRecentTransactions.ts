import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type TxnKind = "invoice_sent" | "payment_received";

export interface FinanceTxn {
  kind: TxnKind;
  date: string;            // ISO timestamp
  clientName: string;
  amount: number;          // positive = inflow, negative = outflow
  status: string | null;
  ref: string | null;      // invoice_no or transaction_ref
  id: string;
}

interface RawInvoice {
  id: string;
  invoice_no: string | null;
  amount: number | string;
  status: string;
  sent_at: string | null;
  client_id: string | null;
}
interface RawPayment {
  id: string;
  invoice_id: string | null;
  amount: number | string;
  payment_date: string | null;
  transaction_ref: string | null;
  source: string | null;
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

export function useRecentTransactions(limit: number = 20) {
  const { tenantId } = useTenant();

  const invoicesQ = useQuery({
    queryKey: ["recent_txn_invoices", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_invoices")
        .select("id, invoice_no, amount, status, sent_at, client_id")
        .eq("tenant_id", tenantId as string)
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(limit * 2); // overfetch to merge fairly with payments
      if (error) throw error;
      return (data ?? []) as unknown as RawInvoice[];
    },
  });

  const paymentsQ = useQuery({
    queryKey: ["recent_txn_payments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_payments")
        .select("id, invoice_id, amount, payment_date, transaction_ref, source")
        .eq("tenant_id", tenantId as string)
        .order("payment_date", { ascending: false })
        .limit(limit * 2);
      if (error) throw error;
      return (data ?? []) as unknown as RawPayment[];
    },
  });

  const clientsQ = useQuery({
    queryKey: ["recent_txn_clients", tenantId],
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

  const data: FinanceTxn[] = useMemo(() => {
    if (!invoicesQ.data || !paymentsQ.data || !clientsQ.data) return [];
    const clientName = new Map(clientsQ.data.map((c) => [c.id, c.name]));
    const invoiceClient = new Map<string, string>();
    const invoiceNo = new Map<string, string>();
    for (const inv of invoicesQ.data) {
      if (inv.client_id) invoiceClient.set(inv.id, inv.client_id);
      if (inv.invoice_no) invoiceNo.set(inv.id, inv.invoice_no);
    }

    const all: FinanceTxn[] = [];
    for (const inv of invoicesQ.data) {
      if (!inv.sent_at) continue;
      all.push({
        kind: "invoice_sent",
        date: inv.sent_at,
        clientName: clientName.get(inv.client_id ?? "") ?? "(unknown client)",
        amount: -toNum(inv.amount), // sent = pending receivable; display as negative (owed to us)
        status: inv.status ?? null,
        ref: inv.invoice_no ?? null,
        id: inv.id,
      });
    }
    for (const p of paymentsQ.data) {
      if (!p.payment_date) continue;
      const cid = p.invoice_id ? invoiceClient.get(p.invoice_id) : undefined;
      all.push({
        kind: "payment_received",
        date: p.payment_date,
        clientName: cid ? (clientName.get(cid) ?? "(unknown client)") : "(unmatched payment)",
        amount: toNum(p.amount),
        status: p.source ?? null,
        ref: p.transaction_ref ?? (p.invoice_id ? invoiceNo.get(p.invoice_id) ?? null : null),
        id: p.id,
      });
    }
    all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return all.slice(0, limit);
  }, [invoicesQ.data, paymentsQ.data, clientsQ.data, limit]);

  return { data, isLoading, error };
}
