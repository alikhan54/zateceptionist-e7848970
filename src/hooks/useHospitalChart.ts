// HOSPITAL-CHART [Brief 8 · A] — read-only aggregation for the one-click Patient Records chart.
// ZERO new tables: every tab reads EXISTING sources, tenant + patient scoped:
//   consultations → clinic_visits + hospital_consultation_notes (+ hospital_admissions for the
//                   Department → Doctor attribution)
//   lab reports   → hospital_lab_reports
//   reports       → hospital_ot_cases (signed op notes) + hospital_consents + hospital_discharges
//                   + resulted imaging orders
//   medications   → hospital_prescriptions + medication hospital_orders
//   surgery/OT    → hospital_ot_cases
//   vitals        → clinic_visits (rows that carry vitals) + hospital_postop_episodes (EWS context)
//   documents     → the print artifacts (signed Rx / consents / signed op notes / signed
//                   discharges / lab-report PDFs)
// No mutation anywhere in this hook. `as any` house pattern (hospital_*/clinic_* not in types).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { classifyVital, type VitalStatus } from "@/lib/clinic/vitalsThresholds";

export interface ChartVisit {
  id: string; visit_date: string; created_at: string; diagnosis: string | null;
  doctor_notes: string | null; vitals_completed: boolean;
  blood_pressure_systolic: number | null; blood_pressure_diastolic: number | null;
  heart_rate: number | null; temperature: number | null; respiratory_rate: number | null;
  spo2: number | null; sugar: number | null;
}
export interface ChartNote {
  id: string; visit_id: string; notes: string | null; chief_complaint: string | null;
  history: string | null; examination: string | null; assessment: string | null;
  plan: string | null; summary_source: string | null; created_at: string; updated_at: string;
}
export interface ChartAdmission {
  id: string; visit_id: string | null; department_name: string | null; attending_name: string | null;
  admitting_complaint: string | null; status: string; ward: string | null; created_at: string;
}
export interface ChartLab {
  id: string; file_name: string | null; status: string; findings: any[] | null;
  takeaway: string | null; created_at: string;
}
export interface ChartOrder {
  id: string; order_type: string; status: string; details: any; created_at: string;
}
export interface ChartRx {
  id: string; items: any[] | null; advice: string | null; follow_up: string | null;
  status: string; signed_at: string | null; created_at: string;
}
export interface ChartOtCase {
  id: string; procedure_name: string; status: string; scheduled_at: string | null;
  surgeon_id: string | null; pre_op_diagnosis: string | null; procedure_performed: string | null;
  findings: string | null; complications: string | null; post_op_instructions: string | null;
  op_note_signed_at: string | null; created_at: string;
}
export interface ChartConsent {
  id: string; procedure: string | null; consented_by_name: string | null; language: string | null;
  witnessed_by: string | null; signed_at: string | null; created_at: string;
}
export interface ChartDischarge {
  id: string; status: string; signed_at: string | null; language: string | null;
  reason_for_admission: string | null; created_at: string;
}
export interface ChartEpisode {
  id: string; status: string; latest_score: number | null; latest_band: string | null;
  trend: string | null; score_history: any[] | null; updated_at: string;
}

export interface ChartData {
  visits: ChartVisit[];
  notes: ChartNote[];
  admissions: ChartAdmission[];
  labs: ChartLab[];
  orders: ChartOrder[];
  prescriptions: ChartRx[];
  otCases: ChartOtCase[];
  consents: ChartConsent[];
  discharges: ChartDischarge[];
  episodes: ChartEpisode[];
}

const desc = (a: string | null | undefined, b: string | null | undefined) =>
  +new Date(b || 0) - +new Date(a || 0);

