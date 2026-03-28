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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { callWebhook } from '@/lib/api/webhooks';
import {
  Brain, Eye, FileText, Network, Code2, BookOpen, RefreshCw, Plus,
  CheckCircle, XCircle, Copy, ChevronDown, ChevronUp, Globe, Sparkles
} from 'lucide-react';

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: 'bg-green-100 text-green-800',
  gemini: 'bg-blue-100 text-blue-800',
  perplexity: 'bg-purple-100 text-purple-800',
  claude: 'bg-amber-100 text-amber-800',
  copilot: 'bg-indigo-100 text-indigo-800',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-green-500 text-white',
  neutral: 'bg-gray-400 text-white',
  negative: 'bg-red-500 text-white',
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  brand: 'bg-blue-100 text-blue-800',
  product: 'bg-purple-100 text-purple-800',
  person: 'bg-amber-100 text-amber-800',
  service: 'bg-green-100 text-green-800',
  location: 'bg-red-100 text-red-800',
  concept: 'bg-indigo-100 text-indigo-800',
};

export default function AEODashboard() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzeTitle, setAnalyzeTitle] = useState('');
  const [analyzeContent, setAnalyzeContent] = useState('');
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('brand');
  const [addQueryOpen, setAddQueryOpen] = useState(false);
  const [queryTemplate, setQueryTemplate] = useState('');
  const [queryCategory, setQueryCategory] = useState('general');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);

  // Brand presence
  const { data: brandPresence = [], isLoading: loadingPresence } = useQuery({
    queryKey: ['aeo_brand_presence', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await (supabase as any)
        .from('aeo_brand_presence')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('checked_at', { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Content scores
  const { data: contentScores = [], isLoading: loadingScores } = useQuery({
    queryKey: ['aeo_content_scores', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await (supabase as any)
        .from('aeo_content_scores')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('aeo_score', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Entity graph
  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ['aeo_entity_graph', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await (supabase as any)
        .from('aeo_entity_graph')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('entity_name', { ascending: true });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Schema registry
  const { data: schemas = [], isLoading: loadingSchemas } = useQuery({
    queryKey: ['aeo_schema_registry', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await (supabase as any)
        .from('aeo_schema_registry')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Query library
  const { data: queries = [], isLoading: loadingQueries } = useQuery({
    queryKey: ['aeo_query_library', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await (supabase as any)
        .from('aeo_query_library')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('priority', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Run AEO analysis
  const runAnalysis = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      setRunning(true);
      return await callWebhook('/aeo/analyze', { tenant_id: tenantConfig.id }, tenantConfig.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aeo_brand_presence'] });
      queryClient.invalidateQueries({ queryKey: ['aeo_content_scores'] });
      setRunning(false);
      toast({ title: 'AEO analysis complete!' });
    },
    onError: (e: any) => {
      setRunning(false);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  // Optimize content
  const optimizeContent = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      return await callWebhook('/aeo/optimize-content', {
        tenant_id: tenantConfig.id,
        url: analyzeUrl,
        title: analyzeTitle,
        content: analyzeContent,
      }, tenantConfig.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aeo_content_scores'] });
      setAnalyzeOpen(false);
      setAnalyzeUrl('');
      setAnalyzeTitle('');
      setAnalyzeContent('');
      toast({ title: 'Content analysis complete!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Add entity
  const addEntity = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      const { error } = await (supabase as any).from('aeo_entity_graph').insert({
        tenant_id: tenantConfig.id,
        entity_name: entityName,
        entity_type: entityType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aeo_entity_graph'] });
      setAddEntityOpen(false);
      setEntityName('');
      toast({ title: 'Entity added!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Add query
  const addQuery = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      const { error } = await (supabase as any).from('aeo_query_library').insert({
        tenant_id: tenantConfig.id,
        query_template: queryTemplate,
        category: queryCategory,
        priority: 5,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aeo_query_library'] });
      setAddQueryOpen(false);
      setQueryTemplate('');
      toast({ title: 'Query added!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Stats
  const stats = useMemo(() => {
    const total = brandPresence.length;
    const mentioned = brandPresence.filter((b: any) => b.brand_mentioned).length;
    const mentionRate = total > 0 ? Math.round((mentioned / total) * 100) : 0;
    const positives = brandPresence.filter((b: any) => b.sentiment === 'positive').length;
    const sentimentRate = total > 0 ? Math.round((positives / total) * 100) : 0;
    const avgScore = contentScores.length > 0
      ? Math.round(contentScores.reduce((s: number, c: any) => s + (c.aeo_score || 0), 0) / contentScores.length)
      : 0;
    return { mentionRate, sentimentRate, avgScore };
  }, [brandPresence, contentScores]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSchema = (id: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getScoreBadge = (score: number | null) => {
    if (!score && score !== 0) return <Badge variant="outline" className="text-xs">N/A</Badge>;
    if (score >= 80) return <Badge className="bg-green-500 text-white">{score}</Badge>;
    if (score >= 60) return <Badge className="bg-amber-500 text-white">{score}</Badge>;
    return <Badge className="bg-red-500 text-white">{score}</Badge>;
  };

  // Group entities by type
  const groupedEntities = useMemo(() => {
    const groups: Record<string, any[]> = {};
    entities.forEach((e: any) => {
      const t = e.entity_type || 'other';
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    });
    return groups;
  }, [entities]);

  // Platform breakdown
  const platformStats = useMemo(() => {
    const platforms: Record<string, { total: number; mentioned: number; sentimentSum: number }> = {};
    brandPresence.forEach((b: any) => {
      const p = b.platform || 'unknown';
      if (!platforms[p]) platforms[p] = { total: 0, mentioned: 0, sentimentSum: 0 };
      platforms[p].total++;
      if (b.brand_mentioned) platforms[p].mentioned++;
      if (b.sentiment === 'positive') platforms[p].sentimentSum++;
    });
    return Object.entries(platforms).map(([name, s]) => ({
      name,
      mentionRate: s.total > 0 ? Math.round((s.mentioned / s.total) * 100) : 0,
      sentimentRate: s.total > 0 ? Math.round((s.sentimentSum / s.total) * 100) : 0,
      total: s.total,
    }));
  }, [brandPresence]);

  const filteredQueries = useMemo(() => {
    if (categoryFilter === 'all') return queries;
    return queries.filter((q: any) => q.category === categoryFilter);
  }, [queries, categoryFilter]);

  const queryCategories = useMemo(() => {
    const cats = new Set(queries.map((q: any) => q.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [queries]);

  const isLoading = loadingPresence || loadingScores || loadingEntities || loadingSchemas || loadingQueries;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" /> AI Engine Optimization
          </h1>
          <p className="text-muted-foreground">How AI platforms see your brand</p>
        </div>
        <Button onClick={() => runAnalysis.mutate()} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Analyzing...' : 'Run AEO Analysis'}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">AEO Score</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgScore}<span className="text-lg text-muted-foreground">/100</span></div>
            <p className="text-xs text-muted-foreground mt-1">Avg content optimization score</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Brand Mention Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.mentionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Queries where brand was cited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sentiment Score</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.sentimentRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Positive sentiment rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visibility" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="visibility"><Eye className="h-4 w-4 mr-1" /> Visibility</TabsTrigger>
          <TabsTrigger value="content"><FileText className="h-4 w-4 mr-1" /> Content</TabsTrigger>
          <TabsTrigger value="entities"><Network className="h-4 w-4 mr-1" /> Entities</TabsTrigger>
          <TabsTrigger value="schema"><Code2 className="h-4 w-4 mr-1" /> Schema</TabsTrigger>
          <TabsTrigger value="queries"><BookOpen className="h-4 w-4 mr-1" /> Queries</TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Visibility */}
        <TabsContent value="visibility" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {platformStats.map(p => (
              <Card key={p.name}>
                <CardContent className="pt-4 pb-3">
                  <Badge className={PLATFORM_COLORS[p.name] || 'bg-gray-100 text-gray-800'} variant="secondary">
                    {p.name}
                  </Badge>
                  <div className="mt-2 text-lg font-bold">{p.mentionRate}% <span className="text-xs font-normal text-muted-foreground">mentions</span></div>
                  <div className="text-sm text-muted-foreground">{p.sentimentRate}% positive / {p.total} checks</div>
                </CardContent>
              </Card>
            ))}
            {platformStats.length === 0 && !loadingPresence && (
              <div className="col-span-full text-center py-8 text-muted-foreground">No platform data yet. Run an AEO analysis to get started.</div>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Citations</CardTitle></CardHeader>
            <CardContent>
              {loadingPresence ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : brandPresence.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No citations tracked yet.</div>
              ) : (
                <div className="space-y-2">
                  {brandPresence.slice(0, 20).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{b.query || '(no query)'}</span>
                        <span className="text-xs text-muted-foreground">{b.platform} - {b.checked_at ? new Date(b.checked_at).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <Badge variant={b.brand_mentioned ? 'default' : 'outline'} className={`text-xs ${b.brand_mentioned ? 'bg-green-500 text-white' : ''}`}>
                          {b.brand_mentioned ? 'Cited' : 'Not cited'}
                        </Badge>
                        <Badge className={`text-xs ${SENTIMENT_COLORS[b.sentiment] || 'bg-gray-400 text-white'}`}>{b.sentiment || 'n/a'}</Badge>
                        {b.share_of_voice != null && <span className="text-xs text-muted-foreground">SoV: {b.share_of_voice}%</span>}
                        {b.citation_quality && <Badge variant="outline" className="text-xs">{b.citation_quality}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Content Audit */}
        <TabsContent value="content" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setAnalyzeOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Analyze URL
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {loadingScores ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : contentScores.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No content analyzed yet. Use "Analyze URL" to audit a page.</div>
              ) : (
                <div className="space-y-1">
                  {contentScores.map((c: any) => (
                    <div key={c.id}>
                      <div
                        className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded cursor-pointer text-sm"
                        onClick={() => toggleRow(c.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{c.title || c.url || '(untitled)'}</span>
                          <span className="text-xs text-muted-foreground">{c.content_type || 'page'}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {getScoreBadge(c.aeo_score)}
                          <span className="text-xs text-muted-foreground" title="Readability">R:{c.readability_score ?? '-'}</span>
                          <span className="text-xs text-muted-foreground" title="Entity Coverage">E:{c.entity_coverage_score ?? '-'}</span>
                          <span className="text-xs text-muted-foreground" title="FAQ Score">F:{c.faq_score ?? '-'}</span>
                          <span className="text-xs text-muted-foreground" title="Citation Score">C:{c.citation_score ?? '-'}</span>
                          <span className="text-xs text-muted-foreground" title="Schema Score">S:{c.schema_score ?? '-'}</span>
                          <span className="text-xs text-muted-foreground" title="Freshness">Fr:{c.freshness_score ?? '-'}</span>
                          {expandedRows.has(c.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      {expandedRows.has(c.id) && (
                        <div className="px-4 py-3 bg-muted/30 rounded mb-2 text-sm space-y-2">
                          {c.recommendations && Array.isArray(c.recommendations) && c.recommendations.length > 0 && (
                            <div>
                              <p className="font-medium mb-1">Recommendations:</p>
                              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                {c.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                          {c.suggested_faqs && Array.isArray(c.suggested_faqs) && c.suggested_faqs.length > 0 && (
                            <div>
                              <p className="font-medium mb-1">Suggested FAQs:</p>
                              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                {c.suggested_faqs.map((f: string, i: number) => <li key={i}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                          {(!c.recommendations || c.recommendations.length === 0) && (!c.suggested_faqs || c.suggested_faqs.length === 0) && (
                            <p className="text-muted-foreground">No recommendations yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Entity Graph */}
        <TabsContent value="entities" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setAddEntityOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Entity
            </Button>
          </div>
          {loadingEntities ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : Object.keys(groupedEntities).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No entities tracked. Add your brand, products, and key people.</div>
          ) : (
            Object.entries(groupedEntities).map(([type, ents]) => (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className={ENTITY_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}>{type}</Badge>
                    <span className="text-muted-foreground font-normal">{ents.length} entities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ents.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                        <span className="font-medium">{e.entity_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs">
                            Gemini {e.known_by_gemini ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            ChatGPT {e.known_by_chatgpt ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            Perplexity {e.known_by_perplexity ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 4: Schema Registry */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {loadingSchemas ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : schemas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No schemas registered. Schemas help AI engines understand your pages.</div>
              ) : (
                <div className="space-y-1">
                  {schemas.map((s: any) => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{s.page_title || s.url || '(untitled)'}</span>
                          <span className="text-xs text-muted-foreground truncate block">{s.url}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {s.schema_types && Array.isArray(s.schema_types) && s.schema_types.map((t: string) => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                          <Badge className={`text-xs ${s.validation_status === 'valid' ? 'bg-green-500 text-white' : s.validation_status === 'error' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                            {s.validation_status || 'unchecked'}
                          </Badge>
                          <Badge variant={s.is_deployed ? 'default' : 'outline'} className={`text-xs ${s.is_deployed ? 'bg-blue-500 text-white' : ''}`}>
                            {s.is_deployed ? 'Deployed' : 'Draft'}
                          </Badge>
                          {s.schema_json && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(typeof s.schema_json === 'string' ? s.schema_json : JSON.stringify(s.schema_json, null, 2));
                                toast({ title: 'JSON-LD copied!' });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => toggleSchema(s.id)}>
                            {expandedSchemas.has(s.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedSchemas.has(s.id) && s.schema_json && (
                        <pre className="px-4 py-3 bg-muted/30 rounded mb-2 text-xs overflow-x-auto max-h-60">
                          <code>{typeof s.schema_json === 'string' ? s.schema_json : JSON.stringify(s.schema_json, null, 2)}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Query Library */}
        <TabsContent value="queries" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {queryCategories.map(c => (
                  <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setAddQueryOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Custom Query
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {loadingQueries ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : filteredQueries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No queries in library. Add queries to track how AI responds about your brand.</div>
              ) : (
                <div className="space-y-1">
                  {filteredQueries.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{q.query_template}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <Badge variant="outline" className="text-xs">{q.category || 'general'}</Badge>
                        <span className="text-xs text-muted-foreground">P:{q.priority ?? '-'}</span>
                        <span className="text-xs text-muted-foreground">Checked: {q.times_checked ?? 0}x</span>
                        {q.brand_mention_rate != null && (
                          <Badge className={`text-xs ${q.brand_mention_rate >= 50 ? 'bg-green-500 text-white' : q.brand_mention_rate > 0 ? 'bg-amber-500 text-white' : 'bg-gray-400 text-white'}`}>
                            {q.brand_mention_rate}% cited
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analyze URL Dialog */}
      <Dialog open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Analyze Content for AEO</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>URL</Label>
              <Input value={analyzeUrl} onChange={e => setAnalyzeUrl(e.target.value)} placeholder="https://example.com/page" />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={analyzeTitle} onChange={e => setAnalyzeTitle(e.target.value)} placeholder="Page title" />
            </div>
            <div>
              <Label>Content (optional)</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm min-h-[100px] resize-y"
                value={analyzeContent}
                onChange={e => setAnalyzeContent(e.target.value)}
                placeholder="Paste page content for deeper analysis..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyzeOpen(false)}>Cancel</Button>
            <Button onClick={() => optimizeContent.mutate()} disabled={!analyzeUrl || optimizeContent.isPending}>
              {optimizeContent.isPending ? 'Analyzing...' : 'Analyze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entity Dialog */}
      <Dialog open={addEntityOpen} onOpenChange={setAddEntityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Entity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Entity Name</Label>
              <Input value={entityName} onChange={e => setEntityName(e.target.value)} placeholder="e.g. Zate Systems" />
            </div>
            <div>
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ENTITY_TYPE_COLORS).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEntityOpen(false)}>Cancel</Button>
            <Button onClick={() => addEntity.mutate()} disabled={!entityName || addEntity.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Query Dialog */}
      <Dialog open={addQueryOpen} onOpenChange={setAddQueryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Query</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Query Template</Label>
              <Input value={queryTemplate} onChange={e => setQueryTemplate(e.target.value)} placeholder="e.g. What is the best CRM for small businesses?" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={queryCategory} onValueChange={setQueryCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="how_to">How-to</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddQueryOpen(false)}>Cancel</Button>
            <Button onClick={() => addQuery.mutate()} disabled={!queryTemplate || addQuery.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
