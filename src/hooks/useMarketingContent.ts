import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export type ContentType = 'blog' | 'social' | 'video' | 'email' | 'ad' | 'sms' | 'whatsapp';

export interface MarketingContent {
  id: string;
  tenant_id?: string;
  content_type: ContentType;
  title: string;
  body?: string;
  summary?: string;
  status: string;
  primary_keyword?: string;
  ai_generated: boolean;
  views: number;
  shares: number;
  engagement_score: number;
  created_at: string;
}

export interface TrendInsight {
  id: string;
  tenant_id?: string;
  source: string;
  trend_keyword: string;
  category?: string;
  trend_score?: number;
  ai_relevance_score?: number;
  ai_content_suggestions?: Record<string, any>;
  is_actioned: boolean;
  discovered_at: string;
}

export function useMarketingContent(options?: { content_type?: ContentType; status?: string; limit?: number }) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: content = [], isLoading, error, refetch } = useQuery({
    queryKey: ['marketing_content', tenantUuid, options?.content_type, options?.status],
    queryFn: async (): Promise<MarketingContent[]> => {
      if (!tenantUuid) return [];
      let query = supabase.from('marketing_content').select('*').eq('tenant_id', tenantUuid).order('created_at', { ascending: false });
      if (options?.content_type) query = query.eq('content_type', options.content_type);
      if (options?.status) query = query.eq('status', options.status);
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const stats = {
    total: content.length,
    aiGenerated: content.filter(c => c.ai_generated).length,
    totalViews: content.reduce((sum, c) => sum + (c.views || 0), 0),
  };

  const createContent = useMutation({
    mutationFn: async (input: Partial<MarketingContent>) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await supabase.from('marketing_content').insert({
        tenant_id: tenantUuid,
        content_type: input.content_type || 'social',
        title: input.title || 'Untitled',
        body: input.body,
        status: input.status || 'draft',
        primary_keyword: input.primary_keyword,
        ai_generated: input.ai_generated || false,
        views: 0, shares: 0, engagement_score: 0, conversion_count: 0,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketing_content', tenantUuid] }); toast({ title: 'Content Created' }); },
  });

  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_content').delete().eq('id', id).eq('tenant_id', tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['marketing_content', tenantUuid] }); toast({ title: 'Content Deleted' }); },
  });

  return { content, isLoading, error, refetch, stats, createContent, deleteContent };
}

export function useTrendInsights(options?: { minScore?: number; limit?: number }) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const { toast } = useToast();

  const { data: trends = [], isLoading, refetch } = useQuery({
    queryKey: ['trend_insights', tenantUuid, options?.minScore],
    queryFn: async (): Promise<TrendInsight[]> => {
      if (!tenantUuid) return [];
      let query = supabase.from('trend_insights').select('*').eq('tenant_id', tenantUuid).order('ai_relevance_score', { ascending: false, nullsFirst: false });
      if (options?.minScore) query = query.gte('ai_relevance_score', options.minScore);
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
    staleTime: 60000,
  });

  const highRelevanceTrends = trends.filter(t => (t.ai_relevance_score || 0) >= 7);

  const refreshTrends = useMutation({
    mutationFn: async () => {
      const response = await fetch('https://webhooks.zatesystems.com/webhook/1d12af48-bda7-4a01-b4b6-c5f1612712f1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantUuid }),
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => { toast({ title: 'Refreshing Trends' }); },
  });

  return { trends, highRelevanceTrends, isLoading, refetch, refreshTrends };
}

export default useMarketingContent;
