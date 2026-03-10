import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationRFI {
  id: string;
  tenant_id: string;
  project_id: string;
  rfi_number: number;
  date_submitted: string;
  topic: string;
  question: string;
  assumptions: string | null;
  reference_sheets: string | null;
  answer: string | null;
  submitted_by: string | null;
  directed_to: string | null;
  answered_by: string | null;
  answered_at: string | null;
  impacts_estimate: boolean;
  affected_rooms: string[] | null;
  affected_material_tags: string[] | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export function useEstimationRFIs(projectId?: string, statusFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: rfis = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_rfis", tenantId, projectId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("estimation_rfis" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("rfi_number", { ascending: false });

      if (projectId) query = query.eq("project_id", projectId);
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationRFI[];
    },
    enabled: !!tenantId,
  });

  const createRFI = useMutation({
    mutationFn: async (rfi: Partial<EstimationRFI>) => {
      const { data, error } = await supabase
        .from("estimation_rfis" as any)
        .insert({ ...rfi, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationRFI;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_rfis", tenantId] }); },
  });

  const updateRFI = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationRFI> }) => {
      const { error } = await supabase
        .from("estimation_rfis" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_rfis", tenantId] }); },
  });

  const stats = {
    totalRFIs: rfis.length,
    openRFIs: rfis.filter(r => r.status === "open").length,
    answeredRFIs: rfis.filter(r => r.status === "answered").length,
    closedRFIs: rfis.filter(r => r.status === "closed").length,
    avgDaysOpen: rfis.filter(r => r.status === "open").reduce((sum, r) => {
      const days = Math.floor((Date.now() - new Date(r.date_submitted).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0) / Math.max(rfis.filter(r => r.status === "open").length, 1),
  };

  return { rfis, isLoading, stats, refetch, createRFI, updateRFI };
}
