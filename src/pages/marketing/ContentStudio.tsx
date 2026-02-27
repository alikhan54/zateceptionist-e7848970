import { useState, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useMarketingContent, useTrendInsights } from '@/hooks/useMarketingContent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { callWebhook } from '@/lib/api/webhooks';
import { WEBHOOKS, supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  FileText,
  Mail,
  MessageSquare,
  Share2,
  Megaphone,
  Copy,
  Edit,
  Trash2,
  Save,
  Search,
  RefreshCw,
  FolderOpen,
  ImageIcon,
  Plus,
  ExternalLink,
  Wand2,
  TrendingUp,
  Eye,
  Zap,
  RotateCw
} from 'lucide-react';

type ContentType = 'social_media' | 'email' | 'blog' | 'whatsapp' | 'ad_copy' | 'social' | 'video' | 'sms' | 'ad';

const contentTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  social_media: { label: 'Social Media Post', icon: <Share2 className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-500' },
  social: { label: 'Social Media', icon: <Share2 className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-500' },
  email: { label: 'Email Newsletter', icon: <Mail className="h-4 w-4" />, color: 'bg-green-500/10 text-green-500' },
  blog: { label: 'Blog Article', icon: <FileText className="h-4 w-4" />, color: 'bg-purple-500/10 text-purple-500' },
  whatsapp: { label: 'WhatsApp Template', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-500' },
  ad_copy: { label: 'Ad Copy', icon: <Megaphone className="h-4 w-4" />, color: 'bg-orange-500/10 text-orange-500' },
  ad: { label: 'Ad Copy', icon: <Megaphone className="h-4 w-4" />, color: 'bg-orange-500/10 text-orange-500' },
  video: { label: 'Video', icon: <FileText className="h-4 w-4" />, color: 'bg-red-500/10 text-red-500' },
  sms: { label: 'SMS', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-yellow-500/10 text-yellow-500' },
};

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'informative', label: 'Informative' },
  { value: 'urgent', label: 'Urgent' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
];

export default function ContentStudio() {
  const { tenantId, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { content, isLoading: contentLoading, createContent, deleteContent, stats: contentStats } = useMarketingContent();
  const { trends, highRelevanceTrends, refreshTrends, isLoading: trendsLoading } = useTrendInsights({ minScore: 5, limit: 10 });

  // Generator state
  const [contentType, setContentType] = useState<ContentType>('social_media');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('en');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generator');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [repurposingId, setRepurposingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Media library query — fetch files from Supabase Storage 'media' bucket
  const { data: mediaFiles = [] } = useQuery({
    queryKey: ['media-library', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase.storage.from('media').list(tenantConfig.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) { console.warn('Media list error:', error); return []; }
      return (data || []).map(f => ({
        ...f,
        url: supabase.storage.from('media').getPublicUrl(`${tenantConfig.id}/${f.name}`).data.publicUrl,
      }));
    },
    enabled: !!tenantConfig?.id,
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !tenantConfig?.id) return;
    setIsUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      const filePath = `${tenantConfig.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('media').upload(filePath, file, { upsert: false });
      if (error) {
        toast({ title: 'Upload Failed', description: `${file.name}: ${error.message}`, variant: 'destructive' });
      } else {
        uploaded++;
      }
    }
    if (uploaded > 0) {
      toast({ title: `✅ ${uploaded} file(s) uploaded`, description: 'Available in your Media Library' });
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
    }
    setIsUploading(false);
  };

  const handleDeleteMedia = async (fileName: string) => {
    if (!tenantConfig?.id) return;
    const { error } = await supabase.storage.from('media').remove([`${tenantConfig.id}/${fileName}`]);
    if (error) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'File deleted' });
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
    }
  };

  const handleRepurpose = async (item: any) => {
    if (!tenantConfig?.id) return;
    setRepurposingId(item.id);
    toast({ title: "🔄 Repurposing...", description: "AI is creating social posts from this content" });
    try {
      const result = await callWebhook(
        '/ai-tool/repurpose-content',
        {
          content_id: item.id,
          platforms: 'instagram,facebook,linkedin'
        },
        tenantConfig.id
      );
      if (result.success && (result.data as any)?.success) {
        toast({
          title: "✅ Content Repurposed!",
          description: `Created ${(result.data as any).repurposed_count || 'multiple'} social posts from "${item.title}"`
        });
      } else {
        toast({ title: "Error", description: (result.data as any)?.error || "Repurposing failed", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRepurposingId(null);
    }
  };

  const generateMockContent = (type: ContentType, topicText: string, toneText: string) => {
    const templates: Record<string, string> = {
      social_media: `🎯 ${topicText}\n\nDiscover how ${topicText} can transform your business!\n\n✨ Key benefits:\n• Increased efficiency\n• Better customer engagement\n• Measurable ROI\n\n👉 Learn more at the link in bio\n\n#${topicText.replace(/\s+/g, '')} #Business #Growth #Marketing`,
      social: `🎯 ${topicText}\n\nDiscover how ${topicText} can transform your business!\n\n✨ Key benefits:\n• Increased efficiency\n• Better results\n• Happier customers\n\n#${topicText.replace(/\s+/g, '')} #Business #Growth`,
      email: `Subject: Exciting news about ${topicText}!\n\nHi {{first_name}},\n\nWe wanted to share some exciting updates about ${topicText}.\n\nHere's what you need to know:\n\n1. Industry-leading innovation\n2. Proven results for businesses like yours\n3. Easy to get started today\n\nReady to take the next step?\n\nBest regards,\nYour Team`,
      blog: `# ${topicText}: A Complete Guide\n\n## Introduction\n${topicText} has become increasingly important in today's business landscape. In this guide, we'll explore everything you need to know.\n\n## Why ${topicText} Matters\nBusinesses that embrace ${topicText} see an average of 40% improvement in key metrics.\n\n## How to Get Started\n1. Assess your current situation\n2. Set clear goals\n3. Implement step by step\n\n## Conclusion\nDon't wait — start leveraging ${topicText} today to stay ahead of the competition.`,
      whatsapp: `Hi! 👋\n\nQuick update about ${topicText}!\n\n${topicText} can help you:\n✅ Save time\n✅ Increase sales\n✅ Grow faster\n\nInterested? Reply YES to learn more! 🚀`,
      ad_copy: `🔥 ${topicText.toUpperCase()} 🔥\n\nTransform your business today!\n\n✓ Proven results\n✓ Easy setup\n✓ 24/7 support\n\n👉 Get Started Now — Limited Time Offer!`,
      ad: `🔥 ${topicText.toUpperCase()} 🔥\n\nTransform your business today!\n\n✓ Proven results\n✓ Easy setup\n✓ 24/7 support\n\n👉 Get Started Now!`,
    };
    return templates[type] || templates.social_media;
  };

  const handleGenerate = async () => {
    if (!tenantId || !topic.trim()) {
      toast({ title: 'Missing Information', description: 'Please enter a topic.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await callWebhook(WEBHOOKS.GENERATE_CONTENT, { content_type: contentType, topic, tone, language, industry: tenantConfig?.industry }, tenantId);
      if (result.success && result.data) {
        const content = (result.data as any)?.content;
        if (content) {
          setGeneratedContent(content);
          toast({ title: 'Content Generated!', description: 'AI has created your content.' });
        } else {
          const mock = generateMockContent(contentType, topic, tone);
          setGeneratedContent(mock);
          toast({ title: 'Content Generated (Demo)', description: 'Using template. Full AI generation available when connected.' });
        }
      } else {
        const mock = generateMockContent(contentType, topic, tone);
        setGeneratedContent(mock);
        toast({ title: 'Content Generated (Demo)', description: 'Using template. Full AI generation available when connected.' });
      }
    } catch {
      const mock = generateMockContent(contentType, topic, tone);
      setGeneratedContent(mock);
      toast({ title: 'Content Generated (Demo)', description: 'Sample content created.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedContent.trim()) return;
    try {
      await createContent.mutateAsync({
        content_type: contentType as any,
        title: topic || 'Untitled Content',
        body: generatedContent,
        primary_keyword: topic,
        ai_generated: true,
        status: 'draft',
      });
      setGeneratedContent('');
      setTopic('');
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  const handleDeleteContent = async (id: string) => {
    try { await deleteContent.mutateAsync(id); } catch {}
  };

  const filteredLibrary = content.filter((item: any) => {
    const matchesSearch = (item.title || '').toLowerCase().includes(librarySearch.toLowerCase()) || (item.body || '').toLowerCase().includes(librarySearch.toLowerCase());
    const matchesFilter = libraryFilter === 'all' || item.content_type === libraryFilter;
    return matchesSearch && matchesFilter;
  });

  if (tenantLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Studio</h1>
          <p className="text-muted-foreground mt-1">AI-powered content creation and management</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><FileText className="h-3 w-3" />{contentStats.total} items</Badge>
          <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />{contentStats.aiGenerated} AI</Badge>
          <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" />{contentStats.totalViews} views</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="generator" className="gap-2"><Sparkles className="h-4 w-4" />AI Generator</TabsTrigger>
          <TabsTrigger value="library" className="gap-2"><FolderOpen className="h-4 w-4" />Content Library</TabsTrigger>
          <TabsTrigger value="trends" className="gap-2"><TrendingUp className="h-4 w-4" />Trends</TabsTrigger>
          <TabsTrigger value="media" className="gap-2"><ImageIcon className="h-4 w-4" />Media Library</TabsTrigger>
        </TabsList>

        {/* AI Generator Tab */}
        <TabsContent value="generator" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />Generate Content</CardTitle>
                <CardDescription>Create AI-powered content for your marketing needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['social_media', 'email', 'blog', 'whatsapp', 'ad_copy'] as ContentType[]).map((type) => {
                      const config = contentTypeConfig[type];
                      return (
                        <Button key={type} variant={contentType === type ? 'default' : 'outline'} size="sm" className="justify-start gap-2" onClick={() => setContentType(type)}>
                          {config.icon}<span className="hidden sm:inline">{config.label.split(' ')[0]}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic or Brief</Label>
                  <Textarea id="topic" placeholder="Describe what you want to create..." rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{tones.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{languages.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleGenerate} className="w-full" disabled={isGenerating || !topic.trim()}>
                  {isGenerating ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Content</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {generatedContent && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopyContent(generatedContent)}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <div className="space-y-4">
                    <Textarea value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)} rows={10} className="resize-none" />
                    <Button onClick={handleSaveToLibrary} className="w-full" disabled={createContent.isPending}>
                      <Save className="h-4 w-4 mr-2" />{createContent.isPending ? 'Saving...' : 'Save to Library'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card className="border-dashed">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                          <Sparkles className="h-12 w-12 mx-auto text-primary/50" />
                          <div>
                            <h4 className="font-medium">AI Content Ideas for {tenantConfig?.industry || 'Your Business'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">Click to generate instantly</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                            <Button variant="outline" size="sm" onClick={() => { setContentType('social'); setTopic('Tips for ' + (tenantConfig?.industry || 'business')); }}>
                              <MessageSquare className="h-4 w-4 mr-1" />Industry Tips
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setContentType('email'); setTopic('Welcome email for new customers'); }}>
                              <Mail className="h-4 w-4 mr-1" />Welcome Email
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setContentType('blog'); setTopic('How to choose the best ' + (tenantConfig?.industry || 'service')); }}>
                              <FileText className="h-4 w-4 mr-1" />How-To Guide
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setContentType('ad'); setTopic('Promotional ad for ' + (tenantConfig?.company_name || 'our services')); }}>
                              <Megaphone className="h-4 w-4 mr-1" />Promo Ad
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Trending in {tenantConfig?.industry || 'Your Industry'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {['AI automation', 'customer experience', 'digital transformation', 'personalization'].map(t => (
                            <Badge key={t} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => setTopic(t)}>
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Library Tab */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search content..." value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={libraryFilter} onValueChange={setLibraryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(contentTypeConfig).slice(0, 5).map(([type, config]) => (
                  <SelectItem key={type} value={type}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contentLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : filteredLibrary.length === 0 ? (
            <Card><CardContent className="text-center py-12"><FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" /><p className="text-muted-foreground">No content found</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLibrary.map((item: any) => {
                const typeConfig = contentTypeConfig[item.content_type] || contentTypeConfig.blog;
                return (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge className={typeConfig.color}>{typeConfig.icon}<span className="ml-1">{typeConfig.label}</span></Badge>
                        <div className="flex gap-1">
                          {item.ai_generated && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>}
                        </div>
                      </div>
                      <CardTitle className="text-base mt-2 line-clamp-1">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3">{item.body || item.summary || ''}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.views || 0}</span>
                        <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{item.shares || 0}</span>
                      </div>
                    </CardContent>
                    <div className="p-4 pt-0 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopyContent(item.body || '')}><Copy className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleRepurpose(item)} disabled={repurposingId === item.id}>
                        {repurposingId === item.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                        <span className="ml-1 text-xs">Repurpose</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteContent(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Trend Insights</h2>
              <p className="text-sm text-muted-foreground">AI-curated trends based on industry and seasonality</p>
            </div>
            <Button variant="outline" onClick={() => refreshTrends.mutateAsync()} disabled={refreshTrends.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshTrends.isPending ? 'animate-spin' : ''}`} />
              Refresh Trends
            </Button>
          </div>

          {trendsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : trends.length === 0 ? (
            <Card><CardContent className="text-center py-12"><TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" /><p className="text-muted-foreground">No trends discovered yet</p><p className="text-sm text-muted-foreground">Click "Refresh Trends" to discover new insights</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trends.map((trend: any) => (
                <Card key={trend.id} className={`${(trend.ai_relevance_score || 0) >= 7 ? 'border-primary/30' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3" />{trend.trend_keyword}</Badge>
                      <Badge variant={((trend.ai_relevance_score || 0) >= 7) ? 'default' : 'secondary'}>
                        Score: {trend.ai_relevance_score || 0}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {trend.category && <p className="text-sm text-muted-foreground">Category: {trend.category}</p>}
                      <p className="text-xs text-muted-foreground">Source: {trend.source} • {new Date(trend.discovered_at).toLocaleDateString()}</p>
                      {trend.ai_content_suggestions && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <p className="font-medium mb-1">AI Suggestions:</p>
                          <p className="text-muted-foreground">{typeof trend.ai_content_suggestions === 'string' ? trend.ai_content_suggestions : JSON.stringify(trend.ai_content_suggestions).slice(0, 150)}</p>
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => {
                        setTopic(trend.trend_keyword);
                        setContentType('social_media');
                        setActiveTab('generator');
                        toast({ title: '📝 Topic Set!', description: `Creating content about "${trend.trend_keyword}"` });
                      }}>
                        <Zap className="h-3 w-3 mr-1" />Create Content from Trend
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Media Library Tab */}
        <TabsContent value="media" className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={e => handleUpload(e.target.files)}
          />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Media Library</CardTitle>
                  <CardDescription>Upload and manage images and videos for your content</CardDescription>
                </div>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Plus className="h-4 w-4 mr-2" />Upload Media</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mediaFiles.length === 0 ? (
                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); handleUpload(e.dataTransfer.files); }}
                >
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Drag and drop files here, or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports images, videos, PDFs, and documents</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaFiles.map((file: any) => {
                    const isImage = file.metadata?.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
                    return (
                      <div key={file.id || file.name} className="group relative border rounded-lg overflow-hidden">
                        {isImage ? (
                          <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center bg-muted">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs truncate">{file.name.split('-').slice(1).join('-') || file.name}</p>
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(file.url); toast({ title: 'URL Copied!' }); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDeleteMedia(file.name)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload More</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
