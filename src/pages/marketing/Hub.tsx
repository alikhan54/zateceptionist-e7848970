import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Megaphone, FileText, Users, PenSquare, Plus, ArrowRight,
  Sparkles, Zap, Clock, Target, TrendingUp, Brain, Calendar,
  Send, Share2, BarChart3, CheckCircle2, Activity,
  AlertTriangle, XCircle, Shield, Film, Eye, Play,
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, startOfMonth } from 'date-fns';

const EVENT_ICONS: Record<string, { emoji: string; label: string }> = {
  sequence_step_executed: { emoji: '📧', label: 'Executed sequence step' },
  sequence_enrollment: { emoji: '👤', label: 'Lead enrolled in sequence' },
  campaign_created: { emoji: '📢', label: 'Campaign scheduled' },
  campaign_sent: { emoji: '📤', label: 'Campaign sent' },
  content_generated: { emoji: '✏️', label: 'Content created' },
  competitor_analyzed: { emoji: '🔍', label: 'Competitor analyzed' },
  competitor_scrape: { emoji: '🕷️', label: 'Competitor scraped' },
  social_post_published: { emoji: '📱', label: 'Social post published' },
  blog_generated: { emoji: '📝', label: 'Blog generated' },
  email_sent: { emoji: '📧', label: 'Email sent' },
};

const CRON_SCHEDULES = [
  { name: 'Social Publishing', schedule: 'Every 5 min', icon: Share2 },
  { name: 'AI Brain', schedule: 'Every 2 hours', icon: Brain },
  { name: 'Blog Generation', schedule: 'Daily 8 AM', icon: PenSquare },
  { name: 'Engagement Tracking', schedule: '4x daily', icon: BarChart3 },
  { name: 'Competitor Analysis', schedule: 'Daily', icon: Target },
];

