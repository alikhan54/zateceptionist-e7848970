import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface RERoadShow {
  id: string;
  tenant_id: string;
  event_name: string;
  event_type: string;
  location: string | null;
  city: string | null;
  country: string | null;
  start_date: string;
  end_date: string | null;
  projects: any[] | null;
  leads_captured: number;
  viewings_booked: number;
  deals_closed: number;
  total_deal_value: number;
  budget: number | null;
  actual_cost: number | null;
  expenses: any[] | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRealEstateRoadShows(filters?: { status?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: roadShows = [], isLoading, refetch } = useQuery({
    queryKey: ["re_road_shows", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("re_road_shows" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as RERoadShow[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("re_road_shows_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "re_road_shows", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["re_road_shows", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createRoadShow = useMutation({
    mutationFn: async (show: Partial<RERoadShow>) => {
      const { data, error } = await supabase
        .from("re_road_shows" as any)
        .insert({ ...show, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RERoadShow;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_road_shows", tenantId] }); },
  });

  const updateRoadShow = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RERoadShow> }) => {
      const { error } = await supabase
        .from("re_road_shows" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_road_shows", tenantId] }); },
  });

  const today = new Date().toISOString().split("T")[0];

  const stats = {
    totalEvents: roadShows.length,
    upcoming: roadShows.filter(s => s.start_date > today).length,
    active: roadShows.filter(s => s.status === "active" || (s.start_date <= today && (!s.end_date || s.end_date >= today))).length,
    completed: roadShows.filter(s => s.status === "completed").length,
    totalLeads: roadShows.reduce((s, r) => s + (r.leads_captured || 0), 0),
    totalViewings: roadShows.reduce((s, r) => s + (r.viewings_booked || 0), 0),
    totalDeals: roadShows.reduce((s, r) => s + (r.deals_closed || 0), 0),
    totalDealValue: roadShows.reduce((s, r) => s + (r.total_deal_value || 0), 0),
    totalBudget: roadShows.reduce((s, r) => s + (r.budget || 0), 0),
    totalCost: roadShows.reduce((s, r) => s + (r.actual_cost || 0), 0),
    roi: roadShows.reduce((s, r) => s + (r.actual_cost || 0), 0) > 0
      ? Math.round((roadShows.reduce((s, r) => s + (r.total_deal_value || 0), 0) / roadShows.reduce((s, r) => s + (r.actual_cost || 0), 0)) * 100)
      : 0,
  };

  return { roadShows, isLoading, stats, refetch, createRoadShow, updateRoadShow };
}
