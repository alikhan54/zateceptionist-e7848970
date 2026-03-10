import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface REDeal {
  id: string;
  tenant_id: string;
  client_id: string | null;
  listing_id: string | null;
  deal_type: string;
  deal_reference: string | null;
  asking_price: number | null;
  offer_price: number | null;
  agreed_price: number | null;
  currency: string;
  offers: any[];
  stage: string;
  form_a_signed: boolean;
  form_a_date: string | null;
  form_b_signed: boolean;
  form_b_date: string | null;
  form_f_signed: boolean;
  form_f_date: string | null;
  mou_document_url: string | null;
  deposit_amount: number | null;
  deposit_method: string | null;
  deposit_received: boolean;
  deposit_date: string | null;
  noc_applied_date: string | null;
  noc_received_date: string | null;
  noc_fee: number | null;
  dld_transfer_date: string | null;
  dld_fee: number | null;
  title_deed_number: string | null;
  oqood_number: string | null;
  spa_signed: boolean;
  ejari_number: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  annual_rent: number | null;
  security_deposit: number | null;
  cheques: number | null;
  commission_percentage: number;
  commission_amount: number | null;
  commission_vat: number | null;
  commission_status: string;
  agent_split_percentage: number;
  agent_commission: number | null;
  agency_commission: number | null;
  payments: any[];
  lead_agent_name: string | null;
  co_agent_name: string | null;
  offer_date: string | null;
  closing_date: string | null;
  expected_close_date: string | null;
  status: string;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const DEAL_STAGES = ["offer", "negotiation", "mou_signing", "deposit_received", "noc_applied", "noc_received", "dld_transfer", "completed"];

export function useRealEstateDeals(filters?: { stage?: string; status?: string; deal_type?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ["re_deals", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("re_deals" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (filters?.stage) query = query.eq("stage", filters.stage);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.deal_type) query = query.eq("deal_type", filters.deal_type);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as REDeal[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("re_deals_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "re_deals", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["re_deals", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createDeal = useMutation({
    mutationFn: async (deal: Partial<REDeal>) => {
      const { data, error } = await supabase
        .from("re_deals" as any)
        .insert({ ...deal, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as REDeal;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_deals", tenantId] }); },
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<REDeal> }) => {
      const { error } = await supabase
        .from("re_deals" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_deals", tenantId] }); },
  });

  const activeDeals = deals.filter(d => d.status === "active");
  const pipeline = DEAL_STAGES.map(stage => ({
    stage,
    count: activeDeals.filter(d => d.stage === stage).length,
    value: activeDeals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.agreed_price || d.offer_price || 0), 0),
  }));

  const stats = {
    totalDeals: deals.length,
    activeDeals: activeDeals.length,
    completedDeals: deals.filter(d => d.status === "completed").length,
    pipelineValue: activeDeals.reduce((sum, d) => sum + (d.agreed_price || d.offer_price || 0), 0),
    totalCommission: deals.filter(d => d.commission_amount).reduce((sum, d) => sum + (d.commission_amount || 0), 0),
    commissionPaid: deals.filter(d => d.commission_status === "paid").reduce((sum, d) => sum + (d.commission_amount || 0), 0),
    commissionPending: deals.filter(d => d.commission_status === "pending").reduce((sum, d) => sum + (d.commission_amount || 0), 0),
    avgDealValue: activeDeals.length > 0 ? Math.round(activeDeals.reduce((sum, d) => sum + (d.agreed_price || 0), 0) / activeDeals.length) : 0,
    pipeline,
  };

  return { deals, isLoading, stats, refetch, createDeal, updateDeal, DEAL_STAGES };
}
