// src/pages/sales/AutoLeadGen.tsx
// AUTO LEAD GEN WITH COUNTRY DROPDOWN, SOLID BUTTONS, SAVE SEARCH, AND 4 TABS

import { useState, useCallback } from "react";
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
  Sparkles, Building2, Radio, Zap, Loader2, RefreshCw, Check, X,
  Lock, TrendingUp, Clock, Save, History, Search, Plus, Trash2,
  Users, Target, Flame, Snowflake, AlertCircle, CheckCircle, Globe,
  Calendar, Play, Eye
} from "lucide-react";
import { GradeBadge } from "@/components/shared";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
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
  temperature?: "hot" | "warm" | "cold";
}

interface SavedSearch {
  id: string;
  tenant_id: string;
  name: string;
  search_type: string;
  keywords: string;
  industry: string;
  city: string;
  country_code: string;
  company_size: string;
  max_leads: number;
  is_scheduled: boolean;
  is_active: boolean;
  created_at: string;
}

interface SearchHistory {
  id: string;
  tenant_id: string;
  search_type: string;
  keywords: string;
  leads_found: number;
  leads_saved: number;
  status: string;
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
  source: string;
  lead_score: number;
  lead_grade: string;
  temperature: string;
  status: string;
  created_at: string;
}

interface Country {
  code: string;
  name: string;
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

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function AutoLeadGen() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    tier,
    limits,
    usage,
    canUseFeature,
    hasReachedLimit,
    getRemainingCredits,
    refreshUsage,
  } = useSubscription();

  // Main tabs
  const [mainTab, setMainTab] = useState<"generate" | "saved" | "history" | "leads">("generate");
  
  // B2B vs Intent mode - using solid buttons
  const [isB2BMode, setIsB2BMode] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState([10]);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [city, setCity] = useState("Dubai");
  const [selectedCountry, setSelectedCountry] = useState("");
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

  const maxLeadsAllowed = Math.min(getRemainingCredits("leads"), 25);
  const hasPremiumSources = canUseFeature("has_apollo_access") || canUseFeature("has_hunter_access") || canUseFeature("has_apify_access");

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Fetch countries from database
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("code, name")
        .order("name");
      if (error) {
        console.error("Error fetching countries:", error);
        return [];
      }
      return data as Country[];
    },
  });

  // Fetch saved searches
  const { data: savedSearches = [], isLoading: loadingSavedSearches, refetch: refetchSavedSearches } = useQuery({
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
  const { data: searchHistory = [], isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
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

  // Fetch recent leads
  const { data: recentLeads = [], isLoading: loadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ["sales-leads-recent", tenantId],
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
  // SAVE SEARCH
  // =====================================================
  const handleSaveSearch = async () => {
    if (!tenantId || !searchName.trim()) {
      toast({ title: "Enter a name", description: "Please enter a name for this search", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("lead_gen_searches").insert({
        tenant_id: tenantId,
        name: searchName,
        search_type: isB2BMode ? "b2b" : "intent",
        keywords: isB2BMode ? keywords : intentKeywords,
        industry: selectedIndustry,
        city,
        country_code: selectedCountry,
        company_size: companySize,
        max_leads: generateCount[0],
        use_google: true,
        use_hunter: usePremiumSources,
        use_apollo: usePremiumSources,
        use_apify: usePremiumSources,
        is_scheduled: enableSchedule,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Search saved!", description: `"${searchName}" has been saved.` });
      setShowSaveDialog(false);
      setSearchName("");
      refetchSavedSearches();
    } catch (error: any) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    }
  };

  // =====================================================
  // GENERATE LEADS (B2B)
  // =====================================================
  const handleGenerateB2B = async () => {
    if (hasReachedLimit("leads")) {
      toast({ title: "Lead limit reached", description: "Upgrade your plan for more leads", variant: "destructive" });
      return;
    }
    if (!keywords && !selectedIndustry) {
      toast({ title: "Missing search criteria", description: "Enter keywords or select an industry", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      const webhookUrl = hasPremiumSources && usePremiumSources
        ? "https://webhooks.zatesystems.com/webhook/premium-b2b-lead-gen"
        : "https://webhooks.zatesystems.com/webhook/lead-gen-request";

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          keywords: keywords || selectedIndustry,
          industry: selectedIndustry || "general",
          location: city,
          country: selectedCountry,
          company_size: companySize,
          job_titles: jobTitles.split(",").map(t => t.trim()).filter(Boolean),
          max_leads: generateCount[0],
          use_premium_sources: usePremiumSources && hasPremiumSources,
          ai_scoring: canUseFeature("has_ai_scoring"),
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
          temperature: lead.temperature,
        }));

        setGeneratedLeads(prev => [...newLeads, ...prev]);
        toast({ title: "Leads generated!", description: `${newLeads.length} leads found.` });
        refreshUsage();
        refetchHistory();
        refetchLeads();
      } else {
        toast({ title: "No leads found", description: data.message || "Try different criteria", variant: "destructive" });
      }
    } catch (error) {
      console.error("Lead gen error:", error);
      toast({ title: "Generation failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // =====================================================
  // ADD LEAD TO PIPELINE
  // =====================================================
  const addToPipeline = useMutation({
    mutationFn: async (lead: GeneratedLead) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from("sales_leads").insert({
        tenant_id: tenantId,
        company_name: lead.company,
        contact_name: lead.contact,
        email: lead.email,
        phone: lead.phone || null,
        job_title: lead.title,
        source: lead.source,
        source_channel: "auto_lead_gen",
        lead_score: lead.score,
        lead_grade: lead.grade,
        temperature: lead.temperature || "cold",
        status: "new",
      });
      if (error) throw error;
      return lead.id;
    },
    onSuccess: (leadId) => {
      setGeneratedLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: "added" } : l));
      toast({ title: "Added to pipeline!" });
      refetchLeads();
    },
    onError: (error: any) => {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    },
  });

  const dismissLead = (leadId: string) => {
    setGeneratedLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: "dismissed" } : l));
  };

  // =====================================================
  // DELETE SAVED SEARCH
  // =====================================================
  const deleteSavedSearch = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("lead_gen_searches")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Search deleted" });
      refetchSavedSearches();
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
                  {usage?.leads_generated || 0} / {limits?.leads_per_month || 100}
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
                {/* B2B vs Intent SOLID BUTTONS */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <Button
                        className={cn(
                          "flex-1 h-12 text-base font-semibold",
                          isB2BMode
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-transparent border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => setIsB2BMode(true)}
                      >
                        <Building2 className="h-5 w-5 mr-2" />
                        B2B Lead Generation
                      </Button>
                      <Button
                        className={cn(
                          "flex-1 h-12 text-base font-semibold",
                          !isB2BMode
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                            : "bg-transparent border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => setIsB2BMode(false)}
                        disabled={!canUseFeature("has_intent_leads")}
                      >
                        <Radio className="h-5 w-5 mr-2" />
                        Intent Signals
                        {!canUseFeature("has_intent_leads") && <Lock className="h-4 w-4 ml-2" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {isB2BMode ? (
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
                            {INDUSTRIES.map(ind => (
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

                      {/* Location - City and Country DROPDOWN */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dubai" />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map(country => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                      </div>

                      {/* Premium Sources Toggle */}
                      {hasPremiumSources && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <Label>Use Premium Sources</Label>
                            <p className="text-xs text-muted-foreground">Apollo, Hunter, Apify</p>
                          </div>
                          <Switch checked={usePremiumSources} onCheckedChange={setUsePremiumSources} />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleGenerateB2B}
                        disabled={isGenerating || hasReachedLimit("leads")}
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
                  /* Intent Signals Configuration */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5" />
                        Intent Signal Detection
                      </CardTitle>
                      <CardDescription>Monitor social platforms for buying intent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Intent Keywords</Label>
                        <Input
                          placeholder="looking for flooring, need contractor, recommendations"
                          value={intentKeywords}
                          onChange={(e) => setIntentKeywords(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Platforms to Monitor</Label>
                        {Object.entries(platforms).map(([platform, enabled]) => (
                          <div key={platform} className="flex items-center justify-between">
                            <span className="capitalize">{platform}</span>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) => setPlatforms(p => ({ ...p, [platform]: checked }))}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => setIsMonitoring(!isMonitoring)}>
                        {isMonitoring ? (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Stop Monitoring
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Monitoring
                          </>
                        )}
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
                        {usage?.leads_generated || 0} / {limits?.leads_per_month || 100}
                      </span>
                    </div>
                    <Progress value={((usage?.leads_generated || 0) / (limits?.leads_per_month || 100)) * 100} />
                    <div className="flex justify-between text-sm">
                      <span>B2B Searches Today</span>
                      <span className="font-medium">
                        {usage?.b2b_searches_today || 0} / {limits?.b2b_searches_per_day || 10}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Intent Searches Today</span>
                      <span className="font-medium">
                        {usage?.intent_searches_today || 0} / {limits?.intent_searches_per_day || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{usage?.days_remaining || 30} days remaining</p>
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
                        {generatedLeads.filter(l => l.status === "new").length} leads ready for review
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => refetchLeads()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
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
                        {generatedLeads.map(lead => (
                          <div
                            key={lead.id}
                            className={cn(
                              "p-4 rounded-lg border transition-all",
                              lead.status === "added" && "bg-green-50 border-green-200 dark:bg-green-900/20",
                              lead.status === "dismissed" && "opacity-50"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{lead.company}</span>
                                  <GradeBadge grade={lead.grade} />
                                </div>
                                <p className="text-sm text-muted-foreground">{lead.contact}</p>
                                <p className="text-sm">{lead.title}</p>
                                {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">Score: {lead.score}</Badge>
                                  <TemperatureBadge temperature={lead.temperature} />
                                </div>
                              </div>
                              {lead.status === "new" && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500"
                                    onClick={() => dismissLead(lead.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => addToPipeline.mutate(lead)}
                                    disabled={addToPipeline.isPending}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              )}
                              {lead.status === "added" && (
                                <Badge className="bg-green-500">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Added
                                </Badge>
                              )}
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
                <CardTitle>Saved Searches</CardTitle>
                <CardDescription>Your saved lead generation configurations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSavedSearches ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : savedSearches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved searches yet</p>
                    <p className="text-sm">Save a search configuration to reuse it later</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Keywords</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedSearches.map(search => (
                        <TableRow key={search.id}>
                          <TableCell className="font-medium">{search.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{search.search_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{search.keywords}</TableCell>
                          <TableCell>{search.city}, {search.country_code}</TableCell>
                          <TableCell>{format(new Date(search.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => deleteSavedSearch.mutate(search.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          {/* ==================== HISTORY TAB ==================== */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Search History</CardTitle>
                <CardDescription>Your recent lead generation runs</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : searchHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No search history yet</p>
                    <p className="text-sm">Run a lead generation to see history</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Keywords</TableHead>
                        <TableHead>Found</TableHead>
                        <TableHead>Saved</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchHistory.map(history => (
                        <TableRow key={history.id}>
                          <TableCell>{formatDistanceToNow(new Date(history.created_at), { addSuffix: true })}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{history.search_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{history.keywords}</TableCell>
                          <TableCell>{history.leads_found}</TableCell>
                          <TableCell>{history.leads_saved}</TableCell>
                          <TableCell>
                            <Badge variant={history.status === "completed" ? "default" : "destructive"}>
                              {history.status}
                            </Badge>
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
                  <Button variant="outline" onClick={() => refetchLeads()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : recentLeads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No leads yet</p>
                    <p className="text-sm">Generate leads to see them here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLeads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.company_name}</TableCell>
                          <TableCell>{lead.contact_name}</TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.lead_score}</TableCell>
                          <TableCell>
                            <GradeBadge grade={lead.lead_grade as any} />
                          </TableCell>
                          <TableCell>
                            <TemperatureBadge temperature={lead.temperature} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{lead.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</TableCell>
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
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>Save this search configuration to reuse later</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Name</Label>
              <Input
                placeholder="e.g., Dubai Real Estate Leads"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Scheduling</Label>
                <p className="text-xs text-muted-foreground">Run this search automatically</p>
              </div>
              <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
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
