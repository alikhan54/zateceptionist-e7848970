import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

export interface Integration {
  id: string;
  tenant_id: string;
  integration_name: string;
  integration_type: 'whatsapp' | 'google_calendar' | 'stripe' | 'slack' | 'hubspot' | 'zapier' | 'instagram' | 'facebook' | 'email' | 'vapi' | 'openai' | 'apify';
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  config: Record<string, unknown>;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  icon?: string;
}

const INTEGRATION_ICONS: Record<string, string> = {
  whatsapp: '💬',
  google_calendar: '📅',
  stripe: '💳',
  slack: '💼',
  hubspot: '🔗',
  zapier: '⚡',
  instagram: '📸',
  facebook: '👤',
  email: '📧',
  vapi: '🎙️',
  openai: '🤖',
  apify: '🕷️',
};

export function useIntegrations() {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('integration_name');

      if (error) throw error;
      return (data as Integration[]).map(i => ({
        ...i,
        icon: INTEGRATION_ICONS[i.integration_type] || '🔌',
      }));
    },
    enabled: !!tenantId,
  });

  const connectIntegration = useMutation({
    mutationFn: async ({ 
      type, 
      config 
    }: { 
      type: string; 
      config: Record<string, string> 
    }) => {
      // Update integration status
      const { error: integrationError } = await supabase
        .from('tenant_integrations')
        .update({
          status: 'connected',
          config,
          last_sync_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', type);

      if (integrationError) throw integrationError;

      // Also update tenant_config with the relevant API keys
      const configUpdates: Record<string, string | null> = {};
      
      switch (type) {
        case 'whatsapp':
          if (config.wati_api_key) configUpdates.wati_api_key = config.wati_api_key;
          if (config.wati_endpoint) configUpdates.wati_endpoint = config.wati_endpoint;
          if (config.whatsapp_phone_id) configUpdates.whatsapp_phone_id = config.whatsapp_phone_id;
          break;
        case 'stripe':
          if (config.stripe_secret_key) configUpdates.stripe_secret_key = config.stripe_secret_key;
          if (config.stripe_publishable_key) configUpdates.stripe_publishable_key = config.stripe_publishable_key;
          break;
        case 'google_calendar':
          if (config.google_calendar_id) configUpdates.google_calendar_id = config.google_calendar_id;
          break;
        case 'vapi':
          if (config.vapi_api_key) configUpdates.vapi_api_key = config.vapi_api_key;
          if (config.vapi_assistant_id) configUpdates.vapi_assistant_id = config.vapi_assistant_id;
          break;
        case 'openai':
          if (config.openai_api_key) configUpdates.openai_api_key = config.openai_api_key;
          break;
        case 'instagram':
          if (config.instagram_page_id) configUpdates.instagram_page_id = config.instagram_page_id;
          break;
        case 'facebook':
          if (config.meta_page_id) configUpdates.meta_page_id = config.meta_page_id;
          if (config.meta_page_token) configUpdates.meta_page_token = config.meta_page_token;
          break;
      }

      if (Object.keys(configUpdates).length > 0) {
        const { error: configError } = await supabase
          .from('tenant_config')
          .update(configUpdates)
          .eq('tenant_id', tenantId);

        if (configError) throw configError;
      }

      await refreshConfig();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', tenantId] });
    },
  });

  const disconnectIntegration = useMutation({
    mutationFn: async (type: string) => {
      const { error } = await supabase
        .from('tenant_integrations')
        .update({
          status: 'disconnected',
          config: {},
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('integration_type', type);

      if (error) throw error;
      await refreshConfig();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', tenantId] });
    },
  });

  return {
    integrations: integrations ?? [],
    isLoading,
    connectIntegration,
    disconnectIntegration,
  };
}
