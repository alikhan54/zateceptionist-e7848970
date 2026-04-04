import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, callWebhook, WEBHOOKS } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Film, Play, Plus, Download, Clock, Layers, Smartphone, Monitor,
  Square, Image as ImageIcon, RefreshCw, Loader2, Sparkles, BarChart3,
  Zap, Instagram, Youtube, Share2, Music, Trash2, Wand2, Mic, ArrowLeft,
  FileText, Shield, Send, Bot, Eye, Heart, CheckCircle, Users, Target,
} from "lucide-react";

// ============================================================
// CONSTANTS
// ============================================================

const VOICE_OPTIONS = [
  { value: "en-US-AriaNeural", label: "Aria (EN-US)" },
  { value: "en-US-GuyNeural", label: "Guy (EN-US)" },
  { value: "en-GB-SoniaNeural", label: "Sonia (EN-UK)" },
  { value: "ar-AE-FatimaNeural", label: "Fatima (AR)" },
  { value: "ar-SA-ZariyahNeural", label: "Zariyah (AR)" },
  { value: "ur-PK-UzmaNeural", label: "Uzma (UR)" },
  { value: "hi-IN-SwaraNeural", label: "Swara (HI)" },
  { value: "fr-FR-DeniseNeural", label: "Denise (FR)" },
  { value: "es-ES-ElviraNeural", label: "Elvira (ES)" },
  { value: "de-DE-KatjaNeural", label: "Katja (DE)" },
  { value: "zh-CN-XiaoxiaoNeural", label: "Xiaoxiao (ZH)" },
  { value: "ja-JP-NanamiNeural", label: "Nanami (JA)" },
];

const TRANSITIONS = [
  { value: "fade", label: "Fade" },
  { value: "slideleft", label: "Slide Left" },
  { value: "slideright", label: "Slide Right" },
  { value: "wiperight", label: "Wipe Right" },
  { value: "dissolve", label: "Dissolve" },
  { value: "smoothleft", label: "Smooth" },
];

const PLATFORMS: Record<string, { format: string; min: number; max: number; def: number; label: string }> = {
  instagram_reel: { format: "9:16", min: 10, max: 60, def: 15, label: "Reel" },
  tiktok: { format: "9:16", min: 10, max: 60, def: 15, label: "TikTok" },
  youtube_short: { format: "9:16", min: 15, max: 60, def: 30, label: "YT Short" },
  youtube: { format: "16:9", min: 30, max: 300, def: 60, label: "YouTube" },
  instagram_post: { format: "1:1", min: 10, max: 30, def: 15, label: "IG Post" },
  story: { format: "9:16", min: 5, max: 15, def: 10, label: "Story" },
  facebook_ad: { format: "4:5", min: 10, max: 30, def: 15, label: "FB Ad" },
  linkedin: { format: "16:9", min: 15, max: 120, def: 30, label: "LinkedIn" },
};

const TEMPLATE_COLORS: Record<string, string> = {
  social_short: "from-pink-600 to-purple-600",
  ad_commercial: "from-orange-600 to-red-600",
  tutorial: "from-blue-600 to-cyan-600",
  explainer: "from-green-600 to-teal-600",
  testimonial: "from-yellow-600 to-orange-600",
  product_demo: "from-indigo-600 to-purple-600",
  blog_recap: "from-violet-600 to-pink-600",
  announcement: "from-emerald-600 to-green-600",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-500" },
  script_ready: { label: "Script Ready", color: "bg-yellow-500" },
  queued: { label: "Queued", color: "bg-gray-500" },
  generating_images: { label: "Creating visuals...", color: "bg-blue-500 animate-pulse" },
  generating_audio: { label: "Recording audio...", color: "bg-purple-500 animate-pulse" },
  assembling: { label: "Assembling...", color: "bg-orange-500 animate-pulse" },
  rendering: { label: "Rendering...", color: "bg-blue-500 animate-pulse" },
  complete: { label: "Complete", color: "bg-green-500" },
  failed: { label: "Failed", color: "bg-red-500" },
};

// ============================================================
// COMPONENT
// ============================================================

