import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationRevision {
  id: string;
  tenant_id: string;
  project_id: string;
  revision_number: number;
  revision_type: string | null;
  material_schedule_changes: string | null;
  layout_changes: string | null;
  is_full_re_estimate: boolean;
  building_sections_affected: string[] | null;
  building_sections_unchanged: string[] | null;
  rooms_affected: string[] | null;
  trades_affected: string[] | null;
  alternates_added: string[] | null;
  alternates_removed: string[] | null;
  quantity_delta_pct: number | null;
  cost_delta: number | null;
  status: string;
  requested_by: string | null;
  requested_at: string;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useEstimationRevisions(projectId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: revisions = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_revisions", tenantId, projectId],
    queryFn: async () => {
      let query = supabase
        .from("estimation_revisions" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("revision_number", { ascending: false });

      if (projectId) query = query.eq("project_id", projectId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationRevision[];
    },
    enabled: !!tenantId && !!projectId,
  });

  const createRevision = useMutation({
    mutationFn: async (revision: Partial<EstimationRevision>) => {
      const { data, error } = await supabase
        .from("estimation_revisions" as any)
        .insert({ ...revision, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationRevision;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_revisions", tenantId, projectId] }); },
  });

  const updateRevision = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationRevision> }) => {
      const { error } = await supabase
        .from("estimation_revisions" as any)
        .update(updates as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_revisions", tenantId, projectId] }); },
  });

  const stats = {
    totalRevisions: revisions.length,
    pendingRevisions: revisions.filter(r => r.status === "pending").length,
    totalCostImpact: revisions.reduce((sum, r) => sum + (r.cost_delta || 0), 0),
    fullReEstimates: revisions.filter(r => r.is_full_re_estimate).length,
  };

  return { revisions, isLoading, stats, refetch, createRevision, updateRevision };
}
