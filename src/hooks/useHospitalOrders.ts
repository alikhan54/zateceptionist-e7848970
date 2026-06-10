// Hospital order-entry + routed queues. hospital_orders / hospital_departments are
// SLUG-scoped (tenant_id) and not in the generated Supabase types → `as any` like clinic_*.
// Realtime mirrors the clinic_visits postgres_changes pattern.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { deriveMedAdminTask } from "@/hooks/useHospitalNurseTasks";

export type HospitalOrderType = "lab" | "medication" | "imaging";
export type HospitalOrderStatus =
  | "ordered" | "routed" | "in_progress" | "resulted" | "dispensed" | "reviewed" | "cancelled";

export interface HospitalOrder {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id: string | null;
  order_type: HospitalOrderType;
  department_id: string | null;
  status: HospitalOrderStatus;
  details: Record<string, unknown> | null;
  ordered_by: string | null;
  payment_amount?: number | null;
  payment_currency?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  created_at: string;
}

export interface HospitalDepartment {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;        // 2-digit dept code → drives the department-coded MRN prefix
  kind: "clinical" | "pharmacy" | "lab" | "radiology" | "admin";
  is_active: boolean;
}

export function useHospitalDepartments() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["hospital_departments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("hospital_departments" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      return (data || []) as unknown as HospitalDepartment[];
    },
    enabled: !!tenantId,
  });
}

interface OrderFilter {
  orderType?: HospitalOrderType;
  patientId?: string;
}

export function useHospitalOrders(filter: OrderFilter = {}) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const scope = `${filter.orderType ?? "all"}_${filter.patientId ?? "all"}`;

  const query = useQuery({
    queryKey: ["hospital_orders", tenantId, scope],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("hospital_orders" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (filter.orderType) q = q.eq("order_type", filter.orderType);
      if (filter.patientId) q = q.eq("patient_id", filter.patientId);
      const { data } = await q;
      return (data || []) as unknown as HospitalOrder[];
    },
    enabled: !!tenantId,
  });

  // Live updates (clinic_visits realtime pattern). Invalidate ALL hospital_orders
  // queries for the tenant so every mounted queue refreshes.
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`hospital_orders_rt_${tenantId}_${scope}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hospital_orders", filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ["hospital_orders", tenantId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, scope, queryClient]);

  const createOrder = useMutation({
    mutationFn: async (payload: Partial<HospitalOrder>) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("hospital_orders" as any)
        .insert({ ...payload, tenant_id: tenantId, ordered_by: auth?.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as HospitalOrder;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["hospital_orders", tenantId] });
      // HOSPITAL-NURSE (additive, fire-and-forget, NON-BLOCKING): a placed MEDICATION order becomes a
      // med_admin task on the nurse's worklist. A failed task-write can never affect order placement
      // (this runs in onSuccess, after the order already committed) and is swallowed.
      if (order?.order_type === "medication") {
        deriveMedAdminTask({ tenantId, order })
          .then(() => queryClient.invalidateQueries({ queryKey: ["hospital_nurse_tasks"] }))
          .catch(() => { /* non-blocking by contract */ });
      }
    },
  });

  // Advance an order's status. Optional `payment` (pharmacy dispense) writes the additive
  // payment_* columns in the SAME update — callers passing only {id,status} are unchanged.
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status, payment }: {
      id: string; status: HospitalOrderStatus;
      payment?: { amount?: number | null; currency?: string; method?: string | null; status?: string | null; reference?: string | null };
    }) => {
      const patch: Record<string, unknown> = { status };
      if (payment) {
        patch.payment_amount = payment.amount ?? null;
        patch.payment_currency = payment.currency ?? "BDT";
        patch.payment_method = payment.method ?? null;
        patch.payment_status = payment.status ?? null;
        patch.payment_reference = payment.reference ?? null;
      }
      const { error } = await supabase
        .from("hospital_orders" as any)
        .update(patch)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospital_orders", tenantId] }),
  });

  return { orders: query.data ?? [], isLoading: query.isLoading, createOrder, updateOrderStatus };
}

export const ORDER_TYPE_LABEL: Record<HospitalOrderType, string> = {
  lab: "Lab", medication: "Medication", imaging: "Imaging",
};
export const STATUS_LABEL: Record<HospitalOrderStatus, string> = {
  ordered: "Ordered", routed: "Routed", in_progress: "In Progress",
  resulted: "Resulted", dispensed: "Dispensed", reviewed: "Reviewed", cancelled: "Cancelled",
};
// status the receiving department advances an order TO when actioned
export const NEXT_STATUS: Partial<Record<HospitalOrderType, HospitalOrderStatus>> = {
  medication: "dispensed", lab: "resulted", imaging: "resulted",
};
