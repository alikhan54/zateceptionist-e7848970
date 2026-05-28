import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, callWebhook, WEBHOOKS } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Film, Play, Plus, Download, Sparkles, Loader2, Wand2, Trash2, ArrowLeft,
  Share2, X, Settings2, Globe, Mic, Music as MusicIcon, Brain, FlaskConical,
  ChevronDown, ChevronUp, Eye, Heart, CheckCircle, Zap, BarChart3, Send,
  Instagram, Youtube, Facebook, Linkedin, Smartphone, ArrowUp, Layers,
} from "lucide-react";

// ============================================================
// GSAP — installed via npm; if a dynamic build strips it,
// the useEffect guards still skip animation cleanly.
// ============================================================
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

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

const LANGUAGES = [
  { code: "en", name: "English", defaultVoice: "en-US-AriaNeural" },
  { code: "ar", name: "Arabic", defaultVoice: "ar-SA-ZariyahNeural" },
  { code: "hi", name: "Hindi", defaultVoice: "hi-IN-SwaraNeural" },
  { code: "ur", name: "Urdu", defaultVoice: "ur-PK-UzmaNeural" },
  { code: "es", name: "Spanish", defaultVoice: "es-ES-ElviraNeural" },
  { code: "fr", name: "French", defaultVoice: "fr-FR-DeniseNeural" },
  { code: "de", name: "German", defaultVoice: "de-DE-KatjaNeural" },
  { code: "zh", name: "Chinese", defaultVoice: "zh-CN-XiaoxiaoNeural" },
  { code: "ja", name: "Japanese", defaultVoice: "ja-JP-NanamiNeural" },
  { code: "pt", name: "Portuguese", defaultVoice: "pt-BR-FranciscaNeural" },
  { code: "ko", name: "Korean", defaultVoice: "ko-KR-SunHiNeural" },
  { code: "tr", name: "Turkish", defaultVoice: "tr-TR-EmelNeural" },
  { code: "it", name: "Italian", defaultVoice: "it-IT-ElsaNeural" },
  { code: "nl", name: "Dutch", defaultVoice: "nl-NL-ColetteNeural" },
  { code: "pl", name: "Polish", defaultVoice: "pl-PL-AgnieszkaNeural" },
  { code: "ru", name: "Russian", defaultVoice: "ru-RU-SvetlanaNeural" },
];

const CLOUD_MODELS = [
  { id: "fal-ai/kling-video/v2/master", label: "Kling v2 Master", provider: "fal" },
  { id: "fal-ai/minimax-video", label: "Minimax", provider: "fal" },
  { id: "fal-ai/veo2", label: "Veo 2", provider: "fal" },
];

const MUSIC_MOODS = [
  { id: "auto", label: "Auto" },
  { id: "energetic", label: "Energetic" },
  { id: "corporate", label: "Corporate" },
  { id: "warm", label: "Warm" },
  { id: "tech", label: "Tech" },
  { id: "chill", label: "Chill" },
];

const QUALITY_LEVELS = [
  { id: "auto", label: "Auto", hint: "Smart pick" },
  { id: "standard", label: "Standard", hint: "Free, fast" },
  { id: "premium", label: "Premium", hint: "Local AI motion" },
  { id: "cloud", label: "Cloud HD", hint: "Kling v2, paid" },
];

const STYLE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "ad", label: "Ad / Reel" },
  { id: "standard", label: "Cinematic" },
  { id: "avatar", label: "Avatar" },
];

const ENGINE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "ollama", label: "Ollama (Free)" },
  { id: "gemini", label: "Gemini (Pro)" },
];

// 8 Quick Create templates — drive smart defaults + trigger types
const QUICK_TEMPLATES = [
  {
    id: "social_reel", icon: "📱", title: "Social Reel",
    subtitle: "Punchy 15s for IG/TikTok",
    accent: "from-pink-400 to-rose-500", border: "border-l-pink-500",
    placeholder: "A 15-second Reel showing why our product solves [problem] in seconds.",
    defaults: { video_style: "ad", music_mood: "energetic", quality: "standard", trigger_type: "manual_render", videoType: "standard" },
  },
  {
    id: "product_ad", icon: "📺", title: "Product Ad",
    subtitle: "Direct response 30s",
    accent: "from-orange-400 to-red-500", border: "border-l-orange-500",
    placeholder: "A 30-second product ad: hook → problem → solution → proof → CTA.",
    defaults: { video_style: "ad", music_mood: "energetic", quality: "premium", trigger_type: "manual_render", videoType: "standard" },
  },
  {
    id: "explainer", icon: "💡", title: "Explainer",
    subtitle: "Walk through how it works",
    accent: "from-sky-400 to-cyan-500", border: "border-l-sky-500",
    placeholder: "A 60-second explainer of how our platform works in 4 steps.",
    defaults: { video_style: "standard", music_mood: "tech", quality: "premium", trigger_type: "manual_render", videoType: "standard" },
  },
  {
    id: "avatar", icon: "🧑", title: "Avatar Video",
    subtitle: "AI talking head",
    accent: "from-violet-400 to-purple-600", border: "border-l-violet-500",
    placeholder: "A confident on-camera message addressing the viewer by name.",
    defaults: { video_style: "avatar", music_mood: "warm", quality: "premium", trigger_type: "manual_render", videoType: "avatar" },
  },
  {
    id: "blog", icon: "📝", title: "Blog Video",
    subtitle: "Turn a blog into a reel",
    accent: "from-emerald-400 to-green-500", border: "border-l-emerald-500",
    placeholder: "Convert this blog post into a 45-second video: [paste blog title or excerpt]",
    defaults: { video_style: "standard", music_mood: "corporate", quality: "standard", trigger_type: "blog_published", videoType: "standard" },
  },
  {
    id: "testimonial", icon: "🏆", title: "Testimonial",
    subtitle: "Customer success story",
    accent: "from-amber-400 to-yellow-500", border: "border-l-amber-500",
    placeholder: "A testimonial-style reel featuring quotes and outcomes from a happy customer.",
    defaults: { video_style: "standard", music_mood: "warm", quality: "premium", trigger_type: "manual_render", videoType: "standard" },
  },
  {
    id: "announcement", icon: "📢", title: "Announcement",
    subtitle: "Big news, made visible",
    accent: "from-teal-400 to-emerald-500", border: "border-l-teal-500",
    placeholder: "Announce [something new]: what it is, why it matters, what to do next.",
    defaults: { video_style: "ad", music_mood: "corporate", quality: "premium", trigger_type: "campaign_created", videoType: "standard" },
  },
  {
    id: "counter_ad", icon: "🛡️", title: "Counter Ad",
    subtitle: "Respond to a competitor",
    accent: "from-rose-400 to-red-600", border: "border-l-red-500",
    placeholder: "A counter-ad responding to [competitor's promotion]. Sharper hook, better proof.",
    defaults: { video_style: "ad", music_mood: "energetic", quality: "premium", trigger_type: "competitor_ad_detected", videoType: "standard" },
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-200 text-slate-700" },
  script_ready: { label: "Script Ready", color: "bg-amber-100 text-amber-700" },
  queued: { label: "Queued", color: "bg-slate-200 text-slate-700" },
  generating_images: { label: "Creating visuals…", color: "bg-blue-100 text-blue-700" },
  generating_audio: { label: "Recording audio…", color: "bg-violet-100 text-violet-700" },
  assembling: { label: "Assembling…", color: "bg-orange-100 text-orange-700" },
  rendering: { label: "Rendering…", color: "bg-blue-100 text-blue-700" },
  complete: { label: "Complete", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Failed", color: "bg-rose-100 text-rose-700" },
};

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram, tiktok: MusicIcon, facebook: Facebook,
  linkedin: Linkedin, youtube: Youtube,
};

// ============================================================
// HELPERS
// ============================================================

const handleCardTilt = (e: React.MouseEvent<HTMLElement>) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const rotateX = ((y - rect.height / 2) / rect.height) * -8;
  const rotateY = ((x - rect.width / 2) / rect.width) * 8;
  card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
};

