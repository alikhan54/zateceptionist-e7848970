import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

// Single patient row + everything linked to them. All queries pass through
// RLS — there is no service-role bypass. If the patient id belongs to
// another tenant, get_user_tenant_id() filtering returns nothing and the
// page renders "patient not found".

export interface PatientWithRelations {
  patient: {
    id: string;
    tenant_id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
    gender: string | null;
    skin_type: string | null;
    fitzpatrick_type: string | null;
    allergies: any;
    medical_history: Record<string, any> | null;
    photo_consent: boolean;
    marketing_consent: boolean;
    preferred_contact: string | null;
    preferred_practitioner: string | null;
    total_visits: number;
    total_spent: number;
    last_visit_date: string | null;
    next_appointment_date: string | null;
    loyalty_points: number;
    loyalty_tier: string;
    referral_code: string | null;
    tags: string[] | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  consultations: Array<{
    id: string;
    patient_id: string;
    practitioner_name: string | null;
    chief_complaint: string | null;
    diagnosis: string | null;
    treatment_plan: Record<string, any> | null;
    follow_up_date: string | null;
    report_status: string | null;
    doctor_approved: boolean;
    before_photos: any;
    after_photos: any;
    created_at: string;
  }>;
  appointments: Array<{
    id: string;
    customer_id: string;
    service: string | null;
    scheduled_at: string | null;
    status: string | null;
    notes: string | null;
    created_at: string;
  }>;
  prescriptions: Array<{
    id: string;
    patient_id: string;
    prescribed_by: string | null;
    // clinic_prescriptions stores meds as a jsonb array; each item typically
    // has {name, dosage, frequency, duration}.
    medicines: any[] | null;
    pharmacy_name: string | null;
    status: string | null;
    notes: string | null;
    created_at: string;
  }>;
  healthAnalyses: Array<{
    id: string;
    patient_id: string;
    overall_health_score: number | null;
    findings: any;
    recommendations: any;
    created_at: string;
  }>;
}

export function useClinicPatient(patientId: string | undefined) {
  const { tenantId } = useTenant();

  return useQuery<PatientWithRelations>({
    queryKey: ["clinic_patient", tenantId, patientId],
    queryFn: async () => {
      if (!tenantId || !patientId) {
        return { patient: null, consultations: [], appointments: [], prescriptions: [], healthAnalyses: [] };
      }

      // 1) The patient (slug-keyed; RLS filters cross-tenant)
      const { data: patientData } = await supabase
        .from("clinic_patients" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", patientId)
        .maybeSingle();

      if (!patientData) {
        return { patient: null, consultations: [], appointments: [], prescriptions: [], healthAnalyses: [] };
      }

      // 2) Consultations (slug-keyed)
      const { data: consultations } = await supabase
        .from("clinic_consultations" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      // 3) Appointments — these track customer_id (not patient_id), so look by phone
      let appointments: any[] = [];
      const phone = (patientData as any).phone;
      if (phone) {
        const { data: apptData } = await supabase
          .from("appointments" as any)
          .select("id, customer_id, service, scheduled_at, status, notes, created_at")
          .eq("tenant_id", tenantId)
          .eq("customer_phone", phone)
          .order("scheduled_at", { ascending: false })
          .limit(20);
        appointments = apptData || [];
      }

      // 4) Prescriptions (best-effort; table may be empty for cosmique)
      const { data: rxData } = await supabase
        .from("clinic_prescriptions" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      // 5) Health analyses
      const { data: analysesData } = await supabase
        .from("clinic_health_analyses" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      return {
        patient: patientData as any,
        consultations: (consultations || []) as any,
        appointments,
        prescriptions: (rxData || []) as any,
        healthAnalyses: (analysesData || []) as any,
      };
    },
    enabled: !!tenantId && !!patientId,
  });
}

// ============================================================================
// Add Prescription — Phase 5a
// Writes a row into public.clinic_prescriptions for the current tenant +
// patient. medicines is a jsonb array of {name, dosage, frequency, duration}.
// Invalidates the parent useClinicPatient query so the Care tab refetches.
// ============================================================================
export interface NewPrescriptionInput {
  patient_id: string;
  consultation_id?: string | null;
  prescribed_by: string;
  medicines: Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>;
  notes?: string | null;
  pharmacy_name?: string | null;
}

export function useCreatePrescription(patientId: string | undefined) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewPrescriptionInput) => {
      if (!tenantId) throw new Error("No tenant");
      if (!input.patient_id) throw new Error("Patient required");
      if (!input.medicines || input.medicines.length === 0) {
        throw new Error("At least one medicine required");
      }
      // Filter out completely empty medicines (name is required per row)
      const meds = input.medicines.filter(m => (m?.name || "").trim().length > 0);
      if (meds.length === 0) {
        throw new Error("At least one medicine with a name is required");
      }
      const prescribedBy = (input.prescribed_by || authUser?.full_name || authUser?.email || "Practitioner").slice(0, 200);

      const { data, error } = await supabase
        .from("clinic_prescriptions" as any)
        .insert({
          tenant_id: tenantId,
          patient_id: input.patient_id,
          consultation_id: input.consultation_id || null,
          prescribed_by: prescribedBy,
          medicines: meds,
          notes: input.notes || null,
          pharmacy_name: input.pharmacy_name || null,
          status: "active",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refetch the patient's data — Care tab will show the new prescription
      queryClient.invalidateQueries({ queryKey: ["clinic_patient", tenantId, patientId] });
    },
  });
}
