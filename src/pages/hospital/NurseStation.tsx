// Nurse Station (/hospital/nurse) — the nurse's own screen: register/admit a patient,
// see the live patient queue, and capture vitals (flags light live). Additive; reuses
// clinic_patients + clinic_visits. Same dark .hx surface as the rest of the vertical.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, HeartPulse, Stethoscope, Clock, CheckCircle2, AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicVisits } from "@/hooks/useClinicVisits";
import { summarizeVitals, DEFAULT_THRESHOLDS, type VitalStatus } from "@/lib/clinic/vitalsThresholds";
import { HospitalGate, EcgLine } from "./hospitalShared";
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
  const { patients } = useClinicPatients();
  const { visits } = useClinicVisits();
  const [admitOpen, setAdmitOpen] = useState(false);
  const [vitalsFor, setVitalsFor] = useState<{ id: string; name: string; visitId?: string } | null>(null);

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
                <div className="hx-eyebrow">Hospital · Nursing</div>
                <h1 className="hx-h1">Nurse Station</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hx-chip hx-chip--warn" data-testid="hx-nurse-waiting">{waiting.length} active</span>
              <button className="hx-btn hx-btn--primary" onClick={() => setAdmitOpen(true)} data-testid="hx-nurse-admit">
                <UserPlus className="h-4 w-4" /> Register / Admit
              </button>
            </div>
          </div>
          <EcgLine className="mt-3" />
        </div>
      </div>

      {/* patient queue */}
      <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "80ms" }}>
        <div className="hx-panel-h"><Stethoscope className="h-4 w-4" style={{ color: "var(--hx-accent)" }} /><span className="font-semibold">Patient Queue</span><span className="hx-faint text-xs ml-auto">vitals flags by clinical danger</span></div>
        <div className="hx-panel-b">
          {rows.length === 0 ? (
            <div className="text-center py-10 hx-faint"><Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" /><p className="text-sm">No patients yet — register the first patient to begin.</p></div>
          ) : (
            <div className="space-y-2">
              {rows.map(({ p, v, worst }) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--hx-border)", background: "rgba(255,255,255,0.015)" }} data-testid="hx-nurse-row">
                  <div className="grid place-items-center rounded-xl shrink-0" style={{ width: 38, height: 38, background: "rgba(34,211,238,0.1)", border: "1px solid var(--hx-border-strong)", fontWeight: 700, fontSize: 13 }}>{initials(p.full_name)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.full_name}</div>
                    <div className="hx-faint text-xs hx-mono">MRN {String(p.id).slice(0, 8).toUpperCase()}{p.phone ? ` · ${p.phone}` : ""}</div>
                  </div>
                  {v && STATUS_CHIP[v.current_status] && <span className={`hx-chip ${STATUS_CHIP[v.current_status].cls}`} style={{ padding: "0.1rem 0.5rem" }}>{v.current_status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{STATUS_CHIP[v.current_status].label}</span>}
                  {worst === "critical" && <span className="hx-chip hx-chip--crit" style={{ padding: "0.1rem 0.5rem" }} data-testid="hx-nurse-flag-crit"><AlertTriangle className="h-3 w-3" /> Critical</span>}
                  {worst === "warning" && <span className="hx-chip hx-chip--warn" style={{ padding: "0.1rem 0.5rem" }}><AlertTriangle className="h-3 w-3" /> Watch</span>}
                  {worst === "normal" && <span className="hx-chip hx-chip--ok" style={{ padding: "0.1rem 0.5rem" }}><CheckCircle2 className="h-3 w-3" /> Stable</span>}
                  {worst === "empty" && <span className="hx-chip" style={{ padding: "0.1rem 0.5rem" }}>No vitals</span>}
                  <button className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.6rem" }} onClick={() => setVitalsFor({ id: p.id, name: p.full_name, visitId: v?.id })} data-testid="hx-nurse-vitals">
                    <HeartPulse className="h-3.5 w-3.5" /> Vitals
                  </button>
                  <button className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.6rem" }} onClick={() => navigate(`/hospital/journey?patient=${p.id}`)} data-testid="hx-nurse-journey">
                    Journey <ArrowRight className="h-3.5 w-3.5" />
                  </button>
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
  return <HospitalGate><NurseStationInner /></HospitalGate>;
}
