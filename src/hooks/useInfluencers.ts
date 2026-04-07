import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, N8N_WEBHOOK_BASE } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

// ============================================================
// COLLAB / Influencer Hub Hook
// Connects to: influencers, influencer_campaigns,
//              influencer_campaign_members, influencer_outreach_log
// All tables use UUID format for tenant_id (matches marketing convention).
// ============================================================

export interface Influencer {
  id: string;
  tenant_id: string;
  name: string;
  handle?: string | null;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'facebook';
  followers_count: number;
  engagement_rate: number;
  niche?: string[] | null;
  location?: string | null;
  language?: string | null;
  contact_email?: string | null;
  contact_whatsapp?: string | null;
  profile_url?: string | null;
  profile_picture_url?: string | null;
  bio?: string | null;
  avg_likes: number;
  avg_comments: number;
  fit_score: number;
  fit_score_breakdown?: Record<string, number>;
  status:
    | 'discovered'
    | 'contacted'
    | 'negotiating'
    | 'active'
    | 'completed'
    | 'rejected'
    | 'blacklisted';
  source: 'manual' | 'social_listening' | 'apify_discovery' | 'referral';
  discovered_by_agent: boolean;
  notes?: string | null;
  tags?: string[] | null;
  custom_data?: Record<string, unknown>;
  last_activity_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InfluencerCampaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  product_service: string;
  campaign_type: 'awareness' | 'conversion' | 'launch' | 'review' | 'affiliate';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget: number;
  currency: string;
  commission_type: 'flat' | 'percentage' | 'hybrid';
  commission_value: number;
  target_platforms?: string[] | null;
  target_niches?: string[] | null;
  target_min_followers: number;
  target_locations?: string[] | null;
  deliverables?: unknown[];
  brief?: string | null;
  brief_generated_by_ai: boolean;
  tracking_url_base?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_reach: number;
  total_engagements: number;
  total_clicks: number;
  total_conversions: number;
  revenue_attributed: number;
  roi_percentage: number;
  influencer_count: number;
  created_at: string;
  updated_at: string;
}

