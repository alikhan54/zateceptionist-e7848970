import { useState, useEffect, useRef, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';

// Components
import { EnhancedConversationList } from '@/components/inbox/EnhancedConversationList';
import { ConversationHeader } from '@/components/inbox/ConversationHeader';
import { ChatBubble, DateSeparator, TypingIndicator } from '@/components/inbox/ChatBubble';
import { MessageInput } from '@/components/inbox/MessageInput';
import { CustomerDetailsPanel } from '@/components/inbox/CustomerDetailsPanel';

interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  channel: string;
  status: string;
  handler_type: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: string;
  content: string;
  content_type: string;
  sender_name: string | null;
  sender_type: string;
  channel: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function InboxPage() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newMessageBanner, setNewMessageBanner] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inbox-conversations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!selectedConversation?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`inbox-realtime-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });

          // Show new message banner if message is in a different conversation
          if (
            payload.eventType === 'UPDATE' &&
            payload.new &&
            (payload.new as Conversation).id !== selectedConversation?.id &&
            (payload.new as Conversation).unread_count > 0
          ) {
            const newConv = payload.new as Conversation;
            setNewMessageBanner(
              `New message from ${newConv.customer_name || 'Unknown'}`
            );
            setTimeout(() => setNewMessageBanner(null), 5000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          if (selectedConversation?.id) {
            queryClient.invalidateQueries({
              queryKey: ['conversation-messages', selectedConversation.id],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, selectedConversation?.id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mutations
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
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
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
      toast({ title: 'Status updated' });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !tenantId) throw new Error('No conversation');

      setIsTyping(true);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          tenant_id: tenantId,
          direction: 'outbound',
          content,
          content_type: 'text',
          sender_type: 'agent',
          sender_name: authUser?.full_name || authUser?.email || 'Agent',
          channel: selectedConversation.channel,
          status: 'sent',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', selectedConversation.id);

      return data;
    },
    onSuccess: () => {
      setIsTyping(false);
      queryClient.invalidateQueries({
        queryKey: ['conversation-messages', selectedConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      markAsRead.mutate(conv.id);
    }
  };

  const handleResolve = () => {
    if (selectedConversation) {
      updateStatus.mutate({ id: selectedConversation.id, status: 'resolved' });
    }
  };

  const handleEscalate = () => {
    if (selectedConversation) {
      updateStatus.mutate({ id: selectedConversation.id, status: 'escalated' });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  // Calculate stats
  const stats = {
    total: conversations.length,
    unread: conversations.filter((c) => c.unread_count > 0).length,
    active: conversations.filter((c) => c.status === 'active').length,
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <MessageSquare className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load conversations</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* New Message Banner */}
      {newMessageBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <Button
            variant="secondary"
            size="sm"
            className="shadow-lg"
            onClick={() => setNewMessageBanner(null)}
          >
            {newMessageBanner}
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} conversations • {stats.unread} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Conversation List (30%) */}
        <div className="w-[30%] min-w-[280px] max-w-[400px]">
          <EnhancedConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onRefresh={() => refetch()}
            isLoading={isLoading}
          />
        </div>

        {/* Center: Message Thread (50%) */}
        <div className="flex-1 flex flex-col min-w-0 border-r">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <ConversationHeader
                conversation={selectedConversation}
                onResolve={handleResolve}
                onEscalate={handleEscalate}
                onCreateTask={() => toast({ title: 'Create task feature coming soon' })}
                onSetSource={(source) => toast({ title: `Source set to ${source}` })}
                onAssignStaff={(id) => toast({ title: 'Staff assigned' })}
                onMarkAIHandled={() => toast({ title: 'Marked as AI handled' })}
                onToggleStar={() => toast({ title: 'Star toggled' })}
                onMarkUnread={() => toast({ title: 'Marked as unread' })}
                onViewProfile={() => toast({ title: 'View profile' })}
                onBlockCustomer={() => toast({ title: 'Block feature coming soon' })}
                onToggleDetails={() => setShowDetails(!showDetails)}
                showDetails={showDetails}
              />

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation below</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messageGroups.map((group, groupIndex) => (
                      <div key={group.date}>
                        <DateSeparator date={group.date} />
                        <div className="space-y-2">
                          {group.messages.map((message, msgIndex) => {
                            const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : null;
                            const nextMsg =
                              msgIndex < group.messages.length - 1
                                ? group.messages[msgIndex + 1]
                                : null;

                            const isFirstInGroup =
                              !prevMsg ||
                              prevMsg.direction !== message.direction ||
                              prevMsg.sender_type !== message.sender_type;

                            const isLastInGroup =
                              !nextMsg ||
                              nextMsg.direction !== message.direction ||
                              nextMsg.sender_type !== message.sender_type;

                            return (
                              <ChatBubble
                                key={message.id}
                                content={message.content}
                                direction={message.direction as 'inbound' | 'outbound'}
                                senderType={
                                  message.sender_type as 'customer' | 'agent' | 'ai'
                                }
                                senderName={message.sender_name}
                                timestamp={message.created_at}
                                status={message.status as any}
                                isFirstInGroup={isFirstInGroup}
                                isLastInGroup={isLastInGroup}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {isTyping && <TypingIndicator senderName="AI" />}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <MessageInput
                onSend={(msg) => sendMessage.mutate(msg)}
                disabled={sendMessage.isPending}
                isSending={sendMessage.isPending}
                quickReplies={[
                  "Thank you for reaching out! How can I help you today?",
                  "I'll look into this and get back to you shortly.",
                  "Would you like to schedule an appointment?",
                ]}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm mt-1">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>

        {/* Right: Customer Details (20%) */}
        {showDetails && (
          <div className="w-[20%] min-w-[250px] max-w-[350px]">
            <CustomerDetailsPanel
              customer={
                selectedConversation
                  ? {
                      id: selectedConversation.customer_id || selectedConversation.id,
                      name: selectedConversation.customer_name,
                      phone: selectedConversation.customer_phone,
                      email: selectedConversation.customer_email,
                      channel: selectedConversation.channel,
                      tags: selectedConversation.tags,
                      temperature: 'warm',
                      created_at: selectedConversation.created_at,
                    }
                  : null
              }
              onClose={() => setShowDetails(false)}
              onViewProfile={() =>
                toast({ title: 'View full profile feature coming soon' })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
