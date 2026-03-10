import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationTakeoffItem {
  id: string;
  tenant_id: string;
  project_id: string;
  room_id: string | null;
  material_tag: string | null;
  item_name: string;
  trade: string;
  description: string | null;
  surface: string | null;
  material_category: string | null;
  csi_division: string | null;
  manufacturer: string | null;
  product_line: string | null;
  color: string | null;
  size: string | null;
  thickness: string | null;
  bond_pattern: string | null;
  finish: string | null;
  net_area: number | null;
  waste_factor: number | null;
  pattern_match_factor: number;
  quantity: number;
  unit_of_measure: string;
  piece_count: number | null;
  pieces_per_carton: number | null;
  cartons_needed: number | null;
  sqft_per_carton: number | null;
  unit_price: number | null;
  price_uom: string | null;
  total_material_cost: number | null;
  freight_per_unit: number | null;
  material_db_id: string | null;
  supplier_name: string | null;
  supplier_sku: string | null;
  is_labor: boolean;
  is_taxable: boolean;
  is_calculated: boolean;
  calculated_from_tag: string | null;
  area_group: string | null;
  takeoff_method: string;
  confidence_score: number | null;
  verified: boolean;
  notes: string | null;
  extra_info: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstimationTakeoff(projectId?: string, roomId?: string, tradeFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_takeoff", tenantId, projectId, roomId, tradeFilter],
    queryFn: async () => {
      let query = supabase
        .from("estimation_takeoff_items" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("trade")
        .order("surface")
        .order("item_name");

      if (projectId) query = query.eq("project_id", projectId);
      if (roomId) query = query.eq("room_id", roomId);
      if (tradeFilter && tradeFilter !== "all") query = query.eq("trade", tradeFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationTakeoffItem[];
    },
    enabled: !!tenantId && !!projectId,
  });

  const createItem = useMutation({
    mutationFn: async (item: Partial<EstimationTakeoffItem>) => {
      const { data, error } = await supabase
        .from("estimation_takeoff_items" as any)
        .insert({ ...item, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationTakeoffItem;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_takeoff", tenantId, projectId] }); },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationTakeoffItem> }) => {
      const { error } = await supabase
        .from("estimation_takeoff_items" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_takeoff", tenantId, projectId] }); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("estimation_takeoff_items" as any)
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_takeoff", tenantId, projectId] }); },
  });

  const costByTrade = items.reduce((acc, item) => {
    const trade = item.trade || "Unknown";
    acc[trade] = (acc[trade] || 0) + (item.total_material_cost || 0);
    return acc;
  }, {} as Record<string, number>);

  const stats = {
    totalItems: items.length,
    totalQuantitySF: items.filter(i => i.unit_of_measure === "SF").reduce((s, i) => s + (i.quantity || 0), 0),
    totalQuantityLF: items.filter(i => i.unit_of_measure === "LF").reduce((s, i) => s + (i.quantity || 0), 0),
    totalMaterialCost: items.reduce((s, i) => s + (i.total_material_cost || 0), 0),
    costByTrade,
    verifiedItems: items.filter(i => i.verified).length,
    trades: [...new Set(items.map(i => i.trade))],
  };

  return { items, isLoading, stats, refetch, createItem, updateItem, deleteItem };
}
