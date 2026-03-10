import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface REViewing {
  id: string;
  tenant_id: string;
  client_id: string | null;
  listing_id: string | null;
  agent_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  cancellation_reason: string | null;
  client_interested: boolean | null;
  client_feedback: string | null;
  price_reaction: string | null;
  likelihood_score: number | null;
  follow_up_action: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRealEstateViewings(filters?: { status?: string; dateFrom?: string; dateTo?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: viewings = [], isLoading, refetch } = useQuery({
    queryKey: ["re_viewings", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("re_viewings" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("scheduled_date", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.dateFrom) query = query.gte("scheduled_date", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("scheduled_date", filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as REViewing[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("re_viewings_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "re_viewings", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["re_viewings", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createViewing = useMutation({
    mutationFn: async (viewing: Partial<REViewing>) => {
      const { data, error } = await supabase
        .from("re_viewings" as any)
        .insert({ ...viewing, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as REViewing;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_viewings", tenantId] }); },
  });

  const updateViewing = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<REViewing> }) => {
      const { error } = await supabase
        .from("re_viewings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_viewings", tenantId] }); },
  });

  const today = new Date().toISOString().split("T")[0];
  const thisWeekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const stats = {
    totalViewings: viewings.length,
    scheduled: viewings.filter(v => v.status === "scheduled" || v.status === "confirmed").length,
    completed: viewings.filter(v => v.status === "completed").length,
    noShows: viewings.filter(v => v.status === "no_show").length,
    todayViewings: viewings.filter(v => v.scheduled_date === today).length,
    thisWeekViewings: viewings.filter(v => v.scheduled_date >= today && v.scheduled_date <= thisWeekEnd).length,
    interested: viewings.filter(v => v.client_interested === true).length,
    conversionRate: viewings.filter(v => v.status === "completed").length > 0
      ? Math.round((viewings.filter(v => v.client_interested === true).length / viewings.filter(v => v.status === "completed").length) * 100)
      : 0,
  };

  return { viewings, isLoading, stats, refetch, createViewing, updateViewing };
}
