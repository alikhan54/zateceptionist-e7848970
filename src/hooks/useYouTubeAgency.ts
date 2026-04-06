import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";

// === Types ===

export interface YTChannel {
  id: string;
  tenant_id: string;
  channel_id: string;
  channel_name: string | null;
  channel_url: string | null;
  handle: string | null;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  description: string | null;
  country: string | null;
  language: string | null;
  niche: string | null;
  audience_gender: string;
  thumbnail_url: string | null;
  banner_url: string | null;
  contact_email: string | null;
  social_links: Record<string, string>;
  discovery_source: string | null;
  discovery_batch_id: string | null;
  growth_rate: number | null;
  engagement_rate: number | null;
  quality_score: number;
  status: string;
  assigned_to: string | null;
  first_contacted_at: string | null;
  last_contacted_at: string | null;
  outreach_channel: string | null;
  outreach_count: number;
  response_received: boolean;
  deal_value: number | null;
  currency: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface YTGeneratedAsset {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  asset_type: string;
  prompt: string | null;
  primary_provider: string | null;
  fallback_provider: string | null;
  generation_attempts: number;
  quality_score: number | null;
  quality_passed: boolean;
  quality_metrics: Record<string, unknown>;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  file_size_kb: number | null;
  style_preset: string | null;
  color_palette: string[];
  text_overlay: string | null;
  is_approved: boolean;
  approved_by: string | null;
  sent_to_client: boolean;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YTSeoPackage {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  video_title: string | null;
  video_url: string | null;
  optimized_titles: Array<{ title: string; score: number }>;
  optimized_description: string | null;
  optimized_tags: string[];
  hashtags: string[];
  niche_keywords: string[];
  competitor_analysis: Record<string, unknown>;
  trending_topics: string[];
  search_volume_data: Record<string, unknown>;
  seo_score: number;
  ctr_prediction: number | null;
  ranking_potential: string | null;
  status: string;
  sent_to_client: boolean;
  client_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface YTDiscoveryBatch {
  id: string;
  tenant_id: string;
  search_query: string | null;
  niche_filter: string | null;
  min_subscribers: number;
  max_subscribers: number;
  country_filter: string | null;
  language_filter: string | null;
  audience_gender_filter: string;
  activity_filter: string;
  channels_found: number;
  channels_qualified: number;
  channels_already_known: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  is_recurring: boolean;
  cron_schedule: string | null;
  next_run_at: string | null;
  created_at: string;
}

export interface YTOutreachCampaign {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  target_niche: string | null;
  target_sub_range_min: number | null;
  target_sub_range_max: number | null;
  email_template: string | null;
  whatsapp_template: string | null;
  dm_template: string | null;
  include_thumbnails: boolean;
  include_seo_package: boolean;
  include_banner: boolean;
  status: string;
  channels_targeted: number;
  channels_contacted: number;
  responses_received: number;
  deals_closed: number;
  total_revenue: number;
  avg_deal_value: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YTPaymentTransaction {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string | null;
  payment_proof_url: string | null;
  payer_name: string | null;
  payer_email: string | null;
  status: string;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
}

// === Pipeline Stats ===

export interface PipelineStats {
  discovered: number;
  qualified: number;
  sample_sent: number;
  in_conversation: number;
  negotiating: number;
  payment_pending: number;
  active_client: number;
  upsell: number;
  lost: number;
  total: number;
}

// === Hooks ===

export function useYTChannels(statusFilter?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_channels", tenantId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("yt_channels")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTChannel[];
    },
    enabled: !!tenantId,
  });
}

export function useYTChannel(channelId: string | undefined) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_channel", tenantId, channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yt_channels")
        .select("*")
        .eq("id", channelId!)
        .eq("tenant_id", tenantId!)
        .single();
      if (error) throw error;
      return data as YTChannel;
    },
    enabled: !!tenantId && !!channelId,
  });
}

export function useUpdateYTChannel() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<YTChannel> & { id: string }) => {
      const { data, error } = await supabase
        .from("yt_channels")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_channels"] });
      queryClient.invalidateQueries({ queryKey: ["yt_channel"] });
    },
  });
}

export function useYTAssets(channelId?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_assets", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_generated_assets")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (channelId) {
        query = query.eq("channel_id", channelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTGeneratedAsset[];
    },
    enabled: !!tenantId,
  });
}

