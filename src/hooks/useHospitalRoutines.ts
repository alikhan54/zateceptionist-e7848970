// HOSPITAL-ROLES [Brief 10 · C/D] — the inpatient CARE ROUTINES engine + the bed-board
// discharge-readiness map.
//
// ROUTINES: a STANDARD in-code day routine (morning/evening/night × round·vitals·consultation·
// medication) plus CUSTOM templates from the NEW additive `hospital_routine_templates` table
// (patient_id NULL = library template; patient_id set = applied to that patient). Instances
// derive into `hospital_nurse_tasks` (task_type='routine') THROUGH the existing idempotent
// engine pattern — fetch existing shift_keys → insert only the missing ones; the partial unique
// index `uq_hnt_routine` is the race backstop. Marks reuse the existing markDone (done_by/at/note)
// — zero new task plumbing.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { computeReadiness } from "@/lib/hospital/dischargeReadiness";
import { usePostopBoard } from "@/hooks/useHospitalPostop";

export type RoutineBlock = "morning" | "evening" | "night";
export interface RoutineItem { block: RoutineBlock; type: "round" | "vitals" | "consultation" | "medication" | "custom"; label: string }

export const BLOCK_HOURS: Record<RoutineBlock, number> = { morning: 8, evening: 16, night: 22 };

/** The standard inpatient day routine — in-code reference (like the order pick-lists), NOT a table. */
export const STANDARD_ROUTINE: RoutineItem[] = (["morning", "evening", "night"] as RoutineBlock[]).flatMap((block) => [
  { block, type: "round", label: "Ward round" },
  { block, type: "vitals", label: "Vitals check" },
  { block, type: "consultation", label: "Consultation review" },
  { block, type: "medication", label: "Medication administration" },
]);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const ymd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dueIso = (block: RoutineBlock) => { const x = new Date(); x.setHours(BLOCK_HOURS[block], 0, 0, 0); return x.toISOString(); };
/** Deterministic per-day shift_key for a routine item — the idempotency identity. */
export const routineShiftKey = (item: RoutineItem, tmplId?: string) =>
  `${ymd()}:RTN:${item.block}:${tmplId ? `${tmplId.slice(0, 8)}:` : ""}${slug(item.label)}`;

export interface RoutineTemplateRow {
  id: string; tenant_id: string; patient_id: string | null; name: string;
  items: RoutineItem[] | null; is_active: boolean; created_at: string;
}

/** Active custom templates applied to THIS patient. */
export function usePatientRoutineTemplates(patientId?: string | null) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hx-routine-templates", tenantId, patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_routine_templates" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("is_active", true);
      if (error) throw error;
      return ((data as any[]) || []) as RoutineTemplateRow[];
    },
    enabled: !!tenantId && !!patientId,
  });
}

/** Today's routine tasks for the patient (any status) — read straight off hospital_nurse_tasks. */
export function usePatientRoutineTasks(patientId?: string | null) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hx-routine-tasks", tenantId, patientId, ymd()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_nurse_tasks" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("task_type", "routine")
        .like("shift_key", `${ymd()}:RTN:%`)
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!tenantId && !!patientId,
  });
}

/**
 * Idempotent derivation — the existing engine pattern (fetch-existing → insert-missing; the
 * partial unique index backstops a race; 23505 swallowed). Standard items derive only for a
 * patient with an ACTIVE admission; custom-template items derive for their patient regardless.
 * Returns the number of rows inserted (a second call returns 0 — the verify gate).
 */
export function useDeriveRoutineTasks() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { patientId: string; hasActiveAdmission: boolean; templates: RoutineTemplateRow[] }) => {
      if (!tenantId) return 0;
      const wanted: { key: string; item: RoutineItem }[] = [];
      if (args.hasActiveAdmission)
        STANDARD_ROUTINE.forEach((item) => wanted.push({ key: routineShiftKey(item), item }));
      for (const t of args.templates)
        (t.items || []).forEach((item) => wanted.push({ key: routineShiftKey(item, t.id), item }));
      if (wanted.length === 0) return 0;
      const { data: existing, error: exErr } = await supabase
        .from("hospital_nurse_tasks" as any)
        .select("shift_key")
        .eq("tenant_id", tenantId).eq("patient_id", args.patientId)
        .eq("task_type", "routine").in("shift_key", wanted.map((w) => w.key));
      if (exErr) throw exErr;
      const have = new Set(((existing as any[]) || []).map((e) => e.shift_key as string));
      const rows = wanted.filter((w) => !have.has(w.key)).map((w) => ({
        tenant_id: tenantId, patient_id: args.patientId, task_type: "routine" as const,
        title: `${w.item.label} (${w.item.block})`, due_at: dueIso(w.item.block),
        status: "pending" as const, shift_key: w.key,
      }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("hospital_nurse_tasks" as any).insert(rows as any);
      if (error && (error as any).code !== "23505") throw error;   // 23505 = a concurrent derive raced us
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hx-routine-tasks"] }),
  });
}

// ===========================================================================================
// [Brief 10 · D] — bed-board discharge-readiness map: per occupied patient, the SAME pure
// computeReadiness the discharge panel uses (read-only; the board never signs — its Discharge
// chip only DEEP-LINKS to the journey's existing discharge panel).
// ===========================================================================================

export function useDischargeReadyMap(patientIds: string[]) {
  const { tenantId } = useTenant();
  const { data: ews } = usePostopBoard();
  const idsKey = patientIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["hx-discharge-ready", tenantId, idsKey],
    queryFn: async () => {
      const ids = patientIds;
      const [tasks, ot, rx] = await Promise.all([
        supabase.from("hospital_nurse_tasks" as any).select("patient_id")
          .eq("tenant_id", tenantId).eq("status", "pending").in("patient_id", ids),
        supabase.from("hospital_ot_cases" as any).select("patient_id, op_note_signed_at, created_at")
          .eq("tenant_id", tenantId).in("patient_id", ids),
        supabase.from("hospital_prescriptions" as any).select("patient_id, status, created_at")
          .eq("tenant_id", tenantId).in("patient_id", ids),
      ]);
      const pending = new Map<string, number>();
      ((tasks.data as any[]) || []).forEach((r) => pending.set(r.patient_id, (pending.get(r.patient_id) || 0) + 1));
      const latestOt = new Map<string, any>();
      ((ot.data as any[]) || []).forEach((r) => {
        const cur = latestOt.get(r.patient_id);
        if (!cur || +new Date(r.created_at) > +new Date(cur.created_at)) latestOt.set(r.patient_id, r);
      });
      const latestRx = new Map<string, any>();
      ((rx.data as any[]) || []).forEach((r) => {
        const cur = latestRx.get(r.patient_id);
        if (!cur || +new Date(r.created_at) > +new Date(cur.created_at)) latestRx.set(r.patient_id, r);
      });
      const ready = new Map<string, boolean>();
      for (const id of ids) {
        const e = ews?.get(id);
        const o = latestOt.get(id);
        const p = latestRx.get(id);
        const { allGreen } = computeReadiness({
          ews: e ? { band: e.band, trend: e.trend } : null,
          pendingTasks: pending.get(id) || 0,
          otCase: o ? { exists: true, opNoteSigned: !!o.op_note_signed_at } : null,
          rx: p ? { exists: true, signed: p.status === "signed" } : null,
        });
        ready.set(id, allGreen);
      }
      return ready;
    },
    enabled: !!tenantId && patientIds.length > 0 && !!ews,
    staleTime: 30_000,
  });
}
