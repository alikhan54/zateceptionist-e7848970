import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, callWebhook } from '@/integrations/supabase/client';
import { WEBHOOKS } from '@/lib/api/webhooks';
import { logSystemEvent } from '@/lib/api/systemEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Target, Lightbulb, BarChart3, Globe, Search,
  CheckCircle, Trash2, ExternalLink, Sparkles, RefreshCw,
  AlertTriangle, Shield, Zap, FileText, Radar,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Helper Components ───

function ThreatBadge({ level }: { level: number | null | undefined }) {
  if (!level) return <Badge variant="outline" className="text-muted-foreground">?</Badge>;
  const color = level <= 3 ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300'
    : level <= 6 ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300'
    : level <= 8 ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300'
    : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300';
  return <Badge className={`${color} font-bold`}>{level}/10</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority || '').toLowerCase();
  const color = p === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    : p === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  return <Badge className={color}>{(priority || 'low').toUpperCase()}</Badge>;
}

function SourceBadge({ source, confidence }: { source?: string; confidence?: number }) {
  if (source === 'ai_discovery') {
    return (
      <div className="flex items-center gap-1">
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">AI-Discovered</Badge>
        {confidence != null && <span className="text-xs text-muted-foreground">({Math.round(confidence)}%)</span>}
      </div>
    );
  }
  return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Manual</Badge>;
}

