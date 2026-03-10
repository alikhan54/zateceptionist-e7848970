import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface EstimationProject {
  id: string;
  tenant_id: string;
  project_name: string;
  project_number: string | null;
  project_type: string;
  client_id: string | null;
  client_name: string;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  gc_name: string | null;
  gc_company: string | null;
  gc_contact_name: string | null;
  gc_contact_email: string | null;
  gc_contact_phone: string | null;
  architect_firm: string | null;
  architect_contact: string | null;
  architect_email: string | null;
  sales_rep_name: string | null;
  sales_rep_id: string | null;
  building_name: string | null;
  project_address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  building_type: string | null;
  total_sqft: number | null;
  number_of_floors: number | null;
  number_of_buildings: number;
  building_sections: any[];
  bid_date: string | null;
  bid_number: string | null;
  plan_date: string | null;
  plan_revision: string | null;
  specification_sections: string[] | null;
  status: string;
  priority: string;
  complexity: string;
  assigned_estimator_id: string | null;
  assigned_estimator_name: string | null;
  qa_reviewer_id: string | null;
  qa_reviewer_name: string | null;
  trades_requested: string[];
  estimated_project_value: number | null;
  estimation_fee: number | null;
  estimation_fee_status: string;
  received_at: string;
  estimated_completion: string | null;
  actual_completion: string | null;
  turnaround_target_hours: number | null;
  deliverable_qualification: boolean;
  deliverable_color_coded: boolean;
  deliverable_takeoff_file: boolean;
  deliverable_working_drawings: boolean;
  deliverable_quantities_excel: boolean;
  deliverables_sent_at: string | null;
  deliverables_sent_via: string | null;
  ai_complexity_score: number | null;
  ai_confidence_score: number | null;
  ai_estimated_hours: number | null;
  estimation_mode: string;
  current_revision: number;
  total_revisions: number;
  has_addenda: boolean;
  addenda_count: number;
  alternates: any[];
  unit_system: string;
  notes: string | null;
  internal_notes: string | null;
  special_instructions: string | null;
  qualification_notes: string | null;
  exclusions: string | null;
  assumptions: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstimationProjects(searchTerm?: string, statusFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_projects", tenantId, searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("estimation_projects" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.or(`project_name.ilike.%${searchTerm}%,client_name.ilike.%${searchTerm}%,building_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationProject[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("estimation_projects_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "estimation_projects", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["estimation_projects", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createProject = useMutation({
    mutationFn: async (project: Partial<EstimationProject>) => {
      const { data, error } = await supabase
        .from("estimation_projects" as any)
        .insert({ ...project, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationProject;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_projects", tenantId] }); },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationProject> }) => {
      const { error } = await supabase
        .from("estimation_projects" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_projects", tenantId] }); },
  });

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activeStatuses = ["rfp_received", "reviewing", "in_progress", "takeoff_complete", "qa_review", "estimate_drafted", "sent_to_client", "revision_requested", "revision_in_progress", "bid_submitted"];
  const completedStatuses = ["awarded", "lost", "cancelled"];

  const activeProjects = projects.filter(p => activeStatuses.includes(p.status));
  const completedProjects = projects.filter(p => completedStatuses.includes(p.status));
  const awarded = projects.filter(p => p.status === "awarded").length;
  const lost = projects.filter(p => p.status === "lost").length;

  const stats = {
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    dueThisWeek: projects.filter(p => {
      if (!p.bid_date) return false;
      const bd = new Date(p.bid_date);
      return bd >= now && bd <= weekFromNow && activeStatuses.includes(p.status);
    }).length,
    overdue: projects.filter(p => {
      if (!p.bid_date) return false;
      return new Date(p.bid_date) < now && activeStatuses.includes(p.status);
    }).length,
    winRate: (awarded + lost) > 0 ? Math.round((awarded / (awarded + lost)) * 100) : 0,
    totalEstimatedValue: projects.reduce((sum, p) => sum + (p.estimated_project_value || 0), 0),
    totalFees: projects.reduce((sum, p) => sum + (p.estimation_fee || 0), 0),
  };

  return { projects, isLoading, stats, refetch, createProject, updateProject };
}
