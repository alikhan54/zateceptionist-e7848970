import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface SalesLead {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  score: number;
  assigned_to: string | null;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, unknown> | null;
  last_contacted_at: string | null;
  converted_at: string | null;
  deal_id: string | null;
  sequence_id: string | null;
  sequence_step: number | null;
  sequence_paused: boolean;
  created_at: string;
  updated_at: string;
}

export type SalesLeadInput = Omit<SalesLead, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'converted_at' | 'deal_id'>;

export function useSalesLeads(options?: { status?: string; source?: string; assignedTo?: string }) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: leads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sales-leads', tenantId, options?.status, options?.source, options?.assignedTo],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('sales_leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('score', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.source) {
        query = query.eq('source', options.source);
      }
      if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenantId,
  });

  const addLead = useMutation({
    mutationFn: async (lead: SalesLeadInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .insert({ ...lead, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesLead> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('sales_leads')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  // Sequence control mutations
  const startSequence = useMutation({
    mutationFn: async ({ leadId, sequenceId }: { leadId: string; sequenceId: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_id: sequenceId,
          sequence_step: 0,
          sequence_paused: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const pauseSequence = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_paused: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const resumeSequence = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_paused: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const stopSequence = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_id: null,
          sequence_step: null,
          sequence_paused: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const advanceSequenceStep = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Get current lead
      const { data: lead, error: fetchError } = await supabase
        .from('sales_leads')
        .select('sequence_step')
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_step: (lead?.sequence_step ?? 0) + 1,
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
    },
  });

  const convertToDeal = useMutation({
    mutationFn: async ({ leadId, dealData }: { leadId: string; dealData: Record<string, unknown> }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Create the deal
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({ ...dealData, tenant_id: tenantId })
        .select()
        .single();

      if (dealError) throw dealError;

      // Update the lead
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          status: 'won',
          deal_id: deal.id,
          converted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return { lead: data as SalesLead, deal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  return {
    leads: leads ?? [],
    isLoading,
    error,
    refetch,
    addLead,
    updateLead,
    deleteLead,
    startSequence,
    pauseSequence,
    resumeSequence,
    stopSequence,
    advanceSequenceStep,
    convertToDeal,
  };
}

export function useLeadsByScore(minScore = 0) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['sales-leads', 'by-score', tenantId, minScore],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('sales_leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('score', minScore)
        .not('status', 'in', '("won","lost")')
        .order('score', { ascending: false });

      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenantId,
  });
}
