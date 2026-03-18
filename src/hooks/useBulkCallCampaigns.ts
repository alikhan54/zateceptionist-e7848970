import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";

export function useBulkCallCampaigns(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  const campaigns = useQuery({
    queryKey: ["bulk-call-campaigns", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("bulk_call_campaigns" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) { console.error("[BulkCall] campaigns error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  const createCampaign = useMutation({
    mutationFn: async (payload: {
      name: string;
      purpose?: string;
      script?: string;
      script_type?: string;
      contacts: Array<{ phone: string; name?: string; company?: string; email?: string }>;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      return callWebhook(WEBHOOKS.BULK_CALL_CREATE, { ...payload }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-call-campaigns", tenantId] });
    },
  });

  const startCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!tenantId) throw new Error("No tenant");
      return callWebhook(WEBHOOKS.BULK_CALL_START, { campaign_id: campaignId }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-call-campaigns", tenantId] });
    },
  });

  const pauseCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!tenantId) throw new Error("No tenant");
      return callWebhook(WEBHOOKS.BULK_CALL_PAUSE, { campaign_id: campaignId }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-call-campaigns", tenantId] });
    },
  });

  return { campaigns, createCampaign, startCampaign, pauseCampaign };
}

export function useBulkCallContacts(campaignId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: ["bulk-call-contacts", campaignId],
    queryFn: async () => {
      if (!campaignId || !tenantId) return [];
      const { data, error } = await supabase
        .from("bulk_call_contacts" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) { console.error("[BulkCall] contacts error:", error); return []; }
      return data || [];
    },
    enabled: !!campaignId && !!tenantId,
    refetchInterval: 10000,
  });
}
