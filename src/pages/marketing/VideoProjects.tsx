import { useState, useEffect } from 'react';
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
import { Plus, Video, Film, Clock, CheckCircle, Sparkles, Copy, Download, RefreshCw, Image, Trash2, Target, Eye, Heart, Zap, Users, Play, Presentation, Loader2, Recycle } from 'lucide-react';
import { RepurposeDialog } from '@/components/marketing/RepurposeDialog';
import { syncToCalendar } from '@/utils/calendarSync';
import { formatDistanceToNow } from 'date-fns';
import VideoPlayer from '@/components/video/VideoPlayer';

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
  const [videoTier, setVideoTier] = useState('standard');
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [pageTab, setPageTab] = useState('projects');
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [repurposeProject, setRepurposeProject] = useState<any>(null);

  // Track video view when detail dialog opens (AIDA retargeting)
  useEffect(() => {
    if (detailProject?.id && tenantConfig?.id) {
      callWebhook(WEBHOOKS.VIDEO_TRACK_VIEW, {
        video_project_id: detailProject.id,
        tenant_id: tenantConfig.id,
        watch_percentage: 0.25,
        platform: 'dashboard',
        viewer_identifier: 'dashboard_user',
      }, tenantConfig.id).catch(() => {});
    }
  }, [detailProject?.id]);

  const { data: aidaAudiences = [], refetch: refetchAida } = useQuery({
    queryKey: ['aida_audiences', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('video_retargeting_audiences')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('aida_stage');
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: aidaViews = [], refetch: refetchViews } = useQuery({
    queryKey: ['aida_views', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('video_view_tracking')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('last_viewed_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const refreshAidaSegments = async () => {
    if (!tenantConfig?.id) return;
    setIsClassifying(true);
    try {
      const result = await callWebhook(WEBHOOKS.AIDA_CLASSIFY, {}, tenantConfig.id);
      if (result.success) {
        toast({ title: 'AIDA segments refreshed!' });
        refetchAida();
        refetchViews();
      } else {
        toast({ title: 'Classification failed', description: String(result.error), variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsClassifying(false);
    }
  };

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
      const { error } = await supabase.from('video_projects').delete().eq('id', projectId).eq('tenant_id', tenantConfig!.id);
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
      await supabase.from('video_projects').update({ status: 'generating' }).eq('id', project.id).eq('tenant_id', tenantConfig!.id);
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
        
        await supabase.from('video_projects').update(updateData).eq('id', project.id).eq('tenant_id', tenantConfig!.id);
        queryClient.invalidateQueries({ queryKey: ['video_projects'] });
        toast({ title: '✅ Script Generated!' });
      } else {
        await supabase.from('video_projects').update({ status: 'draft' }).eq('id', project.id).eq('tenant_id', tenantConfig!.id);
        queryClient.invalidateQueries({ queryKey: ['video_projects'] });
        toast({ title: '⚠️ AI generation service unavailable', description: 'The AI engine could not process your request. Status reset to draft — you can retry.', variant: 'destructive' });
      }
    } catch (err: any) {
      await supabase.from('video_projects').update({ status: 'draft' }).eq('id', project.id).eq('tenant_id', tenantConfig!.id);
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

  const exportPresentation = (project: any) => {
    const scenes = getScenes(project);
    if (!scenes.length) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.title} - Presentation</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;font-family:system-ui;color:#fff;overflow:hidden}
.slide{position:absolute;inset:0;opacity:0;transition:opacity 1s ease-in-out;display:flex;align-items:center;justify-content:center}
.slide.active{opacity:1}
.slide img{width:100%;height:100%;object-fit:cover}
.slide .placeholder{width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;align-items:center;justify-content:center;font-size:2rem;color:#444}
.overlay-top{position:absolute;top:0;left:0;right:0;padding:1.5rem 2rem;background:linear-gradient(to bottom,rgba(0,0,0,0.7),transparent);z-index:2}
.overlay-bottom{position:absolute;bottom:4rem;left:0;right:0;padding:0 3rem;z-index:2;text-align:center}
.subtitle{background:rgba(0,0,0,0.75);display:inline-block;padding:0.75rem 1.5rem;border-radius:8px;font-size:1.1rem;line-height:1.6;max-width:800px}
.controls{position:absolute;bottom:0;left:0;right:0;padding:0.75rem 2rem;background:rgba(0,0,0,0.8);display:flex;align-items:center;gap:1rem;z-index:3}
.controls button{background:none;border:none;color:#fff;cursor:pointer;font-size:1.2rem;padding:0.25rem 0.5rem}
.controls button:hover{color:#3b82f6}
.progress{flex:1;height:4px;background:#333;border-radius:2px;cursor:pointer}
.progress-fill{height:100%;background:#3b82f6;border-radius:2px;transition:width 0.3s}
.scene-counter{font-size:0.85rem;color:#aaa;min-width:60px;text-align:right}
</style></head><body>
${scenes.map((s: any, i: number) => `<div class="slide" id="s${i}">
${s.image_url ? `<img src="${s.image_url}" alt="Scene ${i+1}" crossorigin="anonymous" onerror="this.outerHTML='<div class=placeholder>Scene ${i+1}</div>'">` : `<div class="placeholder">Scene ${i+1}</div>`}
<div class="overlay-top"><strong>${project.title}</strong>${s.text_overlay ? `<br><span style="font-size:0.9rem;opacity:0.8">${s.text_overlay}</span>` : ''}</div>
${s.dialogue ? `<div class="overlay-bottom"><span class="subtitle">${s.dialogue}</span></div>` : ''}
</div>`).join('\n')}
<div class="controls">
<button onclick="prev()">&#9664;&#9664;</button>
<button id="playBtn" onclick="toggle()">&#9654;</button>
<button onclick="next()">&#9654;&#9654;</button>
<div class="progress" onclick="seekClick(event)"><div class="progress-fill" id="bar"></div></div>
<span class="scene-counter" id="counter">1/${scenes.length}</span>
</div>
<script>
var cur=0,total=${scenes.length},playing=false,timer=null;
var durations=[${scenes.map((s: any) => (s.duration_seconds||5)*1000).join(',')}];
function show(i){document.querySelectorAll('.slide').forEach(function(s,j){s.classList.toggle('active',j===i)});document.getElementById('counter').textContent=(i+1)+'/'+total;updateBar()}
function updateBar(){var elapsed=0;for(var i=0;i<cur;i++)elapsed+=durations[i];document.getElementById('bar').style.width=(elapsed/durations.reduce(function(a,b){return a+b},0)*100)+'%'}
function next(){cur=Math.min(cur+1,total-1);show(cur);if(playing)startTimer()}
function prev(){cur=Math.max(cur-1,0);show(cur);if(playing)startTimer()}
function toggle(){playing=!playing;document.getElementById('playBtn').textContent=playing?'\\u23F8':'\\u25B6';if(playing)startTimer();else clearTimeout(timer)}
function startTimer(){clearTimeout(timer);timer=setTimeout(function(){if(cur<total-1){cur++;show(cur);startTimer()}else{playing=false;document.getElementById('playBtn').textContent='\\u25B6'}},durations[cur])}
function seekClick(e){var r=e.target.getBoundingClientRect();var p=(e.clientX-r.left)/r.width;var acc=0,t=durations.reduce(function(a,b){return a+b},0);for(var i=0;i<total;i++){acc+=durations[i];if(acc/t>=p){cur=i;show(cur);break}}}
show(0);
</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project.title}-presentation.html`; a.click();
    toast({ title: 'Presentation exported! Open the HTML file in any browser.' });
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

  const AIDA_STAGE_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string; description: string }> = {
    attention: { icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', label: 'Attention', description: '0-25% watched' },
    interest: { icon: Zap, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', label: 'Interest', description: '25-50% watched' },
    desire: { icon: Heart, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', label: 'Desire', description: '50-75% watched' },
    action: { icon: Target, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Action', description: '75%+ or CTA clicked' },
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Projects</h1>
          <p className="text-muted-foreground">AI-generated video scripts, scenes &amp; storyboards</p>
        </div>
        <div className="flex gap-2">
          {pageTab === 'aida' && (
            <Button variant="outline" onClick={refreshAidaSegments} disabled={isClassifying}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isClassifying ? 'animate-spin' : ''}`} />
              {isClassifying ? 'Classifying...' : 'Refresh Segments'}
            </Button>
          )}
          <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
            <Plus className="h-4 w-4 mr-2" /> New Video Project
          </Button>
        </div>
      </div>

      <Tabs value={pageTab} onValueChange={setPageTab}>
        <TabsList>
          <TabsTrigger value="projects"><Video className="h-4 w-4 mr-1" /> Projects</TabsTrigger>
          <TabsTrigger value="aida"><Target className="h-4 w-4 mr-1" /> AIDA Retargeting</TabsTrigger>
        </TabsList>

        <TabsContent value="aida" className="space-y-6 mt-4">
          {/* AIDA Funnel Visualization */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['attention', 'interest', 'desire', 'action'] as const).map((stage) => {
              const config = AIDA_STAGE_CONFIG[stage];
              const audience = aidaAudiences.find((a: any) => a.aida_stage === stage);
              const stageViews = aidaViews.filter((v: any) => v.aida_stage === stage);
              const Icon = config.icon;
              return (
                <Card key={stage} className={`border-2 ${config.bgColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <h3 className={`font-bold ${config.color}`}>{config.label}</h3>
                    </div>
                    <p className="text-3xl font-bold">{audience?.member_count || 0}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                    {audience?.retargeting_action && (
                      <p className="text-xs mt-2 italic text-muted-foreground">{audience.retargeting_action}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Viewer Table */}
          {aidaViews.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Viewer Engagement ({aidaViews.length})
                </h3>
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b sticky top-0 bg-background">
                      <tr>
                        <th className="text-left p-2">Viewer</th>
                        <th className="text-left p-2">Platform</th>
                        <th className="text-right p-2">Watch %</th>
                        <th className="text-center p-2">CTA</th>
                        <th className="text-center p-2">Stage</th>
                        <th className="text-right p-2">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aidaViews.map((view: any) => {
                        const stageConf = AIDA_STAGE_CONFIG[view.aida_stage] || AIDA_STAGE_CONFIG.attention;
                        return (
                          <tr key={view.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="font-medium">{view.viewer_email || view.viewer_id}</div>
                              {view.viewer_phone && <div className="text-xs text-muted-foreground">{view.viewer_phone}</div>}
                            </td>
                            <td className="p-2 capitalize">{view.platform}</td>
                            <td className="p-2 text-right font-mono">{Number(view.watch_percentage).toFixed(0)}%</td>
                            <td className="p-2 text-center">{view.cta_clicked ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : '-'}</td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className={`text-xs ${stageConf.color}`}>{stageConf.label}</Badge>
                            </td>
                            <td className="p-2 text-right">{view.total_views}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Viewer Data Yet</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
                  Video view tracking data will appear here as viewers watch your content.
                  Click "Refresh Segments" to classify existing viewers into AIDA stages.
                </p>
                <Button onClick={refreshAidaSegments} disabled={isClassifying} className="mt-4" variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isClassifying ? 'animate-spin' : ''}`} />
                  Refresh Segments
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6 mt-4">
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
                      {project.render_status === 'complete' && <Badge className="bg-green-600 text-white text-xs">🎬 MP4</Badge>}
                      {project.render_status === 'rendering' && <Badge className="bg-yellow-600 text-white text-xs animate-pulse">⏳ Rendering</Badge>}
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
                    <Button size="sm" variant="ghost" title="Repurpose"
                      onClick={(e) => { e.stopPropagation(); setRepurposeProject(project); }}>
                      <Recycle className="h-3 w-3" />
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
        </TabsContent>
      </Tabs>

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
              {/* Render Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                {detailProject?.render_status === 'complete' && detailProject?.video_url && (
                  <Badge className="bg-green-600 text-white">✅ Video Ready</Badge>
                )}
                {detailProject?.render_status === 'rendering' && (
                  <Badge className="bg-yellow-600 text-white animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Rendering...</Badge>
                )}
                {detailProject?.render_status === 'failed' && (
                  <Badge className="bg-red-600 text-white">❌ Render Failed</Badge>
                )}
                {(!detailProject?.render_status || detailProject?.render_status === 'none') && detailProject?.status === 'script_ready' && (
                  <Badge className="bg-blue-600 text-white">📝 Script Ready (No Video Yet)</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="marketing-gradient text-white col-span-2"
                  disabled={getScenes(detailProject).length === 0 && !detailProject?.video_url}
                  onClick={() => setIsPlayerOpen(true)}
                >
                  <Play className="h-4 w-4 mr-2" /> Preview Video
                </Button>

                {/* Video Quality Tier Selector */}
                {detailProject?.status !== 'draft' && detailProject?.render_status !== 'complete' && detailProject?.render_status !== 'rendering' && (
                  <div className="col-span-2">
                    <Select value={videoTier} onValueChange={setVideoTier}>
                      <SelectTrigger className="mb-2">
                        <SelectValue placeholder="Select video quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free — Stock photos + slideshow</SelectItem>
                        <SelectItem value="standard">Standard — AI-generated images</SelectItem>
                        <SelectItem value="premium" disabled>Premium — AI video clips (coming soon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Render Video button — for projects with script but no video */}
                {detailProject?.status !== 'draft' && detailProject?.render_status !== 'complete' && detailProject?.render_status !== 'rendering' && (
                  <Button
                    variant="outline"
                    className="col-span-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => {
                      if (!tenantConfig?.id || !detailProject) return;
                      if (videoTier === 'free') {
                        callWebhook(WEBHOOKS.VIDEO_GENERATE, {
                          project_id: detailProject.id,
                          title: detailProject.title,
                          description: detailProject.description || '',
                          video_type: detailProject.video_type || 'short_form',
                          company_name: tenantConfig?.company_name || 'Your Company',
                          industry: (tenantConfig as any)?.industry || 'technology',
                        }, tenantConfig.id);
                        toast({ title: 'Rendering Video', description: 'Free tier: Stock photos + slideshow. 60-90 seconds.' });
                        syncToCalendar({
                          tenantId: tenantConfig?.id || '',
                          title: detailProject?.title || 'Video',
                          contentType: 'video',
                          status: 'published',
                          publishedAt: new Date().toISOString(),
                          platform: 'video',
                          contentId: detailProject?.id,
                        });
                      } else {
                        callWebhook(WEBHOOKS.VIDEO_GENERATE, {
                          project_id: detailProject.id,
                          tier: videoTier,
                          aspect_ratio: '9:16',
                        }, tenantConfig.id);
                        toast({ title: 'Generating AI Video', description: 'Standard tier: AI-generated images. This may take 2-3 minutes.' });
                        syncToCalendar({
                          tenantId: tenantConfig?.id || '',
                          title: detailProject?.title || 'Video',
                          contentType: 'video',
                          status: 'published',
                          publishedAt: new Date().toISOString(),
                          platform: 'video',
                          contentId: detailProject?.id,
                        });
                      }
                    }}
                  >
                    <Film className="h-4 w-4 mr-2" /> {videoTier === 'free' ? 'Render Video (MP4)' : 'Generate AI Video'}
                  </Button>
                )}

                {/* Download MP4 button */}
                {detailProject?.video_url && (
                  <a href={detailProject.video_url} download target="_blank" rel="noopener noreferrer" className="col-span-2">
                    <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                      <Download className="h-4 w-4 mr-2" /> Download MP4
                    </Button>
                  </a>
                )}

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
                <Button variant="outline" onClick={() => { if (detailProject) exportPresentation(detailProject); }}
                  disabled={getScenes(detailProject).length === 0}>
                  <Presentation className="h-4 w-4 mr-2" /> Export Presentation
                </Button>
                <Button variant="outline" onClick={() => { if (detailProject) exportStoryboard(detailProject); }}>
                  <Film className="h-4 w-4 mr-2" /> Export Storyboard
                </Button>
                <Button variant="outline" className="text-destructive border-destructive/50"
                  onClick={() => { if (detailProject && confirm('Permanently delete this project?')) deleteProject.mutate(detailProject.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Project
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

      {/* Video Player Dialog */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black border-none overflow-hidden [&>button]:text-white [&>button]:hover:bg-white/20">
          {detailProject?.video_url && detailProject?.render_status === 'complete' ? (
            /* Native MP4 player for rendered videos */
            <div className="w-full max-h-[85vh] bg-black flex items-center justify-center p-2">
              <video
                controls
                autoPlay
                className="w-full max-h-[80vh] object-contain rounded-lg"
                src={detailProject.video_url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : getScenes(detailProject).length > 0 ? (
            /* Slideshow fallback for scenes without rendered video */
            <VideoPlayer
              scenes={getScenes(detailProject).map((s: any, i: number) => ({
                scene_number: s.scene_number || i + 1,
                description: s.description || s.visual_description || '',
                dialogue: s.dialogue || s.voiceover_text || '',
                visual_notes: s.visual_notes || s.visual_description || '',
                duration_seconds: s.duration_seconds || 5,
                image_url: s.image_url || null,
                voice: s.voice || null,
                text_overlay: s.text_overlay || '',
                image_source: s.image_source || 'unknown',
              }))}
              title={detailProject?.title || ''}
              aspectRatio={detailProject?.aspect_ratio || '16:9'}
              onClose={() => setIsPlayerOpen(false)}
            />
          ) : (
            /* No content */
            <div className="flex items-center justify-center h-64 text-white/60">
              <p>No video content available. Generate a script first.</p>
            </div>
          )}
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

      {repurposeProject && (
        <RepurposeDialog
          open={!!repurposeProject}
          onOpenChange={(v) => { if (!v) setRepurposeProject(null); }}
          sourceType="video_project"
          sourceId={repurposeProject.id}
          sourceTitle={repurposeProject.title || "Video Project"}
        />
      )}
    </div>
  );
}
