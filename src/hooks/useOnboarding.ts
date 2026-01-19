// ============================================================
// PROJECT 420: ONBOARDING SYSTEM HOOKS
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import type {
  OnboardingSession,
  BusinessProfile,
  ServiceCatalogItem,
  TargetPersona,
  AIModelConfig,
  IndustryTemplate,
  OnboardingChecklistItem,
  OnboardingStatus,
  AIAnalysisResult,
  OnboardingStepId,
} from "@/types/onboardingWizard";

// Webhook base URL
const WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://webhooks.zatesystems.com/webhook";

// ============================================
// useOnboardingSession
// Manages the onboarding session state
// ============================================
export function useOnboardingSession() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load or create session
  const loadSession = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      // Try to get existing session
      const { data, error: fetchError } = await supabase
        .from("onboarding_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (data) {
        setSession(data as OnboardingSession);
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("onboarding_sessions")
          .insert({
            tenant_id: tenantId,
            current_step: 1,
            extraction_status: "pending",
          })
          .select()
          .single();

        if (createError) throw createError;
        setSession(newSession as OnboardingSession);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error loading session",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Update session
  const updateSession = useCallback(
    async (updates: Partial<OnboardingSession>) => {
      if (!session?.id) return;

      try {
        const { data, error: updateError } = await supabase
          .from("onboarding_sessions")
          .update({
            ...updates,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id)
          .select()
          .single();

        if (updateError) throw updateError;
        setSession(data as OnboardingSession);
        return data;
      } catch (err: any) {
        toast({
          title: "Error updating session",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [session?.id, toast],
  );

  // Go to step
  const goToStep = useCallback(
    async (step: number) => {
      return updateSession({ current_step: step });
    },
    [updateSession],
  );

  // Complete step
  const completeStep = useCallback(
    async (stepId: OnboardingStepId) => {
      if (!session) return;

      const stepsCompleted = [...(session.steps_completed || [])];
      if (!stepsCompleted.includes(stepId)) {
        stepsCompleted.push(stepId);
      }

      const completionPercentage = Math.round((stepsCompleted.length / 9) * 100);

      return updateSession({
        steps_completed: stepsCompleted,
        completion_percentage: completionPercentage,
      });
    },
    [session, updateSession],
  );

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    loading,
    error,
    updateSession,
    goToStep,
    completeStep,
    refreshSession: loadSession,
  };
}

// ============================================
// useBusinessAnalysis
// Handles URL/social/document analysis
// ============================================
export function useBusinessAnalysis() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [confidence, setConfidence] = useState<number>(0);

  // Analyze URL
  const analyzeURL = useCallback(
    async (url: string) => {
      setAnalyzing(true);
      setResult(null);

      try {
        const response = await fetch(`${WEBHOOK_BASE}/onboarding/analyze-company`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: url,
            tenant_id: tenantId,
            input_type: "website",
          }),
        });

        if (!response.ok) {
          throw new Error("Analysis failed");
        }

        const data = await response.json();

        if (data.success) {
          setResult(data.data);
          setConfidence(data.confidence || data.data.confidence || 0.8);
          return data.data;
        } else {
          throw new Error(data.error || "Analysis failed");
        }
      } catch (err: any) {
        toast({
          title: "Analysis failed",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    [tenantId, toast],
  );

  // Analyze social media
  const analyzeSocial = useCallback(
    async (platform: "instagram" | "facebook" | "linkedin", url: string) => {
      setAnalyzing(true);
      setResult(null);

      try {
        const response = await fetch(`${WEBHOOK_BASE}/onboarding/analyze-social`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
            url,
            tenant_id: tenantId,
          }),
        });

        if (!response.ok) {
          throw new Error("Social analysis failed");
        }

        const data = await response.json();

        if (data.success) {
          setResult(data.data);
          setConfidence(data.confidence || 0.7);
          return data.data;
        } else {
          throw new Error(data.error || "Social analysis failed");
        }
      } catch (err: any) {
        toast({
          title: "Social analysis failed",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    [tenantId, toast],
  );

  // Analyze document
  const analyzeDocument = useCallback(
    async (file: File) => {
      setAnalyzing(true);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenant_id", tenantId || "");

        const response = await fetch(`${WEBHOOK_BASE}/onboarding/analyze-document`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Document analysis failed");
        }

        const data = await response.json();

        if (data.success) {
          setResult(data.data);
          setConfidence(data.confidence || 0.6);
          return data.data;
        } else {
          throw new Error(data.error || "Document analysis failed");
        }
      } catch (err: any) {
        toast({
          title: "Document analysis failed",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      } finally {
        setAnalyzing(false);
      }
    },
    [tenantId, toast],
  );

  return {
    analyzing,
    result,
    confidence,
    analyzeURL,
    analyzeSocial,
    analyzeDocument,
    clearResult: () => setResult(null),
  };
}

// ============================================
// useBusinessProfile
// Manages business profile CRUD
// ============================================
export function useBusinessProfile() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load profile
  const loadProfile = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.from("business_profiles").select("*").eq("tenant_id", tenantId).single();

      if (error && error.code !== "PGRST116") throw error;
      setProfile(data as BusinessProfile | null);
    } catch (err: any) {
      toast({
        title: "Error loading profile",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Save profile
  const saveProfile = useCallback(
    async (profileData: Partial<BusinessProfile>) => {
      if (!tenantId) return;

      setSaving(true);

      try {
        const { data, error } = await supabase
          .from("business_profiles")
          .upsert({
            tenant_id: tenantId,
            ...profileData,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setProfile(data as BusinessProfile);

        toast({
          title: "Profile saved",
          description: "Your business profile has been updated.",
        });

        return data;
      } catch (err: any) {
        toast({
          title: "Error saving profile",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [tenantId, toast],
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    saving,
    saveProfile,
    refreshProfile: loadProfile,
  };
}

// ============================================
// useServicesCatalog
// Manages services/products catalog
// ============================================
export function useServicesCatalog() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load services
  const loadServices = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("services_catalog")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setServices(data as ServiceCatalogItem[]);
    } catch (err: any) {
      toast({
        title: "Error loading services",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Add service
  const addService = useCallback(
    async (service: Partial<ServiceCatalogItem>) => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("services_catalog")
          .insert({
            tenant_id: tenantId,
            ...service,
          })
          .select()
          .single();

        if (error) throw error;
        setServices((prev) => [...prev, data as ServiceCatalogItem]);

        toast({
          title: "Service added",
          description: `${service.name} has been added.`,
        });

        return data;
      } catch (err: any) {
        toast({
          title: "Error adding service",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [tenantId, toast],
  );

  // Update service
  const updateService = useCallback(
    async (id: string, updates: Partial<ServiceCatalogItem>) => {
      try {
        const { data, error } = await supabase.from("services_catalog").update(updates).eq("id", id).select().single();

        if (error) throw error;
        setServices((prev) => prev.map((s) => (s.id === id ? (data as ServiceCatalogItem) : s)));

        return data;
      } catch (err: any) {
        toast({
          title: "Error updating service",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  // Delete service
  const deleteService = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from("services_catalog").delete().eq("id", id);

        if (error) throw error;
        setServices((prev) => prev.filter((s) => s.id !== id));

        toast({
          title: "Service deleted",
        });
      } catch (err: any) {
        toast({
          title: "Error deleting service",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  // Bulk add services
  const bulkAddServices = useCallback(
    async (servicesList: Partial<ServiceCatalogItem>[]) => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("services_catalog")
          .insert(
            servicesList.map((s, i) => ({
              tenant_id: tenantId,
              display_order: i,
              ...s,
            })),
          )
          .select();

        if (error) throw error;
        setServices((prev) => [...prev, ...(data as ServiceCatalogItem[])]);

        toast({
          title: "Services added",
          description: `${data.length} services have been added.`,
        });

        return data;
      } catch (err: any) {
        toast({
          title: "Error adding services",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [tenantId, toast],
  );

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return {
    services,
    loading,
    addService,
    updateService,
    deleteService,
    bulkAddServices,
    refreshServices: loadServices,
  };
}

// ============================================
// useTargetPersonas
// Manages target customer personas
// ============================================
export function useTargetPersonas() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [personas, setPersonas] = useState<TargetPersona[]>([]);
  const [loading, setLoading] = useState(true);

  // Load personas
  const loadPersonas = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("target_personas")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setPersonas(data as TargetPersona[]);
    } catch (err: any) {
      toast({
        title: "Error loading personas",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Add persona
  const addPersona = useCallback(
    async (persona: Partial<TargetPersona>) => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("target_personas")
          .insert({
            tenant_id: tenantId,
            ...persona,
          })
          .select()
          .single();

        if (error) throw error;
        setPersonas((prev) => [...prev, data as TargetPersona]);

        toast({
          title: "Persona added",
          description: `${persona.name} has been created.`,
        });

        return data;
      } catch (err: any) {
        toast({
          title: "Error adding persona",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [tenantId, toast],
  );

  // Update persona
  const updatePersona = useCallback(
    async (id: string, updates: Partial<TargetPersona>) => {
      try {
        const { data, error } = await supabase.from("target_personas").update(updates).eq("id", id).select().single();

        if (error) throw error;
        setPersonas((prev) => prev.map((p) => (p.id === id ? (data as TargetPersona) : p)));

        return data;
      } catch (err: any) {
        toast({
          title: "Error updating persona",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  // Delete persona
  const deletePersona = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from("target_personas").delete().eq("id", id);

        if (error) throw error;
        setPersonas((prev) => prev.filter((p) => p.id !== id));

        toast({
          title: "Persona deleted",
        });
      } catch (err: any) {
        toast({
          title: "Error deleting persona",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  // Set primary persona
  const setPrimaryPersona = useCallback(
    async (id: string) => {
      if (!tenantId) return;

      try {
        // First, unset all primary
        await supabase.from("target_personas").update({ is_primary: false }).eq("tenant_id", tenantId);

        // Then set the new primary
        const { data, error } = await supabase
          .from("target_personas")
          .update({ is_primary: true })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        setPersonas((prev) =>
          prev.map((p) => ({
            ...p,
            is_primary: p.id === id,
          })),
        );

        toast({
          title: "Primary persona updated",
        });

        return data;
      } catch (err: any) {
        toast({
          title: "Error setting primary persona",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [tenantId, toast],
  );

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  return {
    personas,
    loading,
    addPersona,
    updatePersona,
    deletePersona,
    setPrimaryPersona,
    refreshPersonas: loadPersonas,
  };
}

// ============================================
// useIndustryTemplates
// Fetches industry templates
// ============================================
export function useIndustryTemplates() {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data, error } = await supabase
          .from("industry_templates")
          .select("*")
          .eq("is_active", true)
          .order("industry_name");

        if (error) throw error;
        setTemplates(data as IndustryTemplate[]);
      } catch (err) {
        console.error("Error loading industry templates:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const getTemplate = useCallback(
    (industryCode: string) => {
      return (
        templates.find((t) => t.industry_code === industryCode) || templates.find((t) => t.industry_code === "general")
      );
    },
    [templates],
  );

  return {
    templates,
    loading,
    getTemplate,
  };
}

// ============================================
// useOnboardingChecklist
// Manages onboarding checklist
// ============================================
export function useOnboardingChecklist() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [items, setItems] = useState<OnboardingChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load checklist
  const loadChecklist = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("onboarding_checklists")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("display_order");

      if (error) throw error;
      setItems(data as OnboardingChecklistItem[]);
    } catch (err: any) {
      toast({
        title: "Error loading checklist",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  // Complete item
  const completeItem = useCallback(
    async (itemCode: string, completionData?: Record<string, any>) => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("onboarding_checklists")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            completion_data: completionData,
          })
          .eq("tenant_id", tenantId)
          .eq("item_code", itemCode)
          .select()
          .single();

        if (error) throw error;
        setItems((prev) => prev.map((i) => (i.item_code === itemCode ? (data as OnboardingChecklistItem) : i)));

        return data;
      } catch (err: any) {
        toast({
          title: "Error completing item",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [tenantId, toast],
  );

  // Skip item
  const skipItem = useCallback(
    async (itemCode: string) => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("onboarding_checklists")
          .update({ is_skipped: true })
          .eq("tenant_id", tenantId)
          .eq("item_code", itemCode)
          .select()
          .single();

        if (error) throw error;
        setItems((prev) => prev.map((i) => (i.item_code === itemCode ? (data as OnboardingChecklistItem) : i)));

        return data;
      } catch (err: any) {
        toast({
          title: "Error skipping item",
          description: err.message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [tenantId, toast],
  );

  // Get progress
  const getProgress = useCallback(() => {
    const total = items.length;
    const completed = items.filter((i) => i.is_completed || i.is_skipped).length;
    const required = items.filter((i) => i.is_required).length;
    const requiredCompleted = items.filter((i) => i.is_required && (i.is_completed || i.is_skipped)).length;

    return {
      total,
      completed,
      required,
      requiredCompleted,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      requiredPercentage: required > 0 ? Math.round((requiredCompleted / required) * 100) : 0,
    };
  }, [items]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  return {
    items,
    loading,
    completeItem,
    skipItem,
    getProgress,
    refreshChecklist: loadChecklist,
  };
}

// ============================================
// useAITraining
// Handles AI agent training
// ============================================
export function useAITraining() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [training, setTraining] = useState(false);
  const [trainedModules, setTrainedModules] = useState<string[]>([]);

  // Train all agents
  const trainAllAgents = useCallback(async () => {
    if (!tenantId) return;

    setTraining(true);

    try {
      const response = await fetch(`${WEBHOOK_BASE}/onboarding/train-agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          modules: ["sales", "marketing", "communication", "voice", "hr", "operations"],
        }),
      });

      if (!response.ok) {
        throw new Error("Training failed");
      }

      const data = await response.json();

      if (data.success) {
        setTrainedModules(data.trained_modules || []);
        toast({
          title: "AI Training Complete",
          description: `${data.trained_modules?.length || 0} AI agents have been trained.`,
        });
        return data;
      } else {
        throw new Error(data.error || "Training failed");
      }
    } catch (err: any) {
      toast({
        title: "Training failed",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setTraining(false);
    }
  }, [tenantId, toast]);

  // Compile knowledge context
  const compileKnowledge = useCallback(async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase.rpc("compile_ai_knowledge_context", {
        p_tenant_id: tenantId,
      });

      if (error) throw error;

      toast({
        title: "Knowledge compiled",
        description: "AI knowledge context has been updated.",
      });

      return data;
    } catch (err: any) {
      toast({
        title: "Error compiling knowledge",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    }
  }, [tenantId, toast]);

  return {
    training,
    trainedModules,
    trainAllAgents,
    compileKnowledge,
  };
}

// ============================================
// useOnboardingStatus
// Gets complete onboarding status
// ============================================
export function useOnboardingStatus() {
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("get_tenant_onboarding_status", {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      setStatus(data as OnboardingStatus);
    } catch (err) {
      console.error("Error loading onboarding status:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    status,
    loading,
    refreshStatus: loadStatus,
  };
}

// ============================================
// EXPORT ALL HOOKS
// ============================================
export {
  useOnboardingSession,
  useBusinessAnalysis,
  useBusinessProfile,
  useServicesCatalog,
  useTargetPersonas,
  useIndustryTemplates,
  useOnboardingChecklist,
  useAITraining,
  useOnboardingStatus,
};
