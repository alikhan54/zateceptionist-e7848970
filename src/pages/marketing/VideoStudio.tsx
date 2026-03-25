import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Film, Play, Plus, Download, Clock, Layers, Smartphone, Monitor,
  Square, Image as ImageIcon, RefreshCw, Loader2, CheckCircle, XCircle,
  Sparkles, BarChart3, Zap, Eye, Instagram, Youtube, Share2, Music, Type,
} from "lucide-react";

const PLATFORM_PRESETS = [
  { name: "Instagram Reel", format: "9:16", duration: 15, icon: Instagram },
  { name: "TikTok", format: "9:16", duration: 15, icon: Smartphone },
  { name: "YouTube", format: "16:9", duration: 60, icon: Youtube },
  { name: "YouTube Short", format: "9:16", duration: 30, icon: Youtube },
  { name: "Instagram Post", format: "1:1", duration: 15, icon: Square },
  { name: "Facebook Ad", format: "4:5", duration: 15, icon: Monitor },
];

const VOICE_OPTIONS = [
  { value: "en-US-AriaNeural", label: "English (US) - Aria" },
  { value: "en-US-GuyNeural", label: "English (US) - Guy" },
  { value: "en-GB-SoniaNeural", label: "English (UK) - Sonia" },
  { value: "ar-AE-FatimaNeural", label: "Arabic (UAE) - Fatima" },
  { value: "ar-SA-ZariyahNeural", label: "Arabic (SA) - Zariyah" },
  { value: "ur-PK-UzmaNeural", label: "Urdu - Uzma" },
  { value: "hi-IN-SwaraNeural", label: "Hindi - Swara" },
  { value: "fr-FR-DeniseNeural", label: "French - Denise" },
  { value: "es-ES-ElviraNeural", label: "Spanish - Elvira" },
  { value: "de-DE-KatjaNeural", label: "German - Katja" },
  { value: "zh-CN-XiaoxiaoNeural", label: "Chinese - Xiaoxiao" },
  { value: "ja-JP-NanamiNeural", label: "Japanese - Nanami" },
];

const MUSIC_MOODS = [
  { value: "none", label: "No Music" },
  { value: "upbeat", label: "Upbeat & Energetic" },
  { value: "corporate", label: "Corporate & Professional" },
  { value: "emotional", label: "Emotional & Inspiring" },
  { value: "energetic", label: "High Energy" },
  { value: "calm", label: "Calm & Ambient" },
];

const TRANSITIONS = [
  { value: "fade", label: "Fade" },
  { value: "slideleft", label: "Slide Left" },
  { value: "slideright", label: "Slide Right" },
  { value: "wiperight", label: "Wipe Right" },
  { value: "dissolve", label: "Dissolve" },
  { value: "smoothleft", label: "Smooth Left" },
];

const FORMAT_ICONS: Record<string, typeof Smartphone> = {
  "9:16": Smartphone, "16:9": Monitor, "1:1": Square, "4:5": ImageIcon,
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-500", generating_images: "bg-blue-500 animate-pulse",
  generating_audio: "bg-purple-500 animate-pulse", assembling: "bg-orange-500 animate-pulse",
  complete: "bg-green-500", failed: "bg-red-500", draft: "bg-gray-400",
  script_ready: "bg-yellow-500", rendering: "bg-blue-500 animate-pulse",
};

