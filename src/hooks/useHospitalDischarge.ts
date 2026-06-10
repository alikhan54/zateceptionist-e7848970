// HOSPITAL-DISCHARGE — the discharge record + the closing act. The SIGN must always succeed (never a
// half-signed summary); closing the post-op episode and freeing the bed are best-effort AFTER the
// signed row commits, with their outcome recorded in the row (bed_freed / episode_closed) so a retry
// can surface. The bed is freed through the EXISTING bed-board flow (released-assignment history row),
// never reimplemented here. Tenant-scoped (RLS + .eq); `as any` house pattern.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { closePostopEpisode } from "@/hooks/useHospitalPostop";
import type { RxItem } from "@/pages/hospital/hospitalShared";
import type { ReadyCheck } from "@/lib/hospital/dischargeReadiness";

export interface DischargeRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  admission_id: string;
  ot_case_id: string | null;
  readiness_snapshot: ReadyCheck[];
  reason_for_admission: string | null;
  procedure_performed: string | null;
  hospital_course: string | null;
  discharge_meds: RxItem[];
  follow_up: string | null;
  danger_signs: string | null;
  language: string | null;
  source: "manual" | "assisted" | null;
  status: "draft" | "signed";
  authored_by: string | null;
  signed_at: string | null;
  bed_freed: boolean;
  episode_closed: boolean;
  updated_at: string;
}

export interface SaveDischargePayload {
  admissionId: string;
  otCaseId?: string | null;
  readiness: ReadyCheck[];
  reason_for_admission: string;
  procedure_performed: string;
  hospital_course: string;
  discharge_meds: RxItem[];
  follow_up: string;
  danger_signs: string;
  language: string;
  source: "manual" | "assisted";
  sign: boolean;
  // for the close-out (only used when sign=true) — the patient's current open bed assignment
  bed?: { admissionId: string; bedId: string } | null;
}

export function useHospitalDischarge(patientId?: string | null) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const key = ["hospital_discharge", tenantId, patientId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_discharges" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (row) { if (!Array.isArray(row.discharge_meds)) row.discharge_meds = []; if (!Array.isArray(row.readiness_snapshot)) row.readiness_snapshot = []; }
      return (row as DischargeRow | undefined) ?? null;
    },
    enabled: !!tenantId && !!patientId,
  });

  const save = useMutation({
    mutationFn: async (p: SaveDischargePayload) => {
      if (!tenantId || !patientId) throw new Error("Missing patient context");
      const signing = p.sign;
      // 1) the discharge row — THIS must succeed. The close-out is best-effort afterwards.
      const row = {
        tenant_id: tenantId, patient_id: patientId, admission_id: p.admissionId, ot_case_id: p.otCaseId ?? null,
        readiness_snapshot: p.readiness,
        reason_for_admission: p.reason_for_admission.trim() || null,
        procedure_performed: p.procedure_performed.trim() || null,
        hospital_course: p.hospital_course.trim() || null,
        discharge_meds: p.discharge_meds,
        follow_up: p.follow_up.trim() || null,
        danger_signs: p.danger_signs.trim() || null,
        language: p.language, source: p.source,
        status: signing ? "signed" : "draft",
        authored_by: signing ? (authUser?.id ?? null) : null,
        signed_at: signing ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { data: saved, error } = await supabase
        .from("hospital_discharges" as any)
        .upsert(row as any, { onConflict: "tenant_id,admission_id" })
        .select().single();
      if (error) throw error;   // a save/sign failure surfaces; the close-out below has not run

      let bedFreed = false, episodeClosed = false;
      if (signing) {
        // 2) close the post-op episode (best-effort)
        episodeClosed = await closePostopEpisode({ tenantId, patientId });
        // 3) free the bed via the EXISTING bed-board flow (released-assignment history + bed→cleaning)
        if (p.bed?.admissionId && p.bed?.bedId) {
          try {
            const now = new Date().toISOString();
            const { error: re } = await supabase.from("hospital_bed_assignments" as any)
              .update({ released_at: now, reason: "discharge", updated_at: now })
              .eq("tenant_id", tenantId).eq("admission_id", p.bed.admissionId).is("released_at", null);
            if (re) throw re;
            await supabase.from("hospital_beds" as any).update({ status: "cleaning", updated_at: now }).eq("id", p.bed.bedId).eq("tenant_id", tenantId);
            bedFreed = true;
          } catch (e: any) { console.warn("[hx-discharge] bed-free deferred:", e?.message); bedFreed = false; }
        }
        // 4) record what completed (so a retry can surface) — itself best-effort
        try {
          await supabase.from("hospital_discharges" as any)
            .update({ bed_freed: bedFreed, episode_closed: episodeClosed, updated_at: new Date().toISOString() })
            .eq("id", (saved as any).id).eq("tenant_id", tenantId);
        } catch { /* the sign already succeeded; the snapshot bump is non-critical */ }
      }
      return { saved: saved as DischargeRow, bedFreed, episodeClosed };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["hospital_postop"] });
      qc.invalidateQueries({ queryKey: ["hospital_beds", tenantId] });
    },
  });

  // Retry the close-out for a signed discharge whose bed/episode didn't complete at sign time.
  const retryCloseout = useMutation({
    mutationFn: async (d: DischargeRow & { bed?: { admissionId: string; bedId: string } | null }) => {
      let bedFreed = d.bed_freed, episodeClosed = d.episode_closed;
      if (!episodeClosed) episodeClosed = await closePostopEpisode({ tenantId, patientId });
      if (!bedFreed && d.bed?.admissionId && d.bed?.bedId) {
        try {
          const now = new Date().toISOString();
          await supabase.from("hospital_bed_assignments" as any).update({ released_at: now, reason: "discharge", updated_at: now }).eq("tenant_id", tenantId).eq("admission_id", d.bed.admissionId).is("released_at", null);
          await supabase.from("hospital_beds" as any).update({ status: "cleaning", updated_at: now }).eq("id", d.bed.bedId).eq("tenant_id", tenantId);
          bedFreed = true;
        } catch { /* keep false */ }
      }
      await supabase.from("hospital_discharges" as any).update({ bed_freed: bedFreed, episode_closed: episodeClosed, updated_at: new Date().toISOString() }).eq("id", d.id).eq("tenant_id", tenantId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["hospital_postop"] }); qc.invalidateQueries({ queryKey: ["hospital_beds", tenantId] }); },
  });

  return { discharge: query.data ?? null, isLoading: query.isLoading, save, retryCloseout };
}
