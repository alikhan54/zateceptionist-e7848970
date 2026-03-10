import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationRoom {
  id: string;
  tenant_id: string;
  project_id: string;
  source_sheet_id: string | null;
  room_number: string | null;
  room_name: string;
  room_type: string | null;
  floor_level: string | null;
  building_section: string | null;
  wing_zone: string | null;
  length_ft: number | null;
  width_ft: number | null;
  height_ft: number;
  area_sqft: number | null;
  perimeter_lf: number | null;
  wall_area_sqft: number | null;
  ceiling_area_sqft: number | null;
  wall_segment_count: number;
  wall_segments: any[];
  door_count: number;
  window_count: number;
  opening_deduction_sqft: number;
  is_irregular: boolean;
  shape_type: string;
  floor_finish_tag: string | null;
  wall_finish_tag: string | null;
  wall_finish_tags: string[] | null;
  ceiling_finish_tag: string | null;
  base_tag: string | null;
  existing_material: string | null;
  requires_demo: boolean;
  measured_by: string;
  measurement_confidence: number | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstimationRooms(projectId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_rooms", tenantId, projectId],
    queryFn: async () => {
      let query = supabase
        .from("estimation_rooms" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("floor_level")
        .order("room_number");

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationRoom[];
    },
    enabled: !!tenantId && !!projectId,
  });

  const createRoom = useMutation({
    mutationFn: async (room: Partial<EstimationRoom>) => {
      const { data, error } = await supabase
        .from("estimation_rooms" as any)
        .insert({ ...room, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationRoom;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_rooms", tenantId, projectId] }); },
  });

  const updateRoom = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationRoom> }) => {
      const { error } = await supabase
        .from("estimation_rooms" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_rooms", tenantId, projectId] }); },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estimation_rooms" as any)
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_rooms", tenantId, projectId] }); },
  });

  const stats = {
    totalRooms: rooms.length,
    totalAreaSqft: rooms.reduce((sum, r) => sum + (r.area_sqft || 0), 0),
    verifiedRooms: rooms.filter(r => r.verified).length,
    roomsByFloor: rooms.reduce((acc, r) => {
      const floor = r.floor_level || "Unknown";
      acc[floor] = (acc[floor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return { rooms, isLoading, stats, refetch, createRoom, updateRoom, deleteRoom };
}
