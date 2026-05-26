import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { InvoiceStatus } from "@/hooks/useAccountingInvoices";

export interface RecordPaymentInput {
  invoice_id: string;
  amount: number;
  payment_date: string;      // YYYY-MM-DD
  source?: string;           // defaults to 'manual'
  transaction_ref?: string | null;
  notes?: string | null;
}

interface AccountingInvoiceLite {
  id: string;
  amount: number | string;
  status: InvoiceStatus;
  paid_at: string | null;
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function useRecordPayment() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentInput) => {
      if (!tenantId) throw new Error("No tenant context");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      // 1. INSERT payment row
      const { error: insErr } = await supabase
        .from("accounting_payments")
        .insert({
          tenant_id: tenantId,
          invoice_id: payload.invoice_id,
          amount: payload.amount,
          currency: "GBP",
          payment_date: payload.payment_date,
          source: payload.source ?? "manual",
          transaction_ref: payload.transaction_ref ?? null,
          matched_via: "manual",
          notes: payload.notes ?? null,
          recorded_by: userId,
          created_by: userId,
          updated_by: userId,
        } as never);
      if (insErr) throw insErr;

      // 2. Read invoice + all matched payments to decide new status
      const { data: invData, error: invErr } = await supabase
        .from("accounting_invoices")
        .select("id, amount, status, paid_at")
        .eq("id", payload.invoice_id)
        .eq("tenant_id", tenantId)
        .single();
      if (invErr) throw invErr;
      const invoice = invData as unknown as AccountingInvoiceLite;

      const { data: pays, error: pErr } = await supabase
        .from("accounting_payments")
        .select("amount")
        .eq("invoice_id", payload.invoice_id)
        .eq("tenant_id", tenantId);
      if (pErr) throw pErr;
      const totalPaid = (pays ?? []).reduce(
        (s, p: { amount: number | string }) => s + toNum(p.amount),
        0,
      );

      const invoiceTotal = toNum(invoice.amount);
      let newStatus: InvoiceStatus = invoice.status;
      let paidAt: string | null = invoice.paid_at;

      if (totalPaid >= invoiceTotal && invoice.status !== "paid") {
        newStatus = "paid";
        paidAt = new Date().toISOString();
      } else if (totalPaid > 0 && totalPaid < invoiceTotal) {
        if (invoice.status === "draft" || invoice.status === "sent" || invoice.status === "overdue") {
          newStatus = "partial";
        }
      }

      if (newStatus !== invoice.status) {
        const { error: updErr } = await supabase
          .from("accounting_invoices")
          .update({
            status: newStatus,
            paid_at: newStatus === "paid" ? paidAt : null,
            updated_by: userId,
          } as never)
          .eq("id", payload.invoice_id)
          .eq("tenant_id", tenantId);
        if (updErr) throw updErr;
      }

      return { totalPaid, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance_payments", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance_invoices", tenantId] });
    },
  });
}
