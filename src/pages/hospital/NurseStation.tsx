// Nurse Station (/hospital/nurse) — the nurse's own screen: register/admit a patient,
// see the live patient queue, and capture vitals (flags light live). Additive; reuses
// clinic_patients + clinic_visits. Same dark .hx surface as the rest of the vertical.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, HeartPulse, Stethoscope, Clock, CheckCircle2, AlertTriangle, ArrowRight, ArrowRightLeft, Inbox, Loader2, X } from "lucide-react";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicVisits } from "@/hooks/useClinicVisits";
import { useForwardToDoctor, useWaitingMap } from "@/hooks/useHospitalDoctorQueue";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useToast } from "@/hooks/use-toast";
import { summarizeVitals, DEFAULT_THRESHOLDS, type VitalStatus } from "@/lib/clinic/vitalsThresholds";
import { HospitalGate, EcgLine } from "./hospitalShared";
import { NurseWorklist } from "./NurseWorklist";
import { useHospitalT } from "./i18n";
import { HospitalAdmitDialog } from "@/components/hospital/HospitalAdmitDialog";
import { VitalsCaptureDialog } from "@/components/hospital/VitalsCaptureDialog";

function initials(name?: string) {
  return (name || "?").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || "").join("") || "?";
}

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  waiting: { cls: "hx-chip--warn", label: "Waiting" },
  in_progress: { cls: "hx-chip--accent", label: "In progress" },
  completed: { cls: "hx-chip--ok", label: "Completed" },
};

