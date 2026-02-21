import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export interface MarketingCampaign {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: string;
  audience_type?: string;
  message_template?: string;
  media_url?: string;
  service_id?: string;
  scheduled_at?: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  created_at: string;
  updated_at?: string;
  open_rate?: number;
  click_rate?: number;
}

export interface CampaignCreateInput {
  name: string;
  type: string;
  audience_type?: string;
  message_template: string;
  media_url?: string;
  service_id?: string;
  scheduled_at?: string;
  send_now?: boolean;
}

export interface CampaignStats {
  total: number;
  active: number;
  scheduled: number;
  completed: number;
  draft: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export function useMarketingCampaigns(options?: { status?: string; type?: string; limit?: number }) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ['marketing_campaigns', tenantUuid, options?.status, options?.type],
    queryFn: async (): Promise<MarketingCampaign[]> => {
      if (!tenantUuid) return [];
      let query = supabase.from('marketing_campaigns').select('*').eq('tenant_id', tenantUuid).order('created_at', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      if (options?.type) query = query.eq('type', options.type);
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        open_rate: c.delivered_count > 0 ? Math.round((c.opened_count / c.delivered_count) * 100) : 0,
        click_rate: c.opened_count > 0 ? Math.round((c.clicked_count / c.opened_count) * 100) : 0,
      }));
    },
    enabled: !!tenantUuid,
    staleTime: 30000,
  });

  const stats: CampaignStats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active' || c.status === 'sending').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    completed: campaigns.filter(c => c.status === 'completed' || c.status === 'sent').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
    totalDelivered: campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0),
    totalOpened: campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0),
    avgOpenRate: campaigns.length > 0 ? Math.round(campaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / campaigns.length) : 0,
    avgClickRate: campaigns.length > 0 ? Math.round(campaigns.reduce((sum, c) => sum + (c.click_rate || 0), 0) / campaigns.length) : 0,
  };

  const createCampaign = useMutation({
    mutationFn: async (input: CampaignCreateInput) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await supabase.from('marketing_campaigns').insert({
        tenant_id: tenantUuid,
        name: input.name,
        type: input.type,
        audience_type: input.audience_type,
        message_template: input.message_template,
        media_url: input.media_url,
        service_id: input.service_id,
        status: input.send_now ? 'active' : (input.scheduled_at ? 'scheduled' : 'draft'),
        scheduled_at: input.scheduled_at,
        sent_count: 0, delivered_count: 0, opened_count: 0, clicked_count: 0, converted_count: 0,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', tenantUuid] });
      toast({ title: 'Campaign Created', description: `"${data.name}" has been created.` });
    },
    onError: (err: Error) => { toast({ title: 'Failed', description: err.message, variant: 'destructive' }); },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketingCampaign> & { id: string }) => {
      const { data, error } = await supabase.from('marketing_campaigns').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantUuid).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', tenantUuid] }); toast({ title: 'Campaign Updated' }); },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id).eq('tenant_id', tenantUuid);
      if (error) throw error;
      return id;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', tenantUuid] }); toast({ title: 'Campaign Deleted' }); },
  });

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      await updateCampaign.mutateAsync({ id: campaignId, status: 'sending' });
      const { callWebhook, WEBHOOKS } = await import('@/integrations/supabase/client');
      const campaign = campaigns.find(c => c.id === campaignId);
      const result = await callWebhook(WEBHOOKS.SEND_CAMPAIGN, {
        campaign_id: campaignId,
        campaign_name: campaign?.name || '',
        channel: campaign?.type || '',
        audience: campaign?.audience_type || '',
        customMessage: campaign?.message_template || '',
        mediaUrl: campaign?.media_url || '',
        action: 'send',
      }, tenantUuid!);
      if (!result.success) throw new Error(result.error || 'Failed to trigger campaign');
      return result.data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', tenantUuid] }); toast({ title: 'Campaign Sending' }); },
  });

  return { campaigns, isLoading, error, refetch, stats, createCampaign, updateCampaign, deleteCampaign, sendCampaign };
}

export default useMarketingCampaigns;
