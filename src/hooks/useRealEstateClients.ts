import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface REClient {
  id: string;
  tenant_id: string;
  full_name: string;
  full_name_ar: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  nationality: string | null;
  language_preference: string;
  client_type: string;
  client_tier: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_areas: string[];
  preferred_property_types: string[];
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  purpose: string | null;
  financing: string;
  timeline: string | null;
  must_have_amenities: string[];
  portfolio_value: number | null;
  properties_owned: number;
  golden_visa_eligible: boolean;
  assigned_agent_name: string | null;
  lead_source: string | null;
  ai_score: number;
  engagement_score: number;
  last_interaction_at: string | null;
  status: string;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRealEstateClients(searchTerm?: string, filters?: { client_type?: string; client_tier?: string; status?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["re_clients", tenantId, searchTerm, filters],
    queryFn: async () => {
      let query = supabase
        .from("re_clients" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("ai_score", { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,nationality.ilike.%${searchTerm}%`);
      }
      if (filters?.client_type) query = query.eq("client_type", filters.client_type);
      if (filters?.client_tier) query = query.eq("client_tier", filters.client_tier);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as REClient[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("re_clients_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "re_clients", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["re_clients", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createClient = useMutation({
    mutationFn: async (client: Partial<REClient>) => {
      const { data, error } = await supabase
        .from("re_clients" as any)
        .insert({ ...client, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as REClient;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_clients", tenantId] }); },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<REClient> }) => {
      const { error } = await supabase
        .from("re_clients" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_clients", tenantId] }); },
  });

  const activeClients = clients.filter(c => c.status === "active");
  const stats = {
    totalClients: clients.length,
    activeClients: activeClients.length,
    buyers: activeClients.filter(c => c.client_type === "buyer").length,
    investors: activeClients.filter(c => c.client_type === "investor").length,
    tenants: activeClients.filter(c => c.client_type === "tenant").length,
    vipClients: activeClients.filter(c => c.client_tier === "vip").length,
    avgScore: activeClients.length > 0 ? Math.round(activeClients.reduce((sum, c) => sum + c.ai_score, 0) / activeClients.length) : 0,
    newThisMonth: clients.filter(c => {
      const created = new Date(c.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  };

  return { clients, isLoading, stats, refetch, createClient, updateClient };
}
