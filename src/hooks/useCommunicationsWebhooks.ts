import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { useToast } from '@/hooks/use-toast';

// Types
export interface SendMessageRequest {
  channel: 'whatsapp' | 'email' | 'sms';
  to: string;
  content: string;
  template_id?: string;
  media_urls?: string[];
  metadata?: Record<string, unknown>;
}

export interface BookAppointmentRequest {
  customer_id: string;
  service?: string;
  date: string;
  time: string;
  duration?: number;
  notes?: string;
  assigned_to?: string;
  send_confirmation?: boolean;
}

export interface CustomerUpdateRequest {
  customer_id: string;
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    custom_fields?: Record<string, unknown>;
  };
}

export interface VAPIOutboundRequest {
  phone_number: string;
  customer_id?: string;
  script_id?: string;
  campaign_id?: string;
  variables?: Record<string, string>;
}

export interface VAPIConfigRequest {
  action: 'update' | 'get';
  config?: {
    voice_id?: string;
    language?: string;
    speed?: number;
    greeting?: string;
    fallback_message?: string;
    transfer_number?: string;
  };
}

export function useCommunicationsWebhooks() {
  const { tenantId: tid } = useTenant();
  const tenantId = tid || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Send Message (WhatsApp, Email, SMS)
  const sendMessage = useMutation({
    mutationFn: async (data: SendMessageRequest) => {
      const result = await callWebhook<{ message_id: string; status: string }>(WEBHOOKS.SEND_MESSAGE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['messages', tenantId] });
      toast({
        title: 'Message Sent',
        description: `Message sent via ${variables.channel}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Message Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Book Appointment
  const bookAppointment = useMutation({
    mutationFn: async (data: BookAppointmentRequest) => {
      const result = await callWebhook<{ appointment_id: string; confirmation_sent: boolean }>(
        WEBHOOKS.BOOK_APPOINTMENT,
        data,
        tenantId
      );
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
      toast({
        title: 'Appointment Booked',
        description: 'The appointment has been scheduled successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Booking Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update Customer
  const updateCustomer = useMutation({
    mutationFn: async (data: CustomerUpdateRequest) => {
      const result = await callWebhook<{ customer_id: string; updated: boolean }>(WEBHOOKS.CUSTOMER_UPDATE, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
      toast({
        title: 'Customer Updated',
        description: 'Customer information has been updated',
      });
    },
  });

  // VAPI Outbound Call
  const makeOutboundCall = useMutation({
    mutationFn: async (data: VAPIOutboundRequest) => {
      const result = await callWebhook<{ call_id: string; status: string }>(WEBHOOKS.VAPI_OUTBOUND, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls', tenantId] });
      toast({
        title: 'Call Initiated',
        description: 'Outbound call is being placed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Call Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // VAPI Configuration
  const updateVAPIConfig = useMutation({
    mutationFn: async (data: VAPIConfigRequest) => {
      const result = await callWebhook(WEBHOOKS.VAPI_CONFIG, data, tenantId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: 'Configuration Updated',
        description: 'Voice AI settings have been saved',
      });
    },
  });

  return {
    sendMessage,
    bookAppointment,
    updateCustomer,
    makeOutboundCall,
    updateVAPIConfig,
  };
}
