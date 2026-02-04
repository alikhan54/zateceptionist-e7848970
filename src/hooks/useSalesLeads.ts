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
  // FIXED: Get both tenantId (slug) for deals and tenantConfig for UUID
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id; // UUID - sales_leads stores UUID in tenant_id
  const queryClient = useQueryClient();

  const {
    data: leads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sales-leads', tenantUuid, options?.status, options?.source, options?.assignedTo],
    queryFn: async () => {
      if (!tenantUuid) return [];
      
      let query = supabase
        .from('sales_leads')
        .select('*')
        .eq('tenant_id', tenantUuid) // UUID - sales_leads stores UUID
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
    enabled: !!tenantUuid,
  });

  const addLead = useMutation({
    mutationFn: async (lead: SalesLeadInput) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .insert({ ...lead, tenant_id: tenantUuid }) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesLead> & { id: string }) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantUuid) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { error } = await supabase
        .from('sales_leads')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantUuid); // UUID

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  // Sequence control mutations
  const startSequence = useMutation({
    mutationFn: async ({ leadId, sequenceId }: { leadId: string; sequenceId: string }) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_id: sequenceId,
          sequence_step: 0,
          sequence_paused: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantUuid) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const pauseSequence = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_paused: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantUuid) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const resumeSequence = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_paused: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantUuid) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const stopSequence = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          sequence_id: null,
          sequence_step: null,
          sequence_paused: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantUuid) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const advanceSequenceStep = useMutation({
    mutationFn: async (leadId: string) => {
      if (!tenantUuid) throw new Error('No tenant UUID');
      
      // Get current lead
      const { data: lead, error: fetchError } = await supabase
        .from('sales_leads')
        .select('sequence_step')
        .eq('id', leadId)
        .eq('tenant_id', tenantUuid) // UUID
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
        .eq('tenant_id', tenantUuid) // UUID
        .select()
        .single();

      if (error) throw error;
      return data as SalesLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] });
    },
  });

  const convertToDeal = useMutation({
    mutationFn: async ({ leadId, dealData }: { leadId: string; dealData: Record<string, unknown> }) => {
      if (!tenantId) throw new Error('No tenant ID (slug) for deals');
      if (!tenantUuid) throw new Error('No tenant UUID for sales_leads');
      
      // Create the deal - deals table uses SLUG (tenantId)
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({ ...dealData, tenant_id: tenantId }) // SLUG for deals!
        .select()
        .single();

      if (dealError) throw dealError;

      // Update the lead - sales_leads uses UUID (tenantUuid)
      const { data, error } = await supabase
        .from('sales_leads')
        .update({
          status: 'won',
          deal_id: deal.id,
          converted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', tenantUuid) // UUID for sales_leads!
        .select()
        .single();

      if (error) throw error;
      return { lead: data as SalesLead, deal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantUuid] }); // UUID
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] }); // SLUG
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
  // FIXED: Get tenantConfig for UUID
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id; // UUID - sales_leads stores UUID

  return useQuery({
    queryKey: ['sales-leads', 'by-score', tenantUuid, minScore],
    queryFn: async () => {
      if (!tenantUuid) return [];
      
      const { data, error } = await supabase
        .from('sales_leads')
        .select('*')
        .eq('tenant_id', tenantUuid) // UUID
        .gte('score', minScore)
        .not('status', 'in', '("won","lost")')
        .order('score', { ascending: false });

      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenantUuid,
  });
}
