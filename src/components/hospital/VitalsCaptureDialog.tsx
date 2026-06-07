// VitalsCaptureDialog — the nurse manually records vitals → writes clinic_visits
// (reusing useClinicVisits.saveVitals / createVisit). Two-tier flags light LIVE as
// values are typed (same classifyVital engine the journey panel uses). Dark-themed.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HeartPulse, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClinicVisits, type VitalsPayload } from "@/hooks/useClinicVisits";
import { classifyVital, DEFAULT_THRESHOLDS, type VitalStatus } from "@/lib/clinic/vitalsThresholds";

// The vitals a nurse captures at the bedside, in order. key === clinic_visits column.
const FIELDS: { key: keyof VitalsPayload; label: string; unit: string; step?: string }[] = [
  { key: "blood_pressure_systolic", label: "BP Systolic", unit: "mmHg" },
  { key: "blood_pressure_diastolic", label: "BP Diastolic", unit: "mmHg" },
  { key: "heart_rate", label: "Pulse", unit: "bpm" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "respiratory_rate", label: "Resp. rate", unit: "/min" },
  { key: "temperature", label: "Temperature", unit: "°C", step: "0.1" },
  { key: "sugar", label: "Blood sugar", unit: "mg/dL", step: "0.1" },
  { key: "weight_kg", label: "Weight", unit: "kg", step: "0.1" },
];

export function VitalsCaptureDialog({
  open, onOpenChange, patientId, patientName, visitId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  patientId?: string; patientName?: string; visitId?: string | null;
}) {
  const { toast } = useToast();
  const { visits, saveVitals, createVisit } = useClinicVisits();
  const [vals, setVals] = useState<Record<string, string>>({});

  useEffect(() => { if (open) setVals({}); }, [open, patientId]);

  // the visit we write to: the prop, else the patient's latest open (non-completed) visit
  const targetVisit = useMemo(() => {
    if (visitId) return visitId;
    const mine = (visits as any[])
      .filter((v) => v.patient_id === patientId && v.current_status !== "completed")
      .sort((a, b) => +new Date(b.visit_date) - +new Date(a.visit_date));
    return mine[0]?.id as string | undefined;
  }, [visits, patientId, visitId]);

  const status = (key: keyof VitalsPayload): VitalStatus => {
    const raw = vals[key as string];
    if (raw === undefined || raw === "") return "empty";
    return classifyVital(key as string, parseFloat(raw), DEFAULT_THRESHOLDS);
  };
  const worst: VitalStatus = useMemo(() => {
    let w: VitalStatus = "normal";
    for (const f of FIELDS) { const s = status(f.key); if (s === "critical") return "critical"; if (s === "warning") w = "warning"; }
    return w;
  }, [vals]);

  async function save() {
    if (!patientId) { toast({ title: "No patient selected", variant: "destructive" }); return; }
    const payload: VitalsPayload = {};
    let any = false;
    for (const f of FIELDS) {
      const raw = vals[f.key as string];
      if (raw !== undefined && raw !== "") { (payload as any)[f.key] = Number(raw); any = true; }
    }
    if (!any) { toast({ title: "Enter at least one vital", variant: "destructive" }); return; }
    try {
      let vid = targetVisit;
      if (!vid) { const v = await createVisit.mutateAsync(patientId); vid = v.id; }
      await saveVitals.mutateAsync({ id: vid!, vitals: payload });
      toast({ title: "Vitals recorded", description: patientName ? `${patientName} · flags updated live` : "Flags updated" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save vitals", description: e?.message || "Try again.", variant: "destructive" });
    }
  }

  const busy = saveVitals.isPending || createVisit.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="hx-dialog max-w-xl border p-0" style={{ background: "var(--hx-dialog-bg)", borderColor: "var(--hx-dialog-border)", color: "var(--hx-text)" }}>
        <div className="hx" style={{ margin: 0, minHeight: 0, padding: "1.4rem 1.5rem 1.6rem", background: "transparent" }} data-testid="hx-vitals-dialog">
          <div className="flex items-center gap-3 mb-1">
            <HeartPulse className="h-5 w-5" style={{ color: "var(--hx-accent2)" }} />
            <div>
              <div className="hx-eyebrow">Nurse station · Vitals</div>
              <div className="hx-h1" style={{ fontSize: "1.2rem" }}>Capture vitals{patientName ? ` — ${patientName}` : ""}</div>
            </div>
            <span className="ml-auto">
              {worst === "critical" && <span className="hx-chip hx-chip--crit"><AlertTriangle className="h-3 w-3" /> Critical</span>}
              {worst === "warning" && <span className="hx-chip hx-chip--warn"><AlertTriangle className="h-3 w-3" /> Watch</span>}
              {worst === "normal" && <span className="hx-chip hx-chip--ok"><CheckCircle2 className="h-3 w-3" /> In range</span>}
            </span>
          </div>
          <p className="hx-dim text-sm mb-4">Type the readings — flags light by clinical danger as you go (low SpO₂ is critical, not low-is-fine).</p>

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((fld) => {
              const st = status(fld.key);
              const color = st === "critical" ? "var(--hx-crit)" : st === "warning" ? "var(--hx-warn)" : "var(--hx-text)";
              return (
                <div key={fld.key as string}>
                  <label className="hx-label">{fld.label} <span className="hx-faint">{fld.unit}</span></label>
                  <div className="flex items-center gap-2">
                    <input type="number" step={fld.step} className="hx-input" style={{ color }} value={vals[fld.key as string] ?? ""}
                      onChange={(e) => setVals((s) => ({ ...s, [fld.key as string]: e.target.value }))}
                      data-testid={`hx-vc-${String(fld.key)}`} />
                    {st !== "empty" && st !== "normal" && (
                      <span className={`hx-chip ${st === "critical" ? "hx-chip--crit" : "hx-chip--warn"}`} style={{ padding: "0.05rem 0.4rem" }}>{st === "critical" ? "CRIT" : "HIGH/LOW"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 mt-5">
            <span className="hx-faint text-xs">{targetVisit ? "Updating the current encounter" : "A new encounter will be opened"}</span>
            <div className="flex gap-2">
              <button type="button" className="hx-btn hx-btn--ghost" onClick={() => onOpenChange(false)}>Cancel</button>
              <button type="button" className="hx-btn hx-btn--primary" onClick={save} disabled={busy} data-testid="hx-vc-save">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><HeartPulse className="h-4 w-4" /> Record vitals</>}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