function threatColor(level: number): string {
  if (level <= 3) return 'bg-green-500';
  if (level <= 6) return 'bg-yellow-500';
  if (level <= 8) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function CompetitorAnalysis() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [name, setName] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');

  // ─── Tracked competitors ───
  const { data: tracked = [], isLoading: loadingTracked } = useQuery({
    queryKey: ['competitor_tracking', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from('competitor_tracking' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // ─── competitor_analysis table (legacy) ───
  const { data: competitors = [], isLoading: loadingAnalysis } = useQuery({
    queryKey: ['competitor_analysis', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('competitor_analysis')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // ─── Analysis results from competitor_content ───
  const { data: analysisResults = [] } = useQuery({
    queryKey: ['competitor_content', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('competitor_content' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('discovered_at', { ascending: false });
      return (data || []).map((d: any) => ({
        ...d,
        swot: typeof d.swot === 'string' ? JSON.parse(d.swot) : (d.swot || {}),
        pricing_analysis: typeof d.pricing_analysis === 'string' ? JSON.parse(d.pricing_analysis) : (d.pricing_analysis || {}),
        actionable_recommendations: typeof d.actionable_recommendations === 'string' ? JSON.parse(d.actionable_recommendations) : (d.actionable_recommendations || []),
        key_themes: typeof d.key_themes === 'string' ? JSON.parse(d.key_themes) : (d.key_themes || []),
        analysis: (() => { try { return JSON.parse(d.content_text || '{}'); } catch { return {}; } })(),
      }));
    },
    enabled: !!tenantConfig?.id,
  });

  // ─── System events for alerts ───
  const { data: competitorEvents = [] } = useQuery({
    queryKey: ['competitor_events', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('system_events' as any)
        .select('*')
        .or('event_type.eq.competitor_high_threat,event_type.eq.competitor_auto_discovered,event_type.eq.competitor_scrape')
        .eq('tenant_id', (tenantConfig as any).tenant_id || tenantConfig.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const hasApify = !!(tenantConfig as any)?.apify_api_key || !!(tenantConfig as any)?.has_apify || !!(tenantConfig as any)?.apify_token;

  // ─── Add competitor to tracking ───
  const addCompetitor = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');
      if (!name.trim()) throw new Error('Competitor name is required');
      const { error: trackErr } = await supabase.from('competitor_tracking' as any).insert({
        tenant_id: tenantConfig.id,
        competitor_name: name.trim(),
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        notes: notes.trim() || null,
        is_active: true,
        discovery_source: 'manual',
        created_at: new Date().toISOString(),
      });
      if (trackErr) console.warn('competitor_tracking insert:', trackErr.message);
      const { error: analysisErr } = await supabase.from('competitor_analysis').insert({
        tenant_id: tenantConfig.id,
        competitor_name: name.trim(),
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        status: 'pending',
      });
      if (analysisErr) console.warn('competitor_analysis insert:', analysisErr.message);
      if (trackErr && analysisErr) {
        throw new Error(`Failed to add competitor: ${trackErr.message}`);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
      queryClient.invalidateQueries({ queryKey: ['competitor_analysis'] });
      const savedName = name.trim();
      const savedInstagram = instagramUrl.trim();
      const savedWebsite = websiteUrl.trim();
      setIsCreateOpen(false);
      setName(''); setInstagramUrl(''); setWebsiteUrl(''); setNotes('');
      toast({ title: '✅ Competitor added!', description: 'AI is analyzing their profile. Results typically appear within 30-60 seconds.' });
      logSystemEvent({ tenantId: tenantConfig?.id || '', eventType: 'competitor_analyzed', sourceModule: 'marketing', eventData: { competitor_name: savedName } });
      try {
        const result = await callWebhook(WEBHOOKS.ANALYZE_COMPETITOR, {
          competitor_name: savedName,
          instagram_url: savedInstagram || null,
          website_url: savedWebsite || null,
        }, tenantConfig?.id || '');
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
          queryClient.invalidateQueries({ queryKey: ['competitor_content'] });
          toast({ title: '✅ Analysis Complete!', description: `${savedName} has been analyzed.` });
        }
      } catch {
        // Silent fail — analysis will be picked up by scheduled cron
      }
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('competitor_tracking' as any).update({ is_active: !currentActive }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
    toast({ title: !currentActive ? 'Tracking enabled' : 'Tracking paused' });
  };

  const deleteCompetitor = async (id: string) => {
    // Cascade delete from all 3 tables
    await supabase.from('competitor_content' as any).delete().eq('competitor_id', id);
    await supabase.from('competitor_analysis' as any).delete().eq('id', id);
    await supabase.from('competitor_tracking' as any).delete().eq('id', id).eq('tenant_id', tenantConfig?.id);
    queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
    queryClient.invalidateQueries({ queryKey: ['competitor_analysis'] });
    queryClient.invalidateQueries({ queryKey: ['competitor_content'] });
    setDeleteConfirm(null);
    toast({ title: 'Competitor removed' });
  };

  const analyzeCompetitor = async (comp: any) => {
    setAnalyzingId(comp.id);
    toast({ title: '🔍 Analyzing competitor...', description: 'AI is scraping and analyzing their profile' });
    try {
      const result = await callWebhook(WEBHOOKS.ANALYZE_COMPETITOR, {
        competitor_id: comp.id,
        competitor_name: comp.competitor_name,
        instagram_url: comp.instagram_url,
        website_url: comp.website_url,
      }, tenantConfig?.id || '');
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
        queryClient.invalidateQueries({ queryKey: ['competitor_content'] });
        queryClient.invalidateQueries({ queryKey: ['competitor_events'] });
        toast({ title: '✅ Analysis Complete!' });
      } else {
        toast({ title: '⏳ Analysis Queued', description: 'Will be processed shortly by the AI engine.' });
      }
    } catch {
      toast({ title: '⏳ Analysis Queued', description: 'Will be processed shortly by the AI engine.' });
    } finally {
      setAnalyzingId(null);
    }
  };

  const analyzeAll = async () => {
    setIsAnalyzingAll(true);
    const active = tracked.filter((t: any) => t.is_active);
    for (const comp of active) {
      try {
        await callWebhook(WEBHOOKS.ANALYZE_COMPETITOR, {
          competitor_id: comp.id,
          competitor_name: comp.competitor_name,
          instagram_url: comp.instagram_url,
          website_url: comp.website_url,
        }, tenantConfig?.id || '');
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
    queryClient.invalidateQueries({ queryKey: ['competitor_content'] });
    queryClient.invalidateQueries({ queryKey: ['competitor_events'] });
    toast({ title: '✅ All competitors queued for analysis' });
    setIsAnalyzingAll(false);
  };

  const discoverCompetitors = async () => {
    setIsDiscovering(true);
    try {
      const result = await callWebhook(WEBHOOKS.DISCOVER_COMPETITORS, {}, tenantConfig?.id || '');
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
        queryClient.invalidateQueries({ queryKey: ['competitor_events'] });
        toast({ title: '✅ Discovery triggered', description: 'AI is scanning for new competitors.' });
      } else {
        toast({ title: '⏳ Discovery queued', description: 'Will run shortly.' });
      }
    } catch {
      toast({ title: '⏳ Discovery queued' });
    } finally {
      setIsDiscovering(false);
    }
  };

  // ─── Computed ───
  const threatMap: Record<string, number> = {};
  analysisResults.forEach((ar: any) => {
    if (ar.competitor_id && ar.threat_level) {
      threatMap[ar.competitor_id] = ar.threat_level;
    }
  });
  const threatValues = Object.values(threatMap).filter(v => typeof v === 'number');
  const avgThreat = threatValues.length > 0 ? Math.round(threatValues.reduce((a, b) => a + b, 0) / threatValues.length) : 0;

  const allSwot = {
    strengths: analysisResults.flatMap((ar: any) =>
      (ar.swot?.strengths || []).map((s: string) => ({ text: s, competitor_id: ar.competitor_id }))
    ),
    weaknesses: analysisResults.flatMap((ar: any) =>
      (ar.swot?.weaknesses || []).map((w: string) => ({ text: w, competitor_id: ar.competitor_id }))
    ),
    opportunities: analysisResults.flatMap((ar: any) =>
      (ar.swot?.opportunities || []).map((o: string) => ({ text: o, competitor_id: ar.competitor_id }))
    ),
    threats: analysisResults.flatMap((ar: any) =>
      (ar.swot?.threats || []).map((t: string) => ({ text: t, competitor_id: ar.competitor_id }))
    ),
  };

  const allRecommendations = analysisResults.flatMap((ar: any) =>
    (ar.actionable_recommendations || []).map((r: any) => ({ ...r, competitor_id: ar.competitor_id }))
  );

  const pendingDiscoveries = tracked.filter((t: any) => t.discovery_source === 'ai_discovery' && (!t.analysis_count || t.analysis_count === 0));
  const confirmedDiscoveries = tracked.filter((t: any) => t.discovery_source === 'ai_discovery' && t.analysis_count > 0);

  const totalTracked = tracked.length + competitors.length;
  const lastScrape = competitorEvents.find((e: any) => e.event_type === 'competitor_scrape')?.created_at;
  const lastDiscovery = competitorEvents.find((e: any) => e.event_type === 'competitor_auto_discovered')?.created_at;
  const recentAlerts = competitorEvents.filter((e: any) => e.event_type === 'competitor_high_threat' || e.event_type === 'competitor_auto_discovered').slice(0, 5);

  // Competitor name lookup
  const compNameMap: Record<string, string> = {};
  tracked.forEach((t: any) => { compNameMap[t.id] = t.competitor_name; });
  competitors.forEach((c: any) => { compNameMap[c.id] = c.competitor_name; });

  const isLoading = loadingTracked || loadingAnalysis;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Intel</h1>
          <p className="text-muted-foreground">AI-powered competitor analysis, SWOT intelligence & auto-discovery</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Competitor
        </Button>
      </div>

      {/* Automation Status */}
      <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
        tracked.length === 0
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
          : analysisResults.length === 0
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
            : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
      }`}>
        <span>{tracked.length === 0 ? '⚠️' : analysisResults.length === 0 ? '⏳' : '🟢'}</span>
        <span>
          {tracked.length === 0
            ? 'No competitors tracked. Add competitors to start AI monitoring.'
            : analysisResults.length === 0
              ? `${tracked.length} competitor(s) added. AI analysis will run automatically.`
              : `AI monitoring active — Last scan: ${lastScrape ? formatDistanceToNow(new Date(lastScrape), { addSuffix: true }) : 'recently'}`}
        </span>
      </div>

      {/* ─── Tabbed Layout ─── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs sm:text-sm"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />Overview</TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs sm:text-sm"><Eye className="h-4 w-4 mr-1 hidden sm:inline" />Competitors</TabsTrigger>
          <TabsTrigger value="swot" className="text-xs sm:text-sm"><Shield className="h-4 w-4 mr-1 hidden sm:inline" />SWOT</TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm"><FileText className="h-4 w-4 mr-1 hidden sm:inline" />Content Intel</TabsTrigger>
          <TabsTrigger value="discovery" className="text-xs sm:text-sm"><Radar className="h-4 w-4 mr-1 hidden sm:inline" />Auto-Discovery</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: Overview ═══ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-purple-500"><Eye className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{totalTracked}</p><p className="text-xs text-muted-foreground">Total Tracked</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><AlertTriangle className={`h-5 w-5 ${avgThreat <= 3 ? 'text-green-500' : avgThreat <= 6 ? 'text-yellow-500' : avgThreat <= 8 ? 'text-orange-500' : 'text-red-500'}`} /></div>
                <div><p className="text-2xl font-bold">{avgThreat || '—'}</p><p className="text-xs text-muted-foreground">Avg Threat Level</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-amber-500"><Lightbulb className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{allSwot.opportunities.length}</p><p className="text-xs text-muted-foreground">Opportunities</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-primary"><Zap className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{allRecommendations.length}</p><p className="text-xs text-muted-foreground">AI Recommendations</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Threat Overview Bar */}
          {threatValues.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Threat Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="flex rounded-lg overflow-hidden h-10">
                  {tracked.filter((t: any) => threatMap[t.id]).map((t: any) => {
                    const level = threatMap[t.id];
                    const total = threatValues.reduce((a, b) => a + b, 0);
                    const pct = Math.max((level / total) * 100, 8);
                    return (
                      <div key={t.id} className={`${threatColor(level)} flex items-center justify-center text-white text-xs font-medium px-2 truncate`}
                        style={{ width: `${pct}%` }} title={`${t.competitor_name}: ${level}/10`}>
                        {t.competitor_name} ({level})
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={analyzeAll} disabled={isAnalyzingAll || tracked.length === 0}>
                  {isAnalyzingAll ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Analyzing...</> : <><RefreshCw className="h-4 w-4 mr-1" />Analyze All</>}
                </Button>
                <Button size="sm" variant="outline" onClick={discoverCompetitors} disabled={isDiscovering}>
                  {isDiscovering ? <><Sparkles className="h-4 w-4 mr-1 animate-pulse" />Discovering...</> : <><Sparkles className="h-4 w-4 mr-1" />Discover Competitors</>}
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                Last scan: {lastScrape ? formatDistanceToNow(new Date(lastScrape), { addSuffix: true }) : 'Never'}
              </span>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          {recentAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Recent Alerts</h3>
              {recentAlerts.map((evt: any, idx: number) => (
                <Card key={idx} className={evt.event_type === 'competitor_high_threat' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-purple-500'}>
                  <CardContent className="p-3 flex items-center gap-3 text-sm">
                    {evt.event_type === 'competitor_high_threat'
                      ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      : <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {evt.event_type === 'competitor_high_threat' ? 'High Threat Detected' : 'Competitor Auto-Discovered'}
                      </span>
                      {evt.event_data?.competitor_name && <span className="text-muted-foreground ml-1">— {evt.event_data.competitor_name}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* AI Recommendations */}
          {allRecommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" />AI Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {allRecommendations.slice(0, 8).map((rec: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border bg-muted/50 space-y-1">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={rec.priority || 'medium'} />
                      {rec.type && <Badge variant="outline" className="text-xs">{rec.type}</Badge>}
                    </div>
                    <p className="text-sm">{rec.action || rec.recommendation || JSON.stringify(rec)}</p>
                    {rec.reason && <p className="text-xs text-muted-foreground">{rec.reason}</p>}
                    <p className="text-xs text-muted-foreground">Source: {compNameMap[rec.competitor_id] || rec.competitor_id}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {tracked.length === 0 && competitors.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Competitor Data Yet</h3>
                <p className="text-muted-foreground mt-1 max-w-md">Add competitors to start monitoring. AI will automatically analyze their profiles.</p>
                <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Competitor
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ TAB 2: Competitors ═══ */}
        <TabsContent value="competitors" className="space-y-4">
          {/* Apify Status */}
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${hasApify ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
            <span>{hasApify ? '🟢' : '🟡'}</span>
            <span>{hasApify ? 'Live scraping active via Apify' : 'Using sample analysis data. Add Apify API token in Settings > Integrations for real monitoring.'}</span>
          </div>

          {tracked.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Competitors Tracked</h3>
                <p className="text-muted-foreground mt-1">Add competitors to begin AI-powered monitoring.</p>
                <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4"><Plus className="h-4 w-4 mr-2" /> Add Competitor</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {tracked.map((comp: any) => {
                const threat = threatMap[comp.id];
                return (
                  <Card key={comp.id} className={comp.is_active ? '' : 'opacity-60'}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <ThreatBadge level={threat} />
                          <h3 className="font-semibold">{comp.competitor_name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{comp.is_active ? 'Active' : 'Paused'}</span>
                          <Switch checked={comp.is_active} onCheckedChange={() => toggleActive(comp.id, comp.is_active)} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {comp.website_url && (
                          <a href={comp.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                            <Globe className="h-3 w-3" /> {comp.website_url} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {comp.instagram_url && (
                          <a href={comp.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                            📸 {comp.instagram_url} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <SourceBadge source={comp.discovery_source} confidence={comp.discovery_confidence} />
                        <span className="text-muted-foreground">
                          Last Analyzed: {comp.last_analyzed_at ? formatDistanceToNow(new Date(comp.last_analyzed_at), { addSuffix: true }) : 'Never'}
                        </span>
                        {comp.analysis_count > 0 && <span className="text-muted-foreground">• {comp.analysis_count} analyses</span>}
                      </div>

                      {comp.notes && <p className="text-xs text-muted-foreground italic">{comp.notes}</p>}

                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="outline" className="text-xs" disabled={analyzingId === comp.id} onClick={() => analyzeCompetitor(comp)}>
                          {analyzingId === comp.id ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Analyzing...</> : <><RefreshCw className="h-3 w-3 mr-1" />Analyze Now</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => setDeleteConfirm(comp.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Legacy competitor_analysis cards */}
          {competitors.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Legacy Analysis</h2>
              {competitors.map((comp: any) => (
                <Card key={comp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{comp.competitor_name}</h3>
                      <Badge variant={comp.status === 'analyzed' ? 'default' : 'secondary'}>{comp.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {comp.instagram_url && <a href={comp.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">📸 Instagram <ExternalLink className="h-3 w-3 inline" /></a>}
                      {comp.website_url && <a href={comp.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Globe className="h-3 w-3 inline" /> Website</a>}
                      {comp.created_at && <span>Added {formatDistanceToNow(new Date(comp.created_at), { addSuffix: true })}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB 3: SWOT Dashboard ═══ */}
        <TabsContent value="swot" className="space-y-4">
          {allSwot.strengths.length === 0 && allSwot.weaknesses.length === 0 && allSwot.opportunities.length === 0 && allSwot.threats.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No SWOT Data Yet</h3>
                <p className="text-muted-foreground mt-1">Analyze competitors to populate SWOT intelligence.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">💪 Strengths (Theirs)</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {allSwot.strengths.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> :
                      allSwot.strengths.slice(0, 10).map((s, i) => (
                        <p key={i} className="text-xs flex items-start gap-1">
                          <span className="text-blue-500">•</span> {s.text}
                          <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{compNameMap[s.competitor_id] || '?'}</Badge>
                        </p>
                      ))}
                  </CardContent>
                </Card>
                {/* Weaknesses */}
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">😰 Weaknesses (Theirs)</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {allSwot.weaknesses.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> :
                      allSwot.weaknesses.slice(0, 10).map((w, i) => (
                        <p key={i} className="text-xs flex items-start gap-1">
                          <span className="text-amber-500">•</span> {w.text}
                          <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{compNameMap[w.competitor_id] || '?'}</Badge>
                        </p>
                      ))}
                  </CardContent>
                </Card>
                {/* Opportunities */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">✨ Opportunities</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {allSwot.opportunities.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> :
                      allSwot.opportunities.slice(0, 10).map((o, i) => (
                        <p key={i} className="text-xs flex items-start gap-1">
                          <span className="text-green-500">•</span> {o.text}
                          <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{compNameMap[o.competitor_id] || '?'}</Badge>
                        </p>
                      ))}
                  </CardContent>
                </Card>
                {/* Threats */}
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">⚠️ Threats</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {allSwot.threats.length === 0 ? <p className="text-xs text-muted-foreground">No data</p> :
                      allSwot.threats.slice(0, 10).map((t, i) => (
                        <p key={i} className="text-xs flex items-start gap-1">
                          <span className="text-red-500">•</span> {t.text}
                          <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{compNameMap[t.competitor_id] || '?'}</Badge>
                        </p>
                      ))}
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Comparison */}
              {analysisResults.some((ar: any) => ar.pricing_analysis?.price_point) && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pricing Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2">Competitor</th>
                            <th className="pb-2">Price Point</th>
                            <th className="pb-2">Positioning</th>
                            <th className="pb-2">vs Us</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisResults.filter((ar: any) => ar.pricing_analysis?.price_point).map((ar: any, idx: number) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 font-medium">{compNameMap[ar.competitor_id] || ar.competitor_id}</td>
                              <td className="py-2">{ar.pricing_analysis.price_point}</td>
                              <td className="py-2">{ar.pricing_analysis.positioning}</td>
                              <td className="py-2">{ar.pricing_analysis.comparison_to_us}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Market Positioning & Audience Overlap */}
              {analysisResults.some((ar: any) => ar.market_positioning || ar.audience_overlap) && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Market Positioning</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {analysisResults.filter((ar: any) => ar.market_positioning || ar.audience_overlap).map((ar: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{compNameMap[ar.competitor_id] || ar.competitor_id}</p>
                          {ar.market_positioning && <p className="text-xs text-muted-foreground mt-1">{ar.market_positioning}</p>}
                        </div>
                        {ar.audience_overlap && (
                          <Badge className={
                            ar.audience_overlap === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            ar.audience_overlap === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }>
                            {ar.audience_overlap} overlap
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 4: Content Intelligence ═══ */}
        <TabsContent value="content" className="space-y-4">
          {analysisResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Content Intelligence Yet</h3>
                <p className="text-muted-foreground mt-1">Analyze competitors to see content insights.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Per-competitor content cards */}
              <div className="grid md:grid-cols-2 gap-4">
                {analysisResults.map((ca: any) => {
                  const a = ca.analysis || {};
                  const engRate = a.engagement_rate ?? ca.engagement_rate;
                  const themes = ca.key_themes?.length > 0 ? ca.key_themes : (a.content_themes || []);
                  return (
                    <Card key={ca.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {compNameMap[ca.competitor_id] || ca.competitor_id}
                          {engRate != null && (
                            <Badge variant="outline" className={
                              engRate > 5 ? 'bg-green-500/15 text-green-600 border-green-500/30' :
                              engRate >= 2 ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                              'bg-red-500/15 text-red-600 border-red-500/30'
                            }>{engRate}% engagement</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {a.posting_frequency && <p className="text-xs text-muted-foreground">📅 Posting: {a.posting_frequency}</p>}
                        {themes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {themes.map((t: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 text-blue-600">{t}</Badge>
                            ))}
                          </div>
                        )}
                        {a.content_gaps?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mt-1">Content Gaps:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {a.content_gaps.map((g: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-600">{g}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {a.strengths?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {a.strengths.map((s: string, i: number) => (
                              <Badge key={`s${i}`} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">✅ {s}</Badge>
                            ))}
                          </div>
                        )}
                        {a.weaknesses?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {a.weaknesses.map((w: string, i: number) => (
                              <Badge key={`w${i}`} variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">⚠️ {w}</Badge>
                            ))}
                          </div>
                        )}
                        {ca.discovered_at && <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ca.discovered_at), { addSuffix: true })}</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Aggregate Content Gaps / Opportunities */}
              {(() => {
                const allGaps = analysisResults.flatMap((ar: any) => ar.analysis?.content_gaps || []);
                if (allGaps.length === 0) return null;
                return (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />Content Opportunities</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">Topics your competitors miss — opportunities for you to cover.</p>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(allGaps)].map((gap: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="bg-amber-500/10 text-amber-700">{gap}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 5: Auto-Discovery ═══ */}
        <TabsContent value="discovery" className="space-y-4">
          {/* Discovery Status */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">AI discovers new competitors weekly (Mondays 7AM)</p>
                  <p className="text-xs text-muted-foreground">
                    Last discovery: {lastDiscovery ? formatDistanceToNow(new Date(lastDiscovery), { addSuffix: true }) : 'Never'}
                  </p>
                </div>
                <Button size="sm" onClick={discoverCompetitors} disabled={isDiscovering}>
                  {isDiscovering ? <><Sparkles className="h-4 w-4 mr-1 animate-pulse" />Discovering...</> : <><Sparkles className="h-4 w-4 mr-1" />Discover Now</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Discoveries */}
          {pendingDiscoveries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Pending Confirmation ({pendingDiscoveries.length})</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {pendingDiscoveries.map((comp: any) => (
                  <Card key={comp.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{comp.competitor_name}</h4>
                        {comp.discovery_confidence != null && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            {Math.round(comp.discovery_confidence)}% confidence
                          </Badge>
                        )}
                      </div>
                      {comp.notes && <p className="text-xs text-muted-foreground italic">{comp.notes}</p>}
                      {comp.website_url && <p className="text-xs text-muted-foreground"><Globe className="h-3 w-3 inline mr-1" />{comp.website_url}</p>}
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => analyzeCompetitor(comp)} disabled={analyzingId === comp.id}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Confirm & Analyze
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(comp.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Auto-Discoveries */}
          {confirmedDiscoveries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Confirmed AI Discoveries ({confirmedDiscoveries.length})</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {confirmedDiscoveries.map((comp: any) => (
                  <Card key={comp.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <ThreatBadge level={threatMap[comp.id]} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{comp.competitor_name}</p>
                        <p className="text-xs text-muted-foreground">{comp.analysis_count} analyses • Discovered by AI</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pendingDiscoveries.length === 0 && confirmedDiscoveries.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Radar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Auto-Discovered Competitors</h3>
                <p className="text-muted-foreground mt-1 max-w-md">Click "Discover Now" to let AI find competitors in your industry.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Add Competitor Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Competitor</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Competitor Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://www.instagram.com/competitor_name/" />
            </div>
            <div className="space-y-2">
              <Label>Website URL (optional)</Label>
              <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://competitor.com" />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key products, target market, etc." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => addCompetitor.mutate()} disabled={!name.trim() || addCompetitor.isPending} className="marketing-gradient text-white">
              {addCompetitor.isPending ? 'Adding...' : 'Add Competitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Competitor</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Remove this competitor and all associated analysis data?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteCompetitor(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
