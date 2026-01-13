// ============================================
// FILE: src/pages/sales/LeadDiscovery.tsx
// COMPLETE B2B IMPLEMENTATION - ALL FEATURES
// Paste this into Lovable to replace existing
// ============================================

import { useState, useEffect } from "react";
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
  Check,
  AlertTriangle,
  ExternalLink,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const N8N_WEBHOOK_URL = "https://webhooks.zatesystems.com/webhook";

// COMPLETE INDUSTRIES LIST - Matching n8n workflow configurations
const INDUSTRIES = [
  {
    id: "medical_spa",
    label: "Medical Spa / Aesthetics",
    icon: "✨",
    google_suffix: "medical spa aesthetics clinic botox filler laser treatment contact email",
  },
  {
    id: "dental",
    label: "Dental Clinic",
    icon: "🦷",
    google_suffix: "dental clinic dentist teeth whitening orthodontist contact email",
  },
  {
    id: "salon",
    label: "Salon / Beauty",
    icon: "💇",
    google_suffix: "salon beauty parlor hair nails spa contact booking email",
  },
  {
    id: "real_estate",
    label: "Real Estate",
    icon: "🏠",
    google_suffix: "real estate agent broker property manager listing contact email",
  },
  {
    id: "restaurant",
    label: "Restaurant / F&B",
    icon: "🍽️",
    google_suffix: "restaurant cafe dining catering food contact reservation email",
  },
  {
    id: "healthcare",
    label: "Healthcare / Clinic",
    icon: "⚕️",
    google_suffix: "healthcare clinic hospital medical center doctor contact email",
  },
  {
    id: "fitness",
    label: "Fitness / Gym",
    icon: "💪",
    google_suffix: "gym fitness center personal trainer workout contact membership email",
  },
  {
    id: "technology",
    label: "Technology / Software",
    icon: "💻",
    google_suffix: "technology software company SaaS development IT services contact email",
  },
  {
    id: "flooring",
    label: "Flooring / Contractors",
    icon: "🏗️",
    google_suffix: "flooring contractor installation tiles hardwood carpet vinyl contact email",
  },
  {
    id: "construction",
    label: "Construction",
    icon: "🔨",
    google_suffix: "construction contractor builder general contractor renovation contact email",
  },
  {
    id: "legal",
    label: "Legal / Law Firm",
    icon: "⚖️",
    google_suffix: "law firm attorney lawyer legal services consultation contact email",
  },
  {
    id: "accounting",
    label: "Accounting / CPA",
    icon: "📊",
    google_suffix: "accounting firm CPA accountant tax services bookkeeping contact email",
  },
  {
    id: "marketing",
    label: "Marketing / Agency",
    icon: "📣",
    google_suffix: "marketing agency digital marketing advertising PR branding contact email",
  },
  {
    id: "insurance",
    label: "Insurance",
    icon: "🛡️",
    google_suffix: "insurance agency broker auto home life health contact quote email",
  },
  {
    id: "automotive",
    label: "Automotive",
    icon: "🚗",
    google_suffix: "auto dealer car dealership mechanic repair service contact email",
  },
  {
    id: "education",
    label: "Education / Training",
    icon: "📚",
    google_suffix: "school training center tutoring education courses contact enrollment email",
  },
  {
    id: "hotel",
    label: "Hotel / Hospitality",
    icon: "🏨",
    google_suffix: "hotel resort hospitality accommodation booking reservation contact email",
  },
  {
    id: "plumbing",
    label: "Plumbing",
    icon: "🔧",
    google_suffix: "plumber plumbing contractor repair installation emergency service contact email",
  },
  {
    id: "electrical",
    label: "Electrical",
    icon: "⚡",
    google_suffix: "electrician electrical contractor wiring repair installation contact email",
  },
  {
    id: "hvac",
    label: "HVAC",
    icon: "❄️",
    google_suffix: "hvac heating cooling air conditioning repair installation contact email",
  },
  {
    id: "landscaping",
    label: "Landscaping",
    icon: "🌳",
    google_suffix: "landscaping lawn care garden maintenance outdoor services contact email",
  },
  {
    id: "photography",
    label: "Photography",
    icon: "📷",
    google_suffix: "photographer photography studio wedding portrait event contact booking email",
  },
  {
    id: "wedding",
    label: "Wedding / Events",
    icon: "💒",
    google_suffix: "wedding planner event planning venue catering contact booking email",
  },
  {
    id: "pet_services",
    label: "Pet Services",
    icon: "🐕",
    google_suffix: "pet grooming veterinary dog walking pet sitting boarding contact email",
  },
  {
    id: "cleaning",
    label: "Cleaning Services",
    icon: "🧹",
    google_suffix: "cleaning service house cleaning commercial janitorial maid contact email",
  },
  {
    id: "moving",
    label: "Moving / Storage",
    icon: "📦",
    google_suffix: "moving company movers storage relocation packing contact quote email",
  },
  {
    id: "general",
    label: "General / Other",
    icon: "🏢",
    google_suffix: "business company enterprise services contact email phone",
  },
];

