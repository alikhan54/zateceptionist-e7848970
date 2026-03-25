// Onboarding constants — extracted from CompanySetup.tsx for reuse

export const INDUSTRIES = [
  { value: "healthcare", label: "Healthcare & Medical", icon: "🏥" },
  { value: "healthcare_clinic", label: "Healthcare Clinic", icon: "🩺" },
  { value: "healthcare_staffing", label: "Healthcare Staffing & Recruitment", icon: "🏥" },
  { value: "real_estate", label: "Real Estate", icon: "🏠" },
  { value: "restaurant", label: "Restaurant & Food", icon: "🍽️" },
  { value: "salon", label: "Salon & Beauty", icon: "💇" },
  { value: "banking_collections", label: "Banking & Collections", icon: "🏦" },
  { value: "construction_estimation", label: "Construction & Estimation", icon: "🏗️" },
  { value: "technology", label: "Technology & SaaS", icon: "💻" },
  { value: "legal", label: "Legal Services", icon: "⚖️" },
  { value: "fitness", label: "Fitness & Wellness", icon: "💪" },
  { value: "education", label: "Education & Training", icon: "📚" },
  { value: "automotive", label: "Automotive", icon: "🚗" },
  { value: "professional", label: "Professional Services", icon: "💼" },
  { value: "retail", label: "Retail & E-commerce", icon: "🛍️" },
  { value: "general", label: "Other", icon: "🏢" },
];

