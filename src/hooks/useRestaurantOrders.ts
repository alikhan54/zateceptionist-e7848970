import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface OrderItem {
  item_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
  subtotal: number;
}

export interface RestaurantOrder {
  id: string;
  tenant_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  order_type: "delivery" | "pickup" | "dine_in";
  items: OrderItem[];
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_address: { street?: string } | null;
  source: string;
  feedback_rating: number | null;
  feedback_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStats {
  totalToday: number;
  pending: number;
  preparing: number;
  delivered: number;
  revenueToday: number;
}

export function useRestaurantOrders(statusFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["restaurant-orders", tenantId, statusFilter],
    queryFn: async (): Promise<RestaurantOrder[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from("restaurant_orders")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RestaurantOrder[];
    },
    enabled: !!tenantId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`restaurant-orders-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["restaurant-orders", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Compute stats
  const stats: OrderStats = {
    totalToday: 0,
    pending: 0,
    preparing: 0,
    delivered: 0,
    revenueToday: 0,
  };

  if (orders) {
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(
      (o) => o.created_at && o.created_at.startsWith(today)
    );
    stats.totalToday = todayOrders.length;
    stats.pending = orders.filter((o) => o.status === "pending" || o.status === "confirmed").length;
    stats.preparing = orders.filter((o) => o.status === "preparing").length;
    stats.delivered = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;
    stats.revenueToday = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("restaurant_orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-orders", tenantId] });
    },
  });

  return {
    orders: orders || [],
    isLoading,
    error,
    refetch,
    stats,
    updateStatus,
  };
}
