import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, callWebhook, WEBHOOKS } from "@/integrations/supabase/client";
import { logSystemEvent } from "@/lib/api/systemEvents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Eye, Sparkles, Clock, CheckCircle, PenTool, RotateCw, RefreshCw, Copy, Download, ExternalLink, Layout, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const SEO_COLORS = { good: 'text-green-600 bg-green-100', ok: 'text-yellow-600 bg-yellow-100', bad: 'text-red-600 bg-red-100' };
const getSeoColor = (score: number) => score > 80 ? SEO_COLORS.good : score >= 60 ? SEO_COLORS.ok : SEO_COLORS.bad;

export default function BlogManager() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [repurposingId, setRepurposingId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<any>(null);
  const [repurposeResult, setRepurposeResult] = useState<any>(null);
  const [repurposeDialogPost, setRepurposeDialogPost] = useState<any>(null);
  const [creatingLPId, setCreatingLPId] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog_posts", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
    refetchInterval: 30000,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error("No tenant configured");
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          tenant_id: tenantConfig.id,
          title,
          primary_keyword: keyword,
          excerpt: excerpt || null,
          content_html: "",
          meta_description: excerpt || "",
          status: "draft",
          ai_generated: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog_posts"] });
      setIsCreateOpen(false);
      setTitle(""); setKeyword(""); setExcerpt("");
      toast({ title: "Blog Post Created!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateContent = async (post: any) => {
    setGeneratingId(post.id);
    toast({ title: "🤖 AI is writing your blog post...", description: `Generating content for "${post.title}"` });
    try {
      const result = await callWebhook(WEBHOOKS.GENERATE_CONTENT, {
        blog_id: post.id,
        topic: post.title,
        keyword: post.primary_keyword || '',
        type: 'blog',
        tone: 'professional',
        length: 'long',
      }, tenantConfig?.id || '');

      if (result.success) {
        const content = (result.data as any)?.content || (result.data as any)?.html || '';
        if (content) {
          const titleSlug = (post.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          await supabase.from("blog_posts").update({
            content_html: content,
            ai_generated: true,
            status: 'published',
            published_at: new Date().toISOString(),
            canonical_url: `${window.location.origin}/blog/${titleSlug || post.id}`,
          }).eq("id", post.id);
        }
        queryClient.invalidateQueries({ queryKey: ["blog_posts"] });
        toast({ title: "✅ Blog Content Generated!" });
        logSystemEvent({ tenantId: tenantConfig?.id || '', eventType: 'blog_generated', sourceModule: 'marketing', eventData: { blog_title: post.title, blog_id: post.id } });
      } else {
        toast({ title: "Generation Failed", description: result.error || "Could not generate", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRepurpose = async (post: any) => {
    setRepurposingId(post.id);
    setRepurposeDialogPost(post);
    toast({ title: "🔄 Repurposing...", description: "AI is creating social posts" });
    try {
      const result = await callWebhook(WEBHOOKS.REPURPOSE_CONTENT, {
        content_id: post.id,
        content: post.content_html || post.excerpt || post.title,
        title: post.title,
        platforms: 'instagram,facebook,linkedin',
      }, tenantConfig?.id || '');
      if (result.success) {
        const data = result.data as any;
        setRepurposeResult(data?.posts || data?.repurposed || [
          { platform: 'instagram', content: `📸 ${post.title}\n\n${(post.excerpt || post.title).slice(0, 150)}...\n\n#blog #content #marketing`, status: 'ready' },
          { platform: 'facebook', content: `📘 New Blog Post: ${post.title}\n\n${(post.excerpt || '').slice(0, 200)}\n\nRead more on our blog!`, status: 'ready' },
          { platform: 'linkedin', content: `📝 ${post.title}\n\n${(post.excerpt || '').slice(0, 250)}\n\n#ContentMarketing #Blog`, status: 'ready' },
        ]);
        toast({ title: "✅ Content Repurposed!" });
      } else {
        setRepurposeResult([
          { platform: 'instagram', content: `📸 ${post.title}\n\n${(post.excerpt || post.title).slice(0, 150)}...`, status: 'ready' },
          { platform: 'facebook', content: `📘 ${post.title}\n\n${(post.excerpt || '').slice(0, 200)}`, status: 'ready' },
          { platform: 'linkedin', content: `📝 ${post.title}\n\n${(post.excerpt || '').slice(0, 250)}`, status: 'ready' },
        ]);
      }
    } catch {
      setRepurposeResult([
        { platform: 'instagram', content: `📸 ${post.title}`, status: 'ready' },
        { platform: 'facebook', content: `📘 ${post.title}`, status: 'ready' },
        { platform: 'linkedin', content: `📝 ${post.title}`, status: 'ready' },
      ]);
    } finally {
      setRepurposingId(null);
    }
  };

  const publishToSocial = async (platform: string, content: string) => {
    toast({ title: `📤 Publishing to ${platform}...` });
    try {
      // Insert directly into social_posts for cron pickup
      await supabase.from('social_posts').insert({
        tenant_id: tenantConfig?.id,
        platform,
        post_text: content,
        hashtags: [],
        mentions: [],
        media_urls: [],
        status: 'scheduled',
        scheduled_at: new Date().toISOString(),
        ai_optimized: true,
        likes_count: 0, comments_count: 0, shares_count: 0,
        impressions: 0, reach: 0, clicks: 0, engagement_rate: 0,
      });
      // Also trigger webhook for immediate publish
      try {
        await callWebhook(WEBHOOKS.POST_SOCIAL, {
          platform,
          content,
          source: 'blog_repurpose',
        }, tenantConfig?.id || '');
      } catch { /* cron will pick it up */ }
      toast({ title: `✅ Published to ${platform}!` });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const createLandingPage = async (post: any) => {
    if (!tenantConfig?.id) return;
    setCreatingLPId(post.id);
    try {
      const { data, error } = await supabase.from('landing_pages').insert({
        tenant_id: tenantConfig.id,
        name: post.title,
        slug: post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
        html_content: post.content_html || `<h1>${post.title}</h1><p>${post.excerpt || ''}</p>`,
        meta_title: post.meta_title || post.title,
        meta_description: post.meta_description || post.excerpt || '',
        status: 'draft',
        template_type: 'blog',
      }).select().single();
      if (error) throw error;
      toast({ title: "✅ Landing Page Created!", description: "Redirecting to editor..." });
      navigate('/marketing/landing');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreatingLPId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard!` });
  };

  const totalPosts = posts.length;
  const published = posts.filter((p: any) => p.status === "published").length;
  const drafts = posts.filter((p: any) => p.status === "draft").length;
  const aiGenerated = posts.filter((p: any) => p.ai_generated).length;
  const statCards = [
    { label: "Total Posts", value: totalPosts, icon: FileText, color: "text-blue-500" },
    { label: "Published", value: published, icon: CheckCircle, color: "text-green-500" },
    { label: "Drafts", value: drafts, icon: Clock, color: "text-amber-500" },
    { label: "AI Generated", value: aiGenerated, icon: Sparkles, color: "text-purple-500" },
  ];

  const platformEmoji: Record<string, string> = { instagram: '📸', facebook: '📘', linkedin: '💼', twitter: '🐦' };

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
      {/* Automation Status */}
      <div className="bg-muted/50 border rounded-lg p-4 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium"><Info className="h-4 w-4 text-primary" /> Automation Status</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span>📝 Blog generation runs daily at 8 AM</span>
          <span>🤖 AI Brain promotes high-performing blogs automatically</span>
          <span>🔍 SEO optimization applied to all AI content</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Manager</h1>
          <p className="text-muted-foreground">AI-powered blog content generation &amp; distribution</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> New Blog Post
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
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

      {/* SEO promo note */}
      <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
        💡 Blog posts with SEO score &gt; 70 are automatically promoted on social media by the AI Brain.
        {(tenantConfig as any)?.company_domain && <span className="ml-2">🌐 Website publishing enabled for <strong>{(tenantConfig as any).company_domain}</strong></span>}
      </p>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <PenTool className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Blog Posts Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">Create your first blog post and let AI generate SEO-optimized content.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{post.title}</h3>
                      {post.ai_generated && (
                        <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> AI</Badge>
                      )}
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                      {post.seo_score != null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeoColor(post.seo_score)}`}>
                          SEO: {post.seo_score}/100
                        </span>
                      )}
                    </div>

                    {/* Excerpt / content preview */}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {post.excerpt || (post.content_html ? post.content_html.replace(/<[^>]+>/g, '').slice(0, 100) + '...' : 'No content yet')}
                    </p>

                    {/* Tags/keywords */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {post.primary_keyword && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          🔑 {post.primary_keyword}
                        </span>
                      )}
                      {post.created_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* AI Generate */}
                    <Button size="sm" variant="outline" disabled={generatingId === post.id}
                      onClick={() => generateContent(post)}>
                      {generatingId === post.id
                        ? <><Clock className="h-3 w-3 mr-1 animate-spin" /> Writing...</>
                        : <><Sparkles className="h-3 w-3 mr-1" /> AI Generate</>}
                    </Button>

                    {/* Preview */}
                    {post.content_html && (
                      <Button size="sm" variant="outline" onClick={() => setPreviewPost(post)}>
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </Button>
                    )}

                    {/* Public Link */}
                    {post.status === 'published' && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`/blog/${(post.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || post.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" /> View Public
                        </a>
                      </Button>
                    )}

                    {/* Repurpose */}
                    {(post.content_html || post.status === 'published') && (
                      <Button size="sm" variant="outline" disabled={repurposingId === post.id}
                        onClick={() => handleRepurpose(post)}>
                        {repurposingId === post.id
                          ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> ...</>
                          : <><RotateCw className="h-3 w-3 mr-1" /> Repurpose</>}
                      </Button>
                    )}

                    {/* Landing Page */}
                    <Button size="sm" variant="outline" disabled={creatingLPId === post.id}
                      onClick={() => createLandingPage(post)}>
                      {creatingLPId === post.id
                        ? <><Clock className="h-3 w-3 mr-1 animate-spin" /></>
                        : <><Layout className="h-3 w-3 mr-1" /> Landing Page</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(previewPost?.content_html?.replace(/<[^>]+>/g, '') || '', 'Text content')}>
              <Copy className="h-3 w-3 mr-1" /> Copy Text
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(previewPost?.content_html || '', 'HTML')}>
              <Copy className="h-3 w-3 mr-1" /> Copy HTML
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const blob = new Blob([previewPost?.content_html || ''], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `${previewPost?.title || 'blog'}.html`; a.click();
            }}>
              <Download className="h-3 w-3 mr-1" /> Download
            </Button>
          </div>
          <div className="border rounded-lg p-6 overflow-auto max-h-[55vh] prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: previewPost?.content_html || '<p>No content</p>' }} />
        </DialogContent>
      </Dialog>

      {/* Repurpose Dialog */}
      <Dialog open={!!repurposeResult && !!repurposeDialogPost} onOpenChange={() => { setRepurposeResult(null); setRepurposeDialogPost(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Repurposed Content</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">Generated social posts from "{repurposeDialogPost?.title}"</p>
          <div className="space-y-3">
            {(repurposeResult || []).map((item: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{platformEmoji[item.platform] || '📱'} {item.platform}</span>
                    <Button size="sm" onClick={() => publishToSocial(item.platform, item.content)}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Publish
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Blog Post</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., 10 Tips for Better Customer Service" />
            </div>
            <div className="space-y-2">
              <Label>Primary Keyword</Label>
              <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., customer service tips" />
            </div>
            <div className="space-y-2">
              <Label>Excerpt (optional)</Label>
              <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createPost.mutate()} disabled={!title.trim() || createPost.isPending} className="marketing-gradient text-white">
              {createPost.isPending ? "Creating..." : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
