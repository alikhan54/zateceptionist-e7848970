// ============================================
// FILE: src/pages/sales/LeadDiscovery.tsx
// COPY THIS ENTIRE FILE INTO LOVABLE
// Matches 417 Lead Discovery design exactly
// ============================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Building2,
  Users,
  Bot,
  Upload,
  History,
  Gift,
  MapPin,
  Crown,
  Zap,
  Search,
  Loader2,
  TrendingUp,
  Target,
  RefreshCw,
  FileText,
  Plus,
  Linkedin,
  Radio,
  Star,
  MessageSquare,
  Clock,
  Play,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const N8N_WEBHOOK_URL = "https://webhooks.zatesystems.com";

const INDUSTRIES = [
  { id: "medical_spa", label: "Medical Spa / Aesthetics", icon: "✨" },
  { id: "dental", label: "Dental Clinic", icon: "🦷" },
  { id: "salon", label: "Salon / Beauty", icon: "💇" },
  { id: "real_estate", label: "Real Estate", icon: "🏠" },
  { id: "restaurant", label: "Restaurant / F&B", icon: "🍽️" },
  { id: "healthcare", label: "Healthcare / Clinic", icon: "⚕️" },
  { id: "fitness", label: "Fitness / Gym", icon: "💪" },
  { id: "technology", label: "Technology", icon: "💻" },
  { id: "flooring", label: "Flooring", icon: "🏗️" },
  { id: "general", label: "General", icon: "🏢" },
];

const INTENT_OPTIONS: Record<string, { label: string; keywords: string[] }[]> = {
  aesthetics: [
    { label: "Looking for Botox", keywords: ["botox near me", "botox treatment", "wrinkle treatment"] },
    { label: "Looking for Fillers", keywords: ["lip fillers", "dermal fillers", "facial fillers"] },
    { label: "Looking for Laser", keywords: ["laser hair removal", "laser treatment", "skin laser"] },
  ],
  dental: [
    { label: "Looking for Dentist", keywords: ["dentist near me", "dental clinic", "teeth cleaning"] },
    { label: "Looking for Braces", keywords: ["braces cost", "invisalign", "teeth straightening"] },
  ],
  real_estate: [
    { label: "Looking to Buy", keywords: ["houses for sale", "buy apartment", "property for sale"] },
    { label: "Looking to Rent", keywords: ["apartments for rent", "rental properties", "lease apartment"] },
  ],
};

