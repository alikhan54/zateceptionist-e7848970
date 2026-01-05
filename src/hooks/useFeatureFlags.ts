import { useTenant } from '@/contexts/TenantContext';

export interface FeatureFlags {
  sales_module: boolean;
  marketing_module: boolean;
  hr_module: boolean;
  operations_module: boolean;
  communications_module: boolean;
  analytics_module: boolean;
  has_voice: boolean;
  has_whatsapp: boolean;
  has_email: boolean;
  has_sms: boolean;
  ai_insights: boolean;
  custom_reports: boolean;
}

export function useFeatureFlags() {
  const { tenantConfig } = useTenant();

  const isEnabled = (feature: keyof FeatureFlags | string): boolean => {
    if (!tenantConfig?.features) return true; // Default to enabled if no config
    const value = tenantConfig.features[feature];
    return value !== false; // Treat undefined as enabled
  };

  const features: FeatureFlags = {
    sales_module: isEnabled('sales_module'),
    marketing_module: isEnabled('marketing_module'),
    hr_module: isEnabled('hr_module'),
    operations_module: isEnabled('operations_module'),
    communications_module: isEnabled('communications_module'),
    analytics_module: isEnabled('analytics_module'),
    has_voice: isEnabled('has_voice'),
    has_whatsapp: isEnabled('has_whatsapp'),
    has_email: isEnabled('has_email'),
    has_sms: isEnabled('has_sms'),
    ai_insights: isEnabled('ai_insights'),
    custom_reports: isEnabled('custom_reports'),
  };

  return { isEnabled, features };
}