export function useYTSeoPackages(channelId?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_seo_packages", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_seo_packages")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (channelId) {
        query = query.eq("channel_id", channelId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTSeoPackage[];
    },
    enabled: !!tenantId,
  });
}

export function useYTDiscoveryBatches() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_discovery_batches", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yt_discovery_batches")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as YTDiscoveryBatch[];
    },
    enabled: !!tenantId,
  });
}

export function useYTOutreachCampaigns() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_outreach_campaigns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yt_outreach_campaigns")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as YTOutreachCampaign[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateYTCampaign() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (campaign: Omit<YTOutreachCampaign, "id" | "tenant_id" | "created_at" | "updated_at" | "channels_targeted" | "channels_contacted" | "responses_received" | "deals_closed" | "total_revenue" | "avg_deal_value" | "started_at" | "completed_at">) => {
      const { data, error } = await supabase
        .from("yt_outreach_campaigns")
        .insert({ ...campaign, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_outreach_campaigns"] });
    },
  });
}

export function useYTPayments() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_payments", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yt_payment_transactions")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as YTPaymentTransaction[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateYTPayment() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (payment: Omit<YTPaymentTransaction, "id" | "tenant_id" | "created_at" | "confirmed_at">) => {
      const { data, error } = await supabase
        .from("yt_payment_transactions")
        .insert({ ...payment, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_payments"] });
    },
  });
}

export function useYTPipelineStats() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["yt_pipeline_stats", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yt_channels")
        .select("status")
        .eq("tenant_id", tenantId!);
      if (error) throw error;

      const stats: PipelineStats = {
        discovered: 0, qualified: 0, sample_sent: 0, in_conversation: 0,
        negotiating: 0, payment_pending: 0, active_client: 0, upsell: 0,
        lost: 0, total: 0,
      };

      (data || []).forEach((row: { status: string }) => {
        const key = row.status.replace(/ /g, "_") as keyof PipelineStats;
        if (key in stats && key !== "total") {
          (stats[key] as number)++;
        }
        stats.total++;
      });

      return stats;
    },
    enabled: !!tenantId,
  });
}

// === Webhook Triggers ===

export function useTriggerDiscovery() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      search_query: string;
      niche_filter?: string;
      min_subscribers?: number;
      max_subscribers?: number;
      country_filter?: string;
      audience_gender_filter?: string;
    }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_DISCOVER, params, tenantId!);
      if (!result.success) throw new Error(result.error || "Discovery failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Discovery Started", description: "Channel discovery batch has been launched." });
      queryClient.invalidateQueries({ queryKey: ["yt_discovery_batches"] });
      queryClient.invalidateQueries({ queryKey: ["yt_channels"] });
    },
    onError: (err: Error) => {
      toast({ title: "Discovery Failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useTriggerAssetGen() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      channel_id: string;
      asset_types: string[];
      style_preset?: string;
    }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_GENERATE_ASSETS, params, tenantId!);
      if (!result.success) throw new Error(result.error || "Asset generation failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Asset Generation Started", description: "AI is generating assets for this channel." });
      queryClient.invalidateQueries({ queryKey: ["yt_assets"] });
    },
    onError: (err: Error) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useTriggerSeoGen() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      channel_id: string;
      video_url?: string;
    }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_GENERATE_SEO, params, tenantId!);
      if (!result.success) throw new Error(result.error || "SEO generation failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "SEO Package Generated", description: "AI SEO optimization complete." });
      queryClient.invalidateQueries({ queryKey: ["yt_seo_packages"] });
    },
    onError: (err: Error) => {
      toast({ title: "SEO Generation Failed", description: err.message, variant: "destructive" });
    },
  });
}

// === Asset Approval ===

export function useApproveAsset() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { data, error } = await supabase
        .from("yt_generated_assets")
        .update({
          is_approved: approved,
          approved_by: approved ? "admin" : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_assets"] });
    },
  });
}

// === Campaign Execution ===

export function useLaunchCampaign() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_SEND_OUTREACH, { campaign_id: campaignId }, tenantId!);
      if (!result.success) throw new Error(result.error || "Campaign launch failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Campaign Launched", description: "Outreach campaign is now running." });
      queryClient.invalidateQueries({ queryKey: ["yt_outreach_campaigns"] });
    },
    onError: (err: Error) => {
      toast({ title: "Launch Failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("yt_outreach_campaigns")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_outreach_campaigns"] });
    },
  });
}

