import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase, callWebhook } from '@/integrations/supabase/client';
import { logSystemEvent } from '@/lib/api/systemEvents';

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  tags: string[];
  source: string | null;
  status: 'active' | 'inactive' | 'lead';
  notes: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;

export function useCustomers() {
  const { tenantId, tenantConfig } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: customers,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!tenantId,
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: CustomerInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: async (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });

      // Auto-enrollment: check for active sequences with new_lead/new_contact trigger
      try {
        const tenantUuid = tenantConfig?.id;
        if (!tenantUuid) return;
        const { data: sequences } = await supabase
          .from('marketing_sequences' as any)
          .select('id, name, trigger_type')
          .eq('tenant_id', tenantUuid)
          .eq('is_active', true)
          .in('trigger_type', ['new_lead', 'new_contact']);

        if (sequences && sequences.length > 0) {
          for (const seq of sequences) {
            callWebhook('/ai-tool/enroll-sequence', {
              sequence_id: seq.id,
              lead_id: customer.id,
              sequence_name: seq.name,
              reason: `auto_enrollment_${seq.trigger_type}`,
            }, tenantUuid).catch(() => {}); // fire-and-forget
          }
          logSystemEvent({
            tenantId: tenantUuid,
            eventType: 'sequence_enrollment',
            sourceModule: 'marketing',
            targetModule: 'sales',
            eventData: { lead_id: customer.id, auto_enrolled_sequences: sequences.map((s: any) => s.name), reason: 'new_customer_created' },
          });
        }
      } catch {
        // Silent fail — auto-enrollment should not block customer creation
      }
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('customers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
    },
  });

  const getCustomer = async (id: string) => {
    if (!tenantId) return null;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data as Customer | null;
  };

  return {
    customers: customers ?? [],
    isLoading,
    error,
    refetch,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
  };
}

export function useCustomer(id: string | undefined) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['customer', tenantId, id],
    queryFn: async () => {
      if (!tenantId || !id) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as Customer | null;
    },
    enabled: !!tenantId && !!id,
  });
}
