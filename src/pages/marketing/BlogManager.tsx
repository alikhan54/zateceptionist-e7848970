import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, FileText, Eye, Sparkles, Clock, CheckCircle, PenTool, Layers
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BlogManager() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [excerpt, setExcerpt] = useState('');

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['blog_posts', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');
      const { data, error } = await supabase.from('blog_posts').insert({
        tenant_id: tenantConfig.id,
        title,
        primary_keyword: keyword,
        excerpt: excerpt || null,
        status: 'draft',
        ai_generated: false,
      }).select().single();
      if (error) {
        console.error('Blog post error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      setIsCreateOpen(false);
      setTitle('');
      setKeyword('');
      setExcerpt('');
      toast({ title: 'Blog Post Created!', description: 'Your post is ready for AI generation.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create post', variant: 'destructive' });
    },
  });

  const totalPosts = posts.length;
  const published = posts.filter((p: any) => p.status === 'published').length;
  const drafts = posts.filter((p: any) => p.status === 'draft').length;
  const aiGenerated = posts.filter((p: any) => p.ai_generated).length;

  const statCards = [
    { label: 'Total Posts', value: totalPosts, icon: FileText, color: 'text-purple-500' },
    { label: 'Published', value: published, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Drafts', value: drafts, icon: Clock, color: 'text-amber-500' },
    { label: 'AI Generated', value: aiGenerated, icon: Sparkles, color: 'text-blue-500' },
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
          <h1 className="text-2xl font-bold">Blog Manager</h1>
          <p className="text-muted-foreground">AI-generated SEO-optimized blog posts</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> New Blog Post
        </Button>
      </div>

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

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <PenTool className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Blog Posts Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Create SEO-optimized blog posts powered by AI to drive organic traffic.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => (
            <Card key={post.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{post.title}</h3>
                    {post.ai_generated && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" /> AI
                      </Badge>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {post.primary_keyword && <span>🔑 {post.primary_keyword}</span>}
                    {post.created_at && (
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>
                <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                  {post.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Blog Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., 10 Tips for Better Marketing" />
            </div>
            <div className="space-y-2">
              <Label>Primary Keyword</Label>
              <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., marketing automation" />
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createPost.mutate()} disabled={!title.trim() || createPost.isPending} className="marketing-gradient text-white">
              {createPost.isPending ? 'Creating...' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
