// src/contexts/SubscriptionContext.tsx
// COMPLETE FIX - READS FROM DATABASE + EXPORTS ALL NEEDED
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";

export interface TierLimits {
  leads_per_month: number;
  b2b_searches_per_day: number;
  intent_searches_per_day: number;
  has_google_search: boolean;
  has_apollo_access: boolean;
  has_hunter_access: boolean;
  has_apify_access: boolean;
  has_ai_scoring: boolean;
  has_intent_leads: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  active_sequences: number;
  emails_per_day: number;
  whatsapp_per_day: number;
  calls_per_day: number;
  max_users: number;
  voice_minutes: number;
}

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  price: number;
  yearlyPrice: number;
  limits: TierLimits;
  features: string[];
  description: string;
  badge?: string;
}

// DEFAULT TIER LIMITS
const TIER_DEFAULTS: Record<SubscriptionTier, TierLimits> = {
  free: {
    leads_per_month: 10,
    b2b_searches_per_day: 3,
    intent_searches_per_day: 0,
    has_google_search: true,
    has_apollo_access: false,
    has_hunter_access: false,
    has_apify_access: false,
    has_ai_scoring: false,
    has_intent_leads: false,
    has_api_access: false,
    has_white_label: false,
    active_sequences: 1,
    emails_per_day: 10,
    whatsapp_per_day: 5,
    calls_per_day: 2,
    max_users: 1,
    voice_minutes: 10,
  },
  starter: {
    leads_per_month: 100,
    b2b_searches_per_day: 10,
    intent_searches_per_day: 0,
    has_google_search: true,
    has_apollo_access: false,
    has_hunter_access: false,
    has_apify_access: false,
    has_ai_scoring: true,
    has_intent_leads: false,
    has_api_access: false,
    has_white_label: false,
    active_sequences: 5,
    emails_per_day: 100,
    whatsapp_per_day: 50,
    calls_per_day: 20,
    max_users: 3,
    voice_minutes: 100,
  },
  professional: {
    leads_per_month: 500,
    b2b_searches_per_day: 25,
    intent_searches_per_day: 15,
    has_google_search: true,
    has_apollo_access: false,
    has_hunter_access: true,
    has_apify_access: false,
    has_ai_scoring: true,
    has_intent_leads: true,
    has_api_access: false,
    has_white_label: false,
    active_sequences: 20,
    emails_per_day: 300,
    whatsapp_per_day: 150,
    calls_per_day: 50,
    max_users: 10,
    voice_minutes: 500,
  },
  enterprise: {
    leads_per_month: 2000,
    b2b_searches_per_day: 100,
    intent_searches_per_day: 50,
    has_google_search: true,
    has_apollo_access: true,
    has_hunter_access: true,
    has_apify_access: true,
    has_ai_scoring: true,
    has_intent_leads: true,
    has_api_access: true,
    has_white_label: true,
    active_sequences: 100,
    emails_per_day: 1000,
    whatsapp_per_day: 500,
    calls_per_day: 200,
    max_users: -1, // unlimited
    voice_minutes: 2000,
  },
};

