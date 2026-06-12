// HOSPITAL-FLOW [Brief 9] — the doctor's waiting queue + triage forwarding + referrals.
// One additive table `hospital_doctor_queue` (RLS = the hospital 5-policy pattern):
//   • the nurse FORWARDS a triaged patient to a doctor (source='nurse')
//   • a doctor REFERS a patient to another doctor with a reason (source='referral')
//   • each doctor sees ONLY his own queue (doctor_id = his hr_employees.id — the SAME identity
//     the attending filter uses); opening a patient marks the row waiting → seen
//   • HISTORY-ON-REFERRAL: a queue row (any status) grants journey/chart access for that patient,
//     COMPOSED with the attending filter in PatientJourney (attending OR queue — never weakened).
//     Access ends when the row is deleted; `seen` must NOT end it (opening the patient marks seen).
// Forward/refer NEVER changes hospital_admissions.attending_staff_id — the attending is the
// admission's responsible clinician; the queue is a worklist + access grant, revocable by row delete.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

export type QueueSource = "nurse" | "referral";
export type QueueStatus = "waiting" | "seen";

export interface DoctorQueueRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string | null;
  department_name: string | null;
  source: QueueSource;
  referred_by: string | null;
  referred_by_name: string | null;
  reason: string | null;
  status: QueueStatus;
  queued_at: string;
  seen_at: string | null;
}

/** This doctor's queue (his rows only; waiting first, oldest-queued first within status). */
export function useDoctorQueue(hrEmployeeId?: string | null) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const key = ["hx-doctor-queue", tenantId, hrEmployeeId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_doctor_queue" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("doctor_id", hrEmployeeId)
        .order("status", { ascending: false })   // 'waiting' > 'seen'
        .order("queued_at", { ascending: true });
      if (error) throw error;
      return ((data as any[]) || []) as DoctorQueueRow[];
    },
    enabled: !!tenantId && !!hrEmployeeId,
    refetchInterval: 30_000,   // the strip stays fresh without a realtime publication change
  });

  const markSeen = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("hospital_doctor_queue" as any)
        .update({ status: "seen", seen_at: now, updated_at: now })
        .eq("id", id).eq("tenant_id", tenantId).eq("status", "waiting");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hx-doctor-queue"] }),
  });

  return { queue: query.data ?? [], isLoading: query.isLoading, markSeen };
}

/**
 * HISTORY-ON-REFERRAL access set: the patient_ids this doctor holds a queue row for (ANY status —
 * opening the patient marks it seen and access must survive the consult; revocation = row delete).
 * PatientJourney UNIONs this with the attending set — composed on top, never replacing it.
 */
export function useDoctorQueueAccess(hrEmployeeId?: string | null, enabled = true) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hx-doctor-queue-access", tenantId, hrEmployeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_doctor_queue" as any)
        .select("patient_id")
        .eq("tenant_id", tenantId)
        .eq("doctor_id", hrEmployeeId);
      if (error) throw error;
      return new Set(((data as any[]) || []).map((r) => r.patient_id as string));
    },
    enabled: !!tenantId && !!hrEmployeeId && enabled,
  });
}

export interface ForwardArgs {
  patientId: string;
  doctorId: string;            // hr_employees.id of the receiving doctor
  doctorName?: string | null;
  departmentName?: string | null;
  source: QueueSource;
  reason?: string | null;
  referredByName?: string | null;
}

/** Create a queue row (nurse forward OR doctor referral). A duplicate WAITING row is a friendly no-op. */
export function useForwardToDoctor() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: ForwardArgs): Promise<{ queueId: string | null; duplicate: boolean }> => {
      const { data, error } = await supabase.from("hospital_doctor_queue" as any).insert({
        tenant_id: tenantId,
        patient_id: a.patientId,
        doctor_id: a.doctorId,
        doctor_name: a.doctorName ?? null,
        department_name: a.departmentName ?? null,
        source: a.source,
        referred_by: authUser?.id ?? null,
        referred_by_name: a.referredByName ?? null,
        reason: a.reason?.trim() || null,
        status: "waiting",
      } as any).select("id").single();
      if (error) {
        if ((error as any).code === "23505") return { queueId: null, duplicate: true }; // already waiting
        throw error;
      }
      return { queueId: (data as any).id as string, duplicate: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hx-doctor-queue"] });
      qc.invalidateQueries({ queryKey: ["hx-doctor-queue-access"] });
      qc.invalidateQueries({ queryKey: ["hx-queue-waiting-map"] });
    },
  });
}

/** Tenant-wide WAITING rows by patient — drives the nurse station's "forwarded to Dr. X" chips. */
export function useWaitingMap() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hx-queue-waiting-map", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_doctor_queue" as any)
        .select("patient_id, doctor_name, department_name, source")
        .eq("tenant_id", tenantId)
        .eq("status", "waiting");
      if (error) throw error;
      const m = new Map<string, { doctor_name: string | null; department_name: string | null; source: string }>();
      ((data as any[]) || []).forEach((r) => m.set(r.patient_id, r));
      return m;
    },
    enabled: !!tenantId,
  });
}
