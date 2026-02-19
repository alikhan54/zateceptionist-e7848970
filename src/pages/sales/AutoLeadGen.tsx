// ============================================
// FILE: src/pages/sales/AutoLeadGen.tsx
// COMPLETE FIX - Connected to auto_lead_gen_settings table
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
  Pause,
  Trash2,
  Check,
  AlertTriangle,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

const N8N_WEBHOOK_URL = "https://webhooks.zatesystems.com/webhook";

// COMPLETE INDUSTRIES LIST - Matching n8n workflow configurations
const INDUSTRIES = [
  { id: "flooring", label: "Flooring / Contractors", icon: "🏗️" },
  { id: "medical_spa", label: "Medical Spa / Aesthetics", icon: "✨" },
  { id: "dental", label: "Dental Clinic", icon: "🦷" },
  { id: "salon", label: "Salon / Beauty", icon: "💇" },
  { id: "real_estate", label: "Real Estate", icon: "🏠" },
  { id: "restaurant", label: "Restaurant / F&B", icon: "🍽️" },
  { id: "healthcare", label: "Healthcare / Clinic", icon: "⚕️" },
  { id: "fitness", label: "Fitness / Gym", icon: "💪" },
  { id: "technology", label: "Technology / Software", icon: "💻" },
  { id: "construction", label: "Construction", icon: "🔨" },
  { id: "legal", label: "Legal / Law Firm", icon: "⚖️" },
  { id: "accounting", label: "Accounting / CPA", icon: "📊" },
  { id: "marketing", label: "Marketing / Agency", icon: "📣" },
  { id: "insurance", label: "Insurance", icon: "🛡️" },
  { id: "automotive", label: "Automotive", icon: "🚗" },
  { id: "education", label: "Education / Training", icon: "📚" },
  { id: "hotel", label: "Hotel / Hospitality", icon: "🏨" },
  { id: "plumbing", label: "Plumbing", icon: "🔧" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "hvac", label: "HVAC", icon: "❄️" },
  { id: "landscaping", label: "Landscaping", icon: "🌳" },
  { id: "photography", label: "Photography", icon: "📷" },
  { id: "wedding", label: "Wedding / Events", icon: "💒" },
  { id: "pet_services", label: "Pet Services", icon: "🐕" },
  { id: "cleaning", label: "Cleaning Services", icon: "🧹" },
  { id: "moving", label: "Moving / Storage", icon: "📦" },
  { id: "general", label: "General / Other", icon: "🏢" },
];

