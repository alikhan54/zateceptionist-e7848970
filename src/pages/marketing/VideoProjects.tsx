import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Video, Film, Clock, CheckCircle, Sparkles, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function VideoProjects() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoType, setVideoType] = useState('short_form');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['video_projects', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('video_projects')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('video_projects').insert({
        tenant_id: tenantConfig?.id,
        title,
        description,
        video_type: videoType,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video_projects'] });
      toast({ title: '✨ Video Project Created!' });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setVideoType('short_form');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
    },
  });

  const totalProjects = projects.length;
  const completed = projects.filter((p: any) => p.status === 'completed').length;
  const drafts = projects.filter((p: any) => p.status === 'draft').length;
  const aiGenerated = projects.filter((p: any) => p.ai_generated).length;

  const statCards = [
    { label: 'Total Projects', value: totalProjects, icon: Video, color: 'text-purple-500' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-green-500' },
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
          <h1 className="text-2xl font-bold">Video Projects</h1>
          <p className="text-muted-foreground">AI-generated video scripts and projects</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> New Video Project
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

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Video Projects Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Create AI-powered video scripts with scene breakdowns and storyboards.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project: any) => (
            <Card key={project.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{project.title}</h3>
                    {project.ai_generated && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" /> AI
                      </Badge>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{project.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {project.video_type && <span>🎬 {project.video_type.replace('_', ' ')}</span>}
                    {project.created_at && (
                      <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>
                <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Video Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Product Demo Video" />
            </div>
            <div className="space-y-2">
              <Label>Video Type</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_form">Short Form (Reels/TikTok)</SelectItem>
                  <SelectItem value="long_form">Long Form (YouTube)</SelectItem>
                  <SelectItem value="ad">Ad / Commercial</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="testimonial">Testimonial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the video..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createProject.mutate()} disabled={!title.trim() || createProject.isPending} className="marketing-gradient text-white">
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
