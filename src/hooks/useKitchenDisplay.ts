import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface KitchenItem {
  item_id?: string;
  name: string;
  quantity: number;
  special_instructions?: string;
}

export interface KitchenOrder {
  id: string;
  tenant_id: string;
  order_id: string;
  station: string;
  items: KitchenItem[];
  priority: number;
  status: "pending" | "preparing" | "ready";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined from restaurant_orders
  order_number?: number;
  customer_name?: string;
  order_type?: string;
}

export function useKitchenDisplay() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: kitchenOrders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["kitchen-display", tenantId],
    queryFn: async (): Promise<KitchenOrder[]> => {
      if (!tenantId) return [];

      // Get kitchen display items
      const { data: kdData, error: kdError } = await supabase
        .from("restaurant_kitchen_display")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "preparing"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (kdError) throw kdError;
      if (!kdData || kdData.length === 0) return [];

      // Get associated order details
      const orderIds = [...new Set(kdData.map((kd: any) => kd.order_id))];
      const { data: orderData } = await supabase
        .from("restaurant_orders")
        .select("id, order_number, customer_name, order_type")
        .in("id", orderIds);

      const orderMap = new Map((orderData || []).map((o: any) => [o.id, o]));

      return kdData.map((kd: any) => {
        const order = orderMap.get(kd.order_id);
        return {
          ...kd,
          order_number: order?.order_number,
          customer_name: order?.customer_name,
          order_type: order?.order_type,
        };
      });
    },
    enabled: !!tenantId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`kitchen-display-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_kitchen_display",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["kitchen-display", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Start preparation
  const startPreparation = useMutation({
    mutationFn: async (kitchenOrderId: string) => {
      const { error } = await supabase
        .from("restaurant_kitchen_display")
        .update({
          status: "preparing",
          started_at: new Date().toISOString(),
        })
        .eq("id", kitchenOrderId)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      // Also update the main order status
      const { data: kd } = await supabase
        .from("restaurant_kitchen_display")
        .select("order_id")
        .eq("id", kitchenOrderId)
        .single();
      if (kd) {
        await supabase
          .from("restaurant_orders")
          .update({ status: "preparing", updated_at: new Date().toISOString() })
          .eq("id", kd.order_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-display", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders", tenantId] });
    },
  });

  // Mark ready
  const markReady = useMutation({
    mutationFn: async (kitchenOrderId: string) => {
      const { error } = await supabase
        .from("restaurant_kitchen_display")
        .update({
          status: "ready",
          completed_at: new Date().toISOString(),
        })
        .eq("id", kitchenOrderId)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      // Update main order status to ready
      const { data: kd } = await supabase
        .from("restaurant_kitchen_display")
        .select("order_id")
        .eq("id", kitchenOrderId)
        .single();
      if (kd) {
        await supabase
          .from("restaurant_orders")
          .update({ status: "ready", updated_at: new Date().toISOString() })
          .eq("id", kd.order_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-display", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders", tenantId] });
    },
  });

  // Group by status for kanban
  const pending = (kitchenOrders || []).filter((o) => o.status === "pending");
  const preparing = (kitchenOrders || []).filter((o) => o.status === "preparing");

  return {
    kitchenOrders: kitchenOrders || [],
    pending,
    preparing,
    isLoading,
    error,
    refetch,
    startPreparation,
    markReady,
  };
}
