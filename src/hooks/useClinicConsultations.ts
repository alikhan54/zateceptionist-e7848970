import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface ClinicConsultation {
  id: string;
  tenant_id: string;
  patient_id: string;
  treatment_id: string | null;
  doctor_name: string | null;
  consultation_date: string;
  chief_complaint: string | null;
  examination_notes: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  prescriptions_given: any[] | null;
  products_recommended: string[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  consent_signed: boolean;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  status: string;
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
        .order("consultation_date", { ascending: false });

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
