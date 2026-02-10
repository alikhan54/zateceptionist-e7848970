import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export interface ABTest {
  id: string;
  tenant_id: string;
  name: string;
  test_type: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Array<{
    id: string;
    name: string;
    config: Record<string, any>;
    sent: number;
    opened: number;
    clicked: number;
  }>;
  winner_variant?: string;
  statistical_significance?: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export function useABTests() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['ab_tests', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const createTest = useMutation({
    mutationFn: async (input: Partial<ABTest>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data, error } = await supabase.from('ab_tests').insert({
        tenant_id: tenantUuid,
        name: input.name,
        test_type: input.test_type,
        variants: input.variants || [],
        status: 'draft',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab_tests', tenantUuid] });
      toast({ title: 'A/B Test Created' });
    },
  });

  const startTest = useMutation({
    mutationFn: async (testId: string) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', testId)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab_tests', tenantUuid] });
      toast({ title: 'Test Started' });
    },
  });

  const endTest = useMutation({
    mutationFn: async ({ testId, winnerId }: { testId: string; winnerId: string }) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .update({ status: 'completed', ended_at: new Date().toISOString(), winner_variant: winnerId })
        .eq('id', testId)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab_tests', tenantUuid] });
      toast({ title: 'Test Completed' });
    },
  });

  const stats = {
    total: tests.length,
    running: tests.filter((t: any) => t.status === 'running').length,
    completed: tests.filter((t: any) => t.status === 'completed').length,
  };

  return { tests, isLoading, stats, createTest, startTest, endTest };
}
