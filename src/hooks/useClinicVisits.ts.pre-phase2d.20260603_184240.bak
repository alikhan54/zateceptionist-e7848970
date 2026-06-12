import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

// Floor visit shape (subset of clinic_visits + embedded patient). clinic_* tables are
// not in the generated DB types, so queries use the `as any` escape hatch (house pattern).
export interface ClinicVisitPatient { id: string; full_name: string; phone: string | null; date_of_birth: string | null; }
export interface ClinicVisit {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_number: number;
  visit_date: string;
  current_status: "waiting" | "in_progress" | "completed";
  consent_signed: boolean;
  vitals_completed: boolean;
  treatment_completed: boolean;
  is_locked: boolean;
  completed_date: string | null;
  reception_staff_id: string | null;
  nurse_staff_id: string | null;
  doctor_staff_id: string | null;
  // vitals (nullable)
  temperature: number | null; heart_rate: number | null;
  blood_pressure_systolic: number | null; blood_pressure_diastolic: number | null;
  spo2: number | null; respiratory_rate: number | null;
  height_cm: number | null; weight_kg: number | null; sugar: number | null;
  hip_cm: number | null; waist_cm: number | null; head_circumference_cm: number | null;
  urinalysis: string | null; lmp: string | null; other_details: string | null; doctor_notes: string | null;
  patient?: ClinicVisitPatient | null;
}

export type VitalsPayload = Partial<Pick<ClinicVisit,
  "temperature" | "heart_rate" | "blood_pressure_systolic" | "blood_pressure_diastolic" |
  "spo2" | "respiratory_rate" | "height_cm" | "weight_kg" | "sugar" | "hip_cm" | "waist_cm" |
  "head_circumference_cm" | "urinalysis" | "lmp" | "other_details">>;

const SELECT = "*, patient:clinic_patients(id, full_name, phone, date_of_birth)";

export function useClinicVisits() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const staffId = authUser?.id ?? null; // public.users.id (FK target for *_staff_id)

  const { data: visits = [], isLoading, refetch } = useQuery({
    queryKey: ["clinic_visits", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_visits" as any)
        .select(SELECT)
        .eq("tenant_id", tenantId)
        .order("visit_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ClinicVisit[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("clinic_visits_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_visits", filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ["clinic_visits", tenantId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clinic_visits", tenantId] });

  // Check a patient in -> new waiting visit (visit_number = their count + 1).
  const createVisit = useMutation({
    mutationFn: async (patientId: string) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");
      const { count } = await supabase
        .from("clinic_visits" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId);
      const { data, error } = await supabase
        .from("clinic_visits" as any)
        .insert({
          tenant_id: tenantId,
          patient_id: patientId,
          visit_number: (count ?? 0) + 1,
          current_status: "waiting",
          consent_signed: false,
          vitals_completed: false,
          treatment_completed: false,
          is_locked: false,
          reception_staff_id: staffId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicVisit;
    },
    onSuccess: invalidate,
  });

  // Save vitals -> moves the visit into in_progress with vitals_completed=true.
  const saveVitals = useMutation({
    mutationFn: async ({ id, vitals }: { id: string; vitals: VitalsPayload }) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");
      const { error } = await supabase
        .from("clinic_visits" as any)
        .update({
          ...vitals,
          vitals_completed: true,
          current_status: "in_progress",
          nurse_staff_id: staffId,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Complete a visit -> completed + locked.
  const completeVisit = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");
      const { error } = await supabase
        .from("clinic_visits" as any)
        .update({
          current_status: "completed",
          treatment_completed: true,
          completed_date: new Date().toISOString(),
          doctor_staff_id: staffId,
          is_locked: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { visits, isLoading, refetch, createVisit, saveVitals, completeVisit };
}

// Active vitals config rows for the tenant (drives alert thresholds; empty => defaults).
export function useClinicVitalsConfig() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_vitals_config", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_vitals_config" as any)
        .select("vital_name, warning_alert_rule, critical_alert_rule, display_order, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as Array<{ vital_name: string; warning_alert_rule: any; critical_alert_rule: any }>;
    },
    enabled: !!tenantId,
  });
}
