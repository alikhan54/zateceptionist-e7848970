// HOSPITAL-OT — Operation Theatre case + gated consent + the surgeon's operative note.
// Two additive tables: `hospital_ot_cases` (one operation; carries the op note once signed) and
// `hospital_consents` (the recorded consent that GATES the case — a DB trigger refuses
// in_theatre/completed without a consent row; the UI mirrors that gate with a disabled Start).
// Tenant-scoped (RLS + .eq(tenant_id)); the page using it (Patient Journey) is doctor/admin-gated,
// so nurse/lab never reach an OT write. `as any` house pattern (tables not in generated types).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { OpNoteDraft } from "@/pages/hospital/hospitalShared";

export type OTStatus = "planned" | "consented" | "in_theatre" | "completed";

export interface OTCase {
  id: string;
  tenant_id: string;
  patient_id: string;
  admission_id: string | null;
  visit_id: string | null;
  procedure_name: string;
  surgeon_id: string | null;
  scheduled_at: string | null;
  status: OTStatus;
  pre_op_diagnosis: string | null;
  procedure_performed: string | null;
  findings: string | null;
  complications: string | null;
  post_op_instructions: string | null;
  op_note_source: "manual" | "assisted" | null;
  op_note_signed_at: string | null;
  op_note_authored_by: string | null;
  op_note_lang: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  ot_case_id: string;
  procedure: string | null;
  risks_explained: string | null;
  language: "en" | "bn" | null;
  consented_by_name: string;
  consented_by_relationship: "self" | "guardian";
  consent_text_snapshot: string | null;
  witnessed_by: string | null;
  signed_at: string;
}

export interface RecordConsentPayload {
  procedure: string;
  risks_explained: string;
  language: string;
  consented_by_name: string;
  consented_by_relationship: "self" | "guardian";
  consent_text_snapshot: string;
  witnessed_by: string;
}

export interface SaveOpNotePayload extends OpNoteDraft {
  source: "manual" | "assisted";
  lang: string;
  sign: boolean;     // true = sign & complete (in_theatre → completed)
}

export function useHospitalOT(patientId?: string | null) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const caseKey = ["hospital_ot_case", tenantId, patientId];

  // the patient's LATEST case — the demo + journey surface works on one active operation at a time
  const caseQuery = useQuery({
    queryKey: caseKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_ot_cases" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data as any[])?.[0] as OTCase | undefined) ?? null;
    },
    enabled: !!tenantId && !!patientId,
  });
  const otCase = caseQuery.data ?? null;

  const consentQuery = useQuery({
    queryKey: ["hospital_ot_consent", tenantId, otCase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_consents" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ot_case_id", otCase!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as ConsentRow | null;
    },
    enabled: !!tenantId && !!otCase?.id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: caseKey });
    qc.invalidateQueries({ queryKey: ["hospital_ot_consent", tenantId, otCase?.id] });
  };

  const createCase = useMutation({
    mutationFn: async (p: { procedure_name: string; scheduled_at?: string | null; admission_id?: string | null; visit_id?: string | null; surgeon_id?: string | null }) => {
      if (!tenantId || !patientId) throw new Error("Missing patient context");
      const { data, error } = await supabase
        .from("hospital_ot_cases" as any)
        .insert({
          tenant_id: tenantId, patient_id: patientId,
          admission_id: p.admission_id ?? null, visit_id: p.visit_id ?? null,
          procedure_name: p.procedure_name, surgeon_id: p.surgeon_id ?? null,
          scheduled_at: p.scheduled_at ?? null, status: "planned",
          created_by: authUser?.id ?? null,
        } as any)
        .select().single();
      if (error) throw error;
      return data as unknown as OTCase;
    },
    onSuccess: invalidate,
  });

  // Record the consent (the gate-opener): insert the consent row, then advance planned → consented.
  const recordConsent = useMutation({
    mutationFn: async (p: RecordConsentPayload) => {
      if (!tenantId || !patientId || !otCase?.id) throw new Error("No operation case");
      const { error: cErr } = await supabase.from("hospital_consents" as any).insert({
        tenant_id: tenantId, patient_id: patientId, ot_case_id: otCase.id,
        procedure: p.procedure, risks_explained: p.risks_explained, language: p.language,
        consented_by_name: p.consented_by_name, consented_by_relationship: p.consented_by_relationship,
        consent_text_snapshot: p.consent_text_snapshot, witnessed_by: p.witnessed_by || null,
        created_by: authUser?.id ?? null,
      } as any);
      if (cErr) throw cErr;
      const { error: sErr } = await supabase.from("hospital_ot_cases" as any)
        .update({ status: "consented" }).eq("id", otCase.id).eq("tenant_id", tenantId);
      if (sErr) throw sErr;
    },
    onSuccess: invalidate,
  });

  // Start theatre (consented → in_theatre). The DB trigger independently refuses this without a
  // consent row — surface its message if it fires (defense-in-depth; the UI already disables Start).
  const startTheatre = useMutation({
    mutationFn: async () => {
      if (!tenantId || !otCase?.id) throw new Error("No operation case");
      const { error } = await supabase.from("hospital_ot_cases" as any)
        .update({ status: "in_theatre" }).eq("id", otCase.id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Save / sign the operative note. Signing stamps authored_by + signed_at and completes the case.
  const saveOpNote = useMutation({
    mutationFn: async (p: SaveOpNotePayload) => {
      if (!tenantId || !otCase?.id) throw new Error("No operation case");
      const patch: Record<string, unknown> = {
        pre_op_diagnosis: p.pre_op_diagnosis.trim() || null,
        procedure_performed: p.procedure_performed.trim() || null,
        findings: p.findings.trim() || null,
        complications: p.complications.trim() || null,
        post_op_instructions: p.post_op_instructions.trim() || null,
        op_note_source: p.source, op_note_lang: p.lang,
      };
      if (p.sign) {
        patch.op_note_signed_at = new Date().toISOString();
        patch.op_note_authored_by = authUser?.id ?? null;
        patch.status = "completed";
      }
      const { error } = await supabase.from("hospital_ot_cases" as any)
        .update(patch).eq("id", otCase.id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    otCase, consent: consentQuery.data ?? null,
    isLoading: caseQuery.isLoading,
    createCase, recordConsent, startTheatre, saveOpNote,
  };
}