export function useHospitalChart(patientId?: string | null) {
  const { tenantId } = useTenant();
  const query = useQuery({
    queryKey: ["hx-chart", tenantId, patientId],
    queryFn: async (): Promise<ChartData> => {
      const sel = (table: string, cols: string) =>
        supabase.from(table as any).select(cols).eq("tenant_id", tenantId).eq("patient_id", patientId);
      const [visits, notes, admissions, labs, orders, prescriptions, otCases, consents, discharges, episodes] =
        await Promise.all([
          sel("clinic_visits", "id,visit_date,created_at,diagnosis,doctor_notes,vitals_completed,blood_pressure_systolic,blood_pressure_diastolic,heart_rate,temperature,respiratory_rate,spo2,sugar"),
          sel("hospital_consultation_notes", "id,visit_id,notes,chief_complaint,history,examination,assessment,plan,summary_source,created_at,updated_at"),
          sel("hospital_admissions", "id,visit_id,department_name,attending_name,admitting_complaint,status,ward,created_at"),
          sel("hospital_lab_reports", "id,file_name,status,findings,takeaway,created_at"),
          sel("hospital_orders", "id,order_type,status,details,created_at"),
          sel("hospital_prescriptions", "id,items,advice,follow_up,status,signed_at,created_at"),
          sel("hospital_ot_cases", "id,procedure_name,status,scheduled_at,surgeon_id,pre_op_diagnosis,procedure_performed,findings,complications,post_op_instructions,op_note_signed_at,created_at"),
          sel("hospital_consents", "id,procedure,consented_by_name,language,witnessed_by,signed_at,created_at"),
          sel("hospital_discharges", "id,status,signed_at,language,reason_for_admission,created_at"),
          sel("hospital_postop_episodes", "id,status,latest_score,latest_band,trend,score_history,updated_at"),
        ]);
      const rows = (r: any) => ((r?.data as any[]) || []);
      const newestFirst = (r: any) => rows(r).sort((a, b) => desc(a.created_at, b.created_at));
      return {
        visits: rows(visits).sort((a, b) => desc(a.visit_date || a.created_at, b.visit_date || b.created_at)) as ChartVisit[],
        notes: rows(notes) as ChartNote[],
        admissions: newestFirst(admissions) as ChartAdmission[],
        labs: newestFirst(labs) as ChartLab[],
        orders: newestFirst(orders) as ChartOrder[],
        prescriptions: newestFirst(prescriptions) as ChartRx[],
        otCases: newestFirst(otCases) as ChartOtCase[],
        consents: newestFirst(consents) as ChartConsent[],
        discharges: newestFirst(discharges) as ChartDischarge[],
        episodes: rows(episodes) as ChartEpisode[],
      };
    },
    enabled: !!tenantId && !!patientId,
    staleTime: 15_000,
  });
  return { chart: query.data, isLoading: query.isLoading, refetch: query.refetch };
}

// ============================== pure derivations ==============================

export interface ConsultEntry {
  visit: ChartVisit;
  note: ChartNote | null;
  department: string;
  doctor: string;
}
export interface ConsultDoctorGroup { doctor: string; entries: ConsultEntry[] }
export interface ConsultDeptGroup { department: string; doctors: ConsultDoctorGroup[]; total: number }

/**
 * Attribute a visit to its episode's department + attending doctor:
 * 1. the admission whose visit_id IS this visit (the admit flow creates them together);
 * 2. else the latest admission opened at or before the visit date (+24h tolerance — an episode's
 *    follow-up visits attach to the admission that opened that episode);
 * 3. else the patient's latest admission; 4. else "—".
 */
export function attributeVisit(visit: ChartVisit, admissions: ChartAdmission[]): { department: string; doctor: string } {
  const direct = admissions.find((a) => a.visit_id === visit.id);
  const vd = +new Date(visit.visit_date || visit.created_at);
  const before = admissions
    .filter((a) => +new Date(a.created_at) <= vd + 86_400_000)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const pick = direct || before || admissions[0] || null;
  return {
    department: pick?.department_name || "—",
    doctor: pick?.attending_name ? `Dr. ${pick.attending_name.replace(/^Dr\.?\s*/i, "")}` : "—",
  };
}

