import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CalendarClock, Syringe, Gift, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useClinicPatientVisits } from "@/hooks/useClinicVisits";
import { useClinicTreatmentsList } from "@/hooks/useClinicTreatmentAdmin";

const STATUS_COLOR: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-700 border-amber-300",
  in_progress: "bg-sky-100 text-sky-700 border-sky-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

function vitalsSummary(v: any): string {
  const parts: string[] = [];
  if (v.temperature != null) parts.push(`Temp ${v.temperature}°C`);
  if (v.heart_rate != null) parts.push(`HR ${v.heart_rate}`);
  if (v.blood_pressure_systolic != null && v.blood_pressure_diastolic != null)
    parts.push(`BP ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`);
  if (v.spo2 != null) parts.push(`SpO₂ ${v.spo2}%`);
  if (v.weight_kg != null) parts.push(`${v.weight_kg}kg`);
  if (v.sugar != null) parts.push(`Glu ${v.sugar}`);
  return parts.join(" · ");
}

export function PatientVisitsTab({ patientId }: { patientId: string }) {
  const { data: visits = [], isLoading } = useClinicPatientVisits(patientId);
  const { data: treatments = [] } = useClinicTreatmentsList();
  const tName = (id: string) => treatments.find((t: any) => t.id === id)?.name ?? "Treatment";

  if (isLoading) return <p className="text-xs text-muted-foreground" data-testid="patient-visits-loading">Loading visit history…</p>;

  if (visits.length === 0) {
    return (
      <Card data-testid="patient-visits-empty">
        <CardContent className="py-10 text-center">
          <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No visits yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check the patient in from the Visit Board to start their first encounter.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="patient-visits-tab">
      {visits.map((v) => {
        const vit = vitalsSummary(v);
        return (
          <Card key={v.id} data-testid={`visit-history-${v.id}`}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Visit #{v.visit_number}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[v.current_status] || ""}`}>{v.current_status}</Badge>
                  {v.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(v.completed_date || v.visit_date, "medium")}</span>
              </div>

              {vit && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" /> {vit}
                </div>
              )}

              <div className="mt-2 space-y-1">
                {v.treatments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No treatments recorded on this visit.</p>
                ) : v.treatments.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm" data-testid={`visit-history-tx-${t.id}`}>
                    <span className="flex items-center gap-1.5">
                      <Syringe className="h-3 w-3 text-muted-foreground" />
                      {tName(t.treatment_id)}
                      {(t.dose_administered || t.dose_unit) && (
                        <span className="text-muted-foreground">— {t.dose_administered} {t.dose_unit}</span>
                      )}
                    </span>
                    {t.package_id
                      ? <Badge variant="outline" className="text-[10px]"><Gift className="h-3 w-3 mr-1" />package</Badge>
                      : <Badge variant="outline" className="text-[10px]">pay-per-use</Badge>}
                  </div>
                ))}
              </div>

              {v.doctor_notes && <p className="text-xs text-muted-foreground mt-2 border-t pt-1.5">{v.doctor_notes}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
