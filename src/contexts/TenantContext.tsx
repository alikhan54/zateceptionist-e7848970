import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export type IndustryType = "healthcare" | "healthcare_clinic" | "healthcare_staffing" | "real_estate" | "restaurant" | "salon" | "banking_collections" | "construction_estimation" | "technology" | "legal" | "fitness" | "education" | "automotive" | "professional" | "retail" | "general";

export interface TenantConfig {
  id: string;
  tenant_id: string;
  company_name: string | null;
  industry: IndustryType;
  logo_url: string | null;
  primary_color: string | null;
  ai_name: string | null;
  ai_role: string | null;
  timezone: string | null;
  currency: string | null;
  working_days: string[] | null;
  opening_time: string | null;
  closing_time: string | null;
  vocabulary: Record<string, string> | null;
  has_whatsapp: boolean;
  has_email: boolean;
  has_voice: boolean;
  has_instagram: boolean;
  has_facebook: boolean;
  has_linkedin: boolean;
  features: Record<string, boolean> | null;
  subscription_status: string | null;
  subscription_plan?: string | null;
  ai_mode?: "autonomous" | "assisted" | "manual" | null;
  ai_modules_enabled?: Record<string, boolean> | null;
  subscription_tier?: "free" | "starter" | "professional" | "enterprise" | null;
  leads_per_month?: number | null;
  b2b_searches_per_day?: number | null;
  intent_searches_per_day?: number | null;
  apollo_api_key?: string | null;
  hunter_api_key?: string | null;
  apify_api_key?: string | null;
  google_api_key?: string | null;
  google_cx_id?: string | null;
  onboarding_completed?: boolean | null;
  outreach_settings?: Record<string, unknown> | null;
  email_provider?: string | null;
  email_credential_id?: string | null;
  email_verified?: boolean | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_from_email?: string | null;
  smtp_from_name?: string | null;
  automation_mode?: string | null;
  voice_forward_number?: string | null;
  voice_mode?: string | null;
  voice_inbound_mode?: string | null;
  voice_language?: string | null;
  voice_language_name?: string | null;
  voice_voice_name?: string | null;
  voice_id?: string | null;
  byo_vapi_api_key?: string | null;
  byo_vapi_assistant_id?: string | null;
  byo_vapi_phone_number_id?: string | null;
  vapi_api_key?: string | null;
  vapi_assistant_id?: string | null;
  vapi_phone_number?: string | null;
  custom_system_prompt?: string | null;
  voice_first_message?: string | null;
  voice_end_message?: string | null;
  voicemail_message?: string | null;
  voice_ai_name?: string | null;
  primary_language?: string | null;
  supported_languages?: string[] | null;
  llm_model?: string | null;
  llm_provider?: string | null;
  industry_override?: string | null;
  ai_name_override?: string | null;
  voice_provider?: string | null;
  voice_end_call_message?: string | null;
  recording_enabled?: boolean | null;
  max_call_duration?: number | null;
  silence_timeout?: number | null;
  voice_temperature?: number | null;
  voice_max_tokens?: number | null;
  background_sound?: string | null;
  voice_greeting_delay?: number | null;
  whatsapp_phone_id?: string | null;
  whatsapp_access_token?: string | null;
  wati_api_key?: string | null;
  wati_endpoint?: string | null;
  meta_page_id?: string | null;
  meta_page_token?: string | null;
  instagram_page_id?: string | null;
  openai_api_key?: string | null;
  twilio_sid?: string | null;
  twilio_auth_token?: string | null;
  twilio_phone?: string | null;
  pipeline_stages?: Record<string, any> | null;
  default_pipeline_stage?: string | null;
  onboarding_step?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  custom_system_prompt_override?: string | null;
  country?: string | null;
}

