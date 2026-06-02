import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface AccountingJobStatusRow {
  id: string;
  tenant_id: string;
  code: string;
  label: string;
  sort_order: number;
  color: string | null;
  is_terminal: boolean;
  active: boolean;
}

/**
 * Wave 2a Phase 3 — reads the configurable 13-stage job workflow from
 * accounting_job_statuses (by sort_order). Empty for non-accounting tenants
 * (none seeded) → callers fall back to the legacy 5-status set.
 */
export function useAccountingJobStatuses(opts: { activeOnly?: boolean } = {}) {
  const { tenantId } = useTenant();
  const activeOnly = opts.activeOnly !== false;
  return useQuery({
    queryKey: ["accounting_job_statuses", tenantId, activeOnly],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("accounting_job_statuses")
        .select("id, tenant_id, code, label, sort_order, color, is_terminal, active")
        .eq("tenant_id", tenantId as string);
      if (activeOnly) q = q.eq("active", true);
      q = q.order("sort_order", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AccountingJobStatusRow[];
    },
  });
}
