import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface REEOI {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_name: string;
  developer_name: string | null;
  preferred_unit_type: string | null;
  preferred_floor: string | null;
  preferred_view: string | null;
  budget_max: number | null;
  eoi_amount: number | null;
  eoi_paid: boolean;
  eoi_payment_date: string | null;
  eoi_payment_method: string | null;
  eoi_receipt_url: string | null;
  status: string;
  allocated_unit: string | null;
  priority_number: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRealEstateEOI(filters?: { status?: string; project_name?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: eois = [], isLoading, refetch } = useQuery({
    queryKey: ["re_eoi", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("re_eoi" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.project_name) query = query.eq("project_name", filters.project_name);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as REEOI[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("re_eoi_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "re_eoi", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["re_eoi", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createEOI = useMutation({
    mutationFn: async (eoi: Partial<REEOI>) => {
      const { data, error } = await supabase
        .from("re_eoi" as any)
        .insert({ ...eoi, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as REEOI;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_eoi", tenantId] }); },
  });

  const updateEOI = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<REEOI> }) => {
      const { error } = await supabase
        .from("re_eoi" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_eoi", tenantId] }); },
  });

  const projects = [...new Set(eois.map(e => e.project_name))];

  const stats = {
    totalEOIs: eois.length,
    submitted: eois.filter(e => e.status === "submitted").length,
    approved: eois.filter(e => e.status === "approved").length,
    allocated: eois.filter(e => e.status === "allocated").length,
    converted: eois.filter(e => e.status === "converted_to_deal").length,
    paid: eois.filter(e => e.eoi_paid).length,
    unpaid: eois.filter(e => !e.eoi_paid).length,
    totalEOIValue: eois.reduce((s, e) => s + (e.eoi_amount || 0), 0),
  };

  return { eois, isLoading, stats, projects, refetch, createEOI, updateEOI };
}
