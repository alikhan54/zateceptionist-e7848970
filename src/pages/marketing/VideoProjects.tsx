import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, callWebhook, WEBHOOKS } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Video, Film, Clock, CheckCircle, Sparkles, Copy, Download, RefreshCw, Image, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const VIDEO_TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  short_form: { emoji: '📱', label: 'Reel/TikTok' },
  long_form: { emoji: '🎥', label: 'YouTube' },
  ad_commercial: { emoji: '📺', label: 'Ad' },
  ad: { emoji: '📺', label: 'Ad' },
  tutorial: { emoji: '📚', label: 'Tutorial' },
  testimonial: { emoji: '💬', label: 'Testimonial' },
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; spin?: boolean }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  generating: { label: 'AI Generating...', variant: 'outline', spin: true },
  generated: { label: 'Script Ready', variant: 'default' },
  script_ready: { label: 'Script Ready', variant: 'default' },
  rendering: { label: 'Rendering...', variant: 'outline', spin: true },
  completed: { label: 'Completed ✓', variant: 'default' },
};

export default function VideoProjects() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoType, setVideoType] = useState('short_form');
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<any>(null);

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
    refetchInterval: 15000,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');
      const insertData: Record<string, any> = {
        tenant_id: tenantConfig.id,
        title,
        description: description || null,
        status: 'draft',
        ai_generated: false,
      };
      // Include video_type — column may or may not exist
      try {
        insertData.video_type = videoType;
      } catch {}
      
      const { data, error } = await supabase.from('video_projects').insert(insertData).select().single();
      if (error) {
        // Retry without video_type if column doesn't exist
        if (error.message?.includes('video_type')) {
          delete insertData.video_type;
          const retry = await supabase.from('video_projects').insert(insertData).select().single();
          if (retry.error) throw retry.error;
          return retry.data;
        }
        throw error;
      }
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['video_projects'] });
      setIsCreateOpen(false);
      setTitle(''); setDescription(''); setVideoType('short_form');
      toast({ title: '🎬 Video Project Created!', description: 'Auto-generating script...' });
      // Auto-trigger generation
      if (data?.id) {
        await generateScript(data);
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('video_projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video_projects'] });
      setDetailProject(null);
      toast({ title: 'Video project deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  const generateScript = async (project: any) => {
    if (!tenantConfig?.id) return;
    setGeneratingScriptId(project.id);
    toast({ title: '🎬 AI is generating your video script and scenes...' });
    try {
      // Update status to generating
      await supabase.from('video_projects').update({ status: 'generating' }).eq('id', project.id);
      queryClient.invalidateQueries({ queryKey: ['video_projects'] });

      const result = await callWebhook(WEBHOOKS.VIDEO_GENERATE, {
        project_id: project.id,
        title: project.title,
        description: project.description || '',
        video_type: project.video_type || 'short_form',
        company_name: tenantConfig?.company_name || 'Your Company',
        industry: (tenantConfig as any)?.industry || 'technology',
      }, tenantConfig.id);

      if (result.success && result.data) {
        const rawData = result.data as any;
        // Handle possible double-wrapping from callWebhook
        const data = (rawData?.data && (rawData.data.script || rawData.data.scenes || rawData.data.script_content)) ? rawData.data : rawData;
        const rawScript = data?.script_content || data?.script || data?.content || '';
        const scenes = data?.scenes || [];
        // If script_content is empty but scenes exist, build readable text from scenes
        const script = (typeof rawScript === 'string' && rawScript.length > 10)
          ? rawScript
          : scenes.length > 0
            ? scenes.map((s: any, i: number) =>
                `Scene ${s.scene_number || i+1}:\n` +
                `Visual: ${s.description || s.visual_description || ''}\n` +
                `Voiceover: ${s.dialogue || s.voiceover_text || ''}\n` +
                (s.text_overlay ? `Text: ${s.text_overlay}\n` : '')
              ).join('\n---\n')
            : '';
        const updateData: Record<string, any> = {
          ai_generated: true,
          status: 'script_ready',
          updated_at: new Date().toISOString(),
        };
        if (script) updateData.script_content = typeof script === 'string' ? script : JSON.stringify(script);
        if (scenes.length) updateData.scenes = scenes;
        
        await supabase.from('video_projects').update(updateData).eq('id', project.id);
        queryClient.invalidateQueries({ queryKey: ['video_projects'] });
        toast({ title: '✅ Script Generated!' });
      } else {
        await supabase.from('video_projects').update({ status: 'draft' }).eq('id', project.id);
        queryClient.invalidateQueries({ queryKey: ['video_projects'] });
        toast({ title: '⚠️ AI generation service unavailable', description: 'The AI engine could not process your request. Status reset to draft — you can retry.', variant: 'destructive' });
      }
    } catch (err: any) {
      await supabase.from('video_projects').update({ status: 'draft' }).eq('id', project.id);
      queryClient.invalidateQueries({ queryKey: ['video_projects'] });
      toast({ title: '⚠️ AI generation service unavailable', description: 'The AI engine could not process your request. You can retry.', variant: 'destructive' });
    } finally {
      setGeneratingScriptId(null);
    }
  };

  const getScriptText = (project: any): string => {
    if (!project) return '';
    const sc = project.script_content || project.script;
    if (!sc) return '';
    if (typeof sc === 'string') return sc;
    try { return JSON.stringify(sc, null, 2); } catch { return String(sc); }
  };

  const getScenes = (project: any): any[] => {
    if (!project?.scenes) return [];
    if (Array.isArray(project.scenes)) return project.scenes;
    try { return JSON.parse(project.scenes); } catch { return []; }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const downloadScript = (project: any) => {
    const text = getScriptText(project);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project.title || 'script'}.txt`; a.click();
  };

  const exportStoryboard = (project: any) => {
    const scenes = getScenes(project);
    const script = getScriptText(project);
    const html = `<!DOCTYPE html><html><head><title>${project.title} - Storyboard</title>
<style>body{font-family:system-ui;max-width:900px;margin:0 auto;padding:2rem}
.scene{border:1px solid #ddd;border-radius:8px;padding:1rem;margin:1rem 0;display:flex;gap:1rem}
.scene img{max-width:300px;border-radius:4px}h1{color:#333}h2{color:#666}</style></head>
<body><h1>${project.title}</h1><h2>Storyboard</h2>
${script ? `<div style="background:#f5f5f5;padding:1rem;border-radius:8px;margin-bottom:2rem;white-space:pre-wrap">${script}</div>` : ''}
${scenes.map((s: any, i: number) => `<div class="scene">
<div><h3>Scene ${i + 1}</h3><p>${s.description || s.content || ''}</p>
${s.dialogue ? `<p><em>"${s.dialogue}"</em></p>` : ''}
${s.visual_notes ? `<p style="color:#888">Visual: ${s.visual_notes}</p>` : ''}</div>
${s.image_url ? `<img src="${s.image_url}" alt="Scene ${i + 1}" />` : ''}</div>`).join('')}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project.title}-storyboard.html`; a.click();
    toast({ title: 'Storyboard exported!' });
  };

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
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Projects</h1>
          <p className="text-muted-foreground">AI-generated video scripts, scenes &amp; storyboards</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> New Video Project
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

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Video Projects Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">Create AI-powered video scripts with scene breakdowns and storyboards.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project: any) => {
            const vt = VIDEO_TYPE_LABELS[project.video_type] || { emoji: '🎬', label: project.video_type || 'Video' };
            const st = STATUS_CONFIG[project.status] || { label: project.status, variant: 'secondary' as const, spin: false };
            return (
              <Card key={project.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setDetailProject(project)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{project.title}</h3>
                      <Badge variant="outline" className="text-xs">{vt.emoji} {vt.label}</Badge>
                      {project.ai_generated && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> AI</Badge>}
                    </div>
                    {project.description && <p className="text-sm text-muted-foreground truncate mt-1">{project.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {project.created_at && <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Badge variant={st.variant}>
                      {st.spin && <Clock className="h-3 w-3 mr-1 animate-spin" />}{st.label}
                    </Badge>
                    <Button size="sm" variant="outline" disabled={generatingScriptId === project.id}
                      onClick={() => generateScript(project)}>
                      {generatingScriptId === project.id
                        ? <><Clock className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                        : <><Sparkles className="h-3 w-3 mr-1" /> AI Script</>}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this video project?')) deleteProject.mutate(project.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailProject} onOpenChange={() => setDetailProject(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailProject?.title}
              {detailProject?.video_type && (
                <Badge variant="outline">{VIDEO_TYPE_LABELS[detailProject.video_type]?.emoji} {VIDEO_TYPE_LABELS[detailProject.video_type]?.label}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="script" className="mt-2">
            <TabsList>
              <TabsTrigger value="script">Script</TabsTrigger>
              <TabsTrigger value="scenes">Scenes</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="space-y-3">
              {getScriptText(detailProject) ? (
                <>
                  <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm max-h-[50vh] overflow-auto font-mono">
                    {getScriptText(detailProject)}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(getScriptText(detailProject), 'Script')}>
                      <Copy className="h-3 w-3 mr-1" /> Copy Script
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadScript(detailProject)}>
                      <Download className="h-3 w-3 mr-1" /> Download .txt
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Film className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No script generated yet. Click "AI Script" to generate.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="scenes" className="space-y-3">
              {getScenes(detailProject).length > 0 ? (
                getScenes(detailProject).map((scene: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex gap-4">
                      {scene.image_url && (
                        <img src={scene.image_url} alt={`Scene ${i + 1}`} className="w-40 h-28 object-cover rounded-lg"
                          crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Scene {i + 1}</h4>
                        <p className="text-sm mt-1">{scene.description || scene.content || 'No description'}</p>
                        {scene.dialogue && <p className="text-sm italic text-muted-foreground mt-1">"{scene.dialogue}"</p>}
                        {scene.visual_notes && <p className="text-xs text-muted-foreground mt-1">🎨 {scene.visual_notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No scenes yet. Generate a script to create scene breakdowns.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" disabled={generatingScriptId === detailProject?.id}
                  onClick={() => { if (detailProject) generateScript(detailProject); }}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate Script
                </Button>
                <Button variant="outline" onClick={() => { if (detailProject) copyToClipboard(getScriptText(detailProject), 'Script'); }}
                  disabled={!getScriptText(detailProject)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Script
                </Button>
                <Button variant="outline" onClick={() => { if (detailProject) downloadScript(detailProject); }}
                  disabled={!getScriptText(detailProject)}>
                  <Download className="h-4 w-4 mr-2" /> Download Script
                </Button>
                <Button variant="outline" className="text-destructive border-destructive/50"
                  onClick={() => { if (detailProject && confirm('Permanently delete this project?')) deleteProject.mutate(detailProject.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                </Button>
                <Button variant="outline" onClick={() => { if (detailProject) exportStoryboard(detailProject); }}>
                  <Film className="h-4 w-4 mr-2" /> Export Storyboard
                </Button>
              </div>
              {detailProject?.description && (
                <div className="bg-muted/50 rounded p-3 text-sm">
                  <strong>Description:</strong> {detailProject.description}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Video Project</DialogTitle></DialogHeader>
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
                  <SelectItem value="short_form">📱 Short Form (Reels/TikTok)</SelectItem>
                  <SelectItem value="long_form">🎥 Long Form (YouTube)</SelectItem>
                  <SelectItem value="ad_commercial">📺 Ad / Commercial</SelectItem>
                  <SelectItem value="tutorial">📚 Tutorial</SelectItem>
                  <SelectItem value="testimonial">💬 Testimonial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createProject.mutate()} disabled={!title.trim() || createProject.isPending} className="marketing-gradient text-white">
              {createProject.isPending ? 'Creating...' : 'Create & Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
