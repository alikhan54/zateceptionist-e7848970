// src/contexts/SubscriptionContext.tsx
// COMPLETE SUBSCRIPTION TIER SYSTEM
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

// =====================================================
// TYPES
// =====================================================
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';

export interface TierLimits {
  // Lead Generation
  leads_per_month: number;
  b2b_searches_per_day: number;
  intent_searches_per_day: number;
  
  // Data Sources
  has_google_search: boolean;
  has_apollo_access: boolean;
  has_hunter_access: boolean;
  has_apify_access: boolean;
  has_ai_scoring: boolean;
  
  // Outreach
  active_sequences: number;
  emails_per_day: number;
  whatsapp_per_day: number;
  calls_per_day: number;
  sms_per_day: number;
  
  // Features
  has_enrichment: boolean;
  has_intent_leads: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_priority_support: boolean;
  has_custom_branding: boolean;
  has_advanced_analytics: boolean;
  has_crm_integration: boolean;
  
  // Team
  max_users: number;
  max_staff: number;
  
  // Storage & Voice
  storage_gb: number;
  voice_minutes: number;
}

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  price: number;
  yearlyPrice: number;
  description: string;
  limits: TierLimits;
  features: string[];
  badge?: string;
  color: string;
}

export interface UsageStats {
  // Monthly
  leads_generated: number;
  leads_limit: number;
  
  // Daily
  b2b_searches_today: number;
  b2b_limit: number;
  intent_searches_today: number;
  intent_limit: number;
  emails_sent_today: number;
  emails_limit: number;
  whatsapp_sent_today: number;
  whatsapp_limit: number;
  calls_today: number;
  calls_limit: number;
  
  // Period
  period_start: string;
  period_end: string;
  days_remaining: number;
}

// =====================================================
// TIER DEFINITIONS
// =====================================================
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 199,
    yearlyPrice: 1990,
    description: 'Perfect for small businesses getting started',
    color: 'blue',
    limits: {
      leads_per_month: 100,
      b2b_searches_per_day: 10,
      intent_searches_per_day: 0,
      has_google_search: true,
      has_apollo_access: false,
      has_hunter_access: false,
      has_apify_access: false,
      has_ai_scoring: true,
      active_sequences: 5,
      emails_per_day: 100,
      whatsapp_per_day: 50,
      calls_per_day: 20,
      sms_per_day: 50,
      has_enrichment: true,
      has_intent_leads: false,
      has_api_access: false,
      has_white_label: false,
      has_priority_support: false,
      has_custom_branding: false,
      has_advanced_analytics: false,
      has_crm_integration: false,
      max_users: 3,
      max_staff: 5,
      storage_gb: 5,
      voice_minutes: 100,
    },
    features: [
      '100 leads/month',
      'Google Search lead gen',
      'AI lead scoring',
      '5 active sequences',
      '100 emails/day',
      '50 WhatsApp messages/day',
      '20 voice calls/day',
      'Basic enrichment',
      '3 team members',
      '100 voice minutes',
      'Email support',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 499,
    yearlyPrice: 4990,
    description: 'For growing teams that need more power',
    badge: 'Most Popular',
    color: 'purple',
    limits: {
      leads_per_month: 500,
      b2b_searches_per_day: 25,
      intent_searches_per_day: 15,
      has_google_search: true,
      has_apollo_access: false,
      has_hunter_access: true,
      has_apify_access: false,
      has_ai_scoring: true,
      active_sequences: 20,
      emails_per_day: 300,
      whatsapp_per_day: 150,
      calls_per_day: 50,
      sms_per_day: 150,
      has_enrichment: true,
      has_intent_leads: true,
      has_api_access: false,
      has_white_label: false,
      has_priority_support: true,
      has_custom_branding: false,
      has_advanced_analytics: true,
      has_crm_integration: true,
      max_users: 10,
      max_staff: 20,
      storage_gb: 25,
      voice_minutes: 500,
    },
    features: [
      '500 leads/month',
      'Google + Hunter.io search',
      'Email verification',
      'Intent signal detection',
      '20 active sequences',
      '300 emails/day',
      '150 WhatsApp messages/day',
      '50 voice calls/day',
      'Advanced enrichment',
      '10 team members',
      '500 voice minutes',
      'Advanced analytics',
      'CRM integrations',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1999,
    yearlyPrice: 19990,
    description: 'Unlimited power for large organizations',
    badge: 'Best Value',
    color: 'amber',
    limits: {
      leads_per_month: 2000,
      b2b_searches_per_day: 100,
      intent_searches_per_day: 50,
      has_google_search: true,
      has_apollo_access: true,
      has_hunter_access: true,
      has_apify_access: true,
      has_ai_scoring: true,
      active_sequences: 100,
      emails_per_day: 1000,
      whatsapp_per_day: 500,
      calls_per_day: 200,
      sms_per_day: 500,
      has_enrichment: true,
      has_intent_leads: true,
      has_api_access: true,
      has_white_label: true,
      has_priority_support: true,
      has_custom_branding: true,
      has_advanced_analytics: true,
      has_crm_integration: true,
      max_users: -1, // Unlimited
      max_staff: -1, // Unlimited
      storage_gb: 100,
      voice_minutes: 2000,
    },
    features: [
      '2,000 leads/month',
      'Apollo + Hunter + Apify',
      'All premium data sources',
      'Full intent detection',
      '100 active sequences',
      '1,000 emails/day',
      '500 WhatsApp messages/day',
      '200 voice calls/day',
      'Premium enrichment',
      'Unlimited team members',
      '2,000 voice minutes',
      'White-label branding',
      'API access',
      'Custom integrations',
      'Dedicated support manager',
    ],
  },
};

