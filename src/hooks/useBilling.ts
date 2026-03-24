import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook } from '@/lib/api/webhooks';
import { SUBSCRIPTION_TIERS, getTier, type SubscriptionTierId } from '@/lib/pricing';

export interface Subscription {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
  plan_id: string;
  plan_name: string;
  subscription_tier: string | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'cancelled' | 'unpaid';
  current_period_end: string | null;
  trial_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  monthly_price: number;
  features: {
    users: number;
    api_calls: number;
    storage_gb: number;
    voice_minutes: number;
  };
}

export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  description: string;
  invoice_url: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  tier: string;
  usage_type: string;
}

// New pricing tiers (Paddle-based, replaces old Stripe PLANS)
export const PLANS = Object.values(SUBSCRIPTION_TIERS).map(tier => ({
  id: tier.id,
  name: tier.name,
  price: tier.price,
  description: tier.id === 'free_trial' ? 'Try before you buy'
    : tier.id === 'starter' ? 'Perfect for small businesses'
    : tier.id === 'professional' ? 'Scale your operations'
    : 'Full power with white-label',
  features: tier.features,
  limits: {
    users: tier.limits.team_members,
    api_calls: tier.limits.ai_calls_per_day * 30,
    storage_gb: Math.round(tier.limits.storage_mb / 1000),
    voice_minutes: tier.limits.voice_minutes,
  },
  popular: tier.popular || false,
  paddle_price_id: tier.paddle_price_id,
}));

export function useBilling() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Subscription | null;
    },
    enabled: !!tenantId,
  });

  const { data: billingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['billing-history', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as BillingHistoryItem[];
    },
    enabled: !!tenantId,
  });

  const createCheckoutSession = useMutation({
    mutationFn: async (planId: string) => {
      const response = await callWebhook(
        '/billing/create-checkout',
        {
          tenant_id: tenantId,
          plan_id: planId,
          success_url: `${window.location.origin}/settings/billing?success=true`,
          cancel_url: `${window.location.origin}/settings/billing?canceled=true`,
        },
        tenantId || ''
      );
      
      const data = response.data as { url?: string } | undefined;
      if (response.success && data?.url) {
        window.location.href = data.url;
      }
      
      return response;
    },
  });

  const createCustomerPortal = useMutation({
    mutationFn: async () => {
      const response = await callWebhook(
        '/billing/customer-portal',
        {
          tenant_id: tenantId,
          return_url: `${window.location.origin}/settings/billing`,
        },
        tenantId || ''
      );
      
      const data = response.data as { url?: string } | undefined;
      if (response.success && data?.url) {
        window.location.href = data.url;
      }
      
      return response;
    },
  });

  // Usage tracking
  const { data: usageData } = useQuery({
    queryKey: ['usage', tenantId],
    queryFn: async () => {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('usage_records')
        .select('usage_type, quantity')
        .eq('tenant_id', tenantId)
        .gte('period_start', periodStart.toISOString().split('T')[0]);
      if (error) return {};
      const usageMap: Record<string, number> = {};
      data?.forEach(r => { usageMap[r.usage_type] = r.quantity; });
      return usageMap;
    },
    enabled: !!tenantId,
  });

  const checkLimit = async (usageType: string, amount = 1): Promise<UsageCheckResult> => {
    try {
      const response = await callWebhook(
        '/billing/check-usage',
        { tenant_id: tenantId, usage_type: usageType, amount },
        tenantId || '',
      );
      return response.data as UsageCheckResult;
    } catch {
      return { allowed: true, current: 0, limit: 999999, remaining: 999999, tier: 'unknown', usage_type: usageType };
    }
  };

  const incrementUsage = async (usageType: string, amount = 1) => {
    try {
      const response = await callWebhook(
        '/billing/increment-usage',
        { tenant_id: tenantId, usage_type: usageType, amount },
        tenantId || '',
      );
      queryClient.invalidateQueries({ queryKey: ['usage', tenantId] });
      return response.data;
    } catch {
      return { success: false, error: 'Failed to record usage' };
    }
  };

  const currentTierId = (subscription?.subscription_tier || subscription?.plan_id || 'free_trial') as SubscriptionTierId;
  const currentTier = getTier(currentTierId);
  const currentPlan = PLANS.find(p => p.id === subscription?.plan_id) || PLANS[0];

  return {
    subscription,
    billingHistory: billingHistory ?? [],
    isLoading: subscriptionLoading || historyLoading,
    currentPlan,
    currentTier,
    currentTierId,
    plans: PLANS,
    tiers: SUBSCRIPTION_TIERS,
    usage: usageData || {},
    createCheckoutSession,
    createCustomerPortal,
    checkLimit,
    incrementUsage,
    isFreeTrial: currentTierId === 'free_trial',
    isPaid: ['starter', 'professional', 'enterprise'].includes(currentTierId),
  };
}
