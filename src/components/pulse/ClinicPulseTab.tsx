import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, CalendarCheck, AlertOctagon, TrendingUp, Repeat2, Clock4, Crown } from "lucide-react";

/**
 * Phase 11 Group A — Clinic-specific Pulse widgets.
 *
 * Reads existing tables only (appointments, clinic_consultations,
 * clinic_patients, clinic_treatments). No schema changes.
 * All queries scoped to tenantId (SLUG). Honest "—" + "Not enough data
 * yet" for empty states.
 */
export function ClinicPulseTab() {
  const { tenantId } = useTenant();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString();
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { data: apptToday = [] } = useQuery({
    queryKey: ["pulse_appt_today", tenantId, todayISO],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("appointments" as any)
        .select("id,status,scheduled_at,service")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", todayISO)
        .lt("scheduled_at", tomorrowISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: apptLast30 = [] } = useQuery({
    queryKey: ["pulse_appt_30", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("appointments" as any)
        // NOTE: appointments has no `total_price` column → selecting it 400s (PostgREST 42703).
        // The revenue aggregation below already defaults missing price to 0 → avg-visit shows "—".
        .select("id,status,scheduled_at,service")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", thirtyDaysAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: apptLast7 = [] } = useQuery({
    queryKey: ["pulse_appt_7", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("appointments" as any)
        .select("id,scheduled_at,duration_minutes")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", sevenDaysAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ["pulse_consultations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("clinic_consultations" as any)
        // NOTE: clinic_consultations has no `treatment_id` column → selecting it 400s (PostgREST 42703).
        // The top-treatment aggregation below already null-guards `c.treatment_id` → that widget shows "—".
        .select("id,patient_id,diagnosis,created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", thirtyDaysAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["pulse_patients_all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("clinic_patients" as any)
        .select("id")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["pulse_treatments_all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("clinic_treatments" as any)
        .select("id,name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    const patientsTodayCount = apptToday.length;
    const activeTreatmentsToday = apptToday.filter((a: any) => a.service).length;

    const totalApptLast30 = apptLast30.length;
    const noShows = apptLast30.filter((a: any) => String(a.status || "").toLowerCase() === "no_show" || String(a.status || "").toLowerCase() === "no-show").length;
    const noShowRate = totalApptLast30 > 0 ? Math.round((noShows / totalApptLast30) * 100) : null;

    const revenue30 = apptLast30.reduce((s: number, a: any) => s + (a.total_price || 0), 0);
    const avgVisit = totalApptLast30 > 0 && revenue30 > 0 ? Math.round(revenue30 / totalApptLast30) : null;

    // Repeat patient %: patients with > 1 consultation in last 30d
    const consultsByPatient: Record<string, number> = {};
    consultations.forEach((c: any) => { if (c.patient_id) consultsByPatient[c.patient_id] = (consultsByPatient[c.patient_id] || 0) + 1; });
    const repeaters = Object.values(consultsByPatient).filter(n => n > 1).length;
    const repeatPct = patients.length > 0 ? Math.round((repeaters / patients.length) * 100) : null;

    // Doctor utilization (7d): hours booked / hours available (assume 8h/day × 7d = 56h)
    const bookedHours = apptLast7.reduce((s: number, a: any) => s + ((a.duration_minutes || 0) / 60), 0);
    const utilizationPct = bookedHours > 0 ? Math.min(100, Math.round((bookedHours / 56) * 100)) : null;

    // Top treatment: count consultations by treatment_id
    const consultsByTreatment: Record<string, number> = {};
    consultations.forEach((c: any) => { if (c.treatment_id) consultsByTreatment[c.treatment_id] = (consultsByTreatment[c.treatment_id] || 0) + 1; });
    let topTreatmentId: string | null = null;
    let topTreatmentCount = 0;
    Object.entries(consultsByTreatment).forEach(([id, n]) => { if (n > topTreatmentCount) { topTreatmentId = id; topTreatmentCount = n; } });
    const topTreatmentName = topTreatmentId ? (treatments.find((t: any) => t.id === topTreatmentId)?.name || null) : null;

    return {
      patientsTodayCount,
      activeTreatmentsToday,
      noShowRate,
      avgVisit,
      repeatPct,
      utilizationPct,
      topTreatmentName,
      topTreatmentCount,
    };
  }, [apptToday, apptLast30, apptLast7, consultations, patients, treatments]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="industry-tab-clinic">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Clinic Intelligence</h2>
            <p className="text-xs text-muted-foreground">Industry-specific pulse · 30-day rolling window</p>
          </div>
          <Badge variant="outline" className="text-[10px]">healthcare_clinic</Badge>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <PulseWidget
            testid="pulse-patients-today"
            icon={<CalendarCheck className="h-4 w-4 text-emerald-500" />}
            label="Patients today"
            value={stats.patientsTodayCount > 0 ? String(stats.patientsTodayCount) : "—"}
            hint={stats.patientsTodayCount === 0 ? "No appointments today" : `${stats.activeTreatmentsToday} with assigned treatment`}
          />
          <PulseWidget
            testid="pulse-noshow-rate"
            icon={<AlertOctagon className="h-4 w-4 text-amber-500" />}
            label="No-show rate"
            value={stats.noShowRate !== null ? `${stats.noShowRate}%` : "—"}
            hint={stats.noShowRate === null ? "Not enough data yet" : "Last 30 days"}
          />
          <PulseWidget
            testid="pulse-avg-visit"
            icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
            label="Avg visit value"
            value={stats.avgVisit !== null ? `AED ${stats.avgVisit.toLocaleString()}` : "—"}
            hint={stats.avgVisit === null ? "No revenue data yet" : "30-day avg"}
          />
          <PulseWidget
            testid="pulse-repeat-pct"
            icon={<Repeat2 className="h-4 w-4 text-sky-500" />}
            label="Repeat patients"
            value={stats.repeatPct !== null ? `${stats.repeatPct}%` : "—"}
            hint={stats.repeatPct === null ? "Not enough data yet" : `${patients.length} patients on file`}
          />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          <PulseWidget
            testid="pulse-utilization"
            icon={<Clock4 className="h-4 w-4 text-indigo-500" />}
            label="Doctor utilization"
            value={stats.utilizationPct !== null ? `${stats.utilizationPct}%` : "—"}
            hint={stats.utilizationPct === null ? "Not enough data yet" : "Booked vs 56h available (7d)"}
          />
          <PulseWidget
            testid="pulse-top-treatment"
            icon={<Crown className="h-4 w-4 text-amber-500" />}
            label="Top treatment"
            value={stats.topTreatmentName || "—"}
            hint={stats.topTreatmentName ? `${stats.topTreatmentCount} in last 30d` : "Not enough data yet"}
          />
          <PulseWidget
            testid="pulse-catalog-size"
            icon={<Stethoscope className="h-4 w-4 text-rose-500" />}
            label="Active catalog"
            value={treatments.length > 0 ? String(treatments.length) : "—"}
            hint={treatments.length === 0 ? "Not enough data yet" : "Treatments on offer"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface PulseWidgetProps {
  testid: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function PulseWidget({ testid, icon, label, value, hint }: PulseWidgetProps) {
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2.5" data-testid={testid}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-semibold truncate">{value}</div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
