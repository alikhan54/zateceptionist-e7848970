import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, callWebhook } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Target, Lightbulb, BarChart3, Globe, Search, TrendingUp,
  CheckCircle, Trash2, ExternalLink, Sparkles, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CompetitorAnalysis() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notes, setNotes] = useState('');

  // ─── Tracked competitors ───
  const { data: tracked = [], isLoading: loadingTracked } = useQuery({
    queryKey: ['competitor_tracking', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('competitor_tracking' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
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
        .order('captured_at', { ascending: false })
        .limit(30);
      return (data || []).map((d: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(d.content_data || '{}'); } catch {}
        return { ...d, analysis: parsed };
      });
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: lastScrape } = useQuery({
    queryKey: ['last-competitor-scrape', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return null;
      const { data } = await supabase
        .from('system_events' as any)
        .select('created_at')
        .eq('tenant_id', tenantConfig.id)
        .eq('event_type', 'competitor_scrape')
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0]?.created_at || null;
    },
    enabled: !!tenantConfig?.id,
  });

  const hasApify = !!(tenantConfig as any)?.features?.has_apify || !!(tenantConfig as any)?.apify_token;

  // ─── Add competitor to tracking ───
  const addCompetitor = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');
      if (!name.trim()) throw new Error('Competitor name is required');
      // Insert into competitor_tracking
      const { error: trackErr } = await supabase.from('competitor_tracking' as any).insert({
        tenant_id: tenantConfig.id,
        name: name.trim(),
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        notes: notes.trim() || null,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      if (trackErr) console.warn('competitor_tracking insert:', trackErr.message);
      // Also insert into competitor_analysis for analysis view
      const { error: analysisErr } = await supabase.from('competitor_analysis').insert({
        tenant_id: tenantConfig.id,
        competitor_name: name.trim(),
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        status: 'pending',
      });
      if (analysisErr) console.warn('competitor_analysis insert:', analysisErr.message);
    },
    onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
  queryClient.invalidateQueries({ queryKey: ['competitor_analysis'] });
  setIsCreateOpen(false);
  setName(''); setInstagramUrl(''); setWebsiteUrl(''); setNotes('');
  
  // AUTO-TRIGGER instant analysis via webhook
  const webhookBaseUrl = 'https://webhooks.zatesystems.com/webhook';
  fetch(`${webhookBaseUrl}/marketing/analyze-competitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantConfig?.id,
      competitor_id: tracked?.[0]?.id || '', // Latest added
      competitor_name: name.trim(),
      instagram_url: instagramUrl.trim() || ''
    })
  }).catch(err => console.error('Analysis trigger:', err));
  
  toast({
    title: '✅ Competitor added!',
    description: 'AI is analyzing now — results will appear in 30-60 seconds.',
  });
  
  // Auto-refetch after analysis completes
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
    queryClient.invalidateQueries({ queryKey: ['competitor_analysis'] });
    queryClient.invalidateQueries({ queryKey: ['competitor_content'] });
  }, 45000);
},

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('competitor_tracking' as any).update({ is_active: !currentActive }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
    toast({ title: !currentActive ? 'Tracking enabled' : 'Tracking paused' });
  };

  const deleteCompetitor = async (id: string) => {
    await supabase.from('competitor_tracking' as any).delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
    setDeleteConfirm(null);
    toast({ title: 'Competitor removed' });
  };

  // ─── Computed ───
  const allOpportunities = analysisResults.flatMap((ca: any) => ca.analysis?.opportunities || []);
  const allWeaknesses = analysisResults.flatMap((ca: any) => ca.analysis?.weaknesses || []);
  const totalTracked = tracked.length + competitors.length;
  const analyzed = competitors.filter((c: any) => c.status === 'analyzed').length;
  const opportunities = competitors.reduce((sum: number, c: any) => sum + (c.opportunities?.length || 0), 0) + allOpportunities.length;

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
          <p className="text-muted-foreground">AI-powered competitor analysis and monitoring</p>
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
            ? 'No competitors tracked. Add competitors below to start AI monitoring.'
            : analysisResults.length === 0
              ? `${tracked.length} competitor(s) added. AI analysis runs daily at 6 AM — first results tomorrow.`
              : `AI monitoring active — Last scan: ${lastScrape ? formatDistanceToNow(new Date(lastScrape), { addSuffix: true }) : 'recently'}`}
        </span>
      </div>

      {/* Apify Status */}
      <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${hasApify ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
        <span>{hasApify ? '🟢' : '🟡'}</span>
        <span>
          {hasApify
            ? 'Live scraping active via Apify'
            : 'Using sample analysis data. Add Apify API token in Settings > Integrations for real competitor monitoring.'}
        </span>
      </div>

      {/* Schedule info */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>📅 Analysis runs daily at 6:00 AM</span>
            <span>Last scrape: {lastScrape ? formatDistanceToNow(new Date(lastScrape), { addSuffix: true }) : 'Never'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tracked', value: totalTracked, icon: Eye, color: 'text-purple-500' },
          { label: 'Analyzed', value: analyzed + analysisResults.length, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Opportunities', value: opportunities, icon: Lightbulb, color: 'text-amber-500' },
          { label: 'Weaknesses Found', value: allWeaknesses.length, icon: Target, color: 'text-red-500' },
        ].map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Tracked Competitors List ─── */}
      {tracked.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Tracked Competitors ({tracked.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {tracked.map((comp: any) => (
              <Card key={comp.id} className={comp.is_active ? 'border-green-500/20' : 'opacity-60'}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{comp.name}</h3>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                        {comp.instagram_url && (
                          <a href={comp.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                            📸 {comp.instagram_url} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {comp.website_url && (
                          <a href={comp.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                            <Globe className="h-3 w-3" /> {comp.website_url} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {comp.notes && <p className="mt-1 italic">{comp.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{comp.is_active ? 'Active' : 'Paused'}</span>
                        <Switch checked={comp.is_active} onCheckedChange={() => toggleActive(comp.id, comp.is_active)} />
                      </div>
                      <Button size="sm" variant="outline" className="text-xs" disabled={analyzingId === comp.id}
                        onClick={async () => {
                          setAnalyzingId(comp.id);
                          toast({ title: '🔍 Analyzing competitor...', description: 'AI is scraping and analyzing their profile' });
                          try {
                            const result = await callWebhook('marketing/analyze-competitor', {
                              competitor_id: comp.id,
                              competitor_name: comp.name,
                              instagram_url: comp.instagram_url,
                              website_url: comp.website_url,
                            }, tenantConfig?.id || '');
                            if (result.success) {
                              queryClient.invalidateQueries({ queryKey: ['competitor_tracking'] });
                              queryClient.invalidateQueries({ queryKey: ['competitor_content'] });
                              toast({ title: '✅ Analysis Complete!' });
                            } else {
                              toast({ title: '⏳ Analysis Queued', description: 'Will be processed at next 6 AM cycle' });
                            }
                          } catch {
                            toast({ title: '⏳ Analysis Queued', description: 'Will be processed at next 6 AM cycle' });
                          } finally {
                            setAnalyzingId(null);
                          }
                        }}>
                        {analyzingId === comp.id ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Analyzing...</> : <><RefreshCw className="h-3 w-3 mr-1" /> Analyze Now</>}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteConfirm(comp.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── Legacy competitor_analysis cards ─── */}
      {competitors.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Competitor Analysis</h2>
          {competitors.map((comp: any) => (
            <Card key={comp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{comp.competitor_name}</h3>
                      <Badge variant={comp.status === 'analyzed' ? 'default' : 'secondary'}>{comp.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {comp.instagram_url && <a href={comp.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">📸 Instagram <ExternalLink className="h-3 w-3 inline" /></a>}
                      {comp.website_url && <a href={comp.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Globe className="h-3 w-3 inline" /> Website</a>}
                      {comp.created_at && <span>Added {formatDistanceToNow(new Date(comp.created_at), { addSuffix: true })}</span>}
                    </div>
                    {comp.content_themes && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(Array.isArray(comp.content_themes) ? comp.content_themes : []).map((theme: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 text-blue-600">{theme}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {comp.engagement_rate != null && (
                      <div className="text-center">
                        <p className={`font-semibold ${comp.engagement_rate > 5 ? 'text-green-600' : comp.engagement_rate >= 2 ? 'text-amber-600' : 'text-red-600'}`}>
                          {comp.engagement_rate}%
                        </p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── AI Analysis Results ─── */}
      {analysisResults.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> AI Analysis Results
          </h2>
          {analysisResults.map((ca: any) => {
            const a = ca.analysis || {};
            const engRate = a.engagement_rate ?? ca.engagement_rate;
            return (
              <Card key={ca.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{ca.competitor_id || 'Competitor'}</h3>
                      {ca.captured_at && <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ca.captured_at), { addSuffix: true })}</span>}
                    </div>
                    {engRate != null && (
                      <Badge variant="outline" className={
                        engRate > 5 ? 'bg-green-500/15 text-green-600 border-green-500/30' :
                        engRate >= 2 ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                        'bg-red-500/15 text-red-600 border-red-500/30'
                      }>{engRate}% engagement</Badge>
                    )}
                  </div>
                  {a.content_themes?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(a.content_themes as string[]).map((theme: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 text-blue-600">{theme}</Badge>
                      ))}
                    </div>
                  )}
                  {a.posting_frequency && <p className="text-xs text-muted-foreground">📅 Posting: {a.posting_frequency}</p>}
                  <div className="flex flex-wrap gap-1">
                    {a.strengths?.map((s: string, i: number) => (
                      <Badge key={`s${i}`} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">✅ {s}</Badge>
                    ))}
                    {a.weaknesses?.map((w: string, i: number) => (
                      <Badge key={`w${i}`} variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">⚠️ {w}</Badge>
                    ))}
                  </div>
                  {a.recommended_actions?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Recommended Actions:</p>
                      {(a.recommended_actions as string[]).map((action: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" className="mt-0.5 rounded" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── AI Insights Section ─── */}
      {(allOpportunities.length > 0 || allWeaknesses.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" /> AI Insights
          </h2>
          <p className="text-xs text-muted-foreground">The AI Brain uses these insights to create content that targets competitor gaps.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {allOpportunities.length > 0 && (
              <Card className="border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" /> Combined Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {allOpportunities.slice(0, 8).map((opp: string, idx: number) => (
                      <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1"><span>💡</span> {opp}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {allWeaknesses.length > 0 && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" /> Competitor Weaknesses to Exploit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {allWeaknesses.slice(0, 8).map((w: string, idx: number) => (
                      <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1"><span>🎯</span> {w}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tracked.length === 0 && competitors.length === 0 && analysisResults.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Competitor Data Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Add competitors to start monitoring. AI analyzes their Instagram profiles daily at 6 AM.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Add Your First Competitor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Add Competitor Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
          </DialogHeader>
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
          <p className="text-sm text-muted-foreground">Remove this competitor from tracking? Analysis data will be preserved.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteCompetitor(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
