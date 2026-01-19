// ============================================================
// PROJECT 420: ONBOARDING SYSTEM TYPESCRIPT TYPES
// ============================================================

// ============================================
// ONBOARDING SESSIONS
// ============================================

export interface OnboardingSession {
  id: string;
  tenant_id: string;
  user_id?: string;
  current_step: number;
  steps_completed: string[];
  completion_percentage: number;
  input_type?: 'website' | 'social' | 'document' | 'manual';
  primary_input?: string;
  secondary_inputs: string[];
  uploaded_documents: UploadedDocument[];
  scraped_data: Record<string, any>;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_error?: string;
  ai_analysis: AIAnalysisResult;
  confidence_scores: Record<string, number>;
  client_modifications: Record<string, any>;
  started_at: string;
  last_activity_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  type: string;
  size: number;
  url?: string;
  processed: boolean;
  extracted_text?: string;
}

export interface AIAnalysisResult {
  company_name?: string;
  industry?: string;
  sub_industry?: string;
  description?: string;
  services?: ExtractedService[];
  contact?: ExtractedContact;
  social_links?: Record<string, string>;
  suggested_ai_config?: SuggestedAIConfig;
  target_audience?: string[];
  brand_voice?: string;
  keywords?: string[];
}

export interface ExtractedService {
  name: string;
  description?: string;
  price?: string;
  category?: string;
}

export interface ExtractedContact {
  email?: string;
  phone?: string;
  address?: string;
}

export interface SuggestedAIConfig {
  name: string;
  role: string;
  personality: string;
  greeting: string;
  tone: string;
}

// ============================================
// BUSINESS PROFILES
// ============================================

export interface BusinessProfile {
  id: string;
  tenant_id: string;
  company_name: string;
  legal_name?: string;
  industry: string;
  sub_industry?: string;
  company_size?: 'solo' | '2-10' | '11-50' | '51-200' | '201-500' | '500+';
  founded_year?: number;
  short_description?: string;
  long_description?: string;
  unique_value_proposition?: string;
  mission_statement?: string;
  headquarters_address?: Address;
  service_areas: ServiceArea[];
  timezone: string;
  primary_email?: string;
  primary_phone?: string;
  secondary_contacts: Contact[];
  website_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  brand_fonts?: BrandFonts;
  data_sources: DataSource[];
  extraction_confidence?: number;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postal?: string;
}

export interface ServiceArea {
  type: 'city' | 'state' | 'country' | 'radius';
  value: string;
  radius_miles?: number;
}

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface BrandFonts {
  primary?: string;
  secondary?: string;
}

export interface DataSource {
  type: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'document' | 'manual';
  url?: string;
  timestamp: string;
}

// ============================================
// SERVICES CATALOG
// ============================================

