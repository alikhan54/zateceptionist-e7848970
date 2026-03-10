import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationEstimate {
  id: string;
  tenant_id: string;
  project_id: string;
  estimate_number: string | null;
  version: number;
  revision_number: number;
  is_latest: boolean;
  scope_trades: string[] | null;
  scope_description: string | null;
  total_material_cost: number;
  total_labor_cost: number;
  total_freight_cost: number;
  subtotal: number;
  overhead_pct: number;
  profit_pct: number;
  tax_pct: number;
  grand_total: number;
  total_sqft: number;
  total_lf: number;
  total_items: number;
  room_count: number;
  status: string;
  quantities_excel_url: string | null;
  cost_sheet_url: string | null;
  color_coded_pdf_url: string | null;
  qualification_doc_url: string | null;
  takeoff_file_url: string | null;
  sent_to_client_at: string | null;
  sent_via: string | null;
  client_approved: boolean | null;
  client_feedback: string | null;
  qualification_assumptions: string | null;
  qualification_exclusions: string | null;
  qualification_clarifications: string | null;
  qualification_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstimationEstimates(projectId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: estimates = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_estimates", tenantId, projectId],
    queryFn: async () => {
      let query = supabase
        .from("estimation_estimates" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("version", { ascending: false });

      if (projectId) query = query.eq("project_id", projectId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationEstimate[];
    },
    enabled: !!tenantId && !!projectId,
  });

  const createEstimate = useMutation({
    mutationFn: async (estimate: Partial<EstimationEstimate>) => {
      const { data, error } = await supabase
        .from("estimation_estimates" as any)
        .insert({ ...estimate, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationEstimate;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_estimates", tenantId, projectId] }); },
  });

  const updateEstimate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationEstimate> }) => {
      const { error } = await supabase
        .from("estimation_estimates" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_estimates", tenantId, projectId] }); },
  });

  const latestEstimate = estimates.find(e => e.is_latest) || estimates[0] || null;

  return { estimates, latestEstimate, isLoading, refetch, createEstimate, updateEstimate };
}
