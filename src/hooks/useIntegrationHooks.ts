// =====================================================
// PROJECT 420: INTEGRATION HOOKS
// Cross-system intelligence for unified AI platform
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

// ============================================
// 1. useCustomer360 - Unified Customer Intelligence
// ============================================

export interface Customer360 {
  id: string;
  tenant_id: string;
  customer_id: string;
  preferred_channel: string;
  best_contact_time: string;
  best_contact_day: string;
  timezone: string;
  language: string;
  overall_engagement_score: number;
  email_engagement_score: number;
  whatsapp_engagement_score: number;
  voice_engagement_score: number;
  social_engagement_score: number;
  lifetime_value: number;
  churn_risk_score: number;
  upsell_probability: number;
  ai_predicted_intent: string;
  ai_recommended_offer: string;
  ai_recommended_channel: string;
  marketing_opt_in: boolean;
  content_interests: string[];
  created_at: string;
  updated_at: string;
}

export function useCustomer360(customerId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer_360', tenantUuid, customerId],
    queryFn: async () => {
      if (!tenantUuid) return customerId ? null : [];

      let query = supabase
        .from('customer_360')
        .select('*')
        .eq('tenant_id', tenantUuid);

      if (customerId) {
        const { data, error } = await query.eq('customer_id', customerId).maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await query.order('overall_engagement_score', { ascending: false });
        if (error) throw error;
        return data;
      }
    },
    enabled: !!tenantUuid,
  });

  const { data: churnRisks = [] } = useQuery({
    queryKey: ['customer_360_churn', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('customer_360')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .gte('churn_risk_score', 70)
        .order('churn_risk_score', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const updateIntelligence = useMutation({
    mutationFn: async ({ customerId, updates }: { customerId: string; updates: Partial<Customer360> }) => {
      const { data, error } = await supabase
        .from('customer_360')
        .upsert({
          tenant_id: tenantUuid,
          customer_id: customerId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,customer_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_360', tenantUuid] });
    },
  });

  return {
    customer: customerId ? data as Customer360 | null : null,
    customers: !customerId ? (data as Customer360[] || []) : [],
    churnRisks,
    isLoading,
    error,
    updateIntelligence,
  };
}


// ============================================
// 2. useSystemEvents - Cross-System Event Log
// ============================================

export interface SystemEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  event_source: string;
  event_action: string;
  event_severity: string;
  customer_id?: string;
  lead_id?: string;
  deal_id?: string;
  campaign_id?: string;
  event_data: Record<string, unknown>;
  event_summary: string;
  triggered_by: string;
  created_at: string;
}

export function useSystemEvents(options?: {
  eventType?: string;
  eventSource?: string;
  customerId?: string;
  limit?: number;
}) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['system_events', tenantUuid, options],
    queryFn: async () => {
      if (!tenantUuid) return [];

      let query = supabase
        .from('system_events')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.eventType) query = query.eq('event_type', options.eventType);
      if (options?.eventSource) query = query.eq('event_source', options.eventSource);
      if (options?.customerId) query = query.eq('customer_id', options.customerId);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const logEvent = useMutation({
    mutationFn: async (event: Omit<SystemEvent, 'id' | 'tenant_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('system_events')
        .insert({
          tenant_id: tenantUuid,
          ...event,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_events', tenantUuid] });
    },
  });

  const eventCounts = events.reduce((acc: Record<string, number>, e: SystemEvent) => {
    acc[e.event_source] = (acc[e.event_source] || 0) + 1;
    return acc;
  }, {});

  return { events, isLoading, logEvent, eventCounts };
}


// ============================================
// 3. useRevenueAttribution - ROI Tracking
// ============================================

export interface RevenueAttribution {
  id: string;
  tenant_id: string;
  deal_id: string;
  customer_id: string;
  revenue_amount: number;
  revenue_date: string;
  attribution_model: string;
  touchpoints: Array<{
    channel: string;
    campaign_id?: string;
    timestamp: string;
    weight: number;
  }>;
  email_attributed: number;
  whatsapp_attributed: number;
  voice_attributed: number;
  social_attributed: number;
  campaigns_attributed: Record<string, number>;
  primary_source: string;
}

export function useRevenueAttribution(options?: {
  startDate?: string;
  endDate?: string;
  model?: string;
}) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const { data: attributions = [], isLoading } = useQuery({
    queryKey: ['revenue_attribution', tenantUuid, options],
    queryFn: async () => {
      if (!tenantUuid) return [];

      let query = supabase
        .from('revenue_attribution')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('revenue_date', { ascending: false });

      if (options?.startDate) query = query.gte('revenue_date', options.startDate);
      if (options?.endDate) query = query.lte('revenue_date', options.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const channelROI = attributions.reduce((acc: Record<string, number>, a: RevenueAttribution) => {
    acc.email = (acc.email || 0) + (a.email_attributed || 0);
    acc.whatsapp = (acc.whatsapp || 0) + (a.whatsapp_attributed || 0);
    acc.voice = (acc.voice || 0) + (a.voice_attributed || 0);
    acc.social = (acc.social || 0) + (a.social_attributed || 0);
    return acc;
  }, {});

  const totalRevenue = attributions.reduce((sum: number, a: RevenueAttribution) => sum + (a.revenue_amount || 0), 0);

  const createAttribution = useMutation({
    mutationFn: async (data: Omit<RevenueAttribution, 'id' | 'tenant_id'>) => {
      const { data: result, error } = await supabase
        .from('revenue_attribution')
        .insert({ tenant_id: tenantUuid, ...data })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue_attribution', tenantUuid] });
    },
  });

  return {
    attributions,
    isLoading,
    channelROI,
    totalRevenue,
    createAttribution,
  };
}


// ============================================
// 4. usePredictiveScores - AI Predictions
// ============================================

export interface PredictiveScore {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  prediction_type: string;
  score: number;
  confidence: number;
  positive_factors: Array<{ factor: string; weight: number }>;
  negative_factors: Array<{ factor: string; weight: number }>;
  recommended_actions: Array<{ action: string; priority: number }>;
  is_current: boolean;
  actual_outcome?: boolean;
}

export function usePredictiveScores(options?: {
  entityType?: string;
  entityId?: string;
  predictionType?: string;
}) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['predictive_scores', tenantUuid, options],
    queryFn: async () => {
      if (!tenantUuid) return [];

      let query = supabase
        .from('predictive_scores')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .eq('is_current', true)
        .order('score', { ascending: false });

      if (options?.entityType) query = query.eq('entity_type', options.entityType);
      if (options?.entityId) query = query.eq('entity_id', options.entityId);
      if (options?.predictionType) query = query.eq('prediction_type', options.predictionType);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const highRisk = scores.filter((s: PredictiveScore) => s.score >= 70);

  const byType = scores.reduce((acc: Record<string, PredictiveScore[]>, s: PredictiveScore) => {
    if (!acc[s.prediction_type]) acc[s.prediction_type] = [];
    acc[s.prediction_type].push(s);
    return acc;
  }, {});

  const recordOutcome = useMutation({
    mutationFn: async ({ id, outcome }: { id: string; outcome: boolean }) => {
      const { data, error } = await supabase
        .from('predictive_scores')
        .update({
          actual_outcome: outcome,
          outcome_recorded_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive_scores', tenantUuid] });
    },
  });

  return { scores, isLoading, highRisk, byType, recordOutcome };
}


// ============================================
// 5. useAutomationRules - Custom Automation
// ============================================

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  category: string;
  trigger_event: string;
  trigger_source: string;
  trigger_conditions: Array<{ field: string; operator: string; value: unknown }>;
  actions: Array<{ type: string; config: Record<string, unknown> }>;
  is_active: boolean;
  priority: number;
  execution_count: number;
  success_count: number;
  last_executed_at: string;
}

export function useAutomationRules() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation_rules', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('priority', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<AutomationRule, 'id' | 'tenant_id' | 'execution_count' | 'success_count' | 'last_executed_at'>) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          tenant_id: tenantUuid,
          ...rule,
          execution_count: 0,
          success_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules', tenantUuid] });
      toast({ title: 'Automation Rule Created' });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules', tenantUuid] });
      toast({ title: data.is_active ? 'Rule Activated' : 'Rule Deactivated' });
    },
  });

  const stats = {
    total: rules.length,
    active: rules.filter((r: AutomationRule) => r.is_active).length,
    totalExecutions: rules.reduce((sum: number, r: AutomationRule) => sum + (r.execution_count || 0), 0),
    successRate: rules.length > 0
      ? Math.round(rules.reduce((sum: number, r: AutomationRule) => sum + ((r.success_count || 0) / Math.max(r.execution_count || 1, 1)) * 100, 0) / rules.length)
      : 0,
  };

  return { rules, isLoading, stats, createRule, toggleRule };
}
