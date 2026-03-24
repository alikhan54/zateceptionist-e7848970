// Subscription tier definitions for the 420 System
// Used by: useBilling hook, pricing pages, usage enforcement

export type SubscriptionTierId = 'free_trial' | 'starter' | 'professional' | 'enterprise';

export interface TierLimits {
  messages_per_month: number;
  leads_per_month: number;
  channels: number;
  team_members: number;
  ai_calls_per_day: number;
  voice_minutes: number;
  storage_mb: number;
}

export interface SubscriptionTier {
  id: SubscriptionTierId;
  name: string;
  price: number;
  period: string;
  paddle_price_id: string | null;
  popular?: boolean;
  limits: TierLimits;
  features: string[];
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTierId, SubscriptionTier> = {
  free_trial: {
    id: 'free_trial',
    name: 'Free Trial',
    price: 0,
    period: '2 days',
    paddle_price_id: null,
    limits: {
      messages_per_month: 50,
      leads_per_month: 10,
      channels: 1,
      team_members: 1,
      ai_calls_per_day: 5,
      voice_minutes: 0,
      storage_mb: 100,
    },
    features: [
      '50 messages total',
      '10 leads',
      '1 channel only',
      'Basic AI (limited)',
      'No voice AI',
      'Email support only',
    ],
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    price: 99,
    period: 'month',
    paddle_price_id: 'pri_PLACEHOLDER_STARTER', // Replace after Paddle approval
    limits: {
      messages_per_month: 1000,
      leads_per_month: 100,
      channels: 3,
      team_members: 3,
      ai_calls_per_day: 50,
      voice_minutes: 30,
      storage_mb: 1000,
    },
    features: [
      '1,000 messages/month',
      '100 leads/month',
      '3 channels',
      '3 team members',
      '30 voice minutes',
      'Email support',
    ],
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    price: 499,
    period: 'month',
    paddle_price_id: 'pri_PLACEHOLDER_PROFESSIONAL',
    popular: true,
    limits: {
      messages_per_month: 5000,
      leads_per_month: 500,
      channels: 999,
      team_members: 10,
      ai_calls_per_day: 200,
      voice_minutes: 150,
      storage_mb: 5000,
    },
    features: [
      '5,000 messages/month',
      '500 leads/month',
      'All channels',
      '10 team members',
      '150 voice minutes',
      'Priority support',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1499,
    period: 'month',
    paddle_price_id: 'pri_PLACEHOLDER_ENTERPRISE',
    limits: {
      messages_per_month: 20000,
      leads_per_month: 2000,
      channels: 999,
      team_members: 999,
      ai_calls_per_day: 999,
      voice_minutes: 500,
      storage_mb: 25000,
    },
    features: [
      '20,000 messages/month',
      '2,000 leads/month',
      'Unlimited channels',
      'Unlimited team members',
      '500 voice minutes',
      'White-label branding',
      'Dedicated support',
    ],
  },
};

// Helper to get tier by ID with fallback
export function getTier(tierId: string | null | undefined): SubscriptionTier {
  return SUBSCRIPTION_TIERS[(tierId as SubscriptionTierId)] || SUBSCRIPTION_TIERS.free_trial;
}

// Usage type mapping for display
export const USAGE_TYPE_LABELS: Record<string, string> = {
  messages: 'Messages',
  leads: 'Leads',
  voice_minutes: 'Voice Minutes',
  ai_calls: 'AI Calls',
};
