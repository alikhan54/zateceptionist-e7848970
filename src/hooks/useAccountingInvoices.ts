import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled";

export interface AccountingInvoice {
  id: string;
  tenant_id: string;
  client_id: string;
  invoice_no: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string | null;
  sent_at: string | null;
  sent_via_mailbox: string | null;
  due_at: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  // Refinements (migration 42): persisted VAT breakdown for the #1877 totals block.
  // NULL on legacy rows → PDF/email reverse-compute at standard 20%.
  subtotal: number | null;        // gross net before discount
  discount_amount: number | null; // resolved £ discount
  vat_amount: number | null;      // VAT on (subtotal - discount)
  /**
   * Wave 1 Phase E (migration 38): FK to accounting_jobs.id. Populated when a
   * draft invoice is auto-created on job-create-with-owner-and-fee. NULL for
   * legacy invoices + standalone (manually-created) invoices. Enforced as one
   * draft per (tenant_id, job_id) by a partial UNIQUE index.
   */
  job_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  accounting_clients?: { name: string; contact_email: string | null } | null;
}

export interface UseAccountingInvoicesFilters {
  status?: InvoiceStatus;
  clientId?: string;
  searchTerm?: string;
}

export function useAccountingInvoices(filters: UseAccountingInvoicesFilters = {}) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, error, refetch } = useQuery({
    queryKey: ["accounting_invoices", tenantId, filters],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("accounting_invoices")
        .select("*, accounting_clients(name, contact_email)")
        .eq("tenant_id", tenantId as string);

      if (filters.status) q = q.eq("status", filters.status);
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.searchTerm) {
        const t = filters.searchTerm.replace(/[%,]/g, "");
        q = q.or(`invoice_no.ilike.%${t}%,description.ilike.%${t}%`);
      }

      q = q.order("created_at", { ascending: false });

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      return (data ?? []) as unknown as AccountingInvoice[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`accounting_invoices_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounting_invoices",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const createInvoice = useMutation({
    mutationFn: async (inv: Partial<AccountingInvoice>) => {
      if (!tenantId) throw new Error("No tenant context — cannot create invoice");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const payload: Record<string, unknown> = {
        tenant_id: tenantId,
        client_id: inv.client_id,
        invoice_no: inv.invoice_no,
        amount: inv.amount,
        currency: inv.currency ?? "GBP",
        status: (inv.status ?? "draft") as InvoiceStatus,
        description: inv.description ?? null,
        due_at: inv.due_at ?? null,
        // Refinements (migration 42): persist the VAT breakdown when supplied.
        subtotal: inv.subtotal ?? null,
        discount_amount: inv.discount_amount ?? null,
        vat_amount: inv.vat_amount ?? null,
        created_by: userId,
        updated_by: userId,
      };
      // Wave 1 Phase E (migration 38): write job_id when provided so the partial
      // UNIQUE index on (tenant_id, job_id) enforces one draft per job. Omitted
      // for standalone invoices — they remain unconstrained.
      if (inv.job_id !== undefined && inv.job_id !== null) {
        payload.job_id = inv.job_id;
      }

      const { data, error: insErr } = await supabase
        .from("accounting_invoices")
        .insert(payload as never)
        .select("*, accounting_clients(name, contact_email)")
        .single();
      if (insErr) throw insErr;
      return data as unknown as AccountingInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AccountingInvoice> }) => {
      if (!tenantId) throw new Error("No tenant context — cannot update invoice");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      const finalPatch: Partial<AccountingInvoice> & { updated_by: string | null } = {
        ...patch,
        updated_by: userId,
      };

      const { data, error: updErr } = await supabase
        .from("accounting_invoices")
        .update(finalPatch as never)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*, accounting_clients(name, contact_email)")
        .single();
      if (updErr) throw updErr;
      return data as unknown as AccountingInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context");
      const { error: updErr } = await supabase
        .from("accounting_invoices")
        .update({ status: "cancelled" } as never)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant context");
      const { error: delErr } = await supabase
        .from("accounting_invoices")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting_invoices", tenantId] });
    },
  });

  return {
    invoices,
    isLoading,
    error,
    refetch,
    createInvoice,
    updateInvoice,
    cancelInvoice,
    deleteInvoice,
  };
}