export interface InfluencerCampaignMember {
  id: string;
  tenant_id: string;
  campaign_id: string;
  influencer_id: string;
  status:
    | 'invited'
    | 'accepted'
    | 'declined'
    | 'active'
    | 'content_submitted'
    | 'content_approved'
    | 'completed'
    | 'cancelled';
  outreach_sent_at?: string | null;
  outreach_channel?: 'whatsapp' | 'email' | 'instagram_dm' | 'manual' | null;
  outreach_message?: string | null;
  response_received_at?: string | null;
  response_text?: string | null;
  agreed_fee: number;
  tracking_link?: string | null;
  tracking_code?: string | null;
  content_due_date?: string | null;
  content_submitted_at?: string | null;
  content_approved_at?: string | null;
  content_url?: string | null;
  content_type?: 'post' | 'story' | 'reel' | 'video' | 'blog' | 'review' | null;
  reach_delivered: number;
  engagements_delivered: number;
  clicks_delivered: number;
  conversions_delivered: number;
  revenue_attributed: number;
  payout_amount: number;
  payout_status: 'pending' | 'approved' | 'paid' | 'disputed';
  payout_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InfluencerOutreachLog {
  id: string;
  tenant_id: string;
  influencer_id: string;
  campaign_id?: string | null;
  direction: 'outbound' | 'inbound';
  channel: 'whatsapp' | 'email' | 'instagram_dm' | 'manual';
  message_text?: string | null;
  message_template?: string | null;
  sent_by: 'agent' | 'human';
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  ai_generated: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface InfluencerCreateInput {
  name: string;
  handle?: string;
  platform: Influencer['platform'];
  followers_count?: number;
  engagement_rate?: number;
  niche?: string[];
  location?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  profile_url?: string;
  bio?: string;
}

export interface InfluencerCampaignCreateInput {
  name: string;
  product_service: string;
  campaign_type?: InfluencerCampaign['campaign_type'];
  budget?: number;
  currency?: string;
  commission_type?: InfluencerCampaign['commission_type'];
  commission_value?: number;
  brief?: string;
  target_platforms?: string[];
  target_niches?: string[];
  target_min_followers?: number;
}

export interface InfluencerStats {
  total: number;
  byStatus: Record<string, number>;
  topScored: Influencer[];
  totalFollowers: number;
  avgFitScore: number;
}

export interface CampaignStats {
  total: number;
  active: number;
  draft: number;
  completed: number;
  totalReach: number;
  totalConversions: number;
  totalRevenue: number;
  avgRoi: number;
}

// ============================================================
// COLLAB call helper — proxies to OMEGA via n8n /webhook/omega-chat
// ============================================================
async function callCollabAgent(message: string, tenantSlug: string, tenantUuid: string): Promise<string> {
  try {
    const resp = await fetch(`${N8N_WEBHOOK_BASE}/omega-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tenant_id: tenantSlug,
        tenant_uuid: tenantUuid,
        channel: 'web_chat',
        sender_identifier: 'frontend-influencer-hub',
        sender_type: 'admin',
      }),
    });
    const data = await resp.json();
    return (data?.response as string) || '';
  } catch (e) {
    return '';
  }
}

// ============================================================
// Main hook
// ============================================================
export function useInfluencers(options?: {
  status?: string;
  platform?: string;
  minScore?: number;
  campaignStatus?: string;
}) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const tenantSlug = tenantConfig?.tenant_id || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ----- Influencers query -----
  const {
    data: influencers = [],
    isLoading: influencersLoading,
    error: influencersError,
    refetch: refetchInfluencers,
  } = useQuery({
    queryKey: ['influencers', tenantUuid, options?.status, options?.platform, options?.minScore],
    queryFn: async (): Promise<Influencer[]> => {
      if (!tenantUuid) return [];
      let query = (supabase as any)
        .from('influencers')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('fit_score', { ascending: false });
      if (options?.status) query = query.eq('status', options.status);
      if (options?.platform) query = query.eq('platform', options.platform);
      if (options?.minScore && options.minScore > 0) query = query.gte('fit_score', options.minScore);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Influencer[];
    },
    enabled: !!tenantUuid,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // ----- Campaigns query -----
  const {
    data: campaigns = [],
    isLoading: campaignsLoading,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: ['influencer_campaigns', tenantUuid, options?.campaignStatus],
    queryFn: async (): Promise<InfluencerCampaign[]> => {
      if (!tenantUuid) return [];
      let query = (supabase as any)
        .from('influencer_campaigns')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });
      if (options?.campaignStatus) query = query.eq('status', options.campaignStatus);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InfluencerCampaign[];
    },
    enabled: !!tenantUuid,
    staleTime: 30000,
  });

  // ----- Outreach log query -----
  const { data: outreachLog = [], isLoading: outreachLoading } = useQuery({
    queryKey: ['influencer_outreach_log', tenantUuid],
    queryFn: async (): Promise<InfluencerOutreachLog[]> => {
      if (!tenantUuid) return [];
      const { data, error } = await (supabase as any)
        .from('influencer_outreach_log')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as InfluencerOutreachLog[];
    },
    enabled: !!tenantUuid,
    staleTime: 15000,
  });

  // ----- Stats -----
  const stats: InfluencerStats = {
    total: influencers.length,
    byStatus: influencers.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {}),
    topScored: [...influencers].sort((a, b) => b.fit_score - a.fit_score).slice(0, 5),
    totalFollowers: influencers.reduce((sum, i) => sum + (i.followers_count || 0), 0),
    avgFitScore:
      influencers.length > 0
        ? Math.round(influencers.reduce((sum, i) => sum + i.fit_score, 0) / influencers.length)
        : 0,
  };

  const campaignStats: CampaignStats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    totalReach: campaigns.reduce((sum, c) => sum + (c.total_reach || 0), 0),
    totalConversions: campaigns.reduce((sum, c) => sum + (c.total_conversions || 0), 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + Number(c.revenue_attributed || 0), 0),
    avgRoi:
      campaigns.length > 0
        ? Math.round(
            campaigns.reduce((sum, c) => sum + Number(c.roi_percentage || 0), 0) / campaigns.length,
          )
        : 0,
  };

  // ----- Mutations: Influencer CRUD -----
  const createInfluencer = useMutation({
    mutationFn: async (input: InfluencerCreateInput) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await (supabase as any)
        .from('influencers')
        .insert({
          tenant_id: tenantUuid,
          name: input.name,
          handle: input.handle || null,
          platform: input.platform,
          followers_count: input.followers_count || 0,
          engagement_rate: input.engagement_rate || 0,
          niche: input.niche || null,
          location: input.location || null,
          contact_email: input.contact_email || null,
          contact_whatsapp: input.contact_whatsapp || null,
          profile_url: input.profile_url || null,
          bio: input.bio || null,
          source: 'manual',
          status: 'discovered',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers', tenantUuid] });
      toast({ title: 'Influencer added' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add influencer', description: err.message, variant: 'destructive' });
    },
  });

  const updateInfluencer = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Influencer> }) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await (supabase as any)
        .from('influencers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantUuid)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers', tenantUuid] });
      toast({ title: 'Influencer updated' });
    },
  });

  const deleteInfluencer = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { error } = await (supabase as any)
        .from('influencers')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantUuid);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers', tenantUuid] });
      toast({ title: 'Influencer removed' });
    },
  });

  // ----- Mutations: Campaign CRUD -----
  const createCampaign = useMutation({
    mutationFn: async (input: InfluencerCampaignCreateInput) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await (supabase as any)
        .from('influencer_campaigns')
        .insert({
          tenant_id: tenantUuid,
          name: input.name,
          product_service: input.product_service,
          campaign_type: input.campaign_type || 'awareness',
          status: 'draft',
          budget: input.budget || 0,
          currency: input.currency || 'USD',
          commission_type: input.commission_type || 'flat',
          commission_value: input.commission_value || 0,
          brief: input.brief || null,
          target_platforms: input.target_platforms || null,
          target_niches: input.target_niches || null,
          target_min_followers: input.target_min_followers || 1000,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer_campaigns', tenantUuid] });
      toast({ title: 'Campaign created' });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InfluencerCampaign> }) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await (supabase as any)
        .from('influencer_campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantUuid)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer_campaigns', tenantUuid] });
      toast({ title: 'Campaign updated' });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { error } = await (supabase as any)
        .from('influencer_campaigns')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantUuid);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer_campaigns', tenantUuid] });
      toast({ title: 'Campaign deleted' });
    },
  });

  // ----- Mutations: Membership -----
  const addInfluencerToCampaign = useMutation({
    mutationFn: async ({
      campaignId,
      influencerId,
      agreedFee,
    }: {
      campaignId: string;
      influencerId: string;
      agreedFee: number;
    }) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      const { data, error } = await (supabase as any)
        .from('influencer_campaign_members')
        .insert({
          tenant_id: tenantUuid,
          campaign_id: campaignId,
          influencer_id: influencerId,
          status: 'invited',
          agreed_fee: agreedFee,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer_campaigns', tenantUuid] });
      toast({ title: 'Influencer added to campaign' });
    },
  });

  // ----- Mutations: Send outreach via COLLAB agent (n8n -> OMEGA -> COLLAB) -----
  const sendOutreach = useMutation({
    mutationFn: async ({
      influencerId,
      channel,
      message,
      campaignId,
    }: {
      influencerId: string;
      channel: 'whatsapp' | 'email';
      message?: string;
      campaignId?: string;
    }) => {
      if (!tenantUuid || !tenantSlug) throw new Error('No tenant context');
      const prompt = message
        ? `Send an outreach ${channel} message to influencer ${influencerId}${campaignId ? ` for campaign ${campaignId}` : ''}: "${message}"`
        : `Send an AI-generated outreach ${channel} message to influencer ${influencerId}${campaignId ? ` for campaign ${campaignId}` : ''}.`;
      const response = await callCollabAgent(prompt, tenantSlug, tenantUuid);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencer_outreach_log', tenantUuid] });
      queryClient.invalidateQueries({ queryKey: ['influencers', tenantUuid] });
      toast({ title: 'Outreach queued' });
    },
    onError: (err: Error) => {
      toast({ title: 'Outreach failed', description: err.message, variant: 'destructive' });
    },
  });

  // ----- AI fit scoring (calls COLLAB.score_influencer_fit via n8n -> OMEGA) -----
  const scoreInfluencerFit = useMutation({
    mutationFn: async (influencerId: string) => {
      if (!tenantUuid || !tenantSlug) throw new Error('No tenant context');
      const prompt = `Score the fit of influencer ${influencerId} for our brand. Use the score_influencer_fit tool.`;
      const response = await callCollabAgent(prompt, tenantSlug, tenantUuid);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers', tenantUuid] });
      toast({ title: 'Fit scoring complete' });
    },
    onError: (err: Error) => {
      toast({ title: 'Scoring failed', description: err.message, variant: 'destructive' });
    },
  });

  // ----- AI brief generator (calls COLLAB.create_campaign with empty brief) -----
  const generateCampaignBrief = useMutation({
    mutationFn: async ({
      productService,
      campaignType,
    }: {
      productService: string;
      campaignType?: string;
    }) => {
      if (!tenantUuid || !tenantSlug) throw new Error('No tenant context');
      const prompt = `Generate an influencer campaign brief for "${productService}" (campaign type: ${campaignType || 'awareness'}). Just return the brief text, do not create the campaign yet.`;
      const response = await callCollabAgent(prompt, tenantSlug, tenantUuid);
      return response;
    },
  });

  return {
    // data
    influencers,
    campaigns,
    outreachLog,
    stats,
    campaignStats,
    // loading
    isLoading: influencersLoading || campaignsLoading || outreachLoading,
    influencersLoading,
    campaignsLoading,
    outreachLoading,
    error: influencersError,
    // refetch
    refetchInfluencers,
    refetchCampaigns,
    // mutations
    createInfluencer,
    updateInfluencer,
    deleteInfluencer,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    addInfluencerToCampaign,
    sendOutreach,
    scoreInfluencerFit,
    generateCampaignBrief,
  };
}
