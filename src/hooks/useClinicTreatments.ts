import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface ClinicTreatment {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  pre_care_instructions: string | null;
  post_care_instructions: string | null;
  contraindications: string | null;
  follow_up_schedule: any[] | null;
  recommended_products: string[] | null;
  requires_consultation: boolean;
  requires_consent: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClinicTreatments(category?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: treatments = [], isLoading, refetch } = useQuery({
    queryKey: ["clinic_treatments", tenantId, category],
    queryFn: async () => {
      let query = supabase
        .from("clinic_treatments" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category")
        .order("name");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClinicTreatment[];
    },
    enabled: !!tenantId,
  });

  const createTreatment = useMutation({
    mutationFn: async (treatment: Partial<ClinicTreatment>) => {
      const { data, error } = await supabase
        .from("clinic_treatments" as any)
        .insert({ ...treatment, tenant_id: tenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClinicTreatment;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_treatments", tenantId] }); },
  });

  const updateTreatment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClinicTreatment> }) => {
      const { error } = await supabase
        .from("clinic_treatments" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clinic_treatments", tenantId] }); },
  });

  const categories = [...new Set(treatments.map(t => t.category))];

  return { treatments, isLoading, categories, refetch, createTreatment, updateTreatment };
}
