import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  Loader2,
  Bot,
  MessageCircle,
  Instagram,
  Facebook,
  Linkedin,
  FileText,
  Rocket,
  Clock,
  Palette,
  Mic,
  Code,
  CreditCard,
  Crown,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { callWebhook, WEBHOOKS } from "@/lib/api/webhooks";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase"; // ← ADD THIS IMPORT

// ============================================
// CONSTANTS
// ============================================
const INDUSTRIES = [
  { value: "healthcare", label: "Healthcare", icon: "🏥" },
  { value: "real_estate", label: "Real Estate", icon: "🏠" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "salon", label: "Salon & Spa", icon: "💇" },
  { value: "retail", label: "Retail", icon: "🛍️" },
  { value: "automotive", label: "Automotive", icon: "🚗" },
  { value: "legal", label: "Legal Services", icon: "⚖️" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "finance", label: "Finance", icon: "💰" },
  { value: "technology", label: "Technology", icon: "💻" },
  { value: "general", label: "Other / General", icon: "🏢" },
];

const AI_PERSONALITIES = [
  { value: "professional", label: "Professional", description: "Formal and business-like" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "casual", label: "Casual", description: "Relaxed and conversational" },
];

const AI_NAME_SUGGESTIONS: Record<string, string[]> = {
  healthcare: ["Dr. Luna", "Max Health", "Cara"],
  real_estate: ["Alex", "Sam", "Jordan"],
  restaurant: ["Chef Zoe", "Marco", "Bella"],
  salon: ["Luna", "Ava", "Sophia"],
  technology: ["Alex", "Nova", "Zate"],
  general: ["Zate", "Luna", "Max"],
};

