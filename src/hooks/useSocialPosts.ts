import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, callWebhook, WEBHOOKS } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok' | 'youtube';
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface SocialPost {
  id: string;
  tenant_id?: string;
  content_id?: string;
  account_id?: string;
  platform: SocialPlatform;
  post_text: string;
  hashtags: string[];
  mentions: string[];
  media_urls: string[];
  link_url?: string;
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  platform_post_id?: string;
  platform_response?: Record<string, any>;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagement_rate: number;
  ai_optimized: boolean;
  error_message?: string;
}

export interface CreatePostInput {
  platform: SocialPlatform;
  post_text: string;
  hashtags?: string[];
  media_urls?: string[];
  scheduled_at?: string;
  publish_now?: boolean;
}

export function useSocialPosts(options?: { status?: PostStatus; platform?: SocialPlatform; limit?: number }) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['social_posts', tenantUuid, options?.status, options?.platform],
    queryFn: async (): Promise<SocialPost[]> => {
      if (!tenantUuid) return [];
      let query = supabase.from('social_posts').select('*').eq('tenant_id', tenantUuid).order('created_at', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      if (options?.platform) query = query.eq('platform', options.platform);
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
    staleTime: 30000,
    refetchInterval: 15000,
  });

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    draft: posts.filter(p => p.status === 'draft').length,
    failed: posts.filter(p => p.status === 'failed').length,
    totalLikes: posts.reduce((sum, p) => sum + (p.likes_count || 0), 0),
    totalImpressions: posts.reduce((sum, p) => sum + (p.impressions || 0), 0),
  };

  const createPost = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const status: PostStatus = input.publish_now ? 'scheduled' : (input.scheduled_at ? 'scheduled' : 'draft');
      const scheduled_at = input.publish_now ? new Date().toISOString() : input.scheduled_at;
      const { data, error } = await supabase.from('social_posts').insert({
        tenant_id: tenantUuid,
        platform: input.platform,
        post_text: input.post_text,
        hashtags: input.hashtags || [],
        mentions: [],
        media_urls: input.media_urls || [],
        status,
        scheduled_at,
        ai_optimized: false,
        likes_count: 0, comments_count: 0, shares_count: 0, impressions: 0, reach: 0, clicks: 0, engagement_rate: 0,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, input) => {
      queryClient.invalidateQueries({ queryKey: ['social_posts', tenantUuid] });
      // Trigger immediate publish via webhook if publish_now
      if (input.publish_now && data?.id && tenantUuid) {
        try {
          await callWebhook(WEBHOOKS.POST_SOCIAL, {
            post_id: data.id,
            platform: input.platform,
            post_text: input.post_text,
            hashtags: input.hashtags || [],
            media_urls: input.media_urls || [],
            tenant_id: tenantUuid,
          }, tenantUuid);
        } catch (webhookErr) {
          console.warn('Immediate publish webhook failed, will retry via cron:', webhookErr);
        }
      }
      toast({ title: 'Success', description: data.status === 'scheduled' ? 'Post queued for publishing!' : 'Post saved as draft.' });
    },
    onError: (err: Error) => { toast({ title: 'Failed', description: err.message, variant: 'destructive' }); },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('social_posts').delete().eq('id', id).eq('tenant_id', tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social_posts', tenantUuid] }); toast({ title: 'Post Deleted' }); },
  });

  const publishNow = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.from('social_posts').update({ status: 'scheduled', scheduled_at: new Date().toISOString() }).eq('id', postId).eq('tenant_id', tenantUuid).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social_posts', tenantUuid] }); toast({ title: 'Publishing' }); },
  });

  return { posts, isLoading, error, refetch, stats, createPost, deletePost, publishNow };
}

export function useSocialAccounts() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['social_accounts', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase.from('social_accounts').select('*').eq('tenant_id', tenantUuid);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });
  return { accounts, connectedAccounts: accounts.filter((a: any) => a.is_active), totalFollowers: accounts.reduce((sum: number, a: any) => sum + (a.followers_count || 0), 0), isLoading };
}

export default useSocialPosts;
