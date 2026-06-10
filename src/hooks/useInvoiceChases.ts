import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Invoice Phase C (2026-06-10) — per-invoice auto-chase state for the FE.
 * Reads accounting_invoice_chases (RLS tenant-scoped, written by the
 * email-delivery-service chase producer). Surfaces "Chased N× · next {date}"
 * so Adil can SEE the system collecting for him.
 */
export interface InvoiceChaseState {
  invoiceId: string;
  count: number;
  lastStep: number;
  lastSentAt: string | null;
  /** Date the NEXT chase becomes due (null when the 6-step cap is reached). */
  nextDueAt: string | null;
}

const THRESHOLD_DAYS = [1, 7, 14, 21, 28, 35]; // mirrors the service's cadence
const MAX_STEPS = 6;

interface ChaseRow {
  invoice_id: string;
  chase_step: number;
  sent_at: string;
}
interface InvoiceLite {
  id: string;
  due_at: string | null;
  status: string;
}

export function useInvoiceChases() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["invoice_chases", tenantId],
    enabled: !!tenantId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Record<string, InvoiceChaseState>> => {
      const [{ data: chases, error: cErr }, { data: invs, error: iErr }] = await Promise.all([
        supabase
          .from("accounting_invoice_chases")
          .select("invoice_id, chase_step, sent_at")
          .eq("tenant_id", tenantId as string)
          .order("chase_step"),
        supabase
          .from("accounting_invoices")
          .select("id, due_at, status")
          .eq("tenant_id", tenantId as string),
      ]);
      if (cErr) throw cErr;
      if (iErr) throw iErr;
      const dueByInvoice = new Map((invs ?? []).map((i: InvoiceLite) => [i.id, i]));
      const out: Record<string, InvoiceChaseState> = {};
      for (const row of (chases ?? []) as ChaseRow[]) {
        const cur = out[row.invoice_id] ?? {
          invoiceId: row.invoice_id, count: 0, lastStep: 0, lastSentAt: null, nextDueAt: null,
        };
        cur.count += 1;
        if (row.chase_step > cur.lastStep) {
          cur.lastStep = row.chase_step;
          cur.lastSentAt = row.sent_at;
        }
        out[row.invoice_id] = cur;
      }
      // Compute next-due from the invoice's due_at + the next step's threshold.
      for (const st of Object.values(out)) {
        const inv = dueByInvoice.get(st.invoiceId);
        const terminal = !inv || inv.status === "paid" || inv.status === "cancelled";
        if (terminal || st.lastStep >= MAX_STEPS || !inv?.due_at) { st.nextDueAt = null; continue; }
        const dueMs = new Date(inv.due_at).getTime();
        if (!Number.isFinite(dueMs)) { st.nextDueAt = null; continue; }
        st.nextDueAt = new Date(dueMs + THRESHOLD_DAYS[st.lastStep] * 86400000).toISOString();
      }
      return out;
    },
  });
}