// === Phase 12: Audits, Trends, Scripts ===

export interface YTChannelAudit {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  snapshot_subscribers: number | null;
  snapshot_videos: number | null;
  snapshot_views: number | null;
  branding_score: number;
  has_custom_banner: boolean | null;
  has_custom_avatar: boolean | null;
  banner_quality: string | null;
  avatar_quality: string | null;
  branding_consistency: string | null;
  branding_notes: string | null;
  seo_score: number;
  avg_title_length: number | null;
  avg_description_length: number | null;
  avg_tag_count: number | null;
  titles_with_keywords_pct: number | null;
  seo_issues: string[];
  seo_recommendations: string[];
  content_score: number;
  upload_frequency: string | null;
  avg_uploads_per_month: number | null;
  niche_focus: string | null;
  top_performing_topics: string[];
  growth_score: number;
  monthly_sub_growth_rate: number | null;
  growth_trajectory: string | null;
  estimated_days_to_100k: number | null;
  engagement_score: number;
  avg_likes_per_video: number | null;
  avg_comments_per_video: number | null;
  like_to_view_ratio: number | null;
  overall_score: number;
  overall_grade: string | null;
  priority_recommendations: Array<{ priority: number; area: string; recommendation: string; impact: string }>;
  executive_summary: string | null;
  generated_at: string;
  created_at: string;
}

export interface YTTrendingTopic {
  id: string;
  tenant_id: string;
  topic: string;
  niche: string;
  trend_score: number;
  velocity: string | null;
  search_volume_change_pct: number | null;
  youtube_trending: boolean;
  related_videos_count: number | null;
  avg_views_on_topic: number | null;
  top_video_url: string | null;
  top_video_views: number | null;
  recommended_for_niches: string[];
  suggested_title: string | null;
  suggested_angle: string | null;
  urgency: string | null;
  detected_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface YTVideoScript {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  title: string;
  hook: string | null;
  intro: string | null;
  body_sections: Array<{ heading: string; content: string; duration_seconds: number }>;
  outro: string | null;
  cta: string | null;
  target_duration_seconds: number | null;
  actual_word_count: number | null;
  niche: string | null;
  topic: string | null;
  tone: string;
  suggested_title: string | null;
  suggested_description: string | null;
  suggested_tags: string[];
  suggested_thumbnail_prompt: string | null;
  source_type: string | null;
  source_reference_id: string | null;
  status: string;
  sent_to_client: boolean;
  created_at: string;
  updated_at: string;
}

// Audits
export function useYTAudits(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_audits", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_channel_audits")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTChannelAudit[];
    },
    enabled: !!tenantId,
  });
}

export function useTriggerAudit() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { channel_id: string }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_AUDIT, params, tenantId!);
      if (!result.success) throw new Error(result.error || "Audit failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Audit Started", description: "Channel audit is being generated." });
      queryClient.invalidateQueries({ queryKey: ["yt_audits"] });
    },
    onError: (err: Error) => {
      toast({ title: "Audit Failed", description: err.message, variant: "destructive" });
    },
  });
}

// Trends
export function useYTTrends(niche?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_trends", tenantId, niche],
    queryFn: async () => {
      let query = supabase
        .from("yt_trending_topics")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("trend_score", { ascending: false });
      if (niche) query = query.eq("niche", niche);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTTrendingTopic[];
    },
    enabled: !!tenantId,
  });
}

export function useTriggerTrendRefresh() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_TRENDS_REFRESH, {}, tenantId!);
      if (!result.success) throw new Error(result.error || "Refresh failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Trends Refreshed", description: "Latest trending topics fetched." });
      queryClient.invalidateQueries({ queryKey: ["yt_trends"] });
    },
    onError: (err: Error) => {
      toast({ title: "Refresh Failed", description: err.message, variant: "destructive" });
    },
  });
}

// Scripts
export function useYTScripts(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_scripts", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_video_scripts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTVideoScript[];
    },
    enabled: !!tenantId,
  });
}

export function useTriggerScript() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { channel_id: string; topic: string; tone?: string; target_duration?: number }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_GENERATE_SCRIPT, params, tenantId!);
      if (!result.success) throw new Error(result.error || "Script generation failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Script Generated", description: "AI script ready for review." });
      queryClient.invalidateQueries({ queryKey: ["yt_scripts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Script Failed", description: err.message, variant: "destructive" });
    },
  });
}