export default function MarketingHub() {
  const { tenantConfig } = useTenant();
  const navigate = useNavigate();

  // ─── Real DB Queries ───
  const { data: activeCampaigns = 0, isLoading: l1 } = useQuery({
    queryKey: ['hub-active-campaigns', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return 0;
      const { count } = await supabase
        .from('marketing_campaigns' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id)
        .in('status', ['scheduled', 'sending']);
      return count || 0;
    },
    enabled: !!tenantConfig?.id,
  });

  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: postsThisMonth = 0, isLoading: l2 } = useQuery({
    queryKey: ['hub-posts-month', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return 0;
      const { count } = await supabase
        .from('social_posts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id)
        .eq('status', 'published')
        .gte('published_at', monthStart);
      return count || 0;
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: activeSequences = 0, isLoading: l3 } = useQuery({
    queryKey: ['hub-active-sequences', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return 0;
      const { count } = await supabase
        .from('sequence_enrollments' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: blogCount = 0, isLoading: l4 } = useQuery({
    queryKey: ['hub-blog-count', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return 0;
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id);
      return count || 0;
    },
    enabled: !!tenantConfig?.id,
  });

  // AI Brain Activity Feed
  const { data: aiActivity = [], isLoading: l5 } = useQuery({
    queryKey: ['hub-ai-activity', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('system_events' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false })
        .limit(15);
      return (data || []).map((e: any) => ({
        ...e,
        parsed: typeof e.event_data === 'string' ? (() => { try { return JSON.parse(e.event_data); } catch { return {}; } })() : e.event_data || {},
      }));
    },
    enabled: !!tenantConfig?.id,
    refetchInterval: 30000,
  });

  // Last cron runs
  const { data: lastRuns = {} } = useQuery({
    queryKey: ['hub-last-runs', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return {};
      const types = ['social_post_published', 'sequence_step_executed', 'blog_generated', 'engagement_tracked', 'competitor_scrape'];
      const runs: Record<string, string | null> = {};
      for (const t of types) {
        const { data } = await supabase
          .from('system_events' as any)
          .select('created_at')
          .eq('tenant_id', tenantConfig.id)
          .eq('event_type', t)
          .order('created_at', { ascending: false })
          .limit(1);
        runs[t] = data?.[0]?.created_at || null;
      }
      return runs;
    },
    enabled: !!tenantConfig?.id,
  });

  // ─── Health Checks ───
  const { data: healthChecks = [] } = useQuery({
    queryKey: ['hub-health-checks', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const checks: { label: string; status: 'ok' | 'warn' | 'error'; detail: string; path: string }[] = [];

      // 1. Social Accounts — check Meta token
      const hasMeta = !!(tenantConfig as any)?.meta_page_token;
      checks.push({
        label: 'Social Accounts',
        status: hasMeta ? 'ok' : 'error',
        detail: hasMeta ? 'Meta token configured' : 'No Meta token — connect in Integrations',
        path: '/settings/integrations',
      });

      // 2. Customers / Contacts
      const { count: custCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      checks.push({
        label: 'Contacts',
        status: (custCount || 0) >= 10 ? 'ok' : (custCount || 0) > 0 ? 'warn' : 'error',
        detail: `${custCount || 0} contacts${(custCount || 0) < 10 ? ' — add more for effective campaigns' : ''}`,
        path: '/customers',
      });

      // 3. Sequence Steps
      const { count: stepCount } = await supabase
        .from('marketing_sequence_steps' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id);
      checks.push({
        label: 'Sequence Steps',
        status: (stepCount || 0) > 0 ? 'ok' : 'error',
        detail: (stepCount || 0) > 0 ? `${stepCount} steps defined` : 'No steps — sequences need steps to work',
        path: '/marketing/sequences',
      });

      // 4. Competitors
      const { count: compCount } = await supabase
        .from('competitor_tracking' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id);
      checks.push({
        label: 'Competitor Intel',
        status: (compCount || 0) > 0 ? 'ok' : 'warn',
        detail: (compCount || 0) > 0 ? `${compCount} competitors tracked` : 'No competitors added yet',
        path: '/marketing/competitors',
      });

      // 5. Blog Publishing
      const { count: blogCount2 } = await supabase
        .from('blog_posts' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id)
        .eq('status', 'published');
      checks.push({
        label: 'Blog Publishing',
        status: (blogCount2 || 0) > 0 ? 'ok' : 'warn',
        detail: (blogCount2 || 0) > 0 ? `${blogCount2} published blog(s)` : 'No published blogs yet',
        path: '/marketing/blogs',
      });

      // 6. Email Configuration
      const tc = tenantConfig as any;
      const hasEmail = !!(tc?.smtp_host || tc?.resend_api_key);
      checks.push({
        label: 'Email Config',
        status: hasEmail ? 'ok' : 'error',
        detail: hasEmail ? 'Email sending configured' : 'No email config — set up SMTP or Resend',
        path: '/settings/integrations',
      });

      // 7. WhatsApp Configuration
      const hasWhatsApp = !!tc?.whatsapp_phone_id;
      checks.push({
        label: 'WhatsApp',
        status: hasWhatsApp ? 'ok' : 'warn',
        detail: hasWhatsApp ? 'WhatsApp Business API connected' : 'WhatsApp not configured — optional',
        path: '/settings/integrations',
      });

      // 8. Landing Pages Live
      const { count: livePages } = await supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id)
        .eq('status', 'published');
      checks.push({
        label: 'Landing Pages',
        status: (livePages || 0) > 0 ? 'ok' : 'warn',
        detail: (livePages || 0) > 0 ? `${livePages} page(s) live` : 'No published pages yet',
        path: '/marketing/landing-pages',
      });

      return checks;
    },
    enabled: !!tenantConfig?.id,
  });

  // ─── Intelligence Alerts ───
  const { data: intelligence = [] } = useQuery({
    queryKey: ['hub-intelligence', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const tid = tenantConfig.id;
      const alerts: { type: string; severity: string; message: string; action?: string; link?: string }[] = [];

      // Negative mentions needing response
      const { count: negCount } = await supabase.from('social_mentions' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tid).eq('sentiment', 'negative').eq('requires_response', true).eq('responded', false);
      if ((negCount || 0) > 0) {
        alerts.push({ type: 'reputation', severity: 'critical', message: `${negCount} negative mention${(negCount || 0) > 1 ? 's' : ''} need your response`, action: 'Respond now', link: '/marketing/social-listening' });
      }

      // No brand voice configured
      const { data: bv } = await supabase.from('brand_voice_profiles' as any).select('id').eq('tenant_id', tid).limit(1);
      if (!bv || bv.length === 0) {
        alerts.push({ type: 'setup', severity: 'info', message: 'Brand voice not configured — AI content is generic', action: 'Set up', link: '/marketing/brand-voice' });
      }

      // Unrendered videos
      const { count: unrendered } = await supabase.from('video_projects' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tid).eq('status', 'script_ready')
        .or('render_status.is.null,render_status.eq.none,render_status.eq.failed');
      if ((unrendered || 0) > 0) {
        alerts.push({ type: 'content', severity: 'info', message: `${unrendered} video${(unrendered || 0) > 1 ? 's' : ''} have scripts but no rendered MP4`, action: 'Render', link: '/marketing/videos' });
      }

      // Templates available but no campaigns
      const { count: tplCount } = await supabase.from('email_template_library' as any).select('id', { count: 'exact', head: true });
      if ((tplCount || 0) > 0 && activeCampaigns === 0) {
        alerts.push({ type: 'setup', severity: 'info', message: `${tplCount} email templates available — create your first campaign`, action: 'Browse', link: '/marketing/templates' });
      }

      return alerts;
    },
    enabled: !!tenantConfig?.id,
    refetchInterval: 300000,
  });

  // ─── Extended Metrics ───
  const { data: extMetrics } = useQuery({
    queryKey: ['hub-ext-metrics', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return null;
      const tid = tenantConfig.id;
      const [videos, mentions, competitors] = await Promise.all([
        supabase.from('video_projects' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('render_status', 'complete'),
        supabase.from('social_mentions' as any).select('id, sentiment', { count: 'exact' }).eq('tenant_id', tid).gte('discovered_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('competitor_tracking' as any).select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      ]);
      const mentionData = mentions.data || [];
      return {
        videos: videos.count || 0,
        mentionsTotal: mentions.count || 0,
        mentionsPositive: mentionData.filter((m: any) => m.sentiment === 'positive').length,
        mentionsNegative: mentionData.filter((m: any) => m.sentiment === 'negative').length,
        competitors: competitors.count || 0,
      };
    },
    enabled: !!tenantConfig?.id,
  });

  // ML-scored hot leads
  const { data: hotLeads = [] } = useQuery({
    queryKey: ["hot-leads", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase.from("lead_score_predictions" as any)
        .select("lead_name, lead_company, combined_score, grade, hidden_gem, false_positive")
        .eq("tenant_id", tenantConfig.id)
        .order("combined_score", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: aiVideos = [] } = useQuery({
    queryKey: ['hub-ai-videos', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("video_projects" as any)
        .select("id, title, trigger_type, render_status, video_url, created_at")
        .eq("tenant_id", tenantConfig.id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const metrics = [
    { label: 'Active Campaigns', value: activeCampaigns, icon: Megaphone, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Posts This Month', value: postsThisMonth, icon: Share2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Sequences', value: activeSequences, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Blog Posts', value: blogCount, icon: FileText, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  const quickActions = [
    { label: 'Create Campaign', icon: Plus, path: '/marketing/campaigns', color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' },
    { label: 'Publish Post', icon: Send, path: '/marketing/social', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
    { label: 'Write Blog', icon: PenSquare, path: '/marketing/blogs', color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20' },
    { label: 'View Sequences', icon: Zap, path: '/marketing/sequences', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' },
    { label: 'Ads Manager', icon: Target, path: '/marketing/ads', color: 'bg-red-500/10 text-red-600 hover:bg-red-500/20' },
  ];

  const cronMap: Record<string, string> = {
    'Social Publishing': 'social_post_published',
    'AI Brain': 'sequence_step_executed',
    'Blog Generation': 'blog_generated',
    'Engagement Tracking': 'engagement_tracked',
    'Competitor Analysis': 'competitor_scrape',
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" /> Marketing Hub
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered marketing command center — real-time system activity</p>
        </div>
        <Button onClick={() => navigate('/marketing/campaigns')}>
          <Plus className="h-4 w-4 mr-2" /> New Campaign
        </Button>
      </div>

      {/* ═══ TOP METRICS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${m.bg}`}>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <Button key={a.label} variant="outline" className={`h-auto py-4 flex flex-col items-center gap-2 ${a.color}`}
            onClick={() => navigate(a.path)}>
            <a.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{a.label}</span>
          </Button>
        ))}
      </div>

      {/* ═══ SYSTEM HEALTH ═══ */}
      {healthChecks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {healthChecks.map((check: any) => (
                <div
                  key={check.label}
                  className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(check.path)}
                >
                  {check.status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                  {check.status === 'warn' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                  {check.status === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{check.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ EXTENDED METRICS ROW ═══ */}
      {extMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-500/10"><Target className="h-5 w-5 text-pink-500" /></div>
              <div><p className="text-2xl font-bold">{extMetrics.videos}</p><p className="text-xs text-muted-foreground">Videos Rendered</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10"><TrendingUp className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold">{extMetrics.mentionsTotal}</p>
                <p className="text-xs text-muted-foreground">Brand Mentions (7d)</p>
                {extMetrics.mentionsTotal > 0 && <p className="text-[10px]"><span className="text-green-500">{extMetrics.mentionsPositive} pos</span> · <span className="text-red-500">{extMetrics.mentionsNegative} neg</span></p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10"><Target className="h-5 w-5 text-red-500" /></div>
              <div><p className="text-2xl font-bold">{extMetrics.competitors}</p><p className="text-xs text-muted-foreground">Competitors Tracked</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10"><Zap className="h-5 w-5 text-cyan-500" /></div>
              <div><p className="text-2xl font-bold">{(blogCount || 0) + (extMetrics.videos || 0)}</p><p className="text-xs text-muted-foreground">Total Content</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ AI VIDEO ACTIVITY ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-5 w-5 text-pink-500" /> AI Created For You
            <span className="text-xs font-normal text-muted-foreground ml-auto">Last 7 days</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {aiVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              AI will automatically create videos as you publish blogs, detect competitors, and run campaigns.
            </p>
          ) : aiVideos.map((v: any) => {
            const triggerIcons: Record<string, string> = {
              blog_published: "📝", competitor_ad_detected: "⚡", campaign_created: "🎯",
              engagement_drop: "📊", sales_proposal: "💼", manual_prompt: "✨",
              engagement_followup: "🔄", manual: "🎬",
            };
            return (
              <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50">
                <span className="text-lg">{triggerIcons[v.trigger_type] || "🎬"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title || "Untitled"}</p>
                  <p className="text-[11px] text-muted-foreground">{v.trigger_type?.replace(/_/g, " ")} · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</p>
                </div>
                <Badge variant={v.render_status === "complete" ? "default" : "secondary"} className="text-[10px]">
                  {v.render_status || "pending"}
                </Badge>
                {v.render_status === "complete" && v.video_url && (
                  <a href={v.video_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 px-2"><Play className="h-3 w-3" /></Button>
                  </a>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ═══ INTELLIGENCE ALERTS ═══ */}
      {intelligence.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-amber-500" /> Marketing Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {intelligence.map((alert: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                alert.severity === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                'bg-blue-500/10 border border-blue-500/20'
              }`}>
                <p className="text-sm flex-1">{alert.message}</p>
                {alert.action && alert.link && (
                  <Button size="sm" variant="outline" onClick={() => navigate(alert.link)}>{alert.action}</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══ AI RECOMMENDATIONS ═══ */}
      {(() => {
        const recs: { priority: 'high' | 'medium' | 'low'; text: string; action: string; path: string }[] = [];
        const tc = tenantConfig as any;
        if (!tc?.smtp_host && !tc?.resend_api_key)
          recs.push({ priority: 'high', text: 'Email is not configured. Campaigns and sequences cannot send emails.', action: 'Configure Email', path: '/settings/integrations' });
        if (healthChecks.find((c: any) => c.label === 'Contacts' && c.status === 'error'))
          recs.push({ priority: 'high', text: 'No contacts in the system. Import leads or connect lead generation.', action: 'Import Leads', path: '/sales' });
        if (!tc?.meta_page_token)
          recs.push({ priority: 'medium', text: 'Connect social accounts to publish posts directly from the dashboard.', action: 'Connect Accounts', path: '/settings/integrations' });
        if (activeSequences === 0 && (blogCount + postsThisMonth) > 0)
          recs.push({ priority: 'medium', text: 'You have content but no active sequences. Activate a sequence to nurture leads.', action: 'View Sequences', path: '/marketing/sequences' });
        if (healthChecks.find((c: any) => c.label === 'Competitor Intel' && c.status === 'warn'))
          recs.push({ priority: 'low', text: 'Add competitors to monitor their strategies and find content gaps.', action: 'Add Competitor', path: '/marketing/competitors' });
        if (blogCount === 0)
          recs.push({ priority: 'low', text: 'Start a blog to improve SEO and provide content for social media repurposing.', action: 'Write Blog', path: '/marketing/blogs' });
        if (recs.length === 0) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-amber-500" /> AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recs.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(rec.path)}>
                    <span className="text-lg mt-0.5">{rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🔵'}</span>
                    <p className="text-sm flex-1">{rec.text}</p>
                    <Button size="sm" variant="outline" className="shrink-0">{rec.action}</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ═══ AI BRAIN ACTIVITY FEED ═══ */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> AI Brain Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No AI activity recorded yet</p>
                <p className="text-xs">Events will appear here as the AI Brain executes marketing automation</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {aiActivity.map((event: any) => {
                    const cfg = EVENT_ICONS[event.event_type] || { emoji: '⚡', label: event.event_type };
                    const ed = event.parsed || {};
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border hover:bg-muted/40 transition-colors">
                        <span className="text-lg mt-0.5">{cfg.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{cfg.label}</p>
                          {ed.lead_id && <p className="text-xs text-muted-foreground">Lead: {ed.lead_id.slice(0, 8)}...</p>}
                          {ed.channel && <p className="text-xs text-muted-foreground">Channel: {ed.channel}</p>}
                          {ed.reason && <p className="text-xs text-muted-foreground">Reason: {ed.reason}</p>}
                          {ed.ai_decision && <p className="text-xs text-muted-foreground">AI: {ed.ai_decision}</p>}
                          {ed.campaign_name && <p className="text-xs text-muted-foreground">{ed.campaign_name}</p>}
                          {ed.sequence_name && <p className="text-xs text-muted-foreground">Sequence: {ed.sequence_name}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {event.created_at ? format(new Date(event.created_at), "MMM d, h:mm a") : ''}
                            {event.created_at && ` (${formatDistanceToNow(new Date(event.created_at), { addSuffix: true })})`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ═══ SYSTEM STATUS ═══ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CRON_SCHEDULES.map(cron => {
                const lastRunKey = cronMap[cron.name];
                const lastRun = (lastRuns as Record<string, string | null>)[lastRunKey];
                return (
                  <div key={cron.name} className="flex items-center gap-3 p-2.5 rounded-lg border">
                    <cron.icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cron.name}</p>
                      <p className="text-xs text-muted-foreground">{cron.schedule}</p>
                    </div>
                    <div className="text-right">
                      {lastRun ? (
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(lastRun), { addSuffix: true })}</p>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">No runs</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium">AI Brain Status</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The AI Brain processes marketing automation every 2 hours, optimizing channel selection and timing based on engagement data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PREDICTIONS */}
      {hotLeads.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Top Leads (ML Scored)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hotLeads.map((lead: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={
                      lead.grade === 'A' ? 'bg-green-600' :
                      lead.grade === 'B' ? 'bg-blue-600' :
                      lead.grade === 'C' ? 'bg-yellow-600' : 'bg-red-600'
                    }>{lead.grade}</Badge>
                    <span>{lead.lead_name || 'Unknown'}</span>
                    {lead.hidden_gem && <Badge variant="outline" className="text-green-500 text-xs">Hidden Gem</Badge>}
                  </div>
                  <span className="font-mono text-xs">{lead.combined_score}/100</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