// =====================================================
// CONTEXT
// =====================================================
interface SubscriptionContextType {
  tier: SubscriptionTier;
  tierConfig: TierConfig;
  limits: TierLimits;
  usage: UsageStats | null;
  isLoadingUsage: boolean;
  refreshUsage: () => Promise<void>;
  canUseFeature: (feature: keyof TierLimits) => boolean;
  hasReachedLimit: (limitType: string) => boolean;
  getRemainingCredits: (limitType: string) => number;
  getUsagePercentage: (limitType: string) => number;
  getUpgradeReason: (feature: string) => string;
  allTiers: TierConfig[];
  isFeatureLocked: (feature: keyof TierLimits) => boolean;
  getRequiredTierForFeature: (feature: keyof TierLimits) => SubscriptionTier | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { tenantId, tenantConfig } = useTenant();
  
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  
  // Get current tier from tenant config - map old plan names to new tiers
  const mapPlanToTier = (plan: string | undefined): SubscriptionTier => {
    const planMap: Record<string, SubscriptionTier> = {
      'free': 'starter',
      'starter': 'starter',
      'professional': 'professional',
      'enterprise': 'enterprise',
    };
    return planMap[plan || 'starter'] || 'starter';
  };
  
  // Use subscription_plan from tenant config
  const tier: SubscriptionTier = mapPlanToTier(
    (tenantConfig as unknown as Record<string, string> | null)?.subscription_tier || 
    (tenantConfig as unknown as Record<string, string> | null)?.subscription_plan
  );
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const limits = tierConfig.limits;
  
  // Fetch usage stats
  const fetchUsage = useCallback(async () => {
    if (!tenantId) {
      setIsLoadingUsage(false);
      return;
    }
    
    setIsLoadingUsage(true);
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Default usage stats - will be populated from actual data when tables exist
      setUsage({
        leads_generated: 0,
        leads_limit: limits.leads_per_month,
        b2b_searches_today: 0,
        b2b_limit: limits.b2b_searches_per_day,
        intent_searches_today: 0,
        intent_limit: limits.intent_searches_per_day,
        emails_sent_today: 0,
        emails_limit: limits.emails_per_day,
        whatsapp_sent_today: 0,
        whatsapp_limit: limits.whatsapp_per_day,
        calls_today: 0,
        calls_limit: limits.calls_per_day,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        days_remaining: daysRemaining,
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setIsLoadingUsage(false);
    }
  }, [tenantId, limits]);
  
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);
  
  // Check if feature is available
  const canUseFeature = useCallback((feature: keyof TierLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0 || value === -1;
    return false;
  }, [limits]);
  
  // Check if feature is locked (not available in current tier)
  const isFeatureLocked = useCallback((feature: keyof TierLimits): boolean => {
    return !canUseFeature(feature);
  }, [canUseFeature]);
  