/** Consultations grouped Department → Doctor → dated entries (newest first), per the client's ask. */
export function groupConsultations(chart: ChartData): ConsultDeptGroup[] {
  const noteByVisit = new Map(chart.notes.map((n) => [n.visit_id, n]));
  const entries: ConsultEntry[] = chart.visits
    .slice()
    .sort((a, b) => desc(a.visit_date || a.created_at, b.visit_date || b.created_at))
    .map((v) => ({ visit: v, note: noteByVisit.get(v.id) || null, ...attributeVisit(v, chart.admissions) }));
  const deptMap = new Map<string, Map<string, ConsultEntry[]>>();
  for (const e of entries) {
    if (!deptMap.has(e.department)) deptMap.set(e.department, new Map());
    const docMap = deptMap.get(e.department)!;
    if (!docMap.has(e.doctor)) docMap.set(e.doctor, []);
    docMap.get(e.doctor)!.push(e);
  }
  // departments ordered by their newest entry; doctors likewise (entries are already newest-first)
  const groups: ConsultDeptGroup[] = Array.from(deptMap.entries()).map(([department, docMap]) => ({
    department,
    doctors: Array.from(docMap.entries()).map(([doctor, es]) => ({ doctor, entries: es })),
    total: Array.from(docMap.values()).reduce((n, es) => n + es.length, 0),
  }));
  const newest = (g: ConsultDeptGroup) => Math.max(...g.doctors.flatMap((d) => d.entries.map((e) => +new Date(e.visit.visit_date || e.visit.created_at))));
  groups.sort((a, b) => newest(b) - newest(a));
  groups.forEach((g) => g.doctors.sort((a, b) =>
    +new Date(b.entries[0]?.visit.visit_date || 0) - +new Date(a.entries[0]?.visit.visit_date || 0)));
  return groups;
}

