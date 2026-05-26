import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WEBHOOK_BASE = (import.meta as any).env?.VITE_WEBHOOK_BASE_URL || 'https://webhooks.zatesystems.com';

export interface AIInterview {
  id: string;
  tenant_id: string;
  application_id: string | null;
  candidate_id: string | null;
  job_requisition_id: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'no_show' | 'cancelled' | 'failed';
  scheduled_at?: string;
  vapi_call_id?: string;
  vapi_assistant_id?: string;
  questions?: any[];
  duration_minutes?: number;
  call_started_at?: string;
  call_ended_at?: string;
  actual_duration_seconds?: number;
  transcript?: string;
  recording_url?: string;
  ai_score?: number;
  question_scores?: any;
  strengths?: string;
  concerns?: string;
  recommendation?: 'advance' | 'reject' | 'second_round' | 'hold';
  ai_reasoning?: string;
  created_at: string;
  completed_at?: string;
}

export function useAIInterviews() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  return useQuery({
    queryKey: ['ai-interviews', tenantUuid],
    queryFn: async (): Promise<AIInterview[]> => {
      if (!tenantUuid) return [];
      const { data, error } = await (supabase as any)
        .from('hr_ai_interviews')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data || []) as AIInterview[];
    },
    enabled: !!tenantUuid,
    refetchInterval: 15_000,
  });
}

export function useGenerateInterviewQuestions() {
  const { tenantConfig } = useTenant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { application_id: string; scheduled_at?: string }) => {
      const res = await fetch(`${WEBHOOK_BASE}/webhook/hr/ai-interview/generate-questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantConfig?.id, ...input }),
      });
      const j = await res.json();
      const payload = Array.isArray(j) ? j[0] : j;
      if (!payload?.success) throw new Error(payload?.error || 'Question generation failed');
      return payload;
    },
    onSuccess: (data) => {
      toast.success(`AI Interview scheduled — ${data.question_count} questions generated`);
      queryClient.invalidateQueries({ queryKey: ['ai-interviews'] });
    },
    onError: (e: any) => toast.error(`Schedule failed: ${e?.message || 'unknown'}`),
  });
}

export function useStartInterviewCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { interview_id: string }) => {
      const res = await fetch(`${WEBHOOK_BASE}/webhook/hr/ai-interview/start-call`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const j = await res.json();
      const payload = Array.isArray(j) ? j[0] : j;
      if (!payload?.success) throw new Error(payload?.error || 'Failed to start call');
      return payload;
    },
    onSuccess: () => {
      toast.success('Call initiated — VAPI is dialling the candidate now');
      queryClient.invalidateQueries({ queryKey: ['ai-interviews'] });
    },
    onError: (e: any) => toast.error(`Call start failed: ${e?.message || 'unknown'}`),
  });
}
