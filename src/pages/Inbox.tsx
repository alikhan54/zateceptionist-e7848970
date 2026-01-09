import { useState, useEffect, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Mail, 
  Search,
  Phone,
  PhoneCall,
  Globe,
  Send,
  RefreshCw,
  CheckSquare,
  Clock,
  Archive,
  AlertCircle,
  Bot,
  User,
  UserCheck,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Complete channel configuration
const CHANNELS = [
  { id: 'all', label: 'All', icon: MessageSquare, color: 'text-foreground' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-500' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'text-foreground' },
  { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-sky-400' },
  { id: 'sms', label: 'SMS', icon: Phone, color: 'text-purple-500' },
  { id: 'voice', label: 'Voice Calls', icon: PhoneCall, color: 'text-orange-500' },
  { id: 'web', label: 'Website Chat', icon: Globe, color: 'text-muted-foreground' },
];

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  active: { color: 'bg-green-500', label: 'Active', icon: <MessageSquare className="h-3 w-3" /> },
  pending: { color: 'bg-yellow-500', label: 'Pending', icon: <Clock className="h-3 w-3" /> },
  resolved: { color: 'bg-gray-400', label: 'Resolved', icon: <Archive className="h-3 w-3" /> },
  escalated: { color: 'bg-red-500', label: 'Escalated', icon: <AlertCircle className="h-3 w-3" /> },
};

const HANDLER_ICONS: Record<string, React.ReactNode> = {
  ai: <Bot className="h-3 w-3 text-purple-500" />,
  staff: <User className="h-3 w-3 text-blue-500" />,
  manager: <UserCheck className="h-3 w-3 text-green-500" />,
};

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

export default function Inbox() {
  const { tenantId, tenantConfig } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations from database
  const { data: conversations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['inbox-conversations', tenantId, channelFilter, statusFilter],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      return (data || []) as Conversation[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
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
      .channel(`inbox-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
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
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversation.id] });
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

  // Mark as read mutation
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

  // Update status mutation
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
      toast({ title: 'Status updated successfully' });
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !tenantId) throw new Error('No conversation selected');

      const newMessage = {
        conversation_id: selectedConversation.id,
        tenant_id: tenantId,
        direction: 'outbound',
        content: content,
        content_type: 'text',
        sender_type: 'agent',
        sender_name: authUser?.name || 'Agent',
        channel: selectedConversation.channel,
        status: 'sent',
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) throw error;

      // Update conversation last_message
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
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
      setMessageInput('');
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (conversation.unread_count > 0) {
      markAsRead.mutate(conversation.id);
    }
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessage.mutate(messageInput);
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      !searchQuery ||
      conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer_phone?.includes(searchQuery) ||
      conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: conversations.length,
    unread: conversations.filter(c => c.unread_count > 0).length,
    active: conversations.filter(c => c.status === 'active').length,
    pending: conversations.filter(c => c.status === 'pending').length,
    escalated: conversations.filter(c => c.status === 'escalated').length,
  };

  // Get channel info
  const getChannelInfo = (channelId: string) => {
    return CHANNELS.find(c => c.id === channelId) || CHANNELS[0];
  };

  // Get initials
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load conversations</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground mt-1">
            Manage conversations from all channels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <CheckSquare className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.unread}</div>
            <div className="text-sm text-muted-foreground">Unread</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats.escalated}</div>
            <div className="text-sm text-muted-foreground">Escalated</div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Filter Tabs */}
      <ScrollArea className="w-full whitespace-nowrap">
        <Tabs value={channelFilter} onValueChange={setChannelFilter}>
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1">
            {CHANNELS.map((channel) => (
              <TabsTrigger 
                key={channel.id} 
                value={channel.id}
                className="gap-2 data-[state=active]:bg-background"
              >
                <channel.icon className={cn("h-4 w-4", channel.color)} />
                <span className="hidden sm:inline">{channel.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium">No conversations</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Messages will appear here when customers contact you
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const channelInfo = getChannelInfo(conv.channel);
                    const statusInfo = STATUS_CONFIG[conv.status] || STATUS_CONFIG.active;
                    const isSelected = selectedConversation?.id === conv.id;
                    
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={cn(
                          "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                          isSelected && "bg-muted/50 border-l-2 border-primary",
                          conv.unread_count > 0 && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm">
                              {getInitials(conv.customer_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "font-medium truncate",
                                  conv.unread_count > 0 && "font-semibold"
                                )}>
                                  {conv.customer_name || conv.customer_phone || 'Unknown'}
                                </p>
                                <channelInfo.icon className={cn("h-3 w-3", channelInfo.color)} />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {conv.last_message_at 
                                  ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                                  : '-'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conv.last_message || 'No messages yet'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {statusInfo.icon}
                                <span className="ml-1">{statusInfo.label}</span>
                              </Badge>
                              {conv.handler_type && HANDLER_ICONS[conv.handler_type]}
                            </div>
                          </div>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-primary">{conv.unread_count}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conversation View */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <div className="flex flex-col h-[550px]">
              {/* Header */}
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(selectedConversation.customer_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {selectedConversation.customer_name || selectedConversation.customer_phone || 'Unknown'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.customer_phone || selectedConversation.customer_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedConversation.status !== 'resolved' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatus.mutate({ 
                          id: selectedConversation.id, 
                          status: 'resolved' 
                        })}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                    {selectedConversation.status !== 'escalated' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatus.mutate({ 
                          id: selectedConversation.id, 
                          status: 'escalated' 
                        })}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Escalate
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === 'outbound' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            msg.direction === 'outbound'
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {msg.sender_name && msg.direction === 'inbound' && (
                            <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            msg.direction === 'outbound' 
                              ? "text-primary-foreground/70" 
                              : "text-muted-foreground"
                          )}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessage.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[550px] text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm">Choose from your inbox to start messaging</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
```

### Also Create/Replace src/hooks/useInbox.ts
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
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

export interface Message {
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

export function useInbox(channel?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ['inbox-conversations', tenantId, channel],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (channel && channel !== 'all') {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const subscription = supabase
      .channel(`inbox-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tenantId, queryClient]);

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
    },
  });

  const stats = {
    total: conversations?.length || 0,
    unread: conversations?.filter(c => c.unread_count > 0).length || 0,
    active: conversations?.filter(c => c.status === 'active').length || 0,
    pending: conversations?.filter(c => c.status === 'pending').length || 0,
    escalated: conversations?.filter(c => c.status === 'escalated').length || 0,
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

export function useConversationMessages(conversationId: string | undefined) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: messages, isLoading, error, refetch } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, contentType = 'text' }: { content: string; contentType?: string }) => {
      if (!conversationId || !tenantId) throw new Error('Missing conversation or tenant');

      const { data: conv } = await supabase
        .from('conversations')
        .select('channel')
        .eq('id', conversationId)
        .single();

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          direction: 'outbound',
          content: content,
          content_type: contentType,
          sender_type: 'agent',
          sender_name: 'Agent',
          channel: conv?.channel || 'whatsapp',
          status: 'sent',
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations', tenantId] });
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