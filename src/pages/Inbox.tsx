import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useEffect, useCallback } from "react";

export interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  channel: "whatsapp" | "instagram" | "facebook" | "email" | "voice" | "webchat" | "linkedin" | "twitter" | "telegram";
  status: "active" | "resolved" | "pending" | "escalated";
  last_message: string;
  last_message_at: string;
  unread_count: number;
  assigned_to: string | null;
  assigned_name: string | null;
  handler_type: "ai" | "staff" | "manager";
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: "inbound" | "outbound";
  content: string;
  content_type: "text" | "image" | "audio" | "video" | "document" | "location";
  sender_name: string;
  sender_type: "customer" | "agent" | "ai" | "system";
  channel: string;
  status: "sent" | "delivered" | "read" | "failed";
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useInbox(channelFilter?: string) {
  const { tenantId, userRole } = useTenant();
  const queryClient = useQueryClient();

  // Main conversations query
  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inbox-conversations", tenantId, channelFilter],
    queryFn: async () => {
      if (!tenantId) return [];

      // First try the conversations table
      let query = supabase
        .from("conversations")
        .select(
          `
          id,
          tenant_id,
          customer_id,
          customer_name,
          customer_phone,
          customer_email,
          channel,
          status,
          last_message,
          last_message_at,
          unread_count,
          assigned_to,
          handler_type,
          tags,
          metadata,
          created_at,
          customer:customers!customer_id(name, phone_number, email)
        `,
        )
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);

      if (channelFilter && channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }

      const { data: convData, error: convError } = await query;

      if (convError) {
        console.error("Conversations query error:", convError);

        // Fallback: Build conversations from customers + messages tables
        const { data: customers, error: custError } = await supabase
          .from("customers")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("last_interaction", { ascending: false })
          .limit(100);

        if (custError) {
          console.error("Customers fallback error:", custError);
          return [];
        }

        // Transform customers to conversation format
        return (customers || []).map((c: any) => ({
          id: c.id,
          tenant_id: c.tenant_id,
          customer_id: c.id,
          customer_name: c.name || c.phone_number || "Unknown Customer",
          customer_phone: c.phone_number || "",
          customer_email: c.email,
          channel: c.last_platform || c.source || "whatsapp",
          status: "active" as const,
          last_message: c.notes || "Start a conversation",
          last_message_at: c.last_interaction || c.updated_at || c.created_at,
          unread_count: 0,
          assigned_to: c.assigned_to || null,
          assigned_name: null,
          handler_type: c.handler_type || "ai",
          tags: c.tags || [],
          metadata: c.metadata || {},
          created_at: c.created_at,
        })) as Conversation[];
      }

      // Transform conversation data
      return (convData || []).map((c: any) => ({
        id: c.id,
        tenant_id: c.tenant_id,
        customer_id: c.customer_id || c.id,
        customer_name: c.customer?.name || c.customer_name || "Unknown Customer",
        customer_phone: c.customer?.phone_number || c.customer_phone || "",
        customer_email: c.customer?.email || c.customer_email,
        channel: c.channel || "whatsapp",
        status: c.status || "active",
        last_message: c.last_message || "",
        last_message_at: c.last_message_at || c.updated_at || c.created_at,
        unread_count: c.unread_count || 0,
        assigned_to: c.assigned_to,
        assigned_name: null,
        handler_type: c.handler_type || "ai",
        tags: c.tags || [],
        metadata: c.metadata || {},
        created_at: c.created_at,
      })) as Conversation[];
    },
    enabled: !!tenantId,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`inbox-realtime-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log("Conversation update:", payload);
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customers",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log("New customer:", payload);
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Mark conversation as read
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

  // Update conversation status
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

  // Assign conversation
  const assignConversation = useMutation({
    mutationFn: async ({ id, assignTo, handlerType }: { id: string; assignTo: string | null; handlerType: string }) => {
      const { error } = await supabase
        .from("conversations")
        .update({
          assigned_to: assignTo,
          handler_type: handlerType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
    },
  });

  // Get statistics
  const stats = {
    total: conversations?.length || 0,
    unread: conversations?.filter((c) => c.unread_count > 0).length || 0,
    active: conversations?.filter((c) => c.status === "active").length || 0,
    pending: conversations?.filter((c) => c.status === "pending").length || 0,
    escalated: conversations?.filter((c) => c.status === "escalated").length || 0,
  };

  return {
    conversations: conversations ?? [],
    isLoading,
    error,
    refetch,
    markAsRead,
    updateStatus,
    assignConversation,
    stats,
  };
}

// Hook for individual conversation messages
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
    queryFn: async () => {
      if (!conversationId && !customerId) return [];

      // Try messages table first
      let query = supabase
        .from("messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data: msgData, error: msgError } = await query;

      if (msgError || !msgData || msgData.length === 0) {
        // Fallback: try to get from conversations table (older format)
        const lookupId = customerId || conversationId;

        const { data: convMsgs, error: convError } = await supabase
          .from("conversations")
          .select("*")
          .eq("tenant_id", tenantId)
          .or(`customer_id.eq.${lookupId},id.eq.${lookupId}`)
          .order("created_at", { ascending: true });

        if (convError || !convMsgs) return [];

        // Transform to message format
        return convMsgs.map((c: any) => ({
          id: c.id,
          conversation_id: conversationId || c.id,
          tenant_id: c.tenant_id,
          direction: c.direction || "inbound",
          content: c.content || c.message || c.last_message || "",
          content_type: c.content_type || "text",
          sender_name: c.direction === "outbound" ? "AI Assistant" : c.customer_name || "Customer",
          sender_type: c.direction === "outbound" ? "ai" : "customer",
          channel: c.channel || "whatsapp",
          status: "delivered",
          metadata: c.metadata || {},
          created_at: c.created_at,
        })) as Message[];
      }

      return msgData as Message[];
    },
    enabled: !!(conversationId || customerId) && !!tenantId,
    refetchInterval: 5000, // More frequent for active chat
  });

  // Real-time subscription for this conversation
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

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({ content, contentType = "text" }: { content: string; contentType?: string }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          direction: "outbound",
          content,
          content_type: contentType,
          sender_type: "agent",
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
    messages: messages ?? [],
    isLoading,
    error,
    refetch,
    sendMessage,
  };
}

export default useInbox;
