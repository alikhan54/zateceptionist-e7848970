import { useState } from 'react';
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
  { name: 'Competitor Analysis', schedule: 'Daily 6 AM', icon: Target },
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
    </div>
  );
}
