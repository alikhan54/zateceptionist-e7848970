// src/pages/sales/AutoLeadGen.tsx
// COMPLETE AUTO LEAD GEN WITH SAVED SEARCHES, SCHEDULING & HISTORY
// Version 2.0 - Production Ready

import { useState, useEffect, useCallback } from "react";
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
import {
  FeatureGate,
  UsageMeter,
  DataSourceBadge,
  DataSourceIndicator,
  TierBadge,
  LimitWarning,
} from "@/components/subscription";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Play,
  Pause,
  Building2,
  MapPin,
  Users,
  Briefcase,
  Globe,
  MessageCircle,
  Twitter,
  Zap,
  Loader2,
  RefreshCw,
  Check,
  ArrowRight,
  X,
  Lock,
  Crown,
  TrendingUp,
  Radio,
  Clock,
  Calendar,
  Save,
  Settings,
  History,
  Search,
  Plus,
  Trash2,
  Edit,
  Copy,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Target,
  Database,
  Filter,
  Download,
  Eye,
  EyeOff,
  Star,
  Flame,
  Snowflake,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { GradeBadge } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, formatDistanceToNow } from "date-fns";

// =====================================================
// TYPES
// =====================================================
interface GeneratedLead {
  id: string;
  company: string;
  contact: string;
  email: string;
  title: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  status: "new" | "enriching" | "added" | "dismissed";
  source: "apollo" | "hunter" | "google" | "apify" | "intent";
  phone?: string;
  linkedin?: string;
  website?: string;
  temperature?: "hot" | "warm" | "cold";
  snippet?: string;
}

interface SavedSearch {
  id: string;
  tenant_id: string;
  name: string;
  search_type: "b2b" | "b2c_intent" | "premium_b2b";
  keywords: string;
  industry: string;
  location: string;
  country: string;
  company_size: string;
  job_titles: string[];
  max_leads: number;
  intent_keywords: string;
  platforms: Record<string, boolean>;
  use_premium_sources: boolean;
  ai_scoring: boolean;
  auto_enroll_sequence: boolean;
  sequence_id: string | null;
  is_scheduled: boolean;
  schedule_frequency: string | null;
  schedule_time: string | null;
  schedule_days: number[] | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  total_runs: number;
  total_leads_found: number;
  total_leads_saved: number;
  created_at: string;
}

