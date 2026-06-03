import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface ClinicPatient {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  medical_history: Record<string, any> | null;
  allergies: string[] | null;
  current_medications: any[] | null;
  skin_type: string | null;
  fitzpatrick_type: string | null;
  consent_forms: any[] | null;
  photo_consent: boolean;
  preferred_contact: string;
  total_visits: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier: string;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Phase 1 additive intake/screening fields (optional; populated by registration)
  nationality?: string | null;
  country_of_residence?: string | null;
  emirate?: string | null;
  emirates_id?: string | null;
  address?: string | null;
  file_number?: string | null;
  language?: string | null;
  marketing_consent?: boolean;
  preferred_practitioner?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relationship?: string | null;
  // structured medical-flag pairs — SOURCE OF TRUTH for screening (Phase 1 convention)
  medical_heart_disease?: boolean;
  medical_heart_disease_details?: string | null;
  medical_blood_pressure?: boolean;
  medical_blood_pressure_details?: string | null;
  medical_allergy?: boolean;
  medical_allergy_details?: string | null;
  medical_diabetes?: boolean;
  medical_diabetes_details?: string | null;
  medical_other?: boolean;
  medical_other_details?: string | null;
  treatment_interests?: string[] | null;
  registration_signature_url?: string | null;
  consultation_status?: string | null;
}

export function useClinicPatients(searchTerm?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading, refetch } = useQuery({
    queryKey: ["clinic_patients", tenantId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("clinic_patients" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("full_name");

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClinicPatient[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("clinic_patients_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_patients", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["clinic_patients", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createPatient = useMutation({
    mutationFn: async (patient: Partial<ClinicPatient>) => {
      const { data, error } = await supabase
        .from("clinic_patients" as any)
        .insert({ ...patient, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicPatient;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_patients", tenantId] }); },
  });

  const updatePatient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClinicPatient> }) => {
      const { error } = await supabase
        .from("clinic_patients" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_patients", tenantId] }); },
  });

  const stats = {
    totalPatients: patients.length,
    vipPatients: patients.filter(p => p.loyalty_tier === 'VIP').length,
    goldPatients: patients.filter(p => p.loyalty_tier === 'Gold').length,
    newThisMonth: patients.filter(p => {
      const created = new Date(p.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
    totalRevenue: patients.reduce((sum, p) => sum + (p.total_spent || 0), 0),
  };

  return { patients, isLoading, stats, refetch, createPatient, updatePatient };
}
