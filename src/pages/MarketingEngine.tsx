import { useState } from "react";
import { Link } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { useMarketingContent, useTrendInsights } from "@/hooks/useMarketingContent";
import { supabase, callWebhook } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  Plus, Send, Mail, MessageSquare, Phone, TrendingUp, Users,
  CheckCircle, Eye, Sparkles, BarChart3, Megaphone, Calendar as CalendarIcon,
  ArrowRight, Zap, Target, Clock, RefreshCw, Brain, Bot, Hand,
  Activity, Globe, Share2, FileText, Palette, GitBranch,
  ChevronRight, Play, AlertCircle, Layers, DollarSign
} from "lucide-react";

type AIMode = "manual" | "assisted" | "autonomous";

const aiModeConfig = {
  manual: {
    icon: Hand,
    label: "Manual Mode",
    description: "Full control — you create and approve everything",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    features: ["Create campaigns manually", "Review all content", "Approve before sending"],
  },
  assisted: {
    icon: Bot,
    label: "AI Assisted",
    description: "AI suggests, you approve — best of both worlds",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    features: ["AI suggests content & timing", "Auto-generates drafts", "You approve final send"],
  },
  autonomous: {
    icon: Brain,
    label: "Autonomous AI",
    description: "AI runs everything — fully automated marketing",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    features: ["Auto-detects trends", "Auto-creates campaigns", "Auto-sends at optimal times", "Auto-adjusts based on performance"],
  },
};

