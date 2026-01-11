// src/pages/AutoLeadGen.tsx
// COMPLETE AUTO LEAD GEN WITH SUBSCRIPTION TIERS
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { GradeBadge } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
}

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

  // State
  const [activeTab, setActiveTab] = useState("b2b");
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

  // Generated leads
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([]);

  // Industries list
  const industries = [
    { id: "real_estate", label: "Real Estate" },
    { id: "healthcare", label: "Healthcare" },
    { id: "salon", label: "Salon & Beauty" },
    { id: "restaurant", label: "Restaurant" },
    { id: "flooring", label: "Flooring" },
    { id: "technology", label: "Technology" },
    { id: "general", label: "General" },
  ];

  // Max leads based on remaining credits
  const maxLeadsAllowed = Math.min(
    getRemainingCredits("leads"),
    25, // Max per request
  );

  // Check if any premium source is available
  const hasPremiumSources =
    canUseFeature("has_apollo_access") || canUseFeature("has_hunter_access") || canUseFeature("has_apify_access");

  // =====================================================
  // GENERATE B2B LEADS
  // =====================================================
  const handleGenerateB2B = async () => {
    // Check limits
    if (hasReachedLimit("leads")) {
      toast({
        title: "Lead limit reached",
        description: "Upgrade your plan for more leads",
        variant: "destructive",
      });
      return;
    }

    if (hasReachedLimit("b2b_searches")) {
      toast({
        title: "Daily search limit reached",
        description: "Try again tomorrow or upgrade your plan",
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

    try {
      // Determine which webhook to call based on tier
      const webhookUrl =
        hasPremiumSources && usePremiumSources
          ? "https://webhooks.zatesystems.com/webhook/premium-b2b-lead-gen"
          : "https://webhooks.zatesystems.com/webhook/b2b-lead-gen";

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

      if (data.success && data.leads) {
        const newLeads: GeneratedLead[] = data.leads.map((lead: any) => ({
          id: lead.lead_id || `lead-${Date.now()}-${Math.random()}`,
          company: lead.company || lead.company_name,
          contact: lead.contact || lead.contact_name || "",
          email: lead.email || "",
          title: lead.title || lead.job_title || "",
          score: lead.score || lead.lead_score || 0,
          grade: lead.grade || lead.lead_grade || "C",
          status: "new" as const,
          source: lead.source || "google",
          phone: lead.phone,
          linkedin: lead.linkedin_url,
          website: lead.website,
          temperature: lead.temperature,
        }));

        setGeneratedLeads((prev) => [...newLeads, ...prev]);

        toast({
          title: "Leads generated!",
          description: `${data.leads_saved || newLeads.length} new leads found. ${data.hot_leads || 0} hot leads!`,
        });

        refreshUsage();
      } else {
        toast({
          title: "No leads found",
          description: data.message || "Try different search criteria",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Lead gen error:", error);
      toast({
        title: "Generation failed",
        description: "Please try again",
        variant: "destructive",
      });
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
      toast({
        title: "Daily intent search limit reached",
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
          score: lead.score || lead.lead_score || 0,
          grade: lead.grade || lead.lead_grade || "C",
          status: "new" as const,
          source: "intent" as const,
          website: lead.website || lead.source_url,
        }));

        setGeneratedLeads((prev) => [...newLeads, ...prev]);
        toast({ title: "Intent leads found!", description: `${newLeads.length} potential buyers detected` });
        refreshUsage();
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
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, lead) => {
      setGeneratedLeads((leads) => leads.map((l) => (l.id === lead.id ? { ...l, status: "added" as const } : l)));
      queryClient.invalidateQueries({ queryKey: ["sales-leads", tenantId] });
      toast({ title: "Lead added to pipeline!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add lead", description: error.message, variant: "destructive" });
    },
  });

  const handleDiscard = (leadId: string) => {
    setGeneratedLeads((leads) => leads.filter((l) => l.id !== leadId));
  };

  const toggleMonitoring = () => {
    if (!canUseFeature("has_intent_leads")) {
      toast({
        title: "Upgrade required",
        description: "Intent monitoring requires Professional plan",
        variant: "destructive",
      });
      return;
    }
    setIsMonitoring(!isMonitoring);
    toast({
      title: isMonitoring ? "Monitoring stopped" : "Monitoring started",
      description: isMonitoring ? "Intent signal detection paused" : "Checking for buying signals every 5 minutes",
    });
  };

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
          <p className="text-muted-foreground mt-1">AI-powered lead generation • {tierConfig.name} Plan</p>
        </div>

        {/* Plan Badge & Usage Summary */}
        <div className="flex items-center gap-3">
          <TierBadge />

          {usage && (
            <Card className="p-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Leads</p>
                  <p className="font-bold text-sm">
                    {usage.leads_generated} / {usage.leads_limit}
                  </p>
                </div>
                <div className="w-20">
                  <UsageMeter type="leads" label="" showWarning={false} size="sm" />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Limit Warnings */}
      <LimitWarning type="leads" />
      <LimitWarning type="b2b_searches" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="b2b" className="flex-1">
                B2B Leads
              </TabsTrigger>
              <TabsTrigger value="intent" className="flex-1 relative">
                Intent Signals
                {!canUseFeature("has_intent_leads") && <Lock className="h-3 w-3 ml-1 opacity-50" />}
              </TabsTrigger>
            </TabsList>

            {/* B2B Tab */}
            <TabsContent value="b2b" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    B2B Lead Generation
                  </CardTitle>
                  <CardDescription>{getRemainingCredits("b2b_searches")} searches remaining today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Data Sources */}
                  <DataSourceIndicator />

                  {/* Industry */}
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind.id} value={ind.id}>
                            {ind.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Keywords */}
                  <div className="space-y-2">
                    <Label>Keywords</Label>
                    <Input
                      placeholder="e.g., flooring contractors, real estate"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="Dubai"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input placeholder="UAE" value={country} onChange={(e) => setCountry(e.target.value)} />
                    </div>
                  </div>

                  {/* Company Size */}
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger>
                        <SelectValue placeholder="All sizes" />
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

                  {/* Lead Count */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Number of Leads</Label>
                      <span className="text-sm font-medium">{generateCount[0]}</span>
                    </div>
                    <Slider
                      value={generateCount}
                      onValueChange={setGenerateCount}
                      min={1}
                      max={Math.max(1, Math.min(25, maxLeadsAllowed))}
                      step={1}
                      disabled={maxLeadsAllowed === 0}
                    />
                    <p className="text-xs text-muted-foreground">
                      {maxLeadsAllowed > 0
                        ? `Max ${maxLeadsAllowed} leads remaining this month`
                        : "No leads remaining - upgrade your plan"}
                    </p>
                  </div>

                  {/* Use Premium Toggle */}
                  {hasPremiumSources && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Crown className="h-4 w-4 text-purple-500" />
                          Use Premium Sources
                        </p>
                        <p className="text-xs text-muted-foreground">Higher quality, verified leads</p>
                      </div>
                      <Switch checked={usePremiumSources} onCheckedChange={setUsePremiumSources} />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleGenerateB2B}
                    disabled={
                      isGenerating ||
                      hasReachedLimit("leads") ||
                      hasReachedLimit("b2b_searches") ||
                      maxLeadsAllowed === 0
                    }
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate {generateCount[0]} Leads
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Intent Tab */}
            <TabsContent value="intent" className="mt-4 space-y-4">
              <FeatureGate feature="has_intent_leads">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Intent-Based Leads
                    </CardTitle>
                    <CardDescription>
                      {getRemainingCredits("intent_searches")} intent searches remaining today
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Platform Selection */}
                    <div className="space-y-3">
                      <Label>Monitor Platforms</Label>
                      <div className="space-y-2">
                        {[
                          { key: "reddit", label: "Reddit", icon: MessageCircle },
                          { key: "twitter", label: "Twitter/X", icon: Twitter },
                          { key: "forums", label: "Industry Forums", icon: Globe },
                          { key: "linkedin", label: "LinkedIn", icon: Users },
                        ].map((platform) => (
                          <div key={platform.key} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <platform.icon className="h-4 w-4" />
                              <span className="text-sm">{platform.label}</span>
                            </div>
                            <Switch
                              checked={platforms[platform.key as keyof typeof platforms]}
                              onCheckedChange={(checked) =>
                                setPlatforms((prev) => ({ ...prev, [platform.key]: checked }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

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

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="w-full"
                        onClick={handleGenerateIntent}
                        disabled={isGenerating || hasReachedLimit("intent_searches")}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-1" />
                            Search Now
                          </>
                        )}
                      </Button>

                      <Button variant={isMonitoring ? "destructive" : "outline"} onClick={toggleMonitoring}>
                        {isMonitoring ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Radio className="h-4 w-4 mr-1" />
                            Monitor
                          </>
                        )}
                      </Button>
                    </div>

                    {isMonitoring && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="relative">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                        </div>
                        <span className="text-sm text-green-700 dark:text-green-300">Monitoring active</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FeatureGate>
            </TabsContent>
          </Tabs>

          {/* Usage Stats Card */}
          {usage && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Usage This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <UsageMeter type="leads" label="Leads Generated" />
                <UsageMeter type="b2b_searches" label="B2B Searches Today" />
                {canUseFeature("has_intent_leads") && (
                  <UsageMeter type="intent_searches" label="Intent Searches Today" />
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {usage.days_remaining} days remaining in billing period
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Leads Queue</CardTitle>
                  <CardDescription>
                    {generatedLeads.filter((l) => l.status === "new").length} leads ready for review
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refreshUsage()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-3">
                  {generatedLeads
                    .filter((l) => l.status !== "dismissed")
                    .map((lead) => (
                      <Card
                        key={lead.id}
                        className={cn(
                          "transition-all",
                          lead.status === "added" && "opacity-50 bg-green-50/50 dark:bg-green-950/20",
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium truncate">{lead.company || "Unknown Company"}</h4>
                                <GradeBadge grade={lead.grade} />
                                <DataSourceBadge source={lead.source} />
                                {lead.temperature === "hot" && (
                                  <Badge variant="destructive" className="text-xs">
                                    🔥 Hot
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                {lead.contact && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    <span className="truncate">{lead.contact}</span>
                                  </div>
                                )}
                                {lead.title && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Briefcase className="h-3 w-3" />
                                    <span className="truncate">{lead.title}</span>
                                  </div>
                                )}
                              </div>
                              {lead.email && (
                                <p className="text-sm text-muted-foreground mt-1 truncate">{lead.email}</p>
                              )}

                              {lead.status === "added" && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                                  <Check className="h-3 w-3" />
                                  <span>Added to pipeline</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Score</p>
                                <p className="text-lg font-bold">{lead.score}</p>
                              </div>

                              {lead.status === "new" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDiscard(lead.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => addToPipelineMutation.mutate(lead)}
                                    disabled={addToPipelineMutation.isPending}
                                  >
                                    <ArrowRight className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {generatedLeads.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No leads in queue</p>
                      <p className="text-sm mt-1">Configure your search and generate leads</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
