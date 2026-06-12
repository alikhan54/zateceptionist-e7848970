// HOSPITAL-PORTAL — lean read-only queries for the portal homes. EVERY number comes from a real
// existing table; no source = the card is omitted by the home. Nothing here writes.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

/** Local midnight as ISO — "today" everywhere in the portal. */
export function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface WaitingRow {
  patient_id: string; doctor_id: string; doctor_name: string | null;
  department_name: string | null; source: string; queued_at: string;
}
/** ALL waiting queue rows (front-desk view; the doctor home uses useDoctorQueue instead). */
export function useWaitingAll() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hxp-waiting-all", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospital_doctor_queue" as any)
        .select("patient_id,doctor_id,doctor_name,department_name,source,queued_at")
        .eq("tenant_id", tenantId).eq("status", "waiting").order("queued_at", { ascending: true });
      if (error) throw error;
      return ((data as any[]) || []) as WaitingRow[];
    },
    enabled: !!tenantId, refetchInterval: 30_000,
  });
}

export interface SaleRowLite { id: string; context: string; total: number; billed_at: string; patient_id: string | null; }
/** Today's POS sales (both contexts) — the ONLY money source on the portal. */
export function useSalesToday() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hxp-sales-today", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospital_pos_sales" as any)
        .select("id,context,total,billed_at,patient_id")
        .eq("tenant_id", tenantId).gte("billed_at", todayStartIso())
        .order("billed_at", { ascending: false });
      if (error) throw error;
      const rows = ((data as any[]) || []) as SaleRowLite[];
      const sum = (ctx?: string) => rows.filter((r) => !ctx || r.context === ctx).reduce((a, r) => a + Number(r.total || 0), 0);
      return { rows, total: sum(), pharmacy: sum("pharmacy"), discharge: sum("discharge"), count: rows.length };
    },
    enabled: !!tenantId, refetchInterval: 60_000,
  });
}

export interface AdmittedRow { id: string; patient_id: string; department_name: string | null; created_at: string; }
/** Currently admitted inpatients. */
export function useAdmittedNow() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hxp-admitted", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospital_admissions" as any)
        .select("id,patient_id,department_name,created_at")
        .eq("tenant_id", tenantId).eq("status", "admitted").order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []) as AdmittedRow[];
    },
    enabled: !!tenantId, refetchInterval: 60_000,
  });
}

/** The signed-in doctor's "today": signed prescriptions + his consult visits. */
export function useMyDayCounts() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const uid = authUser?.id ?? null;
  return useQuery({
    queryKey: ["hxp-myday", tenantId, uid],
    queryFn: async () => {
      const since = todayStartIso();
      const [rx, visits] = await Promise.all([
        supabase.from("hospital_prescriptions" as any).select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("authored_by", uid).eq("status", "signed").gte("signed_at", since),
        supabase.from("clinic_visits" as any).select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId).eq("doctor_staff_id", uid).gte("created_at", since),
      ]);
      return { signedRx: rx.count ?? 0, consults: visits.count ?? 0 };
    },
    enabled: !!tenantId && !!uid, refetchInterval: 60_000,
  });
}

/** patient_id → full_name map (names on rails/lists; RLS keeps it tenant-scoped). */
export function usePatientNames() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hxp-patient-names", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinic_patients" as any)
        .select("id,full_name").eq("tenant_id", tenantId);
      if (error) throw error;
      const m = new Map<string, string>();
      ((data as any[]) || []).forEach((p) => m.set(p.id, p.full_name));
      return m;
    },
    enabled: !!tenantId, staleTime: 120_000,
  });
}