export interface ServiceCatalogItem {
  id: string;
  tenant_id: string;
  name: string;
  type: 'service' | 'product' | 'package' | 'consultation';
  category?: string;
  description?: string;
  short_description?: string;
  price_type: 'fixed' | 'range' | 'quote' | 'hourly' | 'subscription';
  price_amount?: number;
  price_min?: number;
  price_max?: number;
  currency: string;
  duration_minutes?: number;
  is_active: boolean;
  is_featured: boolean;
  availability_schedule?: AvailabilitySchedule;
  keywords: string[];
  faq_entries: FAQEntry[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM
  end: string;   // HH:MM
}

export interface FAQEntry {
  question: string;
  answer: string;
}

// ============================================
// TARGET PERSONAS
// ============================================

export interface TargetPersona {
  id: string;
  tenant_id: string;
  name: string;
  type: 'b2c' | 'b2b';
  is_primary: boolean;
  // Demographics (B2C)
  age_range_min?: number;
  age_range_max?: number;
  gender?: string[];
  income_range?: string;
  education_level?: string[];
  marital_status?: string[];
  locations: PersonaLocation[];
  // Firmographics (B2B)
  company_sizes?: string[];
  industries?: string[];
  job_titles?: string[];
  departments?: string[];
  annual_revenue?: string;
  // Psychographics
  pain_points: string[];
  goals: string[];
  interests: string[];
  values: string[];
  objections: string[];
  // Behavioral
  buying_triggers: string[];
  decision_timeline?: 'immediate' | 'days' | 'weeks' | 'months';
  research_behavior?: string;
  preferred_channels: string[];
  // Intent signals
  high_intent_keywords: string[];
  medium_intent_keywords: string[];
  low_intent_keywords: string[];
  // AI context
  communication_preferences?: CommunicationPreferences;
  created_at: string;
  updated_at: string;
}

export interface PersonaLocation {
  type: 'city' | 'state' | 'country' | 'region';
  value: string;
}

export interface CommunicationPreferences {
  tone?: string;
  formality?: 'formal' | 'casual' | 'professional';
  response_length?: 'brief' | 'detailed';
  topics_to_emphasize?: string[];
  topics_to_avoid?: string[];
}

// ============================================
// COMPETITOR PROFILES
// ============================================

export interface CompetitorProfile {
  id: string;
  tenant_id: string;
  name: string;
  website_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  services_offered: string[];
  pricing_notes?: string;
  strengths: string[];
  weaknesses: string[];
  unique_features: string[];
  last_scraped_at?: string;
  scraped_data?: Record<string, any>;
  threat_level: 'low' | 'medium' | 'high';
  market_share_estimate?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// AI MODEL CONFIGURATIONS
// ============================================

export interface AIModelConfig {
  id: string;
  tenant_id: string;
  model_type: 'sales' | 'marketing' | 'hr' | 'operations' | 'communication' | 'voice';
  model_name?: string;
  system_prompt?: string;
  include_business_profile: boolean;
  include_services: boolean;
  include_personas: boolean;
  include_competitors: boolean;
  include_knowledge_base: boolean;
  custom_context?: string;
  temperature: number;
  max_tokens: number;
  response_style: 'professional' | 'friendly' | 'casual' | 'formal';
  topics_to_avoid: string[];
  escalation_triggers: string[];
  industry_knowledge_pack?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// INDUSTRY TEMPLATES
// ============================================

export interface IndustryTemplate {
  id: string;
  industry_code: string;
  industry_name: string;
  icon: string;
  vocabulary: IndustryVocabulary;
  deal_stages: DealStage[];
  nurture_sequences: NurtureSequenceTemplate[];
  scoring_weights: Record<string, number>;
  ai_context_template?: string;
  brand_voice_suggestions: string[];
  ai_name_suggestions: string[];
  common_services: ServiceTemplate[];
  persona_templates: PersonaTemplate[];
  content_themes: string[];
  hashtags: string[];
  trend_keywords: string[];
  compliance_requirements?: ComplianceRequirements;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IndustryVocabulary {
  lead: string;
  leads: string;
  customer: string;
  customers: string;
  deal: string;
  deals: string;
  meeting: string;
  meetings: string;
  proposal: string;
  contact: string;
  pipeline: string;
  won: string;
  lost: string;
  follow_up: string;
  qualification: string;
  conversion: string;
}

export interface DealStage {
  id: string;
  name: string;
  probability: number;
  color: string;
}

export interface NurtureSequenceTemplate {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
}

export interface SequenceStep {
  day: number;
  channel: 'email' | 'sms' | 'whatsapp' | 'voice';
  subject?: string;
  purpose: string;
  delay_hours?: number;
}

export interface ServiceTemplate {
  name: string;
  type: string;
  duration_minutes?: number;
  price_type: string;
}

export interface PersonaTemplate {
  name: string;
  type: 'b2c' | 'b2b';
  age_range_min?: number;
  age_range_max?: number;
  income_range?: string;
  job_titles?: string[];
  company_sizes?: string[];
  pain_points: string[];
  goals: string[];
  buying_triggers: string[];
}

export interface ComplianceRequirements {
  hipaa_compliant?: boolean;
  pci_compliance?: boolean;
  gdpr_compliance?: boolean;
  data_retention_years?: number;
  consent_required?: boolean;
  encryption_required?: boolean;
  audit_logging?: boolean;
  licensing_required?: boolean;
  background_checks?: boolean;
}

// ============================================
// SCRAPED CONTENT
// ============================================

export interface ScrapedContent {
  id: string;
  tenant_id: string;
  source_type: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'document';
  source_url?: string;
  source_identifier?: string;
  raw_content?: string;
  processed_content?: string;
  extracted_data?: Record<string, any>;
  content_hash?: string;
  scrape_timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

// ============================================
// ONBOARDING CHECKLISTS
// ============================================

export interface OnboardingChecklistItem {
  id: string;
  tenant_id: string;
  item_code: string;
  item_name: string;
  item_category: 'setup' | 'channels' | 'automation' | 'training';
  is_completed: boolean;
  is_required: boolean;
  is_skipped: boolean;
  completed_at?: string;
  completed_by?: string;
  completion_data?: Record<string, any>;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Onboarding Start
export interface OnboardingStartRequest {
  tenant_id?: string;
  user_id?: string;
}

export interface OnboardingStartResponse {
  session_id: string;
  tenant_id: string;
  current_step: number;
}

// Analyze URL
export interface AnalyzeURLRequest {
  url: string;
  tenant_id: string;
  session_id?: string;
}

export interface AnalyzeURLResponse {
  success: boolean;
  data: AIAnalysisResult;
  confidence: number;
  source: {
    input_type: string;
    scrape_url: string;
    domain: string;
  };
}

// Analyze Social
export interface AnalyzeSocialRequest {
  platform: 'instagram' | 'facebook' | 'linkedin';
  url: string;
  tenant_id: string;
  session_id?: string;
}

// Save Profile
export interface SaveProfileRequest {
  tenant_id: string;
  profile: Partial<BusinessProfile>;
  services?: Partial<ServiceCatalogItem>[];
  personas?: Partial<TargetPersona>[];
}

export interface SaveProfileResponse {
  success: boolean;
  profile_id: string;
  services_created: number;
  personas_created: number;
}

// Configure AI
export interface ConfigureAIRequest {
  tenant_id: string;
  configs: Partial<AIModelConfig>[];
}

// Train Agents
export interface TrainAgentsRequest {
  tenant_id: string;
  modules: ('sales' | 'marketing' | 'hr' | 'operations' | 'communication' | 'voice')[];
}

export interface TrainAgentsResponse {
  success: boolean;
  trained_modules: string[];
  knowledge_context_length: number;
}

// Onboarding Status
export interface OnboardingStatus {
  tenant_id: string;
  session?: {
    id: string;
    current_step: number;
    extraction_status: string;
    started_at: string;
    completed_at?: string;
  };
  profile?: {
    company_name: string;
    industry: string;
    has_description: boolean;
  };
  counts: {
    services: number;
    personas: number;
    knowledge_entries: number;
  };
  progress: {
    total_items: number;
    completed_items: number;
    completion_percentage: number;
    required_completion_percentage: number;
  };
  is_complete: boolean;
}

// ============================================
// ONBOARDING WIZARD STEPS
// ============================================

export type OnboardingStepId = 
  | 'discover'
  | 'analyze'
  | 'profile'
  | 'services'
  | 'personas'
  | 'ai_config'
  | 'channels'
  | 'training'
  | 'complete';

export interface OnboardingStep {
  id: OnboardingStepId;
  number: number;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  estimatedMinutes: number;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'discover',
    number: 1,
    title: 'Discover',
    description: 'Tell us about your business',
    icon: 'Search',
    required: true,
    estimatedMinutes: 2,
  },
  {
    id: 'analyze',
    number: 2,
    title: 'Analyze',
    description: 'AI extracts your business info',
    icon: 'Brain',
    required: true,
    estimatedMinutes: 1,
  },
  {
    id: 'profile',
    number: 3,
    title: 'Profile',
    description: 'Review and customize your profile',
    icon: 'Building2',
    required: true,
    estimatedMinutes: 2,
  },
  {
    id: 'services',
    number: 4,
    title: 'Services',
    description: 'Define what you offer',
    icon: 'Package',
    required: true,
    estimatedMinutes: 2,
  },
  {
    id: 'personas',
    number: 5,
    title: 'Customers',
    description: 'Define your ideal customers',
    icon: 'Users',
    required: true,
    estimatedMinutes: 1,
  },
  {
    id: 'ai_config',
    number: 6,
    title: 'AI Setup',
    description: 'Configure your AI assistant',
    icon: 'Bot',
    required: true,
    estimatedMinutes: 1,
  },
  {
    id: 'channels',
    number: 7,
    title: 'Channels',
    description: 'Connect your communication channels',
    icon: 'MessageSquare',
    required: false,
    estimatedMinutes: 2,
  },
  {
    id: 'training',
    number: 8,
    title: 'Training',
    description: 'Train your AI agents',
    icon: 'GraduationCap',
    required: true,
    estimatedMinutes: 1,
  },
  {
    id: 'complete',
    number: 9,
    title: 'Complete',
    description: "You're all set!",
    icon: 'CheckCircle',
    required: true,
    estimatedMinutes: 0,
  },
];
