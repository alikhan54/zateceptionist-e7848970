import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Integration, 
  IntegrationStatus, 
  IntegrationHealth,
  INTEGRATION_FLAGS 
} from '@/types/integrations';
import { INTEGRATIONS, getIntegration } from '@/config/integrations';

export interface IntegrationWithStatus extends Integration {
  status: IntegrationStatus;
  health?: IntegrationHealth;
  connectedAt?: string;
  lastSyncAt?: string;
}

const WEBHOOK_BASE = 'https://webhooks.zatesystems.com/webhook';

export function useIntegrationsV2() {
  const { tenantConfig, tenantId, refreshConfig } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate webhook URL for an integration
  const getWebhookUrl = (integrationId: string): string => {
    if (!tenantConfig?.id) return '';
    return `${WEBHOOK_BASE}/${tenantConfig.id}/${integrationId}`;
  };

  // Determine connection status from tenant_config flags
  const getConnectionStatus = (integrationId: string): IntegrationStatus => {
    if (!tenantConfig) return 'disconnected';
    
    const flagKey = INTEGRATION_FLAGS[integrationId];
    if (!flagKey) return 'disconnected';
    
    const isConnected = (tenantConfig as any)[flagKey] === true;
    return isConnected ? 'connected' : 'disconnected';
  };

  // Get health status from integration_health JSONB
  const getHealth = (integrationId: string): IntegrationHealth | undefined => {
    const health = (tenantConfig as any)?.integration_health?.[integrationId];
    return health as IntegrationHealth | undefined;
  };

  // Get stored credentials for an integration
  const getStoredCredentials = (integration: Integration): Record<string, string> => {
    if (!tenantConfig) return {};
    
    const credentials: Record<string, string> = {};
    integration.credentials.forEach(field => {
      const value = (tenantConfig as any)[field.key];
      if (value) {
        credentials[field.key] = value;
      }
    });
    return credentials;
  };

  // Get stored settings for an integration
  const getStoredSettings = (integrationId: string): Record<string, any> => {
    return (tenantConfig as any)?.integration_settings?.[integrationId] || {};
  };

  // Query to get all integrations with their status
  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['integrations-v2', tenantConfig?.id],
    queryFn: async (): Promise<IntegrationWithStatus[]> => {
      return INTEGRATIONS.map(integration => ({
        ...integration,
        status: getConnectionStatus(integration.id),
        health: getHealth(integration.id),
        connectedAt: (tenantConfig as any)?.[`${integration.id}_connected_at`],
        lastSyncAt: (tenantConfig as any)?.[`${integration.id}_last_sync`],
      }));
    },
    enabled: !!tenantConfig,
  });

  // Connect an integration
  const connectIntegration = useMutation({
    mutationFn: async ({ 
      integrationId, 
      credentials, 
      settings 
    }: { 
      integrationId: string; 
      credentials: Record<string, string>;
      settings?: Record<string, any>;
    }) => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');

      const integration = getIntegration(integrationId);
      if (!integration) throw new Error('Integration not found');

      const flagKey = INTEGRATION_FLAGS[integrationId];
      
      // Build update payload
      const updatePayload: Record<string, any> = {
        ...credentials,
        updated_at: new Date().toISOString(),
      };

      // Set the has_* flag to true
      if (flagKey) {
        updatePayload[flagKey] = true;
      }

      // Update integration_settings if provided
      if (settings && Object.keys(settings).length > 0) {
        const currentSettings = (tenantConfig as any)?.integration_settings || {};
        updatePayload.integration_settings = {
          ...currentSettings,
          [integrationId]: settings,
        };
      }

      // Update integration_health
      const currentHealth = (tenantConfig as any)?.integration_health || {};
      updatePayload.integration_health = {
        ...currentHealth,
        [integrationId]: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('tenant_config')
        .update(updatePayload)
        .eq('id', tenantConfig.id);

      if (error) throw error;

      // Log the connection (don't fail if logging fails)
      try {
        await supabase.from('integration_logs').insert({
          tenant_id: tenantConfig.id,
          integration_id: integrationId,
          action: 'connected',
          details: { credentials: Object.keys(credentials) },
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        // Ignore logging errors
      }

      await refreshConfig();
    },
    onSuccess: (_, { integrationId }) => {
      const integration = getIntegration(integrationId);
      toast({
        title: 'Integration Connected',
        description: `${integration?.name || integrationId} has been connected successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['integrations-v2'] });
    },
    onError: (error) => {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect integration',
        variant: 'destructive',
      });
    },
  });

  // Disconnect an integration
  const disconnectIntegration = useMutation({
    mutationFn: async (integrationId: string) => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');

      const integration = getIntegration(integrationId);
      if (!integration) throw new Error('Integration not found');

      const flagKey = INTEGRATION_FLAGS[integrationId];
      
      // Build update payload - clear credentials and set flag to false
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Set the has_* flag to false
      if (flagKey) {
        updatePayload[flagKey] = false;
      }

      // Clear credentials (set to null)
      integration.credentials.forEach(field => {
        updatePayload[field.key] = null;
      });

      // Update health status
      const currentHealth = (tenantConfig as any)?.integration_health || {};
      updatePayload.integration_health = {
        ...currentHealth,
        [integrationId]: undefined,
      };

      const { error } = await supabase
        .from('tenant_config')
        .update(updatePayload)
        .eq('id', tenantConfig.id);

      if (error) throw error;

      // Log the disconnection (don't fail if logging fails)
      try {
        await supabase.from('integration_logs').insert({
          tenant_id: tenantConfig.id,
          integration_id: integrationId,
          action: 'disconnected',
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        // Ignore logging errors
      }

      await refreshConfig();
    },
    onSuccess: (_, integrationId) => {
      const integration = getIntegration(integrationId);
      toast({
        title: 'Integration Disconnected',
        description: `${integration?.name || integrationId} has been disconnected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['integrations-v2'] });
    },
    onError: (error) => {
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect integration',
        variant: 'destructive',
      });
    },
  });

  // Test an integration connection
  const testConnection = useMutation({
    mutationFn: async (integrationId: string) => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');

      const response = await fetch(`${WEBHOOK_BASE}/test/${tenantConfig.id}/${integrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Connection test failed');
      }

      return response.json();
    },
    onSuccess: (result, integrationId) => {
      const integration = getIntegration(integrationId);
      toast({
        title: 'Connection Test Passed',
        description: `${integration?.name || integrationId} is working correctly.`,
      });
    },
    onError: (error, integrationId) => {
      const integration = getIntegration(integrationId);
      toast({
        title: 'Connection Test Failed',
        description: `${integration?.name || integrationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Update integration settings
  const updateSettings = useMutation({
    mutationFn: async ({ 
      integrationId, 
      settings 
    }: { 
      integrationId: string; 
      settings: Record<string, any>;
    }) => {
      if (!tenantConfig?.id) throw new Error('No tenant configured');

      const currentSettings = (tenantConfig as any)?.integration_settings || {};
      
      const { error } = await supabase
        .from('tenant_config')
        .update({
          integration_settings: {
            ...currentSettings,
            [integrationId]: {
              ...(currentSettings as any)[integrationId],
              ...settings,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantConfig.id);

      if (error) throw error;
      await refreshConfig();
    },
    onSuccess: () => {
      toast({ title: 'Settings Updated' });
      queryClient.invalidateQueries({ queryKey: ['integrations-v2'] });
    },
  });

  // Get counts
  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalCount = INTEGRATIONS.length;

  return {
    integrations,
    isLoading,
    refetch,
    connectIntegration,
    disconnectIntegration,
    testConnection,
    updateSettings,
    getWebhookUrl,
    getStoredCredentials,
    getStoredSettings,
    connectedCount,
    totalCount,
  };
}
