import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface Deal {
  id: string;
  tenant_id: string;
  name: string;
  customer_id: string | null;
  customer_name: string | null;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  assigned_to: string | null;
  source: string | null;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, unknown> | null;
  won_reason: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type DealInput = Omit<Deal, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'actual_close_date' | 'won_reason' | 'lost_reason'>;

export function useDeals(options?: { stage?: string; assignedTo?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: deals,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['deals', tenantId, options?.stage, options?.assignedTo],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('deals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('value', { ascending: false });

      if (options?.stage) {
        query = query.eq('stage', options.stage);
      }
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!tenantId,
  });

  const addDeal = useMutation({
    mutationFn: async (deal: DealInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('deals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  const moveToStage = useMutation({
    mutationFn: async ({ id, stage, probability }: { id: string; stage: string; probability?: number }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const updates: Partial<Deal> = {
        stage,
        updated_at: new Date().toISOString(),
      };
      
      if (probability !== undefined) {
        updates.probability = probability;
      }
      
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  const markAsWon = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('deals')
        .update({
          stage: 'Won',
          probability: 100,
          actual_close_date: new Date().toISOString(),
          won_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  const markAsLost = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('deals')
        .update({
          stage: 'Lost',
          probability: 0,
          actual_close_date: new Date().toISOString(),
          lost_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  return {
    deals: deals ?? [],
    isLoading,
    error,
    refetch,
    addDeal,
    updateDeal,
    deleteDeal,
    moveToStage,
    markAsWon,
    markAsLost,
  };
}

export function useDealsByStage() {
  const { tenantId } = useTenant();
  const { getDealStages } = useTenant();
  
  const stages = getDealStages();

  return useQuery({
    queryKey: ['deals', 'by-stage', tenantId],
    queryFn: async () => {
      if (!tenantId) return {};
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('value', { ascending: false });

      if (error) throw error;
      
      // Group deals by stage
      const dealsByStage: Record<string, Deal[]> = {};
      stages.forEach(stage => {
        dealsByStage[stage] = [];
      });
      
      (data as Deal[]).forEach(deal => {
        if (dealsByStage[deal.stage]) {
          dealsByStage[deal.stage].push(deal);
        } else {
          // If stage doesn't exist in predefined stages, add it
          dealsByStage[deal.stage] = [deal];
        }
      });
      
      return dealsByStage;
    },
    enabled: !!tenantId,
  });
}

export function useDealPipelineValue() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['deals', 'pipeline-value', tenantId],
    queryFn: async () => {
      if (!tenantId) return { total: 0, weighted: 0, won: 0 };
      
      const { data, error } = await supabase
        .from('deals')
        .select('value, probability, stage')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      const deals = data as Pick<Deal, 'value' | 'probability' | 'stage'>[];
      
      const total = deals
        .filter(d => d.stage !== 'Lost')
        .reduce((sum, d) => sum + d.value, 0);
        
      const weighted = deals
        .filter(d => d.stage !== 'Won' && d.stage !== 'Lost')
        .reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
        
      const won = deals
        .filter(d => d.stage === 'Won')
        .reduce((sum, d) => sum + d.value, 0);
      
      return { total, weighted, won };
    },
    enabled: !!tenantId,
  });
}
