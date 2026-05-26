import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Generates the next invoice_no for the current tenant.
 * Format: `INV-YYYY-NNNN` (year + 4-digit zero-padded counter, starting at 0001 each year).
 *
 * Race-condition tolerance: low-volume accounting practice can tolerate the rare
 * collision (UNIQUE constraint on invoice_no would catch and surface; user retries).
 * Phase 2 would move this to a DB sequence or RPC for atomic generation.
 */
export function useGenerateInvoiceNumber() {
  const { tenantId } = useTenant();

  return useCallback(async (): Promise<string> => {
    if (!tenantId) throw new Error("No tenant context");
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
      const tail = last.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (Number.isFinite(n)) next = n + 1;
    }

    return `${prefix}${String(next).padStart(4, "0")}`;
  }, [tenantId]);
}
