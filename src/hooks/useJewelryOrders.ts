/**
 * Jewelry custom orders (Project JX, Phase 7). Atomic order via jx_create_order RPC;
 * status pipeline via direct UPDATE (RLS). SLUG-keyed. All money math via calc.ts.
 * SCOPE: jx_order + jx_order_item only — order→sale finalization + gold/GL = Phase 8.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export const ORDER_STATUSES = ["booked", "in_workshop", "ready", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface JxOrder {
  id: string; tenant_id: string; order_no: string | null; customer_id: string | null;
  order_date: string | null; delivery_date: string | null; is_fix_rate: boolean | null;
  fixed_rate: number | null; advance_amount: number | null; advance_tender: unknown;
  discount: number | null; net_amount: number | null; balance: number | null; status: string | null;
  created_at: string;
}
export interface JxOrderItem {
  id: string; order_id: string; tag_number: string | null; karat: number | null;
  net_weight: number | null; waste_pct: number | null; total_weight: number | null;
  making: number | null; polish: number | null; stone_value: number | null; line_total: number | null;
  assigned_worker_id: string | null; workshop_status: string | null;
}

export interface OrderPayload { order: Record<string, unknown>; lines: Record<string, unknown>[]; }

export function useJewelryOrders() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["jx_order", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_order" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as JxOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (payload: OrderPayload) => {
      const { data, error } = await supabase.rpc("jx_create_order" as any, { p_payload: payload as any });
      if (error) throw error;
      return data as unknown as { order_id: string; order_no: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_order", tenantId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("jx_order" as any).update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_order", tenantId] }),
  });

  const fetchOrderItems = async (orderId: string): Promise<JxOrderItem[]> => {
    const { data, error } = await supabase
      .from("jx_order_item" as any).select("*").eq("order_id", orderId).eq("tenant_id", tenantId);
    if (error) throw error;
    return (data || []) as unknown as JxOrderItem[];
  };

  // Phase 8b: finalize a delivered order into a sale (clears the advance) via the RPC.
  const finalizeOrder = useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc("jx_finalize_order" as any, { p_order_id: orderId, p_payload: payload as any });
      if (error) throw error;
      return data as unknown as { sale_id: string; sale_no: string; order_id: string; order_no: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jx_order", tenantId] });
      qc.invalidateQueries({ queryKey: ["jx_item", tenantId] });
      qc.invalidateQueries({ queryKey: ["jx_sale", tenantId] });
    },
  });

  return { orders, isLoading, refetch, createOrder, updateStatus, fetchOrderItems, finalizeOrder };
}

/** Customer-facing message the Phase-13 lifecycle agent WILL send (displayed only here). */
export function orderStatusMessage(status: string): string {
  switch (status) {
    case "booked": return "Your custom order is booked. We'll keep you posted as it's crafted.";
    case "in_workshop": return "Your order is now being handcrafted in our workshop.";
    case "ready": return "Great news — your order is ready for pickup at Legacy Jewellers!";
    case "delivered": return "Thank you for your purchase. Your order has been delivered.";
    case "cancelled": return "Your order has been cancelled. Please contact us if this is unexpected.";
    default: return "";
  }
}
