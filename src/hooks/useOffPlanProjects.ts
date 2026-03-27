import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface OffPlanProject {
  id: string;
  tenant_id: string;
  developer_name: string;
  project_name: string;
  location: string;
  community: string;
  status: string;
  unit_types: Array<{ type: string; count?: number; area_sqft_min?: number; area_sqft_max?: number }>;
  price_range_min: number;
  price_range_max: number;
  payment_plan: Record<string, any>;
  handover_date: string;
  completion_percentage: number;
  amenities: string[];
  key_selling_points: string[];
  expected_rental_yield_pct: number;
  expected_roi_pct: number;
  description: string;
  data_quality_score: number;
  created_at: string;
}

export interface OffPlanMatch {
  project: OffPlanProject;
  match_score: number;
  match_reasons: string[];
  cross_border: {
    home_currency: string;
    property_range: string;
    down_payment: string;
    monthly_installment: string;
    visa_benefit: string;
  } | null;
  ai_recommendation?: string;
}

export function useOffPlanProjects() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["re-offplan-projects", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("re_offplan_projects" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("completion_percentage", { ascending: false });
      return (data || []) as unknown as OffPlanProject[];
    },
    enabled: !!tenantId,
  });

  const matchMutation = useMutation({
    mutationFn: async (params: {
      client_id?: string;
      budget_min?: number;
      budget_max?: number;
      nationality?: string;
      unit_type?: string;
      purpose?: string;
    }) => {
      const result = await callWebhook("/re-offplan-match", { ...params } as any, tenantId || "");
      return result.data as { matches: OffPlanMatch[]; total_matches: number };
    },
  });

  const stats = {
    total: projects.length,
    launched: projects.filter((p) => p.status === "launched").length,
    underConstruction: projects.filter((p) => p.status === "under_construction").length,
    nearCompletion: projects.filter((p) => p.status === "near_completion").length,
    avgYield: projects.length > 0 ? +(projects.reduce((s, p) => s + Number(p.expected_rental_yield_pct || 0), 0) / projects.length).toFixed(1) : 0,
    developers: [...new Set(projects.map((p) => p.developer_name))],
    locations: [...new Set(projects.map((p) => p.location))],
  };

  return { projects, isLoading, stats, matchToClient: matchMutation.mutateAsync, isMatching: matchMutation.isPending, matchResults: matchMutation.data };
}