// FULL TIER CONFIGS - EXPORTED FOR BILLING PAGE
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: "free",
    name: "Free Trial",
    price: 0,
    yearlyPrice: 0,
    description: "Try out the platform with limited features",
    limits: TIER_DEFAULTS.free,
    features: [
      "10 leads per month",
      "Google Search only",
      "1 active sequence",
      "10 emails per day",
      "5 WhatsApp messages per day",
      "2 voice calls per day",
      "1 team member",
      "10 voice minutes",
      "Community support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 199,
    yearlyPrice: 1990,
    description: "Perfect for small businesses getting started with AI automation",
    limits: TIER_DEFAULTS.starter,
    features: [
      "100 leads per month",
      "Google Search leads",
      "AI lead scoring",
      "5 active sequences",
      "100 emails per day",
      "50 WhatsApp messages per day",
      "20 AI calls per day",
      "3 team members",
      "100 voice minutes",
      "Email support",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: 499,
    yearlyPrice: 4990,
    description: "For growing teams that need more power and premium data sources",
    badge: "Most Popular",
    limits: TIER_DEFAULTS.professional,
    features: [
      "500 leads per month",
      "Google + Hunter.io",
      "B2C Intent Detection",
      "AI lead scoring",
      "20 active sequences",
      "300 emails per day",
      "150 WhatsApp messages per day",
      "50 AI calls per day",
      "10 team members",
      "500 voice minutes",
      "Priority support",
      "Advanced analytics",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 1999,
    yearlyPrice: 19990,
    description: "Full power for agencies and enterprises with white-label options",
    badge: "Best Value",
    limits: TIER_DEFAULTS.enterprise,
    features: [
      "2000 leads per month",
      "All data sources (Apollo, Hunter, Apify)",
      "B2C Intent Detection",
      "AI lead scoring",
      "100 active sequences",
      "1000 emails per day",
      "500 WhatsApp messages per day",
      "200 AI calls per day",
      "Unlimited team members",
      "2000 voice minutes",
      "White-label branding",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
  },
};

export interface UsageStats {
  leads_generated: number;
  leads_limit: number;
  b2b_searches_today: number;
  b2b_limit: number;
  intent_searches_today: number;
  intent_limit: number;
  emails_sent_today: number;
  emails_limit: number;
  whatsapp_sent_today: number;
  whatsapp_limit: number;
  days_remaining: number;
}

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
  allTiers: TierConfig[];
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { tenantId, tenantConfig } = useTenant();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  // GET TIER FROM DATABASE via tenantConfig
  const tier: SubscriptionTier = useMemo(() => {
    const dbTier = (tenantConfig as any)?.subscription_tier;
    if (dbTier === "enterprise" || dbTier === "professional" || dbTier === "starter" || dbTier === "free") {
      return dbTier;
    }
    return "free"; // Changed from "starter" to "free"
  }, [(tenantConfig as any)?.subscription_tier]);

  const tierConfig = SUBSCRIPTION_TIERS[tier];

  // BUILD LIMITS - combine DB values with tier defaults
  const limits: TierLimits = useMemo(() => {
    const defaults = TIER_DEFAULTS[tier];
    const config = tenantConfig as any;

    // Check if tenant has API keys (override tier restrictions if they have keys)
    const hasApolloKey = !!config?.apollo_api_key;
    const hasHunterKey = !!config?.hunter_api_key;
    const hasApifyKey = !!config?.apify_api_key;

    return {
      ...defaults,
      // Use DB values if available, otherwise use tier defaults
      leads_per_month: config?.leads_per_month || defaults.leads_per_month,
      b2b_searches_per_day: config?.b2b_searches_per_day || defaults.b2b_searches_per_day,
      intent_searches_per_day: config?.intent_searches_per_day || defaults.intent_searches_per_day,
      // API access based on tier OR having the key
      has_apollo_access: defaults.has_apollo_access || hasApolloKey,
      has_hunter_access: defaults.has_hunter_access || hasHunterKey,
      has_apify_access: defaults.has_apify_access || hasApifyKey,
      // Intent leads available if tier allows OR if intent_searches > 0
      has_intent_leads: defaults.has_intent_leads || (config?.intent_searches_per_day || 0) > 0,
    };
  }, [tier, tenantConfig]);

  // FETCH USAGE FROM DATABASE
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

      // Fetch from lead_gen_credits
      const { data: creditsData } = await supabase
        .from("lead_gen_credits")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("period_start", periodStart.toISOString().split("T")[0])
        .maybeSingle();

      setUsage({
        leads_generated: creditsData?.leads_generated || 0,
        leads_limit: limits.leads_per_month,
        b2b_searches_today: creditsData?.b2b_searches_today || 0,
        b2b_limit: limits.b2b_searches_per_day,
        intent_searches_today: creditsData?.intent_searches_today || 0,
        intent_limit: limits.intent_searches_per_day,
        emails_sent_today: 0,
        emails_limit: limits.emails_per_day,
        whatsapp_sent_today: 0,
        whatsapp_limit: limits.whatsapp_per_day,
        days_remaining: daysRemaining,
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      // Set defaults on error
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
        days_remaining: 30,
      });
    } finally {
      setIsLoadingUsage(false);
    }
  }, [tenantId, limits]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const canUseFeature = useCallback(
    (feature: keyof TierLimits): boolean => {
      const value = limits[feature];
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value > 0 || value === -1;
      return false;
    },
    [limits],
  );

  const hasReachedLimit = useCallback(
    (limitType: string): boolean => {
      if (!usage) return false;
      const map: Record<string, [number, number]> = {
        leads: [usage.leads_generated, usage.leads_limit],
        b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
        intent_searches: [usage.intent_searches_today, usage.intent_limit],
      };
      const [used, limit] = map[limitType] || [0, 0];
      return limit > 0 && used >= limit;
    },
    [usage],
  );

  const getRemainingCredits = useCallback(
    (limitType: string): number => {
      if (!usage) return 100; // Default to allow actions
      const map: Record<string, [number, number]> = {
        leads: [usage.leads_generated, usage.leads_limit],
        b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
        intent_searches: [usage.intent_searches_today, usage.intent_limit],
      };
      const [used, limit] = map[limitType] || [0, 100];
      return Math.max(0, limit - used);
    },
    [usage],
  );

  const getUsagePercentage = useCallback(
    (limitType: string): number => {
      if (!usage) return 0;
      const map: Record<string, [number, number]> = {
        leads: [usage.leads_generated, usage.leads_limit],
        b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
        intent_searches: [usage.intent_searches_today, usage.intent_limit],
      };
      const [used, limit] = map[limitType] || [0, 100];
      return limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    },
    [usage],
  );

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
        allTiers: Object.values(SUBSCRIPTION_TIERS),
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
