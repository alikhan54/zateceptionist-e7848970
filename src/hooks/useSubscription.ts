import { useTenant } from '@/contexts/TenantContext';

export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface FeatureAccess {
  // Free features
  inbox: boolean;
  appointments: boolean;
  customers: boolean;
  tasks: boolean;
  basic_reports: boolean;
  
  // Starter features ($29/mo)
  email_campaigns: boolean;
  basic_automation: boolean;
  team_3: boolean;
  
  // Professional features ($99/mo)
  voice_ai: boolean;
  lead_gen: boolean;
  whatsapp: boolean;
  instagram: boolean;
  facebook: boolean;
  marketing_ai: boolean;
  sales_ai: boolean;
  hr_module: boolean;
  unlimited_team: boolean;
  
  // Enterprise features ($299/mo)
  api_access: boolean;
  custom_integrations: boolean;
  priority_support: boolean;
  white_label: boolean;
}

const planFeatures: Record<SubscriptionPlan, FeatureAccess> = {
  free: {
    inbox: true,
    appointments: true,
    customers: true,
    tasks: true,
    basic_reports: true,
    email_campaigns: false,
    basic_automation: false,
    team_3: false,
    voice_ai: false,
    lead_gen: false,
    whatsapp: false,
    instagram: false,
    facebook: false,
    marketing_ai: false,
    sales_ai: false,
    hr_module: false,
    unlimited_team: false,
    api_access: false,
    custom_integrations: false,
    priority_support: false,
    white_label: false,
  },
  starter: {
    inbox: true,
    appointments: true,
    customers: true,
    tasks: true,
    basic_reports: true,
    email_campaigns: true,
    basic_automation: true,
    team_3: true,
    voice_ai: false,
    lead_gen: false,
    whatsapp: false,
    instagram: false,
    facebook: false,
    marketing_ai: false,
    sales_ai: false,
    hr_module: false,
    unlimited_team: false,
    api_access: false,
    custom_integrations: false,
    priority_support: false,
    white_label: false,
  },
  professional: {
    inbox: true,
    appointments: true,
    customers: true,
    tasks: true,
    basic_reports: true,
    email_campaigns: true,
    basic_automation: true,
    team_3: true,
    voice_ai: true,
    lead_gen: true,
    whatsapp: true,
    instagram: true,
    facebook: true,
    marketing_ai: true,
    sales_ai: true,
    hr_module: true,
    unlimited_team: true,
    api_access: false,
    custom_integrations: false,
    priority_support: false,
    white_label: false,
  },
  enterprise: {
    inbox: true,
    appointments: true,
    customers: true,
    tasks: true,
    basic_reports: true,
    email_campaigns: true,
    basic_automation: true,
    team_3: true,
    voice_ai: true,
    lead_gen: true,
    whatsapp: true,
    instagram: true,
    facebook: true,
    marketing_ai: true,
    sales_ai: true,
    hr_module: true,
    unlimited_team: true,
    api_access: true,
    custom_integrations: true,
    priority_support: true,
    white_label: true,
  },
};

// Which plan is required for each feature
const featureRequiredPlan: Record<keyof FeatureAccess, SubscriptionPlan> = {
  inbox: 'free',
  appointments: 'free',
  customers: 'free',
  tasks: 'free',
  basic_reports: 'free',
  email_campaigns: 'starter',
  basic_automation: 'starter',
  team_3: 'starter',
  voice_ai: 'professional',
  lead_gen: 'professional',
  whatsapp: 'professional',
  instagram: 'professional',
  facebook: 'professional',
  marketing_ai: 'professional',
  sales_ai: 'professional',
  hr_module: 'professional',
  unlimited_team: 'professional',
  api_access: 'enterprise',
  custom_integrations: 'enterprise',
  priority_support: 'enterprise',
  white_label: 'enterprise',
};

export function useSubscription() {
  const { tenantConfig } = useTenant();
  const plan = (tenantConfig?.subscription_plan || 'free') as SubscriptionPlan;
  const features = planFeatures[plan];
  
  const canAccess = (feature: keyof FeatureAccess): boolean => {
    return features[feature] === true;
  };
  
  const requiresUpgrade = (feature: keyof FeatureAccess): boolean => {
    return !features[feature];
  };

  const getRequiredPlan = (feature: keyof FeatureAccess): SubscriptionPlan => {
    return featureRequiredPlan[feature];
  };

  const getPlanDisplayName = (planName: SubscriptionPlan): string => {
    const names: Record<SubscriptionPlan, string> = {
      free: 'Free',
      starter: 'Starter ($29/mo)',
      professional: 'Professional ($99/mo)',
      enterprise: 'Enterprise ($299/mo)',
    };
    return names[planName];
  };
  
  return { plan, features, canAccess, requiresUpgrade, getRequiredPlan, getPlanDisplayName };
}
