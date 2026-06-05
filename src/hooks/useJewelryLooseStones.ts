/**
 * Jewelry Loose Stones (Project JX, Phase 9). CRUD over jx_stone rows that are NOT
 * attached to an item (item_id NULL, is_loose=true) — a standalone loose-stone inventory.
 * SLUG-keyed via useTenant() + RLS. Reuses the JxStone shape from useJewelryInventory.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { JxStone } from "@/hooks/useJewelryInventory";

export interface JxLooseStone extends JxStone { id: string; created_at?: string; }

export function useJewelryLooseStones() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: stones = [], isLoading, refetch } = useQuery({
    queryKey: ["jx_loose_stone", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_stone" as any).select("*").eq("tenant_id", tenantId).eq("is_loose", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as JxLooseStone[];
    },
  });

  const createStone = useMutation({
    mutationFn: async (s: JxStone) => {
      const { id, ...rest } = s as JxLooseStone;
      const { data, error } = await supabase
        .from("jx_stone" as any).insert({ ...rest, tenant_id: tenantId, item_id: null, is_loose: true } as any).select().single();
      if (error) throw error;
      return data as unknown as JxLooseStone;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_loose_stone", tenantId] }),
  });

  const updateStone = useMutation({
    mutationFn: async ({ id, stone }: { id: string; stone: JxStone }) => {
      const { id: _drop, ...rest } = stone as JxLooseStone;
      const { error } = await supabase
        .from("jx_stone" as any).update({ ...rest, is_loose: true, updated_at: new Date().toISOString() } as any)
        .eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_loose_stone", tenantId] }),
  });

  const deleteStone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jx_stone" as any).delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_loose_stone", tenantId] }),
  });

  return { stones, isLoading, refetch, createStone, updateStone, deleteStone };
}
