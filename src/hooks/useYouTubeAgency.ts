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

// === Phase 13: Competitors, Reports, Content Calendar ===

export interface YTCompetitorTracking {
  id: string;
  tenant_id: string;
  client_channel_id: string | null;
  competitor_yt_id: string;
  competitor_name: string | null;
  competitor_handle: string | null;
  competitor_subscribers: number | null;
  competitor_total_views: number | null;
  competitor_video_count: number | null;
  competitor_niche: string | null;
  is_active: boolean;
  last_checked_at: string | null;
  last_video_id: string | null;
  last_video_title: string | null;
  last_video_published_at: string | null;
  sub_gap: number | null;
  upload_freq_comparison: string | null;
  engagement_comparison: string | null;
  competitor_top_topics: string[];
  competitor_title_patterns: string[];
  competitor_avg_views_per_video: number | null;
  content_gaps: string[];
  created_at: string;
  updated_at: string;
}

export interface YTCompetitorAlert {
  id: string;
  tenant_id: string;
  client_channel_id: string | null;
  competitor_tracking_id: string | null;
  alert_type: string;
  title: string;
  description: string | null;
  competitor_name: string | null;
  video_id: string | null;
  video_title: string | null;
  video_views: number | null;
  video_published_at: string | null;
  suggested_action: string | null;
  urgency: string;
  is_read: boolean;
  is_actioned: boolean;
  actioned_note: string | null;
  created_at: string;
}

export interface YTClientReport {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  report_type: string;
  period_start: string;
  period_end: string;
  thumbnails_delivered: number;
  seo_packages_delivered: number;
  scripts_delivered: number;
  outreach_messages_sent: number;
  subscribers_start: number | null;
  subscribers_end: number | null;
  subscriber_change: number | null;
  total_views_start: number | null;
  total_views_end: number | null;
  view_change: number | null;
  top_performing_video_title: string | null;
  top_performing_video_views: number | null;
  executive_summary: string | null;
  key_wins: string[];
  recommendations_next_period: string[];
  report_html: string | null;
  status: string;
  sent_at: string | null;
  sent_via: string | null;
  created_at: string;
}

export interface YTContentCalendarEntry {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  title: string;
  description: string | null;
  topic: string | null;
  niche: string | null;
  planned_date: string;
  planned_time: string | null;
  timezone: string;
  script_id: string | null;
  thumbnail_id: string | null;
  seo_package_id: string | null;
  status: string;
  channel_name: string | null;
  notes: string | null;
  client_approved: boolean;
  created_at: string;
  updated_at: string;
}

// === COMPETITORS ===
export function useYTCompetitors(clientChannelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_competitors", tenantId, clientChannelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_competitor_tracking")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("competitor_subscribers", { ascending: false });
      if (clientChannelId) query = query.eq("client_channel_id", clientChannelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTCompetitorTracking[];
    },
    enabled: !!tenantId,
  });
}

export function useYTAlerts(unreadOnly?: boolean) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_alerts", tenantId, unreadOnly],
    queryFn: async () => {
      let query = supabase
        .from("yt_competitor_alerts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (unreadOnly) query = query.eq("is_read", false);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTCompetitorAlert[];
    },
    enabled: !!tenantId,
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("yt_competitor_alerts")
        .update({ is_read: true })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_alerts"] });
    },
  });
}

export function useDiscoverCompetitors() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { client_channel_id: string }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_DISCOVER_COMPETITORS, params, tenantId!);
      if (!result.success) throw new Error(result.error || "Discovery failed");
      return result.data;
    },
    onError: (err: Error) => {
      toast({ title: "Discovery Failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useTrackCompetitor() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (params: Partial<YTCompetitorTracking>) => {
      const { data, error } = await supabase
        .from("yt_competitor_tracking")
        .insert({ ...params, tenant_id: tenantId!, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_competitors"] });
    },
  });
}

export function useRemoveCompetitor() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("yt_competitor_tracking")
        .update({ is_active: false })
        .eq("id", id)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_competitors"] });
    },
  });
}

// === REPORTS ===
export function useYTReports(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_reports", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_client_reports")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTClientReport[];
    },
    enabled: !!tenantId,
  });
}

export function useTriggerReport() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { channel_id: string; report_type: string; period_start: string; period_end: string }) => {
      const result = await callWebhook(WEBHOOKS.YOUTUBE_GENERATE_REPORT, params, tenantId!);
      if (!result.success) throw new Error(result.error || "Report generation failed");
      return result.data;
    },
    onSuccess: () => {
      toast({ title: "Report Generated", description: "Client report is ready." });
      queryClient.invalidateQueries({ queryKey: ["yt_reports"] });
    },
    onError: (err: Error) => {
      toast({ title: "Report Failed", description: err.message, variant: "destructive" });
    },
  });
}

// === CONTENT CALENDAR ===
export function useYTCalendar(month?: string, channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_calendar", tenantId, month, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_content_calendar")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("planned_date", { ascending: true });
      if (month) {
        // month format: "2026-04"
        const start = `${month}-01`;
        const [year, mon] = month.split("-").map(Number);
        const nextMonth = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;
        query = query.gte("planned_date", start).lt("planned_date", nextMonth);
      }
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTContentCalendarEntry[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateCalendarEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (params: Partial<YTContentCalendarEntry>) => {
      const { data, error } = await supabase
        .from("yt_content_calendar")
        .insert({ ...params, tenant_id: tenantId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_calendar"] });
    },
  });
}

export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<YTContentCalendarEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from("yt_content_calendar")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_calendar"] });
    },
  });
}

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("yt_content_calendar")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_calendar"] });
    },
  });
}

