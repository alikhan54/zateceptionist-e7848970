import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';

export interface KnowledgeEntry {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  content_type: 'text' | 'faq' | 'document' | 'url' | 'scraped';
  category: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['knowledge-base', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeEntry[];
    },
    enabled: !!tenantId,
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Omit<KnowledgeEntry, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({ ...entry, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', tenantId] });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeEntry> & { id: string }) => {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', tenantId] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', tenantId] });
    },
  });

  const trainAI = useMutation({
    mutationFn: async () => {
      const response = await callWebhook(
        WEBHOOKS.TRAIN_AI_KNOWLEDGE,
        { tenant_id: tenantId },
        tenantId || ''
      );
      return response;
    },
  });

  return {
    entries: entries ?? [],
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    trainAI,
  };
}
