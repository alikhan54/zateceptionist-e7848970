import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook } from '@/lib/api/webhooks';
import { toast } from 'sonner';

// ========================
// TYPES
// ========================

export interface JobRequisition {
  id: string;
  tenant_id: string;
  requisition_number: string;
  job_title: string;
  department_id: string | null;
  job_description: string | null;
  responsibilities: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  required_experience_years: number | null;
  required_education: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  employment_type: string;
  work_location: string;
  location_city: string | null;
  location_country: string;
  number_of_openings: number;
  status: 'draft' | 'open' | 'on_hold' | 'closed' | 'filled';
  priority: string;
  published_at: string | null;
  closed_at: string | null;
  search_keywords: string[] | null;
  auto_source_enabled: boolean;
  min_match_score: number;
  ai_sourcing_status: string | null;
  ai_sourcing_last_run: string | null;
  ai_candidates_found: number;
  total_applications: number;
  shortlisted_count: number;
  interviewed_count: number;
  offered_count: number;
  hired_count: number;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  tenant_id: string;
  job_requisition_id: string;
  candidate_id: string;
  source: string | null;
  stage: string;
  stage_updated_at: string;
  ai_match_score: number | null;
  ai_matched_skills: string[] | null;
  ai_missing_skills: string[] | null;
  ai_recommendation: string | null;
  ai_contact_strategy: string | null;
  ai_assessment_summary: string | null;
  score_skills: number | null;
  score_location: number | null;
  score_experience: number | null;
  score_title: number | null;
  score_quality: number | null;
  ai_interview_score: number | null;
  ai_interview_summary: string | null;
  ai_interview_recommendation: string | null;
  outreach_status: string;
  outreach_channel: string | null;
  offer_salary: number | null;
  offer_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  candidate?: Candidate;
  requisition?: Pick<JobRequisition, 'id' | 'job_title' | 'department_id' | 'location_city' | 'employment_type'>;
}

export interface Candidate {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_company: string | null;
  current_position: string | null;
  current_location: string | null;
  total_experience_years: number | null;
  skills: string[] | null;
  linkedin_url: string | null;
  resume_url: string | null;
  source: string;
  enrichment_status: string;
  match_score: number | null;
  contact_strategy: string | null;
  status: string;
  created_at: string;
}

export interface AIInterview {
  id: string;
  tenant_id: string;
  application_id: string;
  candidate_id: string;
  job_requisition_id: string;
  interview_type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  ai_overall_score: number | null;
  ai_technical_score: number | null;
  ai_communication_score: number | null;
  ai_cultural_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  ai_recommendation: string | null;
  ai_suggested_questions_for_human: string[] | null;
  call_duration_seconds: number | null;
  recording_url: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined fields
  candidate?: Pick<Candidate, 'id' | 'first_name' | 'last_name' | 'email'>;
  requisition?: Pick<JobRequisition, 'id' | 'job_title'>;
}

export interface SourcingRun {
  id: string;
  tenant_id: string;
  job_requisition_id: string | null;
  trigger_type: string;
  status: string;
  phase1_status: string;
  phase2_status: string;
  phase3_status: string;
  phase4_status: string;
  total_candidates_found: number;
  total_candidates_matched: number;
  total_candidates_contacted: number;
  avg_match_score: number | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ========================
// QUERY HOOKS
// ========================

export function useJobRequisitions(status?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['hr_job_requisitions', tenantUuid, status],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let query = supabase
        .from('hr_job_requisitions')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as JobRequisition[];
    },
    enabled: !!tenantUuid,
  });
}

export function useJobApplications(jobRequisitionId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['hr_job_applications', tenantUuid, jobRequisitionId],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let query = supabase
        .from('hr_job_applications')
        .select(`
          *,
          candidate:hr_candidates(
            id, first_name, last_name, full_name, email, phone,
            current_company, current_position, current_location,
            total_experience_years, skills, linkedin_url, resume_url,
            source, enrichment_status, match_score, contact_strategy, status
          ),
          requisition:hr_job_requisitions(
            id, job_title, department_id, location_city, employment_type
          )
        `)
        .eq('tenant_id', tenantUuid)
        .order('ai_match_score', { ascending: false, nullsFirst: false });

      if (jobRequisitionId) {
        query = query.eq('job_requisition_id', jobRequisitionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as JobApplication[];
    },
    enabled: !!tenantUuid,
  });
}

export function useCandidates() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['hr_candidates', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('hr_candidates')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Candidate[];
    },
    enabled: !!tenantUuid,
  });
}

