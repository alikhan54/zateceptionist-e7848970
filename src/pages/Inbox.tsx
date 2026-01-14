// ============================================
// FILE: src/pages/Inbox.tsx
// COMPLETE OMNICHANNEL INBOX - PRODUCTION READY
// VERSION: 3.0 - FIXED FOR 420 MULTI-TENANT
// ============================================

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Search,
  RefreshCcw,
  Volume2,
  VolumeX,
  Phone,
  Mail,
  Filter,
  X,
  Star,
  StarOff,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Clock,
  CheckCheck,
  Check,
  Bot,
  User,
  Calendar as CalendarIcon,
  Tag,
  Flame,
  Sun,
  Snowflake,
  ArrowUpDown,
  ExternalLink,
  Archive,
  UserPlus,
  MessageCircle,
  Video,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  BarChart3,
  History,
  Inbox as InboxIcon,
  CircleDot,
  Layers,
  Building2,
  ThumbsUp,
  ThumbsDown,
  Meh,
  AlertTriangle,
  PanelRightClose,
  PanelRight,
  StickyNote,
  Briefcase,
  Hash,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, subDays, subWeeks, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================
// CHANNEL CONFIGURATION
// ============================================
const CHANNELS: Record<
  string,
  {
    id: string;
    name: string;
    icon: any;
    color: string;
    bgColor: string;
    textColor: string;
  }
> = {
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    color: "#25D366",
    bgColor: "bg-[#25D366]/10",
    textColor: "text-[#25D366]",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    bgColor: "bg-[#E1306C]/10",
    textColor: "text-[#E1306C]",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    bgColor: "bg-[#1877F2]/10",
    textColor: "text-[#1877F2]",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "#0A66C2",
    bgColor: "bg-[#0A66C2]/10",
    textColor: "text-[#0A66C2]",
  },
  twitter: {
    id: "twitter",
    name: "X (Twitter)",
    icon: Twitter,
    color: "#000000",
    bgColor: "bg-black/5",
    textColor: "text-black dark:text-white",
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    icon: Send,
    color: "#0088CC",
    bgColor: "bg-[#0088CC]/10",
    textColor: "text-[#0088CC]",
  },
  email: {
    id: "email",
    name: "Email",
    icon: Mail,
    color: "#EA4335",
    bgColor: "bg-[#EA4335]/10",
    textColor: "text-[#EA4335]",
  },
  sms: {
    id: "sms",
    name: "SMS",
    icon: MessageCircle,
    color: "#34B7F1",
    bgColor: "bg-[#34B7F1]/10",
    textColor: "text-[#34B7F1]",
  },
  voice: {
    id: "voice",
    name: "Voice/Call",
    icon: Phone,
    color: "#F97316",
    bgColor: "bg-[#F97316]/10",
    textColor: "text-[#F97316]",
  },
  web: {
    id: "web",
    name: "Website Chat",
    icon: Globe,
    color: "#6366F1",
    bgColor: "bg-[#6366F1]/10",
    textColor: "text-[#6366F1]",
  },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    icon: Globe,
    color: "#E60023",
    bgColor: "bg-[#E60023]/10",
    textColor: "text-[#E60023]",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    icon: Video,
    color: "#000000",
    bgColor: "bg-black/5",
    textColor: "text-black dark:text-white",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    icon: Video,
    color: "#FF0000",
    bgColor: "bg-[#FF0000]/10",
    textColor: "text-[#FF0000]",
  },
  slack: {
    id: "slack",
    name: "Slack",
    icon: Hash,
    color: "#4A154B",
    bgColor: "bg-[#4A154B]/10",
    textColor: "text-[#4A154B]",
  },
  teams: {
    id: "teams",
    name: "MS Teams",
    icon: Users,
    color: "#6264A7",
    bgColor: "bg-[#6264A7]/10",
    textColor: "text-[#6264A7]",
  },
};

// ============================================
// TYPES
// ============================================
interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: string;
  status: string;
  priority?: string;
  assigned_to?: string;
  ai_handled: boolean;
  requires_human: boolean;
  last_message_text?: string;
  last_message_at?: string;
  last_message_direction?: string;
  message_count: number;
  unread_count: number;
  sentiment?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Contact data (from separate query)
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_lead_score?: number;
  contact_lead_temperature?: string;
  contact_lifecycle_stage?: string;
  contact_source?: string;
}

