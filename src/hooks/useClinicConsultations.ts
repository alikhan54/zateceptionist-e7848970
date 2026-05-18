import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// Interface mirrors actual public.clinic_consultations columns (Phase 3 alignment).
// Previous version had 8 columns that didn't exist in the DB.
export interface ClinicConsultation {
  id: string;
  tenant_id: string;
  patient_id: string;
  appointment_id: string | null;
  practitioner_name: string | null;
  chief_complaint: string | null;
  history_of_present: string | null;
  examination_findings: string | null;
  diagnosis: string | null;
  treatment_plan: Record<string, any> | null; // jsonb in DB
  estimated_cost: number | null;
  prescriptions: any[] | Record<string, any> | null; // jsonb in DB
  before_photos: any[] | Record<string, any> | null; // jsonb in DB
  after_photos: any[] | Record<string, any> | null; // jsonb in DB
  voice_recording_url: string | null;
  voice_transcript: string | null;
  ai_generated_report: string | null;
  report_status: string | null;
  doctor_approved: boolean;
  doctor_approved_at: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useClinicConsultations(patientId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: consultations = [], isLoading, refetch } = useQuery({
    queryKey: ["clinic_consultations", tenantId, patientId],
    queryFn: async () => {
      let query = supabase
        .from("clinic_consultations" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClinicConsultation[];
    },
    enabled: !!tenantId,
  });

  const createConsultation = useMutation({
    mutationFn: async (consultation: Partial<ClinicConsultation>) => {
      const { data, error } = await supabase
        .from("clinic_consultations" as any)
        .insert({ ...consultation, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicConsultation;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_consultations", tenantId] }); },
  });

  const updateConsultation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClinicConsultation> }) => {
      const { error } = await supabase
        .from("clinic_consultations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_consultations", tenantId] }); },
  });

  return { consultations, isLoading, refetch, createConsultation, updateConsultation };
}
