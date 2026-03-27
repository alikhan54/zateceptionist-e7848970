import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface REListing {
  id: string;
  tenant_id: string;
  reference_number: string | null;
  trakheesi_permit: string | null;
  title: string;
  title_ar: string | null;
  description: string | null;
  property_type: string;
  property_subtype: string | null;
  purpose: string;
  community: string | null;
  sub_community: string | null;
  building_name: string | null;
  unit_number: string | null;
  floor_number: number | null;
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  plot_size_sqft: number | null;
  parking_spaces: number;
  furnishing: string;
  price: number;
  price_per_sqft: number | null;
  currency: string;
  rental_frequency: string | null;
  is_offplan: boolean;
  developer_name: string | null;
  project_name: string | null;
  completion_date: string | null;
  payment_plan: Record<string, any>;
  amenities: string[];
  view_type: string | null;
  photos: any[];
  floor_plan_url: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  listing_agent_name: string | null;
  status: string;
  listed_date: string | null;
  sold_date: string | null;
  days_on_market: number | null;
  form_a_signed: boolean;
  portal_status: string;
  bayut_listing_id: string | null;
  propertyfinder_listing_id: string | null;
  dubizzle_listing_id: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRealEstateListings(searchTerm?: string, filters?: { community?: string; property_type?: string; purpose?: string; status?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["re_listings", tenantId, searchTerm, filters],
    queryFn: async () => {
      let query = supabase
        .from("re_listings" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,community.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%,building_name.ilike.%${searchTerm}%`);
      }
      if (filters?.community) query = query.eq("community", filters.community);
      if (filters?.property_type) query = query.eq("property_type", filters.property_type);
      if (filters?.purpose) query = query.eq("purpose", filters.purpose);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as REListing[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("re_listings_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "re_listings", filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["re_listings", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  const createListing = useMutation({
    mutationFn: async (listing: Partial<REListing>) => {
      const { data, error } = await supabase
        .from("re_listings" as any)
        .insert({ ...listing, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as REListing;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_listings", tenantId] }); },
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<REListing> }) => {
      const { error } = await supabase
        .from("re_listings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["re_listings", tenantId] }); },
  });

  const activeListings = listings.filter(l => l.status === "active");
  const stats = {
    totalListings: listings.length,
    activeListings: activeListings.length,
    forSale: activeListings.filter(l => l.purpose === "sale").length,
    forRent: activeListings.filter(l => l.purpose === "rent").length,
    offPlan: activeListings.filter(l => l.is_offplan).length,
    totalValue: activeListings.filter(l => l.purpose === "sale").reduce((sum, l) => sum + (l.price || 0), 0),
    avgPricePerSqft: activeListings.length > 0
      ? Math.round(activeListings.filter(l => l.price_per_sqft).reduce((sum, l) => sum + (l.price_per_sqft || 0), 0) / Math.max(activeListings.filter(l => l.price_per_sqft).length, 1))
      : 0,
    communities: [...new Set(activeListings.map(l => l.community).filter(Boolean))],
  };

  return { listings, isLoading, error, stats, refetch, createListing, updateListing };
}
