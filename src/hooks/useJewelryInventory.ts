/**
 * Jewelry inventory CRUD (Project JX, Phase 5) — jx_item + jx_stone.
 * SLUG-keyed: filters by tenantId (slug from useTenant()), relies on RLS, sets
 * tenant_id=slug on insert. NEVER tenantConfig.id. Mirrors the clinic hook style.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface JxStone {
  id?: string;
  type?: string | null;
  name?: string | null;
  weight?: number | null;
  unit?: string | null;
  qty?: number | null;
  rate?: number | null;
  price?: number | null;
  color?: string | null;
  cut?: string | null;
  clarity?: string | null;
  is_loose?: boolean | null;
}

export interface JxItem {
  id: string;
  tenant_id: string;
  metal: string | null;
  karat: number | null;
  tag_number: string | null;
  group_item: string | null;
  design_no: string | null;
  size: string | null;
  gross_weight: number | null;
  net_weight: number | null;
  stone_weight: number | null;
  pure_weight: number | null;
  waste_pct: number | null;
  making_type: string | null;
  making_value: number | null;
  lacquer_type: string | null;
  lacquer_value: number | null;
  purchase_rate: number | null;
  item_cost: number | null;
  sale_price: number | null;
  worker_id: string | null;
  item_for: string | null;
  status: string | null;
  photo_urls: unknown;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface JxWorker { id: string; name: string | null; }

/** Workers for the assignment dropdown (RLS/slug). */
export function useJewelryWorkers() {
  const { tenantId } = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jx_worker", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_worker" as any).select("id, name").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return (data || []) as unknown as JxWorker[];
    },
  });
  return { workers: data, isLoading };
}

export function useJewelryItems(search?: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["jx_item", tenantId, search],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase.from("jx_item" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (search && search.trim()) {
        const s = search.trim();
        q = q.or(`tag_number.ilike.%${s}%,design_no.ilike.%${s}%,group_item.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as JxItem[];
    },
  });

  const stripStone = (s: JxStone) => {
    const { id, ...rest } = s;
    return rest;
  };

  const createItem = useMutation({
    mutationFn: async ({ item, stones }: { item: Partial<JxItem>; stones: JxStone[] }) => {
      const { data, error } = await supabase
        .from("jx_item" as any).insert({ ...item, tenant_id: tenantId } as any).select().single();
      if (error) throw error;
      const itemId = (data as any).id as string;
      if (stones?.length) {
        const rows = stones.map((s) => ({ ...stripStone(s), tenant_id: tenantId, item_id: itemId }));
        const { error: se } = await supabase.from("jx_stone" as any).insert(rows as any);
        if (se) throw se;
      }
      return data as unknown as JxItem;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_item", tenantId] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, item, stones }: { id: string; item: Partial<JxItem>; stones: JxStone[] }) => {
      const { error } = await supabase
        .from("jx_item" as any).update({ ...item, updated_at: new Date().toISOString() } as any)
        .eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      // replace linked stones
      await supabase.from("jx_stone" as any).delete().eq("item_id", id).eq("tenant_id", tenantId);
      if (stones?.length) {
        const rows = stones.map((s) => ({ ...stripStone(s), tenant_id: tenantId, item_id: id }));
        const { error: se } = await supabase.from("jx_stone" as any).insert(rows as any);
        if (se) throw se;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_item", tenantId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("jx_stone" as any).delete().eq("item_id", id).eq("tenant_id", tenantId);
      const { error } = await supabase.from("jx_item" as any).delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jx_item", tenantId] }),
  });

  const fetchStones = async (itemId: string): Promise<JxStone[]> => {
    const { data, error } = await supabase
      .from("jx_stone" as any).select("*").eq("item_id", itemId).eq("tenant_id", tenantId);
    if (error) throw error;
    return (data || []) as unknown as JxStone[];
  };

  /** Upload item photos to the shared "media" bucket; returns public URLs. */
  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop() || "jpg";
      const path = `jewelry/${tenantId}/items/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, f, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  return { items, isLoading, refetch, createItem, updateItem, deleteItem, fetchStones, uploadPhotos };
}
