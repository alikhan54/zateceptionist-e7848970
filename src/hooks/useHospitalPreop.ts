// HOSPITAL-ROLES [Brief 10 · B] — the ward/OT nurse's WHO-style PRE-OP checklist on an OT case.
// One row per case in the NEW additive `hospital_preop_checklists` (RLS = the hospital 5-policy
// pattern; UNIQUE per tenant+case). RECORDS readiness ONLY — the consent DB trigger remains the
// sole gate on in_theatre/completed; nothing here touches case status. Read-only to the surgeon.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export const PREOP_ITEMS = [
  "consent_confirmed",   // consent recorded + confirmed with the patient
  "fasting",             // fasting status verified
  "site_marked",         // surgical site marked
  "bloods_ready",        // bloods / reports available
  "vitals_taken",        // pre-op vitals taken
  "jewellery_removed",   // jewellery / dentures removed
] as const;
export type PreopItemKey = (typeof PREOP_ITEMS)[number];
export type PreopItems = Partial<Record<PreopItemKey, boolean>>;

export interface PreopChecklistRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  ot_case_id: string;
  items: PreopItems | null;
  note: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useHospitalPreop(otCaseId?: string | null, patientId?: string | null) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const key = ["hx-preop", tenantId, otCaseId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_preop_checklists" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ot_case_id", otCaseId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as PreopChecklistRow | null;
    },
    enabled: !!tenantId && !!otCaseId,
  });

  const save = useMutation({
    mutationFn: async (p: { items: PreopItems; note: string; recordedByName?: string | null }) => {
      if (!tenantId || !otCaseId || !patientId) throw new Error("Missing case context");
      const row = {
        tenant_id: tenantId,
        patient_id: patientId,
        ot_case_id: otCaseId,
        items: p.items ?? {},
        note: p.note.trim() || null,
        recorded_by: authUser?.id ?? null,
        recorded_by_name: p.recordedByName ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("hospital_preop_checklists" as any)
        .upsert(row as any, { onConflict: "tenant_id,ot_case_id" })
        .select()
        .single();
      if (error) throw error;
      return (data as any) as PreopChecklistRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hx-preop"] }),
  });

  return { checklist: query.data ?? null, isLoading: query.isLoading, save };
}

export interface TheatreCase {
  id: string; patient_id: string; procedure_name: string; status: string;
  scheduled_at: string | null; surgeon_id: string | null; op_note_signed_at: string | null;
  created_at: string;
}

/** The theatre-day list: the tenant's OT cases (the surgeon's view filters to HIS cases). */
export function useTheatreCases(surgeonHrId?: string | null) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hx-theatre-cases", tenantId, surgeonHrId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("hospital_ot_cases" as any)
        .select("id,patient_id,procedure_name,status,scheduled_at,surgeon_id,op_note_signed_at,created_at")
        .eq("tenant_id", tenantId)
        .order("scheduled_at", { ascending: true, nullsFirst: false });
      if (surgeonHrId) q = q.eq("surgeon_id", surgeonHrId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data as any[]) || []) as TheatreCase[];
    },
    enabled: !!tenantId,
  });
}