const VITAL_KEYS = ["blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "temperature", "respiratory_rate", "spo2", "sugar"] as const;
export const visitHasVitals = (v: ChartVisit) => VITAL_KEYS.some((k) => v[k] != null);

export const medicationOrders = (c: ChartData) => c.orders.filter((o) => o.order_type === "medication" && o.status !== "cancelled");
export const imagingResults = (c: ChartData) => c.orders.filter((o) => o.order_type === "imaging" && ["resulted", "reviewed"].includes(o.status));
export const signedOpNotes = (c: ChartData) => c.otCases.filter((o) => !!o.op_note_signed_at);
export const signedRx = (c: ChartData) => c.prescriptions.filter((p) => p.status === "signed");
export const signedDischarges = (c: ChartData) => c.discharges.filter((d) => d.status === "signed");
export const pendingResults = (c: ChartData) => c.orders.filter((o) => ["lab", "imaging"].includes(o.order_type) && ["ordered", "routed", "in_progress"].includes(o.status));

/** Tab count badges — every count is a row count a DB query can reproduce exactly. */
export function chartCounts(c: ChartData) {
  return {
    consultations: c.visits.length,
    labs: c.labs.length,
    reports: signedOpNotes(c).length + c.consents.length + c.discharges.length + imagingResults(c).length,
    medications: c.prescriptions.length + medicationOrders(c).length,
    surgery: c.otCases.length,
    vitals: c.visits.filter(visitHasVitals).length,
    documents: signedRx(c).length + c.consents.length + signedOpNotes(c).length + signedDischarges(c).length + c.labs.length,
  };
}

export interface WatchFlag { label: string; value: string; status: VitalStatus | "ews" }

/** Current watch flags: latest-vitals warnings/criticals + an active post-op EWS alert. */
export function watchFlags(c: ChartData, thresholds: any): WatchFlag[] {
  const flags: WatchFlag[] = [];
  const latest = c.visits.filter(visitHasVitals)
    .sort((a, b) => desc(a.visit_date || a.created_at, b.visit_date || b.created_at))[0];
  if (latest) {
    const sys = classifyVital("blood_pressure_systolic", latest.blood_pressure_systolic, thresholds);
    const dia = classifyVital("blood_pressure_diastolic", latest.blood_pressure_diastolic, thresholds);
    const bp: VitalStatus = [sys, dia].includes("critical") ? "critical" : [sys, dia].includes("warning") ? "warning" : "normal";
    if (bp === "critical" || bp === "warning")
      flags.push({ label: "BP", value: `${latest.blood_pressure_systolic ?? "—"}/${latest.blood_pressure_diastolic ?? "—"}`, status: bp });
    const singles: [string, keyof ChartVisit][] = [["Pulse", "heart_rate"], ["SpO₂", "spo2"], ["Temp", "temperature"], ["Resp", "respiratory_rate"], ["Sugar", "sugar"]];
    for (const [label, key] of singles) {
      const s = classifyVital(key as any, latest[key] as any, thresholds);
      if (s === "critical" || s === "warning") flags.push({ label, value: String(latest[key]), status: s });
    }
  }
  const ep = c.episodes.find((e) => e.status === "active" && (e.latest_band === "high" || e.latest_band === "medium" || e.trend === "deteriorating"));
  if (ep) flags.push({ label: "EWS", value: `${ep.latest_score ?? "—"} ${ep.latest_band || ""}`.trim(), status: "ews" });
  // criticals first
  const rank = (s: WatchFlag["status"]) => (s === "critical" ? 0 : s === "ews" ? 1 : 2);
  return flags.sort((a, b) => rank(a.status) - rank(b.status));
}

/** Overview stat cards — deterministic, DB-reproducible. */
export function overviewStats(c: ChartData, thresholds: any) {
  const dx = new Set<string>();
  c.visits.forEach((v) => { const d = (v.diagnosis || "").trim(); if (d) dx.add(d.toLowerCase()); });
  c.otCases.forEach((o) => { const d = (o.pre_op_diagnosis || "").trim(); if (d) dx.add(d.toLowerCase()); });
  const latestSigned = signedRx(c)[0];
  const activeMeds = latestSigned ? (latestSigned.items?.length ?? 0) : medicationOrders(c).length;
  return {
    activeDiagnosis: dx.size,
    openWatchFlags: watchFlags(c, thresholds).length,
    activeMedications: activeMeds,
    pendingResults: pendingResults(c).length,
  };
}

export interface ActivityEvent { at: string; kind: string; title: string }

/** Recent Activity — the newest events across every chart source (capped). */
export function recentActivity(c: ChartData, cap = 10): ActivityEvent[] {
  const ev: ActivityEvent[] = [];
  c.visits.forEach((v) => ev.push({ at: v.visit_date || v.created_at, kind: "visit", title: v.diagnosis || "" }));
  c.notes.forEach((n) => ev.push({ at: n.updated_at || n.created_at, kind: "note", title: n.chief_complaint || "" }));
  c.orders.forEach((o) => ev.push({ at: o.created_at, kind: `order_${o.order_type}`, title: (o.details as any)?.item || "" }));
  c.labs.forEach((l) => ev.push({ at: l.created_at, kind: "lab", title: l.file_name || "" }));
  c.prescriptions.forEach((p) => ev.push({ at: p.signed_at || p.created_at, kind: p.status === "signed" ? "rx_signed" : "rx_draft", title: `${p.items?.length ?? 0}` }));
  c.otCases.forEach((o) => ev.push({ at: o.op_note_signed_at || o.created_at, kind: "ot", title: o.procedure_name }));
  c.consents.forEach((x) => ev.push({ at: x.signed_at || x.created_at, kind: "consent", title: x.procedure || "" }));
  c.discharges.forEach((d) => ev.push({ at: d.signed_at || d.created_at, kind: d.status === "signed" ? "discharge_signed" : "discharge_draft", title: "" }));
  return ev.sort((a, b) => desc(a.at, b.at)).slice(0, cap);
}

export interface ChartDocument { at: string; kind: "rx" | "consent" | "opnote" | "discharge" | "labpdf"; title: string; meta?: string }

/** Documents — the print artifacts that exist for this patient. */
export function chartDocuments(c: ChartData): ChartDocument[] {
  const docs: ChartDocument[] = [];
  signedRx(c).forEach((p) => docs.push({ at: p.signed_at || p.created_at, kind: "rx", title: `${p.items?.length ?? 0}`, meta: p.status }));
  c.consents.forEach((x) => docs.push({ at: x.signed_at || x.created_at, kind: "consent", title: x.procedure || "", meta: x.language || undefined }));
  signedOpNotes(c).forEach((o) => docs.push({ at: o.op_note_signed_at!, kind: "opnote", title: o.procedure_name }));
  signedDischarges(c).forEach((d) => docs.push({ at: d.signed_at || d.created_at, kind: "discharge", title: "", meta: d.language || undefined }));
  c.labs.forEach((l) => docs.push({ at: l.created_at, kind: "labpdf", title: l.file_name || "lab report" }));
  return docs.sort((a, b) => desc(a.at, b.at));
}
