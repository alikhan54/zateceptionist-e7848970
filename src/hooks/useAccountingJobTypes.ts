import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/**
 * Wave 2a Phase 4 — admin add / edit / disable of accounting_job_types.
 * RLS gates writes to the tenant (rls_tenant_write/update). Reads include
 * inactive rows so the admin can re-enable. Slugifies new codes.
 */
export function slugifyJobTypeCode(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "custom_type";
}

export function useAccountingJobTypesAdmin() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["accounting_job_types", tenantId] });
  };

  const createJobType = useMutation({
    mutationFn: async (payload: Partial<AccountingJobType> & { name: string }) => {
      if (!tenantId) throw new Error("No tenant context");
      const code = payload.code?.trim() || slugifyJobTypeCode(payload.name);
      const row = {
        tenant_id: tenantId,
        code,
        name: payload.name.trim(),
        anchor_source: payload.anchor_source ?? "manual",
        period_interval_value: payload.period_interval_value ?? null,
        period_interval_unit: payload.period_interval_unit ?? null,
        deadline_interval_value: payload.deadline_interval_value ?? null,
        deadline_interval_unit: payload.deadline_interval_unit ?? null,
        fixed_period_date: payload.fixed_period_date ?? null,
        fixed_deadline_date: payload.fixed_deadline_date ?? null,
        default_fee: payload.default_fee ?? null,
        default_currency: payload.default_currency ?? "GBP",
        auto_reminder: payload.auto_reminder ?? true,
        active: payload.active ?? true,
        sort_order: payload.sort_order ?? 200,
      };
      const { data, error } = await supabase.from("accounting_job_types").insert(row as never).select("*").single();
      if (error) throw error;
      return data as unknown as AccountingJobType;
    },
    onSuccess: invalidate,
  });

  const updateJobType = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AccountingJobType> }) => {
      if (!tenantId) throw new Error("No tenant context");
      const { data, error } = await supabase
        .from("accounting_job_types")
        .update(patch as never)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as AccountingJobType;
    },
    onSuccess: invalidate,
  });

  return { createJobType, updateJobType };
}