// Industry-specific vocabulary translations
const industryVocabulary: Partial<Record<IndustryType, Record<string, string>>> & { general: Record<string, string> } = {
  healthcare: {
    customer: "Patient",
    customers: "Patients",
    appointment: "Consultation",
    appointments: "Consultations",
    product: "Treatment",
    products: "Treatments",
    staff: "Practitioner",
    staffs: "Practitioners",
    deal: "Treatment Plan",
    deals: "Treatment Plans",
    lead: "Patient Inquiry",
    leads: "Patient Inquiries",
  },
  real_estate: {
    customer: "Client",
    customers: "Clients",
    appointment: "Viewing",
    appointments: "Viewings",
    product: "Property",
    products: "Properties",
    staff: "Agent",
    staffs: "Agents",
    deal: "Transaction",
    deals: "Transactions",
    lead: "Property Inquiry",
    leads: "Property Inquiries",
  },
  restaurant: {
    customer: "Guest",
    customers: "Guests",
    appointment: "Reservation",
    appointments: "Reservations",
    product: "Menu Item",
    products: "Menu",
    staff: "Team Member",
    staffs: "Team Members",
    deal: "Catering Order",
    deals: "Catering Orders",
    lead: "Inquiry",
    leads: "Inquiries",
  },
  salon: {
    customer: "Client",
    customers: "Clients",
    appointment: "Booking",
    appointments: "Bookings",
    product: "Service",
    products: "Services",
    staff: "Stylist",
    staffs: "Stylists",
    deal: "Package",
    deals: "Packages",
    lead: "Client Inquiry",
    leads: "Client Inquiries",
  },
  healthcare_clinic: {
    customer: "Patient",
    customers: "Patients",
    appointment: "Visit",
    appointments: "Visits",
    product: "Treatment",
    products: "Treatments",
    staff: "Provider",
    staffs: "Providers",
    deal: "Care Plan",
    deals: "Care Plans",
    lead: "Patient Lead",
    leads: "Patient Leads",
  },
  banking_collections: {
    customer: "Debtor",
    customers: "Debtors",
    appointment: "Call",
    appointments: "Calls",
    product: "Account",
    products: "Accounts",
    staff: "Agent",
    staffs: "Agents",
    deal: "Collection",
    deals: "Collections",
    lead: "Account",
    leads: "Accounts",
  },
  construction_estimation: {
    customer: "Client",
    customers: "Clients",
    appointment: "Site Visit",
    appointments: "Site Visits",
    product: "Project",
    products: "Projects",
    staff: "Estimator",
    staffs: "Estimators",
    deal: "Bid",
    deals: "Bids",
    lead: "Project Lead",
    leads: "Project Leads",
  },
  healthcare_staffing: {
    customer: "Facility",
    customers: "Facilities",
    appointment: "Shift",
    appointments: "Shifts",
    product: "Placement",
    products: "Placements",
    staff: "Worker",
    staffs: "Workers",
    deal: "Contract",
    deals: "Contracts",
    lead: "Prospect",
    leads: "Prospects",
  },
  technology: {
    customer: "Client",
    customers: "Clients",
    appointment: "Consultation",
    appointments: "Consultations",
    product: "Solution",
    products: "Solutions",
    staff: "Specialist",
    staffs: "Specialists",
    deal: "Deal",
    deals: "Deals",
    lead: "Lead",
    leads: "Leads",
  },
  general: {
    customer: "Customer",
    customers: "Customers",
    appointment: "Appointment",
    appointments: "Appointments",
    product: "Product",
    products: "Products",
    staff: "Staff Member",
    staffs: "Staff Members",
    deal: "Deal",
    deals: "Deals",
    lead: "Lead",
    leads: "Leads",
  },
};

// Industry-specific deal stages
const industryDealStages: Partial<Record<IndustryType, string[]>> & { general: string[] } = {
  healthcare: [
    "Inquiry",
    "Consultation Booked",
    "Consultation Done",
    "Treatment Plan",
    "Scheduled",
    "In Treatment",
    "Completed",
    "Follow-up",
    "Lost",
  ],
  real_estate: [
    "Lead",
    "Qualified",
    "Viewing Scheduled",
    "Viewing Done",
    "Offer Made",
    "Negotiation",
    "Contract",
    "Closing",
    "Won",
    "Lost",
  ],
  restaurant: ["Inquiry", "Quote Sent", "Confirmed", "Deposit Received", "In Progress", "Completed", "Cancelled"],
  salon: ["Inquiry", "Booked", "In Service", "Completed", "Rebooking", "Lost"],
  healthcare_clinic: [
    "New Patient",
    "Insurance Verified",
    "Appointment Scheduled",
    "Checked In",
    "In Treatment",
    "Follow-up Scheduled",
    "Completed",
  ],
  banking_collections: [
    "New Account",
    "Contact Attempted",
    "Right Party Contact",
    "Payment Plan Offered",
    "Payment Plan Accepted",
    "Partial Payment",
    "Paid in Full",
  ],
  construction_estimation: [
    "RFP Received",
    "Site Visit Scheduled",
    "Takeoff Complete",
    "Estimate Drafted",
    "Bid Submitted",
    "Negotiation",
    "Awarded",
    "Lost",
  ],
  healthcare_staffing: [
    "Lead",
    "Contacted",
    "Qualified",
    "Needs Assessment",
    "Proposal Sent",
    "Negotiation",
    "Contract Signed",
    "Active Client",
    "Lost",
  ],
  technology: [
    "Discovery",
    "Qualified",
    "Demo Scheduled",
    "Proposal Sent",
    "Negotiation",
    "Contract Review",
    "Closed Won",
    "Closed Lost",
  ],
  general: ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
};

