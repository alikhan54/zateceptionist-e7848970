// HOSPITAL-BEDS [Phase 2] — live inpatient bed inventory + assignment.
// Two NEW additive tables (hospital_beds + hospital_bed_assignments); the OPEN assignment row
// (released_at IS NULL) is the current bed for an active admission. Tenant-scoped by RLS (mirrors
// the existing hospital pattern). useClinicPatients + admissions hooks untouched.
import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export const LONG_STAY_DAYS = 5; // deterministic long-stay threshold (no brain — just computed)
export type BedStatus = "available" | "occupied" | "cleaning" | "blocked";

export interface BedRow {
  id: string; ward: string; room: string | null; bed_label: string; bed_type: string; status: BedStatus;
  // occupant (present when an OPEN assignment exists)
  assignment_id?: string; admission_id?: string; patient_id?: string;
  patient_name?: string; attending_name?: string; admitted_at?: string; los_days?: number; long_stay?: boolean;
}
export interface WardGroup { ward: string; beds: BedRow[]; total: number; occupied: number; occupancyPct: number; }
export interface Inpatient { admission_id: string; patient_id: string; patient_name: string; attending_name: string | null; department_name: string | null; los_days: number; }

function losDays(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime(); if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function useHospitalBeds() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hospital_beds", tenantId] });
    qc.invalidateQueries({ queryKey: ["hospital_admissions", tenantId] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["hospital_beds", tenantId],
    queryFn: async () => {
      if (!tenantId) return { beds: [] as BedRow[], wards: [] as WardGroup[], unassigned: [] as Inpatient[] };
      const [{ data: beds }, { data: assigns }, { data: adms }] = await Promise.all([
        supabase.from("hospital_beds" as any).select("*").eq("tenant_id", tenantId).order("ward").order("bed_label"),
        supabase.from("hospital_bed_assignments" as any).select("id,admission_id,patient_id,bed_id").eq("tenant_id", tenantId).is("released_at", null),
        supabase.from("hospital_admissions" as any).select("id,patient_id,attending_name,department_name,created_at,status").eq("tenant_id", tenantId).eq("status", "admitted"),
      ]);
      const admByPatient = new Map<string, any>(); const admById = new Map<string, any>();
      (adms || []).forEach((a: any) => { admById.set(a.id, a); if (a.patient_id) admByPatient.set(a.patient_id, a); });
      const pIds = Array.from(new Set([...(assigns || []).map((a: any) => a.patient_id), ...(adms || []).map((a: any) => a.patient_id)].filter(Boolean)));
      const { data: pats } = pIds.length
        ? await supabase.from("clinic_patients" as any).select("id,full_name").eq("tenant_id", tenantId).in("id", pIds)
        : { data: [] as any[] };
      const nameById = new Map<string, string>((pats || []).map((p: any) => [p.id, p.full_name]));
      const openByBed = new Map<string, any>(); (assigns || []).forEach((a: any) => openByBed.set(a.bed_id, a));

      const bedRows: BedRow[] = (beds || []).map((b: any) => {
        const open = openByBed.get(b.id);
        if (!open) return { ...b };
        const adm = admById.get(open.admission_id);
        const d = losDays(adm?.created_at);
        return {
          ...b, assignment_id: open.id, admission_id: open.admission_id, patient_id: open.patient_id,
          patient_name: nameById.get(open.patient_id) || "—", attending_name: adm?.attending_name || null,
          admitted_at: adm?.created_at, los_days: d, long_stay: d >= LONG_STAY_DAYS,
        };
      });

      // ward groups
      const wardMap = new Map<string, BedRow[]>();
      bedRows.forEach((b) => { if (!wardMap.has(b.ward)) wardMap.set(b.ward, []); wardMap.get(b.ward)!.push(b); });
      const wards: WardGroup[] = Array.from(wardMap.entries()).map(([ward, bs]) => {
        const occupied = bs.filter((b) => b.status === "occupied").length;
        return { ward, beds: bs, total: bs.length, occupied, occupancyPct: bs.length ? Math.round((occupied / bs.length) * 100) : 0 };
      });

      // unassigned active inpatients = admitted admissions with NO open assignment
      const assignedAdmIds = new Set((assigns || []).map((a: any) => a.admission_id));
      const unassigned: Inpatient[] = (adms || [])
        .filter((a: any) => !assignedAdmIds.has(a.id))
        .map((a: any) => ({ admission_id: a.id, patient_id: a.patient_id, patient_name: nameById.get(a.patient_id) || "—", attending_name: a.attending_name, department_name: a.department_name, los_days: losDays(a.created_at) }));

      return { beds: bedRows, wards, unassigned };
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel(`hosp_beds_rt_${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_beds", filter: `tenant_id=eq.${tenantId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_bed_assignments", filter: `tenant_id=eq.${tenantId}` }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);

  // Assign an inpatient (active admission) to an available bed → open assignment + bed occupied.
  const assign = useMutation({
    mutationFn: async ({ admissionId, patientId, bedId, reason = "admit" }: { admissionId: string; patientId?: string | null; bedId: string; reason?: string }) => {
      const { error } = await supabase.from("hospital_bed_assignments" as any).insert({ tenant_id: tenantId, admission_id: admissionId, patient_id: patientId ?? null, bed_id: bedId, reason });
      if (error) throw error;
      const { error: be } = await supabase.from("hospital_beds" as any).update({ status: "occupied", updated_at: new Date().toISOString() }).eq("id", bedId).eq("tenant_id", tenantId);
      if (be) throw be;
    },
    onSuccess: invalidate,
  });

  // Transfer: release the current open assignment, free the old bed (→ cleaning), open a new one, occupy the new bed.
  const transfer = useMutation({
    mutationFn: async ({ admissionId, patientId, fromBedId, toBedId }: { admissionId: string; patientId?: string | null; fromBedId: string; toBedId: string }) => {
      const now = new Date().toISOString();
      const { error: re } = await supabase.from("hospital_bed_assignments" as any).update({ released_at: now, updated_at: now }).eq("tenant_id", tenantId).eq("admission_id", admissionId).is("released_at", null);
      if (re) throw re;
      await supabase.from("hospital_beds" as any).update({ status: "cleaning", updated_at: now }).eq("id", fromBedId).eq("tenant_id", tenantId);
      const { error: ie } = await supabase.from("hospital_bed_assignments" as any).insert({ tenant_id: tenantId, admission_id: admissionId, patient_id: patientId ?? null, bed_id: toBedId, reason: "transfer" });
      if (ie) throw ie;
      await supabase.from("hospital_beds" as any).update({ status: "occupied", updated_at: now }).eq("id", toBedId).eq("tenant_id", tenantId);
    },
    onSuccess: invalidate,
  });

  // Discharge from bed: release the open assignment, free the bed (→ cleaning).
  const discharge = useMutation({
    mutationFn: async ({ admissionId, bedId }: { admissionId: string; bedId: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("hospital_bed_assignments" as any).update({ released_at: now, reason: "discharge", updated_at: now }).eq("tenant_id", tenantId).eq("admission_id", admissionId).is("released_at", null);
      if (error) throw error;
      await supabase.from("hospital_beds" as any).update({ status: "cleaning", updated_at: now }).eq("id", bedId).eq("tenant_id", tenantId);
    },
    onSuccess: invalidate,
  });

  // Mark a cleaning/blocked bed available again.
  const setStatus = useMutation({
    mutationFn: async ({ bedId, status }: { bedId: string; status: BedStatus }) => {
      const { error } = await supabase.from("hospital_beds" as any).update({ status, updated_at: new Date().toISOString() }).eq("id", bedId).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const kpis = useMemo(() => {
    const beds = data?.beds || [];
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === "occupied").length;
    const cleaning = beds.filter((b) => b.status === "cleaning").length;
    const blocked = beds.filter((b) => b.status === "blocked").length;
    const longStay = beds.filter((b) => b.long_stay).length;
    return { total, occupied, available: total - occupied - cleaning - blocked, cleaning, blocked, longStay, occupancyPct: total ? Math.round((occupied / total) * 100) : 0 };
  }, [data]);

  const availableBeds = useMemo(() => (data?.beds || []).filter((b) => b.status === "available"), [data]);

  return { beds: data?.beds || [], wards: data?.wards || [], unassigned: data?.unassigned || [], availableBeds, kpis, isLoading, assign, transfer, discharge, setStatus };
}
