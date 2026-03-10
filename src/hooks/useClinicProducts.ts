import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface ClinicProduct {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  brand: string | null;
  price: number;
  currency: string;
  cost_price: number | null;
  stock_quantity: number;
  min_stock_level: number;
  sku: string | null;
  recommended_for_treatments: string[] | null;
  recommended_for_skin_types: string[] | null;
  usage_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClinicProducts() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["clinic_products", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_products" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as ClinicProduct[];
    },
    enabled: !!tenantId,
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from("clinic_products" as any)
        .update({ stock_quantity: quantity, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_products", tenantId] }); },
  });

  const createProduct = useMutation({
    mutationFn: async (product: Partial<ClinicProduct>) => {
      const { data, error } = await supabase
        .from("clinic_products" as any)
        .insert({ ...product, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicProduct;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_products", tenantId] }); },
  });

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);

  return { products, isLoading, lowStockProducts, totalValue, refetch, updateStock, createProduct };
}
