// Hospital admission — the real clinical intake. ADDITIVE: identity reuses
// clinic_patients, the encounter reuses clinic_visits (with attending/reception staff),
// and the HOSPITAL-specific fields (complaint, ward, attending, MRN, insurance, payment,
// next-of-kin) live in the new hospital_admissions table. The clinic's own
// PatientRegistrationDialog is untouched.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface HospitalAdmission {
  id: string; tenant_id: string; patient_id: string | null; visit_id: string | null;
  mrn: string | null; admission_type: string; admitting_complaint: string | null;
  department_id: string | null; department_name: string | null; ward: string | null;
  attending_staff_id: string | null; attending_name: string | null;
  id_doc_type: string | null; id_doc_number: string | null;
  insurance_status: string | null; insurance_provider: string | null; insurance_number: string | null;
  next_of_kin_name: string | null; next_of_kin_phone: string | null; next_of_kin_relationship: string | null;
  payment_amount: number | null; payment_currency: string | null; payment_method: string | null;
  payment_status: string; payment_reference: string | null; status: string; notes: string | null;
  created_at: string;
}

export interface AdmitInput {
  // identity
  existing_patient_id?: string | null;   // set when admitting a RETURNING patient
  full_name: string; phone: string; email?: string; date_of_birth?: string; gender?: string;
  nationality?: string; address?: string;
  // id doc (any card)
  id_doc_type?: string; id_doc_number?: string;
  // admission
  admission_type: string; admitting_complaint: string;
  department_id?: string; department_name?: string; ward?: string;
  attending_staff_id?: string; attending_name?: string; reception_staff_id?: string;
  // insurance
  insurance_status?: string; insurance_provider?: string; insurance_number?: string;
  // next of kin
  next_of_kin_name?: string; next_of_kin_phone?: string; next_of_kin_relationship?: string;
  // payment
  payment_amount?: number | null; payment_currency?: string; payment_method?: string;
  payment_status?: string; payment_reference?: string;
  notes?: string;
}

export function newMRN() {
  return `BSH-${Math.floor(Math.random() * 900000) + 100000}`;
}

export function useHospitalAdmissions() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ["hospital_admissions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("hospital_admissions" as any)
        .select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return (data || []) as unknown as HospitalAdmission[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel(`hosp_adm_rt_${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_admissions", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["hospital_admissions", tenantId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, qc]);

  // Returning-patient lookup by exact phone (digits-normalised). Returns the existing
  // clinic_patients row or null — drives the "returning patient" routing banner.
  async function findByPhone(phone: string): Promise<{ id: string; full_name: string; date_of_birth: string | null; gender: string | null } | null> {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length < 6) return null;
    const { data } = await supabase
      .from("clinic_patients" as any)
      .select("id, full_name, phone, date_of_birth, gender")
      .eq("tenant_id", tenantId).limit(25);
    const match = ((data || []) as any[]).find((p) => (p.phone || "").replace(/\D/g, "") === digits);
    return match ? { id: match.id, full_name: match.full_name, date_of_birth: match.date_of_birth, gender: match.gender } : null;
  }

  const admit = useMutation({
    mutationFn: async (input: AdmitInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      const mrn = newMRN();

      // 1) patient (reuse existing for a returning admit, else create)
      let patientId = input.existing_patient_id || null;
      if (!patientId) {
        const { data: p, error: pe } = await supabase.from("clinic_patients" as any).insert({
          tenant_id: tenantId,
          full_name: input.full_name.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          date_of_birth: input.date_of_birth || null,
          gender: input.gender || null,
          nationality: input.nationality?.trim() || null,
          address: input.address?.trim() || null,
          emergency_contact_name: input.next_of_kin_name?.trim() || null,
          emergency_contact_number: input.next_of_kin_phone?.trim() || null,
          emergency_contact_relationship: input.next_of_kin_relationship || null,
          file_number: mrn,
        }).select("id").single();
        if (pe) throw pe;
        patientId = (p as any).id;
      }

      // 2) encounter (clinic_visits) — admission visit with attending + reception staff
      const { count } = await supabase.from("clinic_visits" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("patient_id", patientId);
      const { data: v, error: ve } = await supabase.from("clinic_visits" as any).insert({
        tenant_id: tenantId, patient_id: patientId,
        visit_number: (count || 0) + 1,
        visit_date: new Date().toISOString(),
        current_status: "waiting",
        consent_signed: false,
        vitals_completed: false,
        treatment_completed: false,
        is_locked: false,
        // NB: clinic_visits.*_staff_id are FKs to public.users (auth users), NOT hr_employees.
        // The attending clinician (an hr_employees row) is recorded on hospital_admissions
        // (.attending_staff_id / .attending_name) — never written to clinic_visits.
      }).select("id").single();
      if (ve) throw ve;
      const visitId = (v as any).id;

      // 3) hospital_admissions — the hospital-specific record
      const { data: a, error: ae } = await supabase.from("hospital_admissions" as any).insert({
        tenant_id: tenantId, patient_id: patientId, visit_id: visitId, mrn,
        admission_type: input.admission_type,
        admitting_complaint: input.admitting_complaint?.trim() || null,
        department_id: input.department_id || null,
        department_name: input.department_name || null,
        ward: input.ward?.trim() || null,
        attending_staff_id: input.attending_staff_id || null,
        attending_name: input.attending_name || null,
        id_doc_type: input.id_doc_type || null,
        id_doc_number: input.id_doc_number?.trim() || null,
        insurance_status: input.insurance_status || "self_pay",
        insurance_provider: input.insurance_provider?.trim() || null,
        insurance_number: input.insurance_number?.trim() || null,
        next_of_kin_name: input.next_of_kin_name?.trim() || null,
        next_of_kin_phone: input.next_of_kin_phone?.trim() || null,
        next_of_kin_relationship: input.next_of_kin_relationship || null,
        payment_amount: (input.payment_amount ?? null),
        payment_currency: input.payment_currency || "BDT",
        payment_method: input.payment_method || null,
        payment_status: input.payment_status || "pending",
        payment_reference: input.payment_reference?.trim() || null,
        status: "admitted",
        notes: input.notes?.trim() || null,
        admitted_by: uid,
      }).select().single();
      if (ae) throw ae;

      return { patient_id: patientId as string, visit_id: visitId as string, mrn, admission: a as unknown as HospitalAdmission };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital_admissions", tenantId] });
      qc.invalidateQueries({ queryKey: ["clinic_patients"] });
      qc.invalidateQueries({ queryKey: ["clinic-patients"] });
      qc.invalidateQueries({ queryKey: ["clinic_visits"] });
    },
  });

  return { admissions, isLoading, admit, findByPhone };
}