interface SearchHistory {
  id: string;
  tenant_id: string;
  search_id: string | null;
  search_type: string;
  keywords: string;
  industry: string;
  location: string;
  country: string;
  request_id: string;
  leads_found: number;
  leads_saved: number;
  duplicates_skipped: number;
  average_score: number;
  grade_distribution: Record<string, number>;
  hot_leads: number;
  warm_leads: number;
  sources_used: string[];
  triggered_by: string;
  execution_time_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

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
  created_at: string;
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

const SCHEDULE_FREQUENCIES = [
  { id: "hourly", label: "Every Hour" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

// =====================================================
// HELPER COMPONENTS
// =====================================================
const TemperatureBadge = ({ temperature }: { temperature?: string }) => {
  if (!temperature) return null;
  const config = {
    hot: { icon: Flame, color: "bg-red-500/10 text-red-600 border-red-200" },
    warm: { icon: TrendingUp, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
    cold: { icon: Snowflake, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  };
  const { icon: Icon, color } = config[temperature as keyof typeof config] || config.cold;
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
  };
  return <Badge className={cn("text-white", colors[source] || "bg-gray-500")}>{source}</Badge>;
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function AutoLeadGen() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Subscription context
  const {
    tier,
    tierConfig,
    limits,
    usage,
    isLoadingUsage,
    canUseFeature,
    hasReachedLimit,
    getRemainingCredits,
    refreshUsage,
  } = useSubscription();

  // Main tabs
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

  // Intent config
  const [platforms, setPlatforms] = useState({
    reddit: true,
    twitter: true,
    forums: false,
    linkedin: false,
  });
  const [intentKeywords, setIntentKeywords] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Generated leads queue
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([]);

  // Save search dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState("daily");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  // Max leads based on remaining credits
  const maxLeadsAllowed = Math.min(getRemainingCredits("leads"), 25);
  const hasPremiumSources =
    canUseFeature("has_apollo_access") || canUseFeature("has_hunter_access") || canUseFeature("has_apify_access");

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch saved searches
  const {
    data: savedSearches = [],
    isLoading: loadingSavedSearches,
    refetch: refetchSavedSearches,
  } = useQuery({
    queryKey: ["lead-gen-searches", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("lead_gen_searches")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedSearch[];
    },
    enabled: !!tenantId,
  });

  // Fetch search history
  const {
    data: searchHistory = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["lead-gen-history", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("lead_gen_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SearchHistory[];
    },
    enabled: !!tenantId,
  });

  // Fetch recent leads from database
  const {
    data: recentLeads = [],
    isLoading: loadingLeads,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["sales-leads-recent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("sales_leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("source_channel", ["auto_lead_gen", "b2b_search", "premium_b2b", "intent"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // GENERATE B2B LEADS
  // =====================================================
  const handleGenerateB2B = async () => {
    if (hasReachedLimit("leads")) {
      toast({ title: "Lead limit reached", description: "Upgrade your plan for more leads", variant: "destructive" });
      return;
    }
    if (hasReachedLimit("b2b_searches")) {
      toast({
        title: "Daily search limit reached",
        description: "Try again tomorrow or upgrade",
        variant: "destructive",
      });
      return;
    }
    if (!keywords && !selectedIndustry) {
      toast({
        title: "Missing search criteria",
        description: "Enter keywords or select an industry",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

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
          ai_scoring: canUseFeature("has_ai_scoring"),
        }),
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

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
        }));

        setGeneratedLeads((prev) => [...newLeads, ...prev]);

        // Log to history
        await logSearchHistory({
          search_type: hasPremiumSources ? "premium_b2b" : "b2b",
          keywords,
          industry: selectedIndustry,
          location,
          country,
          request_id: data.request_id,
          leads_found: data.leads_found || newLeads.length,
          leads_saved: data.leads_saved || 0,
          duplicates_skipped: data.duplicates_skipped || 0,
          average_score: data.average_score,
          grade_distribution: data.grade_distribution,
          hot_leads: data.hot_leads || 0,
          warm_leads: data.warm_leads || 0,
          sources_used: data.sources_used || ["google"],
          triggered_by: "manual",
          execution_time_ms: executionTime,
          status: "completed",
        });

        toast({
          title: "Leads generated!",
          description: `${data.leads_found || newLeads.length} leads found. ${data.leads_saved || 0} saved to pipeline.`,
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
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" });
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
        title: "Feature not available",
        description: "Upgrade to Professional for intent detection",
        variant: "destructive",
      });
      return;
    }
    if (hasReachedLimit("intent_searches")) {
      toast({ title: "Daily intent search limit reached", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

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
      const executionTime = Date.now() - startTime;

      if (data.success && data.leads) {
        const newLeads: GeneratedLead[] = data.leads.map((lead: any) => ({
          id: lead.lead_id || `intent-${Date.now()}-${Math.random()}`,
          company: lead.company_name || "",
          contact: lead.contact_name || lead.username || "",
          email: lead.email || "",
          title: "",
          score: lead.score || lead.lead_score || 0,
          grade: lead.grade || lead.lead_grade || "C",
          status: "new",
          source: "intent",
          website: lead.website || lead.source_url,
          snippet: lead.snippet || lead.post_content,
        }));

        setGeneratedLeads((prev) => [...newLeads, ...prev]);

        // Log to history
        await logSearchHistory({
          search_type: "b2c_intent",
          keywords: intentKeywords,
          industry: selectedIndustry,
          location,
          country,
          request_id: data.request_id,
          leads_found: newLeads.length,
          leads_saved: 0,
          duplicates_skipped: 0,
          average_score: data.average_score,
          grade_distribution: data.grade_distribution,
          hot_leads: data.hot_leads || 0,
          warm_leads: data.warm_leads || 0,
          sources_used: Object.entries(platforms)
            .filter(([_, v]) => v)
            .map(([k]) => k),
          triggered_by: "manual",
          execution_time_ms: executionTime,
          status: "completed",
        });

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
  // LOG SEARCH HISTORY
  // =====================================================
  const logSearchHistory = async (historyData: Partial<SearchHistory>) => {
    try {
      await supabase.from("lead_gen_history").insert({
        tenant_id: tenantId,
        ...historyData,
      });
    } catch (e) {
      console.error("Failed to log history:", e);
    }
  };

  // =====================================================
  // SAVE SEARCH
  // =====================================================
  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast({ title: "Enter a name", variant: "destructive" });
      return;
    }

    try {
      const searchData = {
        tenant_id: tenantId,
        name: searchName,
        search_type: searchType === "intent" ? "b2c_intent" : hasPremiumSources ? "premium_b2b" : "b2b",
        keywords: searchType === "b2b" ? keywords : "",
        industry: selectedIndustry,
        location,
        country,
        company_size: companySize,
        job_titles: jobTitles
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        max_leads: generateCount[0],
        intent_keywords: searchType === "intent" ? intentKeywords : "",
        platforms: searchType === "intent" ? platforms : {},
        use_premium_sources: usePremiumSources && hasPremiumSources,
        ai_scoring: true,
        is_scheduled: enableSchedule,
        schedule_frequency: enableSchedule ? scheduleFrequency : null,
        schedule_time: enableSchedule ? scheduleTime : null,
        is_active: true,
      };

      const { error } = await supabase.from("lead_gen_searches").insert(searchData);
      if (error) throw error;

      toast({
        title: "Search saved!",
        description: enableSchedule ? "Scheduled searches will run automatically" : "You can run this search anytime",
      });
      setShowSaveDialog(false);
      setSearchName("");
      refetchSavedSearches();
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  // =====================================================
  // RUN SAVED SEARCH
  // =====================================================
  const runSavedSearch = async (search: SavedSearch) => {
    // Populate form with saved values
    setSelectedIndustry(search.industry || "");
    setKeywords(search.keywords || "");
    setLocation(search.location || "Dubai");
    setCountry(search.country || "UAE");
    setCompanySize(search.company_size || "all");
    setJobTitles((search.job_titles || []).join(", "));
    setGenerateCount([search.max_leads || 10]);
    setUsePremiumSources(search.use_premium_sources);

    if (search.search_type === "b2c_intent") {
      setSearchType("intent");
      setIntentKeywords(search.intent_keywords || "");
      setPlatforms((search.platforms as any) || { reddit: true, twitter: true, forums: false, linkedin: false });
    } else {
      setSearchType("b2b");
    }

    setMainTab("generate");

    // Auto-run after brief delay
    setTimeout(() => {
      if (search.search_type === "b2c_intent") {
        handleGenerateIntent();
      } else {
        handleGenerateB2B();
      }
    }, 500);

    // Update last run
    await supabase
      .from("lead_gen_searches")
      .update({ last_run_at: new Date().toISOString(), total_runs: (search.total_runs || 0) + 1 })
      .eq("id", search.id);
    refetchSavedSearches();
  };

  // =====================================================
  // DELETE SAVED SEARCH
  // =====================================================
  const deleteSavedSearch = async (id: string) => {
    try {
      await supabase.from("lead_gen_searches").delete().eq("id", id);
      toast({ title: "Search deleted" });
      refetchSavedSearches();
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
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
      toast({ title: "Failed to add lead", description: error.message, variant: "destructive" });
    },
  });

  const handleDiscard = (leadId: string) => {
    setGeneratedLeads((leads) => leads.filter((l) => l.id !== leadId));
  };

  const addAllToPipeline = () => {
    const newLeads = generatedLeads.filter((l) => l.status === "new");
    newLeads.forEach((lead) => addToPipelineMutation.mutate(lead));
  };

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
        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="generate" className="gap-2">
              <Zap className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Save className="h-4 w-4" />
              Saved ({savedSearches.length})
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

          {/* ==================== GENERATE TAB ==================== */}
          <TabsContent value="generate">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Configuration */}
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
                  /* B2B Configuration */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        B2B Lead Generation
                      </CardTitle>
                      <CardDescription>{getRemainingCredits("b2b_searches")} searches remaining today</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Data Sources */}
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

                      {/* Industry */}
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

                      {/* Keywords */}
                      <div className="space-y-2">
                        <Label>Keywords</Label>
                        <Input
                          placeholder="e.g., flooring contractors, real estate agents"
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                        />
                      </div>

                      {/* Location */}
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

                      {/* Company Size */}
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
                            <SelectItem value="enterprise">500+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Job Titles */}
                      <div className="space-y-2">
                        <Label>Target Job Titles</Label>
                        <Input
                          placeholder="CEO, Owner, Director, Manager"
                          value={jobTitles}
                          onChange={(e) => setJobTitles(e.target.value)}
                        />
                      </div>

                      {/* Lead Count Slider */}
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
                          disabled={maxLeadsAllowed === 0}
                        />
                        <p className="text-xs text-muted-foreground">
                          {maxLeadsAllowed > 0 ? `Max ${maxLeadsAllowed} leads remaining` : "Lead limit reached"}
                        </p>
                      </div>

                      {/* Premium Sources Toggle */}
                      {hasPremiumSources && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium">Use Premium Sources</div>
                              <div className="text-xs text-muted-foreground">Higher quality, verified leads</div>
                            </div>
                          </div>
                          <Switch checked={usePremiumSources} onCheckedChange={setUsePremiumSources} />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleGenerateB2B}
                        disabled={isGenerating || maxLeadsAllowed === 0}
                      >
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
                  /* Intent Configuration */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5" />
                        Intent-Based Leads
                      </CardTitle>
                      <CardDescription>
                        {getRemainingCredits("intent_searches")} intent searches remaining today
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Platform Toggles */}
                      <div className="space-y-3">
                        <Label>Monitor Platforms</Label>
                        {Object.entries({
                          reddit: { icon: MessageCircle, label: "Reddit" },
                          twitter: { icon: Twitter, label: "Twitter/X" },
                          forums: { icon: Globe, label: "Industry Forums" },
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

                      {/* Intent Keywords */}
                      <div className="space-y-2">
                        <Label>Intent Keywords</Label>
                        <Input
                          placeholder="looking for, need help, recommend"
                          value={intentKeywords}
                          onChange={(e) => setIntentKeywords(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Keywords that indicate buying intent</p>
                      </div>

                      {/* Industry for context */}
                      <div className="space-y-2">
                        <Label>Industry Context</Label>
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
                      <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {/* Usage Stats */}
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
                    <div className="flex justify-between text-sm">
                      <span>B2B Searches Today</span>
                      <span className="font-medium">
                        {usage?.b2b_searches_today || 0} / {limits?.max_b2b_searches_per_day || 10}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Intent Searches Today</span>
                      <span className="font-medium">
                        {usage?.intent_searches_today || 0} / {limits?.max_intent_searches_per_day || 5}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">30 days remaining in billing period</p>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Generated Leads Queue */}
              <Card className="h-fit">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Leads Queue</CardTitle>
                      <CardDescription>
                        {generatedLeads.filter((l) => l.status === "new").length} leads ready for review
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {generatedLeads.filter((l) => l.status === "new").length > 0 && (
                        <Button size="sm" onClick={addAllToPipeline}>
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
                      <p className="text-sm">Configure your search and generate leads</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {generatedLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className={cn(
                              "p-4 rounded-lg border transition-all",
                              lead.status === "added" && "bg-green-50 border-green-200",
                              lead.status === "new" && "bg-card hover:shadow-md",
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium truncate">{lead.company || "Unknown Company"}</h4>
                                  <GradeBadge grade={lead.grade} />
                                  <TemperatureBadge temperature={lead.temperature} />
                                </div>
                                {lead.contact && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {lead.contact} {lead.title && `• ${lead.title}`}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {lead.email && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Check className="h-3 w-3 text-green-500" /> {lead.email}
                                    </span>
                                  )}
                                  {lead.phone && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Check className="h-3 w-3 text-green-500" /> {lead.phone}
                                    </span>
                                  )}
                                </div>
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
                                    <Button size="sm" variant="ghost" onClick={() => handleDiscard(lead.id)}>
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

          {/* ==================== SAVED SEARCHES TAB ==================== */}
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Saved Searches</CardTitle>
                    <CardDescription>Your saved search configurations and scheduled automation</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setMainTab("generate");
                      setShowSaveDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Search
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSavedSearches ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : savedSearches.length === 0 ? (
                  <div className="text-center py-12">
                    <Save className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No saved searches yet</p>
                    <p className="text-sm text-muted-foreground">Save your search configurations to reuse them</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedSearches.map((search) => (
                      <div
                        key={search.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{search.name}</h4>
                            <Badge variant="outline">{search.search_type}</Badge>
                            {search.is_scheduled && (
                              <Badge className="bg-green-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {search.schedule_frequency}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {search.industry} • {search.location}, {search.country}
                            {search.keywords && ` • "${search.keywords}"`}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Runs: {search.total_runs}</span>
                            <span>Found: {search.total_leads_found}</span>
                            <span>Saved: {search.total_leads_saved}</span>
                            {search.last_run_at && (
                              <span>
                                Last: {formatDistanceToNow(new Date(search.last_run_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => runSavedSearch(search)}>
                            <Play className="h-4 w-4 mr-1" />
                            Run
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => runSavedSearch(search)}>
                                <Play className="h-4 w-4 mr-2" />
                                Run Now
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteSavedSearch(search.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== HISTORY TAB ==================== */}
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
                    <p className="text-sm text-muted-foreground">Your lead generation activities will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Search</TableHead>
                        <TableHead>Found</TableHead>
                        <TableHead>Saved</TableHead>
                        <TableHead>Avg Score</TableHead>
                        <TableHead>Sources</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchHistory.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(h.created_at), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{h.search_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{h.keywords || h.industry || "-"}</TableCell>
                          <TableCell>{h.leads_found}</TableCell>
                          <TableCell>{h.leads_saved}</TableCell>
                          <TableCell>{h.average_score || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(h.sources_used || []).map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={h.status === "completed" ? "default" : "destructive"}>{h.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== LEADS TAB ==================== */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generated Leads</CardTitle>
                    <CardDescription>All leads from auto lead generation</CardDescription>
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
                    <p className="text-sm text-muted-foreground">Generate leads to see them here</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLeads.map((lead) => (
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{lead.company_name || "-"}</TableCell>
                          <TableCell>{lead.contact_name || "-"}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{lead.email || "-"}</TableCell>
                          <TableCell>
                            <SourceBadge source={lead.source} />
                          </TableCell>
                          <TableCell>{lead.lead_score || 0}</TableCell>
                          <TableCell>
                            <GradeBadge grade={lead.lead_grade as any} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{lead.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
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

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search Configuration</DialogTitle>
            <DialogDescription>Save this search to run it again later or schedule automatic runs</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Name</Label>
              <Input
                placeholder="e.g., Dubai Flooring Contractors"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Scheduling</Label>
                <p className="text-sm text-muted-foreground">Automatically run this search</p>
              </div>
              <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} />
            </div>

            {enableSchedule && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_FREQUENCIES.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch}>
              <Save className="h-4 w-4 mr-2" />
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
