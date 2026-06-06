import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity, HeartPulse, Stethoscope, FlaskConical, Pill, ScanLine, Sparkles, Plus,
  ClipboardList, CheckCircle2, Clock, Loader2, UserPlus, AlertTriangle,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicVisits } from "@/hooks/useClinicVisits";
import {
  useHospitalOrders, useHospitalDepartments, ORDER_TYPE_LABEL, STATUS_LABEL, NEXT_STATUS,
  type HospitalOrderType,
} from "@/hooks/useHospitalOrders";
import { VITAL_FIELDS, classifyVital, summarizeVitals, DEFAULT_THRESHOLDS, type VitalStatus } from "@/lib/clinic/vitalsThresholds";
import { PatientRegistrationDialog } from "@/components/clinic/PatientRegistrationDialog";
import { useToast } from "@/hooks/use-toast";
import { HospitalGate, EcgLine, fetchMedicaBrief } from "./hospitalShared";

const PATHWAY = ["Registered", "Triaged", "In Consult", "Orders Placed", "In Treatment", "Results Ready", "Discharged"];

// Key vitals to surface on the command surface (subset of the clinic floor vitals).
const KEY_VITALS = ["temperature", "heart_rate", "spo2", "respiratory_rate", "sugar"] as const;

function initials(name?: string) {
  return (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || "").join("") || "?";
}
function ageFrom(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(+d)) return null;
  return Math.max(0, Math.floor((Date.now() - +d) / 31557600000));
}

/** Minimal, safe markdown-lite renderer for the MEDICA brief (no raw HTML). */
function renderBrief(text: string) {
  const cleaned = text.replace(/^\s*\*\*\[[^\]]*\]\*\*\s*/, "").trim();
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>);
  return cleaned.split("\n").map((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) return <div key={i} style={{ fontWeight: 650, color: "#fff", marginTop: i ? 10 : 0 }}>{inline(h[1])}</div>;
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    if (b) return <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 2 }}><span style={{ color: "var(--hx-accent)" }}>•</span><span>{inline(b[1])}</span></div>;
    return <div key={i}>{inline(line)}</div>;
  });
}