const TIMEZONES = [
  { value: "Africa/Johannesburg", label: "South Africa (SAST)" },
  { value: "Africa/Cairo", label: "Egypt (EET)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
];

const STEPS = [
  { id: 1, title: "Let's Get Started", description: "Enter your business info" },
  { id: 2, title: "AI Analysis Results", description: "Review extracted data" },
  { id: 3, title: "Configure AI Assistant", description: "Set up your AI" },
  { id: 4, title: "Connect Channels", description: "Enable communication" },
  { id: 5, title: "Knowledge Base", description: "Train your AI" },
  { id: 6, title: "Choose Plan", description: "Select subscription" },
  { id: 7, title: "You're All Set!", description: "Start using the app" },
];

// ============================================
// INTERFACES
// ============================================
interface CompanyData {
  company_name: string;
  industry: string;
  services: string[];
  description: string;
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  social_links: {
    website?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  logo_url: string;
  suggested_ai_name: string;
  suggested_greeting: string;
}

interface APIAnalysisResponse {
  success: boolean;
  message: string;
  data: {
    company_name?: string;
    industry?: string;
    description?: string;
    services?: Array<{ name: string } | string>;
    contact?: {
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
    };
    social_links?: {
      linkedin?: string;
      instagram?: string;
      facebook?: string;
    };
    ai_config?: {
      suggested_ai_name?: string;
      suggested_ai_role?: string;
      suggested_greeting?: string;
      suggested_personality?: string;
    };
    logo_url?: string;
    confidence?: number;
    tenant_id?: string;
  };
}

interface AIConfig {
  name: string;
  role: string;
  greeting: string;
  personality: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  timezone: string;
}

interface ChannelConfig {
  whatsapp: boolean;
  voiceAI: boolean;
  email: boolean;
  instagram: boolean;
  facebook: boolean;
  webChat: boolean;
}

// ============================================
// DEFAULT VALUES
// ============================================
const DEFAULT_COMPANY_DATA: CompanyData = {
  company_name: "",
  industry: "general",
  services: [],
  description: "",
  contact: { phone: "", email: "", address: "" },
  social_links: {},
  logo_url: "",
  suggested_ai_name: "Zate",
  suggested_greeting: "Hello! I'm your AI assistant. How can I help you today?",
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function transformAPIResponse(apiData: APIAnalysisResponse["data"]): Partial<CompanyData> {
  if (!apiData) return {};

  let services: string[] = [];
  if (Array.isArray(apiData.services)) {
    services = apiData.services
      .map((s) => {
        if (typeof s === "string") return s;
        if (typeof s === "object" && s.name) return s.name;
        return "";
      })
      .filter(Boolean);
  }

  const aiConfig = apiData.ai_config || {};

  return {
    company_name: apiData.company_name || "",
    industry: apiData.industry || "general",
    description: apiData.description || "",
    services,
    contact: {
      phone: apiData.contact?.phone || "",
      email: apiData.contact?.email || "",
      address: apiData.contact?.address || "",
    },
    social_links: {
      website: apiData.contact?.website || "",
      linkedin: apiData.social_links?.linkedin || "",
      instagram: apiData.social_links?.instagram || "",
      facebook: apiData.social_links?.facebook || "",
    },
    logo_url: apiData.logo_url || "",
    suggested_ai_name: aiConfig.suggested_ai_name || "Zate",
    suggested_greeting: aiConfig.suggested_greeting || "Hello! I'm your AI assistant. How can I help you today?",
  };
}

function safelyMergeCompanyData(existing: CompanyData, incoming: Partial<CompanyData> | null | undefined): CompanyData {
  if (!incoming) return existing;

  return {
    company_name: incoming.company_name || existing.company_name,
    industry: incoming.industry || existing.industry,
    services: incoming.services && incoming.services.length > 0 ? incoming.services : existing.services,
    description: incoming.description || existing.description,
    contact: {
      phone: incoming.contact?.phone ?? existing.contact?.phone ?? "",
      email: incoming.contact?.email ?? existing.contact?.email ?? "",
      address: incoming.contact?.address ?? existing.contact?.address ?? "",
    },
    social_links: {
      ...existing.social_links,
      ...(incoming.social_links || {}),
    },
    logo_url: incoming.logo_url ?? existing.logo_url,
    suggested_ai_name: incoming.suggested_ai_name || existing.suggested_ai_name,
    suggested_greeting: incoming.suggested_greeting || existing.suggested_greeting,
  };
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CompanySetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId, setTenantId, refreshConfig } = useTenant();

  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Company Data
  const [companyData, setCompanyData] = useState<CompanyData>({ ...DEFAULT_COMPANY_DATA });

  // AI Configuration
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    name: "Zate",
    role: "AI Receptionist",
    greeting: "Hello! I'm your AI assistant. How can I help you today?",
    personality: "friendly",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    timezone: "Asia/Dubai",
  });

  // Channel Configuration
  const [channels, setChannels] = useState<ChannelConfig>({
    whatsapp: false,
    voiceAI: false,
    email: true,
    instagram: false,
    facebook: false,
    webChat: true,
  });

  // Knowledge Base
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [knowledgeText, setKnowledgeText] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  // Selected Plan
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "enterprise">("free");

  const progressPercent = (currentStep / STEPS.length) * 100;

  // ============================================
  // API CALLS
  // ============================================

  // Step 1-2: Analyze Company
  const handleAnalyze = async () => {
    if (!inputUrl.trim()) {
      toast({ title: "Please enter a URL or email", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await callWebhook<APIAnalysisResponse>(
        WEBHOOKS.AI_COMPANY_ANALYZE,
        { url: inputUrl },
        tenantId || "onboarding",
      );

      console.log("=== API Response ===", response);

      if (response.success && response.data) {
        let analysisData: APIAnalysisResponse["data"];

        if ("data" in response.data && typeof response.data.data === "object") {
          analysisData = (response.data as unknown as APIAnalysisResponse).data;
        } else {
          analysisData = response.data as unknown as APIAnalysisResponse["data"];
        }

        const transformedData = transformAPIResponse(analysisData);
        setCompanyData((prev) => safelyMergeCompanyData(prev, transformedData));

        const apiAiConfig = analysisData.ai_config;
        if (apiAiConfig) {
          setAIConfig((prev) => ({
            ...prev,
            name: apiAiConfig.suggested_ai_name || prev.name,
            role: apiAiConfig.suggested_ai_role || prev.role,
            greeting: apiAiConfig.suggested_greeting || prev.greeting,
            personality: apiAiConfig.suggested_personality || prev.personality,
          }));
        }

        setCurrentStep(2);
        toast({
          title: "Analysis complete!",
          description: `Extracted information for ${transformedData.company_name || "your company"}.`,
        });
      } else {
        // Fallback for demo
        setCurrentStep(2);
        toast({ title: "Demo mode", description: "Enter your details manually." });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "Please try again or enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper: Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Step 5: Train AI Knowledge
  const handleTrainAI = async () => {
    setIsTraining(true);

    try {
      // Step 1: Process each uploaded file through OBD workflow
      const processedFiles: Array<{ filename: string; success: boolean }> = [];

      for (const file of uploadedFiles) {
        try {
          console.log(`Processing file: ${file.name}`);
          
          // Convert file to base64
          const base64Content = await fileToBase64(file);
          
          // Call the OBD (analyze-document) webhook
          const docResponse = await callWebhook(
            WEBHOOKS.ANALYZE_DOCUMENT || "/onboarding/analyze-document",
            {
              tenant_id: tenantId,
              filename: file.name,
              content: base64Content,
              content_type: file.type || "application/octet-stream",
            },
            tenantId || "onboarding",
          );

          console.log(`Document analysis response for ${file.name}:`, docResponse);
          processedFiles.push({ filename: file.name, success: docResponse.success });
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          processedFiles.push({ filename: file.name, success: false });
        }
      }

      console.log("All files processed:", processedFiles);

      // Step 2: Call the training webhook with processed files and text
      const response = await callWebhook(
        WEBHOOKS.TRAIN_AI_KNOWLEDGE || "/onboarding/train-agents",
        {
          tenant_id: tenantId,
          files: processedFiles.map((f) => f.filename),
          files_processed: processedFiles,
          text: knowledgeText,
          modules: ["sales", "marketing", "communication", "voice", "hr"],
        },
        tenantId || "onboarding",
      );

      console.log("Training response:", response);
      
      const successCount = processedFiles.filter((f) => f.success).length;
      toast({
        title: "Training complete!",
        description: `Your AI processed ${successCount}/${uploadedFiles.length} files and is now smarter.`,
      });
      setCurrentStep(6);
    } catch (error) {
      console.error("Training error:", error);
      // Still proceed - training can happen in background
      toast({ title: "Training initiated", description: "Your AI will learn from this data." });
      setCurrentStep(6);
    } finally {
      setIsTraining(false);
    }
  };

  // ============================================
  // STEP 7: COMPLETE ONBOARDING - FIXED VERSION
  // ============================================
  const handleComplete = async () => {
    setIsSaving(true);

    try {
      // Build comprehensive payload with ALL onboarding data
      const completePayload = {
        tenant_id: tenantId,

        // Company data from Step 2
        company: {
          name: companyData.company_name,
          industry: companyData.industry,
          description: companyData.description,
          services: companyData.services,
          contact: companyData.contact,
          social_links: companyData.social_links,
          logo_url: companyData.logo_url,
        },

        // AI Configuration from Step 3
        ai_config: {
          ai_name: aiConfig.name,
          ai_role: aiConfig.role,
          ai_greeting: aiConfig.greeting,
          ai_personality: aiConfig.personality,
          ai_tone: aiConfig.personality,
          timezone: aiConfig.timezone,
          opening_time: aiConfig.workingHoursStart,
          closing_time: aiConfig.workingHoursEnd,
        },

        // Channel Configuration from Step 4
        channels: {
          // NOTE: has_email is NOT set here — only when SMTP creds are configured
          has_whatsapp: channels.whatsapp,
          has_voice: channels.voiceAI,
          has_instagram: channels.instagram,
          has_facebook: channels.facebook,
          has_webchat: channels.webChat,
        },

        // Subscription from Step 6
        subscription: {
          plan: selectedPlan,
          status: "active",
        },

        // Completion metadata
        automation_mode: "full",
        enable_voice: channels.voiceAI,
      };

      console.log("=== Completing Onboarding ===", completePayload);

      // Step 1: Try webhook (optional - may fail)
      try {
        const response = await callWebhook(
          WEBHOOKS.ONBOARDING_COMPLETE || "onboarding/complete",
          completePayload,
          tenantId || "onboarding",
        );
        console.log("Webhook completion response:", response);
      } catch (webhookError) {
        console.warn("Webhook failed (non-critical):", webhookError);
        // Continue - we'll update directly
      }

      // =============================================
      // CRITICAL FIX: Direct Supabase update
      // This ensures onboarding_completed is ALWAYS set
      // even if the webhook fails
      // =============================================
      console.log("=== Direct DB Update for tenant:", tenantId, "===");

      const { error: updateError } = await supabase
        .from("tenant_config")
        .update({
          // Mark onboarding as complete
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),

          // Save company data
          company_name: companyData.company_name || undefined,
          industry: companyData.industry || undefined,

          // Save AI config
          ai_name: aiConfig.name || undefined,
          ai_role: aiConfig.role || undefined,
          greeting_message: aiConfig.greeting || undefined,
          ai_personality: aiConfig.personality || undefined,
          timezone: aiConfig.timezone || undefined,
          opening_time: aiConfig.workingHoursStart || undefined,
          closing_time: aiConfig.workingHoursEnd || undefined,

          // Save channel preferences
          // NOTE: has_email is NOT set here — only when SMTP creds are configured
          has_whatsapp: channels.whatsapp,
          has_voice: channels.voiceAI,
          has_instagram: channels.instagram,
          has_facebook: channels.facebook,

          // Save plan
          subscription_plan: selectedPlan,
          subscription_tier: selectedPlan,

          // Update timestamp
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId);

      if (updateError) {
        console.error("Direct DB update error:", updateError);
        // Try one more time with just the critical field
        const { error: retryError } = await supabase
          .from("tenant_config")
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId);

        if (retryError) {
          console.error("Retry also failed:", retryError);
        }
      } else {
        console.log("✅ Direct DB update successful - onboarding_completed = true");
      }

      // Step 3: Refresh tenant config and WAIT for it
      console.log("=== Refreshing tenant config ===");
      await refreshConfig();

      // Step 4: Small delay to ensure React state propagates
      await new Promise((resolve) => setTimeout(resolve, 200));

      toast({
        title: "Setup complete!",
        description: "Welcome to Zateceptionist!",
      });

      // Step 5: Navigate to dashboard
      console.log("=== Navigating to dashboard ===");
      navigate("/dashboard");
    } catch (error) {
      console.error("Completion error:", error);

      // =============================================
      // FALLBACK: Even on error, try to mark complete
      // =============================================
      try {
        console.log("=== Attempting fallback update ===");
        await supabase
          .from("tenant_config")
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId);

        await refreshConfig();
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (fallbackError) {
        console.error("Fallback update failed:", fallbackError);
      }

      toast({
        title: "Welcome!",
        description: "Your setup is mostly complete. Some settings may need manual configuration.",
      });

      navigate("/dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const updateContactField = (field: keyof CompanyData["contact"], value: string) => {
    setCompanyData((prev) => ({
      ...prev,
      contact: { ...prev.contact, [field]: value },
    }));
  };

  const addService = () => {
    const serviceName = prompt("Enter service name:");
    if (serviceName?.trim()) {
      setCompanyData((prev) => ({
        ...prev,
        services: [...prev.services, serviceName.trim()],
      }));
    }
  };

  const removeService = (index: number) => {
    setCompanyData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  // ============================================
  // RENDER STEPS
  // ============================================
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Welcome! Let's set up your business</h2>
              <p className="text-muted-foreground">
                Enter your website URL and our AI will extract your business information.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      placeholder="https://yourbusiness.com"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsManualEntry(true);
                    setCurrentStep(2);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Enter Manually
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">
                {isManualEntry ? "Enter Your Company Details" : "AI Analysis Complete"}
              </h2>
              <p className="text-muted-foreground">Review and edit the information below</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {companyData.logo_url && <AvatarImage src={companyData.logo_url} />}
                      <AvatarFallback className="text-xl bg-primary/10 text-primary">
                        {companyData.company_name?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">
                      Change Logo
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={companyData.company_name}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={companyData.industry}
                      onValueChange={(v) => setCompanyData((prev) => ({ ...prev, industry: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind.value} value={ind.value}>
                            {ind.icon} {ind.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={companyData.description}
                      onChange={(e) => setCompanyData((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="Brief description"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={companyData?.contact?.phone ?? ""}
                        onChange={(e) => updateContactField("phone", e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={companyData?.contact?.email ?? ""}
                        onChange={(e) => updateContactField("email", e.target.value)}
                        placeholder="Enter email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea
                      value={companyData?.contact?.address ?? ""}
                      onChange={(e) => updateContactField("address", e.target.value)}
                      rows={2}
                      placeholder="Enter address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Services/Products</Label>
                    <div className="flex flex-wrap gap-2">
                      {(companyData.services || []).map((service, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeService(i)}
                          title="Click to remove"
                        >
                          {service} ×
                        </Badge>
                      ))}
                      <Button variant="outline" size="sm" className="h-6" onClick={addService}>
                        + Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Configure Your AI Assistant</h2>
              <p className="text-muted-foreground">Personalize how your AI interacts with customers</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5" /> AI Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>AI Name</Label>
                    <Input
                      value={aiConfig.name}
                      onChange={(e) => setAIConfig((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Luna, Max, Zate"
                    />
                    <div className="flex gap-2 mt-2">
                      {(AI_NAME_SUGGESTIONS[companyData.industry] || AI_NAME_SUGGESTIONS.general).map((name) => (
                        <Button
                          key={name}
                          variant="outline"
                          size="sm"
                          onClick={() => setAIConfig((prev) => ({ ...prev, name }))}
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>AI Role</Label>
                    <Select value={aiConfig.role} onValueChange={(v) => setAIConfig((prev) => ({ ...prev, role: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AI Receptionist">AI Receptionist</SelectItem>
                        <SelectItem value="Sales Assistant">Sales Assistant</SelectItem>
                        <SelectItem value="Customer Support">Customer Support</SelectItem>
                        <SelectItem value="Booking Agent">Booking Agent</SelectItem>
                        <SelectItem value="Customer Service Representative">Customer Service Representative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Personality</Label>
                    <div className="grid gap-2">
                      {AI_PERSONALITIES.map((p) => (
                        <div
                          key={p.value}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            aiConfig.personality === p.value
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/50"
                          }`}
                          onClick={() => setAIConfig((prev) => ({ ...prev, personality: p.value }))}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{p.label}</span>
                            {aiConfig.personality === p.value && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Working Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Greeting Message</Label>
                    <Textarea
                      value={aiConfig.greeting}
                      onChange={(e) => setAIConfig((prev) => ({ ...prev, greeting: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={aiConfig.workingHoursStart}
                        onChange={(e) => setAIConfig((prev) => ({ ...prev, workingHoursStart: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={aiConfig.workingHoursEnd}
                        onChange={(e) => setAIConfig((prev) => ({ ...prev, workingHoursEnd: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={aiConfig.timezone}
                      onValueChange={(v) => setAIConfig((prev) => ({ ...prev, timezone: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-2">Preview</p>
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {aiConfig.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-card rounded-lg p-3 text-sm">{aiConfig.greeting}</div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Connect Your Channels</h2>
              <p className="text-muted-foreground">Enable the channels you want your AI to handle</p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Channel integrations can be configured in Settings → Integrations after setup. Toggle ON the channels
                you plan to use.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  key: "whatsapp",
                  label: "WhatsApp Business",
                  icon: MessageCircle,
                  color: "text-green-500",
                  description: "Connect in Settings → Integrations",
                },
                {
                  key: "voiceAI",
                  label: "Voice AI",
                  icon: Phone,
                  color: "text-blue-500",
                  description: "VAPI-powered phone calls",
                },
                { key: "email", label: "Email", icon: Mail, color: "text-purple-500", description: "SMTP integration" },
                {
                  key: "instagram",
                  label: "Instagram",
                  icon: Instagram,
                  color: "text-pink-500",
                  description: "Meta Business integration",
                },
                {
                  key: "facebook",
                  label: "Facebook",
                  icon: Facebook,
                  color: "text-blue-600",
                  description: "Messenger integration",
                },
                {
                  key: "webChat",
                  label: "Website Chat",
                  icon: Globe,
                  color: "text-orange-500",
                  description: "Embed widget on your site",
                },
              ].map((channel) => (
                <Card
                  key={channel.key}
                  className={`cursor-pointer transition-all ${
                    channels[channel.key as keyof ChannelConfig] ? "border-primary ring-1 ring-primary" : ""
                  }`}
                  onClick={() =>
                    setChannels((prev) => ({
                      ...prev,
                      [channel.key]: !prev[channel.key as keyof ChannelConfig],
                    }))
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${channel.color}`}
                        >
                          <channel.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{channel.label}</p>
                          <p className="text-xs text-muted-foreground">{channel.description}</p>
                        </div>
                      </div>
                      <Switch checked={channels[channel.key as keyof ChannelConfig]} onCheckedChange={() => {}} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Upload Knowledge Base</h2>
              <p className="text-muted-foreground">Train your AI with your business documents</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload Documents</CardTitle>
                  <CardDescription>PDF, DOCX, TXT files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.csv"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileUpload}
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium">Drop files here or click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">Max 10MB per file</p>
                    </Label>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm truncate">{file.name}</span>
                          </div>
                          <Badge variant="secondary">{(file.size / 1024).toFixed(0)} KB</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Or Paste Text</CardTitle>
                  <CardDescription>FAQs, product info, policies</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your business information..."
                    rows={10}
                    value={knowledgeText}
                    onChange={(e) => setKnowledgeText(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={nextStep}>
                  Skip for now
                </Button>
                <Button
                  onClick={handleTrainAI}
                  disabled={isTraining || (uploadedFiles.length === 0 && !knowledgeText.trim())}
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Training...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> Train AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Choose Your Plan</h2>
              <p className="text-muted-foreground">Start free and upgrade anytime</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  id: "free",
                  name: "Free",
                  price: "$0",
                  period: "forever",
                  features: ["100 messages/month", "1 channel", "Basic AI", "Email support"],
                  icon: Sparkles,
                },
                {
                  id: "pro",
                  name: "Professional",
                  price: "$49",
                  period: "/month",
                  features: ["Unlimited messages", "All channels", "Advanced AI", "Priority support", "Analytics"],
                  icon: Rocket,
                  popular: true,
                },
                {
                  id: "enterprise",
                  name: "Enterprise",
                  price: "Custom",
                  period: "",
                  features: [
                    "Everything in Pro",
                    "Dedicated support",
                    "Custom integrations",
                    "SLA guarantee",
                    "API access",
                  ],
                  icon: Crown,
                },
              ].map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all relative ${
                    selectedPlan === plan.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPlan(plan.id as any)}
                >
                  {plan.popular && <Badge className="absolute -top-2 right-4">Most Popular</Badge>}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <plan.icon className="h-5 w-5 text-primary" />
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              All plans include a 14-day free trial of Pro features
            </p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            key="step7"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6 text-center"
          >
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-green-500" />
            </div>

            <h2 className="text-3xl font-bold">You're All Set! 🎉</h2>
            <p className="text-muted-foreground text-lg">Your AI assistant is ready to help your customers</p>

            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {aiConfig.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{aiConfig.name}</p>
                    <p className="text-sm text-muted-foreground">{aiConfig.role}</p>
                  </div>
                </div>

                <div className="text-left space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{companyData.company_name || "Your Company"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span>{aiConfig.personality} personality</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {aiConfig.workingHoursStart} - {aiConfig.workingHoursEnd}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(channels)
                    .filter(([_, enabled]) => enabled)
                    .map(([channel]) => (
                      <Badge key={channel} variant="secondary">
                        {channel.replace(/([A-Z])/g, " $1").trim()}
                      </Badge>
                    ))}
                </div>

                <Badge variant="outline" className="mt-2">
                  {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
                </Badge>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button size="lg" onClick={handleComplete} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" /> Go to Dashboard
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Review
              </Button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">Zateceptionist</p>
                <p className="text-sm text-muted-foreground">Setup Wizard</p>
              </div>
            </div>
            <Badge variant="outline">
              Step {currentStep} of {STEPS.length}
            </Badge>
          </div>

          <Progress value={progressPercent} className="h-2" />

          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`text-xs hidden md:block ${
                  step.id === currentStep
                    ? "text-primary font-medium"
                    : step.id < currentStep
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>
    </div>
  );
}
