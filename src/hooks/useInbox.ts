import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

export interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  channel: 'whatsapp' | 'email' | 'instagram' | 'facebook' | 'voice' | 'webchat' | 'linkedin' | 'twitter' | 'telegram';
  status: 'active' | 'pending' | 'resolved' | 'escalated';
  handler_type: 'ai' | 'staff' | 'manager';
  assigned_to: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'ai' | 'staff';
  sender_name: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useInbox(channelFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ['conversations', tenantId, channelFilter],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false });

      if (channelFilter) {
        query = query.eq('channel', channelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!tenantId,
  });

  const stats = {
    total: conversations?.length ?? 0,
    unread: conversations?.filter(c => c.unread_count > 0).length ?? 0,
    active: conversations?.filter(c => c.status === 'active').length ?? 0,
    pending: conversations?.filter(c => c.status === 'pending').length ?? 0,
    escalated: conversations?.filter(c => c.status === 'escalated').length ?? 0,
    resolved: conversations?.filter(c => c.status === 'resolved').length ?? 0,
  };

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
    },
  });

  return {
    conversations: conversations ?? [],
    isLoading,
    error,
    refetch,
    markAsRead,
    updateStatus,
    stats,
  };
}

export function useConversationMessages(conversationId?: string, customerId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'staff',
          sender_name: 'Staff',
          content,
          metadata: {},
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
    },
  });

  return {
    messages: messages ?? [],
    isLoading,
    sendMessage,
  };
}
