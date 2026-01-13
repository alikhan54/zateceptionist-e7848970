// ============================================================================
// UPDATED INBOX.TSX - Links Conversations to Unified Contacts Table
// Shows contact names instead of just phone numbers
// Follows HubSpot/Salesforce pattern where conversations belong to contacts
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  RefreshCcw,
  Phone,
  Mail,
  MessageSquare,
  Send,
  MoreVertical,
  User,
  Building2,
  Clock,
  CheckCheck,
  Check,
  Bot,
  UserCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Star,
  Archive,
  Trash2,
  Tag,
  Calendar,
  Flame,
  Thermometer,
  Snowflake,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

interface Contact {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  company_name: string | null;
  job_title: string | null;
  lead_score: number;
  lead_grade: string;
  lead_temperature: string;
  pipeline_stage: string;
  avatar_url: string | null;
  tags: string[] | null;
}

interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  channel: string; // whatsapp, instagram, facebook, voice, email, web, telegram
  channel_id: string; // e.g., phone number for WhatsApp
  status: string; // active, closed, archived, spam
  assigned_to: string | null;
  assigned_to_ai: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  // Joined contact data
  contact?: Contact;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  content: string;
  content_type: string; // text, image, audio, video, document
  media_url: string | null;
  sender_type: "contact" | "user" | "ai";
  sender_id: string | null;
  status: string; // sent, delivered, read, failed
  created_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getChannelIcon(channel: string) {
  switch (channel) {
    case "whatsapp":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "instagram":
      return <MessageSquare className="h-4 w-4 text-pink-500" />;
    case "facebook":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "voice":
      return <Phone className="h-4 w-4 text-purple-500" />;
    case "email":
      return <Mail className="h-4 w-4 text-gray-500" />;
    default:
      return <MessageSquare className="h-4 w-4 text-gray-500" />;
  }
}