// LOCAL DISCOVERY CATEGORIES - For Google Places/Maps
const LOCAL_CATEGORIES = [
  { id: "flooring_contractor", label: "Flooring Contractor", icon: "🏗️" },
  { id: "beauty_salon", label: "Beauty Salon", icon: "💇" },
  { id: "spa", label: "Spa", icon: "🧖" },
  { id: "gym", label: "Gym / Fitness", icon: "💪" },
  { id: "dentist", label: "Dentist", icon: "🦷" },
  { id: "doctor", label: "Doctor / Clinic", icon: "⚕️" },
  { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  { id: "cafe", label: "Cafe / Coffee", icon: "☕" },
  { id: "real_estate_agency", label: "Real Estate", icon: "🏠" },
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

// B2C INDUSTRIES
const B2C_INDUSTRIES = [
  { id: "aesthetics", label: "Aesthetics & Med Spa", keywords: ["botox", "filler", "laser treatment", "med spa"] },
  { id: "dental", label: "Dental", keywords: ["dentist", "teeth whitening", "dental implants"] },
  { id: "healthcare", label: "Healthcare", keywords: ["doctor", "clinic", "specialist"] },
  { id: "beauty", label: "Beauty & Salon", keywords: ["salon", "hair stylist", "spa", "nails"] },
  { id: "fitness", label: "Fitness & Gym", keywords: ["gym", "personal trainer", "yoga"] },
  { id: "real_estate", label: "Real Estate", keywords: ["realtor", "property", "home buying"] },
  { id: "legal", label: "Legal Services", keywords: ["lawyer", "attorney", "legal advice"] },
  { id: "financial", label: "Financial Services", keywords: ["financial advisor", "accountant"] },
  { id: "home_services", label: "Home Services", keywords: ["plumber", "electrician", "handyman"] },
  { id: "cleaning", label: "Cleaning Services", keywords: ["cleaning service", "maid"] },
  { id: "automotive", label: "Automotive", keywords: ["mechanic", "car repair", "auto shop"] },
  { id: "pet_services", label: "Pet Services", keywords: ["vet", "dog groomer", "pet sitter"] },
  { id: "childcare", label: "Childcare", keywords: ["daycare", "nanny", "babysitter"] },
  { id: "education", label: "Education & Tutoring", keywords: ["tutor", "online course"] },
  { id: "events", label: "Events & Wedding", keywords: ["wedding planner", "event venue"] },
  { id: "photography", label: "Photography", keywords: ["photographer", "headshots"] },
  { id: "renovation", label: "Renovation", keywords: ["contractor", "remodel"] },
  { id: "landscaping", label: "Landscaping", keywords: ["landscaper", "lawn care"] },
  { id: "senior_care", label: "Senior Care", keywords: ["senior care", "caregiver"] },
  { id: "tech_services", label: "Tech Services", keywords: ["IT support", "web developer"] },
];

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "twitter", label: "Twitter/X", icon: "🐦" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
];

const REVIEW_SITES = [
  { id: "google_reviews", label: "Google Reviews", icon: "⭐" },
  { id: "yelp", label: "Yelp", icon: "🔴" },
  { id: "tripadvisor", label: "TripAdvisor", icon: "🦉" },
  { id: "trustpilot", label: "Trustpilot", icon: "⭐" },
];

export default function LeadDiscovery() {
  // CRITICAL: Get tenantId (SLUG) for sales_leads; tenantUuid only for UUID-typed tables
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id; // UUID — only for lead_gen_history, auto_lead_gen_settings

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
    industry: "flooring",
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
    industry: "",
    keywords: "",
    location: "",
    country: "United States",
    companySize: "",
    maxResults: 25,
  });

  // ============================================================
  // FIX: Auto Lead Gen settings STATE DECLARATION (was missing!)
  // This MUST come BEFORE the useEffect that uses it
  // ============================================================
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

  // Form starts fresh — users load a specific config by clicking "Edit" on saved configs

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

  // B2C Form States - Enhanced
  const [intentForm, setIntentForm] = useState({
    industry: "aesthetics",
    keywords: "",
    location: "",
    platforms: ["reddit", "quora"] as string[],
    maxResults: 25,
  });

  const [socialForm, setSocialForm] = useState({
    platform: "instagram",
    searchMode: "hashtags" as "hashtags" | "competitors",
    hashtags: "",
    competitorAccounts: "",
    maxResults: 50,
  });

  const [reviewForm, setReviewForm] = useState({
    searchMode: "businesses" as "customers" | "businesses",
    industry: "aesthetics",
    location: "",
    competitorName: "",
    reviewSite: "google_reviews",
    maxRating: "3",
    maxResults: 25,
  });

  const [b2cResults, setB2cResults] = useState<any>(null);

  // Check if tenant has premium API keys
  const hasApolloKey = !!tenantConfig?.apollo_api_key;
  const hasHunterKey = !!tenantConfig?.hunter_api_key;
  const hasApifyKey = !!tenantConfig?.apify_api_key;
  const hasPremiumAccess = hasApolloKey || hasHunterKey;

  // Fetch stats — sales_leads uses SLUG (tenantId) — TEXT column
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["lead-discovery-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return { total: 0, today: 0, inSequences: 0, conversion: 0 };

      const { count: total } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId); // SLUG — sales_leads uses TEXT tenant_id

      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId) // SLUG
        .gte("created_at", today);

      const { count: inSequences } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId) // SLUG
        .not("sequence_id", "is", null);

      const { count: converted } = await supabase
        .from("sales_leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId) // SLUG
        .eq("lead_status", "converted");

      const convRate = total && total > 0 ? (((converted || 0) / total) * 100).toFixed(0) : "0";

      return {
        total: total || 0,
        today: todayCount || 0,
        inSequences: inSequences || 0,
        conversion: convRate,
      };
    },
    enabled: !!tenantId,
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

  // ============================================================
  // FIXED: Fetch saved auto-gen configs from auto_lead_gen_settings
  // This is what Part 35 workflow reads from!
  // ============================================================
  const { data: savedConfigs = [], refetch: refetchConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["auto-lead-gen-settings", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("auto_lead_gen_settings")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching configs:", error);
        return [];
      }
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
      const industryLabel = INDUSTRIES.find((i) => i.id === quickForm.industry)?.label || quickForm.industry;
      const searchKeywords = quickForm.keywords || industryLabel;

      const response = await fetch(`${N8N_WEBHOOK_URL}/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          keywords: searchKeywords,
          industry: quickForm.industry,
          location: quickForm.location,
          country: "USA",
          max_leads: quickForm.maxResults,
          data_sources: ["google"],
          use_premium_sources: false,
        }),
      });

      const result = await response.json();

      if (result.success || result.leads) {
        const leadsFound = result.leads?.length || result.leads_found || 0;
        const leadsSaved = result.leads_saved || 0;

        toast({
          title: "✅ Search Complete!",
          description: `Found ${leadsFound} businesses, saved ${leadsSaved} new leads`,
        });

        queryClient.invalidateQueries({ queryKey: ["lead-discovery-stats"] });
        queryClient.invalidateQueries({ queryKey: ["lead-gen-history"] });
        refetchStats();
        refetchHistory();

        if (result.leads && result.leads.length > 0) {
          setSearchResults(result.leads);
          setShowResults(true);
        }
      } else {
        throw new Error(result.error || result.message || "Search failed");
      }
    } catch (error: any) {
      console.error("Quick Search Error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Check console for details",
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

    setIsSearching(true);
    setSearchResults([]);
    setShowResults(false);

    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/lead-gen-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          generation_type: "google_places",
          category: localForm.category,
          location: localForm.location,
          radius: localForm.radius,
          max_leads: localForm.maxResults,
          data_sources: ["google_places"],
          use_premium_sources: false,
        }),
      });

      const result = await response.json();

      if (result.success || result.leads) {
        const leadsFound = result.leads?.length || result.leads_found || 0;
        const leadsSaved = result.leads_saved || 0;

        toast({
          title: "✅ Discovery Complete!",
          description: `Found ${leadsFound} local businesses, saved ${leadsSaved} new leads`,
        });

        refetchHistory();
        refetchStats();

        if (result.leads && result.leads.length > 0) {
          setSearchResults(result.leads);
          setShowResults(true);
        }
      } else {
        throw new Error(result.error || result.message || "Discovery failed");
      }
    } catch (error: any) {
      toast({ title: "Discovery failed", description: error.message, variant: "destructive" });
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

    const hasKeywords = linkedinForm.keywords && linkedinForm.keywords.trim().length > 0;
    const hasIndustry = linkedinForm.industry && linkedinForm.industry.length > 0;
    const hasJobTitles = linkedinForm.titles.length > 0;

    if (!hasKeywords && !hasIndustry && !hasJobTitles) {
      toast({
        title: "Missing Search Criteria",
        description: "Please provide keywords, select an industry, or choose job titles",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setShowResults(false);

    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/premium-b2b-lead-gen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          keywords: linkedinForm.keywords || "",
          industry: linkedinForm.industry || "",
          job_titles: linkedinForm.titles,
          location: linkedinForm.location,
          country: linkedinForm.country,
          company_size: linkedinForm.companySize || "all",
          max_leads: linkedinForm.maxResults,
          include_emails: true,
          include_phones: true,
          use_premium_sources: true,
          verify_emails: false,
        }),
      });

      const result = await response.json();

      if (result.success || result.leads) {
        const leadsFound = result.leads?.length || result.leads_found || 0;
        const leadsSaved = result.leads_saved || 0;

        toast({
          title: "✅ Premium Search Complete!",
          description: `Found ${leadsFound} decision makers, saved ${leadsSaved} new leads`,
        });

        refetchHistory();
        refetchStats();

        if (result.leads && result.leads.length > 0) {
          setSearchResults(result.leads);
          setShowResults(true);
        }
      } else {
        throw new Error(result.error || result.message || "Premium search failed");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // ============================================================
  // FIXED: Save Auto Lead Gen Config to auto_lead_gen_settings
  // This is what Part 35 workflow reads from!
  // ============================================================
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
      // Get browser timezone for proper schedule handling
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const settingsData = {
        tenant_id: tenantUuid,
        name: `Auto: ${INDUSTRIES.find((i) => i.id === autoSettings.industry)?.label || autoSettings.industry} - ${autoSettings.location}`,
        is_active: autoSettings.enabled,
        generation_type: autoSettings.source,
        industry: autoSettings.industry,
        keywords: autoSettings.keywords || null,
        location: autoSettings.location,
        city: autoSettings.location,
        schedule_type: autoSettings.frequency,
        schedule_time: autoSettings.time + ":00", // Ensure HH:mm:ss format for TIME column
        timezone: browserTimezone,
        max_leads_per_run: autoSettings.maxLeadsPerRun,
        leads_per_run: autoSettings.maxLeadsPerRun,
        auto_enrich: autoSettings.autoEnrich,
        auto_score: autoSettings.autoScore,
        auto_sequence: autoSettings.autoSequence,
        sequence_id: autoSettings.sequenceId || null,
        updated_at: new Date().toISOString(),
      };

      console.log("Saving auto settings:", settingsData);

      const { error } = await supabase
        .from("auto_lead_gen_settings")
        .insert(settingsData);

      if (error) {
        console.error("Save error:", error);
        throw error;
      }

      toast({ title: "✅ Configuration Saved!", description: "Auto lead generation settings saved successfully" });
      refetchConfigs();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    }
  };

  // ============================================================
  // FIXED: Toggle config active/inactive in auto_lead_gen_settings
  // ============================================================
  const toggleConfigActive = async (configId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("auto_lead_gen_settings")
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", configId)
        .eq("tenant_id", tenantUuid);

      if (error) throw error;

      toast({
        title: currentStatus ? "⏸️ Paused" : "▶️ Activated",
        description: currentStatus ? "Auto lead gen paused" : "Auto lead gen will run on schedule",
      });
      refetchConfigs();
    } catch (error: any) {
      console.error("Toggle error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ============================================================
  // FIXED: Delete config from auto_lead_gen_settings
  // ============================================================
  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("auto_lead_gen_settings").delete().eq("id", id).eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      refetchConfigs();
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  // Manual Entry — sales_leads uses SLUG (tenantId)
  const handleManualEntry = async () => {
    if (!tenantId) {
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
      // sales_leads uses SLUG (tenantId) — TEXT column
      const { error } = await supabase.from("sales_leads").insert({
        tenant_id: tenantId, // SLUG — sales_leads uses TEXT tenant_id
        company_name: manualForm.company || null,
        contact_name: manualForm.name || null,
        email: manualForm.email || null,
        phone: manualForm.phone || null,
        job_title: manualForm.title || null,
        source: "manual",
        source_channel: "manual_entry",
        lead_status: "new",
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

  // Toggle job title selection
  const toggleTitle = (title: string) => {
    setLinkedinForm((prev) => ({
      ...prev,
      titles: prev.titles.includes(title) ? prev.titles.filter((t) => t !== title) : [...prev.titles, title],
    }));
  };

  // Get selected B2C industry keywords
  const selectedB2CIndustry = B2C_INDUSTRIES.find((i) => i.id === intentForm.industry);

  // B2C Intent Search Handler - Enhanced
  const handleIntentSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }
    if (!intentForm.keywords.trim()) {
      toast({
        title: "Missing keywords",
        description: "Please enter at least one search keyword",
        variant: "destructive",
      });
      return;
    }
    setIsSearching(true);
    setB2cResults(null);
    try {
      const keywords = intentForm.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const response = await fetch(`${N8N_WEBHOOK_URL}/intent-lead-gen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          industry: intentForm.industry,
          location: intentForm.location,
          keywords: keywords,
          platforms: intentForm.platforms,
          max_results: intentForm.maxResults,
          method: "intent_signals",
        }),
      });
      const result = await response.json();
      if (result.success) {
        setB2cResults(result);
        const leadsCount = result.leads_saved || 0;
        const signalsCount = result.signals_found || result.total_found || 0;
        toast({
          title: "✅ Search Complete!",
          description: `Found ${signalsCount} signals | ${leadsCount} contactable leads added`,
        });
        refetchHistory();
        refetchStats();
      } else {
        throw new Error(result.error || "Search failed");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // B2C Social Audiences Handler - Enhanced
  const handleSocialSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }
    const hashtags = socialForm.hashtags
      .split(",")
      .map((h) => h.trim().replace("#", ""))
      .filter(Boolean);
    const competitors = socialForm.competitorAccounts
      .split(",")
      .map((c) => c.trim().replace("@", ""))
      .filter(Boolean);

    if (socialForm.searchMode === "hashtags" && hashtags.length === 0) {
      toast({ title: "Missing data", description: "Enter at least one hashtag", variant: "destructive" });
      return;
    }
    if (socialForm.searchMode === "competitors" && competitors.length === 0) {
      toast({ title: "Missing data", description: "Enter at least one competitor account", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setB2cResults(null);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/b2c-social-audiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          platform: socialForm.platform,
          method: socialForm.searchMode === "hashtags" ? "hashtag_followers" : "competitor_followers",
          hashtags: socialForm.searchMode === "hashtags" ? hashtags : [],
          competitor_accounts: socialForm.searchMode === "competitors" ? competitors : [],
          max_results: socialForm.maxResults,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setB2cResults(result);
        toast({ title: "✅ Search Complete!", description: `Saved ${result.leads_saved || 0} new leads` });
        refetchHistory();
        refetchStats();
      } else {
        throw new Error(result.error || "Search failed");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // B2C Review Hunters Handler - Enhanced
  const handleReviewSearch = async () => {
    if (!tenantUuid) {
      toast({ title: "Error", description: "Tenant not loaded", variant: "destructive" });
      return;
    }
    if (!reviewForm.location) {
      toast({ title: "Missing data", description: "Please enter a location", variant: "destructive" });
      return;
    }
    if (reviewForm.searchMode === "customers" && !reviewForm.competitorName) {
      toast({ title: "Missing data", description: "Enter competitor business name", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    setB2cResults(null);
    try {
      const response = await fetch(`${N8N_WEBHOOK_URL}/b2c-review-hunters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          method: reviewForm.searchMode === "customers" ? "unhappy_customers" : "businesses_needing_help",
          industry: reviewForm.industry,
          location: reviewForm.location,
          competitor_name: reviewForm.competitorName || null,
          review_site: reviewForm.reviewSite,
          max_rating: parseInt(reviewForm.maxRating),
          max_results: reviewForm.maxResults,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setB2cResults(result);
        const leadsCount = result.leads_saved || 0;
        const intelCount = result.market_intel_saved || 0;
        toast({
          title: "✅ Search Complete!",
          description: `Found ${result.total_found || leadsCount} results | ${leadsCount} leads, ${intelCount} market intel`,
        });
        refetchHistory();
        refetchStats();
      } else {
        throw new Error(result.error || "Search failed");
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle intent platform selection
  const toggleIntentPlatform = (platform: string) => {
    setIntentForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  // Helper function to get generation type label
  const getGenerationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      b2b: "🔍 Quick Search",
      quick_search: "🎁 Quick Search",
      google_places: "📍 Local Discovery",
      local_discovery: "📍 Local Discovery",
      apollo: "💼 LinkedIn Premium",
      premium: "💼 LinkedIn Premium",
      linkedin_premium: "💼 LinkedIn Premium",
      intent: "🎯 B2C Intent",
    };
    return labels[type] || type;
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
                  <CardDescription>
                    Free Google Custom Search - Find businesses by industry and location
                  </CardDescription>
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
                            <TableHead>Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((lead: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{lead.company_name || lead.company}</TableCell>
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
                                  <span className="text-muted-foreground text-xs">—</span>
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
                                <Badge variant={lead.lead_score >= 50 ? "default" : "secondary"}>
                                  {lead.lead_score || lead.score || 0}
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
            <div className="space-y-6">
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
                      <Label>Business Category *</Label>
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
                      <Label>Location / Area *</Label>
                      <Input
                        placeholder="e.g., Manhattan NYC, DIFC Dubai"
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

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Max Results</Label>
                      <span>{localForm.maxResults}</span>
                    </div>
                    <Slider
                      value={[localForm.maxResults]}
                      onValueChange={(v) => setLocalForm({ ...localForm, maxResults: v[0] })}
                      min={5}
                      max={50}
                      step={5}
                    />
                  </div>

                  <Button
                    onClick={handleLocalDiscovery}
                    disabled={isSearching || !localForm.category || !localForm.location}
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
            </div>
          )}

          {/* LinkedIn Premium */}
          {b2bSubTab === "linkedin" && (
            <div className="space-y-6">
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
                        Premium search requires API keys. Add your Apollo.io or Hunter.io key in Settings →
                        Integrations.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Premium access enabled
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select
                        value={linkedinForm.industry}
                        onValueChange={(v) => setLinkedinForm({ ...linkedinForm, industry: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry (optional)" />
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
                      <Label>Keywords (optional)</Label>
                      <Input
                        placeholder="e.g., flooring, medical spa, marketing"
                        value={linkedinForm.keywords}
                        onChange={(e) => setLinkedinForm({ ...linkedinForm, keywords: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Job Titles</Label>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location / City</Label>
                      <Input
                        placeholder="e.g., New York, Dubai, London"
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
                          <SelectItem value="United States">🇺🇸 United States</SelectItem>
                          <SelectItem value="United Arab Emirates">🇦🇪 United Arab Emirates</SelectItem>
                          <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                          <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                          <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                          <SelectItem value="Pakistan">🇵🇰 Pakistan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleLinkedInSearch}
                    disabled={
                      isSearching ||
                      !hasPremiumAccess ||
                      (!linkedinForm.keywords && !linkedinForm.industry && linkedinForm.titles.length === 0)
                    }
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
            </div>
          )}
        </TabsContent>

        {/* ==================== B2C TAB ==================== */}
        <TabsContent value="b2c">
          <div className="space-y-6">
            {/* B2C Sub-tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={b2cSubTab === "intent" ? "default" : "outline"}
                onClick={() => setB2cSubTab("intent")}
                className={cn("gap-2", b2cSubTab === "intent" && "bg-purple-600 hover:bg-purple-700")}
              >
                <Search className="h-4 w-4" /> Intent Signals
              </Button>
              <Button
                variant={b2cSubTab === "social" ? "default" : "outline"}
                onClick={() => setB2cSubTab("social")}
                className={cn("gap-2", b2cSubTab === "social" && "bg-pink-600 hover:bg-pink-700")}
              >
                <Users className="h-4 w-4" /> Social Audiences
              </Button>
              <Button
                variant={b2cSubTab === "reviews" ? "default" : "outline"}
                onClick={() => setB2cSubTab("reviews")}
                className={cn("gap-2", b2cSubTab === "reviews" && "bg-orange-600 hover:bg-orange-700")}
              >
                <Star className="h-4 w-4" /> Review Hunters
              </Button>
            </div>

            {/* Intent Signals Sub-tab - Enhanced */}
            {b2cSubTab === "intent" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-500" /> Intent Signals
                  </CardTitle>
                  <CardDescription>Find people actively searching for services in your industry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select
                        value={intentForm.industry}
                        onValueChange={(v) => setIntentForm({ ...intentForm, industry: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {B2C_INDUSTRIES.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g., Miami, Los Angeles, New York"
                        value={intentForm.location}
                        onChange={(e) => setIntentForm({ ...intentForm, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Search Keywords *</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="e.g., botox near me, best med spa, filler recommendations"
                      value={intentForm.keywords}
                      onChange={(e) => setIntentForm({ ...intentForm, keywords: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter specific terms your potential customers might search for (comma-separated)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Search Platforms</Label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: "reddit", label: "Reddit", icon: "🔴" },
                        { id: "quora", label: "Quora", icon: "🔵" },
                        { id: "twitter", label: "Twitter/X", icon: "🐦" },
                        { id: "facebook_groups", label: "Facebook Groups", icon: "👥" },
                      ].map((platform) => (
                        <div
                          key={platform.id}
                          onClick={() => toggleIntentPlatform(platform.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors",
                            intentForm.platforms.includes(platform.id)
                              ? "bg-purple-100 border-purple-500 dark:bg-purple-900/30"
                              : "border-input hover:bg-muted",
                          )}
                        >
                          <span>{platform.icon}</span>
                          <span className="text-sm">{platform.label}</span>
                          {intentForm.platforms.includes(platform.id) && <Check className="h-4 w-4 text-purple-600" />}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Select where to search for consumer intent</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Results Limit</Label>
                    <Select
                      value={String(intentForm.maxResults)}
                      onValueChange={(v) => setIntentForm({ ...intentForm, maxResults: parseInt(v) })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 results</SelectItem>
                        <SelectItem value="25">25 results</SelectItem>
                        <SelectItem value="50">50 results</SelectItem>
                        <SelectItem value="100">100 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <span className="text-lg">💡</span>
                      <span>
                        Intent Signals finds people actively discussing services like yours. Results are saved as Market
                        Intelligence for trend analysis. Leads with contact info are automatically added to your
                        pipeline.
                      </span>
                    </p>
                  </div>

                  <Button
                    onClick={handleIntentSearch}
                    disabled={isSearching || !intentForm.keywords.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="lg"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" /> 🔍 Find Intent Signals
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Social Audiences Sub-tab - Enhanced */}
            {b2cSubTab === "social" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-500" /> Social Audiences
                    <Badge variant="outline" className="ml-2 text-amber-600 border-amber-400">
                      ⭐ Enterprise Feature
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Find followers of competitors or people engaging with relevant hashtags
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform *</Label>
                    <Select
                      value={socialForm.platform}
                      onValueChange={(v) => setSocialForm({ ...socialForm, platform: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.icon} {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Discovery Method</Label>
                    <div className="flex gap-3">
                      <div
                        onClick={() => setSocialForm({ ...socialForm, searchMode: "hashtags" })}
                        className={cn(
                          "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
                          socialForm.searchMode === "hashtags"
                            ? "bg-pink-50 border-pink-500 dark:bg-pink-900/20"
                            : "border-input hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Radio
                            className={cn(
                              "h-4 w-4",
                              socialForm.searchMode === "hashtags" ? "text-pink-600" : "text-muted-foreground",
                            )}
                          />
                          <span className="font-medium">Hashtag Followers</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Find users engaging with industry hashtags</p>
                      </div>
                      <div
                        onClick={() => setSocialForm({ ...socialForm, searchMode: "competitors" })}
                        className={cn(
                          "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
                          socialForm.searchMode === "competitors"
                            ? "bg-pink-50 border-pink-500 dark:bg-pink-900/20"
                            : "border-input hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Radio
                            className={cn(
                              "h-4 w-4",
                              socialForm.searchMode === "competitors" ? "text-pink-600" : "text-muted-foreground",
                            )}
                          />
                          <span className="font-medium">Competitor Followers</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Find followers of competitor accounts</p>
                      </div>
                    </div>
                  </div>

                  {socialForm.searchMode === "hashtags" && (
                    <div className="space-y-2">
                      <Label>Hashtags (comma-separated)</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="#medspa, #botox, #skincare"
                        value={socialForm.hashtags}
                        onChange={(e) => setSocialForm({ ...socialForm, hashtags: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Enter hashtags your target audience uses</p>
                    </div>
                  )}

                  {socialForm.searchMode === "competitors" && (
                    <div className="space-y-2">
                      <Label>Competitor Accounts (comma-separated)</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="@competitor1, @competitor2"
                        value={socialForm.competitorAccounts}
                        onChange={(e) => setSocialForm({ ...socialForm, competitorAccounts: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter competitor Instagram/TikTok handles to analyze their followers
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Results Limit</Label>
                    <Select
                      value={String(socialForm.maxResults)}
                      onValueChange={(v) => setSocialForm({ ...socialForm, maxResults: parseInt(v) })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 results</SelectItem>
                        <SelectItem value="50">50 results</SelectItem>
                        <SelectItem value="100">100 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!hasApifyKey && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
                      <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Social Audiences requires Apify integration. Configure in Settings → Integrations.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleSocialSearch}
                    disabled={
                      isSearching ||
                      (socialForm.searchMode === "hashtags" && !socialForm.hashtags.trim()) ||
                      (socialForm.searchMode === "competitors" && !socialForm.competitorAccounts.trim())
                    }
                    className="w-full bg-pink-600 hover:bg-pink-700"
                    size="lg"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" /> 👥 Find Social Audiences
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Review Hunters Sub-tab - Enhanced */}
            {b2cSubTab === "reviews" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-orange-500" /> Review Hunters
                  </CardTitle>
                  <CardDescription>Find opportunities from competitor reviews and ratings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>What to Find</Label>
                    <div className="flex gap-3">
                      <div
                        onClick={() => setReviewForm({ ...reviewForm, searchMode: "businesses" })}
                        className={cn(
                          "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
                          reviewForm.searchMode === "businesses"
                            ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                            : "border-input hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Radio
                            className={cn(
                              "h-4 w-4",
                              reviewForm.searchMode === "businesses" ? "text-orange-600" : "text-muted-foreground",
                            )}
                          />
                          <span className="font-medium">Businesses Needing Help</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Find businesses with poor ratings - they may need your services!
                        </p>
                      </div>
                      <div
                        onClick={() => setReviewForm({ ...reviewForm, searchMode: "customers" })}
                        className={cn(
                          "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
                          reviewForm.searchMode === "customers"
                            ? "bg-orange-50 border-orange-500 dark:bg-orange-900/20"
                            : "border-input hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Radio
                            className={cn(
                              "h-4 w-4",
                              reviewForm.searchMode === "customers" ? "text-orange-600" : "text-muted-foreground",
                            )}
                          />
                          <span className="font-medium">Unhappy Customers</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Find people who left negative reviews (market intel)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry *</Label>
                      <Select
                        value={reviewForm.industry}
                        onValueChange={(v) => setReviewForm({ ...reviewForm, industry: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {B2C_INDUSTRIES.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <Input
                        placeholder="e.g., Dubai, UAE or New York, NY"
                        value={reviewForm.location}
                        onChange={(e) => setReviewForm({ ...reviewForm, location: e.target.value })}
                      />
                    </div>
                  </div>

                  {reviewForm.searchMode === "customers" && (
                    <div className="space-y-2">
                      <Label>Competitor Business Name</Label>
                      <Input
                        placeholder="e.g., ABC Dental Clinic, XYZ Med Spa"
                        value={reviewForm.competitorName}
                        onChange={(e) => setReviewForm({ ...reviewForm, competitorName: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter a specific competitor to find their unhappy customers
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Review Platform</Label>
                      <Select
                        value={reviewForm.reviewSite}
                        onValueChange={(v) => setReviewForm({ ...reviewForm, reviewSite: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REVIEW_SITES.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.icon} {site.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {reviewForm.searchMode === "businesses" && (
                      <div className="space-y-2">
                        <Label>Maximum Rating</Label>
                        <Select
                          value={reviewForm.maxRating}
                          onValueChange={(v) => setReviewForm({ ...reviewForm, maxRating: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">⭐⭐ 1-2 stars</SelectItem>
                            <SelectItem value="3">⭐⭐⭐ 1-3 stars</SelectItem>
                            <SelectItem value="4">⭐⭐⭐⭐ 1-4 stars</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Find businesses rated at or below this threshold
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Results Limit</Label>
                    <Select
                      value={String(reviewForm.maxResults)}
                      onValueChange={(v) => setReviewForm({ ...reviewForm, maxResults: parseInt(v) })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 results</SelectItem>
                        <SelectItem value="25">25 results</SelectItem>
                        <SelectItem value="50">50 results</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleReviewSearch}
                    disabled={isSearching || !reviewForm.location}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    size="lg"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                      </>
                    ) : reviewForm.searchMode === "customers" ? (
                      <>
                        <Search className="h-4 w-4 mr-2" /> 🔍 Find Unhappy Reviewers
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" /> 🏢 Find Businesses
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== AUTO LEAD GEN TAB - FIXED ==================== */}
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
                    <Label>Time (24-hour format)</Label>
                    <Input
                      type="time"
                      value={autoSettings.time}
                      onChange={(e) => setAutoSettings({ ...autoSettings, time: e.target.value })}
                    />
                    {autoSettings.time === "09:00" && (
                      <p className="text-xs text-amber-500">
                        ⚠️ Default time — confirm or change before saving
                      </p>
                    )}
                  </div>
                </div>

                {/* Show current timezone */}
                <p className="text-xs text-muted-foreground">
                  Schedule will use your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>

                <Button onClick={handleSaveAutoConfig} className="w-full" size="lg">
                  <Bot className="h-4 w-4 mr-2" />
                  {savedConfigs.length > 0 ? `Save as New Configuration (#${savedConfigs.length + 1})` : 'Save Configuration'}
                </Button>
              </CardContent>
            </Card>

            {/* FIXED: Saved Configurations Card */}
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
                {isLoadingConfigs ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading configurations...</p>
                  </div>
                ) : savedConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No saved configurations</p>
                    <p className="text-xs mt-1">Create a configuration to automate lead generation</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {savedConfigs.map((config: any) => (
                        <div key={config.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {INDUSTRIES.find((i) => i.id === config.industry)?.icon || "🏢"}{" "}
                                {INDUSTRIES.find((i) => i.id === config.industry)?.label || config.industry} -{" "}
                                {config.location || config.city || "Any location"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getGenerationTypeLabel(config.generation_type)}
                                {" • "}
                                {config.schedule_type === "hourly"
                                  ? "Every hour"
                                  : `${config.schedule_type || "Daily"} at ${config.schedule_time?.slice(0, 5) || "09:00"}`}
                                {config.timezone && ` (${config.timezone})`}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant={config.is_active ? "default" : "secondary"}
                                  className={config.is_active ? "bg-green-500" : ""}
                                >
                                  {config.is_active ? "✅ Active" : "⏸️ Paused"}
                                </Badge>
                                {config.total_leads_generated > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {config.total_leads_generated} leads found
                                  </span>
                                )}
                              </div>
                              {config.last_run_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last run: {formatDistanceToNow(new Date(config.last_run_at), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => {
                                   setAutoSettings({
                                     enabled: config.is_active || false,
                                     source: config.generation_type || "quick_search",
                                     industry: config.industry || "",
                                     location: config.location || config.city || "",
                                     keywords: config.keywords || "",
                                     maxLeadsPerRun: config.max_leads_per_run || config.leads_per_run || 10,
                                     frequency: config.schedule_type || "daily",
                                     time: config.schedule_time ? config.schedule_time.substring(0, 5) : "09:00",
                                     autoEnrich: config.auto_enrich ?? true,
                                     autoScore: config.auto_score ?? true,
                                     autoSequence: config.auto_sequence ?? false,
                                     sequenceId: config.sequence_id || "",
                                   });
                                   toast({
                                     title: "📝 Config loaded for editing",
                                     description: "Modify and save to create updated version",
                                   });
                                   window.scrollTo({ top: 0, behavior: 'smooth' });
                                 }}
                                 title="Edit"
                               >
                                 <Pencil className="h-4 w-4" />
                               </Button>
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => toggleConfigActive(config.id, config.is_active)}
                                 title={config.is_active ? "Pause" : "Activate"}
                               >
                                 {config.is_active ? (
                                   <Pause className="h-4 w-4 text-yellow-500" />
                                 ) : (
                                   <Play className="h-4 w-4 text-green-500" />
                                 )}
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
                  <p className="text-sm mt-2">Run a search to see history here</p>
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
