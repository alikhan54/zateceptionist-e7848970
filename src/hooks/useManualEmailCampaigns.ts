import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";

export function useManualEmailCampaigns(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  const campaigns = useQuery({
    queryKey: ["manual-email-campaigns", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("manual_email_campaigns" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) { console.error("[ManualEmail] campaigns error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  const createCampaign = useMutation({
    mutationFn: async (payload: {
      name: string;
      subject: string;
      body_html: string;
      body_text?: string;
      from_name?: string;
      from_email?: string;
      reply_to?: string;
      recipients: Array<{ email: string; name?: string; company?: string; custom_variables?: Record<string, string> }>;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      return callWebhook(WEBHOOKS.MANUAL_EMAIL_CREATE, { ...payload }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-email-campaigns", tenantId] });
    },
  });

  const startCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!tenantId) throw new Error("No tenant");
      return callWebhook(WEBHOOKS.MANUAL_EMAIL_START, { campaign_id: campaignId }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-email-campaigns", tenantId] });
    },
  });

  const pauseCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!tenantId) throw new Error("No tenant");
      return callWebhook(WEBHOOKS.MANUAL_EMAIL_PAUSE, { campaign_id: campaignId }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-email-campaigns", tenantId] });
    },
  });

  return { campaigns, createCampaign, startCampaign, pauseCampaign };
}

export function useManualEmailRecipients(campaignId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: ["manual-email-recipients", campaignId],
    queryFn: async () => {
      if (!campaignId || !tenantId) return [];
      const { data, error } = await supabase
        .from("manual_email_recipients" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) { console.error("[ManualEmail] recipients error:", error); return []; }
      return data || [];
    },
    enabled: !!campaignId && !!tenantId,
    refetchInterval: 10000,
  });
}
