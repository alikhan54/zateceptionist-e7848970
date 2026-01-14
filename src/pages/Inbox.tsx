// ============================================
// FILE: src/pages/Inbox.tsx
// VERSION 6.0 - FULLY INTEGRATED WITH N8N WEBHOOKS
// ============================================
//
// FIXES IMPLEMENTED:
// ✅ Proper contact name resolution (Name → Email → Phone → Platform ID)
// ✅ Phone number from customer OR conversation metadata
// ✅ Notes trigger /webhook/orchestrator
// ✅ Deals trigger /webhook/deal-create AND save to DB
// ✅ Appointments trigger /webhook/book-appointment AND save to DB
// ✅ Escalate triggers /webhook/orchestrator with escalation event
// ✅ Call triggers VAPI /webhook/vapi/outbound-call
// ✅ Messages trigger /webhook/send-message
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Archive,
  UserPlus,
  MessageCircle,
  Video,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  PanelRightClose,
  PanelRight,
  StickyNote,
  Briefcase,
  Hash,
  DollarSign,
  PhoneCall,
  Plus,
  AlertCircle,
  XCircle,
  CheckCircle,
  FileText,
  Shield,
  AlertTriangle,
  Trash2,
  Edit,
} from "lucide-react";
import { format, isToday, isYesterday, addHours, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================
// N8N WEBHOOK CONFIGURATION
// ============================================
const N8N_WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

const WEBHOOKS = {
  SEND_MESSAGE: "/send-message",
  BOOK_APPOINTMENT: "/book-appointment",
  DEAL_CREATE: "/deal-create",
  DEAL_UPDATE: "/deal-update",
  ORCHESTRATOR: "/orchestrator",
  VAPI_OUTBOUND: "/vapi/outbound-call",
  AUTOMATION_CONTROL: "/automation-control",
};

// Helper to call webhooks
async function callWebhook(endpoint: string, data: Record<string, unknown>, tenantId: string) {
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tenant_id: tenantId }),
    });
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error(`Webhook ${endpoint} failed:`, error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// INDUSTRY CONFIGURATION
// ============================================
const INDUSTRY_CONFIG: Record<
  string,
  {
    name: string;
    services: string[];
    stages: string[];
    compliance: string[];
  }
> = {
  healthcare: {
    name: "Healthcare",
    services: ["Consultation", "Treatment", "Follow-up", "Botox", "Filler", "Laser"],
    stages: ["Inquiry", "Consultation Booked", "Treatment Plan", "In Treatment", "Completed"],
    compliance: ["HIPAA", "Patient Consent"],
  },
  real_estate: {
    name: "Real Estate",
    services: ["Property Viewing", "Market Analysis", "Investment Consultation"],
    stages: ["Lead", "Viewing Scheduled", "Interested", "Offer Made", "Closed"],
    compliance: ["Fair Housing", "Disclosure"],
  },
  salon: {
    name: "Salon & Beauty",
    services: ["Haircut", "Color", "Styling", "Manicure", "Pedicure", "Facial"],
    stages: ["Inquiry", "Booked", "Confirmed", "Completed", "Rebooking"],
    compliance: ["Product Safety", "Allergy Disclosure"],
  },
  restaurant: {
    name: "Restaurant",
    services: ["Reservation", "Catering", "Private Event", "Takeaway"],
    stages: ["Inquiry", "Reserved", "Confirmed", "Completed"],
    compliance: ["Food Safety", "Allergen Information"],
  },
  flooring: {
    name: "Flooring",
    services: ["Free Estimate", "Installation", "Repair", "Consultation"],
    stages: ["Lead", "Estimate Scheduled", "Quote Sent", "Job Scheduled", "Completed"],
    compliance: ["Contractor License", "Warranty Terms"],
  },
  general: {
    name: "General Business",
    services: ["Consultation", "Service", "Support", "Sales"],
    stages: ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
    compliance: ["Data Privacy", "Terms of Service"],
  },
};

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
    textColor: "text-black",
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
    name: "Voice",
    icon: Phone,
    color: "#F97316",
    bgColor: "bg-[#F97316]/10",
    textColor: "text-[#F97316]",
  },
  web: {
    id: "web",
    name: "Web Chat",
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
    color: "#010101",
    bgColor: "bg-black/5",
    textColor: "text-black",
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
    name: "Teams",
    icon: Users,
    color: "#6264A7",
    bgColor: "bg-[#6264A7]/10",
    textColor: "text-[#6264A7]",
  },
};

// Default templates
const DEFAULT_TEMPLATES = [
  {
    id: "1",
    name: "Greeting",
    content: "Hello {{name}}! Thank you for reaching out. How can I assist you today?",
    category: "general",
  },
  {
    id: "2",
    name: "Appointment Confirm",
    content: "Your appointment has been confirmed for {{date}} at {{time}}. We look forward to seeing you!",
    category: "appointment",
  },
  {
    id: "3",
    name: "Follow Up",
    content:
      "Hi {{name}}! I wanted to follow up on our recent conversation. Is there anything else I can help you with?",
    category: "followup",
  },
  {
    id: "4",
    name: "Thank You",
    content: "Thank you for your time and interest. We appreciate your business!",
    category: "closing",
  },
];