function NurseStationInner() {
  const navigate = useNavigate();
  const { t, ti } = useHospitalT();
  const { toast } = useToast();
  const { patients } = useClinicPatients();
  const { visits } = useClinicVisits();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [vitalsFor, setVitalsFor] = useState<{ id: string; name: string; visitId?: string } | null>(null);

  // HOSPITAL-FLOW [Brief 9] — triage forwarding: after vitals, forward the patient to a
  // department → doctor (hr_employees). Creates a hospital_doctor_queue row (source='nurse').
  const { doctors, byId } = useHospitalStaff();
  const { data: waitingMap } = useWaitingMap();
  const forward = useForwardToDoctor();
  const [forwardFor, setForwardFor] = useState<string | null>(null);
  const [fDept, setFDept] = useState("");
  const [fDoctor, setFDoctor] = useState("");
  const [fReason, setFReason] = useState("");
  const fwdDepts = useMemo(() => Array.from(new Set(doctors.map((d) => d.department).filter(Boolean))) as string[], [doctors]);
  const fwdDoctors = useMemo(() => doctors.filter((d) => !fDept || d.department === fDept), [doctors, fDept]);

  async function doForward(patientId: string, patientName: string) {
    if (!fDoctor) { toast({ title: t("dispo.pickDoctor"), variant: "destructive" }); return; }
    const doc = byId[fDoctor];
    try {
      const res = await forward.mutateAsync({
        patientId, doctorId: fDoctor, doctorName: doc?.name || null,
        departmentName: fDept || doc?.department || null, source: "nurse", reason: fReason,
      });
      toast({ title: res.duplicate ? t("flow.alreadyWaiting") : ti("flow.forwarded", { doctor: doc?.name || "" }), description: patientName });
      setForwardFor(null); setFDept(""); setFDoctor(""); setFReason("");
    } catch (e: any) {
      toast({ title: t("flow.forwardFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  // latest visit per patient (for status + vitals flag)
  const latestByPatient = useMemo(() => {
    const m: Record<string, any> = {};
    for (const v of visits as any[]) {
      const cur = m[v.patient_id];
      if (!cur || +new Date(v.visit_date) > +new Date(cur.visit_date)) m[v.patient_id] = v;
    }
    return m;
  }, [visits]);

  const rows = useMemo(() => (patients as any[]).map((p) => {
    const v = latestByPatient[p.id];
    const worst: VitalStatus = v ? summarizeVitals(v, DEFAULT_THRESHOLDS).worst : "empty";
    return { p, v, worst };
  }), [patients, latestByPatient]);

  const waiting = rows.filter((r) => r.v && r.v.current_status !== "completed");

  return (
    <div data-testid="hx-nurse">
      {/* hero */}
      <div className="hx-panel hx-panel--accent hx-rise">
        <div className="hx-panel-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-6 w-6" style={{ color: "var(--hx-accent2)" }} />
              <div>
                <div className="hx-eyebrow">{t("nurse.eyebrow")}</div>
                <h1 className="hx-h1">{t("nurse.title")}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hx-chip hx-chip--warn" data-testid="hx-nurse-waiting">{ti("nurse.active", { n: waiting.length })}</span>
              <button className="hx-btn hx-btn--primary" onClick={() => setAdmitOpen(true)} data-testid="hx-nurse-admit">
                <UserPlus className="h-4 w-4" /> {t("nurse.register")}
              </button>
            </div>
          </div>
          <EcgLine className="mt-3" />
        </div>
      </div>

      {/* HOSPITAL-NURSE worklist — orders→tasks + AM/PM rounds + accountability + MEDICA shift brief */}
      <NurseWorklist />

      {/* patient queue */}
      <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "80ms" }}>
        <div className="hx-panel-h"><Stethoscope className="h-4 w-4" style={{ color: "var(--hx-accent)" }} /><span className="font-semibold">{t("nurse.patientQueue")}</span><span className="hx-faint text-xs ml-auto">{t("nurse.queueHint")}</span></div>
        <div className="hx-panel-b">
          {rows.length === 0 ? (
            <div className="text-center py-10 hx-faint"><Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" /><p className="text-sm">{t("nurse.empty")}</p></div>
          ) : (
            <div className="space-y-2">
              {rows.map(({ p, v, worst }) => (
                <div key={p.id} className="rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--hx-border)", background: "rgba(255,255,255,0.015)" }} data-testid="hx-nurse-row">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center rounded-xl shrink-0" style={{ width: 38, height: 38, background: "rgba(34,211,238,0.1)", border: "1px solid var(--hx-border-strong)", fontWeight: 700, fontSize: 13 }}>{initials(p.full_name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.full_name}</div>
                      <div className="hx-faint text-xs hx-mono">{t("journey.mrn")} {p.file_number || String(p.id).slice(0, 8).toUpperCase()}{p.phone ? ` · ${p.phone}` : ""}</div>
                    </div>
                    {waitingMap?.has(p.id) && (
                      <span className="hx-chip hx-chip--accent" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-nurse-forwarded-chip">
                        <ArrowRightLeft className="h-3 w-3" /> {ti("flow.forwardedChip", { doctor: waitingMap.get(p.id)?.doctor_name || "" }, `→ ${waitingMap.get(p.id)?.doctor_name || ""}`)}
                      </span>
                    )}
                    {v && STATUS_CHIP[v.current_status] && <span className={`hx-chip ${STATUS_CHIP[v.current_status].cls}`} style={{ padding: "0.1rem 0.5rem" }}>{v.current_status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{t(`nstatus.${v.current_status}`, STATUS_CHIP[v.current_status].label)}</span>}
                    {worst === "critical" && <span className="hx-chip hx-chip--crit" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-nurse-flag-crit"><AlertTriangle className="h-3 w-3" /> {t("nflag.critical")}</span>}
                    {worst === "warning" && <span className="hx-chip hx-chip--warn" style={{ padding: "0.1rem 0.5rem" }}><AlertTriangle className="h-3 w-3" /> {t("nflag.watch")}</span>}
                    {worst === "normal" && <span className="hx-chip hx-chip--ok" style={{ padding: "0.1rem 0.5rem" }}><CheckCircle2 className="h-3 w-3" /> {t("nflag.stable")}</span>}
                    {worst === "empty" && <span className="hx-chip" style={{ padding: "0.1rem 0.5rem" }}>{t("nflag.noVitals")}</span>}
                    <button className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.6rem" }} onClick={() => setVitalsFor({ id: p.id, name: p.full_name, visitId: v?.id })} data-testid="hx-nurse-vitals">
                      <HeartPulse className="h-3.5 w-3.5" /> {t("nurse.vitals")}
                    </button>
                    {/* [Brief 9] forward to doctor — after vitals (disabled until a vitals-bearing encounter exists) */}
                    <button className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.6rem" }}
                      onClick={() => { setForwardFor(forwardFor === p.id ? null : p.id); setFDept(""); setFDoctor(""); setFReason(""); }}
                      disabled={!v?.vitals_completed} title={!v?.vitals_completed ? t("nflag.noVitals") : undefined}
                      data-testid="hx-nurse-forward">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> {t("flow.forward")}
                    </button>
                    <button className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.6rem" }} onClick={() => navigate(`/hospital/journey?patient=${p.id}`)} data-testid="hx-nurse-journey">
                      {t("nurse.journey")} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {forwardFor === p.id && (
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end" data-testid="hx-nurse-forward-panel">
                      <div className="sm:col-span-3">
                        <label className="hx-label">{t("flow.department")}</label>
                        <select className="hx-select" value={fDept} onChange={(e) => { setFDept(e.target.value); setFDoctor(""); }} data-testid="hx-forward-dept">
                          <option value="">{t("flow.selectDept")}</option>
                          {fwdDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="hx-label">{t("flow.doctor")}</label>
                        <select className="hx-select" value={fDoctor} onChange={(e) => setFDoctor(e.target.value)} data-testid="hx-forward-doctor">
                          <option value="">{t("flow.selectDoctor")}</option>
                          {fwdDoctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="hx-label">{t("flow.reason")}</label>
                        <input className="hx-input" value={fReason} onChange={(e) => setFReason(e.target.value)} placeholder={t("flow.reasonPh")} data-testid="hx-forward-reason" />
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <button className="hx-btn hx-btn--primary" style={{ padding: "0.4rem 0.8rem" }} onClick={() => doForward(p.id, p.full_name)} disabled={forward.isPending} data-testid="hx-forward-confirm">
                          {forward.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />} {t("flow.forward")}
                        </button>
                        <button className="hx-btn hx-btn--ghost" style={{ padding: "0.4rem 0.6rem" }} onClick={() => setForwardFor(null)} data-testid="hx-forward-cancel">
                          <X className="h-3.5 w-3.5" /> {t("common.cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <HospitalAdmitDialog open={admitOpen} onOpenChange={setAdmitOpen} onAdmitted={(r) => navigate(`/hospital/journey?patient=${r.patient_id}`)} />
      <VitalsCaptureDialog open={!!vitalsFor} onOpenChange={(v) => !v && setVitalsFor(null)} patientId={vitalsFor?.id} patientName={vitalsFor?.name} visitId={vitalsFor?.visitId} />
    </div>
  );
}

export default function NurseStation() {
  return <HospitalGate allow={["nurse", "admin"]}><NurseStationInner /></HospitalGate>;
}
