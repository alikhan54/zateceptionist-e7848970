export type IntegrationCategory = 
  | 'communication' 
  | 'scheduling' 
  | 'payments' 
  | 'crm' 
  | 'support' 
  | 'ecommerce' 
  | 'ai' 
  | 'productivity' 
  | 'analytics' 
  | 'forms';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type AuthType = 'api_key' | 'oauth' | 'credentials' | 'webhook';

export interface IntegrationCredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
}

export interface IntegrationSetting {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'textarea';
  defaultValue: any;
  helpText?: string;
  options?: { label: string; value: string }[];
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  color: string;
  authType: AuthType;
  credentials: IntegrationCredentialField[];
  settings?: IntegrationSetting[];
  webhookUrl?: string;
  docsUrl?: string;
  setupGuide?: string[];
  features: string[];
  tier: 'starter' | 'professional' | 'enterprise';
  popular?: boolean;
  comingSoon?: boolean;
}

export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  message?: string;
  latency?: number;
}

export interface IntegrationConnection {
  integrationId: string;
  status: IntegrationStatus;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  health?: IntegrationHealth;
  connectedAt?: string;
  lastSyncAt?: string;
}

export const INTEGRATION_CATEGORIES: Record<IntegrationCategory, { 
  label: string; 
  description: string; 
  icon: string; 
  color: string;
}> = {
  communication: { 
    label: 'Communication', 
    description: 'Connect messaging channels', 
    icon: 'MessageSquare', 
    color: '#3B82F6' 
  },
  scheduling: { 
    label: 'Scheduling', 
    description: 'Sync calendars and bookings', 
    icon: 'Calendar', 
    color: '#10B981' 
  },
  payments: { 
    label: 'Payments', 
    description: 'Accept payments and invoicing', 
    icon: 'CreditCard', 
    color: '#8B5CF6' 
  },
  crm: { 
    label: 'CRM', 
    description: 'Sync leads and customers', 
    icon: 'Users', 
    color: '#F59E0B' 
  },
  support: { 
    label: 'Support', 
    description: 'Manage tickets and help desk', 
    icon: 'Headphones', 
    color: '#EC4899' 
  },
  ecommerce: { 
    label: 'E-commerce', 
    description: 'Connect your online store', 
    icon: 'ShoppingCart', 
    color: '#14B8A6' 
  },
  ai: { 
    label: 'AI & Enrichment', 
    description: 'Power AI and data features', 
    icon: 'Brain', 
    color: '#6366F1' 
  },
  productivity: { 
    label: 'Productivity', 
    description: 'Workspace and automation tools', 
    icon: 'Zap', 
    color: '#F97316' 
  },
  analytics: { 
    label: 'Analytics', 
    description: 'Track performance and metrics', 
    icon: 'BarChart3', 
    color: '#06B6D4' 
  },
  forms: { 
    label: 'Forms', 
    description: 'Capture leads and feedback', 
    icon: 'FileText', 
    color: '#84CC16' 
  }
};

// Mapping from integration ID to tenant_config boolean flag
export const INTEGRATION_FLAGS: Record<string, string> = {
  whatsapp_wati: 'has_whatsapp_wati',
  whatsapp_cloud: 'has_whatsapp_cloud',
  instagram: 'has_instagram',
  facebook: 'has_facebook',
  telegram: 'has_telegram',
  twitter: 'has_twitter',
  sms_twilio: 'has_sms',
  linkedin: 'has_linkedin',
  email_smtp: 'has_email',
  email_sendgrid: 'has_sendgrid',
  email_mailgun: 'has_mailgun',
  voice_vapi: 'has_voice',
  voice_twilio: 'has_voice_twilio',
  website_chat: 'has_website_chat',
  tiktok: 'has_tiktok',
  google_calendar: 'has_calendar',
  outlook_calendar: 'has_outlook_calendar',
  calendly: 'has_calendly',
  acuity: 'has_acuity',
  stripe: 'has_stripe',
  paypal: 'has_paypal',
  square: 'has_square',
  razorpay: 'has_razorpay',
  hubspot: 'has_hubspot',
  salesforce: 'has_salesforce',
  pipedrive: 'has_pipedrive',
  zoho_crm: 'has_zoho',
  freshsales: 'has_freshsales',
  zendesk: 'has_zendesk',
  intercom: 'has_intercom',
  freshdesk: 'has_freshdesk',
  shopify: 'has_shopify',
  woocommerce: 'has_woocommerce',
  openai: 'has_openai',
  anthropic: 'has_anthropic',
  apify: 'has_apify',
  apollo: 'has_apollo',
  hunter: 'has_hunter',
  clearbit: 'has_clearbit',
  zoominfo: 'has_zoominfo',
  google_search: 'has_google_search',
  slack: 'has_slack',
  zapier: 'has_zapier',
  google_sheets: 'has_google_sheets',
  notion: 'has_notion',
  google_analytics: 'has_google_analytics',
  mixpanel: 'has_mixpanel',
  segment: 'has_segment',
  typeform: 'has_typeform',
  jotform: 'has_jotform',
};
