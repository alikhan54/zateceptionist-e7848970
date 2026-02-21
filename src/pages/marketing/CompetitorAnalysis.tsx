import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Target, Lightbulb, BarChart3, Globe, Search, TrendingUp, CheckCircle, Info, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CompetitorAnalysis() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const { data: competitors = [], isLoading } = useQuery({
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

  const { data: competitorAnalysis = [] } = useQuery({
    queryKey: ['competitor-analysis-content', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('competitor_content' as any)
        .select('*')
        .eq('tenant_uuid', tenantConfig.id)
        .order('captured_at', { ascending: false })
        .limit(20);
      return (data || []).map((d: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(d.content_data || '{}'); } catch {}
        return { ...d, analysis: parsed };
      });
    },
    enabled: !!tenantConfig?.id,
  });

  const hasApify = (tenantConfig as any)?.features?.has_apify || (tenantConfig as any)?.apify_token;

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

  const { data: trackingCount } = useQuery({
    queryKey: ['competitor-tracking-count', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return 0;
      const { count } = await supabase
        .from('competitor_tracking' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantConfig.id);
      return count || 0;
    },
    enabled: !!tenantConfig?.id,
  });

  const [trackName, setTrackName] = useState('');
  const [trackInstagram, setTrackInstagram] = useState('');
  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);

  const addToTracking = async () => {
    if (!tenantConfig?.id || !trackName.trim()) return;
    try {
      await supabase.from('competitor_tracking' as any).insert({
        tenant_id: tenantConfig.id,
        name: trackName.trim(),
        instagram_url: trackInstagram.trim() || null,
        is_active: true,
      });
      toast({ title: '✅ Competitor added!', description: 'Data will be scraped at next 6 AM cycle.' });
      setIsTrackDialogOpen(false);
      setTrackName('');
      setTrackInstagram('');
      queryClient.invalidateQueries({ queryKey: ['competitor-tracking-count'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const addCompetitor = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');
      if (!name.trim()) throw new Error('Competitor name is required');
      const { data, error } = await supabase.from('competitor_analysis').insert({
        tenant_id: tenantConfig.id,
        competitor_name: name.trim(),
        instagram_url: instagramUrl?.trim() || null,
        website_url: websiteUrl?.trim() || null,
        status: 'pending',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor_analysis'] });
      setIsCreateOpen(false);
      setName('');
      setInstagramUrl('');
      setWebsiteUrl('');
      toast({ title: 'Competitor Added!', description: 'AI will analyze this competitor shortly.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to add competitor', variant: 'destructive' });
    },
  });

  const tracked = competitors.length;
  const analyzed = competitors.filter((c: any) => c.status === 'analyzed').length;
  const opportunities = competitors.reduce((sum: number, c: any) => sum + (c.opportunities?.length || 0), 0);
  const actionItems = competitors.reduce((sum: number, c: any) => sum + (c.action_items?.length || 0), 0);

  const allOpportunities = competitorAnalysis.flatMap((ca: any) => ca.analysis?.opportunities || []);
  const allWeaknesses = competitorAnalysis.flatMap((ca: any) => ca.analysis?.weaknesses || []);

  const statCards = [
    { label: 'Tracked', value: tracked, icon: Eye, color: 'text-purple-500' },
    { label: 'Analyzed', value: analyzed, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Opportunities', value: opportunities + allOpportunities.length, icon: Lightbulb, color: 'text-amber-500' },
    { label: 'Action Items', value: actionItems, icon: Target, color: 'text-blue-500' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTrackDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Track Competitor
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Competitor
          </Button>
        </div>
      </div>

      <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${hasApify ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
        <span>{hasApify ? '🟢' : '🟡'}</span>
        <span>
          {hasApify
            ? 'Live Scraping Active — Real Instagram data via Apify API'
            : 'Mock Mode — Using sample data. Add your Apify API token in Settings > Integrations to enable real competitor scraping.'}
        </span>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">📅 Part F runs daily at 6:00 AM</span>
            <span className="text-muted-foreground">
              Last scrape: {lastScrape ? formatDistanceToNow(new Date(lastScrape), { addSuffix: true }) : 'Never'}
            </span>
            <span className="text-muted-foreground">
              Competitors tracked: {trackingCount ?? 0}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="stat-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(allOpportunities.length > 0 || allWeaknesses.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {allOpportunities.length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" /> Combined Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {allOpportunities.slice(0, 5).map((opp: string, idx: number) => (
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
                <div className="space-y-1">
                  {allWeaknesses.slice(0, 5).map((w: string, idx: number) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1"><span>🎯</span> {w}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {competitorAnalysis.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> AI Analysis Results
          </h2>
          <p className="text-xs text-muted-foreground">Competitor data updates daily at 6 AM via AI-powered Instagram analysis. Add competitors in the tracking table to monitor more.</p>
          {competitorAnalysis.map((ca: any) => {
            const a = ca.analysis || {};
            const engRate = a.engagement_rate ?? ca.engagement_rate;
            return (
              <Card key={ca.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{ca.competitor_id || 'Unknown Competitor'}</h3>
                      {ca.captured_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ca.captured_at), { addSuffix: true })}
                        </span>
                      )}
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
                  {a.posting_frequency && <p className="text-xs text-muted-foreground">Posting Frequency: {a.posting_frequency}</p>}
                  <div className="flex flex-wrap gap-1">
                    {a.strengths?.map((s: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">✅ {s}</Badge>
                    ))}
                    {a.weaknesses?.map((w: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">⚠️ {w}</Badge>
                    ))}
                  </div>
                  {a.recommended_actions?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Recommended Actions:</p>
                      {(a.recommended_actions as string[]).map((action: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" className="mt-0.5 rounded" />
                          <span>{i + 1}. {action}</span>
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

      {competitorAnalysis.length === 0 && competitors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Competitor Data Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Part F scrapes competitor profiles daily. Add competitors to the competitor_tracking table to begin monitoring.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Add Your First Competitor
            </Button>
          </CardContent>
        </Card>
      )}

      {competitors.length > 0 && (
        <div className="space-y-3">
          {competitors.map((comp: any) => (
            <Card key={comp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{comp.competitor_name}</h3>
                      <Badge variant={comp.status === 'analyzed' ? 'default' : 'secondary'}>
                        {comp.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {comp.website_url && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {comp.website_url}
                        </span>
                      )}
                      {comp.instagram_url && (
                        <span className="flex items-center gap-1">📸 {comp.instagram_url}</span>
                      )}
                      {comp.created_at && (
                        <span>Added {formatDistanceToNow(new Date(comp.created_at), { addSuffix: true })}</span>
                      )}
                    </div>
                    {comp.content_themes && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(Array.isArray(comp.content_themes) ? comp.content_themes : []).map((theme: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{theme}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {comp.engagement_rate != null && (
                      <div className="text-center">
                        <p className="font-semibold">{comp.engagement_rate}%</p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                    )}
                    {comp.posting_frequency && (
                      <div className="text-center">
                        <p className="font-semibold">{comp.posting_frequency}</p>
                        <p className="text-xs text-muted-foreground">Posts/wk</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <Input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/acme" />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://acme.com" />
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

      <Dialog open={isTrackDialogOpen} onOpenChange={setIsTrackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track Competitor (Apify Scraping)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Competitor Name *</Label>
              <Input value={trackName} onChange={e => setTrackName(e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={trackInstagram} onChange={e => setTrackInstagram(e.target.value)} placeholder="https://instagram.com/acme" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrackDialogOpen(false)}>Cancel</Button>
            <Button onClick={addToTracking} disabled={!trackName.trim()} className="marketing-gradient text-white">
              Add to Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
