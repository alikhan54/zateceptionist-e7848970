import { useState, useEffect } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook, WEBHOOKS, N8N_WEBHOOK_BASE } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Building2,
  Users,
  Search,
  TrendingUp,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Download,
  Play,
  Pause,
  Eye,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Target,
  Brain,
  Loader2,
  AlertCircle,
  Settings,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// =====================================================
// TYPES
// =====================================================
interface GeneratedLead {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  lead_score: number;
  lead_grade: string;
  status: string;
  source: string;
  source_channel: string | null;
  lead_type: string;
  sequence_status: string | null;
  tags: string | null;
  notes: string | null;
  created_at: string;
}

interface LeadGenConfig {
  id: string;
  tenant_id: string;
  b2b_enabled: boolean;
  b2b_industries: string[];
  b2b_locations: string[];
  b2b_keywords: string[];
  b2b_daily_limit: number;
  b2c_enabled: boolean;
  intent_enabled: boolean;
  intent_keywords: string[];
  intent_platforms: string[];
  free_leads_per_day: number;
  free_leads_used_today: number;
  auto_sequence_enabled: boolean;
  google_api_key: string | null;
  google_cx_id: string | null;
}

interface Credits {
  total: number;
  used: number;
  remaining: number;
  reset_date: string | null;
}

// =====================================================
// CONSTANTS
// =====================================================
const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Real Estate",
  "E-commerce",
  "Manufacturing",
  "Education",
  "Marketing",
  "Legal",
  "Consulting",
  "Hospitality",
  "Automotive",
  "Construction",
  "Food & Beverage",
  "Retail",
];

