import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type JobTypeAnchorSource =
  | "ch_accounts"
  | "ch_confstmt"
  | "fixed_date"
  | "manual"
  | "none";

export type JobTypeIntervalUnit = "day" | "month" | "year";

export interface AccountingJobType {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  period_interval_value: number | null;
  period_interval_unit: JobTypeIntervalUnit | null;
  deadline_interval_value: number | null;
  deadline_interval_unit: JobTypeIntervalUnit | null;
  anchor_source: JobTypeAnchorSource;
  fixed_period_date: string | null;     // 'MM-DD'
  fixed_deadline_date: string | null;   // 'MM-DD'
  default_fee: number | null;
  default_currency: string;
  auto_reminder: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Reads accounting_job_types for the current tenant. Drives the Create Job
 * picker (Wave 1 Phase B). For accounting_practice_uk tenants only — other
 * tenants will see an empty array (no rows seeded for them; gating handled
 * at the page/menu level via industry).
 */
export function useAccountingJobTypes(opts: { activeOnly?: boolean } = {}) {
  const { tenantId } = useTenant();
  const activeOnly = opts.activeOnly !== false; // default true

  return useQuery({
    queryKey: ["accounting_job_types", tenantId, activeOnly],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("accounting_job_types")
        .select(
          "id, tenant_id, code, name, period_interval_value, period_interval_unit, deadline_interval_value, deadline_interval_unit, anchor_source, fixed_period_date, fixed_deadline_date, default_fee, default_currency, auto_reminder, active, sort_order, created_at, updated_at",
        )
        .eq("tenant_id", tenantId as string);
      if (activeOnly) q = q.eq("active", true);
      q = q.order("sort_order", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AccountingJobType[];
    },
  });
}
