import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  prep_time_minutes?: number;
  is_available: boolean;
  popular?: boolean;
  chef_special?: boolean;
  spice_level?: string;
  allergens?: string[];
  modifiers?: string[];
  image_url?: string;
}

export interface RestaurantMenu {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  categories: MenuCategory[];
  items: MenuItem[];
  created_at: string;
  updated_at: string;
}

export function useRestaurantMenu() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: menu,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["restaurant-menu", tenantId],
    queryFn: async (): Promise<RestaurantMenu | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("restaurant_menus")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as RestaurantMenu | null;
    },
    enabled: !!tenantId,
  });

  // Update menu (items + categories)
  const updateMenu = useMutation({
    mutationFn: async ({
      items,
      categories,
    }: {
      items: MenuItem[];
      categories: MenuCategory[];
    }) => {
      if (!menu) throw new Error("No menu found");
      const { error } = await supabase
        .from("restaurant_menus")
        .update({
          items,
          categories,
          updated_at: new Date().toISOString(),
        })
        .eq("id", menu.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-menu", tenantId] });
    },
  });

  // Toggle item availability
  const toggleAvailability = useMutation({
    mutationFn: async (itemId: string) => {
      if (!menu) throw new Error("No menu found");
      const updatedItems = menu.items.map((item) =>
        item.id === itemId ? { ...item, is_available: !item.is_available } : item
      );
      const { error } = await supabase
        .from("restaurant_menus")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", menu.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-menu", tenantId] });
    },
  });

  // Add item
  const addItem = useMutation({
    mutationFn: async (newItem: Omit<MenuItem, "id">) => {
      if (!menu) throw new Error("No menu found");
      const item: MenuItem = {
        ...newItem,
        id: crypto.randomUUID(),
      };
      const updatedItems = [...menu.items, item];
      const { error } = await supabase
        .from("restaurant_menus")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", menu.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-menu", tenantId] });
    },
  });

  // Remove item
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!menu) throw new Error("No menu found");
      const updatedItems = menu.items.filter((i) => i.id !== itemId);
      const { error } = await supabase
        .from("restaurant_menus")
        .update({ items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", menu.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-menu", tenantId] });
    },
  });

  // Helpers
  const categories = menu?.categories || [];
  const items = menu?.items || [];

  const getItemsByCategory = (categoryId: string) =>
    items.filter((i) => i.category_id === categoryId);

  return {
    menu,
    categories,
    items,
    isLoading,
    error,
    refetch,
    updateMenu,
    toggleAvailability,
    addItem,
    removeItem,
    getItemsByCategory,
  };
}
