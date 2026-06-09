// HOSPITAL-CONSULT — per-encounter consultation summary (additive `hospital_consultation_notes`).
// One row per (tenant_id, visit_id); upsert on save. Tenant-scoped (RLS + `.eq(tenant_id)`); the
// page that uses it (Patient Journey) is doctor/admin-gated, so nurse/lab never reach a write.
// clinic_* / hospital_* tables aren't in the generated DB types → `as any` (house pattern).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export type ConsultationSummarySource = "manual" | "assisted";

export interface ConsultationNoteRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id: string;
  notes: string | null;
  chief_complaint: string | null;
  history: string | null;
  examination: string | null;
  assessment: string | null;
  plan: string | null;
  summary_source: ConsultationSummarySource | null;
  lang: string | null;
  authored_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveConsultationPayload {
  notes: string;
  chief_complaint: string;
  history: string;
  examination: string;
  assessment: string;
  plan: string;
  summary_source: ConsultationSummarySource;
  lang: string;
}

export function useHospitalConsultation(visitId?: string | null, patientId?: string | null) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const key = ["hospital_consultation", tenantId, visitId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_consultation_notes" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("visit_id", visitId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as ConsultationNoteRow | null;
    },
    enabled: !!tenantId && !!visitId,
  });

  const save = useMutation({
    mutationFn: async (p: SaveConsultationPayload) => {
      if (!tenantId || !visitId || !patientId) throw new Error("Missing encounter context");
      const row = {
        tenant_id: tenantId,
        patient_id: patientId,
        visit_id: visitId,
        notes: p.notes.trim() || null,
        chief_complaint: p.chief_complaint.trim() || null,
        history: p.history.trim() || null,
        examination: p.examination.trim() || null,
        assessment: p.assessment.trim() || null,
        plan: p.plan.trim() || null,
        summary_source: p.summary_source,
        lang: p.lang,
        authored_by: authUser?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("hospital_consultation_notes" as any)
        .upsert(row as any, { onConflict: "tenant_id,visit_id" })
        .select()
        .single();
      if (error) throw error;
      return (data as any) as ConsultationNoteRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { note: query.data ?? null, isLoading: query.isLoading, save };
}