const handleCardTiltReset = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateY(0)";
};

const formatDuration = (sec?: number | null): string => {
  if (!sec || sec < 1) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
};

const timeAgo = (iso?: string): string => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

// ============================================================
// COMPONENT
// ============================================================

export default function VideoStudio() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tid = tenantConfig?.id;

  // ----- Tabs / view state -----
  const [tab, setTab] = useState<"videos" | "rendering" | "analytics">("videos");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [playerVideo, setPlayerVideo] = useState<any>(null);

  // ----- Hero creation state -----
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ----- Advanced controls (smart defaults) -----
  const [quality, setQuality] = useState<"auto" | "standard" | "premium" | "cloud">("auto");
  const [language, setLanguage] = useState("en");
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [style, setStyle] = useState<"auto" | "ad" | "standard" | "avatar">("auto");
  const [music, setMusic] = useState<"auto" | "energetic" | "corporate" | "warm" | "tech" | "chill">("auto");
  const [engine, setEngine] = useState<"auto" | "ollama" | "gemini">("auto");
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [cloudModel, setCloudModel] = useState("fal-ai/kling-video/v2/master");

  // ----- Avatar Creator state (shown when QuickTemplate "avatar" is selected) -----
  const [avatarScript, setAvatarScript] = useState("");
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // ----- Scene editor (still preserved when project clicked) -----
  const [sceneEdits, setSceneEdits] = useState<any[]>([]);
  const [selectedScene, setSelectedScene] = useState(0);
  const [renderQuality, setRenderQuality] = useState<"standard" | "premium">("standard");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createFormat, setCreateFormat] = useState("9:16");

  // ----- Refs for animations -----
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // QUERIES (preserved)
  // ============================================================

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
      return (data || []).map((row: any) => ({
        ...row,
        project_title: row.video_projects?.title || null,
        result_url: row.output_url || row.video_projects?.video_url || null,
      }));
    },
    enabled: !!tid,
    refetchInterval: 5000,
  });

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

  const { data: templates = [] } = useQuery({
    queryKey: ["video-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("video_templates" as any).select("*")
        .eq("is_active", true).order("usage_count", { ascending: false });
      return data || [];
    },
  });

  // ============================================================
  // MUTATIONS (preserved)
  // ============================================================

  const startRender = useMutation({
    mutationFn: async (project: any) => {
      const result = await callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, {
        trigger_type: "manual_render",
        content: project.title || "Video render",
        project_id: project.id,
        priority: renderQuality === "premium" ? "high" : "standard",
        quality_tier: renderQuality,
        cloud_provider: quality === "cloud" ? "fal" : "",
        cloud_model: quality === "cloud" ? cloudModel : "",
        script_engine: engine === "auto" ? "gemini" : engine,
        language: language !== "en" ? language : undefined,
        video_style: style === "auto" ? "standard" : style,
        music_mood: music === "auto" ? "tech" : music,
      }, tid!);
      return result.data || result;
    },
    onSuccess: (data) => {
      if ((data as any)?.job_id || (data as any)?.accepted) {
        toast({ title: "Render started", description: "Track progress in the Rendering tab." });
        setTab("rendering");
        // AEO: best-effort
        fetch("https://webhooks.zatesystems.com/webhook/aeo/optimize-content", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tid, content_type: "video", title: selectedProject?.title || "Video", content: selectedProject?.description || "" }),
        }).catch(() => {});
      }
    },
  });

  const updateScenes = useMutation({
    mutationFn: async (p: { id: string; scenes: any[] }) => {
      const { error } = await supabase.from("video_projects" as any)
        .update({ scenes: p.scenes, updated_at: new Date().toISOString() }).eq("id", p.id).eq("tenant_id", tid);
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Scenes saved" }),
  });

  const createProject = useMutation({
    mutationFn: async (p: { title: string; scenes: any[]; format: string }) => {
      const { data, error } = await supabase.from("video_projects" as any).insert({
        tenant_id: tid, title: p.title,
        video_type: p.format === "9:16" ? "short_form" : "long_form",
        aspect_ratio: p.format, voice_style: selectedVoice,
        status: "draft", scenes: p.scenes,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Project created" });
      qc.invalidateQueries({ queryKey: ["video-projects-studio"] });
      setSelectedProject(data);
      setShowCreate(false);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("video_render_queue" as any).delete().eq("project_id", id).eq("tenant_id", tid);
      await supabase.from("video_projects" as any).delete().eq("id", id).eq("tenant_id", tid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-projects-studio"] });
      qc.invalidateQueries({ queryKey: ["video-render-queue"] });
      toast({ title: "Video deleted" });
      setSelectedProject(null);
    },
  });

  const deleteQueueItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("video_render_queue" as any).delete().eq("id", id).eq("tenant_id", tid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video-render-queue"] });
      toast({ title: "Render cleared" });
    },
  });

  const clearCompleted = useMutation({
    mutationFn: async () => {
      await supabase.from("video_render_queue" as any).delete().eq("tenant_id", tid).in("status", ["completed", "complete", "failed"]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-render-queue"] }),
  });

  // ============================================================
  // HELPERS
  // ============================================================

  const refreshProjects = () => {
    setTimeout(() => qc.invalidateQueries({ queryKey: ["video-projects-studio"] }), 1500);
  };

  const parseScenes = (item: any): any[] => {
    try {
      const s = item.scenes;
      return typeof s === "string" ? JSON.parse(s) : (s || []);
    } catch {
      return [];
    }
  };

  const openProject = (p: any) => {
    setSelectedProject(p);
    setSceneEdits(parseScenes(p));
    setSelectedScene(0);
  };

  // View/download tracking (preserved)
  const trackVideoAction = (projectId: string, action: "watch" | "download") => {
    fetch("https://webhooks.zatesystems.com/webhook/video/track-view", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_project_id: projectId, tenant_id: tid, viewer_identifier: "studio-user",
        platform: "web", watch_percentage: action === "watch" ? 1.0 : 0,
        cta_clicked: action === "download",
      }),
    }).catch(() => {});
    if (action === "watch" && tid) {
      supabase.rpc("increment_video_views" as any, { p_id: projectId }).catch(() => {});
    }
  };

  // Publish video to social platform (preserved)
  const publishVideo = async (projectId: string, platform: string, videoUrl: string, title: string) => {
    try {
      await supabase.from("social_posts" as any).insert({
        tenant_id: tid, post_text: title, media_urls: [videoUrl],
        platform, status: "draft", ai_optimized: true,
        scheduled_at: new Date().toISOString(),
      });
      toast({ title: `Queued for ${platform}`, description: "Review in Social Commander before publishing." });
    } catch (err) {
      toast({ title: "Publish failed", description: String(err), variant: "destructive" });
    }
  };

  // ============================================================
  // GENERATE — unified smart-default flow
  // ============================================================

  const generateVideo = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Describe your video idea first" });
      return;
    }
    if (!tid) return;
    setIsGenerating(true);
    setGenStep("Preparing…");

    const tmpl = selectedTemplate ? QUICK_TEMPLATES.find(t => t.id === selectedTemplate) : null;
    const triggerType = tmpl?.defaults.trigger_type || "manual_render";
    const videoType = tmpl?.defaults.videoType || "standard";

    // Resolve smart defaults
    const resolvedQuality = quality === "auto"
      ? (tmpl?.defaults.quality || "standard")
      : quality;
    const resolvedStyle = style === "auto"
      ? (tmpl?.defaults.video_style || "standard")
      : style;
    const resolvedMusic = music === "auto"
      ? (tmpl?.defaults.music_mood || "tech")
      : music;
    const resolvedEngine = engine === "auto" ? "gemini" : engine;

    const isCloud = resolvedQuality === "cloud";
    const qualityTier = resolvedQuality === "cloud" ? "premium" : resolvedQuality;

    const basePayload = {
      trigger_type: triggerType,
      content: aiPrompt,
      tenant_id: tenantConfig?.tenant_id || tid,
      priority: (qualityTier === "premium" ? "high" : "standard") as "high" | "standard",
      quality_tier: qualityTier,
      cloud_provider: isCloud ? "fal" : "",
      cloud_model: isCloud ? cloudModel : "",
      script_engine: resolvedEngine,
      language: language !== "en" ? language : undefined,
      video_style: resolvedStyle,
      music_mood: resolvedMusic,
      ...(videoType === "avatar" ? { avatar_provider: "heygen" } : {}),
    };

    try {
      setGenStep("Sending to AI…");

      // Avatar branch — separate endpoint
      if (videoType === "avatar") {
        try {
          await fetch("https://webhooks.zatesystems.com/webhook/video/generate-avatar", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...basePayload, avatar_provider: "heygen" }),
          });
        } catch {/* fallthrough */}
      }

      // Primary fire-and-collect orchestrator call
      await callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, basePayload, tid!);

      // A/B variant
      if (abTestEnabled) {
        const groupId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
        await callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, {
          ...basePayload,
          content: aiPrompt + " (Alternative creative approach)",
          ab_variant: "B",
          ab_group_id: groupId,
        }, tid!).catch(() => {});
      }

      toast({
        title: "✨ Your video is being created",
        description: "Usually ready in 1-3 minutes. Track progress in Rendering.",
      });
      setTab("rendering");
      setAiPrompt("");
      setSelectedTemplate(null);
      setAdvancedOpen(false);
      refreshProjects();
    } catch (err) {
      toast({ title: "Something went wrong", description: String(err), variant: "destructive" });
    } finally {
      setIsGenerating(false);
      setGenStep("");
    }
  };

  // ============================================================
  // AVATAR CREATOR — separate flow from main generateVideo
  // Calls the public avatar webhook (which proxies to video-service:8125
  // /generate-avatar; backend currently routes to HeyGen / D-ID / MuseTalk
  // depending on what's configured). Saves the resulting clip to
  // video_projects so it shows up in My Videos immediately.
  // ============================================================

  const generateAvatarVideo = async () => {
    if (!avatarScript.trim()) {
      toast({ title: "Write what the avatar should say" });
      return;
    }
    if (!tid) {
      toast({ title: "Tenant not loaded yet — please retry" });
      return;
    }
    setIsGeneratingAvatar(true);
    try {
      const projectId = `avatar_${Date.now()}`;
      const resp = await fetch(
        "https://webhooks.zatesystems.com/webhook/video/generate-avatar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            script: avatarScript,
            provider: "auto",
            voice_id: selectedVoice,
            language: language !== "en" ? language : undefined,
            tenant_id: tenantConfig?.tenant_id || tid,
            project_id: projectId,
          }),
        }
      );

      // Best-effort JSON parse — webhook may return text on error
      let result: any = {};
      try { result = await resp.json(); } catch { result = { error: `HTTP ${resp.status}` }; }
      const videoUrl: string | undefined = result?.video_url || result?.clip_url;

      if (videoUrl) {
        await supabase.from("video_projects" as any).insert({
          tenant_id: tid,
          title: avatarScript.slice(0, 80),
          video_url: videoUrl,
          rendered_video_url: videoUrl,
          render_status: "complete",
          status: "complete",
          source_type: "avatar",
          video_type: "avatar",
          aspect_ratio: "9:16",
          ai_generated: true,
          voice_style: selectedVoice,
          ai_optimization_notes: { provider: result?.source || "auto", voice: selectedVoice },
        });
        qc.invalidateQueries({ queryKey: ["video-projects-studio"] });
        toast({ title: "Avatar video created ✨", description: "Open My Videos to watch it." });
        setTab("videos");
        setSelectedTemplate(null);
        setAvatarScript("");
      } else {
        toast({
          title: "Avatar generation didn't return a video",
          description: (result?.error || `HTTP ${resp.status}`).toString().slice(0, 200),
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Connection error", description: String(err).slice(0, 200), variant: "destructive" });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // ============================================================
  // GSAP ANIMATIONS
  // ============================================================

  useEffect(() => {
    if (!gsap || !containerRef.current) return;
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current, {
          y: -24, opacity: 0, duration: 0.7, ease: "power3.out",
        });
      }
      gsap.from(".vs-quick-card", {
        y: 14, opacity: 0, scale: 0.96,
        duration: 0.45, stagger: 0.06, ease: "back.out(1.4)", delay: 0.25,
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Re-run scroll reveal when projects/tab change
  useEffect(() => {
    if (!gsap || !ScrollTrigger) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".vs-video-card").forEach((card) => {
        gsap.from(card, {
          y: 30, opacity: 0, duration: 0.5, ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" },
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, [projects, tab]);

  // ============================================================
  // DERIVED
  // ============================================================

  const stats = useMemo(() => {
    const totalViews = projects.reduce((s: number, p: any) => s + (p.total_views || 0), 0);
    const totalEngagement = projects.reduce((s: number, p: any) => s + (p.total_engagement || 0), 0);
    const completed = projects.filter((p: any) => p.render_status === "complete").length;
    const published = projects.reduce((s: number, p: any) =>
      s + (Array.isArray(p.published_platforms) ? p.published_platforms.length : 0), 0);
    return { total: projects.length, completed, totalViews, totalEngagement, published };
  }, [projects]);

  const activeRenders = renderJobs.filter((j: any) =>
    j.status !== "complete" && j.status !== "completed" && j.status !== "failed");

  const inlineKeyframes = `
    @keyframes vsBlobA { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-30px,30px) scale(.92)} }
    @keyframes vsBlobB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,-40px) scale(1.15)} }
    @keyframes vsShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
    @keyframes vsBreathe { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0)} }
    @keyframes vsPulseGlow { 0%,100%{box-shadow:0 8px 30px rgba(99,102,241,.35)} 50%{box-shadow:0 12px 50px rgba(236,72,153,.45)} }
    @keyframes vsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes vsFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes vsConfetti { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-40px) scale(0);opacity:0} }
  `;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{
        background: "#FAFBFF",
        color: "#1E293B",
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.05) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <style>{inlineKeyframes}</style>

      <div className="px-4 md:px-8 lg:px-10 py-6 max-w-[1400px] mx-auto space-y-8">
        {/* ===== HERO CREATION ZONE ===== */}
        <section
          ref={heroRef}
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            boxShadow: "0 16px 50px rgba(102,126,234,.25)",
          }}
        >
          {/* Floating blobs */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div
              style={{
                position: "absolute", top: -60, left: "8%", width: 320, height: 320,
                borderRadius: "50%", background: "rgba(255,255,255,.18)", filter: "blur(60px)",
                animation: "vsBlobA 9s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute", bottom: -80, right: "10%", width: 280, height: 280,
                borderRadius: "50%", background: "rgba(236,72,153,.22)", filter: "blur(70px)",
                animation: "vsBlobB 11s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute", top: "30%", right: "30%", width: 180, height: 180,
                borderRadius: "50%", background: "rgba(99,102,241,.18)", filter: "blur(60px)",
                animation: "vsBlobA 13s ease-in-out infinite",
              }}
            />
          </div>

          <div className="relative px-6 md:px-10 py-8 md:py-10">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                  Video Studio <Sparkles className="h-7 w-7 text-yellow-200" />
                </h1>
                <p className="text-white/85 mt-1.5 text-sm md:text-base">
                  Describe an idea. AI handles the rest.
                </p>
              </div>
              <button
                onClick={() => setAdvancedOpen(o => !o)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium backdrop-blur-md transition-all border border-white/20"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Advanced
                {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {selectedTemplate === "avatar" ? (
              /* ===== AVATAR CREATOR (replaces prompt+grid+generate when avatar template active) ===== */
              <div
                className="vs-avatar-panel"
                style={{ animation: "vsFadeUp 0.4s ease-out" }}
              >
                {/* Back link */}
                <button
                  onClick={() => { setSelectedTemplate(null); setAvatarScript(""); }}
                  className="text-sm text-white/80 hover:text-white underline-offset-2 hover:underline transition-colors mb-4 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to templates
                </button>

                {/* Card */}
                <div
                  className="rounded-2xl bg-white p-6 md:p-7"
                  style={{ boxShadow: "0 8px 40px rgba(99,102,241,0.18)" }}
                >
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <span className="text-xl leading-none">🧑</span> Avatar Video Creator
                  </h3>
                  <p className="text-sm text-slate-500 mb-5">
                    Type a script — your AI avatar speaks it directly to camera with real lip sync.
                  </p>

                  {/* Avatar selector + voice — two columns on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr] gap-4 mb-4">
                    {/* Avatar tile */}
                    <div className="text-center">
                      <div className="rounded-xl bg-gradient-to-br from-violet-400 to-pink-500 aspect-square flex items-center justify-center text-5xl shadow-md ring-2 ring-indigo-300">
                        🧑‍💼
                      </div>
                      <div className="text-xs text-slate-600 mt-1.5 font-medium">Adeel (default)</div>
                      <div className="text-[10px] text-slate-400">Upload coming soon</div>
                    </div>

                    {/* Voice */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span>🎙️</span> Voice
                      </div>
                      <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                        <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VOICE_OPTIONS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span>🌍</span> Language
                      </div>
                      <Select
                        value={language}
                        onValueChange={(v) => {
                          setLanguage(v);
                          const l = LANGUAGES.find(x => x.code === v);
                          if (l) setSelectedVoice(l.defaultVoice);
                        }}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Script textarea */}
                  <div className="mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      What should the avatar say?
                    </div>
                    <Textarea
                      value={avatarScript}
                      onChange={(e) => setAvatarScript(e.target.value)}
                      placeholder='e.g. "Hi, I am Adeel. Let me show you how the 420 System replaces your entire tech stack in under 5 minutes…"'
                      rows={5}
                      className="bg-slate-50 border-slate-200 rounded-xl text-base resize-none focus-visible:ring-1 focus-visible:ring-indigo-300"
                      style={{ boxShadow: "0 1px 2px rgba(99,102,241,.04)" }}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-slate-400">
                        {avatarScript.length} chars · ~{Math.max(1, Math.round(avatarScript.split(/\s+/).filter(Boolean).length / 2.5))}s read time
                      </span>
                      <span className="text-[11px] text-slate-400">Talking Head mode</span>
                    </div>
                  </div>

                  {/* Generate */}
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={generateAvatarVideo}
                      disabled={isGeneratingAvatar || !avatarScript.trim()}
                      className="group relative overflow-hidden rounded-full px-9 py-3.5 text-base font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                        boxShadow: "0 10px 40px rgba(99,102,241,.45)",
                        animation: !isGeneratingAvatar && avatarScript.trim() ? "vsPulseGlow 3s ease-in-out infinite" : undefined,
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)",
                          animation: "vsShimmer 3s ease-in-out infinite",
                        }}
                      />
                      <span className="relative flex items-center gap-2.5 min-w-[220px] justify-center">
                        {isGeneratingAvatar ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Bringing the avatar to life…
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5" />
                            Generate Avatar Video
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Prompt textarea — frosted glass */}
                <div className="rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl p-1">
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="A 30-second product ad showing why our AI replaces 10 tools at a fraction of the cost…"
                    className="border-0 bg-transparent min-h-[110px] resize-none text-base text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={4}
                  />
                </div>

                {/* Quick Create grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  {QUICK_TEMPLATES.map(t => {
                    const isSelected = selectedTemplate === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(isSelected ? null : t.id);
                          if (!isSelected && t.id !== "avatar" && !aiPrompt.trim()) setAiPrompt(t.placeholder);
                        }}
                        onMouseMove={handleCardTilt}
                        onMouseLeave={handleCardTiltReset}
                        className={`vs-quick-card group relative text-left rounded-xl bg-white border-l-4 ${t.border} px-3.5 py-3 transition-all hover:shadow-xl ${isSelected ? "ring-2 ring-white shadow-2xl scale-[1.02]" : ""}`}
                        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="text-2xl leading-none mb-2">{t.icon}</div>
                          {isSelected && (
                            <div className="rounded-full bg-emerald-500 p-1 shadow-sm">
                              <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-sm text-slate-800">{t.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.subtitle}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Generate button */}
                <div className="flex justify-center mt-7">
                  <button
                    onClick={generateVideo}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="group relative overflow-hidden rounded-full px-10 py-4 text-base font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                      boxShadow: "0 10px 40px rgba(99,102,241,.45)",
                      animation: !isGenerating && aiPrompt.trim() ? "vsPulseGlow 3s ease-in-out infinite" : undefined,
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)",
                        animation: "vsShimmer 3s ease-in-out infinite",
                      }}
                    />
                    <span className="relative flex items-center gap-2.5 min-w-[220px] justify-center">
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {genStep || "Creating your video…"}
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          Generate Video
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ===== ADVANCED PANEL ===== */}
        <section
          className="overflow-hidden transition-all duration-500"
          style={{
            maxHeight: advancedOpen ? "1000px" : "0",
            opacity: advancedOpen ? 1 : 0,
          }}
          aria-hidden={!advancedOpen}
        >
          <div className="rounded-2xl bg-white p-5 md:p-6" style={{ boxShadow: "0 4px 24px rgba(99,102,241,.08)" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AdvField icon="🎨" label="Quality">
                <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUALITY_LEVELS.map(q => (
                      <SelectItem key={q.id} value={q.id}>
                        <span className="font-medium">{q.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{q.hint}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AdvField>

              <AdvField icon="🌍" label="Language">
                <Select
                  value={language}
                  onValueChange={(v) => {
                    setLanguage(v);
                    const l = LANGUAGES.find(x => x.code === v);
                    if (l) setSelectedVoice(l.defaultVoice);
                  }}
                >
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AdvField>

              <AdvField icon="🎙️" label="Voice">
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AdvField>

              <AdvField icon="🎬" label="Style">
                <Select value={style} onValueChange={(v: any) => setStyle(v)}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AdvField>

              <AdvField icon="🎵" label="Music">
                <Select value={music} onValueChange={(v: any) => setMusic(v)}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MUSIC_MOODS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AdvField>

              <AdvField icon="🧠" label="AI Engine">
                <Select value={engine} onValueChange={(v: any) => setEngine(v)}>
                  <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENGINE_OPTIONS.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </AdvField>

              {quality === "cloud" && (
                <AdvField icon="☁️" label="Cloud Model">
                  <Select value={cloudModel} onValueChange={setCloudModel}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLOUD_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </AdvField>
              )}

              <div className="flex items-center gap-3 col-span-1">
                <FlaskConical className="h-4 w-4 text-violet-500" />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">A/B Test</div>
                  <div className="text-xs text-slate-500">Generate variant B</div>
                </div>
                <Switch checked={abTestEnabled} onCheckedChange={setAbTestEnabled} />
              </div>
            </div>
          </div>
        </section>

        {/* ===== TAB BAR ===== */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {[
            { id: "videos", label: "My Videos", icon: Film, count: stats.total },
            { id: "rendering", label: "Rendering", icon: Loader2, count: activeRenders.length },
            { id: "analytics", label: "Analytics", icon: BarChart3, count: null },
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id as any); setSelectedProject(null); }}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Icon className={`h-4 w-4 ${active && t.id === "rendering" && activeRenders.length > 0 ? "animate-spin" : ""}`} />
                {t.label}
                {t.count !== null && t.count > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                    {t.count}
                  </span>
                )}
                {active && (
                  <span
                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
                    style={{ animation: "vsFadeUp 0.3s ease-out" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ===== MY VIDEOS TAB ===== */}
        {tab === "videos" && (
          <div style={{ animation: "vsFadeUp 0.4s ease-out" }}>
            {selectedProject ? (
              <SceneEditor
                project={selectedProject}
                sceneEdits={sceneEdits}
                setSceneEdits={setSceneEdits}
                selectedScene={selectedScene}
                setSelectedScene={setSelectedScene}
                renderQuality={renderQuality}
                setRenderQuality={setRenderQuality}
                onClose={() => setSelectedProject(null)}
                onSave={() => updateScenes.mutate({ id: selectedProject.id, scenes: sceneEdits })}
                onRender={() => startRender.mutate({ ...selectedProject, scenes: sceneEdits })}
                isRendering={startRender.isPending}
              />
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Film className="h-14 w-14 text-indigo-300" style={{ animation: "vsFloat 3s ease-in-out infinite" }} />}
                title="No videos yet"
                subtitle="Create your first AI-powered video in seconds with the creator above"
                cta={{
                  label: "Create Your First Video",
                  icon: <ArrowUp className="h-4 w-4" />,
                  onClick: () => heroRef.current?.scrollIntoView({ behavior: "smooth" }),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((p: any) => (
                  <VideoCard
                    key={p.id}
                    project={p}
                    onOpen={() => openProject(p)}
                    onWatch={() => { trackVideoAction(p.id, "watch"); setPlayerVideo(p); }}
                    onDownload={() => trackVideoAction(p.id, "download")}
                    onPublish={(platform) => publishVideo(p.id, platform, p.video_url || p.rendered_video_url, p.title)}
                    onUpgrade={() => {
                      callWebhook(WEBHOOKS.VIDEO_ORCHESTRATE, {
                        trigger_type: "manual_render", content: p.title || "Premium upgrade",
                        project_id: p.id, priority: "high", quality_tier: "premium",
                      }, tid!).then(() => {
                        toast({ title: "Upgrading to Premium", description: "Re-rendering with AI motion." });
                        setTab("rendering");
                      }).catch(() => {});
                    }}
                    onDelete={() => deleteProject.mutate(p.id)}
                    parseScenes={parseScenes}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== RENDERING TAB ===== */}
        {tab === "rendering" && (
          <div className="space-y-3" style={{ animation: "vsFadeUp 0.4s ease-out" }}>
            {renderJobs.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-12 w-12 text-emerald-400" style={{ animation: "vsFloat 3s ease-in-out infinite" }} />}
                title="All caught up"
                subtitle="No videos rendering right now."
              />
            ) : (
              <>
                {renderJobs.some((j: any) => j.status === "complete" || j.status === "completed" || j.status === "failed") && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => clearCompleted.mutate()}
                      disabled={clearCompleted.isPending}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Clear completed
                    </button>
                  </div>
                )}
                {renderJobs.map((job: any) => (
                  <RenderRow
                    key={job.id}
                    job={job}
                    onDelete={() => deleteQueueItem.mutate(job.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ===== ANALYTICS TAB ===== */}
        {tab === "analytics" && (
          <div className="space-y-6" style={{ animation: "vsFadeUp 0.4s ease-out" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Film className="h-5 w-5" />} value={stats.total} label="Videos Created" color="indigo" />
              <StatCard icon={<Eye className="h-5 w-5" />} value={stats.totalViews} label="Total Views" color="pink" />
              <StatCard icon={<Heart className="h-5 w-5" />} value={stats.totalEngagement} label="Engagement" color="rose" />
              <StatCard icon={<Send className="h-5 w-5" />} value={stats.published} label="Published Posts" color="emerald" />
            </div>

            {/* AIDA Viewer Intelligence */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 4px 24px rgba(99,102,241,.08)" }}>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-indigo-500" /> Viewer Intelligence (AIDA)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { stage: "attention", icon: Eye, color: "blue", label: "Attention", desc: "0-25% watched" },
                  { stage: "interest", icon: Zap, color: "amber", label: "Interest", desc: "25-50% watched" },
                  { stage: "desire", icon: Heart, color: "rose", label: "Desire", desc: "50-75% watched" },
                  { stage: "action", icon: CheckCircle, color: "emerald", label: "Action", desc: "75%+ watched" },
                ] as const).map(stage => {
                  const audience = aidaAudiences.find((a: any) => a.aida_stage === stage.stage);
                  const Icon = stage.icon;
                  return (
                    <div key={stage.stage} className={`rounded-xl border border-${stage.color}-100 bg-${stage.color}-50/50 p-4`}>
                      <div className={`flex items-center gap-2 mb-2 text-${stage.color}-600`}>
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">{stage.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{audience?.member_count || 0}</div>
                      <div className="text-[11px] text-slate-500">{stage.desc}</div>
                    </div>
                  );
                })}
              </div>
              {aidaViews.length > 0 && (
                <div className="mt-4 text-xs text-slate-500">
                  {aidaViews.length} tracked viewer sessions
                </div>
              )}
            </div>

            {/* AI activity */}
            <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 4px 24px rgba(99,102,241,.08)" }}>
              <h3 className="text-sm font-bold text-slate-800 mb-4">Recent AI Activity</h3>
              {projects.filter((p: any) => p.ai_generated).length === 0 ? (
                <p className="text-xs text-slate-500">No AI-generated videos yet.</p>
              ) : (
                <div className="space-y-2">
                  {projects.filter((p: any) => p.ai_generated).slice(0, 6).map((p: any) => {
                    const st = STATUS_LABELS[p.status] || { label: p.status, color: "bg-slate-200 text-slate-600" };
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {(p.source_type || "manual").replace(/_/g, " ")} · {timeAgo(p.created_at)}
                          </p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {templates.length > 0 && (
              <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 4px 24px rgba(99,102,241,.08)" }}>
                <h3 className="text-sm font-bold text-slate-800 mb-4">Top Templates</h3>
                <div className="space-y-2">
                  {templates.slice(0, 5).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-slate-700">{t.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{t.usage_count || 0} uses</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== VIDEO PLAYER MODAL ===== */}
      <Dialog open={!!playerVideo} onOpenChange={(open) => !open && setPlayerVideo(null)}>
        <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden border-0">
          {playerVideo && (
            <div>
              <div className="aspect-video bg-black">
                <video
                  src={playerVideo.video_url || playerVideo.rendered_video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-slate-800">{playerVideo.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {timeAgo(playerVideo.created_at)} · {playerVideo.aspect_ratio || "9:16"}
                </p>
                <div className="flex gap-2 mt-4">
                  <a
                    href={playerVideo.video_url || playerVideo.rendered_video_url}
                    download
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors">
                        <Share2 className="h-3.5 w-3.5" /> Publish
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {["instagram", "tiktok", "facebook", "linkedin", "youtube"].map(pl => {
                        const Icon = PLATFORM_ICONS[pl] || Share2;
                        return (
                          <DropdownMenuItem key={pl} onClick={() => publishVideo(playerVideo.id, pl, playerVideo.video_url || playerVideo.rendered_video_url, playerVideo.title)}>
                            <Icon className="h-4 w-4 mr-2" /> {pl.charAt(0).toUpperCase() + pl.slice(1)}
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href="/marketing/social-commander">
                          <Send className="h-4 w-4 mr-2" /> Open Social Commander
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== FROM SCRATCH (preserved) ===== */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader><DialogTitle>New Video Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Video title…" className="mt-1" />
            </div>
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
            <Button
              className="w-full bg-indigo-500 hover:bg-indigo-600"
              disabled={createProject.isPending || !newTitle.trim()}
              onClick={() => createProject.mutate({
                title: newTitle, format: createFormat,
                scenes: [
                  { scene_number: 1, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" },
                  { scene_number: 2, duration_s: 5, visual_prompt: "", voiceover: "", transition: "dissolve" },
                  { scene_number: 3, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" },
                ],
              })}
            >
              {createProject.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function AdvField({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50",
    pink: "text-pink-600 bg-pink-50",
    rose: "text-rose-600 bg-rose-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };
  return (
    <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 4px 24px rgba(99,102,241,.08)" }}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${colorMap[color] || "text-slate-600 bg-slate-50"}`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-800">{value.toLocaleString()}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function EmptyState({
  icon, title, subtitle, cta,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cta?: { label: string; icon?: React.ReactNode; onClick: () => void };
}) {
  return (
    <div className="text-center py-16 px-6">
      <div className="inline-flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">{subtitle}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
        >
          {cta.icon}
          {cta.label}
        </button>
      )}
    </div>
  );
}

function VideoCard({
  project, onOpen, onWatch, onDownload, onPublish, onUpgrade, onDelete, parseScenes,
}: {
  project: any;
  onOpen: () => void;
  onWatch: () => void;
  onDownload: () => void;
  onPublish: (platform: string) => void;
  onUpgrade: () => void;
  onDelete: () => void;
  parseScenes: (item: any) => any[];
}) {
  const p = project;
  const sceneCount = parseScenes(p).length;
  const url = p.rendered_video_url || p.video_url;
  const status = STATUS_LABELS[p.render_status || p.status] || { label: p.status || "draft", color: "bg-slate-200 text-slate-600" };
  const tier = p.target_duration_seconds && p.target_duration_seconds > 60 ? "premium" : "standard";

  // Type-based gradient placeholder
  const gradientByType: Record<string, string> = {
    short_form: "linear-gradient(135deg,#ec4899,#a855f7)",
    long_form: "linear-gradient(135deg,#3b82f6,#06b6d4)",
    ad_commercial: "linear-gradient(135deg,#f97316,#ef4444)",
    explainer: "linear-gradient(135deg,#06b6d4,#3b82f6)",
    avatar: "linear-gradient(135deg,#8b5cf6,#ec4899)",
    testimonial: "linear-gradient(135deg,#f59e0b,#f97316)",
    announcement: "linear-gradient(135deg,#10b981,#059669)",
  };
  const grad = gradientByType[p.video_type] || gradientByType.short_form;

  return (
    <div
      className="vs-video-card group rounded-2xl bg-white overflow-hidden cursor-pointer transition-all"
      style={{
        boxShadow: "0 4px 24px rgba(99,102,241,0.08)",
        willChange: "transform",
      }}
      onMouseMove={handleCardTilt}
      onMouseLeave={handleCardTiltReset}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-video"
        style={{ background: p.thumbnail_url ? `url(${p.thumbnail_url}) center/cover` : grad }}
      >
        {!p.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-12 w-12 text-white/40" />
          </div>
        )}
        {url && (
          <button
            onClick={(e) => { e.stopPropagation(); onWatch(); }}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100"
          >
            <span className="rounded-full bg-white/95 backdrop-blur p-3.5 shadow-2xl">
              <Play className="h-6 w-6 text-slate-800 fill-slate-800" />
            </span>
          </button>
        )}
        {p.duration_seconds && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
            {formatDuration(p.duration_seconds)}
          </span>
        )}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 leading-snug min-h-[2.5rem]">
          {p.title || "Untitled"}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${tier === "premium" ? "bg-violet-500" : "bg-slate-300"}`} />
          <span className="capitalize">{tier}</span>
          <span>·</span>
          <span>{sceneCount || "?"} scenes</span>
          <span>·</span>
          <span>{timeAgo(p.created_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-4">
          {url ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onWatch(); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-colors"
                title="Watch"
              >
                <Play className="h-3.5 w-3.5" /> Watch
              </button>
              <a
                href={url}
                download
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                className="flex items-center justify-center px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e: any) => e.stopPropagation()}>
                  <button
                    className="flex items-center justify-center px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Publish"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["instagram", "tiktok", "facebook", "linkedin", "youtube"].map(pl => {
                    const Icon = PLATFORM_ICONS[pl] || Share2;
                    return (
                      <DropdownMenuItem key={pl} onClick={() => onPublish(pl)}>
                        <Icon className="h-4 w-4 mr-2" /> {pl.charAt(0).toUpperCase() + pl.slice(1)}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/marketing/social-commander">
                      <Send className="h-4 w-4 mr-2" /> Open Social Commander
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex items-center justify-center px-2.5 py-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium"
            >
              {p.status === "script_ready" ? "Render now" : "Edit"}
            </button>
          )}
        </div>

        {/* Upgrade pill */}
        {url && tier === "standard" && p.render_status === "complete" && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-50 to-pink-50 hover:from-violet-100 hover:to-pink-100 text-violet-700 text-xs font-medium transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> Upgrade to Premium
          </button>
        )}
      </div>
    </div>
  );
}

function RenderRow({ job, onDelete }: { job: any; onDelete: () => void }) {
  const isDone = job.status === "complete" || job.status === "completed" || job.status === "failed";
  const isFailed = job.status === "failed";
  const status = STATUS_LABELS[job.status] || { label: job.status || "queued", color: "bg-slate-200 text-slate-600" };
  const progress = job.scenes_total ? (job.scenes_complete / job.scenes_total) * 100 : 0;

  return (
    <div
      className="rounded-2xl bg-white p-5 transition-all"
      style={{
        boxShadow: isDone ? "0 4px 24px rgba(99,102,241,.06)" : "0 4px 24px rgba(99,102,241,.18)",
        animation: !isDone ? "vsBreathe 2.5s ease-in-out infinite" : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-800 truncate">
            {job.project_title || job.title || `Render ${job.id?.slice(0, 8) || ""}`}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
            <span className={`px-2 py-0.5 rounded-full font-semibold ${status.color}`}>{status.label}</span>
            {job.tier === "premium" && (
              <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-semibold">Premium</span>
            )}
            {job.trigger_type && job.trigger_type !== "manual_render" && (
              <span className="px-2 py-0.5 rounded-full bg-slate-50">{job.trigger_type.replace(/_/g, " ")}</span>
            )}
            <span>· started {timeAgo(job.created_at)}</span>
          </div>
        </div>
        {isDone && (
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isDone && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(progress, 6)}%`,
                background: "linear-gradient(90deg,#6366F1,#A855F7,#EC4899)",
                transition: "width 0.5s ease",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)",
                animation: "vsShimmer 2s linear infinite",
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {progress > 0 ? `${Math.round(progress)}% — ${job.tier === "premium" ? "Premium ~5 min/scene" : "Standard ~1 min total"}` : "Queued — preparing pipeline…"}
          </p>
        </div>
      )}

      {(job.status === "complete" || job.status === "completed") && job.result_url && (
        <div className="flex gap-2 mt-3">
          <a
            href={job.result_url}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors"
          >
            <Play className="h-3.5 w-3.5" /> Watch
          </a>
          <a
            href={job.result_url}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </div>
      )}

      {isFailed && job.error && (
        <p className="text-xs text-rose-500 mt-2">{job.error}</p>
      )}
    </div>
  );
}

function SceneEditor({
  project, sceneEdits, setSceneEdits, selectedScene, setSelectedScene,
  renderQuality, setRenderQuality, onClose, onSave, onRender, isRendering,
}: {
  project: any;
  sceneEdits: any[];
  setSceneEdits: (s: any[]) => void;
  selectedScene: number;
  setSelectedScene: (i: number) => void;
  renderQuality: "standard" | "premium";
  setRenderQuality: (q: "standard" | "premium") => void;
  onClose: () => void;
  onSave: () => void;
  onRender: () => void;
  isRendering: boolean;
}) {
  const updateScene = (idx: number, patch: any) => {
    const updated = [...sceneEdits];
    updated[idx] = { ...updated[idx], ...patch };
    setSceneEdits(updated);
  };
  const addScene = () => {
    setSceneEdits([...sceneEdits, { scene_number: sceneEdits.length + 1, duration_s: 5, visual_prompt: "", voiceover: "", transition: "fade" }]);
  };
  const removeScene = (idx: number) => {
    if (sceneEdits.length <= 1) return;
    setSceneEdits(sceneEdits.filter((_, i) => i !== idx));
    if (selectedScene >= sceneEdits.length - 1) setSelectedScene(Math.max(0, sceneEdits.length - 2));
  };

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: "0 4px 24px rgba(99,102,241,.08)" }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-bold text-slate-800">{project.title}</h2>
            <p className="text-xs text-slate-500">{sceneEdits.length} scenes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={renderQuality} onValueChange={(v: any) => setRenderQuality(v)}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={onSave} className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors">
            Save
          </button>
          <button
            onClick={onRender}
            disabled={isRendering}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs font-medium transition-colors disabled:opacity-60"
          >
            {isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Render
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scenes</span>
            <button onClick={addScene} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {sceneEdits.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelectedScene(i)}
              className={`w-full text-left rounded-xl border p-3 text-xs transition-all ${selectedScene === i ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700">Scene {i + 1}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-500">{s.duration_s || 5}s</span>
              </div>
              <p className="text-slate-500 line-clamp-2">{s.visual_prompt || s.visual_description || "No description"}</p>
              {(s.voiceover || s.voiceover_text) && (
                <p className="text-indigo-500 mt-0.5 line-clamp-1 text-[10px]">{s.voiceover || s.voiceover_text}</p>
              )}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-3">
          {sceneEdits[selectedScene] && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-800">Scene {selectedScene + 1}</h3>
                <button
                  onClick={() => removeScene(selectedScene)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Visual</Label>
                <Textarea
                  className="mt-1 text-sm bg-slate-50 border-slate-200"
                  rows={3}
                  value={sceneEdits[selectedScene].visual_prompt || sceneEdits[selectedScene].visual_description || ""}
                  onChange={(e) => updateScene(selectedScene, { visual_prompt: e.target.value, visual_description: e.target.value })}
                  placeholder="Describe what the viewer sees…"
                />
              </div>
              <div>
                <Label className="text-xs">Voiceover</Label>
                <Textarea
                  className="mt-1 text-sm bg-slate-50 border-slate-200"
                  rows={2}
                  value={sceneEdits[selectedScene].voiceover || sceneEdits[selectedScene].voiceover_text || ""}
                  onChange={(e) => updateScene(selectedScene, { voiceover: e.target.value, voiceover_text: e.target.value })}
                  placeholder="Narration text…"
                />
              </div>
              <div>
                <Label className="text-xs">Overlay text</Label>
                <Input
                  className="mt-1 bg-slate-50 border-slate-200"
                  value={sceneEdits[selectedScene].overlay_text || ""}
                  onChange={(e) => updateScene(selectedScene, { overlay_text: e.target.value })}
                  placeholder="On-screen caption"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