export default function VideoStudio() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tid = tenantConfig?.id;

  // UI state
  const [tab, setTab] = useState("templates");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedScene, setSelectedScene] = useState(0);
  const [sceneEdits, setSceneEdits] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("all");

  // AI prompt bar state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPlatform, setAiPlatform] = useState("instagram_reel");
  const [aiDuration, setAiDuration] = useState(15);
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [videoTier, setVideoTier] = useState("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");

  // Create dialog state
  const [newTitle, setNewTitle] = useState("");
  const [createFormat, setCreateFormat] = useState("9:16");

  // Trigger modal state (Fix 2)
  const [triggerModal, setTriggerModal] = useState<string | null>(null);
  const [triggerInput, setTriggerInput] = useState("");

  // Render quality state (Fix 3)
  const [renderQuality, setRenderQuality] = useState("standard");

  // Cloud video provider state
  const [videoProvider, setVideoProvider] = useState("local"); // "local" | "cloud"
  const [cloudProvider, setCloudProvider] = useState("fal");   // "fal" | "replicate"
  const [cloudModel, setCloudModel] = useState("");
  const [scriptEngine, setScriptEngine] = useState("ollama");  // "ollama" | "gemini"

  // ============================================================
  // QUERIES
  // ============================================================

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

  const { data: renderJobs = [] } = useQuery({
    queryKey: ["video-render-queue", tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data } = await supabase.from("video_render_queue" as any)
        .select("*, video_projects!video_render_queue_project_id_fkey(title, video_url, thumbnail_url)")
        .eq("tenant_id", tid).order("created_at", { ascending: false }).limit(20);
      // Flatten the joined video_projects data for easier access
      return (data || []).map((row: any) => ({
        ...row,
        project_title: row.video_projects?.title || null,
        result_url: row.output_url || row.video_projects?.video_url || null,
      }));
    },
    enabled: !!tid,
    refetchInterval: 5000,
  });

  // AIDA Viewer Intelligence queries
  const { data: aidaAudiences = [] } = useQuery({
    queryKey: ["aida-audiences", tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data } = await supabase.from("video_retargeting_audiences" as any)
        .select("*").eq("tenant_id", tid).order("aida_stage");
      return data || [];
    },
    enabled: !!tid,
  });

  const { data: aidaViews = [] } = useQuery({
    queryKey: ["aida-views", tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data } = await supabase.from("video_view_tracking" as any)
        .select("*").eq("tenant_id", tid)
        .order("last_viewed_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!tid,
  });

  const AIDA_STAGES = {
    attention: { icon: Eye, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Attention", desc: "0-25% watched" },
    interest: { icon: Zap, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Interest", desc: "25-50% watched" },
    desire: { icon: Heart, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Desire", desc: "50-75% watched" },
    action: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Action", desc: "75%+ watched" },
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createProject = useMutation({
    mutationFn: async (p: { title: string; scenes: any[]; format: string; templateId?: string }) => {
      const { data, error } = await supabase.from("video_projects" as any).insert({
        tenant_id: tid, title: p.title,
        video_type: p.format === "9:16" ? "short_form" : "long_form",
        aspect_ratio: p.format, voice_style: selectedVoice,
        template_id: p.templateId || null, status: "draft", scenes: p.scenes,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Project Created!" });
      refreshProjects();
      openProject(data);
      setShowCreate(false);
    },
  });

  const updateScenes = useMutation({
    mutationFn: async (p: { id: string; scenes: any[] }) => {
      const { error } = await supabase.from("video_projects" as any)
        .update({ scenes: p.scenes, updated_at: new Date().toISOString() }).eq("id", p.id).eq("tenant_id", tid);
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Scenes saved!" }),
  });

  const startRender = useMutation({
    mutationFn: async (project: any) => {
      const scenes = typeof project.scenes === "string" ? JSON.parse(project.scenes) : project.scenes || [];
      const result = await callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, {
        trigger_type: "manual_render",
        content: project.title || "Video render",
        project_id: project.id,
        priority: renderQuality === "premium" ? "high" : "standard",
        quality_tier: renderQuality,
        cloud_provider: videoProvider === "cloud" ? cloudProvider : "",
        cloud_model: videoProvider === "cloud" ? (cloudModel || "fal-ai/kling-video/v2/master") : "",
        script_engine: scriptEngine,
      }, tid!);
      return result.data || result;
    },
    onSuccess: (data) => {
      if ((data as any).job_id) {
        toast({ title: "Render Started!", description: "Check Queue tab for progress." });
        setTab("queue");
        // AEO: Auto-score video content for AI engine optimization
        fetch("https://webhooks.zatesystems.com/webhook/aeo/optimize-content", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tenantConfig?.id, content_type: "video", title: selectedProject?.title || "Video", content: selectedProject?.description || "" }),
        }).catch(() => {});
      }
    },
  });

  // Queue delete mutations (Fix 1)
  const deleteQueueItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("video_render_queue" as any).delete().eq("id", id).eq("tenant_id", tid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-render-queue"] });
      toast({ title: "Render cleared" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      // Delete associated render queue rows first
      await supabase.from("video_render_queue" as any).delete().eq("project_id", id).eq("tenant_id", tid);
      // Delete the project (tenant_id guard prevents cross-tenant deletion)
      await supabase.from("video_projects" as any).delete().eq("id", id).eq("tenant_id", tid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-projects-studio"] });
      qc.invalidateQueries({ queryKey: ["video-render-queue"] });
      toast({ title: "Video deleted" });
      setSelectedProject(null);
    },
  });

  const clearCompleted = useMutation({
    mutationFn: async () => {
      await supabase.from("video_render_queue" as any).delete().eq("tenant_id", tid).in("status", ["completed", "complete", "failed"]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-render-queue"] });
      toast({ title: "Cleared completed renders" });
    },
  });

  // ============================================================
  // HELPERS
  // ============================================================

  const refreshProjects = () => {
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["video-projects-studio"] });
      qc.refetchQueries({ queryKey: ["video-projects-studio", tid] });
    }, 1500);
  };

  const parseScenes = (item: any): any[] => {
    try {
      const s = item.scene_structure || item.scenes;
      return typeof s === "string" ? JSON.parse(s) : (s || []);
    } catch { return []; }
  };

  const openProject = (p: any) => {
    setSelectedProject(p);
    setSceneEdits(parseScenes(p));
    setSelectedScene(0);
    setTab("projects");
  };

  const updateScene = (idx: number, patch: any) => {
    const updated = [...sceneEdits];
    updated[idx] = { ...updated[idx], ...patch };
    setSceneEdits(updated);
  };

  const addScene = () => {
    setSceneEdits([...sceneEdits, {
      scene_number: sceneEdits.length + 1, duration_s: 5,
      visual_prompt: "", voiceover: "", transition: "fade",
    }]);
  };

  const removeScene = (idx: number) => {
    if (sceneEdits.length <= 1) return;
    setSceneEdits(sceneEdits.filter((_, i) => i !== idx));
    if (selectedScene >= sceneEdits.length - 1) setSelectedScene(Math.max(0, sceneEdits.length - 2));
  };

  // ============================================================
  // AI GENERATION
  // ============================================================

  const generateVideoAI = async () => {
    if (!aiPrompt.trim() || !tid) return;
    setIsGenerating(true);
    const platform = PLATFORMS[aiPlatform] || PLATFORMS.instagram_reel;
    const sceneCount = Math.max(2, Math.min(8, Math.ceil(aiDuration / 5)));

    try {
      setGenStep("Loading brand voice...");
      let brandVoice = "";
      try {
        const { data: bv } = await supabase.from("brand_voice_profiles" as any)
          .select("generated_system_prompt, brand_name").eq("tenant_id", tid).single();
        if (bv) brandVoice = bv.generated_system_prompt || bv.brand_name || "";
      } catch {}

      setGenStep("AI is writing your video script...");
      const webhookResult = await callWebhook(WEBHOOKS.VIDEO_AUTO_CREATE, {
        trigger_type: "manual_prompt",
        source_data: {
          prompt: aiPrompt, platform: aiPlatform, format: platform.format,
          duration_seconds: aiDuration, scene_count: sceneCount, brand_voice: brandVoice,
          quality_tier: videoTier,
          priority: videoTier === "premium" ? "high" : "standard",
        },
      }, tid!);
      const result = webhookResult.data as any || webhookResult;

      if (result?.success && result?.project_id) {
        toast({ title: "AI Video Created!", description: "Now rendering your video..." });
        // Auto-trigger render so user doesn't have to click Render separately
        callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, {
          trigger_type: "manual_render",
          content: aiPrompt || result.title || "Video render",
          project_id: result.project_id,
          priority: videoTier === "premium" ? "high" : "standard",
          quality_tier: videoTier,
          cloud_provider: videoProvider === "cloud" ? cloudProvider : "",
          cloud_model: videoProvider === "cloud" ? (cloudModel || "fal-ai/kling-video/v2/master") : "",
          script_engine: scriptEngine,
        }, tid!).catch(() => {});
        setTab("queue");
        refreshProjects();
        setAiPrompt("");
      } else {
        setGenStep("Creating locally...");
        const scenes = buildFallbackScenes(aiPrompt, sceneCount);
        const { data: project } = await supabase.from("video_projects" as any).insert({
          tenant_id: tid, title: aiPrompt.substring(0, 100),
          video_type: platform.format === "16:9" ? "long_form" : "short_form",
          status: "script_ready", scenes: scenes, voice_style: selectedVoice,
        }).select().single();
        if (project) {
          toast({ title: "Video Created!" });
          refreshProjects();
          setTab("projects");
          setAiPrompt("");
        }
      }
    } catch (err) {
      toast({ title: "Generation Failed", description: String(err), variant: "destructive" });
    }
    setIsGenerating(false);
    setGenStep("");
  };

  const buildFallbackScenes = (prompt: string, count: number) => {
    const dur = Math.ceil(aiDuration / count);
    const roles = ["hook", "problem", "solution", "benefit", "proof", "cta"];
    const vos = ["Discover this.", "The challenge.", "The solution.", "The result.", "Join thousands.", "Start today."];
    return Array.from({ length: count }, (_, i) => ({
      scene_number: i + 1,
      visual_description: `${prompt}, ${roles[i % roles.length]} scene, professional cinematic`,
      voiceover_text: vos[i % vos.length],
      duration_s: dur,
      transition: i === 0 || i === count - 1 ? "fade" : "dissolve",
    }));
  };

  const triggerAutoCreate = async (triggerType: string, sourceData: any) => {
    try {
      const webhookResult = await callWebhook(WEBHOOKS.VIDEO_AUTO_CREATE, {
        trigger_type: triggerType,
        source_data: {
          ...sourceData,
          quality_tier: renderQuality,
          priority: renderQuality === "premium" ? "high" : "standard",
        },
      }, tid!);
      const result = webhookResult.data as any || webhookResult;
      if (result?.success && result?.project_id) {
        toast({ title: "Video Created!", description: "Now rendering your video..." });
        // Auto-trigger render so user doesn't have to click Render separately
        callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, {
          trigger_type: "manual_render",
          content: sourceData?.content || result.title || "Video render",
          project_id: result.project_id,
          priority: renderQuality === "premium" ? "high" : "standard",
          quality_tier: renderQuality,
          cloud_provider: videoProvider === "cloud" ? cloudProvider : "",
          cloud_model: videoProvider === "cloud" ? (cloudModel || "fal-ai/kling-video/v2/master") : "",
          script_engine: scriptEngine,
        }, tid!).catch(() => {});
        refreshProjects();
        setTab("queue");
      } else if (result?.success) {
        toast({ title: "Video Auto-Created!", description: `${result.scenes} scenes from ${triggerType.replace(/_/g, " ")}` });
        refreshProjects();
        setTab("projects");
      }
    } catch {}
  };

  // View/download tracking (fire-and-forget)
  const trackVideoAction = (projectId: string, action: "watch" | "download") => {
    fetch("https://webhooks.zatesystems.com/webhook/video/track-view", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_project_id: projectId, tenant_id: tid, viewer_identifier: "studio-user", platform: "web", watch_percentage: action === "watch" ? 1.0 : 0, cta_clicked: action === "download" }),
    }).catch(() => {});
    // Also increment total_views on the project
    if (action === "watch" && tid) {
      supabase.rpc("increment_video_views" as any, { p_id: projectId }).catch(() => {
        // RPC may not exist — silently ignore
      });
    }
  };

  // Publish video to social platform
  const publishVideo = async (projectId: string, platform: string, videoUrl: string, title: string) => {
    try {
      await supabase.from("social_posts" as any).insert({
        tenant_id: tid, post_text: `${title}`, media_urls: [videoUrl],
        platform, status: "draft", ai_optimized: true,
        scheduled_at: new Date().toISOString(),
      });
      toast({ title: `Queued for ${platform}`, description: "Review in Social Commander before publishing." });
    } catch (err) {
      toast({ title: "Publish failed", description: String(err), variant: "destructive" });
    }
  };

  // Stats
  const stats = {
    total: projects.length,
    rendered: projects.filter((p: any) => p.render_status === "complete").length,
    aiGenerated: projects.filter((p: any) => p.ai_generated).length,
    scriptReady: projects.filter((p: any) => p.status === "script_ready").length,
  };

  const filteredTemplates = templates.filter((t: any) => templateFilter === "all" || t.template_type === templateFilter);
  const templateTypes = [...new Set(templates.map((t: any) => t.template_type))] as string[];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-purple-500" /> Video Studio
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered video production &middot; Local GPU &middot; $0/month</p>
        </div>
        <Button onClick={() => { setNewTitle(""); setCreateFormat("9:16"); setSceneEdits([{ scene_number: 1, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" }, { scene_number: 2, duration_s: 5, visual_prompt: "", voiceover: "", transition: "dissolve" }, { scene_number: 3, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" }]); setShowCreate(true); }} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> From Scratch
        </Button>
      </div>

      {/* HERO: AI PROMPT BAR */}
      <div className="rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 p-[1px]">
        <div className="rounded-xl bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-3 h-5 w-5 text-purple-400" />
              <Textarea
                placeholder="Describe your video... e.g., 'Create a 15-second Instagram Reel showcasing our premium BBQ restaurant'"
                value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                className="pl-10 min-h-[60px] resize-none text-sm border-none bg-muted/30 focus:bg-muted/50"
                rows={2}
              />
            </div>
            <Button onClick={generateVideoAI} disabled={isGenerating || !aiPrompt.trim()}
              className="h-auto px-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" size="lg">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[10px] max-w-[60px] text-center leading-tight">{genStep || "..."}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <Wand2 className="h-5 w-5" />
                  <span className="text-[10px]">Generate</span>
                </div>
              )}
            </Button>
          </div>

          {/* Platform pills + settings */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(PLATFORMS).map(([key, cfg]) => (
              <button key={key} onClick={() => { setAiPlatform(key); setAiDuration(cfg.def); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  aiPlatform === key ? "bg-purple-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                {cfg.label}
              </button>
            ))}
            <span className="text-muted-foreground/30 mx-0.5">|</span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[11px]">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <select value={aiDuration} onChange={(e) => setAiDuration(Number(e.target.value))}
                className="bg-transparent font-medium border-none outline-none cursor-pointer text-[11px]">
                {[5,10,15,20,30,45,60,90].map(d => <option key={d} value={d}>{d}s</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[11px]">
              <Mic className="h-3 w-3 text-muted-foreground" />
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-transparent font-medium border-none outline-none cursor-pointer text-[11px] max-w-[90px]">
                {VOICE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <span className="text-muted-foreground/30 mx-0.5">|</span>
            <button onClick={() => { setVideoTier("standard"); setVideoProvider("local"); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${videoTier === "standard" && videoProvider === "local" ? "bg-gray-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              Standard
            </button>
            <button onClick={() => { setVideoTier("premium"); setVideoProvider("local"); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${videoTier === "premium" && videoProvider === "local" ? "bg-purple-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              Premium LTX
            </button>
            <button onClick={() => { setVideoTier("premium"); setVideoProvider("cloud"); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${videoProvider === "cloud" ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm ring-1 ring-cyan-400/50" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              Cloud HD
            </button>
            {videoProvider === "cloud" && (
              <select value={cloudModel || "fal-ai/kling-video/v2/master"} onChange={(e) => setCloudModel(e.target.value)}
                className="bg-muted/50 text-[11px] font-medium rounded-full px-2 py-1 border-none outline-none cursor-pointer">
                <option value="fal-ai/kling-video/v2/master">Kling v2</option>
                <option value="fal-ai/minimax-video">Minimax</option>
                <option value="fal-ai/veo2">Veo 2</option>
              </select>
            )}
            <span className="text-muted-foreground/30 mx-0.5">|</span>
            <button onClick={() => setScriptEngine(scriptEngine === "gemini" ? "ollama" : "gemini")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${scriptEngine === "gemini" ? "bg-blue-600 text-white shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              {scriptEngine === "gemini" ? "Gemini Pro" : "Ollama"}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK AGENTIC ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="hover:border-purple-500/40 cursor-pointer transition-all group" onClick={() => { setTriggerModal("blog_published"); setTriggerInput(""); }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium text-sm">Blog to Video</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">Turn any blog post into a short video with AI narration</p>
          </CardContent>
        </Card>
        <Card className="hover:border-purple-500/40 cursor-pointer transition-all group" onClick={() => { setTriggerModal("competitor_ad_detected"); setTriggerInput(""); }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-orange-500" />
              <h4 className="font-medium text-sm">Counter Ad</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">AI creates a counter-video to respond to competitor promotions</p>
          </CardContent>
        </Card>
        <Card className="hover:border-purple-500/40 cursor-pointer transition-all group" onClick={() => { setTriggerModal("campaign_created"); setTriggerInput(""); }}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-green-500" />
              <h4 className="font-medium text-sm">Campaign Video</h4>
            </div>
            <p className="text-[11px] text-muted-foreground">Convert any campaign into a promotional video ad</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "projects") setSelectedProject(null); }}>
        <TabsList className="grid grid-cols-5 w-full max-w-xl">
          <TabsTrigger value="templates"><Layers className="h-3.5 w-3.5 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="projects"><Film className="h-3.5 w-3.5 mr-1" /> My Videos</TabsTrigger>
          <TabsTrigger value="queue"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Rendering</TabsTrigger>
          <TabsTrigger value="viewers"><Eye className="h-3.5 w-3.5 mr-1" /> Viewers</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Stats</TabsTrigger>
        </TabsList>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTemplateFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium ${templateFilter === "all" ? "bg-foreground text-background" : "bg-muted/50 hover:bg-muted"}`}>
              All ({templates.length})
            </button>
            {templateTypes.map((type) => (
              <button key={type} onClick={() => setTemplateFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${templateFilter === type ? "bg-foreground text-background" : "bg-muted/50 hover:bg-muted"}`}>
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTemplates.map((t: any) => {
              const scenes = parseScenes(t);
              const gradient = TEMPLATE_COLORS[t.template_type] || "from-gray-600 to-gray-700";
              return (
                <div key={t.id} className="group rounded-xl overflow-hidden border bg-card hover:border-purple-500/50 transition-all cursor-pointer"
                  onClick={() => { setNewTitle(`${t.name} - ${new Date().toLocaleDateString()}`); setCreateFormat(t.aspect_ratio || "9:16"); setSceneEdits(scenes); setShowCreate(true); }}>
                  <div className={`h-20 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
                    <Film className="h-8 w-8 text-white/40" />
                    <Badge className="absolute top-2 right-2 bg-black/50 text-white border-none text-[10px]">{t.aspect_ratio || "9:16"}</Badge>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{t.template_type?.replace(/_/g, " ")}</Badge>
                      <span>{t.default_duration_seconds || 15}s</span>
                      <span>&middot;</span>
                      <span>{scenes.length} scenes</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Layers className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No templates found</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects" className="mt-4">
          {selectedProject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}><ArrowLeft className="h-4 w-4" /></Button>
                  <div>
                    <h2 className="font-bold">{selectedProject.title}</h2>
                    <div className="flex gap-1.5 mt-0.5">
                      <Badge className={STATUS_LABELS[selectedProject.status]?.color || "bg-gray-500"}>
                        {STATUS_LABELS[selectedProject.status]?.label || selectedProject.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{selectedProject.aspect_ratio || "9:16"}</Badge>
                      {selectedProject.ai_generated && <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/30">AI</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" onClick={() => updateScenes.mutate({ id: selectedProject.id, scenes: sceneEdits })}>Save</Button>
                  <Select value={renderQuality} onValueChange={setRenderQuality}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => startRender.mutate({ ...selectedProject, scenes: sceneEdits })} disabled={startRender.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600">
                    {startRender.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1" /> Render</>}
                  </Button>
                </div>
                {renderQuality === "premium" && (
                  <p className="text-[10px] text-amber-500 text-right mt-1">Requires Local GPU &middot; ~3 min per scene</p>
                )}
              </div>

              {/* Scene editor split */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Scenes ({sceneEdits.length})</span>
                    <Button size="sm" variant="ghost" onClick={addScene}><Plus className="h-3 w-3" /></Button>
                  </div>
                  {sceneEdits.map((scene: any, i: number) => (
                    <div key={i} onClick={() => setSelectedScene(i)}
                      className={`rounded-lg border p-2.5 cursor-pointer transition-all text-xs ${
                        selectedScene === i ? "border-purple-500 bg-purple-500/5" : "hover:border-muted-foreground/30"
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Scene {i + 1}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scene.duration_s || 5}s</Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{scene.visual_prompt || scene.visual_description || "No description"}</p>
                      {(scene.voiceover || scene.voiceover_text) && (
                        <p className="text-purple-400 mt-0.5 line-clamp-1 text-[10px]">{scene.voiceover || scene.voiceover_text}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="col-span-3 space-y-3">
                  {sceneEdits[selectedScene] && (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Scene {selectedScene + 1}</h3>
                        <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => removeScene(selectedScene)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Visual Description</Label>
                        <Textarea className="mt-1 text-sm" rows={3}
                          value={sceneEdits[selectedScene].visual_prompt || sceneEdits[selectedScene].visual_description || ""}
                          onChange={(e) => updateScene(selectedScene, { visual_prompt: e.target.value, visual_description: e.target.value })}
                          placeholder="Describe what the viewer sees..." />
                      </div>
                      <div>
                        <Label className="text-xs">Voiceover</Label>
                        <Textarea className="mt-1 text-sm" rows={2}
                          value={sceneEdits[selectedScene].voiceover || sceneEdits[selectedScene].voiceover_text || ""}
                          onChange={(e) => updateScene(selectedScene, { voiceover: e.target.value, voiceover_text: e.target.value })}
                          placeholder="Narration text..." />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px]">Duration</Label>
                          <Select value={String(sceneEdits[selectedScene].duration_s || 5)}
                            onValueChange={(v) => updateScene(selectedScene, { duration_s: Number(v) })}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                            <SelectContent>{[3,4,5,6,7,8,10,12,15].map(d => <SelectItem key={d} value={String(d)}>{d}s</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">Transition</Label>
                          <Select value={sceneEdits[selectedScene].transition || "fade"}
                            onValueChange={(v) => updateScene(selectedScene, { transition: v })}>
                            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                            <SelectContent>{TRANSITIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">Overlay</Label>
                          <Input className="h-8 text-xs mt-0.5"
                            value={sceneEdits[selectedScene].overlay_text || ""}
                            onChange={(e) => updateScene(selectedScene, { overlay_text: e.target.value })}
                            placeholder="Text..." />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground">Timeline</span>
                  <span className="text-[10px] text-muted-foreground">{sceneEdits.reduce((s: number, sc: any) => s + (sc.duration_s || 5), 0)}s total</span>
                </div>
                <div className="flex gap-0.5 h-6">
                  {sceneEdits.map((s: any, i: number) => {
                    const colors = ["bg-purple-600","bg-pink-600","bg-blue-600","bg-orange-600","bg-green-600","bg-cyan-600","bg-yellow-600","bg-red-600"];
                    return (
                      <div key={i} onClick={() => setSelectedScene(i)}
                        className={`${colors[i%colors.length]} rounded cursor-pointer flex items-center justify-center text-white text-[10px] font-medium transition-all ${selectedScene===i?"ring-2 ring-white":"opacity-80 hover:opacity-100"}`}
                        style={{ flex: s.duration_s || 5 }}>{i+1}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p: any) => {
                const scenes = parseScenes(p);
                const st = STATUS_LABELS[p.status] || { label: p.status, color: "bg-gray-500" };
                return (
                  <Card key={p.id} className="hover:border-purple-500/50 cursor-pointer transition-all overflow-hidden" onClick={() => openProject(p)}>
                    {p.thumbnail_url && (
                      <div className="relative aspect-video bg-muted">
                        <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                        {p.video_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    <CardContent className={`${p.thumbnail_url ? "pt-3" : "pt-4"} space-y-2`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm line-clamp-1">{p.title || "Untitled"}</h3>
                        <Badge className={`${st.color} text-[10px]`}>{st.label}</Badge>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{p.aspect_ratio || "9:16"}</Badge>
                        <Badge variant="outline" className="text-[10px]">{scenes.length} scenes</Badge>
                        {p.ai_generated && <Badge variant="outline" className="text-[10px] text-purple-500">AI</Badge>}
                        {p.source_type && p.source_type !== "manual" && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">{p.source_type.replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                      {p.video_url ? (
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={(e: any) => { e.stopPropagation(); trackVideoAction(p.id, "watch"); window.open(p.video_url, "_blank"); }}>
                            <Play className="h-3 w-3 mr-1" /> Watch
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs" onClick={(e: any) => { e.stopPropagation(); trackVideoAction(p.id, "download"); }} asChild>
                            <a href={p.video_url} download><Download className="h-3 w-3 mr-1" /></a>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e: any) => e.stopPropagation()}>
                              <Button size="sm" variant="outline" className="text-xs"><Share2 className="h-3 w-3 mr-1" /> Publish</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {["instagram", "tiktok", "facebook", "linkedin", "youtube"].map(pl => (
                                <DropdownMenuItem key={pl} onClick={() => publishVideo(p.id, pl, p.video_url, p.title)}>
                                  {pl.charAt(0).toUpperCase() + pl.slice(1)}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {p.render_status === "complete" && !p.source_type?.includes("premium") && (
                            <Button size="sm" variant="outline" className="text-xs text-purple-400 border-purple-400/30 hover:bg-purple-400/10"
                              onClick={(e: any) => { e.stopPropagation(); callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, { trigger_type: "manual_render", content: p.title || "Premium upgrade", project_id: p.id, priority: "high", quality_tier: "premium" }, tid!).then(() => { toast({ title: "Upgrading to Premium", description: "Re-rendering with AI motion. Check Rendering tab." }); setTab("queue"); }).catch(() => {}); }}>
                              <Sparkles className="h-3 w-3 mr-1" /> Upgrade
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-destructive h-8 w-8 p-0" onClick={(e: any) => { e.stopPropagation(); deleteProject.mutate(p.id); }} disabled={deleteProject.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : p.render_status !== "complete" && p.status === "script_ready" ? (
                        <Button size="sm" className="w-full text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" onClick={(e: any) => { e.stopPropagation(); startRender.mutate(p); }} disabled={startRender.isPending}>
                          <Zap className="h-3 w-3 mr-1" /> Render Now
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
              {projects.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No video projects yet</p>
                  <p className="text-sm">Use the AI prompt bar above or pick a template</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* RENDER QUEUE TAB */}
        <TabsContent value="queue" className="space-y-3 mt-4">
          {renderJobs.some((j: any) => j.status === "complete" || j.status === "completed" || j.status === "failed") && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => clearCompleted.mutate()} disabled={clearCompleted.isPending}>
                <Trash2 className="h-3 w-3 mr-1" /> Clear Completed
              </Button>
            </div>
          )}
          {renderJobs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No renders yet</p>
              <p className="text-sm">Create and render a video to see progress here</p>
            </div>
          ) : renderJobs.map((job: any) => {
            const st = STATUS_LABELS[job.status] || { label: job.status || "unknown", color: "bg-gray-500" };
            const progress = job.scenes_total ? (job.scenes_complete / job.scenes_total) * 100 : 0;
            const isDone = job.status === "complete" || job.status === "completed" || job.status === "failed";
            return (
              <div key={job.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{job.project_title || job.title || `Render ${job.id?.slice(0,8)}`}</h4>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${(job.tier === "premium") ? "border-purple-500/50 text-purple-400" : "text-muted-foreground"}`}>
                        {job.tier === "premium" ? "Premium" : "Standard"}
                      </Badge>
                      {job.trigger_type && job.trigger_type !== "manual_render" && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {job.trigger_type?.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {job.format && <Badge variant="outline" className="text-[10px] text-muted-foreground">{job.format}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={st.color}>{st.label}</Badge>
                    {isDone && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteQueueItem.mutate(job.id)} disabled={deleteQueueItem.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {!isDone && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500 animate-pulse" style={{ width: `${Math.max(progress, 5)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {progress > 0 ? `${Math.round(progress)}%` : "Starting..."} {job.tier === "premium" ? " ~ 5 min/scene" : " ~ 1 min total"}
                    </p>
                  </div>
                )}
                {(job.status === "complete" || job.status === "completed") && job.result_url && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" asChild><a href={job.result_url} target="_blank" rel="noopener"><Play className="h-3 w-3 mr-1" /> Watch</a></Button>
                    <Button size="sm" variant="outline" className="text-xs" asChild><a href={job.result_url} download><Download className="h-3 w-3 mr-1" /> Download</a></Button>
                  </div>
                )}
                {job.status === "failed" && job.error && <p className="text-xs text-red-500 mt-2">{job.error}</p>}
              </div>
            );
          })}
        </TabsContent>

        {/* VIEWER INTELLIGENCE TAB */}
        <TabsContent value="viewers" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["attention", "interest", "desire", "action"] as const).map((stage) => {
              const config = AIDA_STAGES[stage];
              const audience = aidaAudiences.find((a: any) => a.aida_stage === stage);
              const Icon = config.icon;
              return (
                <Card key={stage} className={`border-2 ${config.bg}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <h3 className={`font-bold ${config.color}`}>{config.label}</h3>
                    </div>
                    <p className="text-3xl font-bold">{audience?.member_count || 0}</p>
                    <p className="text-xs text-muted-foreground">{config.desc}</p>
                    {audience?.retargeting_action && (
                      <p className="text-xs mt-2 italic text-muted-foreground">{audience.retargeting_action}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
                        const sc = AIDA_STAGES[view.aida_stage as keyof typeof AIDA_STAGES] || AIDA_STAGES.attention;
                        return (
                          <tr key={view.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{view.viewer_email || view.viewer_id || "Anonymous"}</td>
                            <td className="p-2 capitalize">{view.platform}</td>
                            <td className="p-2 text-right font-mono">{Number(view.watch_percentage || 0).toFixed(0)}%</td>
                            <td className="p-2 text-center">{view.cta_clicked ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : "-"}</td>
                            <td className="p-2 text-center"><Badge variant="outline" className={`text-xs ${sc.color}`}>{sc.label}</Badge></td>
                            <td className="p-2 text-right">{view.total_views || 1}</td>
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
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold">{projects.reduce((s: number, p: any) => s + (p.total_views || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold">{stats.rendered}</p>
              <p className="text-xs text-muted-foreground">Rendered</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-purple-500">{stats.aiGenerated}</p>
              <p className="text-xs text-muted-foreground">AI Generated</p>
            </CardContent></Card>
            <Card><CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.scriptReady}</p>
              <p className="text-xs text-muted-foreground">Ready to Render</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-purple-500" /> AI Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.filter((p: any) => p.ai_generated).length === 0 ? (
                <p className="text-xs text-muted-foreground">No AI-generated videos yet.</p>
              ) : (
                <div className="space-y-2">
                  {projects.filter((p: any) => p.ai_generated).slice(0,5).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">{p.source_type?.replace(/_/g," ")||"manual"} &middot; {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge className={STATUS_LABELS[p.status]?.color||"bg-gray-500"} variant="outline">{STATUS_LABELS[p.status]?.label||p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Templates</CardTitle></CardHeader>
            <CardContent>
              {templates.slice(0,5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{t.name}</span>
                  <Badge variant="outline" className="text-[10px]">{t.usage_count||0} uses</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FROM SCRATCH DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Video</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Video title..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={createFormat} onValueChange={setCreateFormat}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9:16">9:16 Vertical</SelectItem>
                    <SelectItem value="16:9">16:9 Horizontal</SelectItem>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                    <SelectItem value="4:5">4:5 Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{VOICE_OPTIONS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Scenes ({sceneEdits.length})</Label>
              {sceneEdits.map((s: any, i: number) => (
                <div key={i} className="border rounded p-2 grid grid-cols-2 gap-2">
                  <Textarea className="text-xs" rows={2} value={s.visual_prompt||""} placeholder={`Scene ${i+1} visual...`}
                    onChange={(e) => { const u=[...sceneEdits]; u[i]={...u[i],visual_prompt:e.target.value}; setSceneEdits(u); }} />
                  <Textarea className="text-xs" rows={2} value={s.voiceover||""} placeholder="Narration..."
                    onChange={(e) => { const u=[...sceneEdits]; u[i]={...u[i],voiceover:e.target.value}; setSceneEdits(u); }} />
                </div>
              ))}
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSceneEdits([...sceneEdits, { scene_number: sceneEdits.length+1, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Scene
              </Button>
            </div>
            <Button className="w-full" onClick={() => {
              if (!newTitle.trim()) return;
              createProject.mutate({ title: newTitle, scenes: sceneEdits, format: createFormat });
            }} disabled={createProject.isPending || !newTitle.trim()}>
              {createProject.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TRIGGER MODAL (Fix 2) */}
      <Dialog open={!!triggerModal} onOpenChange={(open) => { if (!open) setTriggerModal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {triggerModal === "blog_published" ? "Blog → Video" : triggerModal === "competitor_ad_detected" ? "Counter Ad" : "Campaign → Video"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={triggerInput}
              onChange={(e) => setTriggerInput(e.target.value)}
              placeholder={
                triggerModal === "blog_published" ? "Paste your blog title or URL..." :
                triggerModal === "competitor_ad_detected" ? "Describe the competitor's promotion to counter..." :
                "Which campaign or promotion to convert?"
              }
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setTriggerModal(null)}>Cancel</Button>
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600" disabled={!triggerInput.trim()} onClick={async () => {
                const type = triggerModal!;
                setTriggerModal(null);
                await triggerAutoCreate(type, { content: triggerInput });
                toast({ title: "AI is creating your video", description: "Check the Queue tab in ~2 minutes" });
              }}>
                <Sparkles className="h-3 w-3 mr-1" /> Generate Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
