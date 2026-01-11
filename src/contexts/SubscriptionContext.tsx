// src/contexts/SubscriptionContext.tsx
// FIXED - READS FROM DATABASE
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export type SubscriptionTier = "starter" | "professional" | "enterprise";

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
  limits: TierLimits;
  features: string[];
}

// DEFAULT TIER CONFIGS
const TIER_DEFAULTS: Record<SubscriptionTier, TierLimits> = {
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
    max_users: -1,
    voice_minutes: 2000,
  },
};

const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 199,
    limits: TIER_DEFAULTS.starter,
    features: ["100 leads/month", "Google Search", "5 sequences"],
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: 499,
    limits: TIER_DEFAULTS.professional,
    features: ["500 leads/month", "Google + Hunter", "Intent Detection", "20 sequences"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 1999,
    limits: TIER_DEFAULTS.enterprise,
    features: ["2000 leads/month", "All Sources", "White Label", "Unlimited"],
  },
};

export interface UsageStats {
  leads_generated: number;
  leads_limit: number;
  b2b_searches_today: number;
  b2b_limit: number;
  intent_searches_today: number;
  intent_limit: number;
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
    const dbTier = tenantConfig?.subscription_tier;
    if (dbTier === "enterprise" || dbTier === "professional" || dbTier === "starter") {
      return dbTier;
    }
    return "starter";
  }, [tenantConfig?.subscription_tier]);

  const tierConfig = TIER_CONFIGS[tier];

  // BUILD LIMITS - combine DB values with tier defaults
  const limits: TierLimits = useMemo(() => {
    const defaults = TIER_DEFAULTS[tier];

    // Check if tenant has API keys (override tier restrictions if they have keys)
    const hasApolloKey = !!tenantConfig?.apollo_api_key;
    const hasHunterKey = !!tenantConfig?.hunter_api_key;
    const hasApifyKey = !!tenantConfig?.apify_api_key;

    return {
      ...defaults,
      // Use DB values if available, otherwise use tier defaults
      leads_per_month: tenantConfig?.leads_per_month || defaults.leads_per_month,
      b2b_searches_per_day: tenantConfig?.b2b_searches_per_day || defaults.b2b_searches_per_day,
      intent_searches_per_day: tenantConfig?.intent_searches_per_day || defaults.intent_searches_per_day,
      // API access based on tier OR having the key
      has_apollo_access: defaults.has_apollo_access || hasApolloKey,
      has_hunter_access: defaults.has_hunter_access || hasHunterKey,
      has_apify_access: defaults.has_apify_access || hasApifyKey,
      // Intent leads available if tier allows OR if intent_searches > 0
      has_intent_leads: defaults.has_intent_leads || (tenantConfig?.intent_searches_per_day || 0) > 0,
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
        days_remaining,
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
        allTiers: Object.values(TIER_CONFIGS),
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