// LOCAL DISCOVERY CATEGORIES - For Google Places/Maps
const LOCAL_CATEGORIES = [
  { id: "beauty_salon", label: "Beauty Salon", icon: "💇" },
  { id: "spa", label: "Spa", icon: "🧖" },
  { id: "gym", label: "Gym / Fitness", icon: "💪" },
  { id: "dentist", label: "Dentist", icon: "🦷" },
  { id: "doctor", label: "Doctor / Clinic", icon: "⚕️" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "cafe", label: "Cafe / Coffee", icon: "☕" },
  { id: "real_estate_agency", label: "Real Estate", icon: "🏠" },
  { id: "flooring_contractor", label: "Flooring Contractor", icon: "🏗️" },
  { id: "general_contractor", label: "General Contractor", icon: "🔨" },
  { id: "electrician", label: "Electrician", icon: "⚡" },
  { id: "plumber", label: "Plumber", icon: "🔧" },
  { id: "lawyer", label: "Lawyer / Law Firm", icon: "⚖️" },
  { id: "accountant", label: "Accountant / CPA", icon: "📊" },
  { id: "car_dealer", label: "Car Dealer", icon: "🚗" },
  { id: "car_repair", label: "Auto Repair", icon: "🔧" },
  { id: "hotel", label: "Hotel", icon: "🏨" },
  { id: "pet_store", label: "Pet Store / Vet", icon: "🐕" },
  { id: "moving_company", label: "Moving Company", icon: "📦" },
  { id: "insurance_agency", label: "Insurance Agency", icon: "🛡️" },
];

// JOB TITLES for Premium B2B
const JOB_TITLES = [
  "CEO",
  "Owner",
  "Founder",
  "President",
  "Director",
  "General Manager",
  "Manager",
  "VP",
  "Vice President",
  "Partner",
  "Principal",
  "CFO",
  "COO",
  "CTO",
  "Sales Director",
  "Marketing Director",
  "Operations Director",
  "Practice Manager",
  "Office Manager",
  "Administrator",
];