function PatientJourneyInner() {
  const { translate } = useTenant();
  const { toast } = useToast();
  const { patients, createPatient } = useClinicPatients();
  const { visits } = useClinicVisits();
  const { data: departments = [] } = useHospitalDepartments();

  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string>("");
  const [admitOpen, setAdmitOpen] = useState(false);

  useEffect(() => {
    if (selectedId || !patients.length) return;
    const fromUrl = searchParams.get("patient");
    setSelectedId(fromUrl && patients.some((p: any) => p.id === fromUrl) ? fromUrl : patients[0].id);
  }, [patients, selectedId, searchParams]);

  const patient = useMemo(() => patients.find((p: any) => p.id === selectedId), [patients, selectedId]);
  const { orders, createOrder, updateOrderStatus } = useHospitalOrders({ patientId: selectedId || undefined });

  // latest visit (with vitals) for this patient
  const latestVisit = useMemo(() => {
    const mine = (visits as any[]).filter((v) => v.patient_id === selectedId);
    mine.sort((a, b) => +new Date(b.visit_date || b.created_at) - +new Date(a.visit_date || a.created_at));
    return mine[0];
  }, [visits, selectedId]);

  const thresholds = DEFAULT_THRESHOLDS;
  const vitalsSummary = useMemo(
    () => (latestVisit ? summarizeVitals(latestVisit, thresholds) : { worst: "empty" as VitalStatus, warnings: [], criticals: [] }),
    [latestVisit, thresholds],
  );

  // ---- MEDICA brief state ----
  const [briefState, setBriefState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [brief, setBrief] = useState<string>("");
  const [briefErr, setBriefErr] = useState<string>("");
  useEffect(() => { setBriefState("idle"); setBrief(""); setBriefErr(""); }, [selectedId]);

  async function askMedica() {
    if (!patient) return;
    setBriefState("loading"); setBriefErr("");
    try {
      const r = await fetchMedicaBrief(patient.full_name, patient.id);
      setBrief(r.response); setBriefState("done");
    } catch (e: any) {
      setBriefErr(e?.message || "MEDICA is unavailable right now."); setBriefState("error");
    }
  }

  // ---- order entry ----
  const [orderType, setOrderType] = useState<HospitalOrderType>("medication");
  const [orderDetail, setOrderDetail] = useState("");
  const [orderDept, setOrderDept] = useState("");
  const deptForType = (t: HospitalOrderType) =>
    departments.find((d) => (t === "medication" ? d.kind === "pharmacy" : t === "lab" ? d.kind === "lab" : d.kind === "radiology"));
  useEffect(() => { setOrderDept(deptForType(orderType)?.id || ""); }, [orderType, departments]);

  async function placeOrder() {
    if (!patient || !orderDetail.trim()) return;
    try {
      await createOrder.mutateAsync({
        patient_id: patient.id,
        visit_id: latestVisit?.id ?? null,
        order_type: orderType,
        department_id: orderDept || null,
        status: "ordered",
        details: { item: orderDetail.trim() },
      });
      toast({ title: "Order placed", description: `${ORDER_TYPE_LABEL[orderType]} · ${orderDetail.trim()} routed to ${orderType === "medication" ? "Pharmacy" : orderType === "lab" ? "Laboratory" : "Diagnostics"}.` });
      setOrderDetail("");
    } catch (e: any) {
      toast({ title: "Could not place order", description: e?.message || "Please try again.", variant: "destructive" });
    }
  }

  // derived pathway stage
  const stageIndex = useMemo(() => {
    if (!patient) return 0;
    if (orders.some((o) => ["resulted", "dispensed", "reviewed"].includes(o.status))) return 5;
    if (orders.length) return 3;
    if (latestVisit?.vitals_completed) return 2;
    if (latestVisit) return 1;
    return 0;
  }, [patient, orders, latestVisit]);

  const queues: { type: HospitalOrderType; title: string; icon: any }[] = [
    { type: "medication", title: "Pharmacy", icon: Pill },
    { type: "lab", title: "Laboratory", icon: FlaskConical },
    { type: "imaging", title: "Diagnostics", icon: ScanLine },
  ];

  if (!patient) {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center hx-rise">
        <div className="hx-eyebrow mb-3">Hospital · Patient Journey</div>
        <h1 className="hx-h1 mb-2">No patients admitted yet</h1>
        <p className="hx-dim mb-6">Admit the first {translate("customer").toLowerCase()} to begin the cardio pathway.</p>
        <button className="hx-btn hx-btn--primary mx-auto" onClick={() => setAdmitOpen(true)} data-testid="hx-admit-empty">
          <UserPlus className="h-4 w-4" /> Admit a Patient
        </button>
        <PatientRegistrationDialog open={admitOpen} onOpenChange={setAdmitOpen} onCreate={(p) => createPatient.mutateAsync(p as any)} />
      </div>
    );
  }

  const age = ageFrom(patient.date_of_birth);

  return (
    <div data-testid="hx-patient-journey">
      {/* ---------- HEADER ---------- */}
      <div className="hx-panel hx-panel--accent hx-rise" style={{ animationDelay: "0ms" }}>
        <div className="hx-panel-b">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center rounded-2xl"
                style={{ width: 56, height: 56, background: "linear-gradient(135deg, rgba(34,211,238,.18), rgba(45,212,191,.12))", border: "1px solid var(--hx-border-strong)", fontWeight: 700, fontSize: 18 }}>
                {initials(patient.full_name)}
              </div>
              <div>
                <div className="hx-eyebrow">Hospital · Patient Journey</div>
                <div className="hx-h1" data-testid="hx-patient-name">{patient.full_name}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm hx-dim">
                  <span className="hx-mono">MRN {String(patient.id).slice(0, 8).toUpperCase()}</span>
                  {age != null && <><span className="hx-faint">·</span><span>{age}y</span></>}
                  {patient.gender && <><span className="hx-faint">·</span><span className="capitalize">{patient.gender}</span></>}
                  {patient.phone && <><span className="hx-faint">·</span><span className="hx-mono">{patient.phone}</span></>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {patients.length > 1 && (
                <select className="hx-select" style={{ width: "auto", minWidth: 180 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)} data-testid="hx-patient-select">
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              )}
              <button className="hx-btn hx-btn--ghost" onClick={() => setAdmitOpen(true)} data-testid="hx-admit">
                <UserPlus className="h-4 w-4" /> Admit
              </button>
            </div>
          </div>

          {/* pathway stepper */}
          <div className="hx-path mt-5">
            {PATHWAY.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className={`hx-path-step ${i < stageIndex ? "done" : i === stageIndex ? "active" : ""}`}>
                  <span className="dot" /> {s}
                </span>
                {i < PATHWAY.length - 1 && <span className="hx-path-sep">›</span>}
              </span>
            ))}
          </div>
          <EcgLine className="mt-4" />
        </div>
      </div>

      {/* ---------- GRID ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* LEFT: spine + vitals */}
        <div className="lg:col-span-5 space-y-4">
          {/* journey spine */}
          <div className="hx-panel hx-rise" style={{ animationDelay: "80ms" }}>
            <div className="hx-panel-h"><Activity className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} /><span className="font-semibold">Care Pathway</span></div>
            <div className="hx-panel-b">
              <div className="hx-spine">
                <SpineNode done={!!patient} active={false} icon={UserPlus} title="Admitted"
                  sub={patient.created_at ? new Date(patient.created_at).toLocaleDateString() : "Registered"} />
                <SpineNode done={!!latestVisit?.vitals_completed} active={stageIndex === 1} icon={HeartPulse} title="Nurse · Vitals"
                  sub={latestVisit?.vitals_completed
                    ? (vitalsSummary.worst === "critical" ? "Critical flag" : vitalsSummary.worst === "warning" ? "Watch flag" : "Within range")
                    : "Awaiting vitals"} tone={vitalsSummary.worst} />
                <SpineNode done={briefState === "done"} active={stageIndex === 2} icon={Stethoscope} title="Cardiologist · Consult"
                  sub={briefState === "done" ? "MEDICA briefing reviewed" : "Pre-visit briefing"} />
                <SpineNode done={orders.length > 0} active={stageIndex === 3} icon={ClipboardList} title="Orders"
                  sub={orders.length ? `${orders.length} order${orders.length > 1 ? "s" : ""} placed` : "No orders yet"} />
                <SpineNode done={orders.some((o) => ["resulted", "dispensed", "reviewed"].includes(o.status))} active={stageIndex >= 4}
                  icon={Pill} title="Pharmacy & Diagnostics"
                  sub={orders.filter((o) => ["resulted", "dispensed", "reviewed"].includes(o.status)).length
                    ? `${orders.filter((o) => ["resulted", "dispensed", "reviewed"].includes(o.status)).length} fulfilled`
                    : "Routing to departments"} />
              </div>
            </div>
          </div>

          {/* vitals */}
          <div className="hx-panel hx-rise" style={{ animationDelay: "160ms" }}>
            <div className="hx-panel-h">
              <HeartPulse className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} />
              <span className="font-semibold">Vitals</span>
              <span className="ml-auto">
                {vitalsSummary.worst === "critical" && <span className="hx-chip hx-chip--crit" data-testid="hx-vitals-critical"><AlertTriangle className="h-3 w-3" /> Critical</span>}
                {vitalsSummary.worst === "warning" && <span className="hx-chip hx-chip--warn" data-testid="hx-vitals-warning"><AlertTriangle className="h-3 w-3" /> Watch</span>}
                {vitalsSummary.worst === "normal" && <span className="hx-chip hx-chip--ok"><CheckCircle2 className="h-3 w-3" /> Stable</span>}
                {vitalsSummary.worst === "empty" && <span className="hx-chip">No data</span>}
              </span>
            </div>
            <div className="hx-panel-b">
              {!latestVisit ? (
                <p className="hx-dim text-sm">No vitals captured yet — capture vitals from the nurse station to populate the two-tier flags.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {/* BP combined */}
                  <BpCell sys={latestVisit.blood_pressure_systolic} dia={latestVisit.blood_pressure_diastolic} thresholds={thresholds} />
                  {KEY_VITALS.map((k) => {
                    const f = VITAL_FIELDS.find((x) => x.key === k)!;
                    const val = latestVisit[k];
                    const status = classifyVital(k, val, thresholds);
                    return (
                      <div key={k} className={`hx-vital hx-vital--${status}`} data-testid={`hx-vital-${k}`} data-status={status}>
                        <div className="v">{val ?? "—"}<span className="text-xs hx-faint ml-0.5">{f.unit}</span></div>
                        <div className="l">{f.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: MEDICA brief + order entry + queues */}
        <div className="lg:col-span-7 space-y-4">
          {/* MEDICA brief */}
          <div className="hx-panel hx-panel--accent hx-rise" style={{ animationDelay: "120ms" }}>
            <div className="hx-panel-h">
              <Sparkles className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
              <span className="font-semibold">MEDICA — Pre-visit Briefing</span>
              <button className="hx-btn hx-btn--primary ml-auto" style={{ padding: "0.4rem 0.85rem" }} onClick={askMedica} disabled={briefState === "loading"} data-testid="hx-ask-medica">
                {briefState === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : <><Sparkles className="h-4 w-4" /> Anything I should know?</>}
              </button>
            </div>
            <div className="hx-panel-b">
              {briefState === "idle" && (
                <p className="hx-dim text-sm">Ask MEDICA for a grounded pre-visit briefing on <strong style={{ color: "#fff" }}>{patient.full_name}</strong> — it reads the live patient record (history, vitals, orders) and flags what matters before the encounter.</p>
              )}
              {briefState === "loading" && (
                <div className="hx-analysing" data-testid="hx-brief-loading">
                  <div className="flex items-center gap-2.5 mb-3"><span className="hx-pulse-dot" /><span className="hx-dim text-sm">MEDICA is reading the chart and reasoning over the record…</span></div>
                  <div className="space-y-2">
                    {[92, 78, 85, 64].map((w, i) => <div key={i} style={{ height: 10, width: `${w}%`, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />)}
                  </div>
                </div>
              )}
              {briefState === "done" && <div className="hx-brief" data-testid="hx-brief-result">{renderBrief(brief)}</div>}
              {briefState === "error" && (
                <div className="text-sm" data-testid="hx-brief-error">
                  <p className="hx-chip hx-chip--warn mb-2"><AlertTriangle className="h-3 w-3" /> Briefing unavailable</p>
                  <p className="hx-dim">{briefErr} <button className="underline" style={{ color: "var(--hx-accent)" }} onClick={askMedica}>Retry</button></p>
                </div>
              )}
            </div>
          </div>

          {/* order entry */}
          <div className="hx-panel hx-rise" style={{ animationDelay: "200ms" }}>
            <div className="hx-panel-h"><Plus className="h-4 w-4" style={{ color: "var(--hx-accent2)" }} /><span className="font-semibold">Order Entry</span><span className="hx-faint text-xs ml-auto">tests + medications</span></div>
            <div className="hx-panel-b">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="hx-label">Type</label>
                  <select className="hx-select" value={orderType} onChange={(e) => setOrderType(e.target.value as HospitalOrderType)} data-testid="hx-order-type">
                    <option value="medication">Medication</option>
                    <option value="lab">Lab test</option>
                    <option value="imaging">Imaging</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="hx-label">Department</label>
                  <select className="hx-select" value={orderDept} onChange={(e) => setOrderDept(e.target.value)} data-testid="hx-order-dept">
                    <option value="">Auto-route</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="hx-label">{orderType === "medication" ? "Drug & dose" : orderType === "lab" ? "Test" : "Study"}</label>
                  <input className="hx-input" value={orderDetail} onChange={(e) => setOrderDetail(e.target.value)}
                    placeholder={orderType === "medication" ? "Aspirin 75mg OD" : orderType === "lab" ? "Troponin I, CBC" : "ECG, Chest X-ray"}
                    onKeyDown={(e) => e.key === "Enter" && placeOrder()} data-testid="hx-order-detail" />
                </div>
                <div className="sm:col-span-2">
                  <button className="hx-btn hx-btn--primary w-full" onClick={placeOrder} disabled={!orderDetail.trim() || createOrder.isPending} data-testid="hx-place-order">
                    {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Place</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* routed queues (this patient) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {queues.map((q, qi) => {
              const items = orders.filter((o) => o.order_type === q.type);
              const Icon = q.icon;
              return (
                <div key={q.type} className="hx-panel hx-rise" style={{ animationDelay: `${240 + qi * 60}ms` }} data-testid={`hx-queue-${q.type}`}>
                  <div className="hx-panel-h" style={{ padding: "0.7rem 0.85rem" }}>
                    <Icon className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
                    <span className="font-semibold text-sm">{q.title}</span>
                    <span className="hx-chip hx-chip--accent ml-auto" style={{ padding: "0.1rem 0.45rem" }}>{items.length}</span>
                  </div>
                  <div className="hx-panel-b" style={{ padding: "0.7rem", minHeight: 96 }}>
                    {items.length === 0 ? (
                      <p className="hx-faint text-xs">No {q.title.toLowerCase()} orders.</p>
                    ) : (
                      <ul className="space-y-2">
                        {items.slice(0, 5).map((o) => {
                          const fulfilled = ["resulted", "dispensed", "reviewed"].includes(o.status);
                          return (
                            <li key={o.id} className="flex items-center gap-2" data-testid="hx-queue-item">
                              <span className={`hx-chip ${fulfilled ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.05rem 0.4rem" }}>
                                {fulfilled ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{STATUS_LABEL[o.status]}
                              </span>
                              <span className="text-xs truncate flex-1">{(o.details as any)?.item || "—"}</span>
                              {!fulfilled && NEXT_STATUS[q.type] && (
                                <button className="text-xs underline hx-faint hover:text-white"
                                  onClick={() => updateOrderStatus.mutate({ id: o.id, status: NEXT_STATUS[q.type]! })}>
                                  {q.type === "medication" ? "dispense" : "result"}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PatientRegistrationDialog open={admitOpen} onOpenChange={setAdmitOpen} onCreate={(p) => createPatient.mutateAsync(p as any)} />
    </div>
  );
}

function SpineNode({ done, active, icon: Icon, title, sub, tone }:
  { done: boolean; active: boolean; icon: any; title: string; sub: string; tone?: VitalStatus }) {
  const toneColor = tone === "critical" ? "var(--hx-crit)" : tone === "warning" ? "var(--hx-warn)" : undefined;
  return (
    <div className={`hx-node ${done ? "done" : ""} ${active ? "active" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: done ? "var(--hx-accent2)" : active ? "var(--hx-accent)" : "var(--hx-faint)" }} />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="text-xs mt-0.5" style={{ color: toneColor || "var(--hx-dim)" }}>{sub}</div>
    </div>
  );
}

function BpCell({ sys, dia, thresholds }: { sys: any; dia: any; thresholds: any }) {
  const s1 = classifyVital("blood_pressure_systolic", sys, thresholds);
  const s2 = classifyVital("blood_pressure_diastolic", dia, thresholds);
  const worst: VitalStatus = [s1, s2].includes("critical") ? "critical" : [s1, s2].includes("warning") ? "warning" : (sys || dia) ? "normal" : "empty";
  return (
    <div className={`hx-vital hx-vital--${worst}`} data-testid="hx-vital-bp" data-status={worst}>
      <div className="v">{sys ?? "—"}/{dia ?? "—"}<span className="text-xs hx-faint ml-0.5">mmHg</span></div>
      <div className="l">Blood Pressure</div>
    </div>
  );
}

export default function PatientJourney() {
  return <HospitalGate><PatientJourneyInner /></HospitalGate>;
}
