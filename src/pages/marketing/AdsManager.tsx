import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Target, Plus, TrendingUp, DollarSign, MousePointerClick,
  BarChart3, Eye, Pause, Play, Trash2, RefreshCw, Zap,
  ArrowLeft, Settings, Megaphone, Search, Image, Video,
  ExternalLink, Copy, FileText, Sparkles, Brain,
} from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat("en-US").format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return <Badge className={map[status] || map.draft}>{status}</Badge>;
}

function PlatformBadge({ platform }: { platform: string }) {
  const isGoogle = platform === "google_ads";
  return (
    <Badge className={isGoogle ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"}>
      {isGoogle ? "Google Ads" : "Meta Ads"}
    </Badge>
  );
}

const GOOGLE_TYPES = ["search", "display", "video", "shopping"];
const META_TYPES = ["feed", "stories", "reels", "video"];
const OBJECTIVES = ["lead_generation", "brand_awareness", "website_traffic", "conversions", "sales"];

export default function AdsManager() {
  const { tenantConfig } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreativeDialogOpen, setIsCreativeDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create campaign form
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState("google_ads");
  const [formType, setFormType] = useState("search");
  const [formObjective, setFormObjective] = useState("lead_generation");
  const [formBudget, setFormBudget] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formKeywords, setFormKeywords] = useState("");

  // Creative form
  const [creativeCampaignId, setCreativeCampaignId] = useState("");
  const [creativePlatform, setCreativePlatform] = useState("google_ads");
  const [creativeVariants, setCreativeVariants] = useState("3");
  const [creativeBrief, setCreativeBrief] = useState("");

  // Settings
  const [googleCreds, setGoogleCreds] = useState<Record<string, string>>({});
  const [metaCreds, setMetaCreds] = useState<Record<string, string>>({});

  // Ad Intelligence state
  const [intelMode, setIntelMode] = useState("manual");
  const [intelMaxComp, setIntelMaxComp] = useState("5");
  const [intelAdsPerComp, setIntelAdsPerComp] = useState("5");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [intelSubTab, setIntelSubTab] = useState("patterns");

  // ─── Queries ───
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["ad_campaigns", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ad_campaigns" as any).select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: creatives = [], isLoading: loadingCreatives } = useQuery({
    queryKey: ["ad_creatives", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ad_creatives" as any).select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: conversions = [], isLoading: loadingConversions } = useQuery({
    queryKey: ["ad_conversions", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ad_conversions" as any).select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: adAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["ad_accounts", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ad_accounts" as any).select("*")
        .eq("tenant_id", tenantConfig.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: performanceLog = [], isLoading: loadingPerformance } = useQuery({
    queryKey: ["ad_performance_log", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ad_performance_log" as any).select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("log_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // ─── Ad Intelligence Queries ───
  const { data: intelReports = [], isLoading: loadingIntelReports } = useQuery({
    queryKey: ["ad_script_intelligence", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ad_script_intelligence" as any).select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const { data: competitorAds = [] } = useQuery({
    queryKey: ["competitor_ad_intelligence", tenantConfig?.id, selectedReport?.id],
    queryFn: async () => {
      if (!tenantConfig?.id || !selectedReport?.id) return [];
      const { data, error } = await supabase
        .from("competitor_ad_intelligence" as any).select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("running_days", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantConfig?.id && !!selectedReport?.id,
  });

  // ─── Computed ───
  const metrics = useMemo(() => {
    const activeCampaigns = campaigns.filter((c: any) => c.status === "active");
    const totalSpend = campaigns.reduce((s: number, c: any) => s + (Number(c.total_spend) || 0), 0);
    const totalImpressions = campaigns.reduce((s: number, c: any) => s + (Number(c.impressions) || 0), 0);
    const totalClicks = campaigns.reduce((s: number, c: any) => s + (Number(c.clicks) || 0), 0);
    const totalConversions = campaigns.reduce((s: number, c: any) => s + (Number(c.conversions) || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const overallRoas = totalSpend > 0
      ? conversions.reduce((s: number, c: any) => s + (Number(c.conversion_value) || 0), 0) / totalSpend
      : 0;
    const googleCampaigns = campaigns.filter((c: any) => c.platform === "google_ads");
    const metaCampaigns = campaigns.filter((c: any) => c.platform === "meta_ads");
    const googleSpend = googleCampaigns.reduce((s: number, c: any) => s + (Number(c.total_spend) || 0), 0);
    const metaSpend = metaCampaigns.reduce((s: number, c: any) => s + (Number(c.total_spend) || 0), 0);
    const googleConnected = adAccounts.some((a: any) => a.platform === "google_ads" && a.is_active);
    const metaConnected = adAccounts.some((a: any) => a.platform === "meta_ads" && a.is_active);
    return {
      activeCampaigns: activeCampaigns.length, totalCampaigns: campaigns.length,
      totalSpend, totalImpressions, totalClicks, totalConversions, avgCtr, overallRoas,
      googleCampaigns: googleCampaigns.length, metaCampaigns: metaCampaigns.length,
      googleSpend, metaSpend, googleConnected, metaConnected,
    };
  }, [campaigns, conversions, adAccounts]);

  // ─── Mutations ───
  const createCampaign = useMutation({
    mutationFn: async () => {
      return callWebhook(WEBHOOKS.CREATE_AD_CAMPAIGN, {
        tenant_id: tenantConfig!.id,
        name: formName || "",
        platform: formPlatform,
        campaign_type: formType,
        objective: formObjective,
        daily_budget: Number(formBudget) || 0,
        target_description: formTarget,
        keywords: formKeywords,
      }, tenantConfig!.id);
    },
    onSuccess: () => {
      toast({ title: "Campaign Created", description: "AI has generated your campaign strategy and creatives" });
      queryClient.invalidateQueries({ queryKey: ["ad_campaigns", tenantConfig?.id] });
      queryClient.invalidateQueries({ queryKey: ["ad_creatives", tenantConfig?.id] });
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
    },
  });

  const generateCreatives = useMutation({
    mutationFn: async () => {
      return callWebhook(WEBHOOKS.GENERATE_AD_CREATIVE, {
        tenant_id: tenantConfig!.id,
        campaign_id: creativeCampaignId,
        platform: creativePlatform,
        variants: Number(creativeVariants) || 3,
        brief: creativeBrief,
      }, tenantConfig!.id);
    },
    onSuccess: () => {
      toast({ title: "Creatives Generated", description: "AI has generated ad creative variants" });
      queryClient.invalidateQueries({ queryKey: ["ad_creatives", tenantConfig?.id] });
      setIsCreativeDialogOpen(false);
    },
  });

  const resetCreateForm = () => {
    setFormName(""); setFormPlatform("google_ads"); setFormType("search");
    setFormObjective("lead_generation"); setFormBudget(""); setFormTarget(""); setFormKeywords("");
  };

  const runIntelligence = useMutation({
    mutationFn: async () => {
      return callWebhook(WEBHOOKS.AD_INTELLIGENCE, {
        tenant_id: tenantConfig!.id,
        mode: intelMode,
        max_competitors: Number(intelMaxComp),
        ads_per_competitor: Number(intelAdsPerComp),
      }, tenantConfig!.id);
    },
    onSuccess: (result) => {
      toast({ title: "Intelligence Complete", description: `Found ${(result?.data as any)?.patterns_found || 0} patterns, generated ${(result?.data as any)?.scripts_generated || 0} scripts` });
      queryClient.invalidateQueries({ queryKey: ["ad_script_intelligence", tenantConfig?.id] });
      queryClient.invalidateQueries({ queryKey: ["competitor_ad_intelligence", tenantConfig?.id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Intelligence analysis failed", variant: "destructive" });
    },
  });

  const createFromScript = (script: any) => {
    setFormName(script.title || "");
    setFormPlatform("meta_ads");
    setFormType("feed");
    setFormObjective("conversions");
    setFormBudget("");
    setFormTarget(script.target_audience || "");
    setFormKeywords("");
    setIsCreateOpen(true);
  };

  const toggleCampaign = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("ad_campaigns" as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id).eq("tenant_id", tenantConfig!.id);
    queryClient.invalidateQueries({ queryKey: ["ad_campaigns", tenantConfig?.id] });
    toast({ title: newStatus === "active" ? "Campaign Resumed" : "Campaign Paused" });
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("ad_creatives" as any).delete().eq("campaign_id", id).eq("tenant_id", tenantConfig!.id);
    await supabase.from("ad_campaigns" as any).delete().eq("id", id).eq("tenant_id", tenantConfig!.id);
    queryClient.invalidateQueries({ queryKey: ["ad_campaigns", tenantConfig?.id] });
    queryClient.invalidateQueries({ queryKey: ["ad_creatives", tenantConfig?.id] });
    setDeleteConfirm(null);
    toast({ title: "Deleted", description: "Campaign and creatives removed" });
  };

  const saveCredentials = async (platform: string, credentials: Record<string, string>) => {
    const updateData: Record<string, string> = {};
    Object.entries(credentials).forEach(([key, value]) => {
      if (value && value.trim()) updateData[key] = value.trim();
    });
    if (Object.keys(updateData).length === 0) return;
    const { error } = await supabase.from("tenant_config").update(updateData).eq("id", tenantConfig!.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Credentials Saved", description: `${platform} credentials updated` });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["ad_campaigns", tenantConfig?.id] });
    queryClient.invalidateQueries({ queryKey: ["ad_creatives", tenantConfig?.id] });
    queryClient.invalidateQueries({ queryKey: ["ad_conversions", tenantConfig?.id] });
    queryClient.invalidateQueries({ queryKey: ["ad_accounts", tenantConfig?.id] });
    queryClient.invalidateQueries({ queryKey: ["ad_performance_log", tenantConfig?.id] });
    toast({ title: "Refreshed" });
  };

  // ─── Conversion funnel ───
  const funnel = useMemo(() => {
    const impressions = metrics.totalImpressions;
    const clicks = metrics.totalClicks;
    const leads = conversions.filter((c: any) => ["form_submit", "signup"].includes(c.conversion_type)).length;
    const customers = conversions.filter((c: any) => c.conversion_type === "purchase" || c.deal_id).length;
    const revenue = conversions.reduce((s: number, c: any) => s + (Number(c.conversion_value) || 0), 0);
    return { impressions, clicks, leads, customers, revenue };
  }, [metrics, conversions]);

  const utmBreakdown = useMemo(() => {
    const groups: Record<string, { count: number; value: number }> = {};
    conversions.forEach((c: any) => {
      const src = c.utm_source || c.ad_platform || "Direct";
      if (!groups[src]) groups[src] = { count: 0, value: 0 };
      groups[src].count++;
      groups[src].value += Number(c.conversion_value) || 0;
    });
    return groups;
  }, [conversions]);

  const isLoading = loadingCampaigns || loadingCreatives || loadingConversions || loadingAccounts || loadingPerformance;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-32" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const campaignTypes = formPlatform === "google_ads" ? GOOGLE_TYPES : META_TYPES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/marketing")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" /> Ads Manager
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered Google Ads + Meta Ads campaigns</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refreshAll}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => setIsCreativeDialogOpen(true)}>
            <Image className="h-4 w-4 mr-1" />Generate Creatives
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" />Create AI Campaign
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="intelligence"><Brain className="h-4 w-4 mr-1" />Ad Intelligence</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: OVERVIEW ═══ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Campaigns", value: metrics.activeCampaigns, icon: Target, color: "text-green-500", bg: "bg-green-500/10" },
              { label: "Total Spend", value: fmt(metrics.totalSpend), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Avg CTR", value: fmtPct(metrics.avgCtr), icon: MousePointerClick, color: "text-purple-500", bg: "bg-purple-500/10" },
              { label: "Total Conversions", value: fmtNum(metrics.totalConversions), icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Platform split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" /> Google Ads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Campaigns</span><span className="font-medium">{metrics.googleCampaigns}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spend</span><span className="font-medium">{fmt(metrics.googleSpend)}</span>
                </div>
                <Badge className={metrics.googleConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"}>
                  {metrics.googleConnected ? "Connected" : "Not Connected"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-indigo-500" /> Meta Ads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Campaigns</span><span className="font-medium">{metrics.metaCampaigns}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spend</span><span className="font-medium">{fmt(metrics.metaSpend)}</span>
                </div>
                <Badge className={metrics.metaConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"}>
                  {metrics.metaConnected ? "Connected" : "Not Connected"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Recent campaigns */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No campaigns yet. Create your first AI-powered campaign!</p>
                  <Button size="sm" className="mt-3" onClick={() => setIsCreateOpen(true)}>
                    <Sparkles className="h-4 w-4 mr-1" />Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name || "Unnamed Campaign"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <PlatformBadge platform={c.platform} />
                          <StatusBadge status={c.status} />
                          {c.campaign_type && <Badge variant="outline" className="text-xs">{c.campaign_type}</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-0.5">
                        <p>Spend: {fmt(Number(c.total_spend) || 0)}</p>
                        <p>Conv: {fmtNum(Number(c.conversions) || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2: CAMPAIGNS ═══ */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">All Campaigns ({campaigns.length})</h2>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />New Campaign
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No campaigns yet</p>
                <p className="text-sm mt-1">Create your first AI-powered ad campaign to get started.</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1" />Create AI Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {campaigns.map((c: any) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{c.name || "Unnamed Campaign"}</CardTitle>
                        <div className="flex items-center gap-2 mt-1.5">
                          <PlatformBadge platform={c.platform} />
                          <StatusBadge status={c.status} />
                          {c.campaign_type && <Badge variant="outline" className="text-xs capitalize">{c.campaign_type}</Badge>}
                          {c.ai_generated && (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                              <Sparkles className="h-3 w-3 mr-1" />AI
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Budget: {c.daily_budget ? `${fmt(Number(c.daily_budget))}/day` : c.lifetime_budget ? `${fmt(Number(c.lifetime_budget))} lifetime` : "—"}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50 text-center">
                        <p className="font-semibold">{fmtNum(Number(c.impressions) || 0)}</p><p className="text-muted-foreground">Impressions</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50 text-center">
                        <p className="font-semibold">{fmtNum(Number(c.clicks) || 0)}</p><p className="text-muted-foreground">Clicks</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50 text-center">
                        <p className="font-semibold">{fmtNum(Number(c.conversions) || 0)}</p><p className="text-muted-foreground">Conversions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c.click_through_rate != null && <span>CTR: {fmtPct(Number(c.click_through_rate))}</span>}
                      {c.cost_per_click != null && <span>CPC: {fmt(Number(c.cost_per_click))}</span>}
                      {c.roas != null && <span>ROAS: {Number(c.roas).toFixed(2)}x</span>}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm"
                        onClick={() => toggleCampaign(c.id, c.status)}
                        disabled={c.status === "draft" || c.status === "completed"}>
                        {c.status === "active" ? <><Pause className="h-3 w-3 mr-1" />Pause</> : <><Play className="h-3 w-3 mr-1" />Resume</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(c.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB 3: CREATIVES ═══ */}
        <TabsContent value="creatives" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Creative Library ({creatives.length})</h2>
            <Button size="sm" onClick={() => setIsCreativeDialogOpen(true)}>
              <Image className="h-4 w-4 mr-1" />Generate Creatives
            </Button>
          </div>

          {creatives.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No creatives yet</p>
                <p className="text-sm mt-1">Generate AI-powered ad creatives for your campaigns.</p>
                <Button className="mt-4" onClick={() => setIsCreativeDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1" />Generate Creatives
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group by campaign */}
              {(() => {
                const grouped: Record<string, any[]> = {};
                creatives.forEach((cr: any) => {
                  const cid = cr.campaign_id || "uncategorized";
                  if (!grouped[cid]) grouped[cid] = [];
                  grouped[cid].push(cr);
                });
                return Object.entries(grouped).map(([cid, crs]) => {
                  const camp = campaigns.find((c: any) => c.id === cid);
                  const sorted = [...crs].sort((a: any, b: any) => (a.ai_variant || "").localeCompare(b.ai_variant || ""));
                  return (
                    <div key={cid} className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {camp ? camp.name : "Unlinked Creatives"}
                      </h3>
                      {/* A/B comparison if multiple variants */}
                      {sorted.length > 1 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sorted.map((cr: any) => (
                            <CreativeCard key={cr.id} creative={cr} isBest={false} />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {sorted.map((cr: any) => (
                            <CreativeCard key={cr.id} creative={cr} isBest={false} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </>
          )}
        </TabsContent>

        {/* ═══ TAB 4: CONVERSIONS ═══ */}
        <TabsContent value="conversions" className="space-y-6">
          {/* Funnel */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {[
                  { label: "Impressions", value: fmtNum(funnel.impressions) },
                  { label: "Clicks", value: fmtNum(funnel.clicks), pct: funnel.impressions > 0 ? ((funnel.clicks / funnel.impressions) * 100).toFixed(1) + "%" : "—" },
                  { label: "Leads", value: fmtNum(funnel.leads), pct: funnel.clicks > 0 ? ((funnel.leads / funnel.clicks) * 100).toFixed(1) + "%" : "—" },
                  { label: "Customers", value: fmtNum(funnel.customers), pct: funnel.leads > 0 ? ((funnel.customers / funnel.leads) * 100).toFixed(1) + "%" : "—" },
                  { label: "Revenue", value: fmt(funnel.revenue) },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="text-center p-3 rounded-lg bg-muted/50 min-w-[100px]">
                      <p className="text-lg font-bold">{step.value}</p>
                      <p className="text-xs text-muted-foreground">{step.label}</p>
                      {step.pct && <p className="text-[10px] text-muted-foreground mt-0.5">{step.pct}</p>}
                    </div>
                    {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* UTM breakdown */}
          {Object.keys(utmBreakdown).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(utmBreakdown).map(([src, data]) => (
                <Card key={src}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium capitalize">{src}</p>
                    <p className="text-lg font-bold">{data.count}</p>
                    <p className="text-xs text-muted-foreground">{fmt(data.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Conversion table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Conversions</CardTitle></CardHeader>
            <CardContent>
              {conversions.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">No conversions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Platform</th>
                        <th className="py-2 pr-3">Source</th>
                        <th className="py-2 pr-3">Value</th>
                        <th className="py-2">Attribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.slice(0, 20).map((c: any) => (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                          <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{c.conversion_type || "—"}</Badge></td>
                          <td className="py-2 pr-3">{c.ad_platform ? <PlatformBadge platform={c.ad_platform} /> : "—"}</td>
                          <td className="py-2 pr-3 text-xs">{c.utm_source || "Direct"}</td>
                          <td className="py-2 pr-3 text-xs font-medium">{c.conversion_value ? fmt(Number(c.conversion_value)) : "—"}</td>
                          <td className="py-2 text-xs">{c.attribution_model || "last_click"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB 5: SETTINGS ═══ */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Ads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" /> Google Ads
                  <Badge className={metrics.googleConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ml-auto" : "bg-muted text-muted-foreground ml-auto"}>
                    {metrics.googleConnected ? "Connected" : "Not Connected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "google_ads_customer_id", label: "Customer ID", type: "text" },
                  { key: "google_ads_developer_token", label: "Developer Token", type: "password" },
                  { key: "google_ads_client_id", label: "OAuth Client ID", type: "text" },
                  { key: "google_ads_client_secret", label: "Client Secret", type: "password" },
                  { key: "google_ads_refresh_token", label: "Refresh Token", type: "password" },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type={f.type} placeholder={f.label} value={googleCreds[f.key] || ""}
                      onChange={(e) => setGoogleCreds((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => saveCredentials("Google Ads", googleCreds)}>Save Credentials</Button>
                  <Button size="sm" variant="outline" disabled title="Coming in Phase 4B">Test Connection</Button>
                </div>
              </CardContent>
            </Card>

            {/* Meta Ads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-indigo-500" /> Meta Ads
                  <Badge className={metrics.metaConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ml-auto" : "bg-muted text-muted-foreground ml-auto"}>
                    {metrics.metaConnected ? "Connected" : "Not Connected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "meta_ads_account_id", label: "Ad Account ID", type: "text" },
                  { key: "meta_ads_access_token", label: "Access Token", type: "password" },
                  { key: "meta_pixel_id", label: "Pixel ID", type: "text" },
                  { key: "meta_conversions_api_token", label: "Conversions API Token", type: "password" },
                ].map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type={f.type} placeholder={f.label} value={metaCreds[f.key] || ""}
                      onChange={(e) => setMetaCreds((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => saveCredentials("Meta Ads", metaCreds)}>Save Credentials</Button>
                  <Button size="sm" variant="outline" disabled title="Coming in Phase 4B">Test Connection</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ TAB 6: AD INTELLIGENCE ═══ */}
        <TabsContent value="intelligence" className="space-y-6">
          {/* Launch Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />Competitive Ad Intelligence Engine</CardTitle>
              <CardDescription>Analyze competitor ads → Find winning patterns → Generate proven ad scripts → Create campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Flow Visualization */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {["Scrape Competitor Ads", "Transcribe Scripts", "Analyze Patterns", "Generate Scripts", "Create Campaigns"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= 2 ? "bg-purple-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>{i + 1}</div>
                      <span className="text-xs font-medium">{step}</span>
                    </div>
                    {i < 4 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Mode</Label>
                  <Select value={intelMode} onValueChange={setIntelMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="deep">Deep Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Competitors</Label>
                  <Select value={intelMaxComp} onValueChange={setIntelMaxComp}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["3", "5", "10"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ads per Competitor</Label>
                  <Select value={intelAdsPerComp} onValueChange={setIntelAdsPerComp}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["3", "5", "10"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => runIntelligence.mutate()} disabled={runIntelligence.isPending} className="w-full">
                    {runIntelligence.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Analyzing...</>
                    ) : (
                      <><Brain className="h-4 w-4 mr-1" />Run Analysis</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          {intelReports.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Intelligence Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {intelReports.map((report: any) => (
                  <Card
                    key={report.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedReport?.id === report.id ? "ring-2 ring-purple-500" : ""}`}
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{report.analysis_name || "Analysis"}</CardTitle>
                        <StatusBadge status={report.status} />
                      </div>
                      <CardDescription className="text-xs">{new Date(report.created_at).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div><p className="font-bold text-lg">{report.competitors_analyzed || 0}</p><p className="text-muted-foreground">Competitors</p></div>
                        <div><p className="font-bold text-lg">{report.ads_analyzed || 0}</p><p className="text-muted-foreground">Ads</p></div>
                        <div><p className="font-bold text-lg">{Array.isArray(report.generated_scripts) ? report.generated_scripts.length : (typeof report.generated_scripts === 'string' ? JSON.parse(report.generated_scripts || '[]').length : 0)}</p><p className="text-muted-foreground">Scripts</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Report */}
          {selectedReport && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedReport.analysis_name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>Close</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={intelSubTab} onValueChange={setIntelSubTab}>
                  <TabsList>
                    <TabsTrigger value="patterns">Winning Patterns</TabsTrigger>
                    <TabsTrigger value="competitor_ads">Competitor Ads</TabsTrigger>
                    <TabsTrigger value="scripts">Generated Scripts</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  {/* Sub-Tab 1: Patterns */}
                  <TabsContent value="patterns" className="space-y-4 mt-4">
                    {(() => {
                      const patterns = typeof selectedReport.common_patterns === 'string'
                        ? JSON.parse(selectedReport.common_patterns || '[]')
                        : (selectedReport.common_patterns || []);
                      if (patterns.length === 0) return <p className="text-muted-foreground text-sm">No patterns found yet. Run analysis first.</p>;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {patterns.map((p: any, i: number) => (
                            <Card key={i}>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm">{p.pattern_name}</CardTitle>
                                  <Badge className={p.importance === "critical" ? "bg-red-100 text-red-800" : p.importance === "high" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                                    {p.importance}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <p className="text-xs text-muted-foreground">{p.description}</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{p.category}</Badge>
                                  <span className="text-xs text-muted-foreground">Used in {p.frequency} ads</span>
                                </div>
                                {p.examples && p.examples.length > 0 && (
                                  <p className="text-xs italic text-muted-foreground">"{p.examples[0]}"</p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Sub-Tab 2: Competitor Ads */}
                  <TabsContent value="competitor_ads" className="mt-4">
                    {competitorAds.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No competitor ads found.</p>
                    ) : (
                      <div className="space-y-3">
                        {competitorAds.map((ad: any) => (
                          <Card key={ad.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{ad.competitor_name}</Badge>
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">{ad.ad_format}</Badge>
                                    <span className="text-xs text-muted-foreground">{ad.running_days} days running</span>
                                  </div>
                                  <p className="font-medium text-sm">{ad.ad_title}</p>
                                  <p className="text-xs text-muted-foreground">{ad.ad_body}</p>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                  <p className="text-2xl font-bold">{ad.ad_score}</p>
                                  <p className="text-xs text-muted-foreground">Score</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Sub-Tab 3: Generated Scripts */}
                  <TabsContent value="scripts" className="mt-4">
                    {(() => {
                      const scripts = typeof selectedReport.generated_scripts === 'string'
                        ? JSON.parse(selectedReport.generated_scripts || '[]')
                        : (selectedReport.generated_scripts || []);
                      if (scripts.length === 0) return <p className="text-muted-foreground text-sm">No scripts generated yet.</p>;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {scripts.map((script: any, i: number) => (
                            <Card key={i} className="relative">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm">{script.title}</CardTitle>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">{script.format || "feed"}</Badge>
                                    <Badge variant="outline" className="text-xs">{script.platform || "both"}</Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {/* Hook */}
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-0.5">Hook</p>
                                  <p className="text-sm">{script.hook}</p>
                                </div>
                                {/* Body */}
                                <p className="text-sm text-muted-foreground">{script.body}</p>
                                {/* CTA */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">CTA</p>
                                  <p className="text-sm">{script.cta}</p>
                                </div>
                                {/* Patterns used */}
                                {script.patterns_used && script.patterns_used.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {script.patterns_used.map((p: string, pi: number) => (
                                      <Badge key={pi} variant="secondary" className="text-xs">{p}</Badge>
                                    ))}
                                  </div>
                                )}
                                {/* Effectiveness */}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div className="bg-purple-500 rounded-full h-2" style={{ width: `${script.estimated_effectiveness || 0}%` }} />
                                  </div>
                                  <span className="text-xs font-medium">{script.estimated_effectiveness || 0}%</span>
                                </div>
                                <p className="text-xs text-muted-foreground italic">{script.why_it_works}</p>
                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" onClick={() => createFromScript(script)}>
                                    <Sparkles className="h-3 w-3 mr-1" />Create Campaign
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(`Hook: ${script.hook}\n\n${script.body}\n\nCTA: ${script.cta}`);
                                    toast({ title: "Copied", description: "Script copied to clipboard" });
                                  }}>
                                    <Copy className="h-3 w-3 mr-1" />Copy
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Sub-Tab 4: Analytics */}
                  <TabsContent value="analytics" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Top Performing Ads */}
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Top Performing Competitor Ads</CardTitle></CardHeader>
                        <CardContent>
                          {(() => {
                            const topAds = typeof selectedReport.top_performing_ads === 'string'
                              ? JSON.parse(selectedReport.top_performing_ads || '[]')
                              : (selectedReport.top_performing_ads || []);
                            if (topAds.length === 0) return <p className="text-xs text-muted-foreground">No data</p>;
                            return (
                              <div className="space-y-2">
                                {topAds.map((ad: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div>
                                      <p className="text-sm font-medium">{ad.title || ad.competitor}</p>
                                      <p className="text-xs text-muted-foreground">{ad.competitor} · {ad.trigger}</p>
                                    </div>
                                    <Badge variant="outline">{ad.running_days}d</Badge>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                      {/* Pattern Frequency */}
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Pattern Frequency</CardTitle></CardHeader>
                        <CardContent>
                          {(() => {
                            const freq = typeof selectedReport.pattern_frequency === 'string'
                              ? JSON.parse(selectedReport.pattern_frequency || '{}')
                              : (selectedReport.pattern_frequency || {});
                            const entries = Object.entries(freq).sort((a: any, b: any) => b[1] - a[1]);
                            if (entries.length === 0) return <p className="text-xs text-muted-foreground">No data</p>;
                            const maxFreq = Math.max(...entries.map((e: any) => e[1]));
                            return (
                              <div className="space-y-2">
                                {entries.map(([name, count]: any) => (
                                  <div key={name} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>{name}</span>
                                      <span className="font-medium">{count}</span>
                                    </div>
                                    <div className="bg-muted rounded-full h-1.5">
                                      <div className="bg-purple-500 rounded-full h-1.5" style={{ width: `${(count / maxFreq) * 100}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {intelReports.length === 0 && !runIntelligence.isPending && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Intelligence Reports Yet</h3>
                <p className="text-muted-foreground mb-4">Run your first analysis to discover competitor ad patterns and generate proven ad scripts.</p>
                <p className="text-xs text-muted-foreground">Make sure you have competitors tracked in the Competitor Intel section first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE CAMPAIGN DIALOG ═══ */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Create AI Campaign</DialogTitle>
            <DialogDescription>AI will generate campaign strategy and creatives based on your business context.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign Name (optional)</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="AI will generate if empty" /></div>
            <div><Label>Platform</Label>
              <Select value={formPlatform} onValueChange={(v) => { setFormPlatform(v); setFormType(v === "google_ads" ? "search" : "feed"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="meta_ads">Meta Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Campaign Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{campaignTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Objective</Label>
              <Select value={formObjective} onValueChange={setFormObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECTIVES.map((o) => <SelectItem key={o} value={o} className="capitalize">{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Daily Budget (USD)</Label><Input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} placeholder="50" /></div>
            <div><Label>Target Audience</Label><Textarea value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="Small business owners in tech..." rows={2} /></div>
            {formPlatform === "google_ads" && formType === "search" && (
              <div><Label>Keywords (comma-separated)</Label><Textarea value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="crm software, business tools" rows={2} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createCampaign.mutate()} disabled={createCampaign.isPending}>
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ GENERATE CREATIVES DIALOG ═══ */}
      <Dialog open={isCreativeDialogOpen} onOpenChange={setIsCreativeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Ad Creatives</DialogTitle>
            <DialogDescription>AI will generate multiple creative variants for A/B testing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign</Label>
              <Select value={creativeCampaignId} onValueChange={(v) => {
                setCreativeCampaignId(v);
                const camp = campaigns.find((c: any) => c.id === v);
                if (camp) setCreativePlatform((camp as any).platform);
              }}>
                <SelectTrigger><SelectValue placeholder="Select a campaign" /></SelectTrigger>
                <SelectContent>{campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name || "Unnamed"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Platform</Label>
              <Select value={creativePlatform} onValueChange={setCreativePlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="meta_ads">Meta Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Number of Variants</Label>
              <Select value={creativeVariants} onValueChange={setCreativeVariants}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Variant</SelectItem>
                  <SelectItem value="2">2 Variants</SelectItem>
                  <SelectItem value="3">3 Variants</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Creative Brief (optional)</Label><Textarea value={creativeBrief} onChange={(e) => setCreativeBrief(e.target.value)} placeholder="Additional context..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreativeDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => generateCreatives.mutate()} disabled={generateCreatives.isPending || !creativeCampaignId}>
              {generateCreatives.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRM ═══ */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>This will permanently delete the campaign and all its creatives. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteCampaign(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Creative Card Component ───
function CreativeCard({ creative, isBest }: { creative: any; isBest: boolean }) {
  const headlines = creative.headlines || (creative.headline ? [creative.headline] : []);
  const descriptions = creative.descriptions || (creative.description ? [creative.description] : []);

  return (
    <Card className={isBest ? "border-green-500 border-2" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {creative.ai_variant && (
              <Badge variant="outline" className="text-xs">Variant {creative.ai_variant}</Badge>
            )}
            <PlatformBadge platform={creative.platform} />
            <StatusBadge status={creative.status || "draft"} />
          </div>
          {creative.ai_generated && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              <Sparkles className="h-3 w-3 mr-1" />AI
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {headlines.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Headlines</p>
            <div className="flex flex-wrap gap-1">
              {headlines.slice(0, 5).map((h: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
              ))}
              {headlines.length > 5 && <Badge variant="outline" className="text-xs">+{headlines.length - 5}</Badge>}
            </div>
          </div>
        )}
        {descriptions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Descriptions</p>
            {descriptions.slice(0, 2).map((d: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground line-clamp-2">{d}</p>
            ))}
          </div>
        )}
        {creative.call_to_action && (
          <Badge className="bg-primary/10 text-primary">{creative.call_to_action}</Badge>
        )}
        {(creative.impressions > 0 || creative.clicks > 0) && (
          <div className="grid grid-cols-3 gap-1 text-xs pt-1">
            <div className="text-center"><p className="font-medium">{fmtNum(Number(creative.impressions) || 0)}</p><p className="text-muted-foreground">Imp</p></div>
            <div className="text-center"><p className="font-medium">{fmtNum(Number(creative.clicks) || 0)}</p><p className="text-muted-foreground">Clicks</p></div>
            <div className="text-center"><p className="font-medium">{creative.ctr ? fmtPct(Number(creative.ctr)) : "—"}</p><p className="text-muted-foreground">CTR</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
