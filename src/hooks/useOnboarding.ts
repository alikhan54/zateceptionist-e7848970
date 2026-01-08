import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { useNavigate } from 'react-router-dom';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';

export interface OnboardingStatus {
  onboarding_completed: boolean;
  current_step: number;
  steps_completed: {
    company: boolean;
    ai_config: boolean;
    channels: boolean;
    knowledge: boolean;
    billing: boolean;
  };
  scraped_data: Record<string, unknown>;
}

export function useOnboarding() {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ['onboarding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('tenant_onboarding')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // If no onboarding record exists, create one
      if (!data) {
        const { data: newRecord, error: insertError } = await supabase
          .from('tenant_onboarding')
          .insert({ tenant_id: tenantId })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newRecord as OnboardingStatus;
      }
      
      return data as OnboardingStatus;
    },
    enabled: !!tenantId,
  });

  const analyzeCompany = useMutation({
    mutationFn: async (input: string) => {
      const response = await callWebhook(
        WEBHOOKS.AI_COMPANY_ANALYZE,
        { input },
        tenantId || 'onboarding'
      );
      return response;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Store scraped data
        const scrapedData = data.data as Record<string, unknown>;
        updateOnboarding.mutate({
          scraped_data: scrapedData,
          steps_completed: { ...onboardingStatus?.steps_completed, company: true },
          current_step: 2,
        });
      }
    },
  });

  const updateOnboarding = useMutation({
    mutationFn: async (updates: Partial<OnboardingStatus>) => {
      const { error } = await supabase
        .from('tenant_onboarding')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', tenantId] });
    },
  });

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      // Mark onboarding as complete
      const { error: onboardingError } = await supabase
        .from('tenant_onboarding')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (onboardingError) throw onboardingError;

      // Update tenant_config
      const { error: configError } = await supabase
        .from('tenant_config')
        .update({ onboarding_completed: true })
        .eq('tenant_id', tenantId);

      if (configError) throw configError;

      // Call webhook to finalize
      await callWebhook(
        WEBHOOKS.ONBOARDING_COMPLETE,
        { tenant_id: tenantId },
        tenantId || ''
      );

      await refreshConfig();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      navigate('/dashboard');
    },
  });

  const needsOnboarding = tenantConfig && !('onboarding_completed' in tenantConfig && tenantConfig.onboarding_completed);

  return {
    onboardingStatus,
    isLoading,
    needsOnboarding,
    analyzeCompany,
    updateOnboarding,
    completeOnboarding,
  };
}
