// src/pages/sales/AutoLeadGen.tsx
// COMPLETE AUTO LEAD GEN - FIXED VERSION WITH ALL FEATURES
// Version 3.0 - Clickable leads, History, Saved searches

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TierBadge } from "@/components/subscription";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Building2,
  Users,
  Briefcase,
  Globe,
  MessageCircle,
  Zap,
  Loader2,
  RefreshCw,
  Check,
  X,
  Lock,
  Crown,
  TrendingUp,
  Radio,
  Save,
  History,
  Search,
  Plus,
  Flame,
  Snowflake,
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  Globe2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format, formatDistanceToNow } from "date-fns";

// =====================================================
// TYPES
// =====================================================
interface SalesLead {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  job_title: string;
  website: string;
  linkedin_url: string;
  source: string;
  source_channel: string;
  lead_score: number;
  lead_grade: string;
  temperature: string;
  status: string;
  notes: string;
  snippet: string;
  industry: string;
  created_at: string;
  updated_at: string;
}

interface GeneratedLead {
  id: string;
  company: string;
  contact: string;
  email: string;
  title: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  status: "new" | "enriching" | "added" | "dismissed";
  source: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  temperature?: "hot" | "warm" | "cold";
  snippet?: string;
  industry?: string;
}

// =====================================================
// CONSTANTS
// =====================================================
const INDUSTRIES = [
  { id: "real_estate", label: "Real Estate", icon: "🏠" },
  { id: "healthcare", label: "Healthcare", icon: "🏥" },
  { id: "salon", label: "Salon & Beauty", icon: "💇" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "flooring", label: "Flooring", icon: "🏗️" },
  { id: "technology", label: "Technology", icon: "💻" },
  { id: "general", label: "General", icon: "🏢" },
];

// =====================================================
// HELPER COMPONENTS
// =====================================================
const GradeBadge = ({ grade }: { grade: string }) => {
  const colors: Record<string, string> = {
    A: "bg-green-500 text-white",
    B: "bg-blue-500 text-white",
    C: "bg-amber-500 text-white",
    D: "bg-red-500 text-white",
  };
  return (
    <Badge
      className={cn(
        "h-6 w-6 rounded-full p-0 flex items-center justify-center",
        colors[grade] || "bg-gray-500 text-white",
      )}
    >
      {grade}
    </Badge>
  );
};

