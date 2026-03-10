import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationTeamAssignment {
  id: string;
  tenant_id: string;
  project_id: string;
  team_member_name: string;
  team_member_id: string | null;
  role: string;
  trades_assigned: string[] | null;
  estimated_hours: number | null;
  actual_hours: number;
  hourly_rate: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  accuracy_score: number | null;
  created_at: string;
  updated_at: string;
}

export function useEstimationTeam(projectId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_team", tenantId, projectId],
    queryFn: async () => {
      let query = supabase
        .from("estimation_team_assignments" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("team_member_name");

      if (projectId) query = query.eq("project_id", projectId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationTeamAssignment[];
    },
    enabled: !!tenantId,
  });

  const createAssignment = useMutation({
    mutationFn: async (assignment: Partial<EstimationTeamAssignment>) => {
      const { data, error } = await supabase
        .from("estimation_team_assignments" as any)
        .insert({ ...assignment, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationTeamAssignment;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_team", tenantId] }); },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationTeamAssignment> }) => {
      const { error } = await supabase
        .from("estimation_team_assignments" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_team", tenantId] }); },
  });

  // Group by team member
  const memberMap = assignments.reduce((acc, a) => {
    if (!acc[a.team_member_name]) {
      acc[a.team_member_name] = { name: a.team_member_name, assignments: [], totalHoursAllocated: 0, totalHoursSpent: 0, activeProjects: 0 };
    }
    acc[a.team_member_name].assignments.push(a);
    acc[a.team_member_name].totalHoursAllocated += a.estimated_hours || 0;
    acc[a.team_member_name].totalHoursSpent += a.actual_hours || 0;
    if (a.status === "assigned") acc[a.team_member_name].activeProjects++;
    return acc;
  }, {} as Record<string, { name: string; assignments: EstimationTeamAssignment[]; totalHoursAllocated: number; totalHoursSpent: number; activeProjects: number }>);

  const members = Object.values(memberMap);

  const stats = {
    totalAssignments: assignments.length,
    uniqueMembers: members.length,
    totalHoursAllocated: assignments.reduce((s, a) => s + (a.estimated_hours || 0), 0),
    totalHoursSpent: assignments.reduce((s, a) => s + (a.actual_hours || 0), 0),
    activeAssignments: assignments.filter(a => a.status === "assigned").length,
  };

  return { assignments, members, isLoading, stats, refetch, createAssignment, updateAssignment };
}