export const AI_PERSONALITIES = [
  { value: "professional", label: "Professional", description: "Formal and business-like", emoji: "👔" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable", emoji: "😊" },
  { value: "casual", label: "Casual", description: "Relaxed and conversational", emoji: "🤙" },
  { value: "formal", label: "Formal", description: "Polished and authoritative", emoji: "🎩" },
];

export const AI_NAME_SUGGESTIONS: Record<string, string[]> = {
  healthcare: ["Dr. Luna", "Max Health", "Cara"],
  healthcare_clinic: ["Dr. Sara", "Luna", "Medi"],
  healthcare_staffing: ["Graham AI", "Nova", "Care"],
  real_estate: ["Alex", "Sam", "Jordan"],
  restaurant: ["Chef Zoe", "Marco", "Bella"],
  salon: ["Luna", "Ava", "Sophia"],
  banking_collections: ["Nova", "Max", "Zara"],
  construction_estimation: ["Cal", "Foreman", "Zate"],
  technology: ["Alex", "Nova", "Zate"],
  general: ["Zate", "Luna", "Max"],
};

export const TIMEZONES = [
  { value: "Africa/Johannesburg", label: "South Africa (SAST)" },
  { value: "Africa/Cairo", label: "Egypt (EET)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export const AI_ROLES = [
  { value: "AI Receptionist", label: "AI Receptionist" },
  { value: "Sales Assistant", label: "Sales Assistant" },
  { value: "Customer Support", label: "Customer Support" },
  { value: "Booking Agent", label: "Booking Agent" },
  { value: "Customer Service Representative", label: "Customer Service Rep" },
];

export const ONBOARDING_STEPS = [
  { id: "discovery", title: "Business Discovery", description: "Tell us about your business" },
  { id: "channels", title: "AI & Channels", description: "Configure AI and connect platforms" },
  { id: "knowledge", title: "Knowledge Base", description: "Train your AI with documents" },
  { id: "payment", title: "Choose Plan", description: "Select your subscription" },
  { id: "ready", title: "You're Ready!", description: "Start using the platform" },
];

// --- Types ---

export interface CompanyData {
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

export interface AIConfig {
  name: string;
  role: string;
  greeting: string;
  personality: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  timezone: string;
}

export interface ChannelConfig {
  whatsapp: boolean;
  voiceAI: boolean;
  email: boolean;
  instagram: boolean;
  facebook: boolean;
  webChat: boolean;
}

export interface OnboardingData {
  // Step 1: Discovery
  companyData: CompanyData;
  scrapeConfidence: number;
  scrapeSource: string; // 'website' | 'social' | 'document' | 'manual'

  // Step 2: AI & Channels
  aiConfig: AIConfig;
  channels: ChannelConfig;
  connectedChannels: string[];

  // Step 3: Knowledge Base
  uploadedFiles: Array<{ name: string; size: number; success?: boolean }>;
  knowledgeText: string;
  trainingComplete: boolean;

  // Step 4: Payment
  selectedPlan: string;
  paymentVerified: boolean;
  trialStarted: boolean;

  // Meta
  skippedSteps: string[];
  currentStep: number;
}

export const DEFAULT_COMPANY_DATA: CompanyData = {
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

export const DEFAULT_AI_CONFIG: AIConfig = {
  name: "Zate",
  role: "AI Receptionist",
  greeting: "Hello! I'm your AI assistant. How can I help you today?",
  personality: "friendly",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  timezone: "America/New_York",
};

export const DEFAULT_CHANNELS: ChannelConfig = {
  whatsapp: false,
  voiceAI: false,
  email: true,
  instagram: false,
  facebook: false,
  webChat: false,
};

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  companyData: DEFAULT_COMPANY_DATA,
  scrapeConfidence: 0,
  scrapeSource: '',
  aiConfig: DEFAULT_AI_CONFIG,
  channels: DEFAULT_CHANNELS,
  connectedChannels: [],
  uploadedFiles: [],
  knowledgeText: '',
  trainingComplete: false,
  selectedPlan: 'professional',
  paymentVerified: false,
  trialStarted: false,
  skippedSteps: [],
  currentStep: 0,
};

// --- Industry Normalization ---

const INDUSTRY_ALIASES: Record<string, string> = {
  finance: "banking_collections",
  banking: "banking_collections",
  collections: "banking_collections",
  fintech: "banking_collections",
  "debt collection": "banking_collections",
  clinic: "healthcare_clinic",
  aesthetics: "healthcare_clinic",
  dermatology: "healthcare_clinic",
  "medical spa": "healthcare_clinic",
  hospital: "healthcare",
  medical: "healthcare",
  staffing: "healthcare_staffing",
  "nurse staffing": "healthcare_staffing",
  "psw staffing": "healthcare_staffing",
  "healthcare recruitment": "healthcare_staffing",
  "medical staffing": "healthcare_staffing",
  "nursing agency": "healthcare_staffing",
  "healthcare agency": "healthcare_staffing",
  "caregiver agency": "healthcare_staffing",
  "home care staffing": "healthcare_staffing",
  "ltc staffing": "healthcare_staffing",
  construction: "construction_estimation",
  estimation: "construction_estimation",
  contracting: "construction_estimation",
  property: "real_estate",
  realestate: "real_estate",
  brokerage: "real_estate",
  food: "restaurant",
  dining: "restaurant",
  cafe: "restaurant",
  beauty: "salon",
  spa: "salon",
  barbershop: "salon",
  saas: "technology",
  software: "technology",
  it: "technology",
};

const KNOWN_INDUSTRY_VALUES = INDUSTRIES.map(i => i.value);

export function normalizeIndustry(raw: string | undefined): string {
  if (!raw) return "general";
  const lower = raw.toLowerCase().trim();
  if (KNOWN_INDUSTRY_VALUES.includes(lower)) return lower;
  if (INDUSTRY_ALIASES[lower]) return INDUSTRY_ALIASES[lower];
  for (const [keyword, mapped] of Object.entries(INDUSTRY_ALIASES)) {
    if (lower.includes(keyword)) return mapped;
  }
  return "general";
}

function decodeHTMLEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '\u2013').replace(/&mdash;/g, '\u2014')
    .replace(/&nbsp;/g, ' ');
}

// --- Helpers ---

export interface APIAnalysisData {
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
  // Deep scrape additions
  team?: Array<{ name: string; role: string; expertise?: string }>;
  testimonials?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  business_hours?: { opening: string; closing: string; timezone?: string };
  locations?: string[];
  competitors?: string[];
  products_services?: Array<{ name: string; description?: string; price?: string; features?: string[] }>;
  target_market?: { demographics?: string; pain_points?: string[]; goals?: string[] };
  unique_value_proposition?: string;
}

export function transformAPIResponse(apiData: APIAnalysisData | null | undefined): Partial<CompanyData> {
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
    company_name: decodeHTMLEntities(apiData.company_name || ""),
    industry: normalizeIndustry(apiData.industry),
    description: decodeHTMLEntities(apiData.description || ""),
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

export function safelyMergeCompanyData(
  existing: CompanyData,
  incoming: Partial<CompanyData> | null | undefined
): CompanyData {
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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