const TemperatureBadge = ({ temperature }: { temperature?: string }) => {
  if (!temperature) return null;
  const config: Record<string, { icon: typeof Flame; color: string }> = {
    hot: { icon: Flame, color: "bg-red-500/10 text-red-600 border-red-200" },
    warm: { icon: TrendingUp, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
    cold: { icon: Snowflake, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  };
  const { icon: Icon, color } = config[temperature] || config.cold;
  return (
    <Badge variant="outline" className={cn("gap-1", color)}>
      <Icon className="h-3 w-3" />
      {temperature}
    </Badge>
  );
};

const SourceBadge = ({ source }: { source: string }) => {
  const colors: Record<string, string> = {
    apollo: "bg-purple-500",
    hunter: "bg-orange-500",
    google: "bg-blue-500",
    apify: "bg-green-500",
    intent: "bg-pink-500",
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
    facebook: "bg-blue-600",
    linkedin: "bg-blue-700",
    website: "bg-teal-500",
    whatsapp: "bg-green-600",
  };
  return (
    <Badge className={cn("text-white text-xs", colors[source?.toLowerCase()] || "bg-gray-500")}>
      {source || "unknown"}
    </Badge>
  );
};

// =====================================================
// LEAD DETAIL SHEET
// =====================================================
function LeadDetailSheet({
  lead,
  open,
  onClose,
  onAddToPipeline,
}: {
  lead: SalesLead | null;
  open: boolean;
  onClose: () => void;
  onAddToPipeline?: (lead: SalesLead) => void;
}) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            {lead.company_name || "Unknown Company"}
          </SheetTitle>
          <SheetDescription>Lead details and contact information</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <GradeBadge grade={lead.lead_grade || "C"} />
            <TemperatureBadge temperature={lead.temperature} />
            <SourceBadge source={lead.source} />
            <Badge variant="outline">{lead.status}</Badge>
          </div>

          {/* Score */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Lead Score</span>
            <div className="flex items-center gap-2">
              <Progress value={lead.lead_score || 0} className="w-24 h-2" />
              <span className="font-bold">{lead.lead_score || 0}</span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>

            {lead.contact_name && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{lead.contact_name}</p>
                  {lead.job_title && <p className="text-sm text-muted-foreground">{lead.job_title}</p>}
                </div>
              </div>
            )}

            {lead.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}

            {lead.website && (
              <div className="flex items-center gap-3">
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[300px]"
                >
                  {lead.website}
                </a>
              </div>
            )}

            {lead.linkedin_url && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                <a
                  href={lead.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LinkedIn Profile
                </a>
              </div>
            )}
          </div>

          {/* Snippet/Notes */}
          {(lead.snippet || lead.notes) && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
              <p className="text-sm bg-muted p-3 rounded-lg">{lead.snippet || lead.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Source Channel</span>
              <span>{lead.source_channel || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Industry</span>
              <span>{lead.industry || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{lead.created_at ? format(new Date(lead.created_at), "PPp") : "-"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={() => onAddToPipeline?.(lead)}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Pipeline
            </Button>
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function AutoLeadGen() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Subscription
  const { tier, limits, usage, canUseFeature, getRemainingCredits, refreshUsage } = useSubscription();

  // Main state
  const [mainTab, setMainTab] = useState<"generate" | "saved" | "history" | "leads">("generate");
  const [searchType, setSearchType] = useState<"b2b" | "intent">("b2b");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState([10]);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("Dubai");
  const [country, setCountry] = useState("UAE");
  const [companySize, setCompanySize] = useState("all");
  const [jobTitles, setJobTitles] = useState("");
  const [usePremiumSources, setUsePremiumSources] = useState(true);

  // Intent state
  const [platforms, setPlatforms] = useState({ reddit: true, twitter: true, forums: false, linkedin: false });
  const [intentKeywords, setIntentKeywords] = useState("");

  // Generated leads queue
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([]);

  // Lead detail
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("daily");

  // Computed
  const maxLeadsAllowed = Math.min(getRemainingCredits("leads") || 100, 25);
  const hasPremiumSources = canUseFeature("has_apollo_access") || canUseFeature("has_hunter_access");

  // =====================================================
  // FETCH LEADS FROM DATABASE
  // =====================================================
  const {
    data: recentLeads = [],
    isLoading: loadingLeads,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["auto-lead-gen-leads", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("sales_leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // FETCH SEARCH HISTORY
  // =====================================================
  const {
    data: searchHistory = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["lead-gen-history", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("sales_leads")
        .select("created_at, source, source_channel, industry, lead_score, lead_grade, temperature")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by time (5 min sessions)
      const sessions: any[] = [];
      let currentSession: any = null;

      data.forEach((lead) => {
        const leadTime = new Date(lead.created_at).getTime();

        if (!currentSession || leadTime < currentSession.startTime - 5 * 60 * 1000) {
          if (currentSession) sessions.push(currentSession);
          currentSession = {
            id: lead.created_at,
            created_at: lead.created_at,
            startTime: leadTime,
            search_type: lead.source_channel?.includes("intent") ? "intent" : "b2b",
            industry: lead.industry,
            leads_found: 1,
            sources_used: [lead.source],
            hot_leads: lead.temperature === "hot" ? 1 : 0,
            warm_leads: lead.temperature === "warm" ? 1 : 0,
            cold_leads: lead.temperature === "cold" ? 1 : 0,
          };
        } else {
          currentSession.leads_found++;
          if (lead.source && !currentSession.sources_used.includes(lead.source)) {
            currentSession.sources_used.push(lead.source);
          }
          if (lead.temperature === "hot") currentSession.hot_leads++;
          else if (lead.temperature === "warm") currentSession.warm_leads++;
          else currentSession.cold_leads++;
        }
      });

      if (currentSession) sessions.push(currentSession);
      return sessions.slice(0, 20);
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // GENERATE B2B LEADS
  // =====================================================
  const handleGenerateB2B = async () => {
    if (!keywords && !selectedIndustry) {
      toast({ title: "Missing criteria", description: "Enter keywords or select industry", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const webhookUrl =
        hasPremiumSources && usePremiumSources
          ? "https://webhooks.zatesystems.com/webhook/premium-b2b-lead-gen"
          : "https://webhooks.zatesystems.com/webhook/lead-gen-request";

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          keywords: keywords || selectedIndustry,
          industry: selectedIndustry || "general",
          location,
          country,
          company_size: companySize,
          job_titles: jobTitles
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          max_leads: generateCount[0],
          use_premium_sources: usePremiumSources && hasPremiumSources,
          ai_scoring: true,
        }),
      });

      const data = await response.json();

      if (data.success && data.leads) {
        const newLeads: GeneratedLead[] = data.leads.map((lead: any) => ({
          id: lead.lead_id || lead.id || `lead-${Date.now()}-${Math.random()}`,
          company: lead.company || lead.company_name,
          contact: lead.contact || lead.contact_name || "",
          email: lead.email || "",
          title: lead.title || lead.job_title || "",
          score: lead.score || lead.lead_score || 0,
          grade: lead.grade || lead.lead_grade || "C",
          status: lead.status === "saved" ? "added" : "new",
          source: lead.source || "google",
          phone: lead.phone,
          linkedin: lead.linkedin_url || lead.linkedin,
          website: lead.website,
          temperature: lead.temperature,
          snippet: lead.snippet,
          industry: lead.industry,
        }));

        setGeneratedLeads((prev) => [...newLeads, ...prev]);
        toast({
          title: "Leads generated!",
          description: `${data.leads_found || newLeads.length} leads found. ${data.leads_saved || 0} saved.`,
        });
        refreshUsage();
        refetchHistory();
        refetchLeads();
      } else {
        toast({
          title: "No leads found",
          description: data.message || "Try different criteria",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Lead gen error:", error);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // =====================================================
  // GENERATE INTENT LEADS
  // =====================================================
  const handleGenerateIntent = async () => {
    if (!canUseFeature("has_intent_leads")) {
      toast({
        title: "Upgrade required",
        description: "Intent detection requires Professional plan",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("https://webhooks.zatesystems.com/webhook/intent-lead-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          industry: selectedIndustry || "general",
          city: location,
          country,
          keywords: intentKeywords,
          lead_type: "buyer",
          max_results: 20,
          platforms: Object.entries(platforms)
            .filter(([_, v]) => v)
            .map(([k]) => k),
        }),
      });

      const data = await response.json();

      if (data.success && data.leads) {
        const newLeads: GeneratedLead[] = data.leads.map((lead: any) => ({
          id: lead.lead_id || `intent-${Date.now()}-${Math.random()}`,
          company: lead.company_name || "",
          contact: lead.contact_name || lead.username || "",
          email: lead.email || "",
          title: "",
          score: lead.score || 0,
          grade: lead.grade || "C",
          status: "new",
          source: "intent",
          website: lead.website || lead.source_url,
          snippet: lead.snippet || lead.post_content,
        }));

        setGeneratedLeads((prev) => [...newLeads, ...prev]);
        toast({ title: "Intent leads found!", description: `${newLeads.length} potential buyers detected` });
        refreshUsage();
        refetchHistory();
      }
    } catch (error) {
      toast({ title: "Intent search failed", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // =====================================================
  // ADD TO PIPELINE
  // =====================================================
  const addToPipelineMutation = useMutation({
    mutationFn: async (lead: GeneratedLead) => {
      const { data, error } = await supabase
        .from("sales_leads")
        .insert({
          tenant_id: tenantId,
          contact_name: lead.contact,
          company_name: lead.company,
          email: lead.email,
          phone: lead.phone || null,
          job_title: lead.title,
          website: lead.website,
          linkedin_url: lead.linkedin,
          source: lead.source,
          source_channel: "auto_lead_gen",
          lead_score: lead.score,
          lead_grade: lead.grade,
          temperature: lead.temperature || (lead.grade === "A" ? "hot" : lead.grade === "B" ? "warm" : "cold"),
          status: "new",
          snippet: lead.snippet,
          industry: lead.industry,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, lead) => {
      setGeneratedLeads((leads) => leads.map((l) => (l.id === lead.id ? { ...l, status: "added" as const } : l)));
      queryClient.invalidateQueries({ queryKey: ["sales-leads", tenantId] });
      refetchLeads();
      toast({ title: "Lead added to pipeline!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    },
  });

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Auto Lead Gen</h1>
                <TierBadge />
              </div>
              <p className="text-muted-foreground mt-1">AI-powered lead generation • {tier} Plan</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Leads</div>
                <div className="text-xl font-bold">
                  {usage?.leads_generated || 0} / {limits?.max_leads_per_month || 100}
                </div>
              </div>
              <Button variant="outline" onClick={() => refreshUsage()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="generate" className="gap-2">
              <Zap className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Save className="h-4 w-4" />
              Saved (0)
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads ({recentLeads.length})
            </TabsTrigger>
          </TabsList>

          {/* GENERATE TAB */}
          <TabsContent value="generate">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {/* Search Type Toggle */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-2">
                      <Button
                        variant={searchType === "b2b" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setSearchType("b2b")}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        B2B Leads
                      </Button>
                      <Button
                        variant={searchType === "intent" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setSearchType("intent")}
                        disabled={!canUseFeature("has_intent_leads")}
                      >
                        <Radio className="h-4 w-4 mr-2" />
                        Intent Signals
                        {!canUseFeature("has_intent_leads") && <Lock className="h-3 w-3 ml-1" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {searchType === "b2b" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        B2B Lead Generation
                      </CardTitle>
                      <CardDescription>{getRemainingCredits("b2b_searches") || 100} searches remaining</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3 text-green-500" /> Google
                        </Badge>
                        {canUseFeature("has_hunter_access") && (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3 text-green-500" /> Hunter
                          </Badge>
                        )}
                        {canUseFeature("has_apollo_access") && (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3 text-green-500" /> Apollo
                          </Badge>
                        )}
                        {canUseFeature("has_apify_access") && (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3 text-green-500" /> Apify
                          </Badge>
                        )}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind.id} value={ind.id}>
                                {ind.icon} {ind.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Keywords</Label>
                        <Input
                          placeholder="e.g., flooring contractors"
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Company Size</Label>
                        <Select value={companySize} onValueChange={setCompanySize}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sizes</SelectItem>
                            <SelectItem value="small">1-50 employees</SelectItem>
                            <SelectItem value="medium">51-200 employees</SelectItem>
                            <SelectItem value="large">201-500 employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Job Titles</Label>
                        <Input
                          placeholder="CEO, Owner, Director"
                          value={jobTitles}
                          onChange={(e) => setJobTitles(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Number of Leads</Label>
                          <span className="font-medium">{generateCount[0]}</span>
                        </div>
                        <Slider
                          value={generateCount}
                          onValueChange={setGenerateCount}
                          min={1}
                          max={Math.max(1, maxLeadsAllowed)}
                          step={1}
                        />
                      </div>
                      {hasPremiumSources && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium">Premium Sources</div>
                              <div className="text-xs text-muted-foreground">Higher quality leads</div>
                            </div>
                          </div>
                          <Switch checked={usePremiumSources} onCheckedChange={setUsePremiumSources} />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button className="flex-1" onClick={handleGenerateB2B} disabled={isGenerating}>
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Generate Leads
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5" />
                        Intent-Based Leads
                      </CardTitle>
                      <CardDescription>
                        {getRemainingCredits("intent_searches") || 50} searches remaining
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Label>Monitor Platforms</Label>
                        {Object.entries({
                          reddit: { icon: MessageCircle, label: "Reddit" },
                          twitter: { icon: Globe, label: "Twitter/X" },
                          forums: { icon: Globe, label: "Forums" },
                          linkedin: { icon: Briefcase, label: "LinkedIn" },
                        }).map(([key, { icon: Icon, label }]) => (
                          <div key={key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{label}</span>
                            </div>
                            <Switch
                              checked={platforms[key as keyof typeof platforms]}
                              onCheckedChange={(v) => setPlatforms({ ...platforms, [key]: v })}
                            />
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Intent Keywords</Label>
                        <Input
                          placeholder="looking for, need help"
                          value={intentKeywords}
                          onChange={(e) => setIntentKeywords(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind.id} value={ind.id}>
                                {ind.icon} {ind.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button className="flex-1" onClick={handleGenerateIntent} disabled={isGenerating}>
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Find Intent Signals
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {/* Usage */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Usage This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Leads Generated</span>
                      <span className="font-medium">
                        {usage?.leads_generated || 0} / {limits?.max_leads_per_month || 100}
                      </span>
                    </div>
                    <Progress value={((usage?.leads_generated || 0) / (limits?.max_leads_per_month || 100)) * 100} />
                  </CardContent>
                </Card>
              </div>

              {/* Queue */}
              <Card className="h-fit">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Leads Queue</CardTitle>
                      <CardDescription>
                        {generatedLeads.filter((l) => l.status === "new").length} ready for review
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {generatedLeads.filter((l) => l.status === "new").length > 0 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            generatedLeads
                              .filter((l) => l.status === "new")
                              .forEach((lead) => addToPipelineMutation.mutate(lead))
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add All
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => refetchLeads()}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {generatedLeads.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No leads in queue</p>
                      <p className="text-sm">Configure search and generate leads</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {generatedLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className={cn(
                              "p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                              lead.status === "added" && "bg-green-50 border-green-200",
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium truncate">{lead.company || "Unknown"}</h4>
                                  <GradeBadge grade={lead.grade} />
                                  <TemperatureBadge temperature={lead.temperature} />
                                </div>
                                {lead.contact && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {lead.contact} {lead.title && `• ${lead.title}`}
                                  </p>
                                )}
                                {lead.snippet && (
                                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{lead.snippet}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <SourceBadge source={lead.source} />
                                  <span className="text-xs text-muted-foreground">Score: {lead.score}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                {lead.status === "new" ? (
                                  <>
                                    <Button size="sm" onClick={() => addToPipelineMutation.mutate(lead)}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setGeneratedLeads((l) => l.filter((x) => x.id !== lead.id))}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Added
                                  </Badge>
                                )}
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
          </TabsContent>

          {/* SAVED TAB */}
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Searches</CardTitle>
                <CardDescription>Your saved search configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Save className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No saved searches yet</p>
                  <Button className="mt-4" onClick={() => setMainTab("generate")}>
                    <Zap className="h-4 w-4 mr-2" />
                    Create Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Search History</CardTitle>
                    <CardDescription>Recent lead generation activities</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => refetchHistory()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : searchHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No search history yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Found</TableHead>
                        <TableHead>Hot</TableHead>
                        <TableHead>Warm</TableHead>
                        <TableHead>Sources</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchHistory.map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{h.search_type}</Badge>
                          </TableCell>
                          <TableCell>{h.industry || "-"}</TableCell>
                          <TableCell className="font-medium">{h.leads_found}</TableCell>
                          <TableCell>
                            <span className="text-red-600">{h.hot_leads}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-amber-600">{h.warm_leads}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(h.sources_used || []).slice(0, 3).map((s: string) => (
                                <SourceBadge key={s} source={s} />
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADS TAB */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generated Leads</CardTitle>
                    <CardDescription>Click any lead to view details</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/sales/pipeline")}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Pipeline
                    </Button>
                    <Button variant="outline" onClick={() => refetchLeads()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : recentLeads.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No leads yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLeads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowLeadDetail(true);
                          }}
                        >
                          <TableCell className="font-medium">{lead.company_name || "-"}</TableCell>
                          <TableCell>{lead.contact_name || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{lead.email || "-"}</TableCell>
                          <TableCell>
                            <SourceBadge source={lead.source} />
                          </TableCell>
                          <TableCell>{lead.lead_score || 0}</TableCell>
                          <TableCell>
                            <GradeBadge grade={lead.lead_grade || "C"} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{lead.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        open={showLeadDetail}
        onClose={() => setShowLeadDetail(false)}
        onAddToPipeline={(lead) => navigate(`/sales/pipeline?addLead=${lead.id}`)}
      />

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search Configuration</DialogTitle>
            <DialogDescription>Save to run again later</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Name</Label>
              <Input
                placeholder="e.g., Dubai Flooring"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Scheduling</Label>
                <p className="text-sm text-muted-foreground">Auto-run this search</p>
              </div>
              <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} />
            </div>
            {enableSchedule && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({ title: "Search saved!" });
                setShowSaveDialog(false);
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
