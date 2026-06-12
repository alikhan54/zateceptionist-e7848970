// HOSPITAL-FLOW [Brief 9] — the structured consultation intake (questionnaire + disposition).
// Stored in the NEW additive `hospital_consult_intake` table (UNIQUE per tenant+visit; RLS = the
// hospital 5-policy pattern) — chosen over ALTERing hospital_consultation_notes per the standing
// "never ALTER an existing table" rule. Saved alongside the consultation save; the answers are
// ALSO composed into the notes string handed to the MEDICA drafter (richer grounding, same
// message path — MEDICA only consumes, decides nothing).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export type YesNo = "yes" | "no";
export interface IntakeAnswers {
  chest_pain?: YesNo | "";
  duration?: string;
  breathlessness?: YesNo | "";
  prior_cardiac?: YesNo | "";
  smoking?: YesNo | "";
  allergies?: string;
  current_meds?: string;
}
export type Disposition = "" | "admit" | "refer" | "other";

export interface ConsultIntakeRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id: string;
  answers: IntakeAnswers | null;
  comments: string | null;
  disposition: Exclude<Disposition, ""> | null;
  disposition_detail: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SaveIntakePayload {
  answers: IntakeAnswers;
  comments: string;
  disposition: Disposition;
  disposition_detail: Record<string, unknown> | null;
}

export function useHospitalConsultIntake(visitId?: string | null, patientId?: string | null) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const key = ["hx-consult-intake", tenantId, visitId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_consult_intake" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("visit_id", visitId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as ConsultIntakeRow | null;
    },
    enabled: !!tenantId && !!visitId,
  });

  const save = useMutation({
    mutationFn: async (p: SaveIntakePayload) => {
      if (!tenantId || !visitId || !patientId) throw new Error("Missing encounter context");
      const row = {
        tenant_id: tenantId,
        patient_id: patientId,
        visit_id: visitId,
        answers: p.answers ?? {},
        comments: p.comments.trim() || null,
        disposition: p.disposition || null,
        disposition_detail: p.disposition_detail ?? null,
        updated_by: authUser?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("hospital_consult_intake" as any)
        .upsert(row as any, { onConflict: "tenant_id,visit_id" })
        .select()
        .single();
      if (error) throw error;
      return (data as any) as ConsultIntakeRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { intake: query.data ?? null, isLoading: query.isLoading, save };
}

/** Compose the intake into a grounding block appended to the notes the MEDICA drafter already
 *  receives. Empty intake → "" (the drafter message stays byte-identical to today). */
export function buildIntakeBlock(answers: IntakeAnswers, comments: string): string {
  const lines: string[] = [];
  const yn = (v?: string) => (v === "yes" ? "yes" : v === "no" ? "no" : null);
  const pairs: [string, string | null][] = [
    ["Chest pain", yn(answers.chest_pain)],
    ["Duration", answers.duration?.trim() || null],
    ["Breathlessness", yn(answers.breathlessness)],
    ["Prior cardiac history", yn(answers.prior_cardiac)],
    ["Smoking", yn(answers.smoking)],
    ["Allergies", answers.allergies?.trim() || null],
    ["Current medications", answers.current_meds?.trim() || null],
  ];
  for (const [label, v] of pairs) if (v) lines.push(`${label}: ${v}`);
  if (comments.trim()) lines.push(`Additional comments: ${comments.trim()}`);
  if (lines.length === 0) return "";
  return `\n\nStructured intake (recorded this encounter):\n${lines.map((l) => `- ${l}`).join("\n")}`;
}
