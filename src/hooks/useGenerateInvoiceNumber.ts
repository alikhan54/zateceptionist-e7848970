import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { InvoiceSettings } from "@/hooks/useInvoiceSettings";

/**
 * Generates the next invoice_no for the current tenant.
 *
 * Invoice Phase B (2026-06-10): SETTINGS-DRIVEN scheme first — when the tenant has an
 * `accounting_invoice_settings` row with `next_number`, emit
 * `${number_prefix}${next_number}` (smart-ledger: prefix='' + 1878 → "1878", continuing
 * Adil's real bare sequence from invoice #1877). The caller bumps next_number after a
 * successful create via useBumpInvoiceNumber.
 *
 * To survive races / out-of-band inserts, the emitted number is also forward-scanned:
 * if an invoice with that exact number already exists, advance until free (bounded).
 *
 * LEGACY fallback (no settings row — e.g. future accounting tenants pre-config):
 * `INV-YYYY-NNNN` (year + 4-digit counter), the original Phase-1 scheme.
 *
 * NOTE (flagged in the audit): the 5 demo invoices use a third scheme `SLS-2026-NNNN`
 * (seed-only). They are ignored by both schemes here and left untouched.
 */
export function useGenerateInvoiceNumber(settings?: InvoiceSettings | null) {
  const { tenantId } = useTenant();

  return useCallback(async (): Promise<string> => {
    if (!tenantId) throw new Error("No tenant context");

    // ---- Settings-driven scheme ----
    if (settings && settings.next_number != null) {
      const prefix = settings.number_prefix ?? "";
      let candidate = settings.next_number;
      for (let i = 0; i < 50; i++) {
        const invoiceNo = `${prefix}${candidate}`;
        const { data, error } = await supabase
          .from("accounting_invoices")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("invoice_no", invoiceNo)
          .limit(1);
        if (error) throw error;
        if (!data || data.length === 0) return invoiceNo;
        candidate += 1;
      }
      return `${prefix}${candidate}`;
    }

    // ---- Legacy fallback: INV-YYYY-NNNN ----
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const { data, error } = await supabase
      .from("accounting_invoices")
      .select("invoice_no")
      .eq("tenant_id", tenantId)
      .like("invoice_no", `${prefix}%`)
      .order("invoice_no", { ascending: false })
      .limit(1);
    if (error) throw error;

    let next = 1;
    if (data && data.length > 0) {
      const last = (data[0] as { invoice_no: string }).invoice_no;
      const n = parseInt(last.slice(prefix.length), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(4, "0")}`;
  }, [tenantId, settings]);
}
