/**
 * Jewelry sales (Project JX, Phase 6). Atomic sale via the jx_create_sale RPC.
 * SLUG-keyed / RLS (the RPC is SECURITY INVOKER + get_user_tenant_id()). All money
 * math is computed client-side via calc.ts; the RPC only persists atomically.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface JxCustomer { id: string; name: string | null; phone: string | null; }
export interface JxTaxRule { id: string; name: string | null; basis: string; rate: number; active: boolean | null; }

export interface SalePayload {
  sale: Record<string, unknown>;
  lines: Record<string, unknown>[];
  old_gold: Record<string, unknown> | null;
}

export function useJewelryCustomers(search?: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["jx_customer", tenantId, search],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase.from("jx_customer" as any).select("id, name, phone").eq("tenant_id", tenantId).order("name");
      if (search && search.trim()) q = q.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as JxCustomer[];
    },
  });
  const createCustomer = useMutation({
    mutationFn: async (c: { name: string; phone?: string }) => {
      const { data, error } = await supabase
        .from("jx_customer" as any).insert({ ...c, tenant_id: tenantId } as any).select("id, name, phone").single();
      if (error) throw error;
      return data as unknown as JxCustomer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_customer", tenantId] }),
  });
  return { customers, isLoading, createCustomer };
}

/** Active tax rules for the tenant (PoS default tax). */
export function useJewelryTaxRules() {
  const { tenantId } = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jx_tax_rule", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_tax_rule" as any).select("id, name, basis, rate, active").eq("tenant_id", tenantId).eq("active", true);
      if (error) throw error;
      return (data || []) as unknown as JxTaxRule[];
    },
  });
  return { taxRules: data, isLoading };
}

export function useJewelrySales() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const createSale = useMutation({
    mutationFn: async (payload: SalePayload) => {
      const { data, error } = await supabase.rpc("jx_create_sale" as any, { p_payload: payload as any });
      if (error) throw error;
      return data as unknown as { sale_id: string; sale_no: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jx_sale", tenantId] });
      qc.invalidateQueries({ queryKey: ["jx_item", tenantId] });
    },
  });
  return { createSale };
}
