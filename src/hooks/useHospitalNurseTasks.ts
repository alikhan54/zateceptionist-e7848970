// HOSPITAL-NURSE — the nursing worklist: the doctor's orders BECOME the nurse's tasks, AM/PM vitals
// rounds generate deterministically, and every action carries a name + timestamp. No cron/n8n — all
// derivation is computed FE-side, idempotent (DB unique indexes make a re-derive a no-op). The
// med_admin task on order placement is fire-and-forget + NON-BLOCKING (a failed task-write never
// blocks the order). Tenant-scoped (RLS + .eq); `as any` house pattern.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export type NurseTaskType = "med_admin" | "vitals_round" | "order_prep";

export interface NurseTask {
  id: string;
  tenant_id: string;
  patient_id: string;
  source_order_id: string | null;
  episode_id: string | null;
  task_type: NurseTaskType;
  title: string;
  due_at: string | null;
  status: "pending" | "done";
  done_by: string | null;
  done_at: string | null;
  note: string | null;
  shift_key: string | null;
  created_at: string;
}

/** Today's two rounds, with deterministic due times (AM 08:00, PM 20:00 local). */
export function shiftsForToday(): { key: string; label: "AM" | "PM"; dueIso: string }[] {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const at = (h: number) => { const x = new Date(); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  return [
    { key: `${ymd}:AM`, label: "AM", dueIso: at(8) },
    { key: `${ymd}:PM`, label: "PM", dueIso: at(20) },
  ];
}

/** A medication order → one med_admin task. Fire-and-forget; the unique index dedupes a re-derive. */
export async function deriveMedAdminTask(args: {
  tenantId: string | null | undefined; order: { id: string; patient_id: string; details?: any };
}): Promise<void> {
  const { tenantId, order } = args;
  if (!tenantId || !order?.id || !order.patient_id) return;
  const item = (order.details && (order.details.item as string)) || "medication";
  try {
    const { error } = await supabase.from("hospital_nurse_tasks" as any).insert({
      tenant_id: tenantId, patient_id: order.patient_id, source_order_id: order.id,
      task_type: "med_admin", title: `Administer: ${item}`, status: "pending", due_at: new Date().toISOString(),
    } as any);
    if (error && (error as any).code !== "23505") console.warn("[hx-nurse] med task skipped:", (error as any).message);
  } catch (e: any) {
    console.warn("[hx-nurse] med task skipped (non-blocking):", e?.message);
  }
}

export function useHospitalNurseTasks() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const key = ["hospital_nurse_tasks", tenantId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_nurse_tasks" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("status", { ascending: true })
        .order("due_at", { ascending: true });
      if (error) throw error;
      return ((data as any[]) || []) as NurseTask[];
    },
    enabled: !!tenantId,
  });

  // Idempotent AM/PM rounds generator — one task per active admission per shift. Computes which
  // (patient, shift) rounds already exist for today and inserts ONLY the missing ones (no ON CONFLICT
  // inference on the partial index). The unique index is the final backstop against a race.
  const generateRounds = useMutation({
    mutationFn: async (patients: { id: string }[]) => {
      if (!tenantId || patients.length === 0) return 0;
      const shifts = shiftsForToday();
      const shiftKeys = shifts.map((s) => s.key);
      const { data: existing } = await supabase
        .from("hospital_nurse_tasks" as any)
        .select("patient_id, shift_key")
        .eq("tenant_id", tenantId).eq("task_type", "vitals_round").in("shift_key", shiftKeys);
      const have = new Set(((existing as any[]) || []).map((e) => `${e.patient_id}|${e.shift_key}`));
      const rows = patients.flatMap((p) => shifts
        .filter((s) => !have.has(`${p.id}|${s.key}`))
        .map((s) => ({
          tenant_id: tenantId, patient_id: p.id, task_type: "vitals_round" as const,
          title: `Vitals round (${s.label})`, due_at: s.dueIso, status: "pending" as const, shift_key: s.key,
        })));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("hospital_nurse_tasks" as any).insert(rows as any);
      if (error && (error as any).code !== "23505") throw error;   // 23505 = a concurrent generate raced us
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const markDone = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from("hospital_nurse_tasks" as any)
        .update({ status: "done", done_by: authUser?.id ?? null, done_at: new Date().toISOString(), note: note?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { tasks: query.data ?? [], isLoading: query.isLoading, generateRounds, markDone };
}

/** Auto-generate today's rounds once per active-patient set (idempotent at the DB). */
export function useGenerateRoundsOnce(patients: { id: string }[], gen: ReturnType<typeof useHospitalNurseTasks>["generateRounds"], ready: boolean) {
  useEffect(() => {
    if (!ready || patients.length === 0 || gen.isPending) return;
    const ids = patients.map((p) => p.id).sort().join(",");
    const stamp = `${new Date().toDateString()}|${ids}`;
    if ((useGenerateRoundsOnce as any)._last === stamp) return;
    (useGenerateRoundsOnce as any)._last = stamp;
    gen.mutate(patients);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patients.map((p) => p.id).join(",")]);
}
