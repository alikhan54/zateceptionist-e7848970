import { useCallback } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS, WebhookResponse } from '@/lib/api/webhooks';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  score?: number;
  assigned_to?: string;
  sequence_id?: string;
  sequence_status?: string;
  created_at: string;
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability?: number;
  expected_close?: string;
  contact_id?: string;
  assigned_to?: string;
  created_at: string;
}

export interface B2BLeadGenRequest {
  industry: string;
  location: string;
  company_size?: string;
  keywords?: string[];
  limit?: number;
}

export interface B2CLeadGenRequest {
  intent_keywords: string[];
  location?: string;
  demographics?: Record<string, unknown>;
  limit?: number;
}

export function useSalesWebhooks() {
  const { tenantId: tid } = useTenant();
  const tenantId = tid || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // B2B Lead Generation
  const generateB2BLeads = useMutation({
    mutationFn: async (data: B2BLeadGenRequest) => {
      const result = await callWebhook<Lead[]>(WEBHOOKS.LEAD_GEN_B2B, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
      toast({
        title: 'Leads Generated',
        description: `Successfully generated ${data?.length || 0} B2B leads`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lead Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // B2C/Intent Lead Generation
  const generateB2CLeads = useMutation({
    mutationFn: async (data: B2CLeadGenRequest) => {
      const result = await callWebhook<Lead[]>(WEBHOOKS.LEAD_GEN_B2C, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
      toast({
        title: 'Leads Generated',
        description: `Successfully generated ${data?.length || 0} intent leads`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lead Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Upload Leads
  const uploadLeads = useMutation({
    mutationFn: async (data: { leads: Partial<Lead>[]; source: string }) => {
      const result = await callWebhook<{ imported: number }>(WEBHOOKS.LEAD_UPLOAD, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
      toast({
        title: 'Leads Uploaded',
        description: `Successfully imported ${data?.imported || 0} leads`,
      });
    },
  });

  // Create Deal
  const createDeal = useMutation({
    mutationFn: async (data: Partial<Deal>) => {
      const result = await callWebhook<Deal>(WEBHOOKS.DEAL_CREATE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
      toast({ title: 'Deal Created', description: 'New deal has been created' });
    },
  });

  // Update Deal
  const updateDeal = useMutation({
    mutationFn: async (data: Partial<Deal> & { id: string }) => {
      const result = await callWebhook<Deal>(WEBHOOKS.DEAL_UPDATE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', tenantId] });
    },
  });

  // Lead Control (start/pause/stop sequence)
  const controlLead = useMutation({
    mutationFn: async (data: { lead_id: string; action: 'start' | 'pause' | 'resume' | 'stop'; sequence_id?: string }) => {
      const result = await callWebhook<Lead>(WEBHOOKS.LEAD_CONTROL, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads', tenantId] });
      toast({
        title: 'Lead Updated',
        description: `Sequence ${variables.action}ed successfully`,
      });
    },
  });

  // Sequence Control
  const controlSequence = useMutation({
    mutationFn: async (data: { sequence_id: string; action: 'activate' | 'pause' | 'archive' }) => {
      const result = await callWebhook(WEBHOOKS.SEQUENCE_CONTROL, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences', tenantId] });
    },
  });

  // Automation Control
  const controlAutomation = useMutation({
    mutationFn: async (data: { automation_id: string; action: 'enable' | 'disable' | 'trigger' }) => {
      const result = await callWebhook(WEBHOOKS.AUTOMATION_CONTROL, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations', tenantId] });
    },
  });

  return {
    generateB2BLeads,
    generateB2CLeads,
    uploadLeads,
    createDeal,
    updateDeal,
    controlLead,
    controlSequence,
    controlAutomation,
  };
}