interface Customer {
  id: string;
  tenant_id: string;
  name?: string;
  phone_number?: string;
  email?: string;
  lead_score?: number;
  lead_temperature?: string;
  lifecycle_stage?: string;
  source?: string;
  last_platform?: string;
  handler_type?: string;
  notes?: string;
  tags?: string[];
  last_interaction?: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: "inbound" | "outbound";
  content: string;
  content_type: string;
  sender_type: "customer" | "ai" | "staff";
  channel: string;
  created_at: string;
}

interface FilterState {
  quickFilter: "all" | "unread" | "starred" | "recent" | "ai" | "human";
  channels: string[];
  leadTemperature: "all" | "hot" | "warm" | "cold";
  leadScoreRange: [number, number];
  marketingSource: string;
  handledBy: "all" | "ai" | "staff";
  status: "all" | "active" | "resolved" | "closed";
  sentiment: "all" | "positive" | "neutral" | "negative";
  lifecycleStage: string;
  lastInteraction: "all" | "today" | "yesterday" | "this-week" | "this-month" | "older";
  sortBy: "recent" | "oldest" | "score-high" | "score-low" | "name-az" | "unread-first";
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function Inbox() {
  const { tenantId, tenantConfig } = useTenant();
  // CRITICAL: Use tenantConfig.id (UUID) for database queries, NOT tenantId (slug)
  const tenantUuid = tenantConfig?.id;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================
  // STATE
  // ============================================
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isStaffChat, setIsStaffChat] = useState(false);
  const [starredConversations, setStarredConversations] = useState<Set<string>>(new Set());

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    quickFilter: "all",
    channels: [],
    leadTemperature: "all",
    leadScoreRange: [0, 100],
    marketingSource: "all",
    handledBy: "all",
    status: "all",
    sentiment: "all",
    lifecycleStage: "all",
    lastInteraction: "all",
    sortBy: "recent",
  });

  // ============================================
  // QUERIES
  // ============================================

  // Query conversations
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ["inbox-conversations", tenantUuid, selectedChannel],
    queryFn: async () => {
      if (!tenantUuid) {
        console.log("No tenantUuid available");
        return [];
      }

      console.log("Fetching conversations for tenant:", tenantUuid);

      let query = supabase
        .from("conversations")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (selectedChannel !== "all" && selectedChannel !== "staff") {
        query = query.eq("channel", selectedChannel);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Conversations query error:", error);
        throw error;
      }

      console.log("Conversations fetched:", data?.length || 0);
      return (data || []) as Conversation[];
    },
    enabled: !!tenantUuid,
    refetchInterval: 10000,
  });

  // Query customers (contacts) for enrichment
  const { data: customers = [] } = useQuery({
    queryKey: ["inbox-customers", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];

      const { data, error } = await supabase.from("customers").select("*").eq("tenant_id", tenantUuid);

      if (error) {
        console.error("Customers query error:", error);
        return [];
      }

      return (data || []) as Customer[];
    },
    enabled: !!tenantUuid,
  });

  // Create a map of customers by ID for quick lookup
  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Enrich conversations with customer data
  const enrichedConversations = useMemo(() => {
    return conversations.map((conv) => {
      const customer = customersMap.get(conv.contact_id);
      return {
        ...conv,
        contact_name: customer?.name,
        contact_phone: customer?.phone_number,
        contact_email: customer?.email,
        contact_lead_score: customer?.lead_score,
        contact_lead_temperature: customer?.lead_temperature,
        contact_lifecycle_stage: customer?.lifecycle_stage,
        contact_source: customer?.source,
      };
    });
  }, [conversations, customersMap]);

  // Query messages for selected conversation
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["conversation-messages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];

      // First try the messages table
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Messages query error:", error);
        // Return empty if messages table doesn't exist
        return [];
      }

      return (data || []) as Message[];
    },
    enabled: !!selectedConversationId,
  });

  // Query marketing sources for filter
  const { data: marketingSources = [] } = useQuery({
    queryKey: ["marketing-sources", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase
        .from("customers")
        .select("source")
        .eq("tenant_id", tenantUuid)
        .not("source", "is", null);
      return [...new Set(data?.map((d) => d.source).filter(Boolean))] as string[];
    },
    enabled: !!tenantUuid,
  });

  // ============================================
  // MUTATIONS
  // ============================================

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const conversation = conversations.find((c) => c.id === conversationId);

      // Try to insert message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        direction: "outbound",
        content,
        content_type: "text",
        sender_type: "staff",
        channel: conversation?.channel || "web",
        created_at: new Date().toISOString(),
      });

      if (msgError) {
        console.error("Message insert error:", msgError);
        // Continue to update conversation even if message insert fails
      }

      // Update conversation
      const { error: convError } = await supabase
        .from("conversations")
        .update({
          last_message_text: content,
          last_message_at: new Date().toISOString(),
          last_message_direction: "outbound",
          message_count: (conversation?.message_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convError) throw convError;
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
      refetchConversations();
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error("Failed to send message");
      console.error(error);
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Status updated");
    },
  });

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = [...enrichedConversations];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.contact_name || "").toLowerCase().includes(q) ||
          (c.contact_phone || "").includes(searchQuery) ||
          (c.contact_email || "").toLowerCase().includes(q) ||
          (c.last_message_text || "").toLowerCase().includes(q),
      );
    }

    // Quick filter
    switch (filters.quickFilter) {
      case "unread":
        result = result.filter((c) => c.unread_count > 0);
        break;
      case "starred":
        result = result.filter((c) => starredConversations.has(c.id));
        break;
      case "recent":
        const dayAgo = subDays(new Date(), 1);
        result = result.filter((c) => new Date(c.last_message_at || c.created_at) > dayAgo);
        break;
      case "ai":
        result = result.filter((c) => c.ai_handled && !c.requires_human);
        break;
      case "human":
        result = result.filter((c) => !c.ai_handled || c.requires_human);
        break;
    }

    // Channel filter
    if (filters.channels.length > 0) {
      result = result.filter((c) => filters.channels.includes(c.channel));
    }

    // Lead temperature
    if (filters.leadTemperature !== "all") {
      result = result.filter((c) => c.contact_lead_temperature?.toLowerCase() === filters.leadTemperature);
    }

    // Lead score range
    result = result.filter((c) => {
      const score = c.contact_lead_score ?? 50;
      return score >= filters.leadScoreRange[0] && score <= filters.leadScoreRange[1];
    });

    // Handler
    if (filters.handledBy === "ai") {
      result = result.filter((c) => c.ai_handled && !c.requires_human);
    } else if (filters.handledBy === "staff") {
      result = result.filter((c) => !c.ai_handled || c.requires_human);
    }

    // Status
    if (filters.status !== "all") {
      result = result.filter((c) => c.status === filters.status);
    }

    // Sentiment
    if (filters.sentiment !== "all") {
      result = result.filter((c) => c.sentiment === filters.sentiment);
    }

    // Marketing source
    if (filters.marketingSource !== "all") {
      result = result.filter((c) => c.contact_source === filters.marketingSource);
    }

    // Last interaction
    const now = new Date();
    switch (filters.lastInteraction) {
      case "today":
        result = result.filter((c) => c.last_message_at && isToday(new Date(c.last_message_at)));
        break;
      case "yesterday":
        result = result.filter((c) => c.last_message_at && isYesterday(new Date(c.last_message_at)));
        break;
      case "this-week":
        const weekAgo = subWeeks(now, 1);
        result = result.filter((c) => c.last_message_at && new Date(c.last_message_at) > weekAgo);
        break;
      case "this-month":
        const monthAgo = subMonths(now, 1);
        result = result.filter((c) => c.last_message_at && new Date(c.last_message_at) > monthAgo);
        break;
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "score-high":
          return (b.contact_lead_score || 0) - (a.contact_lead_score || 0);
        case "score-low":
          return (a.contact_lead_score || 0) - (b.contact_lead_score || 0);
        case "name-az":
          return (a.contact_name || "").localeCompare(b.contact_name || "");
        case "unread-first":
          return (b.unread_count || 0) - (a.unread_count || 0);
        default:
          return (
            new Date(b.last_message_at || b.created_at).getTime() -
            new Date(a.last_message_at || a.created_at).getTime()
          );
      }
    });

    return result;
  }, [enrichedConversations, searchQuery, filters, starredConversations]);

  // Selected conversation
  const selectedConversation = useMemo(
    () => enrichedConversations.find((c) => c.id === selectedConversationId),
    [enrichedConversations, selectedConversationId],
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: conversations.length,
      unread: conversations.filter((c) => c.unread_count > 0).length,
      aiHandled: conversations.filter((c) => c.ai_handled && !c.requires_human).length,
      needsHuman: conversations.filter((c) => c.requires_human).length,
      hot: enrichedConversations.filter((c) => c.contact_lead_temperature?.toLowerCase() === "hot").length,
    }),
    [conversations, enrichedConversations],
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.quickFilter !== "all") count++;
    if (filters.channels.length > 0) count++;
    if (filters.leadTemperature !== "all") count++;
    if (filters.leadScoreRange[0] !== 0 || filters.leadScoreRange[1] !== 100) count++;
    if (filters.marketingSource !== "all") count++;
    if (filters.handledBy !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.sentiment !== "all") count++;
    if (filters.lastInteraction !== "all") count++;
    if (filters.sortBy !== "recent") count++;
    return count;
  }, [filters]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv && conv.unread_count > 0) {
        markAsReadMutation.mutate(id);
      }
    },
    [conversations, markAsReadMutation],
  );

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: messageInput.trim(),
    });
  }, [messageInput, selectedConversationId, sendMessageMutation]);

  const handleToggleStar = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredConversations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      quickFilter: "all",
      channels: [],
      leadTemperature: "all",
      leadScoreRange: [0, 100],
      marketingSource: "all",
      handledBy: "all",
      status: "all",
      sentiment: "all",
      lifecycleStage: "all",
      lastInteraction: "all",
      sortBy: "recent",
    });
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  const getChannelConfig = (channel: string) => {
    return CHANNELS[channel] || CHANNELS.web;
  };

  const getInitials = (name?: string | null, phone?: string | null, email?: string | null) => {
    if (name && name !== "Customer" && !name.includes("User")) {
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    if (phone) return phone.slice(-2);
    return "??";
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const getDisplayName = (conv: Conversation) => {
    if (conv.contact_name && conv.contact_name !== "Customer") {
      return conv.contact_name;
    }
    if (conv.contact_email) return conv.contact_email;
    if (conv.contact_phone) return conv.contact_phone;
    return "Unknown Contact";
  };

  const getTemperatureIcon = (temp?: string) => {
    switch (temp?.toLowerCase()) {
      case "hot":
        return <Flame className="h-3 w-3 text-red-500" />;
      case "warm":
        return <Sun className="h-3 w-3 text-yellow-500" />;
      case "cold":
        return <Snowflake className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================
  // REAL-TIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    if (!tenantUuid) return;

    const channel = supabase
      .channel(`inbox-${tenantUuid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `tenant_id=eq.${tenantUuid}`,
        },
        () => {
          console.log("Conversation changed - refetching");
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === selectedConversationId) {
            refetchMessages();
          }
          if (!isMuted && newMsg.direction === "inbound") {
            toast.info("New message received");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUuid, selectedConversationId, queryClient, refetchMessages, isMuted]);

  // Debug logging
  useEffect(() => {
    console.log("Inbox Debug:", {
      tenantId,
      tenantUuid,
      conversationsCount: conversations.length,
      customersCount: customers.length,
      conversationsError,
    });
  }, [tenantId, tenantUuid, conversations.length, customers.length, conversationsError]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* HEADER */}
        <nav className="h-14 border-b px-4 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 p-0">
                  {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isCollapsed ? "Show" : "Hide"} conversations</TooltipContent>
            </Tooltip>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <InboxIcon className="h-5 w-5" />
                {tenantConfig?.company_name || "Inbox"}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {stats.unread > 0 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                    {stats.unread} unread
                  </Badge>
                )}
                <span>{stats.total} conversations</span>
                {stats.hot > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Flame className="h-3 w-3 text-red-500" />
                    {stats.hot} hot
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Channel Pills */}
          <div className="flex items-center gap-2">
            <ScrollArea className="max-w-lg">
              <div className="flex gap-1 px-1">
                <button
                  onClick={() => setSelectedChannel("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    selectedChannel === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  All
                </button>
                {Object.values(CHANNELS)
                  .slice(0, 6)
                  .map((ch) => (
                    <Tooltip key={ch.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedChannel(ch.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                            selectedChannel === ch.id
                              ? `${ch.bgColor} ${ch.textColor} ring-1 ring-current`
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <ch.icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{ch.name}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{ch.name}</TooltipContent>
                    </Tooltip>
                  ))}
              </div>
            </ScrollArea>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant={isStaffChat ? "default" : "outline"}
              size="sm"
              onClick={() => setIsStaffChat(!isStaffChat)}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Staff</span>
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchConversations()}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {/* SIDEBAR */}
          {!isCollapsed && (
            <aside className="w-80 border-r flex flex-col bg-card shrink-0">
              {/* Search & Filters */}
              <div className="p-3 space-y-3 border-b">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Conversations</span>
                  <span className="text-xs text-muted-foreground">
                    {filteredConversations.length} of {conversations.length}
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, phone, email..."
                    className="pl-8 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Quick Filters */}
                <div className="flex gap-1.5 flex-wrap">
                  {(["all", "unread", "starred", "recent"] as const).map((qf) => (
                    <Button
                      key={qf}
                      variant={filters.quickFilter === qf ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setFilters({ ...filters, quickFilter: qf })}
                    >
                      {qf === "starred" && <Star className="h-3 w-3 mr-1" />}
                      {qf.charAt(0).toUpperCase() + qf.slice(1)}
                    </Button>
                  ))}

                  {/* Advanced Filters */}
                  <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                        <Filter className="h-3 w-3" />
                        Filters
                        {activeFilterCount > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-96 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Advanced Filters
                          </span>
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        </SheetTitle>
                      </SheetHeader>

                      <div className="space-y-6 py-6">
                        {/* Marketing Source */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Building2 className="h-4 w-4" />
                            Marketing Source
                          </Label>
                          <Select
                            value={filters.marketingSource}
                            onValueChange={(v) => setFilters({ ...filters, marketingSource: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Sources" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Sources</SelectItem>
                              {marketingSources.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Channels */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <MessageSquare className="h-4 w-4" />
                            Channels
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.values(CHANNELS)
                              .slice(0, 10)
                              .map((ch) => (
                                <div
                                  key={ch.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all",
                                    filters.channels.includes(ch.id)
                                      ? `${ch.bgColor} border-current`
                                      : "hover:bg-muted",
                                  )}
                                  onClick={() => {
                                    const newChannels = filters.channels.includes(ch.id)
                                      ? filters.channels.filter((c) => c !== ch.id)
                                      : [...filters.channels, ch.id];
                                    setFilters({ ...filters, channels: newChannels });
                                  }}
                                >
                                  <Checkbox
                                    checked={filters.channels.includes(ch.id)}
                                    className="pointer-events-none"
                                  />
                                  <ch.icon className={cn("h-4 w-4", ch.textColor)} />
                                  <span className="text-xs truncate">{ch.name}</span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Lead Temperature */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Flame className="h-4 w-4" />
                            Lead Temperature
                          </Label>
                          <Select
                            value={filters.leadTemperature}
                            onValueChange={(v: any) => setFilters({ ...filters, leadTemperature: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Temperatures</SelectItem>
                              <SelectItem value="hot">🔥 Hot</SelectItem>
                              <SelectItem value="warm">☀️ Warm</SelectItem>
                              <SelectItem value="cold">❄️ Cold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Lead Score */}
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                              <BarChart3 className="h-4 w-4" />
                              Lead Score
                            </Label>
                            <span className="text-sm text-muted-foreground">
                              {filters.leadScoreRange[0]} - {filters.leadScoreRange[1]}
                            </span>
                          </div>
                          <Slider
                            value={filters.leadScoreRange}
                            onValueChange={(v) => setFilters({ ...filters, leadScoreRange: v as [number, number] })}
                            min={0}
                            max={100}
                            step={5}
                          />
                        </div>

                        {/* Handled By */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Bot className="h-4 w-4" />
                            Handled By
                          </Label>
                          <Select
                            value={filters.handledBy}
                            onValueChange={(v: any) => setFilters({ ...filters, handledBy: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="ai">AI Only</SelectItem>
                              <SelectItem value="staff">Staff Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <CircleDot className="h-4 w-4" />
                            Status
                          </Label>
                          <Select
                            value={filters.status}
                            onValueChange={(v: any) => setFilters({ ...filters, status: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Last Interaction */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <History className="h-4 w-4" />
                            Last Interaction
                          </Label>
                          <Select
                            value={filters.lastInteraction}
                            onValueChange={(v: any) => setFilters({ ...filters, lastInteraction: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Time</SelectItem>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="yesterday">Yesterday</SelectItem>
                              <SelectItem value="this-week">This Week</SelectItem>
                              <SelectItem value="this-month">This Month</SelectItem>
                              <SelectItem value="older">Older</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sort By */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <ArrowUpDown className="h-4 w-4" />
                            Sort By
                          </Label>
                          <Select
                            value={filters.sortBy}
                            onValueChange={(v: any) => setFilters({ ...filters, sortBy: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recent">Most Recent</SelectItem>
                              <SelectItem value="oldest">Oldest First</SelectItem>
                              <SelectItem value="score-high">Score High → Low</SelectItem>
                              <SelectItem value="score-low">Score Low → High</SelectItem>
                              <SelectItem value="name-az">Name A → Z</SelectItem>
                              <SelectItem value="unread-first">Unread First</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* Conversation List */}
              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="p-8 text-center">
                    <RefreshCcw className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="font-medium text-muted-foreground">No conversations</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery || activeFilterCount > 0
                        ? "Try adjusting your filters"
                        : "Messages will appear here when customers contact you"}
                    </p>
                    {/* Debug info */}
                    <div className="mt-4 p-2 bg-muted/50 rounded text-xs text-left">
                      <p>Debug: Tenant UUID: {tenantUuid || "Not set"}</p>
                      <p>Raw conversations: {conversations.length}</p>
                    </div>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const channelConfig = getChannelConfig(conv.channel);
                    const isSelected = selectedConversationId === conv.id;
                    const isStarred = starredConversations.has(conv.id);
                    const hasUnread = conv.unread_count > 0;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={cn(
                          "p-3 border-b cursor-pointer transition-all hover:bg-muted/50",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                          hasUnread && "bg-blue-50/50 dark:bg-blue-950/20",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {getInitials(conv.contact_name, conv.contact_phone, conv.contact_email)}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn("absolute -bottom-0.5 -right-0.5 rounded-full p-1", channelConfig.bgColor)}
                            >
                              <channelConfig.icon className={cn("h-2.5 w-2.5", channelConfig.textColor)} />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={cn("font-medium truncate text-sm", hasUnread && "font-semibold")}>
                                  {getDisplayName(conv)}
                                </span>
                                {getTemperatureIcon(conv.contact_lead_temperature)}
                                {conv.ai_handled && !conv.requires_human && (
                                  <Bot className="h-3 w-3 text-blue-500 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => handleToggleStar(conv.id, e)}
                                  className="p-0.5 hover:bg-muted rounded"
                                >
                                  {isStarred ? (
                                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <StarOff className="h-3.5 w-3.5 text-muted-foreground/30" />
                                  )}
                                </button>
                                <span className="text-[10px] text-muted-foreground">
                                  {conv.last_message_at && formatMessageTime(conv.last_message_at)}
                                </span>
                              </div>
                            </div>

                            <p
                              className={cn(
                                "text-xs truncate mb-1",
                                hasUnread ? "text-foreground font-medium" : "text-muted-foreground",
                              )}
                            >
                              {conv.last_message_direction === "outbound" && (
                                <Check className="h-3 w-3 inline mr-1 text-green-500" />
                              )}
                              {conv.last_message_text || "No messages yet"}
                            </p>

                            {/* Badges */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {hasUnread && (
                                <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                  {conv.unread_count}
                                </Badge>
                              )}
                              {conv.contact_lead_score != null && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  {conv.contact_lead_score}
                                </Badge>
                              )}
                              {conv.requires_human && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                  Needs Human
                                </Badge>
                              )}
                              {conv.status && conv.status !== "active" && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">
                                  {conv.status}
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
            </aside>
          )}

          {/* MAIN CHAT AREA */}
          <main className="flex-1 flex flex-col min-w-0 bg-background">
            {isStaffChat ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h2 className="text-xl font-semibold mb-2">Staff Chat</h2>
                  <p className="text-muted-foreground">Internal team communication</p>
                  <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
                </div>
              </div>
            ) : selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="h-16 border-b px-4 flex items-center justify-between bg-card shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(
                          selectedConversation.contact_name,
                          selectedConversation.contact_phone,
                          selectedConversation.contact_email,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold flex items-center gap-2">
                        {getDisplayName(selectedConversation)}
                        {getTemperatureIcon(selectedConversation.contact_lead_temperature)}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 text-[10px] capitalize">
                          {getChannelConfig(selectedConversation.channel).name}
                        </Badge>
                        {selectedConversation.contact_phone && <span>{selectedConversation.contact_phone}</span>}
                        {selectedConversation.ai_handled && (
                          <Badge variant="secondary" className="h-5 text-[10px]">
                            <Bot className="h-3 w-3 mr-1" /> AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Book
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        >
                          {isDetailsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Contact Details</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <StickyNote className="h-4 w-4 mr-2" />
                          Add Note
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Create Deal
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: selectedConversation.id,
                              status: "resolved",
                            })
                          }
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Messages */}
                  <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                          <p>No messages in this conversation</p>
                          <p className="text-xs mt-1">
                            Last message: {selectedConversation.last_message_text?.substring(0, 50)}...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2.5",
                                  message.direction === "outbound"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md",
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                <div
                                  className={cn(
                                    "flex items-center gap-1.5 mt-1",
                                    message.direction === "outbound"
                                      ? "text-primary-foreground/70 justify-end"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  <span className="text-[10px]">{format(new Date(message.created_at), "HH:mm")}</span>
                                  {message.sender_type === "ai" && <Bot className="h-3 w-3" />}
                                  {message.direction === "outbound" && <CheckCheck className="h-3 w-3" />}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t bg-card shrink-0">
                      <div className="flex items-end gap-2">
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 relative">
                          <Textarea
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-32 pr-24 resize-none"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          <div className="absolute right-2 bottom-2 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Smile className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={handleSendMessage}
                              disabled={!messageInput.trim() || sendMessageMutation.isPending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Details Panel */}
                  {isDetailsOpen && (
                    <aside className="w-72 border-l bg-card p-4 overflow-y-auto">
                      <h3 className="font-semibold mb-4">Contact Details</h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <p className="font-medium">{selectedConversation.contact_name || "Unknown"}</p>
                        </div>
                        {selectedConversation.contact_phone && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Phone</Label>
                            <p className="font-medium">{selectedConversation.contact_phone}</p>
                          </div>
                        )}
                        {selectedConversation.contact_email && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Email</Label>
                            <p className="font-medium">{selectedConversation.contact_email}</p>
                          </div>
                        )}
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Lead Score</Label>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{selectedConversation.contact_lead_score || 50}</p>
                            {getTemperatureIcon(selectedConversation.contact_lead_temperature)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Lifecycle Stage</Label>
                          <p className="font-medium capitalize">
                            {selectedConversation.contact_lifecycle_stage || "Lead"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Source</Label>
                          <p className="font-medium">{selectedConversation.contact_source || "Unknown"}</p>
                        </div>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Conversation Stats</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="p-2 bg-muted rounded">
                              <p className="text-xs text-muted-foreground">Messages</p>
                              <p className="font-semibold">{selectedConversation.message_count}</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-xs text-muted-foreground">Channel</p>
                              <p className="font-semibold capitalize">{selectedConversation.channel}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
                  <p className="text-muted-foreground">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
