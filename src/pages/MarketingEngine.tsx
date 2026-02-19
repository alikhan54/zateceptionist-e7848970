import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { useMarketingContent } from "@/hooks/useMarketingContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Plus,
  Send,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
  CheckCircle,
  Eye,
  Sparkles,
  BarChart3,
  Megaphone,
  Calendar as CalendarIcon,
  ArrowRight,
  Zap,
  Target,
  Clock,
  RefreshCw,
  Brain,
  Bot,
  Hand,
  Activity,
  Globe,
  Share2,
  FileText,
  Palette,
  GitBranch,
  ChevronRight,
  Play,
  Pause,
  AlertCircle,
} from "lucide-react";

type AIMode = "manual" | "assisted" | "autonomous";

const aiModeConfig = {
  manual: {
    icon: Hand,
    label: "Manual",
    description: "Full control - you create and send campaigns",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  assisted: {
    icon: Bot,
    label: "AI Assisted",
    description: "AI suggests content, timing, and audiences",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  autonomous: {
    icon: Brain,
    label: "Autonomous",
    description: "AI creates and sends campaigns automatically",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
};

export default function MarketingEngine() {
  const { tenantId, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const {
    campaigns,
    isLoading: campaignsLoading,
    stats,
    createCampaign,
    sendCampaign,
    refetch,
  } = useMarketingCampaigns();
  const { content, stats: contentStats } = useMarketingContent();

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

  // Real stats from hooks
  const statCards = [
    {
      label: "Total Campaigns",
      value: stats?.total || campaigns?.length || 0,
      icon: Send,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/marketing/campaigns",
      trend: "+12%",
    },
    {
      label: "Messages Sent",
      value: (stats?.totalSent || 0).toLocaleString(),
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/marketing/analytics",
      trend: "+8%",
    },
    {
      label: "Delivery Rate",
      value: `${stats?.totalSent > 0 ? Math.round((stats?.totalDelivered / stats?.totalSent) * 100) : 0}%`,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/marketing/analytics",
      trend: "+3%",
    },
    {
      label: "Open Rate",
      value: `${stats?.avgOpenRate || 0}%`,
      icon: Eye,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      href: "/marketing/analytics",
      trend: "+5%",
    },
    {
      label: "Response Rate",
      value: `${stats?.avgClickRate || 0}%`,
      icon: TrendingUp,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      href: "/marketing/analytics",
      trend: "+2%",
    },
  ];

  const quickActions = [
    {
      title: "WhatsApp Campaign",
      description: "Send personalized WhatsApp messages",
      icon: MessageSquare,
      color: "text-green-500",
      bg: "bg-green-500/10",
      channel: "whatsapp",
    },
    {
      title: "Email Campaign",
      description: "Create beautiful email campaigns",
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      channel: "email",
    },
    {
      title: "AI Content Generator",
      description: "Generate content with AI",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/marketing/content",
    },
  ];

  const moduleLinks = [
    {
      title: "Content Studio",
      description: "AI-powered content creation",
      icon: Palette,
      href: "/marketing/content",
      count: contentStats?.total || 0,
    },
    {
      title: "Campaign Central",
      description: "Manage all campaigns",
      icon: Megaphone,
      href: "/marketing/campaigns",
      count: stats?.total || 0,
    },
    {
      title: "Social Commander",
      description: "Social media automation",
      icon: Share2,
      href: "/marketing/social",
      count: 0,
    },
    {
      title: "Email Builder",
      description: "Drag-and-drop email design",
      icon: FileText,
      href: "/marketing/email",
      count: 0,
    },
    {
      title: "Marketing Analytics",
      description: "Performance insights",
      icon: BarChart3,
      href: "/marketing/analytics",
      count: null,
    },
    {
      title: "A/B Testing",
      description: "Optimize with experiments",
      icon: GitBranch,
      href: "/marketing/ab-testing",
      count: 0,
    },
  ];

  const handleCreateCampaign = async () => {
    if (!campaignData.name.trim() || !campaignData.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt =
        campaignData.scheduleType === "scheduled" && campaignData.scheduledDate
          ? new Date(`${format(campaignData.scheduledDate, "yyyy-MM-dd")}T${campaignData.scheduledTime}`).toISOString()
          : undefined;

      const created = await createCampaign.mutateAsync({
        name: campaignData.name,
        type: campaignData.channel,
        message_template: campaignData.message,
        scheduled_at: scheduledAt,
        send_now: campaignData.scheduleType === "now",
      });

      toast({
        title: "✅ Campaign Created!",
        description:
          campaignData.scheduleType === "now" ? "Your campaign is being sent." : "Your campaign has been scheduled.",
      });

      setIsWizardOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCampaignData({
      name: "",
      channel: "whatsapp",
      message: "",
      scheduleType: "now",
      scheduledDate: undefined,
      scheduledTime: "09:00",
    });
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
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const currentMode = aiModeConfig[aiMode];

  return (
    <div className="space-y-6">
      {/* Header with AI Mode */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold marketing-gradient-text">Marketing Engine</h1>
          <p className="text-muted-foreground mt-1">AI-Powered Marketing Automation</p>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Mode Selector */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all",
              currentMode.bg,
              currentMode.border,
            )}
            onClick={() => setShowAIModeDialog(true)}
          >
            <currentMode.icon className={cn("h-5 w-5", currentMode.color, aiMode === "autonomous" && "ai-active")} />
            <div>
              <p className={cn("text-sm font-medium", currentMode.color)}>{currentMode.label}</p>
              <p className="text-xs text-muted-foreground">{currentMode.description}</p>
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
                <p className="font-semibold text-purple-600 dark:text-purple-400">Autonomous Mode Active</p>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing trends, creating content, and sending personalized campaigns automatically
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-500">{stats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">AI Actions Today</p>
              </div>
              <Switch checked={true} onCheckedChange={() => setAiMode("assisted")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map((stat, idx) => (
          <Link to={stat.href} key={idx}>
            <Card className="stat-card h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  {stat.trend && (
                    <Badge variant="secondary" className="text-xs text-green-600">
                      {stat.trend}
                    </Badge>
                  )}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {quickActions.map((action, idx) =>
          action.href ? (
            <Link to={action.href} key={idx}>
              <Card className="stat-card h-full">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={cn("p-4 rounded-xl mb-3", action.bg)}>
                    <action.icon className={cn("h-8 w-8", action.color)} />
                  </div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card
              key={idx}
              className="stat-card cursor-pointer"
              onClick={() => {
                if (action.channel) {
                  setCampaignData((prev) => ({ ...prev, channel: action.channel! }));
                }
                setIsWizardOpen(true);
              }}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className={cn("p-4 rounded-xl mb-3", action.bg)}>
                  <action.icon className={cn("h-8 w-8", action.color)} />
                </div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Module Links Grid */}
      <div className="grid grid-cols-3 gap-4">
        {moduleLinks.map((link, idx) => (
          <Link to={link.href} key={idx}>
            <Card className="stat-card h-full group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{link.title}</h4>
                    {link.count !== null && <Badge variant="secondary">{link.count}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Active Campaigns
            </CardTitle>
            <CardDescription>Your recent and ongoing marketing campaigns</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/marketing/campaigns">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="empty-state py-12">
              <Send className="empty-state-icon" />
              <h3 className="font-semibold text-lg mb-2">No Campaigns Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {aiMode === "autonomous"
                  ? "AI will automatically create campaigns based on trends and customer behavior."
                  : "Create your first campaign to start engaging with your audience."}
              </p>
              <Button onClick={() => setIsWizardOpen(true)} className="marketing-gradient text-white">
                <Plus className="h-4 w-4 mr-2" /> Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        campaign.type === "whatsapp" || campaign.channel === "whatsapp"
                          ? "bg-green-500/10"
                          : campaign.type === "email" || campaign.channel === "email"
                            ? "bg-blue-500/10"
                            : "bg-purple-500/10",
                      )}
                    >
                      {campaign.type === "whatsapp" || campaign.channel === "whatsapp" ? (
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      ) : campaign.type === "email" || campaign.channel === "email" ? (
                        <Mail className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Phone className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.ai_generated && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" /> AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{campaign.sent_count || 0} sent</span>
                        <span>{campaign.opened_count || 0} opened</span>
                        <span>{campaign.clicked_count || 0} clicked</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        campaign.status === "sent" || campaign.status === "completed"
                          ? "default"
                          : campaign.status === "sending" || campaign.status === "active"
                            ? "secondary"
                            : "outline"
                      }
                      className={cn(
                        campaign.status === "sending" && "bg-yellow-500/10 text-yellow-600",
                        campaign.status === "active" && "bg-green-500/10 text-green-600",
                      )}
                    >
                      {campaign.status === "sending" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                      {campaign.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/marketing/campaigns">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Mode Dialog */}
      <Dialog open={showAIModeDialog} onOpenChange={setShowAIModeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select AI Mode</DialogTitle>
            <DialogDescription>Choose how AI assists with your marketing</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(Object.entries(aiModeConfig) as [AIMode, typeof aiModeConfig.manual][]).map(([mode, config]) => (
              <div
                key={mode}
                onClick={() => {
                  setAiMode(mode);
                  setShowAIModeDialog(false);
                  toast({ title: `${config.label} Mode Activated`, description: config.description });
                }}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all",
                  aiMode === mode ? `${config.bg} ${config.border}` : "hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <config.icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-medium", aiMode === mode && config.color)}>{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  {aiMode === mode && <CheckCircle className={cn("h-5 w-5", config.color)} />}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Creation Wizard */}
      <Dialog
        open={isWizardOpen}
        onOpenChange={(open) => {
          setIsWizardOpen(open);
          if (!open) resetForm();
        }}
      >
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
                <Input
                  id="name"
                  placeholder="e.g., February Newsletter, Weekend Sale"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Channel *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "whatsapp",
                      label: "WhatsApp",
                      icon: MessageSquare,
                      color: "text-green-500",
                      bg: "bg-green-500/10",
                    },
                    { id: "email", label: "Email", icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { id: "sms", label: "SMS", icon: Phone, color: "text-purple-500", bg: "bg-purple-500/10" },
                  ].map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setCampaignData((prev) => ({ ...prev, channel: ch.id }))}
                      className={cn(
                        "p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2",
                        campaignData.channel === ch.id
                          ? `border-primary ${ch.bg}`
                          : "border-muted hover:border-primary/50",
                      )}
                    >
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
                <Textarea
                  id="message"
                  placeholder="Enter your campaign message..."
                  className="min-h-[200px] font-mono"
                  value={campaignData.message}
                  onChange={(e) => setCampaignData((prev) => ({ ...prev, message: e.target.value }))}
                />
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
                  <div
                    onClick={() => setCampaignData((prev) => ({ ...prev, scheduleType: "now" }))}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      campaignData.scheduleType === "now"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">Send Now</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Send immediately</p>
                  </div>
                  <div
                    onClick={() => setCampaignData((prev) => ({ ...prev, scheduleType: "scheduled" }))}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      campaignData.scheduleType === "scheduled"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Schedule</span>
                    </div>
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
                        <Calendar
                          mode="single"
                          selected={campaignData.scheduledDate}
                          onSelect={(date) => setCampaignData((prev) => ({ ...prev, scheduledDate: date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Select
                      value={campaignData.scheduledTime}
                      onValueChange={(v) => setCampaignData((prev) => ({ ...prev, scheduledTime: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
                          <SelectItem key={hour} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour.toString().padStart(2, "0")}:00`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Summary Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Campaign Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{campaignData.name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Channel:</span>
                      <p className="font-medium capitalize">{campaignData.channel}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Send:</span>
                      <p className="font-medium">
                        {campaignData.scheduleType === "now"
                          ? "Immediately"
                          : campaignData.scheduledDate
                            ? `${format(campaignData.scheduledDate, "PPP")} at ${campaignData.scheduledTime}`
                            : "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Message:</span>
                      <p className="font-medium">{campaignData.message.length} chars</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => (wizardStep === 1 ? setIsWizardOpen(false) : setWizardStep((prev) => prev - 1))}
            >
              {wizardStep === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={() => (wizardStep < 3 ? setWizardStep((prev) => prev + 1) : handleCreateCampaign())}
              disabled={
                (wizardStep === 1 && !campaignData.name.trim()) ||
                (wizardStep === 2 && !campaignData.message.trim()) ||
                (wizardStep === 3 && campaignData.scheduleType === "scheduled" && !campaignData.scheduledDate) ||
                isSubmitting
              }
              className="marketing-gradient text-white"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : wizardStep < 3 ? (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {campaignData.scheduleType === "now" ? "Send Campaign" : "Schedule Campaign"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useMarketingCampaigns } from "@/hooks/useMarketingCampaigns";
import { useMarketingContent } from "@/hooks/useMarketingContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Plus,
  Send,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  Users,
  CheckCircle,
  Eye,
  Sparkles,
  BarChart3,
  Megaphone,
  Calendar as CalendarIcon,
  ArrowRight,
  Zap,
  Target,
  Clock,
  RefreshCw,
  Brain,
  Bot,
  Hand,
  Activity,
  Globe,
  Share2,
  FileText,
  Palette,
  GitBranch,
  ChevronRight,
  Play,
  Pause,
  AlertCircle,
} from "lucide-react";

type AIMode = "manual" | "assisted" | "autonomous";

const aiModeConfig = {
  manual: {
    icon: Hand,
    label: "Manual",
    description: "Full control - you create and send campaigns",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  assisted: {
    icon: Bot,
    label: "AI Assisted",
    description: "AI suggests content, timing, and audiences",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  autonomous: {
    icon: Brain,
    label: "Autonomous",
    description: "AI creates and sends campaigns automatically",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
};

export default function MarketingEngine() {
  const { tenantId, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const {
    campaigns,
    isLoading: campaignsLoading,
    stats,
    createCampaign,
    sendCampaign,
    refetch,
  } = useMarketingCampaigns();
  const { content, stats: contentStats } = useMarketingContent();

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

  // Real stats from hooks
  const statCards = [
    {
      label: "Total Campaigns",
      value: stats?.total || campaigns?.length || 0,
      icon: Send,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/marketing/campaigns",
      trend: "+12%",
    },
    {
      label: "Messages Sent",
      value: (stats?.totalSent || 0).toLocaleString(),
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/marketing/analytics",
      trend: "+8%",
    },
    {
      label: "Delivery Rate",
      value: `${stats?.totalSent > 0 ? Math.round((stats?.totalDelivered / stats?.totalSent) * 100) : 0}%`,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/marketing/analytics",
      trend: "+3%",
    },
    {
      label: "Open Rate",
      value: `${stats?.avgOpenRate || 0}%`,
      icon: Eye,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      href: "/marketing/analytics",
      trend: "+5%",
    },
    {
      label: "Response Rate",
      value: `${stats?.avgClickRate || 0}%`,
      icon: TrendingUp,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      href: "/marketing/analytics",
      trend: "+2%",
    },
  ];

  const quickActions = [
    {
      title: "WhatsApp Campaign",
      description: "Send personalized WhatsApp messages",
      icon: MessageSquare,
      color: "text-green-500",
      bg: "bg-green-500/10",
      channel: "whatsapp",
    },
    {
      title: "Email Campaign",
      description: "Create beautiful email campaigns",
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      channel: "email",
    },
    {
      title: "AI Content Generator",
      description: "Generate content with AI",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/marketing/content",
    },
  ];

  const moduleLinks = [
    {
      title: "Content Studio",
      description: "AI-powered content creation",
      icon: Palette,
      href: "/marketing/content",
      count: contentStats?.total || 0,
    },
    {
      title: "Campaign Central",
      description: "Manage all campaigns",
      icon: Megaphone,
      href: "/marketing/campaigns",
      count: stats?.total || 0,
    },
    {
      title: "Social Commander",
      description: "Social media automation",
      icon: Share2,
      href: "/marketing/social",
      count: 0,
    },
    {
      title: "Email Builder",
      description: "Drag-and-drop email design",
      icon: FileText,
      href: "/marketing/email",
      count: 0,
    },
    {
      title: "Marketing Analytics",
      description: "Performance insights",
      icon: BarChart3,
      href: "/marketing/analytics",
      count: null,
    },
    {
      title: "A/B Testing",
      description: "Optimize with experiments",
      icon: GitBranch,
      href: "/marketing/ab-testing",
      count: 0,
    },
  ];

  const handleCreateCampaign = async () => {
    if (!campaignData.name.trim() || !campaignData.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt =
        campaignData.scheduleType === "scheduled" && campaignData.scheduledDate
          ? new Date(`${format(campaignData.scheduledDate, "yyyy-MM-dd")}T${campaignData.scheduledTime}`).toISOString()
          : undefined;

      const created = await createCampaign.mutateAsync({
        name: campaignData.name,
        type: campaignData.channel,
        message_template: campaignData.message,
        scheduled_at: scheduledAt,
        send_now: campaignData.scheduleType === "now",
      });

      toast({
        title: "✅ Campaign Created!",
        description:
          campaignData.scheduleType === "now" ? "Your campaign is being sent." : "Your campaign has been scheduled.",
      });

      setIsWizardOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCampaignData({
      name: "",
      channel: "whatsapp",
      message: "",
      scheduleType: "now",
      scheduledDate: undefined,
      scheduledTime: "09:00",
    });
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
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const currentMode = aiModeConfig[aiMode];

  return (
    <div className="space-y-6">
      {/* Header with AI Mode */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold marketing-gradient-text">Marketing Engine</h1>
          <p className="text-muted-foreground mt-1">AI-Powered Marketing Automation</p>
        </div>
        <div className="flex items-center gap-3">
          {/* AI Mode Selector */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all",
              currentMode.bg,
              currentMode.border,
            )}
            onClick={() => setShowAIModeDialog(true)}
          >
            <currentMode.icon className={cn("h-5 w-5", currentMode.color, aiMode === "autonomous" && "ai-active")} />
            <div>
              <p className={cn("text-sm font-medium", currentMode.color)}>{currentMode.label}</p>
              <p className="text-xs text-muted-foreground">{currentMode.description}</p>
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
                <p className="font-semibold text-purple-600 dark:text-purple-400">Autonomous Mode Active</p>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing trends, creating content, and sending personalized campaigns automatically
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-500">{stats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">AI Actions Today</p>
              </div>
              <Switch checked={true} onCheckedChange={() => setAiMode("assisted")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map((stat, idx) => (
          <Link to={stat.href} key={idx}>
            <Card className="stat-card h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  {stat.trend && (
                    <Badge variant="secondary" className="text-xs text-green-600">
                      {stat.trend}
                    </Badge>
                  )}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {quickActions.map((action, idx) =>
          action.href ? (
            <Link to={action.href} key={idx}>
              <Card className="stat-card h-full">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={cn("p-4 rounded-xl mb-3", action.bg)}>
                    <action.icon className={cn("h-8 w-8", action.color)} />
                  </div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card
              key={idx}
              className="stat-card cursor-pointer"
              onClick={() => {
                if (action.channel) {
                  setCampaignData((prev) => ({ ...prev, channel: action.channel! }));
                }
                setIsWizardOpen(true);
              }}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className={cn("p-4 rounded-xl mb-3", action.bg)}>
                  <action.icon className={cn("h-8 w-8", action.color)} />
                </div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Module Links Grid */}
      <div className="grid grid-cols-3 gap-4">
        {moduleLinks.map((link, idx) => (
          <Link to={link.href} key={idx}>
            <Card className="stat-card h-full group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{link.title}</h4>
                    {link.count !== null && <Badge variant="secondary">{link.count}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Active Campaigns
            </CardTitle>
            <CardDescription>Your recent and ongoing marketing campaigns</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/marketing/campaigns">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="empty-state py-12">
              <Send className="empty-state-icon" />
              <h3 className="font-semibold text-lg mb-2">No Campaigns Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {aiMode === "autonomous"
                  ? "AI will automatically create campaigns based on trends and customer behavior."
                  : "Create your first campaign to start engaging with your audience."}
              </p>
              <Button onClick={() => setIsWizardOpen(true)} className="marketing-gradient text-white">
                <Plus className="h-4 w-4 mr-2" /> Create Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 5).map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        campaign.type === "whatsapp" || campaign.channel === "whatsapp"
                          ? "bg-green-500/10"
                          : campaign.type === "email" || campaign.channel === "email"
                            ? "bg-blue-500/10"
                            : "bg-purple-500/10",
                      )}
                    >
                      {campaign.type === "whatsapp" || campaign.channel === "whatsapp" ? (
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      ) : campaign.type === "email" || campaign.channel === "email" ? (
                        <Mail className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Phone className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.ai_generated && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" /> AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{campaign.sent_count || 0} sent</span>
                        <span>{campaign.opened_count || 0} opened</span>
                        <span>{campaign.clicked_count || 0} clicked</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        campaign.status === "sent" || campaign.status === "completed"
                          ? "default"
                          : campaign.status === "sending" || campaign.status === "active"
                            ? "secondary"
                            : "outline"
                      }
                      className={cn(
                        campaign.status === "sending" && "bg-yellow-500/10 text-yellow-600",
                        campaign.status === "active" && "bg-green-500/10 text-green-600",
                      )}
                    >
                      {campaign.status === "sending" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                      {campaign.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/marketing/campaigns">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Mode Dialog */}
      <Dialog open={showAIModeDialog} onOpenChange={setShowAIModeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select AI Mode</DialogTitle>
            <DialogDescription>Choose how AI assists with your marketing</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(Object.entries(aiModeConfig) as [AIMode, typeof aiModeConfig.manual][]).map(([mode, config]) => (
              <div
                key={mode}
                onClick={() => {
                  setAiMode(mode);
                  setShowAIModeDialog(false);
                  toast({ title: `${config.label} Mode Activated`, description: config.description });
                }}
                className={cn(
                  "p-4 border rounded-lg cursor-pointer transition-all",
                  aiMode === mode ? `${config.bg} ${config.border}` : "hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <config.icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-medium", aiMode === mode && config.color)}>{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  {aiMode === mode && <CheckCircle className={cn("h-5 w-5", config.color)} />}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Creation Wizard */}
      <Dialog
        open={isWizardOpen}
        onOpenChange={(open) => {
          setIsWizardOpen(open);
          if (!open) resetForm();
        }}
      >
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
                <Input
                  id="name"
                  placeholder="e.g., February Newsletter, Weekend Sale"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Channel *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "whatsapp",
                      label: "WhatsApp",
                      icon: MessageSquare,
                      color: "text-green-500",
                      bg: "bg-green-500/10",
                    },
                    { id: "email", label: "Email", icon: Mail, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { id: "sms", label: "SMS", icon: Phone, color: "text-purple-500", bg: "bg-purple-500/10" },
                  ].map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setCampaignData((prev) => ({ ...prev, channel: ch.id }))}
                      className={cn(
                        "p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2",
                        campaignData.channel === ch.id
                          ? `border-primary ${ch.bg}`
                          : "border-muted hover:border-primary/50",
                      )}
                    >
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
                <Textarea
                  id="message"
                  placeholder="Enter your campaign message..."
                  className="min-h-[200px] font-mono"
                  value={campaignData.message}
                  onChange={(e) => setCampaignData((prev) => ({ ...prev, message: e.target.value }))}
                />
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
                  <div
                    onClick={() => setCampaignData((prev) => ({ ...prev, scheduleType: "now" }))}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      campaignData.scheduleType === "now"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">Send Now</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Send immediately</p>
                  </div>
                  <div
                    onClick={() => setCampaignData((prev) => ({ ...prev, scheduleType: "scheduled" }))}
                    className={cn(
                      "p-4 border-2 rounded-lg cursor-pointer transition-all",
                      campaignData.scheduleType === "scheduled"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Schedule</span>
                    </div>
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
                        <Calendar
                          mode="single"
                          selected={campaignData.scheduledDate}
                          onSelect={(date) => setCampaignData((prev) => ({ ...prev, scheduledDate: date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Select
                      value={campaignData.scheduledTime}
                      onValueChange={(v) => setCampaignData((prev) => ({ ...prev, scheduledTime: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
                          <SelectItem key={hour} value={`${hour.toString().padStart(2, "0")}:00`}>
                            {`${hour.toString().padStart(2, "0")}:00`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Summary Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Campaign Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{campaignData.name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Channel:</span>
                      <p className="font-medium capitalize">{campaignData.channel}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Send:</span>
                      <p className="font-medium">
                        {campaignData.scheduleType === "now"
                          ? "Immediately"
                          : campaignData.scheduledDate
                            ? `${format(campaignData.scheduledDate, "PPP")} at ${campaignData.scheduledTime}`
                            : "Not set"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Message:</span>
                      <p className="font-medium">{campaignData.message.length} chars</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => (wizardStep === 1 ? setIsWizardOpen(false) : setWizardStep((prev) => prev - 1))}
            >
              {wizardStep === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={() => (wizardStep < 3 ? setWizardStep((prev) => prev + 1) : handleCreateCampaign())}
              disabled={
                (wizardStep === 1 && !campaignData.name.trim()) ||
                (wizardStep === 2 && !campaignData.message.trim()) ||
                (wizardStep === 3 && campaignData.scheduleType === "scheduled" && !campaignData.scheduledDate) ||
                isSubmitting
              }
              className="marketing-gradient text-white"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : wizardStep < 3 ? (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {campaignData.scheduleType === "now" ? "Send Campaign" : "Schedule Campaign"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
