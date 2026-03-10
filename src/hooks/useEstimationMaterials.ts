import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EstimationMaterial {
  id: string;
  tenant_id: string;
  material_tag: string | null;
  material_name: string;
  material_code: string | null;
  manufacturer: string;
  brand: string | null;
  product_line: string | null;
  model_number: string | null;
  trade: string;
  category: string | null;
  sub_category: string | null;
  csi_code: string | null;
  size: string | null;
  thickness: string | null;
  color: string | null;
  finish_type: string | null;
  bond_pattern: string | null;
  fire_rating: string | null;
  unit_of_measure: string;
  coverage_per_unit: number | null;
  sqft_per_carton: number | null;
  pieces_per_carton: number | null;
  carton_weight: string | null;
  unit_price: number | null;
  price_currency: string;
  freight_per_unit: number | null;
  price_updated_at: string | null;
  price_source: string | null;
  standard_waste_pct: number;
  complex_waste_pct: number | null;
  floor_waste_pct: number | null;
  wall_waste_pct: number | null;
  preferred_supplier: string | null;
  supplier_contact: string | null;
  supplier_email: string | null;
  lead_time_days: number | null;
  requires_thinset: boolean;
  requires_grout: boolean;
  requires_mastic: boolean;
  grout_color_match: string | null;
  thinset_coverage_sqft: number | null;
  grout_coverage_sqft: number | null;
  mastic_coverage_sqft: number | null;
  is_active: boolean;
  is_discontinued: boolean;
  project_usage_count: number;
  created_at: string;
  updated_at: string;
}

export function useEstimationMaterials(searchTerm?: string, categoryFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Fetch both tenant-specific AND global materials
  const { data: materials = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_materials", tenantId, searchTerm, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("estimation_materials" as any)
        .select("*")
        .or(`tenant_id.eq.${tenantId},tenant_id.eq.global`)
        .eq("is_active", true)
        .order("trade")
        .order("material_name");

      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (searchTerm) {
        query = query.or(`material_name.ilike.%${searchTerm}%,manufacturer.ilike.%${searchTerm}%,material_tag.ilike.%${searchTerm}%,color.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EstimationMaterial[];
    },
    enabled: !!tenantId,
  });

  const createMaterial = useMutation({
    mutationFn: async (material: Partial<EstimationMaterial>) => {
      const { data, error } = await supabase
        .from("estimation_materials" as any)
        .insert({ ...material, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EstimationMaterial;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_materials", tenantId] }); },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EstimationMaterial> }) => {
      const { error } = await supabase
        .from("estimation_materials" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimation_materials", tenantId] }); },
  });

  const categories = [...new Set(materials.map(m => m.category).filter(Boolean))] as string[];
  const trades = [...new Set(materials.map(m => m.trade).filter(Boolean))] as string[];

  const stats = {
    totalMaterials: materials.length,
    categories,
    trades,
    globalCount: materials.filter(m => m.tenant_id === "global").length,
    customCount: materials.filter(m => m.tenant_id !== "global").length,
  };

  return { materials, isLoading, stats, refetch, createMaterial, updateMaterial };
}
