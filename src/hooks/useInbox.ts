// ============================================
// FILE: src/hooks/useInbox.ts
// PURPOSE: Fetch REAL conversation data from database
// FIXED: Compatible with existing codebase structure
// ============================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  channel: string;
  status: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  assigned_to: string | null;
  handler_type: string;
  tags: string[];
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: string;
  content: string;
  content_type: string;
  sender_name: string;
  sender_type: string;
  channel: string;
  status: string;
  created_at: string;
}

export function useInbox(channelFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inbox-conversations", tenantId, channelFilter],
    queryFn: async (): Promise<Conversation[]> => {
      if (!tenantId) return [];

      // Try conversations table first
      let query = supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);

      if (channelFilter && channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }

      const { data: convData, error: convError } = await query;

      if (!convError && convData && convData.length > 0) {
        return convData.map((c: any) => ({
          id: c.id || "",
          tenant_id: c.tenant_id || "",
          customer_id: c.customer_id || c.id || "",
          customer_name: String(c.customer_name || "Unknown Customer"),
          customer_phone: String(c.customer_phone || c.phone || ""),
          customer_email: c.customer_email || c.email || null,
          channel: String(c.channel || "whatsapp"),
          status: String(c.status || "active"),
          last_message: String(c.last_message || ""),
          last_message_at: c.last_message_at || c.updated_at || c.created_at || new Date().toISOString(),
          unread_count: Number(c.unread_count) || 0,
          assigned_to: c.assigned_to || null,
          handler_type: String(c.handler_type || "ai"),
          tags: Array.isArray(c.tags) ? c.tags : [],
          created_at: c.created_at || new Date().toISOString(),
        }));
      }

      // Fallback: Build from customers table
      const { data: customers, error: custError } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_interaction", { ascending: false, nullsFirst: false })
        .limit(100);

      if (custError || !customers) {
        console.error("Failed to fetch customers:", custError);
        return [];
      }

      return customers.map((c: any) => ({
        id: c.id || "",
        tenant_id: c.tenant_id || "",
        customer_id: c.id || "",
        customer_name: String(c.name || c.phone_number || "Unknown Customer"),
        customer_phone: String(c.phone_number || ""),
        customer_email: c.email || null,
        channel: String(c.last_platform || c.source || "whatsapp"),
        status: "active",
        last_message: String(c.notes || "Start a conversation"),
        last_message_at: c.last_interaction || c.updated_at || c.created_at || new Date().toISOString(),
        unread_count: 0,
        assigned_to: c.assigned_to || null,
        handler_type: String(c.handler_type || "ai"),
        tags: Array.isArray(c.tags) ? c.tags : [],
        created_at: c.created_at || new Date().toISOString(),
      }));
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`inbox-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
    },
  });

  const stats = {
    total: conversations?.length || 0,
    unread: conversations?.filter((c) => c.unread_count > 0).length || 0,
    active: conversations?.filter((c) => c.status === "active").length || 0,
    pending: conversations?.filter((c) => c.status === "pending").length || 0,
    escalated: conversations?.filter((c) => c.status === "escalated").length || 0,
  };

  return {
    conversations: conversations || [],
    isLoading,
    error,
    refetch,
    markAsRead,
    updateStatus,
    stats,
  };
}

export function useConversationMessages(conversationId: string | undefined, customerId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const {
    data: messages,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["conversation-messages", conversationId, customerId],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId && !customerId) return [];
      if (!tenantId) return [];

      // Try messages table
      const { data: msgData, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("conversation_id", conversationId || customerId)
        .order("created_at", { ascending: true });

      if (!msgError && msgData && msgData.length > 0) {
        return msgData.map((m: any) => ({
          id: m.id || "",
          conversation_id: m.conversation_id || "",
          tenant_id: m.tenant_id || "",
          direction: String(m.direction || "inbound"),
          content: String(m.content || m.message || ""),
          content_type: String(m.content_type || "text"),
          sender_name: String(m.sender_name || (m.direction === "outbound" ? "AI" : "Customer")),
          sender_type: String(m.sender_type || (m.direction === "outbound" ? "ai" : "customer")),
          channel: String(m.channel || "whatsapp"),
          status: String(m.status || "delivered"),
          created_at: m.created_at || new Date().toISOString(),
        }));
      }

      return [];
    },
    enabled: !!(conversationId || customerId) && !!tenantId,
    refetchInterval: 5000,
  });

  // Real-time for messages
  useEffect(() => {
    if (!conversationId || !tenantId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, tenantId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, contentType = "text" }: { content: string; contentType?: string }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          direction: "outbound",
          content: content,
          content_type: contentType,
          sender_type: "agent",
          sender_name: "Agent",
          channel: "webchat",
          status: "sent",
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last_message
      await supabase
        .from("conversations")
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
    },
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    refetch,
    sendMessage,
  };
}

export default useInbox;