export default function VideoStudio() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<"template" | "scratch">("template");
  const [newTitle, setNewTitle] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("9:16");
  const [videoTier, setVideoTier] = useState("standard");
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [sceneEdits, setSceneEdits] = useState<any[]>([]);
  const [musicMood, setMusicMood] = useState("none");
  const [templateFilter, setTemplateFilter] = useState("all");

  const tid = tenantConfig?.id;

  // === QUERIES ===

  const { data: templates = [] } = useQuery({
    queryKey: ["video-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("video_templates" as any).select("*")
        .eq("is_active", true).order("usage_count", { ascending: false });
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["video-projects-studio", tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data } = await supabase.from("video_projects" as any).select("*")
        .eq("tenant_id", tid).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!tid,
  });

  const { data: renderJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ["video-render-queue", tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data } = await supabase.from("video_render_queue" as any).select("*")
        .eq("tenant_id", tid).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!tid,
    refetchInterval: 5000,
  });

  // === MUTATIONS ===

  const createProject = useMutation({
    mutationFn: async (params: { title: string; scenes: any[]; format: string; voice: string; templateId?: string }) => {
      const { data, error } = await supabase.from("video_projects" as any).insert({
        tenant_id: tid,
        title: params.title,
        video_type: params.format === "9:16" ? "short_form" : "long_form",
        aspect_ratio: params.format,
        voice_style: params.voice,
        template_id: params.templateId || null,
        status: "draft",
        scenes: params.scenes,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Project Created!", description: "Edit scenes and render when ready." });
      queryClient.invalidateQueries({ queryKey: ["video-projects-studio"] });
      setSelectedProject(data);
      setShowCreateDialog(false);
      setActiveTab("projects");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateProject = useMutation({
    mutationFn: async (params: { id: string; scenes: any[] }) => {
      const { error } = await supabase.from("video_projects" as any)
        .update({ scenes: params.scenes, updated_at: new Date().toISOString() })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Scenes saved!" });
      queryClient.invalidateQueries({ queryKey: ["video-projects-studio"] });
    },
  });

  const startRender = useMutation({
    mutationFn: async (project: any) => {
      const scenes = typeof project.scenes === "string" ? JSON.parse(project.scenes) : project.scenes || [];
      const resp = await fetch("http://localhost:8125/render-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tid,
          project_id: project.id,
          scenes: scenes.map((s: any, i: number) => ({
            visual_description: s.visual_prompt || s.visual_description || s.description || `Scene ${i + 1}`,
            voiceover_text: s.voiceover || s.voiceover_text || s.narration || "",
            scene_number: i + 1,
          })),
          aspect_ratio: project.aspect_ratio || "9:16",
        }),
      });
      return resp.json();
    },
    onSuccess: (data) => {
      if (data.job_id) {
        toast({ title: "Render Started!", description: `Job queued. Check Render Queue tab.` });
        setActiveTab("queue");
        refetchJobs();
      }
    },
    onError: () => toast({ title: "Render Failed", variant: "destructive" }),
  });

  // === HELPERS ===

  const parseScenes = (t: any): any[] => {
    try {
      const s = t.scene_structure || t.scenes;
      return typeof s === "string" ? JSON.parse(s) : (s || []);
    } catch { return []; }
  };

  const filteredTemplates = templates.filter((t: any) =>
    templateFilter === "all" || t.template_type === templateFilter
  );

  const templateTypes = [...new Set(templates.map((t: any) => t.template_type))];

  const handleUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setCreateMode("template");
    setNewTitle(`${template.name} — ${new Date().toLocaleDateString()}`);
    setSelectedFormat(template.aspect_ratio || "9:16");
    setSceneEdits(parseScenes(template));
    setShowCreateDialog(true);
  };

  const handleCreateFromScratch = () => {
    setSelectedTemplate(null);
    setCreateMode("scratch");
    setNewTitle("");
    setSelectedFormat("9:16");
    setSceneEdits([
      { scene_number: 1, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" },
      { scene_number: 2, duration_s: 5, visual_prompt: "", voiceover: "", transition: "slide" },
      { scene_number: 3, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" },
    ]);
    setShowCreateDialog(true);
  };

  const handleCreateProject = () => {
    if (!newTitle.trim()) return;
    createProject.mutate({
      title: newTitle,
      scenes: sceneEdits,
      format: selectedFormat,
      voice: selectedVoice,
      templateId: selectedTemplate?.id,
    });
  };

  // === RENDER ===

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Film className="h-8 w-8 text-purple-500" />
            Video Studio
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered video production with local GPU inference</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateFromScratch}>
            <Plus className="h-4 w-4 mr-2" /> From Scratch
          </Button>
          <Button onClick={() => { setActiveTab("templates"); }}>
            <Sparkles className="h-4 w-4 mr-2" /> Use Template
          </Button>
        </div>
      </div>

      {/* Platform Presets */}
      <div className="flex gap-2 flex-wrap">
        {PLATFORM_PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <Button key={p.name} variant="outline" size="sm" className="gap-1.5"
              onClick={() => { setSelectedFormat(p.format); handleCreateFromScratch(); }}>
              <Icon className="h-3.5 w-3.5" /> {p.name}
            </Button>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="templates"><Layers className="h-4 w-4 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="projects"><Film className="h-4 w-4 mr-1" /> Projects</TabsTrigger>
          <TabsTrigger value="queue"><RefreshCw className="h-4 w-4 mr-1" /> Queue</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Stats</TabsTrigger>
        </TabsList>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={templateFilter === "all" ? "default" : "outline"}
              onClick={() => setTemplateFilter("all")}>All ({templates.length})</Button>
            {templateTypes.map((type: any) => (
              <Button key={type} size="sm" variant={templateFilter === type ? "default" : "outline"}
                onClick={() => setTemplateFilter(type)}>
                {type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((t: any) => {
              const scenes = parseScenes(t);
              const FormatIcon = FORMAT_ICONS[t.aspect_ratio] || Smartphone;
              return (
                <Card key={t.id} className="hover:border-purple-500/50 transition-colors cursor-pointer"
                  onClick={() => handleUseTemplate(t)}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                      <Play className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{t.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs gap-1">
                        <FormatIcon className="h-3 w-3" /> {t.aspect_ratio}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" /> {t.default_duration_seconds}s
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{scenes.length} scenes</Badge>
                    </div>
                    <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleUseTemplate(t); }}>
                      <Zap className="h-3 w-3 mr-1" /> Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects" className="space-y-4">
          {selectedProject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>← Back</Button>
                  <h2 className="text-xl font-bold mt-2">{selectedProject.title}</h2>
                  <div className="flex gap-2 mt-1">
                    <Badge className={STATUS_COLORS[selectedProject.status] || "bg-gray-500"}>{selectedProject.status}</Badge>
                    <Badge variant="outline">{selectedProject.aspect_ratio || "9:16"}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => updateProject.mutate({ id: selectedProject.id, scenes: sceneEdits })}>
                    Save Scenes
                  </Button>
                  <Button onClick={() => startRender.mutate(selectedProject)} disabled={startRender.isPending}>
                    {startRender.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Render Video
                  </Button>
                </div>
              </div>

              {/* Scene Editor */}
              <div className="space-y-3">
                {sceneEdits.map((scene: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Scene {i + 1} — Visual Description</Label>
                        <Textarea
                          value={scene.visual_prompt || scene.visual_description || ""}
                          onChange={(e) => {
                            const updated = [...sceneEdits];
                            updated[i] = { ...updated[i], visual_prompt: e.target.value };
                            setSceneEdits(updated);
                          }}
                          placeholder="Describe the visual for AI image generation..."
                          rows={3} className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Voiceover Text</Label>
                        <Textarea
                          value={scene.voiceover || scene.voiceover_text || ""}
                          onChange={(e) => {
                            const updated = [...sceneEdits];
                            updated[i] = { ...updated[i], voiceover: e.target.value };
                            setSceneEdits(updated);
                          }}
                          placeholder="Narration text for this scene..."
                          rows={3} className="text-sm"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-xs">Duration:</Label>
                          <Input type="number" className="w-16 h-7 text-xs" min={2} max={30}
                            value={scene.duration_s || 5}
                            onChange={(e) => {
                              const updated = [...sceneEdits];
                              updated[i] = { ...updated[i], duration_s: parseInt(e.target.value) || 5 };
                              setSceneEdits(updated);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">sec</span>
                          <Select value={scene.transition || "fade"} onValueChange={(v) => {
                            const updated = [...sceneEdits];
                            updated[i] = { ...updated[i], transition: v };
                            setSceneEdits(updated);
                          }}>
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TRANSITIONS.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="mt-2">
                          <Input
                            placeholder="On-screen text overlay (optional)"
                            className="text-xs h-7"
                            value={scene.overlay_text || ""}
                            onChange={(e) => {
                              const updated = [...sceneEdits];
                              updated[i] = { ...updated[i], overlay_text: e.target.value };
                              setSceneEdits(updated);
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={() => setSceneEdits([...sceneEdits, {
                  scene_number: sceneEdits.length + 1, duration_s: 5,
                  visual_prompt: "", voiceover: "", transition: "fade"
                }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Scene
                </Button>
              </div>

              {/* Timeline */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-1 h-8">
                    {sceneEdits.map((s: any, i: number) => {
                      const totalDur = sceneEdits.reduce((sum: number, sc: any) => sum + (sc.duration_s || 5), 0);
                      const pct = ((s.duration_s || 5) / totalDur) * 100;
                      const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500", "bg-yellow-500"];
                      return (
                        <div key={i} className={`${colors[i % colors.length]} rounded h-full flex items-center justify-center text-white text-xs font-medium`}
                          style={{ width: `${pct}%`, minWidth: "30px" }}>
                          S{i + 1}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Total: {sceneEdits.reduce((sum: number, s: any) => sum + (s.duration_s || 5), 0)}s — {sceneEdits.length} scenes
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p: any) => {
                const scenes = parseScenes(p);
                return (
                  <Card key={p.id} className="hover:border-purple-500/50 cursor-pointer"
                    onClick={() => { setSelectedProject(p); setSceneEdits(scenes); }}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm line-clamp-1">{p.title || "Untitled"}</h3>
                        <Badge className={STATUS_COLORS[p.status] || "bg-gray-500"} >{p.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{p.aspect_ratio || "9:16"}</Badge>
                        <Badge variant="outline" className="text-xs">{scenes.length} scenes</Badge>
                        {p.render_status === "complete" && <Badge className="bg-green-500 text-xs">Rendered</Badge>}
                      </div>
                      {p.video_url && (
                        <Button size="sm" variant="outline" className="w-full mt-2" asChild>
                          <a href={p.video_url} target="_blank" rel="noopener"><Download className="h-3 w-3 mr-1" /> Download</a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {projects.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No video projects yet. Start from a template or create from scratch.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* RENDER QUEUE TAB */}
        <TabsContent value="queue" className="space-y-4">
          {renderJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No render jobs. Start by rendering a video project.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {renderJobs.map((job: any) => (
                <Card key={job.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[job.status] || "bg-gray-500"}`} />
                        <div>
                          <p className="font-medium text-sm">{job.title || `Render ${job.id?.slice(0, 8)}`}</p>
                          <p className="text-xs text-muted-foreground">{job.status?.replace(/_/g, " ")} — {job.current_step || "queued"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.format && <Badge variant="outline" className="text-xs">{job.format}</Badge>}
                        {job.status === "complete" && job.result_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={job.result_url} target="_blank" rel="noopener"><Download className="h-3 w-3 mr-1" /> Download</a>
                          </Button>
                        )}
                      </div>
                    </div>
                    {job.status !== "complete" && job.status !== "failed" && (
                      <Progress value={job.progress || (job.scenes_complete / Math.max(job.scenes_total, 1)) * 100} className="mt-2 h-2" />
                    )}
                    {job.status === "failed" && job.error && (
                      <p className="text-xs text-red-500 mt-2">{job.error}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{projects.length}</p>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{projects.filter((p: any) => p.render_status === "complete").length}</p>
              <p className="text-sm text-muted-foreground">Videos Rendered</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{templates.length}</p>
              <p className="text-sm text-muted-foreground">Templates Available</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{renderJobs.filter((j: any) => j.status !== "complete" && j.status !== "failed").length}</p>
              <p className="text-sm text-muted-foreground">Active Renders</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Most Used Templates</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <Badge variant="outline">{t.usage_count || 0} uses</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE DIALOG */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createMode === "template" ? `New Video from: ${selectedTemplate?.name}` : "New Video from Scratch"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Video Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="My awesome video..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Format</Label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                    <SelectItem value="16:9">16:9 (Horizontal)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Voice (12 Languages)</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quality</Label>
                <Select value={videoTier} onValueChange={setVideoTier}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (Stock Photos)</SelectItem>
                    <SelectItem value="standard">Standard (AI Images)</SelectItem>
                    <SelectItem value="premium">Premium (AI Video)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Music Mood */}
            <div>
              <Label className="flex items-center gap-1"><Music className="h-3.5 w-3.5" /> Background Music</Label>
              <Select value={musicMood} onValueChange={setMusicMood}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSIC_MOODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scene Preview */}
            <div className="space-y-2">
              <Label>Scenes ({sceneEdits.length})</Label>
              {sceneEdits.map((s: any, i: number) => (
                <Card key={i} className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-medium mb-1">Scene {i + 1} Visual</p>
                      <Textarea className="text-xs" rows={2}
                        value={s.visual_prompt || ""}
                        onChange={(e) => {
                          const u = [...sceneEdits];
                          u[i] = { ...u[i], visual_prompt: e.target.value };
                          setSceneEdits(u);
                        }}
                        placeholder="Visual description..."
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Voiceover</p>
                      <Textarea className="text-xs" rows={2}
                        value={s.voiceover || ""}
                        onChange={(e) => {
                          const u = [...sceneEdits];
                          u[i] = { ...u[i], voiceover: e.target.value };
                          setSceneEdits(u);
                        }}
                        placeholder="Narration..."
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button className="w-full" onClick={handleCreateProject} disabled={createProject.isPending || !newTitle.trim()}>
              {createProject.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Video Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
