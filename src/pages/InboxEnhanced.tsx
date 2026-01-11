import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RefreshCw, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { EnhancedConversationList } from "@/components/inbox/EnhancedConversationList";
import { ConversationHeader } from "@/components/inbox/ConversationHeader";
import { ChatBubble, DateSeparator, TypingIndicator } from "@/components/inbox/ChatBubble";
import { MessageInput } from "@/components/inbox/MessageInput";
import { CustomerDetailsPanel } from "@/components/inbox/CustomerDetailsPanel";

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
  message_count: number;
  tags: string[];
  marketing_source: string | null;
  assigned_to: string | null;
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

interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  due_date: string;
}

export default function InboxPage() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newMessageBanner, setNewMessageBanner] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Task Dialog State
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  // Staff for assignment
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  // Fetch staff list
  useEffect(() => {
    if (!tenantId) return;
    const fetchStaff = async () => {
      const { data } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantId);
      if (data) {
        setStaffList(data.map((u) => ({ id: u.id, name: u.full_name || u.email || "Staff" })));
      }
    };
    fetchStaff();
  }, [tenantId]);

  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inbox-conversations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Conversation[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["conversation-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!selectedConversation?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`inbox-realtime-${tenantId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
          if (
            payload.eventType === "UPDATE" &&
            payload.new &&
            (payload.new as Conversation).id !== selectedConversation?.id &&
            (payload.new as Conversation).unread_count > 0
          ) {
            const newConv = payload.new as Conversation;
            setNewMessageBanner(`New message from ${newConv.customer_name || newConv.customer_phone || "Unknown"}`);
            setTimeout(() => setNewMessageBanner(null), 5000);
          }
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (
          selectedConversation?.id &&
          payload.new &&
          (payload.new as Message).conversation_id === selectedConversation.id
        ) {
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation.id] });
        }
        queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, selectedConversation?.id, queryClient]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

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

  const updateConversation = useMutation({
    mutationFn: async (updates: Partial<Conversation> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from("conversations")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
      toast({ title: "Updated successfully" });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const createTask = useMutation({
    mutationFn: async (data: TaskFormData) => {
      if (!selectedConversation || !tenantId) throw new Error("No conversation selected");
      const taskData: Record<string, any> = {
        tenant_id: tenantId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date || null,
        status: "pending",
        type: "follow_up",
        assigned_to: authUser?.id,
        assigned_type: "staff",
        source: "inbox",
        auto_generated: false,
      };
      // Only add these if columns exist
      if (selectedConversation.customer_id) {
        taskData.customer_id = selectedConversation.customer_id;
      }
      const { error } = await supabase.from("tasks").insert(taskData);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowTaskDialog(false);
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task created", description: "Task added to your task list" });
    },
    onError: (err) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !tenantId) throw new Error("No conversation");
      setIsTyping(true);
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          tenant_id: tenantId,
          direction: "outbound",
          content,
          content_type: "text",
          sender_type: "agent",
          sender_name: authUser?.full_name || authUser?.email || "Agent",
          channel: selectedConversation.channel,
          status: "sent",
        })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("conversations")
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
      return data;
    },
    onSuccess: () => {
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations", tenantId] });
    },
    onError: (error) => {
      setIsTyping(false);
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      markAsRead.mutate(conv.id);
    }
  };

  // ACTION HANDLERS - All save to database
  const handleResolve = () => {
    if (selectedConversation) {
      updateConversation.mutate({ id: selectedConversation.id, status: "resolved" });
    }
  };

  const handleEscalate = () => {
    if (selectedConversation) {
      updateConversation.mutate({ id: selectedConversation.id, status: "escalated", handler_type: "staff" });
    }
  };

  const handleCreateTask = () => {
    if (selectedConversation) {
      setTaskForm({
        title: `Follow up with ${selectedConversation.customer_name || selectedConversation.customer_phone || "Customer"}`,
        description: `Follow up on conversation from ${selectedConversation.channel}`,
        priority: "medium",
        due_date: format(new Date(Date.now() + 86400000), "yyyy-MM-dd"), // Tomorrow
      });
      setShowTaskDialog(true);
    }
  };

  const handleSetSource = (source: string) => {
    if (selectedConversation) {
      updateConversation.mutate({ id: selectedConversation.id, marketing_source: source } as any);
      // Also update customer if exists
      if (selectedConversation.customer_id) {
        supabase.from("customers").update({ source }).eq("id", selectedConversation.customer_id);
      }
    }
  };

  const handleAssignStaff = (staffId: string) => {
    if (selectedConversation) {
      updateConversation.mutate({ id: selectedConversation.id, assigned_to: staffId, handler_type: "staff" } as any);
    }
  };

  const handleMarkAIHandled = () => {
    if (selectedConversation) {
      updateConversation.mutate({ id: selectedConversation.id, handler_type: "ai", assigned_to: null } as any);
    }
  };

  const handleToggleStar = () => {
    if (selectedConversation) {
      const currentTags = selectedConversation.tags || [];
      const newTags = currentTags.includes("starred")
        ? currentTags.filter((t) => t !== "starred")
        : [...currentTags, "starred"];
      updateConversation.mutate({ id: selectedConversation.id, tags: newTags } as any);
    }
  };

  const handleMarkUnread = () => {
    if (selectedConversation) {
      updateConversation.mutate({ id: selectedConversation.id, unread_count: 1 } as any);
    }
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), "yyyy-MM-dd");
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
  const stats = { total: conversations.length, unread: conversations.filter((c) => c.unread_count > 0).length };

  const getCustomerDisplayName = (conv: Conversation) => {
    if (
      conv.customer_name &&
      conv.customer_name !== "Facebook User" &&
      conv.customer_name !== "Instagram User" &&
      conv.customer_name !== conv.customer_phone
    ) {
      return conv.customer_name;
    }
    const phone = conv.customer_phone || "Unknown";
    return phone.length > 10 ? `${phone.slice(0, 6)}...${phone.slice(-4)}` : phone;
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
      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Task description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createTask.mutate(taskForm)} disabled={!taskForm.title || createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {newMessageBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <Button variant="secondary" size="sm" className="shadow-lg" onClick={() => setNewMessageBanner(null)}>
            {newMessageBanner}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} conversations • {stats.unread} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[30%] min-w-[280px] max-w-[400px] border-r">
          <EnhancedConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            onRefresh={() => refetch()}
            isLoading={isLoading}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 border-r">
          {selectedConversation ? (
            <>
              <ConversationHeader
                conversation={selectedConversation}
                onResolve={handleResolve}
                onEscalate={handleEscalate}
                onCreateTask={handleCreateTask}
                onSetSource={handleSetSource}
                onAssignStaff={handleAssignStaff}
                onMarkAIHandled={handleMarkAIHandled}
                onToggleStar={handleToggleStar}
                onMarkUnread={handleMarkUnread}
                onViewProfile={() => window.open(`/customers?id=${selectedConversation.customer_id}`, "_blank")}
                onBlockCustomer={() => toast({ title: "Block feature coming soon" })}
                onToggleDetails={() => setShowDetails(!showDetails)}
                showDetails={showDetails}
              />
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
                    {messageGroups.map((group) => (
                      <div key={group.date}>
                        <DateSeparator date={group.date} />
                        <div className="space-y-2">
                          {group.messages.map((message, msgIndex) => {
                            const prevMsg = msgIndex > 0 ? group.messages[msgIndex - 1] : null;
                            const nextMsg = msgIndex < group.messages.length - 1 ? group.messages[msgIndex + 1] : null;
                            const isFirstInGroup = !prevMsg || prevMsg.direction !== message.direction;
                            const isLastInGroup = !nextMsg || nextMsg.direction !== message.direction;
                            return (
                              <ChatBubble
                                key={message.id}
                                content={message.content}
                                direction={message.direction as "inbound" | "outbound"}
                                senderType={message.sender_type as "customer" | "agent" | "ai"}
                                senderName={
                                  message.sender_name ||
                                  (message.direction === "inbound"
                                    ? getCustomerDisplayName(selectedConversation)
                                    : "AI")
                                }
                                timestamp={message.created_at}
                                status={message.status as "sent" | "delivered" | "read" | "failed"}
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
              <MessageInput
                onSend={(msg) => sendMessage.mutate(msg)}
                disabled={sendMessage.isPending}
                isSending={sendMessage.isPending}
                quickReplies={[
                  "Thank you for reaching out!",
                  "I'll look into this.",
                  "Would you like to schedule an appointment?",
                ]}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm mt-1">Choose a conversation from the list to start messaging</p>
            </div>
          )}
        </div>

        {showDetails && selectedConversation && (
          <div className="w-[20%] min-w-[250px] max-w-[350px]">
            <CustomerDetailsPanel
              customer={{
                id: selectedConversation.customer_id || selectedConversation.id,
                name: getCustomerDisplayName(selectedConversation),
                phone: selectedConversation.customer_phone,
                email: selectedConversation.customer_email,
                channel: selectedConversation.channel,
                tags: selectedConversation.tags || [],
                temperature: "warm",
                created_at: selectedConversation.created_at,
              }}
              onClose={() => setShowDetails(false)}
              onViewProfile={() => window.open(`/customers?id=${selectedConversation.customer_id}`, "_blank")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
