import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// Types
export interface AIAgent {
  id: string;
  tenant_id: string;
  agent_name: string;
  agent_role: string;
  agent_title?: string;
  avatar_url?: string;
  personality: Record<string, any>;
  languages: string[];
  system_prompt?: string;
  knowledge_base: Record<string, any>;
  capabilities: string[];
  tools_enabled: string[];
  channels: string[];
  vapi_assistant_id?: string;
  hr_employee_id?: string;
  working_hours: Record<string, any>;
  max_concurrent_conversations: number;
  escalation_rules: Record<string, any>;
  auto_follow_up: boolean;
  status: 'draft' | 'configuring' | 'active' | 'paused' | 'terminated';
  hired_at?: string;
  terminated_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AIAgentTemplate {
  id: string;
  template_name: string;
  template_role: string;
  description?: string;
  icon?: string;
  industries: string[];
  default_personality: Record<string, any>;
  default_capabilities: string[];
  default_channels: string[];
  default_tools: string[];
  default_system_prompt?: string;
  default_knowledge_base: Record<string, any>;
  default_escalation_rules: Record<string, any>;
  tier_required: string;
  is_active: boolean;
  popularity_score: number;
  created_at: string;
}

export interface AIAgentTask {
  id: string;
  tenant_id: string;
  agent_id: string;
  task_type: string;
  channel?: string;
  contact_id?: string;
  contact_name?: string;
  conversation_id?: string;
  status: 'in_progress' | 'completed' | 'failed' | 'escalated';
  outcome: Record<string, any>;
  duration_seconds?: number;
  sentiment_score?: number;
  customer_satisfaction?: number;
  escalated_to?: string;
  created_at: string;
}

export interface AIAgentMetric {
  id: string;
  tenant_id: string;
  agent_id: string;
  metric_date: string;
  total_tasks: number;
  calls_handled: number;
  messages_handled: number;
  appointments_booked: number;
  leads_qualified: number;
  follow_ups_sent: number;
  escalations: number;
  avg_sentiment?: number;
  avg_satisfaction?: number;
  avg_response_time_seconds?: number;
  resolution_rate?: number;
  ai_tokens_used: number;
  estimated_cost_usd: number;
  created_at: string;
}

// Hooks
export function useAIAgents() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['ai-agents', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await (supabase as any)
        .from('ai_agents')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AIAgent[];
    },
    enabled: !!tenantUuid,
  });
}

export function useAIAgent(agentId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['ai-agent', tenantUuid, agentId],
    queryFn: async () => {
      if (!tenantUuid || !agentId) return null;
      const { data, error } = await (supabase as any)
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .eq('tenant_id', tenantUuid)
        .single();
      if (error) throw error;
      return data as AIAgent;
    },
    enabled: !!tenantUuid && !!agentId,
  });
}

export function useAgentTemplates() {
  return useQuery({
    queryKey: ['ai-agent-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_agent_templates')
        .select('*')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false });
      if (error) throw error;
      return (data || []) as AIAgentTemplate[];
    },
  });
}

export function useCreateAgent() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agent: Partial<AIAgent>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data, error } = await (supabase as any)
        .from('ai_agents')
        .insert({
          ...agent,
          tenant_id: tenantUuid,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantUuid] });
      toast.success('AI Agent created');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create agent'),
  });
}

export function useUpdateAgent() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AIAgent> & { id: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { error } = await (supabase as any)
        .from('ai_agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantUuid);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents', tenantUuid] });
      queryClient.invalidateQueries({ queryKey: ['ai-agent', tenantUuid, variables.id] });
      toast.success('Agent updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update agent'),
  });
}

export function useAgentTasks(agentId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['ai-agent-tasks', tenantUuid, agentId],
    queryFn: async () => {
      if (!tenantUuid || !agentId) return [];
      const { data, error } = await (supabase as any)
        .from('ai_agent_tasks')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AIAgentTask[];
    },
    enabled: !!tenantUuid && !!agentId,
  });
}

export function useAgentMetrics(agentId?: string, days: number = 30) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['ai-agent-metrics', tenantUuid, agentId, days],
    queryFn: async () => {
      if (!tenantUuid || !agentId) return [];
      const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const { data, error } = await (supabase as any)
        .from('ai_agent_metrics')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .eq('agent_id', agentId)
        .gte('metric_date', fromDate)
        .order('metric_date', { ascending: true });
      if (error) throw error;
      return (data || []) as AIAgentMetric[];
    },
    enabled: !!tenantUuid && !!agentId,
  });
}