// COMPANY SIZES
const COMPANY_SIZES = [
  { id: "1-10", label: "1-10 employees" },
  { id: "11-50", label: "11-50 employees" },
  { id: "51-200", label: "51-200 employees" },
  { id: "201-500", label: "201-500 employees" },
  { id: "500+", label: "500+ employees" },
];

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

  // Search results state (for displaying before saving)
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

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
    country: "United Arab Emirates",
    companySize: [] as string[],
    maxResults: 25,
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

  // Check if tenant has premium API keys
  const hasApolloKey = !!tenantConfig?.apollo_api_key;
  const hasHunterKey = !!tenantConfig?.hunter_api_key;
  const hasApifyKey = !!tenantConfig?.apify_api_key;
  const hasPremiumAccess = hasApolloKey || hasHunterKey;

  // Fetch stats using UUID
  const { data: stats, refetch: refetchStats } = useQuery({
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

  // ============ HANDLERS ============

  // B2B Quick Search
  const handleQuickSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded. Please refresh.", variant: "destructive" });
      return;
    }
    if (!quickForm.location) {
      toast({ title: "Missing location", description: "Please enter a city or location", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setShowResults(false);

    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid, // CRITICAL: Send UUID!
          keywords:
            quickForm.keywords || INDUSTRIES.find((i) => i.id === quickForm.industry)?.label || quickForm.industry,
          industry: quickForm.industry,
          location: quickForm.location,
          city: quickForm.location,
          country: "USA", // Default, can be made configurable
          max_leads: quickForm.maxResults,
          data_sources: ["google"],
          use_premium_sources: false,
        }),
      });

      const result = await response.json();

      if (result.success || result.leads) {
        const leadsFound = result.leads?.length || result.leads_found || 0;
        const leadsSaved = result.leads_saved || leadsFound;

        toast({
          title: "✅ Search Complete!",
          description: `Found ${leadsFound} businesses, saved ${leadsSaved} new leads`,
        });

        // Refresh stats
        queryClient.invalidateQueries({ queryKey: ["lead-discovery-stats"] });
        queryClient.invalidateQueries({ queryKey: ["lead-gen-history"] });
        refetchStats();

        // Show results if available
        if (result.leads && result.leads.length > 0) {
          setSearchResults(result.leads);
          setShowResults(true);
        }
      } else {
        throw new Error(result.error || result.message || "Search failed - check n8n workflow");
      }
    } catch (error: any) {
      console.error("Quick Search Error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Check browser console and n8n execution logs",
        variant: "destructive",
      });
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
      toast({
        title: "Missing fields",
        description: "Please select category and enter location",
        variant: "destructive",
      });
      return;
    }

    if (!hasApifyKey) {
      toast({
        title: "API Key Required",
        description: "Local Discovery requires Apify API key. Configure in Settings → Integrations.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          generation_type: "google_places", // Route to Places logic
          category: localForm.category,
          location: localForm.location,
          radius_km: localForm.radius,
          min_rating: parseFloat(localForm.minRating),
          max_leads: localForm.maxResults,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "✅ Local Businesses Found!",
          description: `Found ${result.leads?.length || 0} nearby businesses`,
        });
        refetchHistory();
        refetchStats();
      } else {
        throw new Error(result.error || "Local Discovery failed");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // B2B LinkedIn Premium Search
  const handleLinkedInSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }

    if (!hasPremiumAccess) {
      toast({
        title: "API Keys Required",
        description: "Premium search requires Apollo.io or Hunter.io API key. Configure in Settings → Integrations.",
        variant: "destructive",
      });
      return;
    }

    if (linkedinForm.titles.length === 0) {
      toast({
        title: "Select Job Titles",
        description: "Please select at least one job title to search",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/premium-b2b-lead-gen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          job_titles: linkedinForm.titles,
          industries: linkedinForm.industries,
          country: linkedinForm.country,
          city: linkedinForm.location,
          company_sizes: linkedinForm.companySize,
          max_results: linkedinForm.maxResults,
          use_apollo: hasApolloKey,
          use_hunter: hasHunterKey,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "✅ Premium Search Complete!",
          description: `Found ${result.leads?.length || 0} decision makers with contact info`,
        });
        refetchHistory();
        refetchStats();

        if (result.leads) {
          setSearchResults(result.leads);
          setShowResults(true);
        }
      } else {
        throw new Error(result.error || "Premium search failed");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Save Auto Lead Gen Config
  const handleSaveAutoConfig = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded yet. Please wait.", variant: "destructive" });
      return;
    }

    if (!autoSettings.industry || !autoSettings.location) {
      toast({ title: "Missing fields", description: "Please select industry and location", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("lead_gen_searches").insert({
        tenant_id: tenantUuid,
        name: `Auto: ${INDUSTRIES.find((i) => i.id === autoSettings.industry)?.label || autoSettings.industry} - ${autoSettings.location}`,
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

  // Manual Entry
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
        tenant_id: tenantUuid,
        company_name: manualForm.company || null,
        contact_name: manualForm.name || null,
        email: manualForm.email || null,
        phone: manualForm.phone || null,
        job_title: manualForm.title || null,
        source: "manual",
        source_channel: "manual_entry",
        status: "new",
        lead_score: 50,
        temperature: "warm",
      });

      if (error) throw error;

      toast({ title: "✅ Lead Added!", description: "Lead has been added to your pipeline" });
      setManualForm({ name: "", email: "", phone: "", company: "", title: "" });
      refetchStats();
    } catch (error: any) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    }
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

  // Toggle job title selection
  const toggleTitle = (title: string) => {
    setLinkedinForm((prev) => ({
      ...prev,
      titles: prev.titles.includes(title) ? prev.titles.filter((t) => t !== title) : [...prev.titles, title],
    }));
  };

  // Toggle company size selection
  const toggleSize = (size: string) => {
    setLinkedinForm((prev) => ({
      ...prev,
      companySize: prev.companySize.includes(size)
        ? prev.companySize.filter((s) => s !== size)
        : [...prev.companySize, size],
    }));
  };

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
            <div className="space-y-6">
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
                      <Label>Location *</Label>
                      <Input
                        placeholder="e.g., New York, Dubai, London"
                        value={quickForm.location}
                        onChange={(e) => setQuickForm({ ...quickForm, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Keywords (optional)</Label>
                    <Input
                      placeholder="e.g., luxury, premium, certified, award-winning"
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
                    disabled={isSearching || !quickForm.location}
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

              {/* Search Results */}
              {showResults && searchResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Search Results ({searchResults.length} found)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Website</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((lead: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{lead.company_name}</TableCell>
                              <TableCell>
                                {lead.website && (
                                  <a
                                    href={lead.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    <Globe className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">
                                      {lead.website.replace(/https?:\/\//, "")}
                                    </span>
                                  </a>
                                )}
                              </TableCell>
                              <TableCell>
                                {lead.email ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Mail className="h-3 w-3" /> {lead.email}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Needs enrichment</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {lead.phone ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Phone className="h-3 w-3" /> {lead.phone}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  <Check className="h-3 w-3 mr-1" /> Saved
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
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
                {!hasApifyKey && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Local Discovery requires Apify API key. Configure in Settings → Integrations.
                    </p>
                  </div>
                )}

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
                        {LOCAL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Area</Label>
                    <Input
                      placeholder="e.g., DIFC Dubai, Manhattan NYC"
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

                <Button
                  onClick={handleLocalDiscovery}
                  disabled={isSearching || !hasApifyKey || !localForm.category || !localForm.location}
                  className="w-full"
                  size="lg"
                >
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
                  <Linkedin className="h-5 w-5 text-[#0077B5]" /> LinkedIn Premium Search
                </CardTitle>
                <CardDescription>Find decision makers with Apollo.io + Hunter.io enrichment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasPremiumAccess ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Premium search requires API keys. Add your Apollo.io or Hunter.io key in Settings → Integrations.
                    </p>
                    <div className="mt-2 flex gap-2">
                      {hasApolloKey && <Badge className="bg-green-100 text-green-700">✓ Apollo Connected</Badge>}
                      {hasHunterKey && <Badge className="bg-green-100 text-green-700">✓ Hunter Connected</Badge>}
                      {!hasApolloKey && (
                        <Badge variant="outline" className="text-gray-500">
                          Apollo: Not configured
                        </Badge>
                      )}
                      {!hasHunterKey && (
                        <Badge variant="outline" className="text-gray-500">
                          Hunter: Not configured
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Premium access enabled:
                      {hasApolloKey && <Badge className="bg-green-100 text-green-700 ml-2">Apollo ✓</Badge>}
                      {hasHunterKey && <Badge className="bg-green-100 text-green-700 ml-1">Hunter ✓</Badge>}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Target Job Titles *</Label>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TITLES.map((title) => (
                      <Badge
                        key={title}
                        variant={linkedinForm.titles.includes(title) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          linkedinForm.titles.includes(title) && "bg-blue-500",
                        )}
                        onClick={() => toggleTitle(title)}
                      >
                        {title}
                      </Badge>
                    ))}
                  </div>
                  {linkedinForm.titles.length > 0 && (
                    <p className="text-xs text-muted-foreground">{linkedinForm.titles.length} selected</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Company Size (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_SIZES.map((size) => (
                      <Badge
                        key={size.id}
                        variant={linkedinForm.companySize.includes(size.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleSize(size.id)}
                      >
                        {size.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location / City</Label>
                    <Input
                      placeholder="e.g., Dubai, New York"
                      value={linkedinForm.location}
                      onChange={(e) => setLinkedinForm({ ...linkedinForm, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      value={linkedinForm.country}
                      onValueChange={(v) => setLinkedinForm({ ...linkedinForm, country: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United Arab Emirates">🇦🇪 United Arab Emirates</SelectItem>
                        <SelectItem value="United States">🇺🇸 United States</SelectItem>
                        <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                        <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                        <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                        <SelectItem value="India">🇮🇳 India</SelectItem>
                        <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                        <SelectItem value="France">🇫🇷 France</SelectItem>
                        <SelectItem value="Saudi Arabia">🇸🇦 Saudi Arabia</SelectItem>
                        <SelectItem value="Qatar">🇶🇦 Qatar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max Results</Label>
                    <span>{linkedinForm.maxResults}</span>
                  </div>
                  <Slider
                    value={[linkedinForm.maxResults]}
                    onValueChange={(v) => setLinkedinForm({ ...linkedinForm, maxResults: v[0] })}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                <Button
                  onClick={handleLinkedInSearch}
                  disabled={isSearching || !hasPremiumAccess || linkedinForm.titles.length === 0}
                  className="w-full bg-[#0077B5] hover:bg-[#005885]"
                  size="lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" /> Find Decision Makers
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== B2C TAB ==================== */}
        <TabsContent value="b2c">
          <Card>
            <CardHeader>
              <CardTitle>Consumer (B2C) Lead Discovery</CardTitle>
              <CardDescription>Find individual consumers with buying intent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Coming Soon</p>
                <p className="text-sm">Intent Signals, Social Audiences, and Review Hunters</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== AUTO LEAD GEN TAB ==================== */}
        <TabsContent value="auto">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-green-500" /> Auto Lead Gen Configuration
                </CardTitle>
                <CardDescription>Set up automated lead generation on a schedule</CardDescription>
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
                      <SelectItem value="linkedin_premium">💼 LinkedIn Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Industry *</Label>
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
                  <Label>Location *</Label>
                  <Input
                    placeholder="e.g., Dubai, New York"
                    value={autoSettings.location}
                    onChange={(e) => setAutoSettings({ ...autoSettings, location: e.target.value })}
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

                <Button onClick={handleSaveAutoConfig} className="w-full" size="lg">
                  <Bot className="h-4 w-4 mr-2" /> Save Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved Configurations</CardTitle>
              </CardHeader>
              <CardContent>
                {savedConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved configurations</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {savedConfigs.map((config: any) => (
                        <div key={config.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{config.name}</p>
                              <p className="text-sm text-muted-foreground">{config.city || "Any location"}</p>
                              <Badge variant={config.is_active ? "default" : "secondary"} className="mt-2">
                                {config.is_active ? "Active" : "Paused"}
                              </Badge>
                            </div>
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
          <div className="flex gap-2 mb-6">
            <Button variant={importSubTab === "csv" ? "default" : "outline"} onClick={() => setImportSubTab("csv")}>
              <FileText className="h-4 w-4 mr-2" /> CSV Upload
            </Button>
            <Button
              variant={importSubTab === "manual" ? "default" : "outline"}
              onClick={() => setImportSubTab("manual")}
            >
              <Plus className="h-4 w-4 mr-2" /> Manual Entry
            </Button>
            <Button variant={importSubTab === "crm" ? "default" : "outline"} onClick={() => setImportSubTab("crm")}>
              <RefreshCw className="h-4 w-4 mr-2" /> CRM Sync
            </Button>
          </div>

          {importSubTab === "manual" && (
            <Card>
              <CardHeader>
                <CardTitle>Add Lead Manually</CardTitle>
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
                </div>
                <Button onClick={handleManualEntry} className="w-full" size="lg">
                  <Plus className="h-4 w-4 mr-2" /> Add Lead
                </Button>
              </CardContent>
            </Card>
          )}

          {importSubTab === "csv" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>Upload a CSV with columns: name, email, phone, company</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p>Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">CSV files up to 10MB</p>
                </div>
              </CardContent>
            </Card>
          )}

          {importSubTab === "crm" && (
            <Card>
              <CardHeader>
                <CardTitle>Sync from CRM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {["Salesforce", "HubSpot", "Pipedrive", "Zoho"].map((crm) => (
                    <Card key={crm} className="cursor-pointer hover:border-primary">
                      <CardContent className="pt-6 text-center">
                        <RefreshCw className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="font-medium">{crm}</p>
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