  // Get which tier is required for a feature
  const getRequiredTierForFeature = useCallback((feature: keyof TierLimits): SubscriptionTier | null => {
    const tiers: SubscriptionTier[] = ['starter', 'professional', 'enterprise'];
    for (const t of tiers) {
      const tierLimits = SUBSCRIPTION_TIERS[t].limits;
      const value = tierLimits[feature];
      if (typeof value === 'boolean' && value) return t;
      if (typeof value === 'number' && (value > 0 || value === -1)) return t;
    }
    return null;
  }, []);
  
  // Check if limit reached
  const hasReachedLimit = useCallback((limitType: string): boolean => {
    if (!usage) return false;
    
    const limitMap: Record<string, [number, number]> = {
      leads: [usage.leads_generated, usage.leads_limit],
      b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
      intent_searches: [usage.intent_searches_today, usage.intent_limit],
      emails: [usage.emails_sent_today, usage.emails_limit],
      whatsapp: [usage.whatsapp_sent_today, usage.whatsapp_limit],
      calls: [usage.calls_today, usage.calls_limit],
    };
    
    const [used, limit] = limitMap[limitType] || [0, 0];
    return limit > 0 && used >= limit;
  }, [usage]);
  
  // Get remaining credits
  const getRemainingCredits = useCallback((limitType: string): number => {
    if (!usage) return 0;
    
    const limitMap: Record<string, [number, number]> = {
      leads: [usage.leads_generated, usage.leads_limit],
      b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
      intent_searches: [usage.intent_searches_today, usage.intent_limit],
      emails: [usage.emails_sent_today, usage.emails_limit],
      whatsapp: [usage.whatsapp_sent_today, usage.whatsapp_limit],
      calls: [usage.calls_today, usage.calls_limit],
    };
    
    const [used, limit] = limitMap[limitType] || [0, 0];
    return Math.max(0, limit - used);
  }, [usage]);
  
  // Get usage percentage
  const getUsagePercentage = useCallback((limitType: string): number => {
    if (!usage) return 0;
    
    const limitMap: Record<string, [number, number]> = {
      leads: [usage.leads_generated, usage.leads_limit],
      b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
      intent_searches: [usage.intent_searches_today, usage.intent_limit],
      emails: [usage.emails_sent_today, usage.emails_limit],
      whatsapp: [usage.whatsapp_sent_today, usage.whatsapp_limit],
      calls: [usage.calls_today, usage.calls_limit],
    };
    
    const [used, limit] = limitMap[limitType] || [0, 0];
    return limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  }, [usage]);
  
  // Get upgrade reason message
  const getUpgradeReason = useCallback((feature: string): string => {
    const upgradeMessages: Record<string, string> = {
      has_apollo_access: 'Upgrade to Enterprise for Apollo.io premium B2B data',
      has_hunter_access: 'Upgrade to Professional for Hunter.io email verification',
      has_apify_access: 'Upgrade to Enterprise for Apify web scraping',
      has_intent_leads: 'Upgrade to Professional for intent signal detection',
      has_api_access: 'Upgrade to Enterprise for API access',
      has_white_label: 'Upgrade to Enterprise for white-label branding',
      has_custom_branding: 'Upgrade to Enterprise for custom branding',
      has_advanced_analytics: 'Upgrade to Professional for advanced analytics',
      has_crm_integration: 'Upgrade to Professional for CRM integrations',
      leads: `You've reached your monthly lead limit. Upgrade for more leads.`,
      b2b_searches: `You've reached your daily search limit. Upgrade for more searches.`,
      intent_searches: `You've reached your daily intent search limit.`,
      emails: `You've reached your daily email limit.`,
      whatsapp: `You've reached your daily WhatsApp limit.`,
      calls: `You've reached your daily call limit.`,
    };
    return upgradeMessages[feature] || 'Upgrade your plan to access this feature';
  }, []);
  
  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        tierConfig,
        limits,
        usage,
        isLoadingUsage,
        refreshUsage: fetchUsage,
        canUseFeature,
        hasReachedLimit,
        getRemainingCredits,
        getUsagePercentage,
        getUpgradeReason,
        allTiers: Object.values(SUBSCRIPTION_TIERS),
        isFeatureLocked,
        getRequiredTierForFeature,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
