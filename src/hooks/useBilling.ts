import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook } from '@/lib/api/webhooks';

export interface Subscription {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: 'free' | 'starter' | 'professional' | 'enterprise';
  plan_name: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  current_period_end: string | null;
  trial_end: string | null;
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

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started with basic features',
    features: [
      'Up to 3 team members',
      '1,000 API calls/month',
      '1 GB storage',
      'Basic AI features',
      'Email support',
    ],
    limits: { users: 3, api_calls: 1000, storage_gb: 1, voice_minutes: 0 },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 199,
    description: 'Perfect for small businesses',
    features: [
      'Up to 5 team members',
      '5,000 API calls/month',
      '5 GB storage',
      '100 voice minutes',
      'WhatsApp integration',
      'Priority email support',
    ],
    limits: { users: 5, api_calls: 5000, storage_gb: 5, voice_minutes: 100 },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 499,
    description: 'Scale your operations',
    features: [
      'Up to 15 team members',
      '25,000 API calls/month',
      '25 GB storage',
      '500 voice minutes',
      'All integrations',
      'AI insights & reports',
      'Phone support',
    ],
    limits: { users: 15, api_calls: 25000, storage_gb: 25, voice_minutes: 500 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1999,
    description: 'Full power with white-label',
    features: [
      'Unlimited team members',
      'Unlimited API calls',
      '100 GB storage',
      '2,000 voice minutes',
      'White-label branding',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 priority support',
    ],
    limits: { users: -1, api_calls: -1, storage_gb: 100, voice_minutes: 2000 },
  },
];

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

  const currentPlan = PLANS.find(p => p.id === subscription?.plan_id) || PLANS[0];

  return {
    subscription,
    billingHistory: billingHistory ?? [],
    isLoading: subscriptionLoading || historyLoading,
    currentPlan,
    plans: PLANS,
    createCheckoutSession,
    createCustomerPortal,
  };
}
