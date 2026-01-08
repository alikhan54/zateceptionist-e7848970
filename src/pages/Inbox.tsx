import { useState, useEffect, useRef } from "react";
import { useInbox, useConversationMessages, Conversation, Message } from "@/hooks/useInbox";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Video,
  MoreVertical,
  RefreshCw,
  Filter,
  Star,
  Archive,
  Loader2,
  Inbox as InboxIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Bot,
  UserCheck,
  ArrowLeft,
  Paperclip,
  Smile,
  Mic,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// Channel icons mapping
const CHANNEL_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  whatsapp: { icon: <MessageSquare className="h-4 w-4" />, color: "text-green-500 bg-green-50" },
  instagram: { icon: <Instagram className="h-4 w-4" />, color: "text-pink-500 bg-pink-50" },
  facebook: { icon: <Facebook className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
  email: { icon: <Mail className="h-4 w-4" />, color: "text-gray-500 bg-gray-50" },
  voice: { icon: <Phone className="h-4 w-4" />, color: "text-purple-500 bg-purple-50" },
  webchat: { icon: <MessageSquare className="h-4 w-4" />, color: "text-cyan-500 bg-cyan-50" },
  linkedin: { icon: <Linkedin className="h-4 w-4" />, color: "text-blue-700 bg-blue-50" },
  twitter: { icon: <Twitter className="h-4 w-4" />, color: "text-sky-500 bg-sky-50" },
  telegram: { icon: <Send className="h-4 w-4" />, color: "text-blue-400 bg-blue-50" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  active: { color: "bg-green-500", label: "Active", icon: <CheckCircle className="h-3 w-3" /> },
  pending: { color: "bg-yellow-500", label: "Pending", icon: <Clock className="h-3 w-3" /> },
  resolved: { color: "bg-gray-400", label: "Resolved", icon: <Archive className="h-3 w-3" /> },
  escalated: { color: "bg-red-500", label: "Escalated", icon: <AlertCircle className="h-3 w-3" /> },
};

const HANDLER_ICONS: Record<string, React.ReactNode> = {
  ai: <Bot className="h-3 w-3 text-purple-500" />,
  staff: <User className="h-3 w-3 text-blue-500" />,
  manager: <UserCheck className="h-3 w-3 text-green-500" />,
};

export default function Inbox() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();

  // State
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [messageInput, setMessageInput] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { conversations, isLoading, error, refetch, markAsRead, updateStatus, stats } = useInbox(
    channelFilter !== "all" ? channelFilter : undefined,
  );

  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
  } = useConversationMessages(selectedConversation?.id, selectedConversation?.customer_id);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation && !isMobileView) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation, isMobileView]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConversation && selectedConversation.unread_count > 0) {
      markAsRead.mutate(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer_phone.includes(searchQuery) ||
      conv.last_message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      await sendMessage.mutateAsync({ content: messageInput });
      setMessageInput("");
      toast({ title: "Message sent" });
    } catch (err) {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  };

  const handleStatusChange = async (conversationId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: conversationId, status: newStatus });
      toast({ title: `Conversation marked as ${newStatus}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  const getChannelIcon = (channel: string) => {
    return CHANNEL_ICONS[channel] || CHANNEL_ICONS.whatsapp;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Failed to load inbox</h3>
          <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Manage conversations from all channels</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-500">{stats.unread}</div>
          <div className="text-xs text-muted-foreground">Unread</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-500">{stats.active}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-500">{stats.escalated}</div>
          <div className="text-xs text-muted-foreground">Escalated</div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-280px)] gap-4">
        {/* Conversations List */}
        <Card className={`${selectedConversation && isMobileView ? "hidden" : "flex"} w-full md:w-96 flex-col`}>
          <CardHeader className="pb-2 space-y-3">
            {/* Channel Tabs */}
            <Tabs value={channelFilter} onValueChange={setChannelFilter}>
              <TabsList className="grid grid-cols-5 h-9">
                <TabsTrigger value="all" className="text-xs px-2">
                  All
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs px-2">
                  <MessageSquare className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="email" className="text-xs px-2">
                  <Mail className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="instagram" className="text-xs px-2">
                  <Instagram className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="facebook" className="text-xs px-2">
                  <Facebook className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-9">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <InboxIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No conversations</p>
                  <p className="text-sm">Messages will appear here when customers contact you</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const channelConfig = getChannelIcon(conv.channel);
                  const statusConfig = STATUS_CONFIG[conv.status];

                  return (
                    <div
                      key={conv.id}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-muted border-l-2 border-l-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedConversation(conv);
                        setIsMobileView(true);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs">{getInitials(conv.customer_name)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${channelConfig.color}`}>
                            {channelConfig.icon}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{conv.customer_name}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(conv.last_message_at || conv.created_at), {
                                addSuffix: false,
                              })}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {conv.last_message || "No messages yet"}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5">
                            <div className={`h-2 w-2 rounded-full ${statusConfig.color}`} />
                            <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
                            {HANDLER_ICONS[conv.handler_type]}
                            {conv.unread_count > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs ml-auto">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className={`${!selectedConversation && isMobileView ? "hidden" : "flex"} flex-1 flex-col`}>
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobileView && (
                      <Button variant="ghost" size="icon" onClick={() => setIsMobileView(false)}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(selectedConversation.customer_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{selectedConversation.customer_name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className={`p-1 rounded ${getChannelIcon(selectedConversation.channel).color}`}>
                          {getChannelIcon(selectedConversation.channel).icon}
                        </span>
                        <span>{selectedConversation.customer_phone || selectedConversation.customer_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedConversation.status}
                      onValueChange={(v) => handleStatusChange(selectedConversation.id, v)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="escalated">Escalate</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Star className="h-4 w-4 mr-2" /> Star conversation
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" /> View customer profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation below</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, idx) => {
                        const isOutbound = msg.direction === "outbound";
                        const showDate =
                          idx === 0 ||
                          format(new Date(messages[idx - 1].created_at), "yyyy-MM-dd") !==
                            format(new Date(msg.created_at), "yyyy-MM-dd");

                        return (
                          <div key={msg.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                  {format(new Date(msg.created_at), "MMMM d, yyyy")}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[75%] ${isOutbound ? "order-2" : ""}`}>
                                <div
                                  className={`rounded-2xl px-4 py-2 ${
                                    isOutbound
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-muted rounded-bl-md"
                                  }`}
                                >
                                  {msg.sender_type !== "customer" && (
                                    <div className="flex items-center gap-1 mb-1">
                                      {msg.sender_type === "ai" ? (
                                        <Bot className="h-3 w-3" />
                                      ) : (
                                        <User className="h-3 w-3" />
                                      )}
                                      <span className="text-xs opacity-70">{msg.sender_name}</span>
                                    </div>
                                  )}
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : ""}`}>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(msg.created_at), "h:mm a")}
                                  </span>
                                  {isOutbound && msg.status === "delivered" && (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[40px] max-h-32 resize-none"
                    rows={1}
                  />
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessage.isPending}
                    className="h-9 shrink-0"
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose from your inbox to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
