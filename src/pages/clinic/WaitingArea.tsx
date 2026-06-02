import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { useClinicVisits, useClinicVitalsConfig, type ClinicVisit, type VitalsPayload } from "@/hooks/useClinicVisits";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import {
  VITAL_FIELDS, buildThresholdMap, classifyVital, summarizeVitals, type VitalStatus,
} from "@/lib/clinic/vitalsThresholds";
import { Activity, UserPlus, Clock, Stethoscope, CheckCircle2, AlertTriangle, Search, Lock } from "lucide-react";

const REQUIRED = ["temperature", "heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", "spo2"];

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function waitTime(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
const statusStyle: Record<VitalStatus, string> = {
  critical: "border-destructive ring-1 ring-destructive",
  warning: "border-amber-500 ring-1 ring-amber-500",
  normal: "", empty: "",
};

export default function WaitingArea() {
  const { isHealthcareClinic } = useTenant();
  const { visits, isLoading, createVisit, saveVitals, completeVisit } = useClinicVisits();
  const { patients } = useClinicPatients();
  const { data: vitalsConfig } = useClinicVitalsConfig();
  const { toast } = useToast();
  const thresholds = useMemo(() => buildThresholdMap(vitalsConfig), [vitalsConfig]);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [vitalsVisit, setVitalsVisit] = useState<ClinicVisit | null>(null);

  // MANDATORY industry gate: the /clinic route is reachable by URL for any authed user
  // (no route-level gate), so non-clinic tenants must NOT see floor data/PHI here.
  if (!isHealthcareClinic) {
    return (
      <div className="space-y-6 p-6" data-testid="clinic-floor-not-available">
        <h1 className="text-3xl font-bold tracking-tight">Visit Board</h1>
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          The clinic floor is only available for healthcare clinic workspaces.
        </CardContent></Card>
      </div>
    );
  }

  const waiting = visits.filter((v) => v.current_status === "waiting");
  const inTreatment = visits.filter((v) => v.current_status === "in_progress");
  const completedToday = visits.filter((v) => v.current_status === "completed" && isToday(v.completed_date));

  const filteredPatients = (patients as any[]).filter((p) =>
    !patientSearch || (p.full_name || "").toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone || "").includes(patientSearch));

  const handleCheckIn = async (patientId: string, name: string) => {
    try {
      await createVisit.mutateAsync(patientId);
      toast({ title: "Patient checked in", description: `${name} added to the waiting room.` });
      setCheckInOpen(false); setPatientSearch("");
    } catch (e: any) {
      toast({ title: "Check-in failed", description: e.message, variant: "destructive" });
    }
  };
  const handleComplete = async (v: ClinicVisit) => {
    try {
      await completeVisit.mutateAsync(v.id);
      toast({ title: "Visit completed", description: `${v.patient?.full_name ?? "Patient"} — visit closed.` });
    } catch (e: any) {
      toast({ title: "Could not complete visit", description: e.message, variant: "destructive" });
    }
  };

  const VisitCard = ({ v }: { v: ClinicVisit }) => {
    const summary = summarizeVitals(v as any, thresholds);
    return (
      <Card data-testid="visit-card" className="border">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold" data-testid="visit-patient-name">{v.patient?.full_name ?? "Unknown patient"}</div>
            <Badge variant="outline">Visit #{v.visit_number}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{waitTime(v.visit_date)}</span>
            {v.vitals_completed
              ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />Vitals done</span>
              : <span className="inline-flex items-center gap-1">Awaiting vitals</span>}
            {v.is_locked && <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />Locked</span>}
          </div>
          {v.vitals_completed && summary.worst !== "normal" && (
            <div data-testid="visit-alert"
              className={`text-xs rounded px-2 py-1 inline-flex items-center gap-1 ${summary.worst === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>
              <AlertTriangle className="h-3 w-3" />
              {summary.worst === "critical" ? `Critical: ${summary.criticals.join(", ")}` : `Warning: ${summary.warnings.join(", ")}`}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {v.current_status === "waiting" && (
              <Button size="sm" data-testid="take-vitals-btn" onClick={() => setVitalsVisit(v)}>
                <Activity className="h-4 w-4 mr-1" />Take Vitals
              </Button>
            )}
            {v.current_status === "in_progress" && !v.vitals_completed && (
              <Button size="sm" data-testid="take-vitals-btn" onClick={() => setVitalsVisit(v)}>
                <Activity className="h-4 w-4 mr-1" />Enter Vitals
              </Button>
            )}
            {v.current_status === "in_progress" && v.vitals_completed && (
              <>
                <Button size="sm" variant="outline" onClick={() => setVitalsVisit(v)}>Review Vitals</Button>
                <Button size="sm" data-testid="complete-visit-btn" onClick={() => handleComplete(v)} disabled={completeVisit.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Complete Visit
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const Section = ({ title, icon, items, testid }: { title: string; icon: React.ReactNode; items: ClinicVisit[]; testid: string }) => (
    <div className="flex-1 min-w-[280px]" data-testid={testid}>
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
        {icon}{title}<Badge variant="secondary" data-testid={`${testid}-count`}>{items.length}</Badge>
      </div>
      <div className="space-y-3">
        {items.length === 0
          ? <Card><CardContent className="py-6 text-center text-xs text-muted-foreground">None</CardContent></Card>
          : items.map((v) => <VisitCard key={v.id} v={v} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visit Board</h1>
          <p className="text-muted-foreground">Front desk → vitals → in treatment → completed.</p>
        </div>
        <Button data-testid="clinic-checkin-btn" onClick={() => setCheckInOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Check in patient
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading visit board…</p>
      ) : (
        <div className="flex flex-wrap gap-6">
          <Section title="Waiting" icon={<Clock className="h-4 w-4" />} items={waiting} testid="section-waiting" />
          <Section title="In Treatment" icon={<Stethoscope className="h-4 w-4" />} items={inTreatment} testid="section-in_progress" />
          <Section title="Completed Today" icon={<CheckCircle2 className="h-4 w-4" />} items={completedToday} testid="section-completed" />
        </div>
      )}

      {/* Check-in: pick an existing patient -> creates a waiting visit */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check in a patient</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search patients…" value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)} data-testid="checkin-search" />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filteredPatients.length === 0
              ? <p className="text-sm text-muted-foreground py-4 text-center">No patients found.</p>
              : filteredPatients.map((p: any) => (
                <button key={p.id} data-testid="checkin-patient-option"
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted flex items-center justify-between"
                  disabled={createVisit.isPending}
                  onClick={() => handleCheckIn(p.id, p.full_name)}>
                  <span className="font-medium">{p.full_name}</span>
                  <span className="text-xs text-muted-foreground">{p.phone}</span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vitals entry dialog */}
      <VitalsDialog
        visit={vitalsVisit}
        thresholds={thresholds}
        onClose={() => setVitalsVisit(null)}
        onSave={async (id, vitals) => {
          try {
            await saveVitals.mutateAsync({ id, vitals });
            toast({ title: "Vitals saved", description: "Patient moved to In Treatment." });
            setVitalsVisit(null);
          } catch (e: any) {
            toast({ title: "Could not save vitals", description: e.message, variant: "destructive" });
          }
        }}
      />
    </div>
  );
}

function VitalsDialog({
  visit, thresholds, onClose, onSave,
}: {
  visit: ClinicVisit | null;
  thresholds: ReturnType<typeof buildThresholdMap>;
  onClose: () => void;
  onSave: (id: string, vitals: VitalsPayload) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const locked = !!visit?.is_locked;

  useEffect(() => {
    if (!visit) return;
    const init: Record<string, string> = {};
    for (const f of VITAL_FIELDS) {
      const v = (visit as any)[f.key];
      init[f.key] = v === null || v === undefined ? "" : String(v);
    }
    setForm(init);
  }, [visit]);

  if (!visit) return null;
  const summary = summarizeVitals(form, thresholds);

  const submit = () => {
    const missing = REQUIRED.filter((k) => !form[k]);
    if (missing.length) {
      toast({ title: "Missing required vitals", description: "Temperature, Pulse, BP (sys/dia) and SpO₂ are required.", variant: "destructive" });
      return;
    }
    const payload: VitalsPayload = {};
    for (const f of VITAL_FIELDS) {
      const raw = form[f.key];
      if (raw === "" || raw === undefined) { (payload as any)[f.key] = null; continue; }
      (payload as any)[f.key] = f.kind === "number" ? Number(raw) : raw;
    }
    onSave(visit.id, payload);
  };

  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="vitals-dialog">
        <DialogHeader>
          <DialogTitle>Vitals — {visit.patient?.full_name ?? "Patient"} (Visit #{visit.visit_number})</DialogTitle>
        </DialogHeader>

        {summary.worst !== "normal" && (
          <div data-testid="vitals-alert-banner"
            className={`text-sm rounded px-3 py-2 flex items-center gap-2 ${summary.worst === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>
            <AlertTriangle className="h-4 w-4" />
            {summary.criticals.length > 0 && <span data-testid="vitals-critical">Critical: {summary.criticals.join(", ")}</span>}
            {summary.criticals.length === 0 && summary.warnings.length > 0 && <span data-testid="vitals-warning">Warning: {summary.warnings.join(", ")}</span>}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
          {VITAL_FIELDS.map((f) => {
            const status = f.kind === "number" ? classifyVital(f.key, form[f.key], thresholds) : "normal";
            return (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`vital-${f.key}`} className="text-xs">
                  {f.label}{f.unit ? ` (${f.unit})` : ""}{f.required ? " *" : ""}
                </Label>
                <Input
                  id={`vital-${f.key}`}
                  data-testid={`vital-${f.key}`}
                  data-status={status}
                  type={f.kind === "number" ? "number" : "text"}
                  step={f.step}
                  disabled={locked}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className={statusStyle[status]}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!locked && <Button data-testid="vitals-save-btn" onClick={submit}>Save Vitals</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