// =============================================================================
// PHASE 14: Unit Economics, Client Portal, A/B Testing, YouTube Connect
// =============================================================================

export interface YTClientEconomics {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  period_month: string;
  revenue: number;
  cost_api_calls: number;
  cost_generation: number;
  cost_outreach: number;
  cost_specialist_hours: number;
  cost_specialist_rate: number;
  total_cost: number;
  thumbnails_created: number;
  seo_packages_created: number;
  scripts_written: number;
  outreach_messages_sent: number;
  audits_run: number;
  gross_profit: number;
  profit_margin_pct: number;
  months_as_client: number;
  cumulative_revenue: number;
  cumulative_cost: number;
  ltv: number;
  channel_name: string | null;
  subscriber_count_at_period: number | null;
  created_at: string;
  updated_at: string;
}

export interface YTPortalUser {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  can_approve_assets: boolean;
  can_view_reports: boolean;
  can_view_seo: boolean;
  can_view_calendar: boolean;
  can_message_agency: boolean;
  is_active: boolean;
  last_login_at: string | null;
  invite_sent_at: string | null;
  invite_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YTPortalMessage {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  portal_user_id: string | null;
  sender_type: string;
  message: string;
  attachment_type: string | null;
  attachment_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface YTThumbnailTest {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  video_id: string | null;
  video_title: string | null;
  video_url: string | null;
  variant_a_asset_id: string | null;
  variant_a_description: string | null;
  variant_a_image_url: string | null;
  variant_b_asset_id: string | null;
  variant_b_description: string | null;
  variant_b_image_url: string | null;
  variant_a_impressions: number | null;
  variant_a_clicks: number | null;
  variant_a_ctr: number | null;
  variant_b_impressions: number | null;
  variant_b_clicks: number | null;
  variant_b_ctr: number | null;
  winner: string | null;
  ctr_lift_pct: number | null;
  test_duration_days: number | null;
  niche: string | null;
  style_notes: string | null;
  ai_analysis: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YTOAuthConnection {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  verified_channel_id: string | null;
  verified_channel_name: string | null;
  status: string;
  connected_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface YTAnalyticsSnapshot {
  id: string;
  tenant_id: string;
  channel_id: string | null;
  snapshot_date: string;
  period_type: string;
  subscribers: number | null;
  total_views: number | null;
  impressions: number | null;
  ctr: number | null;
  avg_view_duration_seconds: number | null;
  avg_view_percentage: number | null;
  watch_time_hours: number | null;
  estimated_revenue: number | null;
  rpm: number | null;
  cpm: number | null;
  unique_viewers: number | null;
  returning_viewers_pct: number | null;
  traffic_sources: Record<string, unknown>;
  top_videos: unknown[];
  created_at: string;
}

// === UNIT ECONOMICS ===
export function useYTEconomics(channelId?: string, month?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_economics", tenantId, channelId, month],
    queryFn: async () => {
      let query = supabase
        .from("yt_client_economics")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("profit_margin_pct", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      if (month) query = query.eq("period_month", month);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTClientEconomics[];
    },
    enabled: !!tenantId,
  });
}

// === CLIENT PORTAL ===
export function useYTPortalUsers(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_portal_users", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_portal_users")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTPortalUser[];
    },
    enabled: !!tenantId,
  });
}

export function useCreatePortalUser() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (params: { email: string; channel_id: string; display_name?: string }) => {
      const { data, error } = await supabase
        .from("yt_portal_users")
        .insert({
          tenant_id: tenantId!,
          email: params.email,
          channel_id: params.channel_id,
          display_name: params.display_name || params.email.split("@")[0],
          password_hash: "$2b$10$placeholder_hash_pending_invite",
          invite_sent_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_portal_users"] });
    },
  });
}

export function useYTPortalMessages(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_portal_messages", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_portal_messages")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTPortalMessage[];
    },
    enabled: !!tenantId,
  });
}

export function useSendPortalMessage() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (params: { channel_id: string; portal_user_id: string; message: string }) => {
      const { data, error } = await supabase
        .from("yt_portal_messages")
        .insert({
          tenant_id: tenantId!,
          channel_id: params.channel_id,
          portal_user_id: params.portal_user_id,
          sender_type: "agency",
          message: params.message,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_portal_messages"] });
    },
  });
}

export function useMarkPortalMessageRead() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("yt_portal_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_portal_messages"] });
    },
  });
}

// === A/B TESTING ===
export function useYTABTests(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_ab_tests", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_thumbnail_tests")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTThumbnailTest[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateABTest() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async (params: Partial<YTThumbnailTest>) => {
      const { data, error } = await supabase
        .from("yt_thumbnail_tests")
        .insert({ ...params, tenant_id: tenantId!, status: "active" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_ab_tests"] });
    },
  });
}

export function useUpdateABTest() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<YTThumbnailTest> & { id: string }) => {
      const { data, error } = await supabase
        .from("yt_thumbnail_tests")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yt_ab_tests"] });
    },
  });
}

// === YOUTUBE OAUTH + ANALYTICS ===
export function useYTOAuthConnections(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_oauth_connections", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_oauth_connections")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTOAuthConnection[];
    },
    enabled: !!tenantId,
  });
}

export function useYTAnalyticsSnapshots(channelId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["yt_analytics_snapshots", tenantId, channelId],
    queryFn: async () => {
      let query = supabase
        .from("yt_analytics_snapshots")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("snapshot_date", { ascending: true });
      if (channelId) query = query.eq("channel_id", channelId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as YTAnalyticsSnapshot[];
    },
    enabled: !!tenantId,
  });
}
