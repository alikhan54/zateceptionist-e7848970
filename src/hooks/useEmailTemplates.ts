import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  category: string;
  html_content: string;
  available_tokens: string[];
  times_used: number;
  avg_open_rate?: number;
  avg_click_rate?: number;
  is_active: boolean;
  industry?: string;
  created_at: string;
  updated_at?: string;
}

export function useEmailTemplates(options?: { category?: string }) {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email_templates', tenantUuid, options?.category],
    queryFn: async () => {
      if (!tenantUuid) return [];
      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenantUuid)
        .eq('is_active', true)
        .order('times_used', { ascending: false });

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: Partial<EmailTemplate>) => {
      if (!tenantUuid) throw new Error('No tenant');
      const { data, error } = await supabase.from('email_templates').insert({
        tenant_id: tenantUuid,
        name: input.name,
        subject: input.subject,
        category: input.category || 'general',
        html_content: input.html_content || '',
        available_tokens: input.available_tokens || ['{{name}}'],
        times_used: 0,
        is_active: true,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates', tenantUuid] });
      toast({ title: 'Template Created' });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates', tenantUuid] });
      toast({ title: 'Template Updated' });
    },
  });

  const stats = {
    total: templates.length,
    categories: [...new Set(templates.map((t: any) => t.category))],
    mostUsed: templates.slice(0, 5),
  };

  return { templates, isLoading, stats, createTemplate, updateTemplate };
}