function getChannelColor(channel: string) {
  switch (channel) {
    case "whatsapp":
      return "bg-green-100 text-green-800";
    case "instagram":
      return "bg-pink-100 text-pink-800";
    case "facebook":
      return "bg-blue-100 text-blue-800";
    case "voice":
      return "bg-purple-100 text-purple-800";
    case "email":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getTemperatureIcon(temp: string | undefined) {
  switch (temp) {
    case "HOT":
      return <Flame className="h-3 w-3 text-red-500" />;
    case "WARM":
      return <Thermometer className="h-3 w-3 text-orange-500" />;
    default:
      return <Snowflake className="h-3 w-3 text-blue-500" />;
  }
}

function formatTime(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function getContactDisplayName(conversation: Conversation): string {
  // Priority: Contact full_name > first_name > channel_id (phone/email)
  if (conversation.contact?.full_name) {
    return conversation.contact.full_name;
  }
  if (conversation.contact?.first_name) {
    const lastName = conversation.contact.last_name || "";
    return `${conversation.contact.first_name} ${lastName}`.trim();
  }
  // Fallback to channel ID (phone number, email, etc.)
  return conversation.channel_id || "Unknown Contact";
}

function getContactInitials(conversation: Conversation): string {
  if (conversation.contact?.first_name && conversation.contact?.last_name) {
    return `${conversation.contact.first_name[0]}${conversation.contact.last_name[0]}`.toUpperCase();
  }
  if (conversation.contact?.first_name) {
    return conversation.contact.first_name.substring(0, 2).toUpperCase();
  }
  // Use channel_id first 2 chars
  if (conversation.channel_id) {
    return conversation.channel_id.replace(/\D/g, "").substring(0, 2) || "??";
  }
  return "??";
}

// ============================================================================
// CONVERSATION LIST ITEM
// ============================================================================

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
}

function ConversationListItem({ conversation, isSelected, onSelect }: ConversationListItemProps) {
  const displayName = getContactDisplayName(conversation);
  const initials = getContactInitials(conversation);

  return (
    <div
      className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b ${
        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
      }`}
      onClick={() => onSelect(conversation)}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            {conversation.contact?.avatar_url ? <AvatarImage src={conversation.contact.avatar_url} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
          </Avatar>
          {/* Channel indicator */}
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
            {getChannelIcon(conversation.channel)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{displayName}</span>
              {conversation.contact?.lead_temperature && getTemperatureIcon(conversation.contact.lead_temperature)}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>

          {/* Company name if available */}
          {conversation.contact?.company_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Building2 className="h-3 w-3" />
              {conversation.contact.company_name}
            </p>
          )}

          {/* Last message preview */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {conversation.last_message_direction === "outbound" && (
                <span className="mr-1">
                  {conversation.assigned_to_ai ? (
                    <Bot className="h-3 w-3 inline text-purple-500" />
                  ) : (
                    <CheckCheck className="h-3 w-3 inline text-blue-500" />
                  )}
                </span>
              )}
              {conversation.last_message_preview || "No messages yet"}
            </p>
            {conversation.unread_count > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs h-5 min-w-5 flex items-center justify-center rounded-full">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 mt-2 ml-13">
        <Badge variant="outline" className={`text-xs ${getChannelColor(conversation.channel)}`}>
          {conversation.channel}
        </Badge>
        {conversation.assigned_to_ai && (
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
            <Bot className="h-3 w-3 mr-1" /> AI
          </Badge>
        )}
        {conversation.status !== "active" && (
          <Badge variant="outline" className="text-xs">
            {conversation.status}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CONTACT INFO SIDEBAR
// ============================================================================

interface ContactInfoSidebarProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}

function ContactInfoSidebar({ contact, open, onClose }: ContactInfoSidebarProps) {
  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[350px]">
        <SheetHeader>
          <SheetTitle>Contact Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {contact.first_name?.[0]}
                {contact.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">
              {contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown"}
            </h3>
            {contact.job_title && contact.company_name && (
              <p className="text-sm text-muted-foreground">
                {contact.job_title} at {contact.company_name}
              </p>
            )}
          </div>

          {/* Lead Score */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold">{contact.lead_score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xl font-bold">Grade {contact.lead_grade}</div>
              <div className="text-xs text-muted-foreground">Quality</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-center">{getTemperatureIcon(contact.lead_temperature)}</div>
              <div className="text-xs text-muted-foreground mt-1">{contact.lead_temperature}</div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="text-sm text-blue-600 hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.whatsapp_number && contact.whatsapp_number !== contact.phone && (
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <span className="text-sm">{contact.whatsapp_number}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.company_name && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{contact.company_name}</span>
              </div>
            )}
          </div>

          {/* Pipeline Stage */}
          <div>
            <h4 className="text-sm font-medium mb-2">Pipeline Stage</h4>
            <Badge className="text-sm">{contact.pipeline_stage}</Badge>
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" /> View in Pipeline
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              <Calendar className="h-4 w-4 mr-2" /> Schedule Meeting
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        {/* Sender indicator for outbound */}
        {isOutbound && (
          <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
            {message.sender_type === "ai" ? (
              <>
                <Bot className="h-3 w-3" /> AI Assistant
              </>
            ) : (
              <>
                <UserCircle className="h-3 w-3" /> You
              </>
            )}
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Timestamp and status */}
        <div
          className={`flex items-center gap-1 mt-1 text-xs ${isOutbound ? "justify-end opacity-70" : "text-muted-foreground"}`}
        >
          <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {isOutbound &&
            (message.status === "read" ? (
              <CheckCheck className="h-3 w-3 text-blue-300" />
            ) : message.status === "delivered" ? (
              <CheckCheck className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN INBOX COMPONENT
// ============================================================================

export default function Inbox() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "ai" | "staff">("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);

  // =====================================================
  // DATA QUERIES
  // =====================================================

  // Fetch conversations with contact join
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["inbox", "conversations", tenantId, filter],
    queryFn: async () => {
      if (!tenantId) return [];

      // First try the new conversations table with contact join
      try {
        let query = supabase
          .from("conversations")
          .select(
            `
            *,
            contact:contacts(
              id, first_name, last_name, full_name, email, phone, whatsapp_number,
              company_name, job_title, lead_score, lead_grade, lead_temperature,
              pipeline_stage, avatar_url, tags
            )
          `,
          )
          .eq("tenant_id", tenantId)
          .order("last_message_at", { ascending: false, nullsFirst: false });

        // Apply filters
        if (filter === "unread") {
          query = query.gt("unread_count", 0);
        } else if (filter === "ai") {
          query = query.eq("assigned_to_ai", true);
        } else if (filter === "staff") {
          query = query.eq("assigned_to_ai", false);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as Conversation[];
      } catch (e) {
        // Fallback: Try the old customers table structure
        console.log("conversations table not found, trying customers fallback");

        const { data: customers, error: custError } = await supabase
          .from("customers")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("last_message_at", { ascending: false, nullsFirst: false });

        if (custError) throw custError;

        // Transform customers to conversation format
        return (customers || []).map((customer: any) => ({
          id: customer.id,
          tenant_id: customer.tenant_id,
          contact_id: customer.id, // Self-reference for now
          channel: customer.channel || "whatsapp",
          channel_id: customer.phone || customer.whatsapp_id,
          status: customer.status || "active",
          assigned_to: customer.assigned_to,
          assigned_to_ai: customer.ai_enabled !== false,
          last_message_at: customer.last_message_at,
          last_message_preview: customer.last_message,
          last_message_direction: customer.last_message_direction,
          unread_count: customer.unread_count || 0,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
          // Create contact from customer data
          contact: {
            id: customer.id,
            first_name: customer.name?.split(" ")[0] || null,
            last_name: customer.name?.split(" ").slice(1).join(" ") || null,
            full_name: customer.name,
            email: customer.email,
            phone: customer.phone,
            whatsapp_number: customer.whatsapp_id,
            company_name: customer.company,
            job_title: null,
            lead_score: customer.lead_score || 50,
            lead_grade: customer.lead_grade || "C",
            lead_temperature: customer.lead_temperature || "COLD",
            pipeline_stage: customer.stage || "CONT",
            avatar_url: null,
            tags: customer.tags,
          },
        })) as Conversation[];
      }
    },
    enabled: !!tenantId,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["inbox", "messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];

      // Try new messages table first
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", selectedConversation.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return data as Message[];
      } catch (e) {
        // Fallback: Try customer_messages table
        console.log("messages table not found, trying customer_messages fallback");

        const { data, error } = await supabase
          .from("customer_messages")
          .select("*")
          .eq("customer_id", selectedConversation.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Transform to Message format
        return (data || []).map((msg: any) => ({
          id: msg.id,
          conversation_id: msg.customer_id,
          direction: msg.direction,
          content: msg.content || msg.message,
          content_type: msg.content_type || "text",
          media_url: msg.media_url,
          sender_type: msg.direction === "inbound" ? "contact" : msg.is_ai ? "ai" : "user",
          sender_id: msg.sender_id,
          status: msg.status || "delivered",
          created_at: msg.created_at,
        })) as Message[];
      }
    },
    enabled: !!selectedConversation?.id,
    refetchInterval: 5000, // Poll every 5 seconds when conversation is open
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation?.id || !content.trim()) return;

      // Try new messages table first
      try {
        const { error } = await supabase.from("messages").insert({
          conversation_id: selectedConversation.id,
          direction: "outbound",
          content: content.trim(),
          content_type: "text",
          sender_type: "user",
          status: "sent",
        });

        if (error) throw error;
      } catch (e) {
        // Fallback: Try customer_messages table
        const { error } = await supabase.from("customer_messages").insert({
          customer_id: selectedConversation.id,
          direction: "outbound",
          content: content.trim(),
          content_type: "text",
          is_ai: false,
          status: "sent",
        });

        if (error) throw error;
      }

      // Update conversation last_message
      try {
        await supabase
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content.trim().substring(0, 100),
            last_message_direction: "outbound",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedConversation.id);
      } catch (e) {
        // Try customers table fallback
        await supabase
          .from("customers")
          .update({
            last_message_at: new Date().toISOString(),
            last_message: content.trim().substring(0, 100),
            last_message_direction: "outbound",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedConversation.id);
      }
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      refetchConversations();
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      try {
        await supabase
          .from("conversations")
          .update({ unread_count: 0, updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      } catch (e) {
        await supabase
          .from("customers")
          .update({ unread_count: 0, updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    },
    onSuccess: () => {
      refetchConversations();
    },
  });

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (conversation.unread_count > 0) {
      markAsRead.mutate(conversation.id);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // =====================================================
  // FILTERED CONVERSATIONS
  // =====================================================

  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;

    const term = searchTerm.toLowerCase();
    return conversations.filter((conv) => {
      const name = getContactDisplayName(conv).toLowerCase();
      const company = conv.contact?.company_name?.toLowerCase() || "";
      const channelId = conv.channel_id?.toLowerCase() || "";
      return name.includes(term) || company.includes(term) || channelId.includes(term);
    });
  }, [conversations, searchTerm]);

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: conversations.length,
      unread: conversations.filter((c) => c.unread_count > 0).length,
      ai: conversations.filter((c) => c.assigned_to_ai).length,
      staff: conversations.filter((c) => !c.assigned_to_ai).length,
    }),
    [conversations],
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">
            {stats.total} conversations • {stats.unread} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetchConversations()}>
            <VolumeX className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetchConversations()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation List */}
        <Card className="w-[350px] flex flex-col">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="p-2 border-b">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all" className="text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Unread
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">
                  AI
                </TabsTrigger>
                <TabsTrigger value="staff" className="text-xs">
                  Staff
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                <p>No conversations</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onSelect={handleSelectConversation}
                />
              ))
            )}
          </ScrollArea>
        </Card>

        {/* Message Area */}
        <Card className="flex-1 flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowContactInfo(true)}>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getContactInitials(selectedConversation)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {getContactDisplayName(selectedConversation)}
                      {selectedConversation.contact?.lead_temperature &&
                        getTemperatureIcon(selectedConversation.contact.lead_temperature)}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {selectedConversation.contact?.company_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedConversation.contact.company_name}
                        </span>
                      )}
                      <Badge variant="outline" className={`text-xs ${getChannelColor(selectedConversation.channel)}`}>
                        {selectedConversation.channel}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConversation.assigned_to_ai && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Bot className="h-3 w-3 mr-1" /> AI Active
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowContactInfo(true)}>
                        <User className="h-4 w-4 mr-2" /> View Contact
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="h-4 w-4 mr-2" /> Call Contact
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Star className="h-4 w-4 mr-2" /> Star Conversation
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" /> Archive
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendMessage.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Contact Info Sidebar */}
      <ContactInfoSidebar
        contact={selectedConversation?.contact || null}
        open={showContactInfo}
        onClose={() => setShowContactInfo(false)}
      />
    </div>
  );
}
