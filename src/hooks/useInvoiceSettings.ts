import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Invoice Phase A (2026-06-10) — per-tenant invoice branding / bank / numbering config.
 * Backed by public.accounting_invoice_settings (migration 40, RLS tenant-scoped).
 * One row per tenant (tenant_id UNIQUE). Null when the tenant hasn't been configured —
 * callers fall back to legacy behaviour (e.g. INV-YYYY-NNNN numbering, unbranded email).
 */
export interface InvoiceSettings {
  id: string;
  tenant_id: string;
  firm_display_name: string | null;
  firm_address: string | null;
  bank_name: string | null;
  account_number: string | null;
  sort_code: string | null;
  iban: string | null;
  company_registration_number: string | null;
  payment_terms_days: number;
  invoice_footer: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  brand_bg: string | null;
  number_prefix: string;
  next_number: number | null;
}

export function useInvoiceSettings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["accounting_invoice_settings", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<InvoiceSettings | null> => {
      const { data, error } = await supabase
        .from("accounting_invoice_settings")
        .select("*")
        .eq("tenant_id", tenantId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as InvoiceSettings) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * After an invoice is created with a settings-driven number, advance next_number so the
 * next invoice continues the sequence. Parses the numeric tail of the used invoice_no
 * (e.g. "1878" or "SL-1878" → 1878) and sets next_number = max(current, tail + 1).
 * Best-effort: failures are swallowed (the generator's max-scan keeps numbers moving).
 */
export function useBumpInvoiceNumber() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return async (usedInvoiceNo: string, settings: InvoiceSettings | null | undefined) => {
    if (!tenantId || !settings || settings.next_number == null) return;
    try {
      const tail = usedInvoiceNo.startsWith(settings.number_prefix)
        ? usedInvoiceNo.slice(settings.number_prefix.length)
        : usedInvoiceNo;
      const n = parseInt(tail.replace(/^\D+/, ""), 10);
      const next = Number.isFinite(n) ? Math.max(settings.next_number, n + 1) : settings.next_number + 1;
      await supabase
        .from("accounting_invoice_settings")
        .update({ next_number: next, updated_at: new Date().toISOString() } as never)
        .eq("tenant_id", tenantId)
        .eq("id", settings.id);
      queryClient.invalidateQueries({ queryKey: ["accounting_invoice_settings", tenantId] });
    } catch {
      /* best-effort */
    }
  };
}