const INTENT_PLATFORMS = [
  { id: "reddit", name: "Reddit", icon: "🔴" },
  { id: "twitter", name: "Twitter/X", icon: "🐦" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
  { id: "forums", name: "Industry Forums", icon: "💬" },
  { id: "quora", name: "Quora", icon: "❓" },
];

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-yellow-500 text-black",
  D: "bg-red-500 text-white",
};

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function AutoLeadGen() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // =====================================================
  // STATE
  // =====================================================
  const [activeTab, setActiveTab] = useState("b2b");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // B2B Form State
  const [b2bForm, setB2bForm] = useState({
    industry: "",
    location: "",
    keywords: "",
    company_size: "all",
    count: 25,
  });

  // Intent Form State
  const [intentForm, setIntentForm] = useState({
    keywords: "",
    platforms: ["reddit", "twitter"] as string[],
    location: "",
  });

  // =====================================================
  // QUERIES
  // =====================================================

  // Fetch Lead Gen Config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["lead-gen-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase.from("lead_gen_config").select("*").eq("tenant_id", tenantId).single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching config:", error);
      }
      return data as LeadGenConfig | null;
    },
    enabled: !!tenantId,
  });

  // Fetch Generated Leads from sales_leads table
  const {
    data: leads = [],
    isLoading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["generated-leads", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("sales_leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("source", ["lead_gen", "intent_signal", "b2b_google", "intent_reddit", "intent_twitter", "intent_linkedin"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching leads:", error);
        return [];
      }

      return (data || []).map((lead: any) => ({
        id: lead.id,
        tenant_id: lead.tenant_id,
        company_name: lead.company || lead.name || "Unknown",
        contact_name: lead.contact_name || lead.name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        linkedin_url: lead.linkedin_url,
        industry: lead.industry,
        city: lead.city,
        country: lead.country,
        lead_score: lead.score || 0,
        lead_grade:
          lead.temperature === "hot"
            ? "A"
            : lead.temperature === "warm"
              ? "B"
              : lead.temperature === "cold"
                ? "C"
                : "D",
        status: lead.status,
        source: lead.source,
        source_channel: lead.source_channel,
        lead_type: lead.source?.includes("intent") ? "b2c" : "b2b",
        sequence_status: lead.sequence_status,
        tags: lead.tags,
        notes: lead.notes,
        created_at: lead.created_at,
      })) as GeneratedLead[];
    },
    enabled: !!tenantId,
    refetchInterval: isMonitoring ? 30000 : false, // Refresh every 30s when monitoring
  });

  // Calculate Credits from tenant_config or lead_gen_config
  const { data: credits } = useQuery({
    queryKey: ["lead-gen-credits", tenantId],
    queryFn: async (): Promise<Credits> => {
      if (!tenantId) return { total: 500, used: 0, remaining: 500, reset_date: null };

      // Get credits from tenant_config
      const { data: tenantConfig } = await supabase
        .from("tenant_config")
        .select("credits_balance, credits_monthly_limit")
        .eq("tenant_id", tenantId)
        .single();

      // Get today's usage from lead_gen_config
      const { data: leadGenConfig } = await supabase
        .from("lead_gen_config")
        .select("free_leads_per_day, free_leads_used_today")
        .eq("tenant_id", tenantId)
        .single();

      const total = leadGenConfig?.free_leads_per_day || tenantConfig?.credits_monthly_limit || 500;
      const used = leadGenConfig?.free_leads_used_today || 0;

      return {
        total,
        used,
        remaining: Math.max(0, total - used),
        reset_date: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      };
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Generate B2B Leads
  const generateB2BMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");

      const payload = {
        tenant_id: tenantId,
        industry: b2bForm.industry,
        location: b2bForm.location,
        keywords: b2bForm.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        company_size: b2bForm.company_size,
        max_results: b2bForm.count,
      };

      // Call the n8n webhook
      const response = await fetch(`${N8N_WEBHOOK_BASE}/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate leads");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "B2B Lead Generation Started",
        description: data.message || `Generating ${b2bForm.count} leads...`,
      });
      // Refetch leads after a delay
      setTimeout(() => {
        refetchLeads();
        queryClient.invalidateQueries({ queryKey: ["lead-gen-credits"] });
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate Intent Leads (B2C)
  const generateIntentMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");

      const payload = {
        tenant_id: tenantId,
        keywords: intentForm.keywords,
        platforms: intentForm.platforms,
        location: intentForm.location,
        lead_type: "buyer",
        max_results: 20,
      };

      // Call the n8n webhook
      const response = await fetch(`${N8N_WEBHOOK_BASE}/intent-lead-gen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate intent leads");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Intent Signal Search Started",
        description: data.message || "Searching for buying signals...",
      });
      setTimeout(() => {
        refetchLeads();
        queryClient.invalidateQueries({ queryKey: ["lead-gen-credits"] });
      }, 5000);
    },
    onError: (error: Error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add Lead to Pipeline
  const addToPipelineMutation = useMutation({
    mutationFn: async (lead: GeneratedLead) => {
      const { error } = await supabase
        .from("sales_leads")
        .update({
          status: "qualified",
          sequence_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return lead;
    },
    onSuccess: (lead) => {
      toast({ title: "Lead added to pipeline", description: lead.company_name });
      refetchLeads();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add lead", description: error.message, variant: "destructive" });
    },
  });

  // Discard Lead
  const discardLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("sales_leads")
        .update({ status: "discarded" })
        .eq("id", leadId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchLeads();
    },
  });

  // Start/Stop Monitoring
  const toggleMonitoring = async () => {
    if (!tenantId) return;

    const newState = !isMonitoring;
    setIsMonitoring(newState);

    if (newState) {
      // Start monitoring - trigger first intent search
      generateIntentMutation.mutate();
      toast({
        title: "Monitoring Started",
        description: "Checking for buying signals every 5 minutes",
      });
    } else {
      toast({
        title: "Monitoring Stopped",
        description: "Intent signal detection paused",
      });
    }
  };

  // =====================================================
  // COMPUTED VALUES
  // =====================================================
  const b2bLeads = leads.filter((l) => l.lead_type === "b2b" && l.status !== "discarded");
  const intentLeads = leads.filter((l) => l.lead_type === "b2c" && l.status !== "discarded");
  const pendingLeads = leads.filter((l) => l.status === "new");

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Auto Lead Gen
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered lead generation and intent detection</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Credits Meter */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Daily Credits</p>
                <p className="font-bold">
                  {credits?.remaining || 0} / {credits?.total || 500}
                </p>
              </div>
              <div className="w-24">
                <Progress value={((credits?.remaining || 0) / (credits?.total || 500)) * 100} className="h-2" />
              </div>
            </div>
          </Card>
          <Button variant="outline" size="icon" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="b2b" className="flex-1">
                <Building2 className="h-4 w-4 mr-2" />
                B2B Leads
              </TabsTrigger>
              <TabsTrigger value="intent" className="flex-1">
                <Brain className="h-4 w-4 mr-2" />
                Intent Signals
              </TabsTrigger>
            </TabsList>

            {/* B2B Lead Generation */}
            <TabsContent value="b2b" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    B2B Lead Generation
                  </CardTitle>
                  <CardDescription>Find and enrich business leads automatically</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Industry Selection */}
                  <div className="space-y-2">
                    <Label>Industry *</Label>
                    <Select value={b2bForm.industry} onValueChange={(v) => setB2bForm({ ...b2bForm, industry: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry.toLowerCase()}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Dubai, UAE"
                      value={b2bForm.location}
                      onChange={(e) => setB2bForm({ ...b2bForm, location: e.target.value })}
                    />
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2">
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      placeholder="e.g., software, SaaS, cloud"
                      value={b2bForm.keywords}
                      onChange={(e) => setB2bForm({ ...b2bForm, keywords: e.target.value })}
                    />
                  </div>

                  {/* Company Size */}
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select
                      value={b2bForm.company_size}
                      onValueChange={(v) => setB2bForm({ ...b2bForm, company_size: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sizes</SelectItem>
                        <SelectItem value="small">Small (1-50)</SelectItem>
                        <SelectItem value="medium">Medium (51-200)</SelectItem>
                        <SelectItem value="large">Large (201-1000)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lead Count */}
                  <div className="space-y-2">
                    <Label>Number of Leads: {b2bForm.count}</Label>
                    <Slider
                      value={[b2bForm.count]}
                      onValueChange={(v) => setB2bForm({ ...b2bForm, count: v[0] })}
                      min={5}
                      max={100}
                      step={5}
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    className="w-full"
                    onClick={() => generateB2BMutation.mutate()}
                    disabled={generateB2BMutation.isPending || !b2bForm.industry}
                  >
                    {generateB2BMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate {b2bForm.count} Leads
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Intent-Based Lead Generation */}
            <TabsContent value="intent" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Intent-Based Leads
                  </CardTitle>
                  <CardDescription>Capture leads showing buying intent</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform Selection */}
                  <div className="space-y-2">
                    <Label>Monitor Platforms</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {INTENT_PLATFORMS.map((platform) => (
                        <Button
                          key={platform.id}
                          variant={intentForm.platforms.includes(platform.id) ? "default" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            const newPlatforms = intentForm.platforms.includes(platform.id)
                              ? intentForm.platforms.filter((p) => p !== platform.id)
                              : [...intentForm.platforms, platform.id];
                            setIntentForm({ ...intentForm, platforms: newPlatforms });
                          }}
                        >
                          <span className="mr-2">{platform.icon}</span>
                          {platform.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Intent Keywords */}
                  <div className="space-y-2">
                    <Label>Intent Keywords</Label>
                    <Input
                      placeholder="e.g., looking for apartments, need flooring"
                      value={intentForm.keywords}
                      onChange={(e) => setIntentForm({ ...intentForm, keywords: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Enter keywords that indicate buying intent</p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label>Location (Optional)</Label>
                    <Input
                      placeholder="e.g., Dubai, UAE"
                      value={intentForm.location}
                      onChange={(e) => setIntentForm({ ...intentForm, location: e.target.value })}
                    />
                  </div>

                  {/* Monitoring Toggle */}
                  <Button
                    className={cn(
                      "w-full",
                      isMonitoring ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600",
                    )}
                    onClick={toggleMonitoring}
                    disabled={generateIntentMutation.isPending || !intentForm.keywords}
                  >
                    {isMonitoring ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Monitoring
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Monitoring
                      </>
                    )}
                  </Button>

                  {isMonitoring && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Monitoring active - checking every 5 minutes
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Generated Leads Queue */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Leads Queue</CardTitle>
                  <CardDescription>{pendingLeads.length} leads ready for review</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchLeads()} disabled={leadsLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", leadsLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {leadsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No leads generated yet</p>
                    <p className="text-sm mt-1">Use B2B or Intent search to find leads</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leads
                      .filter((l) => l.status !== "discarded")
                      .map((lead) => (
                        <Card
                          key={lead.id}
                          className={cn(
                            "transition-all hover:shadow-md",
                            lead.status === "qualified" && "border-green-300 bg-green-50/50",
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{lead.company_name}</h4>
                                  <Badge className={cn("text-xs", GRADE_COLORS[lead.lead_grade] || "bg-gray-500")}>
                                    {lead.lead_grade}
                                  </Badge>
                                  {lead.lead_type === "b2c" && (
                                    <Badge variant="outline" className="text-xs">
                                      Intent
                                    </Badge>
                                  )}
                                </div>

                                {lead.contact_name && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {lead.contact_name}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                                  {lead.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {lead.email}
                                    </span>
                                  )}
                                  {lead.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {lead.phone}
                                    </span>
                                  )}
                                  {lead.website && (
                                    <a
                                      href={lead.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 hover:text-primary"
                                    >
                                      <Globe className="h-3 w-3" />
                                      Website
                                    </a>
                                  )}
                                </div>

                                {lead.status === "enriching" && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Enriching data...
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Score</p>
                                  <p className="text-xl font-bold">{lead.lead_score}</p>
                                </div>

                                {lead.status === "new" && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => addToPipelineMutation.mutate(lead)}
                                      disabled={addToPipelineMutation.isPending}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => discardLeadMutation.mutate(lead.id)}
                                    >
                                      <XCircle className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}

                                {lead.status === "qualified" && (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    In Pipeline
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{b2bLeads.length}</p>
            <p className="text-sm text-muted-foreground">B2B Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{intentLeads.length}</p>
            <p className="text-sm text-muted-foreground">Intent Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{leads.filter((l) => l.lead_grade === "A").length}</p>
            <p className="text-sm text-muted-foreground">Hot Leads (A)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{leads.filter((l) => l.status === "qualified").length}</p>
            <p className="text-sm text-muted-foreground">In Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Generation Settings</DialogTitle>
            <DialogDescription>Configure your lead generation preferences</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Auto-enroll in sequence</Label>
              <Switch checked={config?.auto_sequence_enabled || false} />
            </div>
            <div className="flex items-center justify-between">
              <Label>B2B Generation Enabled</Label>
              <Switch checked={config?.b2b_enabled || true} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Intent Detection Enabled</Label>
              <Switch checked={config?.intent_enabled || true} />
            </div>
            <div className="space-y-2">
              <Label>Daily Lead Limit</Label>
              <Input type="number" value={config?.free_leads_per_day || 50} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Based on your subscription plan</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