export default function MarketingEngine() {
  const { tenantId, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { campaigns, isLoading: campaignsLoading, stats, createCampaign, refetch } = useMarketingCampaigns();
  const { stats: contentStats } = useMarketingContent();
  const { trends, highRelevanceTrends } = useTrendInsights({ minScore: 5, limit: 5 });

  const [aiMode, setAiMode] = useState<AIMode>("assisted");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIModeDialog, setShowAIModeDialog] = useState(false);

  // Campaign form state
  const [campaignData, setCampaignData] = useState({
    name: "",
    channel: "whatsapp" as string,
    message: "",
    scheduleType: "now" as "now" | "scheduled",
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "09:00",
  });

  // Fetch real AI activity from system_events
  const { data: aiActivity = [] } = useQuery({
    queryKey: ["ai-activity", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("system_events" as any)
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .eq("event_source", "marketing")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        console.warn("system_events query:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantConfig?.id,
    refetchInterval: 60000,
  });

  // Fetch AI decisions
  const { data: aiDecisions = [] } = useQuery({
    queryKey: ["ai-decisions", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("ai_decisions" as any)
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .eq("module", "marketing")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  // Merge AI activity + decisions sorted by created_at
  const mergedAiActivity = [...aiActivity.map((a: any) => ({ ...a, _source: 'event' })), ...aiDecisions.map((d: any) => ({ ...d, _source: 'decision', created_at: d.created_at }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // DNC/Consent compliance stats
  const { data: complianceStats } = useQuery({
    queryKey: ['compliance-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { count: total } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
      const { count: dnc } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('do_not_contact', true);
      const { count: noConsent } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('consent_marketing', false);
      return { total: total || 0, dnc: dnc || 0, noConsent: noConsent || 0, compliant: (total || 0) - (dnc || 0) - (noConsent || 0) };
    },
    enabled: !!tenantId,
  });

  // Revenue Attribution
  const { data: attribution, isLoading: attrLoading, refetch: refetchAttribution } = useQuery({
    queryKey: ['revenue-attribution', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return null;
      const result = await callWebhook('/ai-tool/revenue-attribution', {}, tenantConfig.id);
      return (result?.data as any) || null;
    },
    enabled: !!tenantConfig?.id,
    staleTime: 300000,
  });

  // Fetch recent sequence enrollments
  const { data: recentEnrollments = [] } = useQuery({
    queryKey: ['recent-enrollments', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('sequence_enrollments' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('enrolled_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
    refetchInterval: 30000,
  });

  // Stats row
  const statCards = [
    { label: "Campaigns", value: stats?.total || 0, icon: Send, color: "text-purple-500", bg: "bg-purple-500/10", href: "/marketing/campaigns", trend: stats?.total ? "+12%" : null },
    { label: "Messages Sent", value: (stats?.totalSent || 0).toLocaleString(), icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10", href: "/marketing/analytics", trend: stats?.totalSent ? "+8%" : null },
    { label: "Delivery Rate", value: `${stats?.totalSent && stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0}%`, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", href: "/marketing/analytics", trend: null },
    { label: "Open Rate", value: `${stats?.avgOpenRate || 0}%`, icon: Eye, color: "text-amber-500", bg: "bg-amber-500/10", href: "/marketing/analytics", trend: null },
    { label: "Click Rate", value: `${stats?.avgClickRate || 0}%`, icon: Target, color: "text-pink-500", bg: "bg-pink-500/10", href: "/marketing/analytics", trend: null },
  ];

  // Module grid
  const moduleCards = [
    { title: "Content Studio", description: "AI-powered content creation", icon: Palette, href: "/marketing/content", color: "text-purple-500", bg: "bg-purple-500/10", count: contentStats?.total || 0 },
    { title: "Campaign Central", description: "Multi-channel campaigns", icon: Megaphone, href: "/marketing/campaigns", color: "text-blue-500", bg: "bg-blue-500/10", count: stats?.total || 0 },
    { title: "Social Commander", description: "Multi-platform social posting", icon: Share2, href: "/marketing/social", color: "text-pink-500", bg: "bg-pink-500/10", count: 0 },
    { title: "Email Sequences", description: "Personalized drip campaigns", icon: Mail, href: "/marketing/sequences", color: "text-cyan-500", bg: "bg-cyan-500/10", count: 0 },
    { title: "Email Builder", description: "Drag-and-drop templates", icon: FileText, href: "/marketing/email", color: "text-green-500", bg: "bg-green-500/10", count: 0 },
    { title: "A/B Testing", description: "Data-driven experiments", icon: GitBranch, href: "/marketing/ab-testing", color: "text-amber-500", bg: "bg-amber-500/10", count: 0 },
    { title: "Landing Pages", description: "High-converting pages", icon: Globe, href: "/marketing/landing", color: "text-indigo-500", bg: "bg-indigo-500/10", count: 0 },
    { title: "Analytics", description: "Performance insights", icon: BarChart3, href: "/marketing/analytics", color: "text-teal-500", bg: "bg-teal-500/10", count: null },
  ];

  const handleCreateCampaign = async () => {
    if (!campaignData.name.trim() || !campaignData.message.trim()) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const scheduledAt = campaignData.scheduleType === "scheduled" && campaignData.scheduledDate
        ? new Date(`${format(campaignData.scheduledDate, "yyyy-MM-dd")}T${campaignData.scheduledTime}`).toISOString()
        : undefined;
      await createCampaign.mutateAsync({
        name: campaignData.name,
        type: campaignData.channel,
        message_template: campaignData.message,
        scheduled_at: scheduledAt,
        send_now: campaignData.scheduleType === "now",
      });
      toast({ title: "✅ Campaign Created!", description: campaignData.scheduleType === "now" ? "Your campaign is being sent." : "Your campaign has been scheduled." });
      setIsWizardOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCampaignData({ name: "", channel: "whatsapp", message: "", scheduleType: "now", scheduledDate: undefined, scheduledTime: "09:00" });
    setWizardStep(1);
  };

  const generateAIContent = () => {
    const templates: Record<string, string> = {
      whatsapp: `🎉 Special Offer for You!\n\nHi there,\n\nWe have an exclusive offer just for you!\n\n✨ Get 20% off your next visit\n📅 Valid until ${format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "MMM dd")}\n\nReply YES to claim!\n\nBest,\n${tenantConfig?.company_name || "Your Team"}`,
      email: `Subject: Exclusive Offer Inside! 🎁\n\nHi {{first_name}},\n\nWe wanted to share something special with you...\n\n[Your personalized message here]\n\nBest regards,\n${tenantConfig?.company_name || "Your Team"}`,
      sms: `${tenantConfig?.company_name || "Hi"}: Special 20% OFF this week only! Visit us or reply for details. Valid until ${format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "MM/dd")}`,
    };
    setCampaignData((prev) => ({ ...prev, message: templates[prev.channel] || templates.whatsapp }));
    toast({ title: "✨ Content Generated", description: "AI has created content for you." });
  };

  if (tenantLoading || campaignsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-5 gap-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const currentMode = aiModeConfig[aiMode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold marketing-gradient-text">Marketing Command Center</h1>
          <p className="text-muted-foreground mt-1">AI-Powered Marketing Automation • Multi-Channel • Context-Aware</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all", currentMode.bg, currentMode.border)}
            onClick={() => setShowAIModeDialog(true)}
          >
            <currentMode.icon className={cn("h-5 w-5", currentMode.color, aiMode === "autonomous" && "ai-active")} />
            <div className="hidden md:block">
              <p className={cn("text-sm font-medium", currentMode.color)}>{currentMode.label}</p>
              <p className="text-xs text-muted-foreground max-w-[200px] truncate">{currentMode.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button onClick={() => setIsWizardOpen(true)} className="marketing-gradient text-white">
            <Plus className="h-4 w-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Autonomous Mode Banner */}
      {aiMode === "autonomous" && (
        <Card className="border-purple-500/50 bg-purple-500/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/20">
                <Brain className="h-6 w-6 text-purple-500 ai-active" />
              </div>
              <div>
                <p className="font-semibold text-purple-600 dark:text-purple-400">🤖 Autonomous AI Active</p>
                <p className="text-sm text-muted-foreground">AI is monitoring trends, creating content, and optimizing campaigns automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-2xl font-bold text-purple-500">{mergedAiActivity.length}</p>
                <p className="text-xs text-muted-foreground">AI Actions</p>
              </div>
              <Switch checked={true} onCheckedChange={() => { setAiMode("assisted"); toast({ title: "Switched to Assisted Mode" }); }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat, idx) => (
          <Link to={stat.href} key={idx}>
            <Card className="stat-card h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  {stat.trend && <Badge variant="secondary" className="text-xs text-green-600">{stat.trend}</Badge>}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Compliance Card */}
      {complianceStats && complianceStats.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="font-medium text-sm">Compliance Status</p>
                <p className="text-xs text-muted-foreground">DNC and consent are auto-checked on all campaign sends and email sequences</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-600 font-medium">✅ {complianceStats.compliant} contactable</span>
              <span className="text-red-500 font-medium">🚫 {complianceStats.dnc} blocked (DNC)</span>
              <span className="text-amber-500 font-medium">⚠️ {complianceStats.noConsent} no consent</span>
            </div>
            {complianceStats.total > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-muted">
                <div className="bg-green-500 transition-all" style={{ width: `${(complianceStats.compliant / complianceStats.total) * 100}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${(complianceStats.dnc / complianceStats.total) * 100}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${(complianceStats.noConsent / complianceStats.total) * 100}%` }} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue Attribution Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" /> Revenue Attribution
            </CardTitle>
            <CardDescription>AI-tracked revenue sources & channels</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchAttribution()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {attrLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <p className="text-sm text-muted-foreground">Analyzing revenue sources...</p>
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !attribution ? (
            <div className="text-center py-6">
              <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Analyzing revenue sources...</p>
              <p className="text-xs text-muted-foreground mt-1">Revenue attribution data will appear after the AI Brain runs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-green-600">
                ${((attribution as any).total_revenue || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">total tracked revenue</span>
              </p>
              {(attribution as any).top_sources?.length > 0 && (
                <div className="space-y-2">
                  {((attribution as any).top_sources as any[]).slice(0, 5).map((src: any, idx: number) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                    const maxRev = Math.max(...((attribution as any).top_sources as any[]).map((s: any) => s.revenue || 0), 1);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{src.source || src.name}</span>
                          <span className="font-medium">${(src.revenue || 0).toLocaleString()} • {src.customer_count || 0} customers</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${colors[idx % 5]} transition-all`} style={{ width: `${((src.revenue || 0) / maxRev) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {(attribution as any).top_channels?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {((attribution as any).top_channels as any[]).map((ch: any, idx: number) => (
                    <Badge key={idx} variant="secondary">{ch.channel || ch.name}: ${(ch.revenue || 0).toLocaleString()}</Badge>
                  ))}
                </div>
              )}
              {(attribution as any).landing_page_leads > 0 && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm font-medium text-green-600">🎯 Landing pages: {(attribution as any).landing_page_leads} leads worth ${((attribution as any).landing_page_revenue || 0).toLocaleString()}</p>
                </div>
              )}
              {(attribution as any).ai_insights?.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Insights</p>
                  <ul className="space-y-1">
                    {((attribution as any).ai_insights as string[]).map((insight: string, idx: number) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span>•</span> {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "WhatsApp Campaign", icon: MessageSquare, color: "text-green-500", bg: "bg-green-500/10", channel: "whatsapp" },
          { label: "Email Campaign", icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10", channel: "email" },
          { label: "SMS Blast", icon: Phone, color: "text-purple-500", bg: "bg-purple-500/10", channel: "sms" },
          { label: "AI Content", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", href: "/marketing/content" },
        ].map((action, idx) =>
          action.href ? (
            <Link to={action.href} key={idx}>
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <div className={cn("p-1.5 rounded-md", action.bg)}><action.icon className={cn("h-4 w-4", action.color)} /></div>
                <span className="text-sm">{action.label}</span>
              </Button>
            </Link>
          ) : (
            <Button key={idx} variant="outline" className="w-full justify-start gap-2 h-auto py-3"
              onClick={() => { setCampaignData(prev => ({ ...prev, channel: action.channel! })); setIsWizardOpen(true); }}>
              <div className={cn("p-1.5 rounded-md", action.bg)}><action.icon className={cn("h-4 w-4", action.color)} /></div>
              <span className="text-sm">{action.label}</span>
            </Button>
          )
        )}
      </div>

      {/* Two Column: Modules + Sidebar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Module Grid + Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Module Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {moduleCards.map((module, idx) => (
              <Link to={module.href} key={idx}>
                <Card className="stat-card h-full group">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <div className={cn("p-3 rounded-xl transition-colors", module.bg, "group-hover:bg-primary/10")}>
                      <module.icon className={cn("h-5 w-5", module.color, "group-hover:text-primary transition-colors")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{module.title}</p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    {module.count !== null && module.count > 0 && <Badge variant="secondary" className="text-xs">{module.count}</Badge>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Active Campaigns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Active Campaigns</CardTitle>
                <CardDescription>Recent & ongoing marketing campaigns</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
                <Button variant="outline" size="sm" asChild><Link to="/marketing/campaigns">View All</Link></Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="empty-state py-8">
                  <Send className="empty-state-icon" />
                  <h3 className="font-semibold mb-1">No Campaigns Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first campaign to start engaging with your audience.</p>
                  <Button onClick={() => setIsWizardOpen(true)} className="marketing-gradient text-white" size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.slice(0, 5).map((campaign: any) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg",
                          (campaign.type === "whatsapp" || campaign.channel === "whatsapp") ? "bg-green-500/10" :
                          (campaign.type === "email" || campaign.channel === "email") ? "bg-blue-500/10" : "bg-purple-500/10"
                        )}>
                          {(campaign.type === "whatsapp" || campaign.channel === "whatsapp") ? <MessageSquare className="h-4 w-4 text-green-500" /> :
                           (campaign.type === "email" || campaign.channel === "email") ? <Mail className="h-4 w-4 text-blue-500" /> :
                           <Phone className="h-4 w-4 text-purple-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{campaign.name}</p>
                            {campaign.ai_generated && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /> AI</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{campaign.sent_count || 0} sent • {campaign.opened_count || 0} opened</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={campaign.status === "active" || campaign.status === "sending" ? "default" : "secondary"} className="text-xs">
                          {campaign.status === "sending" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Trends + AI Activity */}
        <div className="space-y-6">
          {/* Trending Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Trending in {tenantConfig?.industry || "Your Industry"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <div className="text-center py-6">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">AI is analyzing trends...</p>
                  <Button variant="link" size="sm" asChild className="mt-1">
                    <Link to="/marketing/content">Run Trend Detection</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {trends.slice(0, 5).map((trend: any, idx: number) => (
                    <div key={trend.id || idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={(trend.ai_relevance_score || 0) >= 8 ? "default" : "secondary"} className="text-xs shrink-0">
                          {trend.ai_relevance_score}/10
                        </Badge>
                        <span className="text-sm truncate">{trend.trend_keyword}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0" asChild>
                        <Link to="/marketing/content"><Sparkles className="h-3 w-3" /></Link>
                      </Button>
                    </div>
                  ))}
                  <Button variant="link" size="sm" className="w-full" asChild>
                    <Link to="/marketing/content">View All Trends</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" /> AI Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mergedAiActivity.length === 0 && recentEnrollments.length === 0 ? (
                <div className="text-center py-6">
                  <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">AI Brain hasn't run yet</p>
                  <p className="text-xs text-muted-foreground mt-1">It executes every 2 hours and will log decisions here.</p>
                </div>
              ) : (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {recentEnrollments.map((enrollment: any, idx: number) => (
                      <div key={`enroll-${enrollment.id || idx}`} className="flex items-start gap-2">
                        <div className={`p-1 rounded-full mt-0.5 ${
                          enrollment.status === 'completed' ? 'bg-emerald-500/10' :
                          enrollment.status === 'active' ? 'bg-blue-500/10' :
                          enrollment.status === 'paused' ? 'bg-amber-500/10' : 'bg-muted'
                        }`}>
                          <Mail className={`h-3 w-3 ${
                            enrollment.status === 'completed' ? 'text-emerald-500' :
                            enrollment.status === 'active' ? 'text-blue-500' :
                            enrollment.status === 'paused' ? 'text-amber-500' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm">
                            {enrollment.status === 'completed'
                              ? `✅ Sequence "${enrollment.sequence_name}" completed (by: ${enrollment.enrolled_by || 'system'})`
                              : `📧 Lead enrolled in "${enrollment.sequence_name}" — Step ${enrollment.current_step || 0} of ${enrollment.total_steps || '?'}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {enrollment.enrolled_at ? formatDistanceToNow(new Date(enrollment.enrolled_at), { addSuffix: true }) : ''}
                            {enrollment.enrollment_reason ? ` • ${enrollment.enrollment_reason}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {mergedAiActivity.map((activity: any, idx: number) => (
                      <div key={activity.id || idx} className="flex items-start gap-2">
                        <div className={`p-1 rounded-full mt-0.5 ${
                          activity._source === 'decision' ? 'bg-amber-500/10' :
                          activity.event_severity === 'error' ? 'bg-red-500/10' :
                          activity.event_severity === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                        }`}>
                          {activity.triggered_by === 'ai_agent' ? (
                            <Brain className="h-3 w-3 text-purple-500" />
                          ) : activity.event_type?.includes('sequence') ? (
                            <Mail className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Sparkles className={`h-3 w-3 ${
                              activity._source === 'decision' ? 'text-amber-500' :
                              activity.event_severity === 'error' ? 'text-red-500' :
                              activity.event_severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                            }`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            {activity.triggered_by === 'ai_agent' && <span className="text-xs">🧠</span>}
                            {activity.event_type?.includes('sequence') && <span className="text-xs">📊</span>}
                            <p className="text-sm">
                              {activity._source === 'decision'
                                ? `${activity.decision_type}: ${(() => { try { const ctx = JSON.parse(activity.context || '{}'); return ctx.reasoning || activity.decision_type; } catch { return activity.decision_type; } })()}`
                                : activity.event_summary || activity.action_taken || activity.action || "AI action"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activity._source === 'event' && activity.event_type && (
                              <Badge variant="outline" className={`text-[10px] px-1 py-0 ${
                                activity.event_severity === 'error' ? 'text-red-500' :
                                activity.event_severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                              }`}>{activity.event_type}</Badge>
                            )}
                            {activity._source === 'decision' && activity.confidence_score && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-500">{Math.round(activity.confidence_score * 100)}% confidence</Badge>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Mode Dialog */}
      <Dialog open={showAIModeDialog} onOpenChange={setShowAIModeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select AI Mode</DialogTitle>
            <DialogDescription>Choose how AI assists with your marketing automation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(Object.entries(aiModeConfig) as [AIMode, typeof aiModeConfig.manual][]).map(([mode, config]) => (
              <div
                key={mode}
                onClick={() => { setAiMode(mode); setShowAIModeDialog(false); toast({ title: `${config.label} Activated`, description: config.description }); }}
                className={cn("p-4 border-2 rounded-xl cursor-pointer transition-all", aiMode === mode ? `${config.bg} ${config.border}` : "hover:bg-muted")}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <config.icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={cn("font-medium", aiMode === mode && config.color)}>{config.label}</p>
                      {aiMode === mode && <CheckCircle className={cn("h-5 w-5", config.color)} />}
                    </div>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {config.features.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Creation Wizard */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => { setIsWizardOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>Step {wizardStep} of 3</DialogDescription>
          </DialogHeader>
          <Progress value={(wizardStep / 3) * 100} className="h-2" />

          {wizardStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input id="name" placeholder="e.g., February Newsletter, Weekend Sale" value={campaignData.name}
                  onChange={(e) => setCampaignData((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Channel *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-500", bg: "bg-green-500/10" },
                    { id: "email", label: "Email", icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { id: "sms", label: "SMS", icon: Phone, color: "text-purple-500", bg: "bg-purple-500/10" },
                  ].map((ch) => (
                    <div key={ch.id} onClick={() => setCampaignData((prev) => ({ ...prev, channel: ch.id }))}
                      className={cn("p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2",
                        campaignData.channel === ch.id ? `border-primary ${ch.bg}` : "border-muted hover:border-primary/50")}>
                      <ch.icon className={cn("h-6 w-6", ch.color)} />
                      <span className="text-sm font-medium">{ch.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Message Content *</Label>
                  {aiMode !== "manual" && (
                    <Button variant="outline" size="sm" onClick={generateAIContent}>
                      <Sparkles className="h-4 w-4 mr-2" /> Generate with AI
                    </Button>
                  )}
                </div>
                <Textarea id="message" placeholder="Enter your campaign message..." className="min-h-[200px] font-mono"
                  value={campaignData.message} onChange={(e) => setCampaignData((prev) => ({ ...prev, message: e.target.value }))} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{campaignData.message.length} characters</span>
                  <span>Use {"{{first_name}}"} for personalization</span>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>When to Send</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setCampaignData((prev) => ({ ...prev, scheduleType: "now" }))}
                    className={cn("p-4 border-2 rounded-lg cursor-pointer transition-all",
                      campaignData.scheduleType === "now" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
                    <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-amber-500" /><span className="font-medium">Send Now</span></div>
                    <p className="text-sm text-muted-foreground">Send immediately</p>
                  </div>
                  <div onClick={() => setCampaignData((prev) => ({ ...prev, scheduleType: "scheduled" }))}
                    className={cn("p-4 border-2 rounded-lg cursor-pointer transition-all",
                      campaignData.scheduleType === "scheduled" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
                    <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-blue-500" /><span className="font-medium">Schedule</span></div>
                    <p className="text-sm text-muted-foreground">Pick date & time</p>
                  </div>
                </div>
              </div>
              {campaignData.scheduleType === "scheduled" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {campaignData.scheduledDate ? format(campaignData.scheduledDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={campaignData.scheduledDate}
                          onSelect={(date) => setCampaignData((prev) => ({ ...prev, scheduledDate: date }))}
                          disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Select value={campaignData.scheduledTime} onValueChange={(v) => setCampaignData((prev) => ({ ...prev, scheduledTime: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
                          <SelectItem key={hour} value={`${hour.toString().padStart(2, "0")}:00`}>{`${hour.toString().padStart(2, "0")}:00`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Campaign Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span><p className="font-medium">{campaignData.name || "-"}</p></div>
                    <div><span className="text-muted-foreground">Channel:</span><p className="font-medium capitalize">{campaignData.channel}</p></div>
                    <div><span className="text-muted-foreground">Send:</span><p className="font-medium">{campaignData.scheduleType === "now" ? "Immediately" : campaignData.scheduledDate ? `${format(campaignData.scheduledDate, "PPP")} at ${campaignData.scheduledTime}` : "Not set"}</p></div>
                    <div><span className="text-muted-foreground">Message:</span><p className="font-medium">{campaignData.message.length} chars</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => (wizardStep === 1 ? setIsWizardOpen(false) : setWizardStep((prev) => prev - 1))}>
              {wizardStep === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={() => (wizardStep < 3 ? setWizardStep((prev) => prev + 1) : handleCreateCampaign())}
              disabled={(wizardStep === 1 && !campaignData.name.trim()) || (wizardStep === 2 && !campaignData.message.trim()) || (wizardStep === 3 && campaignData.scheduleType === "scheduled" && !campaignData.scheduledDate) || isSubmitting}
              className="marketing-gradient text-white"
            >
              {isSubmitting ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...</>) :
               wizardStep < 3 ? (<>Next <ArrowRight className="h-4 w-4 ml-2" /></>) :
               (<><Send className="h-4 w-4 mr-2" /> {campaignData.scheduleType === "now" ? "Send Campaign" : "Schedule Campaign"}</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