export type UserRole = "master_admin" | "admin" | "manager" | "staff";

interface TenantContextType {
  tenantId: string | null;
  tenantConfig: TenantConfig | null;
  isLoading: boolean;
  error: string | null;
  setTenantId: (id: string) => void;
  setUserTenantInfo: (tenantId: string | null, role: UserRole) => void;
  canSwitchTenant: boolean;
  translate: (term: string) => string;
  t: (term: string) => string;
  getVocabulary: () => Record<string, string>;
  getDealStages: () => string[];
  industry: IndustryType;
  isHealthcare: boolean;
  isHealthcareClinic: boolean;
  isRealEstate: boolean;
  isRestaurant: boolean;
  isSalon: boolean;
  isBankingCollections: boolean;
  isConstructionEstimation: boolean;
  isHealthcareStaffing: boolean;
  refreshConfig: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_ID_KEY = "zateceptionist_tenant_id";

function getInitialTenantId(): string | null {
  // Check URL param first
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTenantId = urlParams.get("tenant");
    if (urlTenantId) {
      localStorage.setItem(TENANT_ID_KEY, urlTenantId);
      return urlTenantId;
    }
  }
  // Fall back to localStorage
  return localStorage.getItem(TENANT_ID_KEY);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(getInitialTenantId);
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("staff");

  const setTenantId = useCallback((id: string) => {
    console.log('[TenantContext] setTenantId called:', id);
    localStorage.setItem(TENANT_ID_KEY, id);
    setTenantIdState(id);
  }, []);

  // Called by AuthContext after authentication to set user's tenant and role
  // FIXED: Always update tenant from user's database assignment to prevent stale cache
  const setUserTenantInfo = useCallback(
    (newTenantId: string | null, role: UserRole) => {
      console.log('[TenantContext] setUserTenantInfo called:', { newTenantId, role, currentTenantId: tenantId });
      setUserRole(role);
      
      if (newTenantId) {
        // CRITICAL FIX: Always update tenant from user's assignment
        // This ensures database-assigned tenant overrides any cached value
        const currentCached = localStorage.getItem(TENANT_ID_KEY);
        
        if (role !== "master_admin") {
          // Non-master admins are ALWAYS locked to their assigned tenant
          console.log('[TenantContext] Non-master admin - forcing tenant to:', newTenantId);
          localStorage.setItem(TENANT_ID_KEY, newTenantId);
          setTenantIdState(newTenantId);
        } else if (currentCached !== newTenantId && !currentCached) {
          // Master admin with no cached tenant - set their default
          console.log('[TenantContext] Master admin - setting default tenant:', newTenantId);
          localStorage.setItem(TENANT_ID_KEY, newTenantId);
          setTenantIdState(newTenantId);
        } else {
          console.log('[TenantContext] Master admin - keeping current tenant:', currentCached);
        }
      }
    },
    [tenantId],
  );

