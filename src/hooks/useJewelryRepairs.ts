/**
 * Jewelry Repairs (Project JX, Phase 9). Light CRUD over jx_repair + a status pipeline
 * (booked → in_progress → ready → delivered) via direct UPDATE (RLS). SLUG-keyed via
 * useTenant(). The customer-facing message is DISPLAYED only — the Phase-13 lifecycle
 * agent does the actual sending; nothing is sent from here.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export const REPAIR_STATUSES = ["booked", "in_progress", "ready", "delivered"] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export function nextRepairStatus(s: string | null): RepairStatus | null {
  const i = REPAIR_STATUSES.indexOf((s || "booked") as RepairStatus);
  return i >= 0 && i < REPAIR_STATUSES.length - 1 ? REPAIR_STATUSES[i + 1] : null;
}

export interface JxRepair {
  id: string; tenant_id: string; customer_id: string | null; item_desc: string | null;
  received_date: string | null; promised_date: string | null; charge: number | null; status: string | null; created_at: string;
}

export function useJewelryRepairs() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: repairs = [], isLoading, refetch } = useQuery({
    queryKey: ["jx_repair", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_repair" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as JxRepair[];
    },
  });

  const createRepair = useMutation({
    mutationFn: async (r: { customer_id?: string | null; item_desc: string; charge?: number; promised_date?: string | null }) => {
      const { data, error } = await supabase
        .from("jx_repair" as any).insert({
          tenant_id: tenantId, customer_id: r.customer_id || null, item_desc: r.item_desc,
          charge: r.charge ?? null, promised_date: r.promised_date || null,
          received_date: new Date().toISOString(), status: "booked",
        } as any).select().single();
      if (error) throw error;
      return data as unknown as JxRepair;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_repair", tenantId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RepairStatus }) => {
      const { error } = await supabase
        .from("jx_repair" as any).update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_repair", tenantId] }),
  });

  const deleteRepair = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jx_repair" as any).delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_repair", tenantId] }),
  });

  return { repairs, isLoading, refetch, createRepair, updateStatus, deleteRepair };
}

/** Customer-facing message the Phase-13 lifecycle agent WILL send (displayed only here). */
export function repairStatusMessage(status: string): string {
  switch (status) {
    case "booked": return "We've received your item for repair and will update you as work progresses.";
    case "in_progress": return "Your repair is now being worked on by our karigar.";
    case "ready": return "Good news — your repair is ready for pickup at Legacy Jewellers!";
    case "delivered": return "Thank you — your repaired item has been collected. We hope you're delighted.";
    default: return "";
  }
}
