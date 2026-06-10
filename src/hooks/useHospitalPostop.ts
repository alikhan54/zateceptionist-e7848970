// HOSPITAL-POSTOP — the post-op episode: deterministic NEWS2-style early-warning state.
// The SCORE IS MATH (src/lib/hospital/news2.ts) — recomputed on every vitals capture via a
// fire-and-forget call from the hospital VitalsCaptureDialog (a failed recompute NEVER blocks
// the vitals save). An episode opens when an OT case is signed-complete (additive call in
// useHospitalOT; the consent gate/trigger untouched). MEDICA only narrates the result.
// Tenant-scoped (RLS + .eq(tenant_id)); `as any` house pattern.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { computeNews2, computeTrend, type News2Band, type News2Trend, type News2Result } from "@/lib/hospital/news2";

export interface ScoreHistoryEntry {
  at: string;
  score: number;
  band: News2Band;
  partial: boolean;
  missing: string[];
  vitals: { respiratory_rate?: number | null; spo2?: number | null; temperature?: number | null; blood_pressure_systolic?: number | null; heart_rate?: number | null };
}

export interface PostopEpisode {
  id: string;
  tenant_id: string;
  patient_id: string;
  ot_case_id: string | null;
  admission_id: string | null;
  started_at: string;
  status: "active" | "closed";
  latest_score: number | null;
  latest_band: News2Band | null;
  trend: News2Trend | null;
  missing_params: string[] | null;
  score_history: ScoreHistoryEntry[];
  updated_at: string;
}

const HISTORY_CAP = 50;

/** The patient's ACTIVE episode (journey panel). */
export function usePostopEpisode(patientId?: string | null) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hospital_postop", "episode", tenantId, patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_postop_episodes" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      const row = data as any;
      if (row && !Array.isArray(row.score_history)) row.score_history = [];
      return (row as PostopEpisode | null) ?? null;
    },
    enabled: !!tenantId && !!patientId,
  });
}

/** All ACTIVE episodes for the tenant → patient_id-keyed map (the bed-board flag). */
export function usePostopBoard() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hospital_postop", "board", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_postop_episodes" as any)
        .select("patient_id, latest_score, latest_band, trend")
        .eq("tenant_id", tenantId)
        .eq("status", "active");
      if (error) throw error;
      const m = new Map<string, { score: number | null; band: News2Band | null; trend: News2Trend | null }>();
      ((data as any[]) || []).forEach((e) => m.set(e.patient_id, { score: e.latest_score, band: e.latest_band, trend: e.trend }));
      return m;
    },
    enabled: !!tenantId,
  });
}

/** A bed-board / journey flag fires when the state needs eyes (medium/high band or deteriorating). */
export function isAlertState(band: News2Band | null | undefined, trend: News2Trend | null | undefined): boolean {
  return band === "medium" || band === "high" || trend === "deteriorating";
}

/**
 * Open an episode for a just-completed OT case (fire-and-forget from the sign flow; the partial
 * unique index makes a second ACTIVE episode per patient a no-op). Seeds the first score from
 * the patient's current vitals. NEVER throws.
 */
export async function openPostopEpisode(args: {
  tenantId: string | null | undefined; patientId: string | null | undefined;
  otCaseId?: string | null; admissionId?: string | null;
}): Promise<void> {
  const { tenantId, patientId, otCaseId, admissionId } = args;
  if (!tenantId || !patientId) return;
  try {
    const { error } = await supabase.from("hospital_postop_episodes" as any).insert({
      tenant_id: tenantId, patient_id: patientId,
      ot_case_id: otCaseId ?? null, admission_id: admissionId ?? null, status: "active",
    } as any);
    // 23505 (an active episode already exists) is fine — monitoring simply continues
    if (error && (error as any).code !== "23505") { console.warn("[hx-postop] open skipped:", (error as any).message); return; }
    await recomputePostopEpisode({ tenantId, patientId });
  } catch (e: any) {
    console.warn("[hx-postop] open skipped (non-blocking):", e?.message);
  }
}

/**
 * Close the patient's active post-op episode (status active → closed) — called from the discharge
 * sign flow. Returns true if it closed (or there was nothing to close), false on a real failure so
 * the caller can record episode_closed accurately in the discharge snapshot. NEVER throws.
 */
export async function closePostopEpisode(args: { tenantId: string | null | undefined; patientId: string | null | undefined }): Promise<boolean> {
  const { tenantId, patientId } = args;
  if (!tenantId || !patientId) return true;
  try {
    const { error } = await supabase
      .from("hospital_postop_episodes" as any)
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("status", "active");
    if (error) { console.warn("[hx-postop] close skipped:", (error as any).message); return false; }
    return true;
  } catch (e: any) {
    console.warn("[hx-postop] close skipped (non-blocking):", e?.message);
    return false;
  }
}

/**
 * Recompute the active episode from the patient's LATEST captured vitals (clinic_visits is
 * latest-per-visit — READ-only here) and append to score_history. Fire-and-forget by contract:
 * any failure logs and returns — the vitals save that triggered it is already committed.
 */
export async function recomputePostopEpisode(args: { tenantId: string | null | undefined; patientId: string | null | undefined }): Promise<News2Result | null> {
  const { tenantId, patientId } = args;
  if (!tenantId || !patientId) return null;
  try {
    const { data: ep } = await supabase
      .from("hospital_postop_episodes" as any)
      .select("id, score_history")
      .eq("tenant_id", tenantId).eq("patient_id", patientId).eq("status", "active")
      .maybeSingle();
    if (!ep) return null;   // no active episode → not a post-op patient → no-op
    const { data: visits } = await supabase
      .from("clinic_visits" as any)
      .select("respiratory_rate, spo2, temperature, blood_pressure_systolic, heart_rate, visit_date")
      .eq("tenant_id", tenantId).eq("patient_id", patientId)
      .order("visit_date", { ascending: false }).limit(1);
    const v = (visits as any[])?.[0];
    if (!v) return null;
    const r = computeNews2(v);
    const entry: ScoreHistoryEntry = {
      at: new Date().toISOString(), score: r.score, band: r.band, partial: r.partial, missing: r.missing,
      vitals: { respiratory_rate: v.respiratory_rate, spo2: v.spo2, temperature: v.temperature, blood_pressure_systolic: v.blood_pressure_systolic, heart_rate: v.heart_rate },
    };
    const history = ([...(Array.isArray((ep as any).score_history) ? (ep as any).score_history : []), entry]).slice(-HISTORY_CAP);
    const trend = computeTrend(history);
    const { error } = await supabase.from("hospital_postop_episodes" as any).update({
      latest_score: r.score, latest_band: r.band, trend, missing_params: r.missing,
      score_history: history, updated_at: new Date().toISOString(),
    }).eq("id", (ep as any).id).eq("tenant_id", tenantId);
    if (error) { console.warn("[hx-postop] recompute skipped:", (error as any).message); return null; }
    return r;
  } catch (e: any) {
    console.warn("[hx-postop] recompute skipped (non-blocking):", e?.message);
    return null;
  }
}
