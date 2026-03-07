import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface Reservation {
  id: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  date: string;
  time: string;
  party_size: number;
  table_number: string | null;
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
  special_requests: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export function useReservations(dateFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: reservations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reservations", tenantId, dateFilter],
    queryFn: async (): Promise<Reservation[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from("restaurant_reservations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (dateFilter) {
        query = query.eq("date", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Reservation[];
    },
    enabled: !!tenantId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`reservations-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_reservations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["reservations", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Create reservation
  const createReservation = useMutation({
    mutationFn: async (data: {
      customer_name: string;
      customer_phone?: string;
      date: string;
      time: string;
      party_size: number;
      special_requests?: string;
    }) => {
      const { error } = await supabase.from("restaurant_reservations").insert({
        tenant_id: tenantId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || null,
        date: data.date,
        time: data.time,
        party_size: data.party_size,
        special_requests: data.special_requests || null,
        status: "confirmed",
        source: "dashboard",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", tenantId] });
    },
  });

  // Update reservation status
  const updateStatus = useMutation({
    mutationFn: async ({
      reservationId,
      status,
    }: {
      reservationId: string;
      status: Reservation["status"];
    }) => {
      const { error } = await supabase
        .from("restaurant_reservations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", reservationId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", tenantId] });
    },
  });

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const todayReservations = (reservations || []).filter((r) => r.date === today);
  const upcoming = (reservations || []).filter(
    (r) => r.date >= today && (r.status === "confirmed" || r.status === "seated")
  );

  return {
    reservations: reservations || [],
    todayReservations,
    upcoming,
    isLoading,
    error,
    refetch,
    createReservation,
    updateStatus,
  };
}