  const fetchTenantConfig = useCallback(async () => {
    if (!tenantId) {
      console.log('[TenantContext] fetchTenantConfig - no tenantId, skipping');
      setTenantConfig(null);
      return;
    }

    console.log('[TenantContext] fetchTenantConfig - loading for:', tenantId);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("tenant_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        console.log('[TenantContext] Tenant config loaded:', {
          tenant_id: data.tenant_id,
          uuid: data.id,
          company_name: data.company_name
        });
        setTenantConfig(data as TenantConfig);
        // Update document title
        if (data.company_name) {
          document.title = `${data.company_name} | Zateceptionist`;
        }
      } else {
        console.warn('[TenantContext] No tenant_config found for:', tenantId);
        // Default config if none exists
        const defaultConfig: TenantConfig = {
          id: "",
          tenant_id: tenantId,
          company_name: "My Business",
          industry: "general",
          logo_url: null,
          primary_color: null,
          ai_name: "Zate",
          ai_role: "AI Assistant",
          timezone: "UTC",
          currency: "USD",
          working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          opening_time: "09:00",
          closing_time: "17:00",
          vocabulary: null,
          has_whatsapp: false,
          has_email: true,
          has_voice: false,
          has_instagram: false,
          has_facebook: false,
          has_linkedin: false,
          features: null,
          subscription_status: "trial",
        };
        setTenantConfig(defaultConfig);
      }
    } catch (err) {
      console.error("Error fetching tenant config:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tenant config");
      // Set default config on error
      setTenantConfig({
        id: "",
        tenant_id: tenantId,
        company_name: "My Business",
        industry: "general",
        logo_url: null,
        primary_color: null,
        ai_name: "Zate",
        ai_role: "AI Assistant",
        timezone: "UTC",
        currency: "USD",
        working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        opening_time: "09:00",
        closing_time: "17:00",
        vocabulary: null,
        has_whatsapp: false,
        has_email: true,
        has_voice: false,
        has_instagram: false,
        has_facebook: false,
        has_linkedin: false,
        features: null,
        subscription_status: "trial",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Determine if user can switch tenants (only master_admin)
  const canSwitchTenant = userRole === "master_admin";

  const industry = useMemo(() => tenantConfig?.industry || "general", [tenantConfig?.industry]);

  const translate = useCallback(
    (term: string): string => {
      // Check custom vocabulary first
      const customVocab = tenantConfig?.vocabulary;
      if (customVocab && customVocab[term.toLowerCase()]) {
        return customVocab[term.toLowerCase()];
      }
      // Fall back to industry vocabulary (with fallback to 'general' if industry not found)
      const vocab = industryVocabulary[industry as IndustryType] || industryVocabulary.general;
      return vocab?.[term.toLowerCase()] || term;
    },
    [tenantConfig?.vocabulary, industry],
  );

  const getVocabulary = useCallback((): Record<string, string> => {
    const baseVocab = { ...(industryVocabulary[industry as IndustryType] || industryVocabulary.general) };
    const customVocab = tenantConfig?.vocabulary;
    if (customVocab) {
      return { ...baseVocab, ...customVocab };
    }
    return baseVocab;
  }, [industry, tenantConfig?.vocabulary]);

  const getDealStages = useCallback((): string[] => {
    if (tenantConfig?.pipeline_stages && Array.isArray(tenantConfig.pipeline_stages) && tenantConfig.pipeline_stages.length > 0) {
      return tenantConfig.pipeline_stages;
    }
    return industryDealStages[industry] || industryDealStages.general;
  }, [industry, tenantConfig?.pipeline_stages]);

  const isHealthcare = industry === "healthcare";
  const isHealthcareClinic = industry === "healthcare_clinic" || industry === "healthcare";
  const isRealEstate = industry === "real_estate";
  const isRestaurant = industry === "restaurant";
  const isSalon = industry === "salon";
  const isBankingCollections = industry === "banking_collections" || (industry as string) === "finance";
  const isConstructionEstimation = industry === "construction_estimation" || (industry as string) === "construction";
  const isHealthcareStaffing = industry === "healthcare_staffing";

  useEffect(() => {
    fetchTenantConfig();
  }, [fetchTenantConfig]);

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantConfig,
        isLoading,
        error,
        setTenantId,
        setUserTenantInfo,
        canSwitchTenant,
        translate,
        t: translate,
        getVocabulary,
        getDealStages,
        industry,
        isHealthcare,
        isHealthcareClinic,
        isRealEstate,
        isRestaurant,
        isSalon,
        isBankingCollections,
        isConstructionEstimation,
        isHealthcareStaffing,
        refreshConfig: fetchTenantConfig,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function useVocabulary() {
  const { translate, t, getVocabulary, getDealStages, industry } = useTenant();
  return { translate, t, getVocabulary, getDealStages, industry };
}