export function useAIInterviews(applicationId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['hr_ai_interviews', tenantUuid, applicationId],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let query = supabase
        .from('hr_ai_interviews')
        .select(`
          *,
          candidate:hr_candidates(id, first_name, last_name, email),
          requisition:hr_job_requisitions(id, job_title)
        `)
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });

      if (applicationId) {
        query = query.eq('application_id', applicationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AIInterview[];
    },
    enabled: !!tenantUuid,
  });
}

export function useSourcingRuns(jobRequisitionId?: string) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['hr_sourcing_runs', tenantUuid, jobRequisitionId],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let query = supabase
        .from('hr_sourcing_runs')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (jobRequisitionId) {
        query = query.eq('job_requisition_id', jobRequisitionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SourcingRun[];
    },
    enabled: !!tenantUuid,
  });
}

export function useInterviewSchedules() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['hr_interview_schedules', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('hr_interview_schedules')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });
}

// ========================
// STATS
// ========================

export function useRecruitmentStats() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  return useQuery({
    queryKey: ['recruitment_stats', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return { openJobs: 0, totalCandidates: 0, aiInterviews: 0, offersPending: 0 };

      const [jobsRes, candidatesRes, interviewsRes, offersRes] = await Promise.all([
        supabase.from('hr_job_requisitions').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantUuid).in('status', ['open', 'on_hold']),
        supabase.from('hr_candidates').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantUuid),
        supabase.from('hr_ai_interviews').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantUuid).eq('status', 'completed'),
        supabase.from('hr_job_applications').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantUuid).eq('stage', 'offered'),
      ]);

      return {
        openJobs: jobsRes.count || 0,
        totalCandidates: candidatesRes.count || 0,
        aiInterviews: interviewsRes.count || 0,
        offersPending: offersRes.count || 0,
      };
    },
    enabled: !!tenantUuid,
  });
}

// ========================
// MUTATIONS
// ========================

export function useCreateJob() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobData: Partial<JobRequisition>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const reqNumber = `REQ-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('hr_job_requisitions')
        .insert({
          tenant_id: tenantUuid,
          requisition_number: reqNumber,
          job_title: jobData.job_title,
          job_description: jobData.job_description,
          responsibilities: jobData.responsibilities,
          required_skills: jobData.required_skills,
          required_experience_years: jobData.required_experience_years,
          salary_min: jobData.salary_min,
          salary_max: jobData.salary_max,
          salary_currency: jobData.salary_currency || 'AED',
          employment_type: jobData.employment_type || 'full_time',
          work_location: jobData.work_location || 'office',
          location_city: jobData.location_city,
          location_country: jobData.location_country || 'UAE',
          number_of_openings: jobData.number_of_openings || 1,
          status: 'open',
          auto_source_enabled: jobData.auto_source_enabled ?? true,
          min_match_score: jobData.min_match_score || 50,
          search_keywords: jobData.search_keywords,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_job_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment_stats'] });
      toast.success('Job posted successfully');
    },
    onError: () => toast.error('Failed to create job posting'),
  });
}

export function useUpdateApplicationStage() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, stage }: { applicationId: string; stage: string }) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { error } = await supabase
        .from('hr_job_applications')
        .update({ stage, stage_updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .eq('tenant_id', tenantUuid);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_job_applications'] });
      toast.success('Stage updated');
    },
    onError: () => toast.error('Failed to update stage'),
  });
}

export function useTriggerSourcing() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobRequisitionId: string) => {
      if (!tenantId) throw new Error('No tenant');
      return callWebhook('/hr/trigger-sourcing', {
        job_requisition_id: jobRequisitionId,
        trigger_type: 'manual',
      }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_job_requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['hr_sourcing_runs'] });
      toast.success('AI sourcing started');
    },
    onError: () => toast.error('Failed to trigger AI sourcing'),
  });
}

export function useTriggerAIInterview() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, candidateId, jobRequisitionId }: {
      applicationId: string;
      candidateId: string;
      jobRequisitionId: string;
    }) => {
      if (!tenantId) throw new Error('No tenant');
      return callWebhook('/hr/ai-interview/trigger', {
        application_id: applicationId,
        candidate_id: candidateId,
        job_requisition_id: jobRequisitionId,
        interview_type: 'screening',
      }, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr_ai_interviews'] });
      queryClient.invalidateQueries({ queryKey: ['hr_job_applications'] });
      toast.success('AI interview scheduled');
    },
    onError: () => toast.error('Failed to schedule AI interview'),
  });
}