export default function LeadDiscovery() {
  // CRITICAL: Get tenantConfig for UUID
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id; // USE THIS FOR ALL DATABASE OPERATIONS!

  const queryClient = useQueryClient();

  // Main tab state
  const [mainTab, setMainTab] = useState("b2b");

  // Sub-tab states
  const [b2bSubTab, setB2bSubTab] = useState("quick");
  const [b2cSubTab, setB2cSubTab] = useState("intent");
  const [importSubTab, setImportSubTab] = useState("csv");

  // Loading states
  const [isSearching, setIsSearching] = useState(false);

  // B2B Quick Search form
  const [quickForm, setQuickForm] = useState({
    industry: "medical_spa",
    location: "",
    keywords: "",
    maxResults: 20,
  });

  // B2B Local Discovery form
  const [localForm, setLocalForm] = useState({
    category: "",
    location: "",
    radius: 10,
    minRating: "0",
    maxResults: 20,
  });

  // B2B LinkedIn Premium form
  const [linkedinForm, setLinkedinForm] = useState({
    titles: [] as string[],
    industries: [] as string[],
    location: "",
    companySize: "all",
    maxResults: 25,
  });

  // B2C Intent Signals form
  const [intentForm, setIntentForm] = useState({
    industry: "aesthetics",
    searchIntent: "looking_for_botox",
    location: "",
    source: "google_intent",
    maxResults: 25,
  });

  // B2C Social Audiences form
  const [socialForm, setSocialForm] = useState({
    platform: "instagram",
    hashtags: "",
    location: "",
    engagementMin: 100,
    maxResults: 50,
  });

  // Auto Lead Gen settings
  const [autoSettings, setAutoSettings] = useState({
    enabled: false,
    source: "quick_search",
    industry: "",
    location: "",
    keywords: "",
    maxLeadsPerRun: 10,
    frequency: "daily",
    time: "09:00",
    autoEnrich: true,
    autoScore: true,
    autoSequence: false,
    sequenceId: "",
  });

  // CSV Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Manual Entry form
  const [manualForm, setManualForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
  });

  // Fetch stats using UUID
  const { data: stats } = useQuery({
    queryKey: ["lead-discovery-stats", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return { total: 0, today: 0, inSequences: 0, conversion: 0 };

      const { count: total } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid);

      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid)
        .gte("created_at", today);

      const { count: inSequences } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid)
        .not("sequence_id", "is", null);

      const { count: converted } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid)
        .eq("status", "converted");

      const convRate = total && total > 0 ? (((converted || 0) / total) * 100).toFixed(0) : "0";

      return {
        total: total || 0,
        today: todayCount || 0,
        inSequences: inSequences || 0,
        conversion: convRate,
      };
    },
    enabled: !!tenantUuid,
  });

  // Fetch history using UUID
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["lead-gen-history", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase
        .from("lead_gen_history")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  // Fetch saved auto-gen configs using UUID
  const { data: savedConfigs = [], refetch: refetchConfigs } = useQuery({
    queryKey: ["lead-gen-searches", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase
        .from("lead_gen_searches")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  // Get intent keywords for selected industry/intent
  const currentIntentKeywords =
    INTENT_OPTIONS[intentForm.industry]?.find(
      (i) => i.label.toLowerCase().replace(/ /g, "_") === intentForm.searchIntent,
    )?.keywords || [];

  // ============ HANDLERS ============

  // B2B Quick Search
  const handleQuickSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }
    if (!quickForm.location) {
      toast({ title: "Missing location", description: "Please enter a location", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/webhook/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          generation_type: "free",
          cost_tier: "free",
          industry: quickForm.industry,
          city: quickForm.location,
          keywords: quickForm.keywords,
          max_results: quickForm.maxResults,
        }),
      });

      const result = await response.json();
      if (result.success || result.leads) {
        toast({
          title: "✅ Search Complete!",
          description: `Found ${result.leads?.length || result.valid_leads || 0} businesses`,
        });
        queryClient.invalidateQueries({ queryKey: ["lead-discovery-stats"] });
        queryClient.invalidateQueries({ queryKey: ["lead-gen-history"] });
      } else {
        throw new Error(result.error || "No results found");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // B2B Local Discovery
  const handleLocalDiscovery = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }
    if (!localForm.category || !localForm.location) {
      toast({ title: "Missing fields", description: "Please select category and location", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/webhook/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          generation_type: "google_places",
          cost_tier: "cheap",
          industry: localForm.category,
          location: localForm.location,
          radius_km: localForm.radius,
          min_rating: parseFloat(localForm.minRating),
          max_results: localForm.maxResults,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "✅ Local Businesses Found!",
          description: `Found ${result.leads?.length || 0} nearby businesses`,
        });
        refetchHistory();
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // B2C Intent Search
  const handleIntentSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/webhook/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          generation_type: "intent",
          industry: intentForm.industry,
          search_intent: intentForm.searchIntent,
          location: intentForm.location,
          source: intentForm.source,
          keywords: currentIntentKeywords,
          max_results: intentForm.maxResults,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "✅ Intent Leads Found!",
          description: `Found ${result.leads?.length || 0} potential customers`,
        });
        refetchHistory();
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Save Auto Lead Gen Config - FIXED WITH UUID
  const handleSaveAutoConfig = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded yet. Please wait.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("lead_gen_searches").insert({
        tenant_id: tenantUuid, // CRITICAL: Use UUID not slug!
        name: `Auto: ${autoSettings.industry || "General"} - ${autoSettings.location || "Any"}`,
        search_type: autoSettings.source,
        keywords: autoSettings.keywords,
        industry: autoSettings.industry,
        city: autoSettings.location,
        max_leads: autoSettings.maxLeadsPerRun,
        is_scheduled: autoSettings.enabled,
        schedule_frequency: autoSettings.frequency,
        schedule_time: autoSettings.time,
        is_active: autoSettings.enabled,
      });

      if (error) throw error;

      toast({ title: "✅ Configuration Saved!", description: "Auto lead generation settings saved successfully" });
      refetchConfigs();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    }
  };

  // Manual Entry - FIXED WITH UUID
  const handleManualEntry = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }
    if (!manualForm.name && !manualForm.email && !manualForm.phone) {
      toast({
        title: "Missing info",
        description: "Please enter at least name, email, or phone",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("sales_leads").insert({
        tenant_id: tenantUuid, // CRITICAL: Use UUID!
        company_name: manualForm.company || null,
        contact_name: manualForm.name || null,
        email: manualForm.email || null,
        phone: manualForm.phone || null,
        job_title: manualForm.title || null,
        source: "manual",
        source_channel: "manual_entry",
        status: "new",
      });

      if (error) throw error;

      toast({ title: "✅ Lead Added!", description: "Lead has been added to your pipeline" });
      setManualForm({ name: "", email: "", phone: "", company: "", title: "" });
      queryClient.invalidateQueries({ queryKey: ["lead-discovery-stats"] });
    } catch (error: any) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    }
  };

  // CSV Upload handler
  const handleFileUpload = async () => {
    if (!tenantUuid || !uploadedFile) return;

    toast({ title: "Processing CSV", description: `Uploading ${uploadedFile.name}...` });
    // In real implementation, parse CSV and insert leads with tenant_id: tenantUuid
  };

  // Delete saved config
  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_gen_searches").delete().eq("id", id).eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      refetchConfigs();
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Lead Discovery</h1>
        <p className="text-muted-foreground">Find and qualify leads for any industry</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Zap className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.today || 0}</p>
                <p className="text-sm text-muted-foreground">Generated Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.inSequences || 0}</p>
                <p className="text-sm text-muted-foreground">In Sequences</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.conversion || 0}%</p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="b2b" className="gap-2">
            <Building2 className="h-4 w-4" /> Business (B2B)
          </TabsTrigger>
          <TabsTrigger value="b2c" className="gap-2">
            <Users className="h-4 w-4" /> Consumer (B2C)
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-2">
            <Bot className="h-4 w-4" /> Auto Lead Gen
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" /> Import
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* ==================== B2B TAB ==================== */}
        <TabsContent value="b2b">
          {/* B2B Sub-tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={b2bSubTab === "quick" ? "default" : "outline"}
              onClick={() => setB2bSubTab("quick")}
              className="gap-2"
            >
              <Gift className="h-4 w-4" /> Quick Search (Free)
            </Button>
            <Button
              variant={b2bSubTab === "local" ? "default" : "outline"}
              onClick={() => setB2bSubTab("local")}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" /> Local Discovery (Paid)
            </Button>
            <Button
              variant={b2bSubTab === "linkedin" ? "default" : "outline"}
              onClick={() => setB2bSubTab("linkedin")}
              className="gap-2"
            >
              <Linkedin className="h-4 w-4" /> LinkedIn (Premium)
            </Button>
          </div>

          {/* Quick Search (Free) */}
          {b2bSubTab === "quick" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-500" /> Quick Search
                </CardTitle>
                <CardDescription>Free Google Custom Search - 100 searches/day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={quickForm.industry}
                      onValueChange={(v) => setQuickForm({ ...quickForm, industry: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Dubai, New York, London"
                      value={quickForm.location}
                      onChange={(e) => setQuickForm({ ...quickForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Keywords (optional)</Label>
                  <Input
                    placeholder="e.g., luxury, premium, certified"
                    value={quickForm.keywords}
                    onChange={(e) => setQuickForm({ ...quickForm, keywords: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Results</Label>
                    <span className="font-medium">{quickForm.maxResults}</span>
                  </div>
                  <Slider
                    value={[quickForm.maxResults]}
                    onValueChange={(v) => setQuickForm({ ...quickForm, maxResults: v[0] })}
                    min={5}
                    max={50}
                    step={5}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>💰 Estimated cost:</span>
                  <Badge className="bg-green-500">FREE</Badge>
                </div>

                <Button
                  onClick={handleQuickSearch}
                  disabled={isSearching}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" /> Search Businesses
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Local Discovery (Paid) */}
          {b2bSubTab === "local" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" /> Local Discovery
                </CardTitle>
                <CardDescription>Find businesses near a specific location using Google Places</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Category</Label>
                    <Select
                      value={localForm.category}
                      onValueChange={(v) => setLocalForm({ ...localForm, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beauty_salon">💇 Beauty Salon</SelectItem>
                        <SelectItem value="spa">🧖 Spa</SelectItem>
                        <SelectItem value="gym">💪 Gym</SelectItem>
                        <SelectItem value="dentist">🦷 Dentist</SelectItem>
                        <SelectItem value="restaurant">🍽️ Restaurant</SelectItem>
                        <SelectItem value="real_estate">🏠 Real Estate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Area</Label>
                    <Input
                      placeholder="e.g., DIFC Dubai, Business Bay"
                      value={localForm.location}
                      onChange={(e) => setLocalForm({ ...localForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Search Radius</Label>
                      <span>{localForm.radius} km</span>
                    </div>
                    <Slider
                      value={[localForm.radius]}
                      onValueChange={(v) => setLocalForm({ ...localForm, radius: v[0] })}
                      min={1}
                      max={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Rating</Label>
                    <Select
                      value={localForm.minRating}
                      onValueChange={(v) => setLocalForm({ ...localForm, minRating: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any Rating</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ 3.0+</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ 4.0+</SelectItem>
                        <SelectItem value="4.5">⭐⭐⭐⭐½ 4.5+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>💰 Estimated cost:</span>
                  <Badge variant="outline">~${(localForm.maxResults * 0.003).toFixed(2)}</Badge>
                </div>

                <Button onClick={handleLocalDiscovery} disabled={isSearching} className="w-full" size="lg">
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  Find Local Businesses
                </Button>
              </CardContent>
            </Card>
          )}

          {/* LinkedIn Premium */}
          {b2bSubTab === "linkedin" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Linkedin className="h-5 w-5 text-[#0077B5]" /> LinkedIn Premium
                </CardTitle>
                <CardDescription>Find decision makers with Apollo.io + LinkedIn enrichment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    ⚠️ Premium feature - Requires Apollo.io API key. Configure in Settings → Integrations.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Target Job Titles</Label>
                  <div className="flex flex-wrap gap-2">
                    {["CEO", "Owner", "Founder", "Director", "Manager", "VP"].map((title) => (
                      <Badge
                        key={title}
                        variant={linkedinForm.titles.includes(title) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() =>
                          setLinkedinForm({
                            ...linkedinForm,
                            titles: linkedinForm.titles.includes(title)
                              ? linkedinForm.titles.filter((t) => t !== title)
                              : [...linkedinForm.titles, title],
                          })
                        }
                      >
                        {title}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Industries</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Healthcare", "Beauty", "Real Estate", "Technology"].map((ind) => (
                      <Badge
                        key={ind}
                        variant={linkedinForm.industries.includes(ind) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() =>
                          setLinkedinForm({
                            ...linkedinForm,
                            industries: linkedinForm.industries.includes(ind)
                              ? linkedinForm.industries.filter((i) => i !== ind)
                              : [...linkedinForm.industries, ind],
                          })
                        }
                      >
                        {ind}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button disabled className="w-full" size="lg">
                  <Crown className="h-4 w-4 mr-2" /> Configure API Keys First
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== B2C TAB ==================== */}
        <TabsContent value="b2c">
          {/* B2C Sub-tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={b2cSubTab === "intent" ? "default" : "outline"}
              onClick={() => setB2cSubTab("intent")}
              className="gap-2"
            >
              <Radio className="h-4 w-4" /> Intent Signals
            </Button>
            <Button
              variant={b2cSubTab === "social" ? "default" : "outline"}
              onClick={() => setB2cSubTab("social")}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" /> Social Audiences
            </Button>
            <Button
              variant={b2cSubTab === "reviews" ? "default" : "outline"}
              onClick={() => setB2cSubTab("reviews")}
              className="gap-2"
            >
              <Star className="h-4 w-4" /> Review Hunters
            </Button>
          </div>

          {/* Intent Signals */}
          {b2cSubTab === "intent" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-purple-500" /> Intent Signals
                </CardTitle>
                <CardDescription>Find people actively searching for services across industries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Industry
                    </Label>
                    <Select
                      value={intentForm.industry}
                      onValueChange={(v) => setIntentForm({ ...intentForm, industry: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aesthetics">✨ Aesthetics & Medical Spa</SelectItem>
                        <SelectItem value="dental">🦷 Dental</SelectItem>
                        <SelectItem value="real_estate">🏠 Real Estate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4" /> Search Intent
                    </Label>
                    <Select
                      value={intentForm.searchIntent}
                      onValueChange={(v) => setIntentForm({ ...intentForm, searchIntent: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTENT_OPTIONS[intentForm.industry]?.map((opt) => (
                          <SelectItem key={opt.label} value={opt.label.toLowerCase().replace(/ /g, "_")}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Dubai, Los Angeles"
                      value={intentForm.location}
                      onChange={(e) => setIntentForm({ ...intentForm, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={intentForm.source}
                      onValueChange={(v) => setIntentForm({ ...intentForm, source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_intent">🔍 Google Search Intent</SelectItem>
                        <SelectItem value="reddit">📱 Reddit</SelectItem>
                        <SelectItem value="twitter">🐦 Twitter/X</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Results</Label>
                    <span>{intentForm.maxResults}</span>
                  </div>
                  <Slider
                    value={[intentForm.maxResults]}
                    onValueChange={(v) => setIntentForm({ ...intentForm, maxResults: v[0] })}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                {/* Search Keywords */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Search Keywords:</Label>
                  <div className="flex flex-wrap gap-2">
                    {currentIntentKeywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="bg-purple-100 text-purple-700">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleIntentSearch}
                  disabled={isSearching}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4 mr-2" />
                  )}
                  Find Intent Leads
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Social Audiences */}
          {b2cSubTab === "social" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-pink-500" /> Social Audiences
                </CardTitle>
                <CardDescription>Find potential customers from social media engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={socialForm.platform}
                      onValueChange={(v) => setSocialForm({ ...socialForm, platform: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">📸 Instagram</SelectItem>
                        <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                        <SelectItem value="facebook">📘 Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hashtags / Keywords</Label>
                    <Input
                      placeholder="#skincare, #botox, #beauty"
                      value={socialForm.hashtags}
                      onChange={(e) => setSocialForm({ ...socialForm, hashtags: e.target.value })}
                    />
                  </div>
                </div>

                <Button disabled className="w-full" size="lg">
                  <MessageSquare className="h-4 w-4 mr-2" /> Coming Soon
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Review Hunters */}
          {b2cSubTab === "reviews" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" /> Review Hunters
                </CardTitle>
                <CardDescription>Find customers who left negative reviews at competitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Coming Soon</p>
                  <p className="text-sm">Monitor competitor reviews and reach out to dissatisfied customers</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== AUTO LEAD GEN TAB ==================== */}
        <TabsContent value="auto">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-green-500" /> Auto Lead Gen Configuration
                </CardTitle>
                <CardDescription>Set up automated lead generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label>Enable Auto Lead Gen</Label>
                    <p className="text-xs text-muted-foreground">Run automatically on schedule</p>
                  </div>
                  <Switch
                    checked={autoSettings.enabled}
                    onCheckedChange={(v) => setAutoSettings({ ...autoSettings, enabled: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <Select
                    value={autoSettings.source}
                    onValueChange={(v) => setAutoSettings({ ...autoSettings, source: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick_search">🎁 Quick Search (Free)</SelectItem>
                      <SelectItem value="local_discovery">📍 Local Discovery</SelectItem>
                      <SelectItem value="intent_signals">📡 Intent Signals</SelectItem>
                      <SelectItem value="linkedin">💼 LinkedIn Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={autoSettings.industry}
                    onValueChange={(v) => setAutoSettings({ ...autoSettings, industry: v })}
                  >
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
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Dubai, New York"
                    value={autoSettings.location}
                    onChange={(e) => setAutoSettings({ ...autoSettings, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords (optional)</Label>
                  <Input
                    placeholder="Additional keywords"
                    value={autoSettings.keywords}
                    onChange={(e) => setAutoSettings({ ...autoSettings, keywords: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Leads per Run</Label>
                    <span>{autoSettings.maxLeadsPerRun}</span>
                  </div>
                  <Slider
                    value={[autoSettings.maxLeadsPerRun]}
                    onValueChange={(v) => setAutoSettings({ ...autoSettings, maxLeadsPerRun: v[0] })}
                    min={5}
                    max={50}
                    step={5}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={autoSettings.frequency}
                      onValueChange={(v) => setAutoSettings({ ...autoSettings, frequency: v })}
                    >
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
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={autoSettings.time}
                      onChange={(e) => setAutoSettings({ ...autoSettings, time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Auto-enrich leads</Label>
                    <Switch
                      checked={autoSettings.autoEnrich}
                      onCheckedChange={(v) => setAutoSettings({ ...autoSettings, autoEnrich: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto-score leads</Label>
                    <Switch
                      checked={autoSettings.autoScore}
                      onCheckedChange={(v) => setAutoSettings({ ...autoSettings, autoScore: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto-add to sequence</Label>
                    <Switch
                      checked={autoSettings.autoSequence}
                      onCheckedChange={(v) => setAutoSettings({ ...autoSettings, autoSequence: v })}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveAutoConfig} className="w-full" size="lg">
                  <Bot className="h-4 w-4 mr-2" /> Save Configuration
                </Button>
              </CardContent>
            </Card>

            {/* Saved Configurations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Saved Configurations</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => refetchConfigs()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {savedConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved configurations</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {savedConfigs.map((config: any) => (
                        <div key={config.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{config.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {config.industry} • {config.city || "Any location"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={config.is_active ? "default" : "secondary"}>
                                  {config.is_active ? "Active" : "Paused"}
                                </Badge>
                                {config.is_scheduled && (
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {config.schedule_frequency}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => deleteConfig.mutate(config.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

        {/* ==================== IMPORT TAB ==================== */}
        <TabsContent value="import">
          {/* Import Sub-tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={importSubTab === "csv" ? "default" : "outline"}
              onClick={() => setImportSubTab("csv")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" /> CSV Upload
            </Button>
            <Button
              variant={importSubTab === "manual" ? "default" : "outline"}
              onClick={() => setImportSubTab("manual")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Manual Entry
            </Button>
            <Button
              variant={importSubTab === "crm" ? "default" : "outline"}
              onClick={() => setImportSubTab("crm")}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" /> CRM Sync
            </Button>
          </div>

          {/* CSV Upload */}
          {importSubTab === "csv" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>Upload a CSV with columns: name, email, phone, company (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file?.name.endsWith(".csv")) setUploadedFile(file);
                  }}
                  onClick={() => document.getElementById("csv-input")?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">CSV files up to 10MB</p>
                  <input
                    id="csv-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadedFile(file);
                    }}
                  />
                </div>

                {uploadedFile && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button onClick={handleFileUpload}>Upload & Import</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Entry */}
          {importSubTab === "manual" && (
            <Card>
              <CardHeader>
                <CardTitle>Add Lead Manually</CardTitle>
                <CardDescription>Enter lead details to add to your pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={manualForm.name}
                      onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      value={manualForm.email}
                      onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+1 234 567 8900"
                      value={manualForm.phone}
                      onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company Name"
                      value={manualForm.company}
                      onChange={(e) => setManualForm({ ...manualForm, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Job Title</Label>
                    <Input
                      placeholder="CEO, Manager, etc."
                      value={manualForm.title}
                      onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleManualEntry} className="w-full" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> Add Lead
                </Button>
              </CardContent>
            </Card>
          )}

          {/* CRM Sync */}
          {importSubTab === "crm" && (
            <Card>
              <CardHeader>
                <CardTitle>Sync from CRM</CardTitle>
                <CardDescription>Import leads from your CRM system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { name: "Salesforce", icon: "☁️" },
                    { name: "HubSpot", icon: "🟠" },
                    { name: "Pipedrive", icon: "🟢" },
                    { name: "Zoho", icon: "🔴" },
                  ].map((crm) => (
                    <Card key={crm.name} className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="pt-6 text-center">
                        <RefreshCw className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="font-medium">{crm.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== HISTORY TAB ==================== */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generation History</CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No generation history yet</p>
                  <p className="text-sm">Start generating leads to see history here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Query</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Saved</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell>{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{h.search_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{h.keywords || h.industry}</TableCell>
                        <TableCell>{h.leads_found || 0}</TableCell>
                        <TableCell>{h.leads_saved || 0}</TableCell>
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
      </Tabs>
    </div>
  );
}
