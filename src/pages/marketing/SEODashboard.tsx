import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { callWebhook } from '@/lib/api/webhooks';
import {
  Search, TrendingUp, TrendingDown, Minus, Plus, Globe,
  BarChart3, FileText, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, RefreshCw
} from 'lucide-react';

type KeywordEntry = {
  id: string;
  keyword: string;
  current_position: number | null;
  previous_position: number | null;
  search_volume: number | null;
  difficulty_score: number | null;
  url: string | null;
  trend: string;
  last_checked_at: string | null;
};

type ContentScore = {
  id: string;
  url: string;
  page_title: string | null;
  content_score: number;
  readability_score: number;
  word_count: number;
  meta_title: string | null;
  meta_description: string | null;
  has_h1: boolean;
  internal_links: number;
  external_links: number;
  images_with_alt: number;
  images_without_alt: number;
  issues: any[];
  suggestions: any[];
  last_analyzed_at: string | null;
};

const TREND_ICONS: Record<string, any> = {
  up: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
  down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
  stable: { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50' },
  new: { icon: Plus, color: 'text-blue-500', bg: 'bg-blue-50' },
};

const toArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
};

export default function SEODashboard() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addKeywordOpen, setAddKeywordOpen] = useState(false);
  const [analyzeUrlOpen, setAnalyzeUrlOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Fetch keywords
  const { data: keywords = [], isLoading: loadingKeywords } = useQuery({
    queryKey: ['seo_keywords', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('seo_keyword_tracking')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('current_position', { ascending: true, nullsFirst: false });
      return (data || []) as KeywordEntry[];
    },
    enabled: !!tenantConfig?.id,
  });

  // Fetch content scores
  const { data: contentScores = [], isLoading: loadingScores } = useQuery({
    queryKey: ['seo_content_scores', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('seo_content_scores')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('content_score', { ascending: false });
      return (data || []) as ContentScore[];
    },
    enabled: !!tenantConfig?.id,
  });

  // Add keyword
  const addKeywordMutation = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      const { error } = await supabase.from('seo_keyword_tracking').insert({
        tenant_id: tenantConfig.id,
        keyword: newKeyword,
        trend: 'new',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo_keywords'] });
      setNewKeyword('');
      setAddKeywordOpen(false);
      toast({ title: 'Keyword added for tracking!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Analyze URL via webhook
  const analyzeUrlMutation = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      setAnalyzing(true);
      const result = await callWebhook('/seo-analyze', {
        tenant_id: tenantConfig.id,
        url: analyzeUrl,
        keywords: keywords.map(k => k.keyword),
      }, tenantConfig.id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo_content_scores'] });
      queryClient.invalidateQueries({ queryKey: ['seo_keywords'] });
      setAnalyzeUrl('');
      setAnalyzeUrlOpen(false);
      setAnalyzing(false);
      toast({ title: 'SEO analysis complete!' });
    },
    onError: (e: any) => {
      setAnalyzing(false);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const stats = useMemo(() => {
    const top10 = keywords.filter(k => k.current_position && k.current_position <= 10).length;
    const improving = keywords.filter(k => k.trend === 'up').length;
    const declining = keywords.filter(k => k.trend === 'down').length;
    const avgScore = contentScores.length > 0
      ? Math.round(contentScores.reduce((s, c) => s + c.content_score, 0) / contentScores.length)
      : 0;
    return { top10, improving, declining, avgScore };
  }, [keywords, contentScores]);

  const getPositionBadge = (pos: number | null) => {
    if (!pos) return <Badge variant="outline" className="text-xs">N/A</Badge>;
    if (pos <= 3) return <Badge className="bg-green-500 text-white text-xs">#{pos}</Badge>;
    if (pos <= 10) return <Badge className="bg-blue-500 text-white text-xs">#{pos}</Badge>;
    if (pos <= 20) return <Badge className="bg-amber-500 text-white text-xs">#{pos}</Badge>;
    return <Badge variant="outline" className="text-xs">#{pos}</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500 text-white">{score}/100</Badge>;
    if (score >= 60) return <Badge className="bg-amber-500 text-white">{score}/100</Badge>;
    return <Badge className="bg-red-500 text-white">{score}/100</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-indigo-500" /> SEO Dashboard
          </h1>
          <p className="text-muted-foreground">Track keyword rankings and content optimization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddKeywordOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Track Keyword
          </Button>
          <Button className="marketing-gradient text-white" onClick={() => setAnalyzeUrlOpen(true)}>
            <Globe className="h-4 w-4 mr-2" /> Analyze URL
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Top 10 Keywords', value: stats.top10, color: 'text-green-500', icon: TrendingUp },
          { label: 'Improving', value: stats.improving, color: 'text-blue-500', icon: ArrowUp },
          { label: 'Declining', value: stats.declining, color: 'text-red-500', icon: ArrowDown },
          { label: 'Avg Content Score', value: stats.avgScore, color: 'text-indigo-500', icon: BarChart3 },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Keyword Rankings</TabsTrigger>
          <TabsTrigger value="content">Content Scores</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tracked Keywords ({keywords.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKeywords ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : keywords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No keywords tracked yet. Click "Track Keyword" to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Keyword</th>
                        <th className="pb-2 font-medium text-center">Position</th>
                        <th className="pb-2 font-medium text-center">Change</th>
                        <th className="pb-2 font-medium text-center">Volume</th>
                        <th className="pb-2 font-medium text-center">Difficulty</th>
                        <th className="pb-2 font-medium text-center">Trend</th>
                        <th className="pb-2 font-medium">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map(kw => {
                        const change = kw.previous_position && kw.current_position
                          ? kw.previous_position - kw.current_position
                          : null;
                        const trendConfig = TREND_ICONS[kw.trend] || TREND_ICONS.stable;
                        const TrendIcon = trendConfig.icon;
                        return (
                          <tr key={kw.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 font-medium">{kw.keyword}</td>
                            <td className="py-3 text-center">{getPositionBadge(kw.current_position)}</td>
                            <td className="py-3 text-center">
                              {change !== null ? (
                                <span className={change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-400'}>
                                  {change > 0 ? `+${change}` : change === 0 ? '-' : change}
                                </span>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="py-3 text-center text-muted-foreground">
                              {kw.search_volume ? kw.search_volume.toLocaleString() : '-'}
                            </td>
                            <td className="py-3 text-center">
                              {kw.difficulty_score ? (
                                <Badge variant={kw.difficulty_score > 70 ? 'destructive' : kw.difficulty_score > 40 ? 'default' : 'secondary'}>
                                  {kw.difficulty_score}
                                </Badge>
                              ) : '-'}
                            </td>
                            <td className="py-3 text-center">
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${trendConfig.bg}`}>
                                <TrendIcon className={`h-3 w-3 ${trendConfig.color}`} />
                              </div>
                            </td>
                            <td className="py-3 text-xs text-muted-foreground truncate max-w-[200px]">
                              {kw.url || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Scores ({contentScores.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : contentScores.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No pages analyzed yet. Click "Analyze URL" to score your content.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contentScores.map(cs => (
                    <Card key={cs.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{cs.page_title || cs.url}</h4>
                            <p className="text-xs text-muted-foreground truncate">{cs.url}</p>
                          </div>
                          {getScoreBadge(cs.content_score)}
                        </div>

                        <div className="grid grid-cols-6 gap-3 mb-3">
                          {[
                            { label: 'Readability', value: cs.readability_score },
                            { label: 'Words', value: cs.word_count },
                            { label: 'Internal Links', value: cs.internal_links },
                            { label: 'External Links', value: cs.external_links },
                            { label: 'Images w/ Alt', value: cs.images_with_alt },
                            { label: 'Missing Alt', value: cs.images_without_alt },
                          ].map((m, i) => (
                            <div key={i} className="text-center">
                              <p className="text-sm font-semibold">{m.value}</p>
                              <p className="text-[10px] text-muted-foreground">{m.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {cs.has_h1 ? (
                            <Badge variant="secondary" className="text-[10px]"><CheckCircle className="h-3 w-3 mr-1" /> H1 Present</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" /> Missing H1</Badge>
                          )}
                          {cs.meta_title ? (
                            <Badge variant="secondary" className="text-[10px]"><CheckCircle className="h-3 w-3 mr-1" /> Meta Title</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" /> No Meta Title</Badge>
                          )}
                          {cs.meta_description ? (
                            <Badge variant="secondary" className="text-[10px]"><CheckCircle className="h-3 w-3 mr-1" /> Meta Desc</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" /> No Meta Desc</Badge>
                          )}
                        </div>

                        {toArray(cs.issues).length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium mb-1 text-red-600">Issues:</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {toArray(cs.issues).slice(0, 3).map((issue: any, i: number) => (
                                <li key={i} className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                                  {typeof issue === 'string' ? issue : issue.message || JSON.stringify(issue)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {toArray(cs.suggestions).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1 text-green-600">Suggestions:</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {toArray(cs.suggestions).slice(0, 3).map((sug: any, i: number) => (
                                <li key={i} className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                  {typeof sug === 'string' ? sug : sug.message || JSON.stringify(sug)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Keyword Dialog */}
      <Dialog open={addKeywordOpen} onOpenChange={setAddKeywordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track New Keyword</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Keyword</Label>
              <Input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="e.g., AI business automation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddKeywordOpen(false)}>Cancel</Button>
            <Button
              className="marketing-gradient text-white"
              onClick={() => addKeywordMutation.mutate()}
              disabled={!newKeyword.trim()}
            >
              Start Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analyze URL Dialog */}
      <Dialog open={analyzeUrlOpen} onOpenChange={setAnalyzeUrlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyze URL for SEO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>URL to Analyze</Label>
              <Input
                value={analyzeUrl}
                onChange={e => setAnalyzeUrl(e.target.value)}
                placeholder="https://example.com/page"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will check keyword rankings and generate content optimization suggestions using AI.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyzeUrlOpen(false)}>Cancel</Button>
            <Button
              className="marketing-gradient text-white"
              onClick={() => analyzeUrlMutation.mutate()}
              disabled={!analyzeUrl.trim() || analyzing}
            >
              {analyzing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" /> Analyze</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AEO Integration */}
      <Card className="mt-6 border-dashed border-purple-500/30">
        <CardContent className="pt-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium">AI Engine Optimization (AEO)</h3>
            <p className="text-sm text-muted-foreground">See how ChatGPT, Gemini and Perplexity perceive your brand</p>
          </div>
          <a href="/marketing/aeo-dashboard">
            <Button variant="outline">View AEO Dashboard</Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
