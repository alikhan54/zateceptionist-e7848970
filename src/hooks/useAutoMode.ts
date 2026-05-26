import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Default rules — mirrors the SQL DEFAULT so the UI behaves correctly even
// if a tenant's row is missing fields after a future schema bump.
export const DEFAULT_AUTO_MODE_RULES: Record<string, any> = {
  applied_to_screening:    { enabled: true,  min_match_score: 60, auto_reject_below: 30, max_per_run: 20 },
  screening_to_phone:      { enabled: true,  min_screening_score: 70, auto_schedule_call: true, call_window_days: 3 },
  phone_to_interview:      { enabled: true,  min_phone_score: 65, auto_schedule_ai_interview: true },
  interview_to_technical:  { enabled: true,  min_interview_score: 70, send_technical_assessment: true, assessment_deadline_hours: 72 },
  technical_to_final:      { enabled: true,  min_technical_score: 75, auto_notify_hiring_manager: true },
  final_to_offer:          { enabled: false, requires_manual_approval: true, auto_generate_offer_letter: true },
  offer_to_hired:          { enabled: true,  trigger: 'candidate_accepts', auto_create_onboarding: true },
};

export const STAGE_LABELS: Record<string, { from: string; to: string }> = {
  applied_to_screening:   { from: 'Applied', to: 'Screening' },
  screening_to_phone:     { from: 'Screening', to: 'Phone screen' },
  phone_to_interview:     { from: 'Phone screen', to: 'Interview' },
  interview_to_technical: { from: 'Interview', to: 'Technical' },
  technical_to_final:     { from: 'Technical', to: 'Final' },
  final_to_offer:         { from: 'Final', to: 'Offer' },
  offer_to_hired:         { from: 'Offer', to: 'Hired' },
};

export interface AutoModeConfig {
  id: string;
  tenant_id: string;
  enabled: boolean;
  rules: Record<string, any>;
  notify_on_advance: boolean;
  notify_on_reject: boolean;
  notify_channels: string[];
  run_frequency_minutes: number;
  last_run_at?: string;
  last_run_summary?: any;
}

export interface AutoDecision {
  id: string;
  tenant_id: string;
  application_id: string | null;
  candidate_id: string | null;
  job_requisition_id: string | null;
  decision_type: 'advance' | 'reject' | 'hold' | 'override';
  from_stage: string | null;
  to_stage: string | null;
  reason: string | null;
  scores: Record<string, number> | null;
  rule_triggered: string | null;
  is_automated: boolean;
  created_at: string;
}

export function useAutoMode() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  const configQ = useQuery({
    queryKey: ['auto-mode-config', tenantUuid],
    queryFn: async (): Promise<AutoModeConfig | null> => {
      if (!tenantUuid) return null;
      const { data, error } = await (supabase as any)
        .from('hr_auto_mode_config')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .maybeSingle();
      if (error) {
        // Table may not be in PostgREST cache yet (just-applied schema)
        return null;
      }
      if (data) {
        // Merge with defaults so missing rule keys don't blow up the editor
        data.rules = { ...DEFAULT_AUTO_MODE_RULES, ...(data.rules || {}) };
        return data;
      }
      // Auto-create a row if absent
      const { data: created } = await (supabase as any)
        .from('hr_auto_mode_config')
        .insert({ tenant_id: tenantUuid, enabled: false })
        .select()
        .maybeSingle();
      return created;
    },
    enabled: !!tenantUuid,
    refetchInterval: 30_000,
  });

  const updateConfig = useMutation({
    mutationFn: async (patch: Partial<AutoModeConfig>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data, error } = await (supabase as any)
        .from('hr_auto_mode_config')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantUuid)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-mode-config', tenantUuid] });
      toast.success('Auto-mode settings saved');
    },
    onError: (e: any) => toast.error(`Save failed: ${e?.message || 'unknown'}`),
  });

  const runNow = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error('No tenant');
      const url = '/webhook/hr/auto-pipeline/run';
      // Use the project's own webhook origin (same as recruitment)
      const base = (import.meta as any).env?.VITE_WEBHOOK_BASE_URL || 'https://webhooks.zatesystems.com';
      const res = await fetch(`${base}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantUuid }),
      });
      const j = await res.json();
      return Array.isArray(j) ? j[0] : j;
    },
    onSuccess: (data: any) => {
      const n = data?.total_decisions ?? 0;
      toast.success(`Auto-pipeline ran. ${n} decision${n === 1 ? '' : 's'} logged.`);
      queryClient.invalidateQueries({ queryKey: ['auto-mode-config'] });
      queryClient.invalidateQueries({ queryKey: ['auto-decisions'] });
    },
    onError: (e: any) => toast.error(`Run failed: ${e?.message || 'unknown'}`),
  });

  return { config: configQ.data, isLoading: configQ.isLoading, updateConfig, runNow };
}

export function useAutoDecisions(limit = 50) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ['auto-decisions', tenantUuid, limit],
    queryFn: async (): Promise<AutoDecision[]> => {
      if (!tenantUuid) return [];
      const { data, error } = await (supabase as any)
        .from('hr_auto_decisions')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return [];
      return (data || []) as AutoDecision[];
    },
    enabled: !!tenantUuid,
    refetchInterval: 20_000,
  });
}

export function useOverrideDecision() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { application_id: string; from_stage: string; to_stage: string; reason: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data: { user } } = await supabase.auth.getUser();
      // 1. Flip the application stage
      await supabase.from('hr_job_applications').update({
        stage: input.to_stage, stage_updated_at: new Date().toISOString(),
        status: input.to_stage === 'rejected' ? 'rejected' : 'active',
      } as any).eq('id', input.application_id);
      // 2. Write an override decision row for the audit trail
      await (supabase as any).from('hr_auto_decisions').insert({
        tenant_id: tenantUuid,
        application_id: input.application_id,
        decision_type: 'override',
        from_stage: input.from_stage,
        to_stage: input.to_stage,
        reason: input.reason,
        is_automated: false,
        actioned_by: user?.id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-decisions'] });
      toast.success('Override recorded');
    },
    onError: (e: any) => toast.error(`Override failed: ${e?.message || 'unknown'}`),
  });
}