// ============================================
// TYPES
// ============================================
interface Customer {
  id: string;
  tenant_id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  lead_score?: number;
  lead_temperature?: string;
  lifecycle_stage?: string;
  source?: string;
  handler_type?: string;
  consent_marketing?: boolean;
  consent_data_processing?: boolean;
  do_not_contact?: boolean;
  notes?: string;
  facebook_id?: string;
  instagram_id?: string;
  whatsapp_id?: string;
  linkedin_id?: string;
  twitter_id?: string;
  created_at: string;
  updated_at?: string;
}

interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel: string;
  status: string;
  priority?: string;
  assigned_to?: string;
  ai_handled: boolean;
  last_message_text?: string;
  last_message_at?: string;
  last_message_direction?: string;
  message_count: number;
  unread_count: number;
  requires_human?: boolean;
  escalation_reason?: string;
  created_at: string;
  // Joined customer data
  customer?: Customer;
  // Metadata from conversation (may have contact info)
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: string;
  content: string;
  sender_type: string;
  channel: string;
  status?: string;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name?: string;
  email: string;
  role?: string;
}

interface FilterState {
  quickFilter: string;
  channels: string[];
  leadTemperature: string;
  leadScoreRange: [number, number];
  marketingSource: string;
  status: string;
  sortBy: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function Inbox() {
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const industry = tenantConfig?.industry || "general";
  const industryConfig = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.general;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

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
  const [starredConversations, setStarredConversations] = useState<Set<string>>(new Set());

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false);
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);

  // Form states
  const [noteText, setNoteText] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("lead");
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Contact edit form
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");

  const [messageTemplates] = useState(DEFAULT_TEMPLATES);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    quickFilter: "all",
    channels: [],
    leadTemperature: "all",
    leadScoreRange: [0, 100],
    marketingSource: "all",
    status: "all",
    sortBy: "recent",
  });

  // ============================================
  // QUERIES
  // ============================================

  // Query conversations with customer join
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["inbox-conversations", tenantUuid, selectedChannel],
    queryFn: async () => {
      if (!tenantUuid) return [];

      let query = supabase
        .from("conversations")
        .select(
          `
          *,
          customer:customers!contact_id (
            id, tenant_id, name, first_name, last_name, 
            phone_number, email, lead_score, lead_temperature,
            lifecycle_stage, source, handler_type, notes,
            consent_marketing, consent_data_processing, do_not_contact,
            facebook_id, instagram_id, whatsapp_id, linkedin_id, twitter_id,
            created_at, updated_at
          )
        `,
        )
        .eq("tenant_id", tenantUuid)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (selectedChannel !== "all") {
        query = query.eq("channel", selectedChannel);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Conversations query error:", error);
        // Fallback: query without join
        const { data: fallbackData } = await supabase
          .from("conversations")
          .select("*")
          .eq("tenant_id", tenantUuid)
          .order("last_message_at", { ascending: false, nullsFirst: false });
        return (fallbackData || []) as Conversation[];
      }

      return (data || []) as Conversation[];
    },
    enabled: !!tenantUuid,
    refetchInterval: 10000,
  });

  // Query customers separately (for enrichment if join fails)
  const { data: customers = [] } = useQuery({
    queryKey: ["inbox-customers", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase.from("customers").select("*").eq("tenant_id", tenantUuid);
      return (data || []) as Customer[];
    },
    enabled: !!tenantUuid,
  });

  // Create customers map for fallback enrichment
  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Enrich conversations (ensure customer data exists)
  const enrichedConversations = useMemo(() => {
    return conversations.map((conv) => {
      // If customer wasn't joined, try to get from map
      if (!conv.customer && conv.contact_id) {
        return { ...conv, customer: customersMap.get(conv.contact_id) };
      }
      return conv;
    });
  }, [conversations, customersMap]);

  // Query messages
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["conversation-messages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Messages error:", error);
        return [];
      }
      return (data || []) as Message[];
    },
    enabled: !!selectedConversationId,
  });

  // Query staff
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase.from("users").select("id, full_name, email, role").eq("tenant_id", tenantUuid);
      return (data || []) as StaffMember[];
    },
    enabled: !!tenantUuid,
  });

  // Query sources
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

  // Selected conversation & customer
  const selectedConversation = useMemo(
    () => enrichedConversations.find((c) => c.id === selectedConversationId),
    [enrichedConversations, selectedConversationId],
  );

  const selectedCustomer = useMemo(() => selectedConversation?.customer || null, [selectedConversation]);

  // ============================================
  // CONTACT INFO RESOLUTION (CRITICAL FIX)
  // ============================================

  // Get the best available name for a contact
  const getDisplayName = useCallback((conv: Conversation): string => {
    const customer = conv.customer;

    // Priority 1: Customer name field
    if (customer?.name && customer.name !== "Customer" && customer.name.trim()) {
      return customer.name;
    }

    // Priority 2: First + Last name
    if (customer?.first_name) {
      return customer.last_name ? `${customer.first_name} ${customer.last_name}` : customer.first_name;
    }

    // Priority 3: Conversation metadata (contact_name)
    if (conv.contact_name && conv.contact_name.trim()) {
      return conv.contact_name;
    }

    // Priority 4: Email (extract name part)
    if (customer?.email) {
      const emailName = customer.email.split("@")[0];
      // Clean up common patterns like "john.doe" or "john_doe"
      return emailName.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Priority 5: Phone number
    if (customer?.phone_number) {
      return customer.phone_number;
    }
    if (conv.contact_phone) {
      return conv.contact_phone;
    }

    // Priority 6: Platform-specific IDs with friendly labels
    if (customer?.facebook_id) {
      return `Facebook User`;
    }
    if (customer?.instagram_id) {
      return `Instagram User`;
    }
    if (customer?.whatsapp_id) {
      return `WhatsApp User`;
    }
    if (customer?.linkedin_id) {
      return `LinkedIn User`;
    }
    if (customer?.twitter_id) {
      return `Twitter User`;
    }

    // Final fallback
    return "New Contact";
  }, []);

  // Get the best available phone number
  const getPhoneNumber = useCallback((conv: Conversation): string | null => {
    const customer = conv.customer;

    // Priority 1: Customer phone_number
    if (customer?.phone_number) {
      return customer.phone_number;
    }

    // Priority 2: Conversation metadata
    if (conv.contact_phone) {
      return conv.contact_phone;
    }

    // Priority 3: WhatsApp ID (often a phone number)
    if (customer?.whatsapp_id && /^\+?\d{10,}$/.test(customer.whatsapp_id)) {
      return customer.whatsapp_id;
    }

    return null;
  }, []);

  // Get initials
  const getInitials = useCallback(
    (conv: Conversation): string => {
      const name = getDisplayName(conv);
      if (name.startsWith("Facebook") || name.startsWith("Instagram")) {
        return conv.channel?.substring(0, 2).toUpperCase() || "??";
      }
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    },
    [getDisplayName],
  );

  // ============================================
  // FILTER CONVERSATIONS
  // ============================================
  const filteredConversations = useMemo(() => {
    let result = [...enrichedConversations];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const customer = c.customer;
        const name = getDisplayName(c).toLowerCase();
        return (
          name.includes(q) ||
          (customer?.phone_number || "").includes(searchQuery) ||
          (customer?.email || "").toLowerCase().includes(q) ||
          (c.last_message_text || "").toLowerCase().includes(q)
        );
      });
    }

    if (filters.quickFilter === "unread") {
      result = result.filter((c) => c.unread_count > 0);
    } else if (filters.quickFilter === "starred") {
      result = result.filter((c) => starredConversations.has(c.id));
    } else if (filters.quickFilter === "ai") {
      result = result.filter((c) => c.ai_handled);
    } else if (filters.quickFilter === "human") {
      result = result.filter((c) => !c.ai_handled);
    }

    if (filters.channels.length > 0) {
      result = result.filter((c) => filters.channels.includes(c.channel));
    }

    if (filters.leadTemperature !== "all") {
      result = result.filter((c) => c.customer?.lead_temperature === filters.leadTemperature);
    }

    result = result.filter((c) => {
      const score = c.customer?.lead_score ?? 50;
      return score >= filters.leadScoreRange[0] && score <= filters.leadScoreRange[1];
    });

    if (filters.marketingSource !== "all") {
      result = result.filter((c) => c.customer?.source === filters.marketingSource);
    }

    if (filters.status !== "all") {
      result = result.filter((c) => c.status === filters.status);
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "score-high":
          return (b.customer?.lead_score || 0) - (a.customer?.lead_score || 0);
        case "score-low":
          return (a.customer?.lead_score || 0) - (b.customer?.lead_score || 0);
        default:
          return (
            new Date(b.last_message_at || b.created_at).getTime() -
            new Date(a.last_message_at || a.created_at).getTime()
          );
      }
    });

    return result;
  }, [enrichedConversations, searchQuery, filters, starredConversations, getDisplayName]);

  // ============================================
  // MUTATIONS WITH WEBHOOK INTEGRATION
  // ============================================

  // 1. SEND MESSAGE - Saves to DB + Calls webhook
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) throw new Error("Conversation not found");

      // Save to database
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        direction: "outbound",
        content,
        sender_type: "staff",
        channel: conversation.channel,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message_text: content,
          last_message_at: new Date().toISOString(),
          last_message_direction: "outbound",
          message_count: (conversation.message_count || 0) + 1,
          ai_handled: false,
        })
        .eq("id", conversationId);

      // CALL WEBHOOK to actually send the message
      const customer = conversation.customer;
      await callWebhook(
        WEBHOOKS.SEND_MESSAGE,
        {
          conversation_id: conversationId,
          customer_id: conversation.contact_id,
          customer_phone: customer?.phone_number || customer?.whatsapp_id,
          customer_email: customer?.email,
          message: content,
          channel: conversation.channel,
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
      refetchConversations();
      toast.success("Message sent");
    },
    onError: () => toast.error("Failed to send message"),
  });

  // 2. CREATE DEAL - Saves to DB + Calls webhook
  const createDealMutation = useMutation({
    mutationFn: async ({
      contactId,
      title,
      value,
      stage,
    }: {
      contactId: string;
      title: string;
      value: number;
      stage: string;
    }) => {
      const customer = selectedCustomer;
      const customerName = customer ? getDisplayName(selectedConversation!) : "Unknown";

      // Save to database
      const { data: deal, error } = await supabase
        .from("deals")
        .insert({
          tenant_id: tenantUuid,
          contact_id: contactId,
          title,
          value,
          stage,
          status: "open",
          probability: stage === "lead" ? 10 : stage === "qualified" ? 30 : 50,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update customer lifecycle
      await supabase.from("customers").update({ lifecycle_stage: "opportunity" }).eq("id", contactId);

      // CALL WEBHOOK to trigger n8n workflow
      await callWebhook(
        WEBHOOKS.DEAL_CREATE,
        {
          deal_id: deal.id,
          name: title,
          customer_id: contactId,
          customer_name: customerName,
          customer_phone: customer?.phone_number,
          customer_email: customer?.email,
          value,
          stage,
          source: "inbox",
        },
        tenantUuid!,
      );

      return deal;
    },
    onSuccess: () => {
      setIsDealDialogOpen(false);
      setDealTitle("");
      setDealValue("");
      setDealStage("lead");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal created successfully!");
    },
    onError: (error) => {
      console.error("Deal creation error:", error);
      toast.error("Failed to create deal");
    },
  });

  // 3. BOOK APPOINTMENT - Saves to DB + Calls webhook
  const bookAppointmentMutation = useMutation({
    mutationFn: async ({
      customerId,
      date,
      time,
      service,
      notes,
    }: {
      customerId: string;
      date: Date;
      time: string;
      service: string;
      notes: string;
    }) => {
      const customer = selectedCustomer;
      const customerName = customer ? getDisplayName(selectedConversation!) : "Unknown";

      const [hours, minutes] = time.split(":").map(Number);
      const startTime = setMinutes(setHours(date, hours), minutes);
      const endTime = addHours(startTime, 1);

      // Save to database
      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          tenant_id: tenantUuid,
          customer_id: customerId,
          title: service,
          service_type: service,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "scheduled",
          notes,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // CALL WEBHOOK to send confirmation
      await callWebhook(
        WEBHOOKS.BOOK_APPOINTMENT,
        {
          appointment_id: appointment.id,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: customer?.phone_number,
          customer_email: customer?.email,
          title: service,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes,
          send_confirmation: true,
        },
        tenantUuid!,
      );

      return appointment;
    },
    onSuccess: () => {
      setIsBookDialogOpen(false);
      setAppointmentDate(undefined);
      setAppointmentTime("10:00");
      setAppointmentService("");
      setAppointmentNotes("");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked! Confirmation will be sent.");
    },
    onError: () => toast.error("Failed to book appointment"),
  });

  // 4. ADD NOTE - Saves to DB + Calls orchestrator
  const addNoteMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // Save to internal_notes
      await supabase.from("internal_notes").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        user_id: "current_user",
        user_name: "Staff",
        content,
        pinned: false,
        created_at: new Date().toISOString(),
      });

      // Also append to customer notes
      if (selectedConversation?.contact_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("notes")
          .eq("id", selectedConversation.contact_id)
          .single();

        const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
        const newNotes = customer?.notes ? `${customer.notes}\n[${timestamp}] ${content}` : `[${timestamp}] ${content}`;

        await supabase.from("customers").update({ notes: newNotes }).eq("id", selectedConversation.contact_id);
      }

      // CALL ORCHESTRATOR WEBHOOK
      await callWebhook(
        WEBHOOKS.ORCHESTRATOR,
        {
          event_type: "note_added",
          entity_type: "conversation",
          entity_id: conversationId,
          data: {
            content,
            customer_id: selectedConversation?.contact_id,
            customer_name: selectedConversation ? getDisplayName(selectedConversation) : null,
          },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setIsNoteDialogOpen(false);
      setNoteText("");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  // 5. ESCALATE - Updates DB + Calls orchestrator
  const escalateMutation = useMutation({
    mutationFn: async ({ conversationId, reason }: { conversationId: string; reason: string }) => {
      // Update conversation flags
      await supabase
        .from("conversations")
        .update({
          requires_human: true,
          escalation_reason: reason,
          priority: "high",
          ai_handled: false,
        })
        .eq("id", conversationId);

      // Add escalation note
      await supabase.from("internal_notes").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        user_id: "system",
        user_name: "System",
        content: `⚠️ ESCALATED: ${reason}`,
        pinned: true,
        created_at: new Date().toISOString(),
      });

      // CALL ORCHESTRATOR WEBHOOK to notify team
      await callWebhook(
        WEBHOOKS.ORCHESTRATOR,
        {
          event_type: "conversation_escalated",
          entity_type: "conversation",
          entity_id: conversationId,
          data: {
            reason,
            customer_id: selectedConversation?.contact_id,
            customer_name: selectedConversation ? getDisplayName(selectedConversation) : null,
            customer_phone: selectedCustomer?.phone_number,
            channel: selectedConversation?.channel,
            priority: "high",
          },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setIsEscalateDialogOpen(false);
      setEscalationReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Conversation escalated - team notified");
    },
    onError: () => toast.error("Failed to escalate"),
  });

  // 6. INITIATE CALL - Logs activity + Calls VAPI
  const initiateCallMutation = useMutation({
    mutationFn: async ({ customerId, phoneNumber }: { customerId: string; phoneNumber: string }) => {
      // Log activity
      await supabase.from("activities").insert({
        tenant_id: tenantUuid,
        customer_id: customerId,
        type: "call",
        description: `Outbound call to ${phoneNumber}`,
        created_at: new Date().toISOString(),
      });

      // CALL VAPI WEBHOOK for outbound call
      const result = await callWebhook(
        WEBHOOKS.VAPI_OUTBOUND,
        {
          customer_id: customerId,
          customer_name: selectedConversation ? getDisplayName(selectedConversation) : "Customer",
          phone_number: phoneNumber,
          assistant_id: "d7e846ab-9c1c-4f59-92f0-c755424e6c3f", // Aamerah assistant
          from_number: "+12722350215", // VAPI number
        },
        tenantUuid!,
      );

      // Fallback to tel: link if webhook fails
      if (!result.success) {
        window.open(`tel:${phoneNumber}`, "_self");
      }
    },
    onSuccess: () => {
      setIsCallDialogOpen(false);
      toast.success("Call initiated via VAPI");
    },
    onError: () => toast.error("Failed to initiate call"),
  });

  // 7. TRANSFER CONVERSATION
  const transferMutation = useMutation({
    mutationFn: async ({
      conversationId,
      toStaffId,
      reason,
    }: {
      conversationId: string;
      toStaffId: string;
      reason: string;
    }) => {
      const staff = staffMembers.find((s) => s.id === toStaffId);

      await supabase.from("conversations").update({ assigned_to: toStaffId }).eq("id", conversationId);

      await supabase.from("internal_notes").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        user_id: "system",
        user_name: "System",
        content: `🔄 Transferred to ${staff?.full_name || staff?.email}: ${reason}`,
        pinned: false,
        created_at: new Date().toISOString(),
      });

      // Notify via orchestrator
      await callWebhook(
        WEBHOOKS.ORCHESTRATOR,
        {
          event_type: "conversation_transferred",
          entity_type: "conversation",
          entity_id: conversationId,
          data: {
            to_staff_id: toStaffId,
            to_staff_name: staff?.full_name || staff?.email,
            reason,
            customer_id: selectedConversation?.contact_id,
          },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setIsTransferDialogOpen(false);
      setSelectedStaffId("");
      setTransferReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Conversation transferred");
    },
    onError: () => toast.error("Failed to transfer"),
  });

  // 8. ASSIGN CONVERSATION
  const assignMutation = useMutation({
    mutationFn: async ({ conversationId, staffId }: { conversationId: string; staffId: string }) => {
      await supabase.from("conversations").update({ assigned_to: staffId, ai_handled: false }).eq("id", conversationId);

      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation?.contact_id) {
        await supabase
          .from("customers")
          .update({ assigned_to: staffId, handler_type: "staff" })
          .eq("id", conversation.contact_id);
      }
    },
    onSuccess: () => {
      setIsAssignDialogOpen(false);
      setSelectedStaffId("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Assigned successfully");
    },
  });

  // 9. UPDATE CONTACT INFO
  const updateContactMutation = useMutation({
    mutationFn: async ({
      customerId,
      name,
      phone,
      email,
    }: {
      customerId: string;
      name: string;
      phone: string;
      email: string;
    }) => {
      await supabase
        .from("customers")
        .update({
          name: name || null,
          phone_number: phone || null,
          email: email || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    },
    onSuccess: () => {
      setIsEditContactDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      toast.success("Contact updated");
    },
    onError: () => toast.error("Failed to update contact"),
  });

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("conversations").update({ status }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Status updated");
    },
  });

  // Update consent
  const updateConsentMutation = useMutation({
    mutationFn: async ({ customerId, field, value }: { customerId: string; field: string; value: boolean }) => {
      await supabase
        .from("customers")
        .update({ [field]: value })
        .eq("id", customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      toast.success("Consent updated");
    },
  });

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
    sendMessageMutation.mutate({ conversationId: selectedConversationId, content: messageInput.trim() });
  }, [messageInput, selectedConversationId, sendMessageMutation]);

  const handleToggleStar = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredConversations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleUseTemplate = useCallback(
    (template: { content: string }) => {
      let content = template.content;
      if (selectedConversation) {
        content = content.replace("{{name}}", getDisplayName(selectedConversation));
      }
      setMessageInput(content);
      setIsTemplateDialogOpen(false);
      messageInputRef.current?.focus();
    },
    [selectedConversation, getDisplayName],
  );

  const handleEditContact = useCallback(() => {
    if (selectedCustomer) {
      setEditContactName(selectedCustomer.name || selectedCustomer.first_name || "");
      setEditContactPhone(selectedCustomer.phone_number || "");
      setEditContactEmail(selectedCustomer.email || "");
      setIsEditContactDialogOpen(true);
    }
  }, [selectedCustomer]);

  const clearFilters = useCallback(() => {
    setFilters({
      quickFilter: "all",
      channels: [],
      leadTemperature: "all",
      leadScoreRange: [0, 100],
      marketingSource: "all",
      status: "all",
      sortBy: "recent",
    });
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  const getChannelConfig = (channel: string) => CHANNELS[channel] || CHANNELS.web;

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

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantUuid) return;
    const channel = supabase
      .channel(`inbox-${tenantUuid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `tenant_id=eq.${tenantUuid}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.conversation_id === selectedConversationId) refetchMessages();
        if (!isMuted && msg.direction === "inbound") {
          toast.info("New message received");
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUuid, selectedConversationId, queryClient, refetchMessages, isMuted]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.quickFilter !== "all") count++;
    if (filters.channels.length > 0) count++;
    if (filters.leadTemperature !== "all") count++;
    if (filters.leadScoreRange[0] !== 0 || filters.leadScoreRange[1] !== 100) count++;
    if (filters.marketingSource !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.sortBy !== "recent") count++;
    return count;
  }, [filters]);

  // Current phone number for selected contact
  const currentPhoneNumber = selectedConversation ? getPhoneNumber(selectedConversation) : null;

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
                <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
                  {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isCollapsed ? "Show" : "Hide"} sidebar</TooltipContent>
            </Tooltip>
            <div>
              <h1 className="text-lg font-bold">{tenantConfig?.company_name || "Inbox"}</h1>
              <p className="text-xs text-muted-foreground">
                {filteredConversations.length} conversations
                {filteredConversations.filter((c) => c.unread_count > 0).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                    {filteredConversations.filter((c) => c.unread_count > 0).length} unread
                  </Badge>
                )}
              </p>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex items-center gap-1">
            <ScrollArea className="max-w-xl">
              <div className="flex gap-1 px-1">
                <button
                  onClick={() => setSelectedChannel("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    selectedChannel === "all"
                      ? "bg-primary text-primary-foreground"
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
                            "px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                            selectedChannel === ch.id
                              ? `${ch.bgColor} ${ch.textColor}`
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <ch.icon className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{ch.name}</TooltipContent>
                    </Tooltip>
                  ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-muted flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      More
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.values(CHANNELS)
                      .slice(6)
                      .map((ch) => (
                        <DropdownMenuItem key={ch.id} onClick={() => setSelectedChannel(ch.id)}>
                          <ch.icon className={cn("h-4 w-4 mr-2", ch.textColor)} />
                          {ch.name}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => refetchConversations()}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </nav>

        {/* MAIN */}
        <div className="flex-1 flex overflow-hidden">
          {/* SIDEBAR */}
          {!isCollapsed && (
            <aside className="w-80 border-r flex flex-col bg-card shrink-0">
              {/* Search */}
              <div className="p-3 space-y-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
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
                  {["all", "unread", "starred", "ai", "human"].map((qf) => (
                    <Button
                      key={qf}
                      variant={filters.quickFilter === qf ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setFilters({ ...filters, quickFilter: qf })}
                    >
                      {qf === "starred" && <Star className="h-3 w-3 mr-1" />}
                      {qf === "ai" && <Bot className="h-3 w-3 mr-1" />}
                      {qf === "human" && <User className="h-3 w-3 mr-1" />}
                      {qf === "all" ? "All" : qf.charAt(0).toUpperCase() + qf.slice(1)}
                    </Button>
                  ))}

                  <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                        <Filter className="h-3 w-3" />
                        {activeFilterCount > 0 && (
                          <Badge variant="secondary" className="h-4 px-1">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-80">
                      <SheetHeader>
                        <SheetTitle className="flex justify-between">
                          Filters
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Clear
                          </Button>
                        </SheetTitle>
                      </SheetHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Lead Temperature</Label>
                          <Select
                            value={filters.leadTemperature}
                            onValueChange={(v) => setFilters({ ...filters, leadTemperature: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="hot">🔥 Hot</SelectItem>
                              <SelectItem value="warm">☀️ Warm</SelectItem>
                              <SelectItem value="cold">❄️ Cold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Lead Score</Label>
                            <span className="text-xs text-muted-foreground">
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
                        <div className="space-y-2">
                          <Label>Source</Label>
                          <Select
                            value={filters.marketingSource}
                            onValueChange={(v) => setFilters({ ...filters, marketingSource: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
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
                        <div className="space-y-2">
                          <Label>Sort By</Label>
                          <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recent">Most Recent</SelectItem>
                              <SelectItem value="oldest">Oldest</SelectItem>
                              <SelectItem value="score-high">Score High→Low</SelectItem>
                              <SelectItem value="score-low">Score Low→High</SelectItem>
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
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const channelConfig = getChannelConfig(conv.channel);
                    const isSelected = selectedConversationId === conv.id;
                    const isStarred = starredConversations.has(conv.id);
                    const hasUnread = conv.unread_count > 0;
                    const displayName = getDisplayName(conv);

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={cn(
                          "p-3 border-b cursor-pointer transition-all hover:bg-muted/50",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                          hasUnread && "bg-blue-50/50",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(conv)}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn("absolute -bottom-0.5 -right-0.5 rounded-full p-1", channelConfig.bgColor)}
                            >
                              <channelConfig.icon className={cn("h-2.5 w-2.5", channelConfig.textColor)} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={cn("font-medium truncate text-sm", hasUnread && "font-semibold")}>
                                  {displayName}
                                </span>
                                {getTemperatureIcon(conv.customer?.lead_temperature)}
                                {conv.ai_handled && <Bot className="h-3 w-3 text-blue-500 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={(e) => handleToggleStar(conv.id, e)} className="p-0.5">
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
                                "text-xs truncate",
                                hasUnread ? "text-foreground font-medium" : "text-muted-foreground",
                              )}
                            >
                              {conv.last_message_direction === "outbound" && (
                                <Check className="h-3 w-3 inline mr-1 text-green-500" />
                              )}
                              {conv.last_message_text || "No messages"}
                            </p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {hasUnread && (
                                <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                  {conv.unread_count}
                                </Badge>
                              )}
                              {conv.customer?.lead_score != null && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  {conv.customer.lead_score}
                                </Badge>
                              )}
                              {conv.requires_human && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                  Escalated
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

          {/* CHAT AREA */}
          <main className="flex-1 flex flex-col min-w-0 bg-background">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="h-14 border-b px-4 flex items-center justify-between bg-card shrink-0">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(selectedConversation)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold flex items-center gap-2">
                        {getDisplayName(selectedConversation)}
                        {getTemperatureIcon(selectedCustomer?.lead_temperature)}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditContact}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={cn("h-5 text-[10px]", getChannelConfig(selectedConversation.channel).bgColor)}
                        >
                          {getChannelConfig(selectedConversation.channel).name}
                        </Badge>
                        {currentPhoneNumber && <span>{currentPhoneNumber}</span>}
                        {!currentPhoneNumber && <span className="text-yellow-600">No phone - click edit to add</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCallDialogOpen(true)}
                      disabled={!currentPhoneNumber}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setIsDetailsOpen(!isDetailsOpen)}>
                          {isDetailsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Details</TooltipContent>
                    </Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsNoteDialogOpen(true)}>
                          <StickyNote className="h-4 w-4 mr-2" />
                          Add Note
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsAssignDialogOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsTransferDialogOpen(true)}>
                          <Send className="h-4 w-4 mr-2" />
                          Transfer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsDealDialogOpen(true)}>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Create Deal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsBookDialogOpen(true)}>
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Book Appointment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsEscalateDialogOpen(true)}>
                          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                          Escalate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatusMutation.mutate({ id: selectedConversation.id, status: "resolved" })
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Resolve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: selectedConversation.id, status: "closed" })}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Close
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleEditContact}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Contact
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsComplianceDialogOpen(true)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Compliance
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Messages */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                          <p>No messages yet</p>
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

                    {/* Input */}
                    <div className="p-4 border-t bg-card shrink-0">
                      <div className="flex items-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Templates
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex-1 relative">
                          <Textarea
                            ref={messageInputRef}
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-32 pr-20 resize-none"
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

                  {/* Details Panel */}
                  {isDetailsOpen && selectedCustomer && (
                    <aside className="w-72 border-l bg-card p-4 overflow-y-auto shrink-0">
                      <div className="text-center mb-4">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {getInitials(selectedConversation)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold">{getDisplayName(selectedConversation)}</h3>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {getTemperatureIcon(selectedCustomer.lead_temperature)}
                          <Badge variant="outline" className="capitalize">
                            {selectedCustomer.lifecycle_stage || "Lead"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={handleEditContact}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Contact
                        </Button>
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{currentPhoneNumber || <span className="text-yellow-600">Not set</span>}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">
                            {selectedCustomer.email || <span className="text-yellow-600">Not set</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span>Score: {selectedCustomer.lead_score || 50}</span>
                        </div>
                        {selectedCustomer.source && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.source}</span>
                          </div>
                        )}
                      </div>
                      {selectedCustomer.notes && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="text-sm font-medium mb-2">Notes</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {selectedCustomer.notes}
                            </p>
                          </div>
                        </>
                      )}
                    </aside>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
                  <p className="text-muted-foreground">Choose a conversation to view messages</p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ============================================ */}
        {/* ALL DIALOGS */}
        {/* ============================================ */}

        {/* Edit Contact Dialog */}
        <Dialog open={isEditContactDialogOpen} onOpenChange={setIsEditContactDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>Update contact information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Full name"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditContactDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedCustomer &&
                  updateContactMutation.mutate({
                    customerId: selectedCustomer.id,
                    name: editContactName,
                    phone: editContactPhone,
                    email: editContactEmail,
                  })
                }
                disabled={updateContactMutation.isPending}
              >
                {updateContactMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Conversation</DialogTitle>
              <DialogDescription>Select a staff member</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name || staff.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedConversationId &&
                  assignMutation.mutate({ conversationId: selectedConversationId, staffId: selectedStaffId })
                }
                disabled={!selectedStaffId || assignMutation.isPending}
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Note Dialog */}
        <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Add an internal note (triggers n8n workflow)</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Enter note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedConversationId &&
                  addNoteMutation.mutate({ conversationId: selectedConversationId, content: noteText })
                }
                disabled={!noteText.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deal Dialog */}
        <Dialog open={isDealDialogOpen} onOpenChange={setIsDealDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
              <DialogDescription>Create a new opportunity (triggers n8n workflow)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Value ($)</Label>
                <Input type="number" placeholder="0" value={dealValue} onChange={(e) => setDealValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={dealStage} onValueChange={setDealStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industryConfig.stages.map((stage) => (
                      <SelectItem key={stage} value={stage.toLowerCase().replace(/ /g, "_")}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDealDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedConversation?.contact_id &&
                  createDealMutation.mutate({
                    contactId: selectedConversation.contact_id,
                    title: dealTitle,
                    value: parseFloat(dealValue) || 0,
                    stage: dealStage,
                  })
                }
                disabled={!dealTitle.trim() || createDealMutation.isPending}
              >
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Book Appointment Dialog */}
        <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>
                Schedule an appointment (triggers n8n workflow + sends confirmation)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={appointmentService} onValueChange={setAppointmentService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryConfig.services.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={appointmentDate} onSelect={setAppointmentDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => {
                      const h = Math.floor(i / 2) + 9;
                      const m = (i % 2) * 30;
                      const t = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                      return (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Notes..."
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedConversation?.contact_id &&
                  appointmentDate &&
                  bookAppointmentMutation.mutate({
                    customerId: selectedConversation.contact_id,
                    date: appointmentDate,
                    time: appointmentTime,
                    service: appointmentService,
                    notes: appointmentNotes,
                  })
                }
                disabled={!appointmentDate || !appointmentService || bookAppointmentMutation.isPending}
              >
                {bookAppointmentMutation.isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Call Dialog */}
        <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Call</DialogTitle>
              <DialogDescription>Start a phone call via VAPI</DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              {currentPhoneNumber ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-10 w-10 text-green-600" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">{currentPhoneNumber}</p>
                  <p className="text-muted-foreground">
                    {selectedConversation && getDisplayName(selectedConversation)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Call will be made via VAPI AI (+1 272 235 0215)</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-yellow-600" />
                  </div>
                  <p className="text-muted-foreground mb-2">No phone number available</p>
                  <Button variant="outline" size="sm" onClick={handleEditContact}>
                    <Edit className="h-4 w-4 mr-1" />
                    Add Phone Number
                  </Button>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCallDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  currentPhoneNumber &&
                  selectedConversation &&
                  initiateCallMutation.mutate({
                    customerId: selectedConversation.contact_id,
                    phoneNumber: currentPhoneNumber,
                  })
                }
                disabled={!currentPhoneNumber || initiateCallMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                {initiateCallMutation.isPending ? "Connecting..." : "Call Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalate Dialog */}
        <Dialog open={isEscalateDialogOpen} onOpenChange={setIsEscalateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Escalate
              </DialogTitle>
              <DialogDescription>Mark for human attention (triggers n8n notification)</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={escalationReason} onValueChange={setEscalationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complex_inquiry">Complex Inquiry</SelectItem>
                  <SelectItem value="complaint">Customer Complaint</SelectItem>
                  <SelectItem value="urgent_request">Urgent Request</SelectItem>
                  <SelectItem value="high_value">High Value Opportunity</SelectItem>
                  <SelectItem value="ai_limitation">AI Cannot Handle</SelectItem>
                  <SelectItem value="sensitive">Sensitive Topic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEscalateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  selectedConversationId &&
                  escalateMutation.mutate({ conversationId: selectedConversationId, reason: escalationReason })
                }
                disabled={!escalationReason || escalateMutation.isPending}
              >
                {escalateMutation.isPending ? "Escalating..." : "Escalate Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer</DialogTitle>
              <DialogDescription>Transfer to another team member</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transfer To</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name || staff.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Why?"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedConversationId &&
                  transferMutation.mutate({
                    conversationId: selectedConversationId,
                    toStaffId: selectedStaffId,
                    reason: transferReason,
                  })
                }
                disabled={!selectedStaffId || transferMutation.isPending}
              >
                {transferMutation.isPending ? "Transferring..." : "Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Message Templates</DialogTitle>
              <DialogDescription>Select a template</DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-3 max-h-80 overflow-y-auto">
              {messageTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md"
                  onClick={() => handleUseTemplate(template)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {template.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Compliance Dialog */}
        <Dialog open={isComplianceDialogOpen} onOpenChange={setIsComplianceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance
              </DialogTitle>
              <DialogDescription>Manage consent settings</DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2">{industryConfig.name} Compliance</h4>
                  <div className="flex flex-wrap gap-2">
                    {industryConfig.compliance.map((req) => (
                      <Badge key={req} variant="outline">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Marketing Communications</Label>
                      <p className="text-xs text-muted-foreground">Allow marketing messages</p>
                    </div>
                    <Switch
                      checked={selectedCustomer.consent_marketing || false}
                      onCheckedChange={(v) =>
                        updateConsentMutation.mutate({
                          customerId: selectedCustomer.id,
                          field: "consent_marketing",
                          value: v,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Data Processing</Label>
                      <p className="text-xs text-muted-foreground">Allow data storage</p>
                    </div>
                    <Switch
                      checked={selectedCustomer.consent_data_processing || false}
                      onCheckedChange={(v) =>
                        updateConsentMutation.mutate({
                          customerId: selectedCustomer.id,
                          field: "consent_data_processing",
                          value: v,
                        })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-red-600">Do Not Contact</Label>
                      <p className="text-xs text-muted-foreground">Block all outreach</p>
                    </div>
                    <Switch
                      checked={selectedCustomer.do_not_contact || false}
                      onCheckedChange={(v) =>
                        updateConsentMutation.mutate({
                          customerId: selectedCustomer.id,
                          field: "do_not_contact",
                          value: v,
                        })
                      }
                    />
                  </div>
                </div>
                {selectedCustomer.do_not_contact && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Do Not Contact Active</span>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Data
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsComplianceDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
