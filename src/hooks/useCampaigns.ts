import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  type: 'email' | 'sms' | 'whatsapp' | 'social' | 'multi_channel';
  channel: 'whatsapp' | 'email' | 'sms' | 'instagram' | 'facebook' | 'linkedin';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  audience_type: 'all' | 'segment' | 'custom';
  audience_filter: Record<string, unknown> | null;
  audience_size: number;
  content: Record<string, unknown> | null;
  template_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    replied: number;
    failed: number;
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignInput = Omit<Campaign, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at' | 'stats'>;

export function useCampaigns(options?: { status?: string; type?: string; channel?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: campaigns,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['campaigns', tenantId, options?.status, options?.type, options?.channel],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.type) {
        query = query.eq('type', options.type);
      }
      if (options?.channel) {
        query = query.eq('channel', options.channel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!tenantId,
  });

  const addCampaign = useMutation({
    mutationFn: async (campaign: CampaignInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          tenant_id: tenantId,
          stats: { sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0 },
        })
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const scheduleCampaign = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: 'scheduled',
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const startCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const pauseCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const resumeCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: 'running',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const completeCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  const duplicateCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Get the original campaign
      const { data: original, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;
      
      // Create a copy
      const { id: _, created_at, updated_at, started_at, completed_at, stats, ...campaignData } = original as Campaign;
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaignData,
          name: `${campaignData.name} (Copy)`,
          status: 'draft',
          scheduled_at: null,
          stats: { sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0 },
        })
        .select()
        .single();

      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', tenantId] });
    },
  });

  return {
    campaigns: campaigns ?? [],
    isLoading,
    error,
    refetch,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    scheduleCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    duplicateCampaign,
  };
}

export function useScheduledCampaigns() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['campaigns', 'scheduled', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!tenantId,
  });
}

export function useCampaignStats() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['campaigns', 'stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return { total: 0, running: 0, completed: 0, totalSent: 0, avgDeliveryRate: 0 };
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('status, stats')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      const campaigns = data as Pick<Campaign, 'status' | 'stats'>[];
      
      const total = campaigns.length;
      const running = campaigns.filter(c => c.status === 'running').length;
      const completed = campaigns.filter(c => c.status === 'completed').length;
      
      const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
      const totalDelivered = campaigns.reduce((sum, c) => sum + (c.stats?.delivered || 0), 0);
      const avgDeliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      
      return { total, running, completed, totalSent, avgDeliveryRate };
    },
    enabled: !!tenantId,
  });
}
