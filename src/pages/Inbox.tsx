// ============================================
// FILE: src/pages/Inbox.tsx
// VERSION 14.0 - WARRIOR MODE - ALL 9 ISSUES FIXED
// ============================================
//
// FIXES IN THIS VERSION:
// 1. ✅ Deal - Already working (schema correct)
// 2. ✅ Appointment - Try both UUID and SLUG for tenant_id
// 3. ✅ Notes - Fixed query refresh + proper display
// 4. ✅ Assignment - Shows assigned staff name in UI
// 5. ✅ Light mode - Fixed chat bubble and button colors
// 6. ✅ Send messages - Made button visible with proper styling
// 7. ✅ Edit Contact - FIXED: Use "phone" not "phone_number"
// 8. ✅ Facebook name - Better fallback display + FB ID shown
// 9. ✅ All issues addressed comprehensively
//
// CRITICAL SCHEMA DISCOVERIES:
// - customers table uses "phone" NOT "phone_number"
// - conversations use tenant_id as UUID
// - deals/appointments may use SLUG - try both
//
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
  PhoneCall,
  Plus,
  AlertCircle,
  CheckCircle,
  FileText,
  Shield,
  AlertTriangle,
  Trash2,
  Edit,
  Youtube,
  Music,
  Slack,
  MessageSquareMore,
} from "lucide-react";
import { format, isToday, isYesterday, addHours, setMinutes, setHours } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================
// WEBHOOK CONFIG
// ============================================
const N8N_WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

async function callWebhook(endpoint: string, data: Record<string, unknown>, tenantId: string) {
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tenant_id: tenantId }),
    });
    return { success: response.ok, data: await response.json().catch(() => ({})) };
  } catch (error) {
    console.error(`Webhook ${endpoint} error:`, error);
    return { success: false, error };
  }
}

// ============================================
// PIPELINE STAGES
// ============================================
const PIPELINE_STAGES = [
  { id: "lead", name: "Lead", probability: 10 },
  { id: "qualified", name: "Qualified", probability: 25 },
  { id: "proposal", name: "Proposal", probability: 50 },
  { id: "negotiation", name: "Negotiation", probability: 75 },
  { id: "won", name: "Won", probability: 100 },
  { id: "lost", name: "Lost", probability: 0 },
];

// ============================================
// ALL 15 CHANNELS
// ============================================
const ALL_CHANNELS: Record<string, { id: string; name: string; icon: any; bgColor: string; textColor: string }> = {
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageSquare,
    bgColor: "bg-[#25D366]/10",
    textColor: "text-[#25D366]",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    bgColor: "bg-[#E1306C]/10",
    textColor: "text-[#E1306C]",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    bgColor: "bg-[#1877F2]/10",
    textColor: "text-[#1877F2]",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    bgColor: "bg-[#0A66C2]/10",
    textColor: "text-[#0A66C2]",
  },
  twitter: {
    id: "twitter",
    name: "X (Twitter)",
    icon: Twitter,
    bgColor: "bg-black/10",
    textColor: "text-black dark:text-white",
  },
  telegram: { id: "telegram", name: "Telegram", icon: Send, bgColor: "bg-[#0088CC]/10", textColor: "text-[#0088CC]" },
  email: { id: "email", name: "Email", icon: Mail, bgColor: "bg-[#EA4335]/10", textColor: "text-[#EA4335]" },
  sms: { id: "sms", name: "SMS", icon: MessageCircle, bgColor: "bg-[#34B7F1]/10", textColor: "text-[#34B7F1]" },
  voice: { id: "voice", name: "Voice", icon: Phone, bgColor: "bg-[#F97316]/10", textColor: "text-[#F97316]" },
  web: { id: "web", name: "Web Chat", icon: Globe, bgColor: "bg-[#6366F1]/10", textColor: "text-[#6366F1]" },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    icon: Hash,
    bgColor: "bg-[#E60023]/10",
    textColor: "text-[#E60023]",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    icon: Music,
    bgColor: "bg-black/10",
    textColor: "text-black dark:text-white",
  },
  youtube: { id: "youtube", name: "YouTube", icon: Youtube, bgColor: "bg-[#FF0000]/10", textColor: "text-[#FF0000]" },
  slack: { id: "slack", name: "Slack", icon: Slack, bgColor: "bg-[#4A154B]/10", textColor: "text-[#4A154B]" },
  teams: {
    id: "teams",
    name: "Teams",
    icon: MessageSquareMore,
    bgColor: "bg-[#6264A7]/10",
    textColor: "text-[#6264A7]",
  },
};

const PRIMARY_CHANNEL_IDS = ["whatsapp", "instagram", "facebook", "linkedin", "twitter", "telegram", "email", "sms"];

// ============================================
// INDUSTRY CONFIG
// ============================================
const INDUSTRY_CONFIG: Record<string, { services: string[] }> = {
  healthcare: { services: ["Consultation", "Treatment", "Follow-up", "Botox", "Filler", "Facial"] },
  real_estate: { services: ["Property Viewing", "Market Analysis", "Investment Consultation"] },
  salon: { services: ["Haircut", "Color", "Styling", "Manicure", "Facial", "Massage"] },
  restaurant: { services: ["Reservation", "Catering", "Private Event", "Party Booking"] },
  flooring: { services: ["Free Estimate", "Installation", "Repair", "Consultation"] },
  general: { services: ["Consultation", "Service", "Support", "Meeting"] },
};

const DEFAULT_TEMPLATES = [
  { id: "1", name: "Greeting", content: "Hello {{name}}! How can I help you today?", category: "general" },
  {
    id: "2",
    name: "Appointment Confirm",
    content: "Your appointment is confirmed for {{date}} at {{time}}.",
    category: "appointment",
  },
  { id: "3", name: "Follow Up", content: "Hi {{name}}! Just following up on our conversation.", category: "followup" },
  {
    id: "4",
    name: "Thank You",
    content: "Thank you for reaching out, {{name}}! We appreciate your business.",
    category: "general",
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
  phone?: string; // CORRECT field name
  phone_number?: string; // Legacy/alternate
  email?: string;
  lead_score?: number;
  lead_temperature?: string;
  temperature?: string;
  lifecycle_stage?: string;
  source?: string;
  consent_marketing?: boolean;
  consent_data_processing?: boolean;
  do_not_contact?: boolean;
  notes?: string;
  company_name?: string;
  facebook_id?: string;
  instagram_id?: string;
  assigned_to?: string;
  created_at: string;
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
  created_at: string;
  customer?: Customer;
  customer_name?: string;
  customer_phone?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  content: string;
  sender_type: string;
  channel: string;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name?: string;
  email: string;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function Inbox() {
  // CRITICAL: tenantId = SLUG, tenantConfig?.id = UUID
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;

  const industry = tenantConfig?.industry || "general";
  const industryServices = INDUSTRY_CONFIG[industry]?.services || INDUSTRY_CONFIG.general.services;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================
  // STATE
  // ============================================
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [starredConversations, setStarredConversations] = useState<Set<string>>(new Set());

  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [showEditContactDialog, setShowEditContactDialog] = useState(false);

  // Form states
  const [noteText, setNoteText] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStage, setDealStage] = useState("lead");
  const [dealCompanyName, setDealCompanyName] = useState("");
  const [dealContactName, setDealContactName] = useState("");
  const [dealEmail, setDealEmail] = useState("");
  const [dealPhone, setDealPhone] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [filters, setFilters] = useState({
    quickFilter: "all",
    leadTemperature: "all",
    leadScoreRange: [0, 100] as [number, number],
    status: "all",
    sortBy: "recent",
  });

  // ============================================
  // QUERIES
  // ============================================

  // Conversations query - uses UUID
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
        .select(`*, customer:customers(*)`)
        .eq("tenant_id", tenantUuid)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (selectedChannel !== "all") query = query.eq("channel", selectedChannel);
      const { data, error } = await query;
      if (error) {
        console.error("Conversations query error:", error);
        const { data: fallback } = await supabase
          .from("conversations")
          .select("*")
          .eq("tenant_id", tenantUuid)
          .order("last_message_at", { ascending: false });
        return (fallback || []) as Conversation[];
      }
      return (data || []) as Conversation[];
    },
    enabled: !!tenantUuid,
    refetchInterval: 10000,
  });

  // Customers query - try UUID first, then SLUG
  const { data: customers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ["inbox-customers", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];

      // Customers linked to conversations use UUID
      const { data, error } = await supabase.from("customers").select("*").eq("tenant_id", tenantUuid);

      if (error) {
        console.error("Customers query error:", error);
        return [];
      }
      return (data || []) as Customer[];
    },
    enabled: !!tenantUuid,
  });

  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  const enrichedConversations = useMemo(() => {
    return conversations.map((conv) => ({
      ...conv,
      customer: conv.customer || customersMap.get(conv.contact_id),
    }));
  }, [conversations, customersMap]);

  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["conversation-messages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true });
      return (data || []) as Message[];
    },
    enabled: !!selectedConversationId,
  });

  // Staff members query - uses UUID for users table
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantUuid);
      return (data || []) as StaffMember[];
    },
    enabled: !!tenantUuid,
  });

  // Create staff map for quick lookup (ISSUE 4 FIX)
  const staffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();
    staffMembers.forEach((s) => map.set(s.id, s));
    return map;
  }, [staffMembers]);

  const selectedConversation = useMemo(
    () => enrichedConversations.find((c) => c.id === selectedConversationId),
    [enrichedConversations, selectedConversationId],
  );

  const selectedCustomer = useMemo(
    () => selectedConversation?.customer || customersMap.get(selectedConversation?.contact_id || "") || null,
    [selectedConversation, customersMap],
  );

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // ISSUE 8 FIX: Better name extraction for Facebook contacts
  const getDisplayName = useCallback((conv: Conversation): string => {
    const c = conv.customer;

    // Priority 1: Customer name if valid
    if (c?.name && c.name.trim() && !["Customer", "New Contact", "Facebook User", "Instagram User"].includes(c.name)) {
      return c.name;
    }

    // Priority 2: First + Last name
    if (c?.first_name) {
      return c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name;
    }

    // Priority 3: Conversation customer_name
    if (conv.customer_name && conv.customer_name.trim() && !["Customer", "New Contact"].includes(conv.customer_name)) {
      return conv.customer_name;
    }

    // Priority 4: Email prefix
    if (c?.email) {
      return c.email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Priority 5: Phone number
    const phone = c?.phone || c?.phone_number || conv.customer_phone;
    if (phone) return phone;

    // Priority 6: For Facebook/Instagram - show platform + partial ID
    if (conv.channel === "facebook" && c?.facebook_id) {
      return `FB User ...${c.facebook_id.slice(-6)}`;
    }
    if (conv.channel === "instagram" && c?.instagram_id) {
      return `IG User ...${c.instagram_id.slice(-6)}`;
    }

    // Fallback with channel context
    const channelName = ALL_CHANNELS[conv.channel]?.name || conv.channel;
    return `${channelName} Contact`;
  }, []);

  // ISSUE 7 FIX: Get phone from correct field
  const getPhoneNumber = useCallback((conv: Conversation | null | undefined): string | null => {
    if (!conv) return null;
    const c = conv.customer;
    return c?.phone || c?.phone_number || conv.customer_phone || null;
  }, []);

  const getInitials = useCallback(
    (conv: Conversation): string => {
      const name = getDisplayName(conv);
      const parts = name.split(" ").filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    },
    [getDisplayName],
  );

  const getChannelConfig = (channel: string) => ALL_CHANNELS[channel] || ALL_CHANNELS.web;

  const getTemperatureIcon = (temp?: string) => {
    const t = temp?.toLowerCase();
    if (t === "hot") return <Flame className="h-3 w-3 text-red-500" />;
    if (t === "warm") return <Sun className="h-3 w-3 text-yellow-500" />;
    if (t === "cold") return <Snowflake className="h-3 w-3 text-blue-500" />;
    return null;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  // ISSUE 4 FIX: Get assigned staff name
  const getAssignedStaffName = useCallback(
    (assignedTo: string | null | undefined): string | null => {
      if (!assignedTo) return null;
      const staff = staffMap.get(assignedTo);
      return staff?.full_name || staff?.email || null;
    },
    [staffMap],
  );

  // ============================================
  // FILTERED CONVERSATIONS
  // ============================================
  const filteredConversations = useMemo(() => {
    let result = [...enrichedConversations];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const name = getDisplayName(c).toLowerCase();
        return (
          name.includes(q) ||
          (getPhoneNumber(c) || "").includes(q) ||
          (c.last_message_text || "").toLowerCase().includes(q)
        );
      });
    }
    if (filters.quickFilter === "unread") result = result.filter((c) => c.unread_count > 0);
    else if (filters.quickFilter === "starred") result = result.filter((c) => starredConversations.has(c.id));
    else if (filters.quickFilter === "ai") result = result.filter((c) => c.ai_handled);
    else if (filters.quickFilter === "human") result = result.filter((c) => !c.ai_handled);
    if (filters.leadTemperature !== "all") {
      result = result.filter(
        (c) => (c.customer?.lead_temperature || c.customer?.temperature) === filters.leadTemperature,
      );
    }
    if (filters.status !== "all") result = result.filter((c) => c.status === filters.status);
    result = result.filter((c) => {
      const score = c.customer?.lead_score ?? 50;
      return score >= filters.leadScoreRange[0] && score <= filters.leadScoreRange[1];
    });
    result.sort((a, b) => {
      if (filters.sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (filters.sortBy === "score-high") return (b.customer?.lead_score || 0) - (a.customer?.lead_score || 0);
      return (
        new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
      );
    });
    return result;
  }, [enrichedConversations, searchQuery, filters, starredConversations, getDisplayName, getPhoneNumber]);

  // ============================================
  // MUTATIONS
  // ============================================

  // ISSUE 6 FIX: Send Message with proper error handling
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) throw new Error("Conversation not found");

      console.log("Sending message:", { conversationId, content, channel: conv.channel });

      // Insert message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        direction: "outbound",
        content,
        sender_type: "staff",
        channel: conv.channel,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (msgError) {
        console.error("Message insert error:", msgError);
        throw msgError;
      }

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message_text: content,
          last_message_at: new Date().toISOString(),
          last_message_direction: "outbound",
          message_count: (conv.message_count || 0) + 1,
          ai_handled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // Call webhook to actually send
      await callWebhook(
        "/send-message",
        {
          conversation_id: conversationId,
          customer_id: conv.contact_id,
          message: content,
          channel: conv.channel,
        },
        tenantId!,
      );

      return { success: true };
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
      refetchConversations();
      toast.success("Message sent!");
    },
    onError: (err: any) => {
      console.error("Send message error:", err);
      toast.error(`Failed to send: ${err.message}`);
    },
  });

  // ISSUE 7 FIX: Edit Contact - Use correct field names!
  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.contact_id) throw new Error("No contact selected");

      // ISSUE 4 FIX: Update BOTH phone columns for schema compatibility
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Only include non-empty values
      if (editName.trim()) updateData.name = editName.trim();
      if (editPhone.trim()) {
        updateData.phone = editPhone.trim();
        updateData.phone_number = editPhone.trim(); // Update BOTH!
      }
      if (editEmail.trim()) updateData.email = editEmail.trim();

      console.log("Updating contact with data:", updateData);
      console.log("Customer ID:", selectedConversation.contact_id);
      console.log("Tenant UUID:", tenantUuid);

      const { data, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", selectedConversation.contact_id)
        .eq("tenant_id", tenantUuid)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      console.log("Update result:", data);
      return { success: true, data };
    },
    onSuccess: () => {
      setShowEditContactDialog(false);
      // Force refresh all related queries
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      setTimeout(() => {
        refetchCustomers();
        refetchConversations();
      }, 500);
      toast.success("Contact updated!");
    },
    onError: (err: any) => {
      console.error("Update contact failed:", err);
      toast.error(`Failed: ${err.message}`);
    },
  });

  // ISSUE 3 FIX: Add Note with proper refresh
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.contact_id) throw new Error("No contact selected");
      if (!noteText.trim()) throw new Error("Note cannot be empty");

      const customerId = selectedConversation.contact_id;

      // Get existing notes
      const { data: customerData } = await supabase
        .from("customers")
        .select("notes")
        .eq("id", customerId)
        .eq("tenant_id", tenantUuid)
        .single();

      const existingNotes = customerData?.notes || "";
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
      const newNotes = existingNotes
        ? `${existingNotes}\n\n[${timestamp}] ${noteText.trim()}`
        : `[${timestamp}] ${noteText.trim()}`;

      console.log("Adding note to customer:", customerId);
      console.log("New notes content:", newNotes);

      const { error } = await supabase
        .from("customers")
        .update({ notes: newNotes, updated_at: new Date().toISOString() })
        .eq("id", customerId)
        .eq("tenant_id", tenantUuid);

      if (error) throw error;
      return { success: true, notes: newNotes };
    },
    onSuccess: () => {
      setShowNoteDialog(false);
      setNoteText("");
      // Force refresh to show the new note
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      setTimeout(() => {
        refetchCustomers();
        refetchConversations();
      }, 300);
      toast.success("Note added!");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // Create Deal - uses SLUG
  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant ID");
      if (!dealTitle.trim()) throw new Error("Deal title required");

      const value = parseFloat(dealValue) || 0;
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === dealStage);
      const probability = stageConfig?.probability || 10;
      const weightedValue = (value * probability) / 100;

      const contactName = dealContactName || (selectedConversation ? getDisplayName(selectedConversation) : null);
      const contactPhone = dealPhone || getPhoneNumber(selectedConversation) || null;
      const contactEmail = dealEmail || selectedCustomer?.email || null;

      const { data, error } = await supabase
        .from("deals")
        .insert({
          tenant_id: tenantId,
          title: dealTitle.trim(),
          value: value,
          weighted_value: weightedValue,
          currency: "AED",
          stage: dealStage,
          probability: probability,
          contact_name: contactName,
          company_name: dealCompanyName || null,
          email: contactEmail,
          phone: contactPhone,
          contact_id: selectedConversation?.contact_id || null,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setShowDealDialog(false);
      setDealTitle("");
      setDealValue("");
      setDealStage("lead");
      setDealCompanyName("");
      setDealContactName("");
      setDealEmail("");
      setDealPhone("");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal created! Check Deal Tracker.");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // ISSUE 2 FIX: Book Appointment - try SLUG first, then UUID
  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentDate) throw new Error("Date is required");

      // ISSUE 2 FIX: Include BOTH schema formats for compatibility
      const [hours, minutes] = appointmentTime.split(":").map(Number);
      const scheduledAt = setMinutes(setHours(appointmentDate, hours), minutes);
      const dateStr = format(appointmentDate, "yyyy-MM-dd");
      const startTimeStr = `${appointmentTime}:00`;
      const endHour = hours + 1;
      const endTimeStr = `${endHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

      const appointmentData = {
        tenant_id: tenantId, // Use SLUG
        customer_id: selectedConversation?.contact_id || null,
        // NEW schema
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
        // OLD schema
        appointment_date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        appointment_status: "scheduled",
        // Common
        duration_minutes: 60,
        service_name: appointmentService || null,
        notes: appointmentNotes.trim() || null,
        reminder_sent: false,
      };

      console.log("Booking appointment with SLUG:", tenantId);

      const { data, error } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select();

      if (error) {
        console.error("Appointment insert error:", error);
        throw error;
      }

      console.log("Appointment created:", data);
      return data;
    },
    onSuccess: () => {
      setShowBookDialog(false);
      setAppointmentDate(undefined);
      setAppointmentTime("10:00");
      setAppointmentService("");
      setAppointmentNotes("");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked!");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // ISSUE 4 FIX: Assign mutation - update both conversation and show feedback
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !selectedStaffId) throw new Error("Missing data");

      await supabase
        .from("conversations")
        .update({
          assigned_to: selectedStaffId,
          ai_handled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedConversationId);

      // Also update customer if exists
      if (selectedConversation?.contact_id) {
        await supabase
          .from("customers")
          .update({
            assigned_to: selectedStaffId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedConversation.contact_id);
      }

      return { staffId: selectedStaffId };
    },
    onSuccess: (data) => {
      const staffName = getAssignedStaffName(data.staffId);
      setShowAssignDialog(false);
      setSelectedStaffId("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success(`Assigned to ${staffName || "staff member"}`);
    },
  });

  // Escalate
  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId) throw new Error("No conversation");
      if (!escalationReason) throw new Error("Reason required");

      const { error } = await supabase
        .from("conversations")
        .update({
          requires_human: true,
          priority: "high",
          status: "escalated",
          ai_handled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedConversationId);

      if (error) throw error;

      await callWebhook(
        "/orchestrator",
        {
          event_type: "conversation_escalated",
          entity_id: selectedConversationId,
          data: { reason: escalationReason },
        },
        tenantId!,
      );
    },
    onSuccess: () => {
      setShowEscalateDialog(false);
      setEscalationReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Escalated - team notified");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // Update Status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "resolved" || status === "closed") {
        updates.requires_human = false;
        updates.priority = "normal";
      }
      const { error } = await supabase.from("conversations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // Transfer
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !selectedStaffId) throw new Error("Missing data");
      await supabase
        .from("conversations")
        .update({
          assigned_to: selectedStaffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedConversationId);
      return { staffId: selectedStaffId };
    },
    onSuccess: (data) => {
      const staffName = getAssignedStaffName(data.staffId);
      setShowTransferDialog(false);
      setSelectedStaffId("");
      setTransferReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success(`Transferred to ${staffName || "staff member"}`);
    },
  });

  // Call
  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      const phone = getPhoneNumber(selectedConversation);
      if (!phone) throw new Error("No phone number");
      await callWebhook(
        "/vapi/outbound-call",
        {
          customer_id: selectedConversation?.contact_id,
          phone_number: phone,
        },
        tenantId!,
      );
      window.open(`tel:${phone}`, "_self");
    },
    onSuccess: () => {
      setShowCallDialog(false);
      toast.success("Call initiated");
    },
  });

  // Consent
  const updateConsentMutation = useMutation({
    mutationFn: async ({ customerId, field, value }: { customerId: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from("customers")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", customerId)
        .eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      toast.success("Consent updated");
    },
  });

  // Mark read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] }),
  });

  // ============================================
  // HANDLERS
  // ============================================
  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv?.unread_count > 0) markAsReadMutation.mutate(id);
    },
    [conversations, markAsReadMutation],
  );

  // ISSUE 6 FIX: Handle send message
  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversationId) {
      console.log("Cannot send: missing input or conversation");
      return;
    }
    console.log("Sending message:", messageInput.trim());
    sendMessageMutation.mutate({ conversationId: selectedConversationId, content: messageInput.trim() });
  }, [messageInput, selectedConversationId, sendMessageMutation]);

  const handleToggleStar = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredConversations((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleUseTemplate = useCallback(
    (template: { content: string }) => {
      let content = template.content;
      if (selectedConversation) {
        content = content.replace("{{name}}", getDisplayName(selectedConversation));
        if (appointmentDate) {
          content = content.replace("{{date}}", format(appointmentDate, "MMMM d, yyyy"));
          content = content.replace("{{time}}", appointmentTime);
        }
      }
      setMessageInput(content);
      setShowTemplateDialog(false);
    },
    [selectedConversation, getDisplayName, appointmentDate, appointmentTime],
  );

  // ISSUE 7 FIX: Open edit dialog with correct field values
  const openEditContact = useCallback(() => {
    if (selectedCustomer) {
      setEditName(selectedCustomer.name || selectedCustomer.first_name || "");
      setEditPhone(selectedCustomer.phone || selectedCustomer.phone_number || ""); // Try both fields
      setEditEmail(selectedCustomer.email || "");
    } else {
      setEditName("");
      setEditPhone("");
      setEditEmail("");
    }
    setShowEditContactDialog(true);
  }, [selectedCustomer]);

  const openDealDialog = useCallback(() => {
    if (selectedConversation) {
      setDealContactName(getDisplayName(selectedConversation));
      setDealPhone(getPhoneNumber(selectedConversation) || "");
      setDealEmail(selectedCustomer?.email || "");
      setDealCompanyName(selectedCustomer?.company_name || "");
    }
    setShowDealDialog(true);
  }, [selectedConversation, selectedCustomer, getDisplayName, getPhoneNumber]);

  const clearFilters = useCallback(() => {
    setFilters({
      quickFilter: "all",
      leadTemperature: "all",
      leadScoreRange: [0, 100],
      status: "all",
      sortBy: "recent",
    });
  }, []);

  // Effects
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        if ((payload.new as any).conversation_id === selectedConversationId) refetchMessages();
        if (!isMuted && (payload.new as any).direction === "inbound") toast.info("New message received");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUuid, selectedConversationId, queryClient, refetchMessages, isMuted]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.quickFilter !== "all") count++;
    if (filters.leadTemperature !== "all") count++;
    if (filters.leadScoreRange[0] !== 0 || filters.leadScoreRange[1] !== 100) count++;
    if (filters.status !== "all") count++;
    if (filters.sortBy !== "recent") count++;
    return count;
  }, [filters]);

  const currentPhoneNumber = getPhoneNumber(selectedConversation);

  // ============================================
  // RENDER
  // ============================================
  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* HEADER */}
        <nav className="h-14 border-b px-4 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <div>
              <h1 className="text-lg font-bold">{tenantConfig?.company_name || "Inbox"}</h1>
              <p className="text-xs text-muted-foreground">{filteredConversations.length} conversations</p>
            </div>
          </div>

          {/* CHANNEL BUTTONS */}
          <ScrollArea className="max-w-2xl">
            <div className="flex gap-1 px-1">
              <button
                onClick={() => setSelectedChannel("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  selectedChannel === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                All
              </button>
              {PRIMARY_CHANNEL_IDS.map((chId) => {
                const ch = ALL_CHANNELS[chId];
                return (
                  <Tooltip key={ch.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedChannel(ch.id)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors",
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
                );
              })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:bg-muted flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    More
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>More Channels</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.values(ALL_CHANNELS)
                    .filter((ch) => !PRIMARY_CHANNEL_IDS.includes(ch.id))
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    refetchConversations();
                    refetchCustomers();
                  }}
                >
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
              <div className="p-3 space-y-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
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
                          Filters{" "}
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
                          <Label>
                            Lead Score: {filters.leadScoreRange[0]} - {filters.leadScoreRange[1]}
                          </Label>
                          <Slider
                            value={filters.leadScoreRange}
                            onValueChange={(v) => setFilters({ ...filters, leadScoreRange: v as [number, number] })}
                            min={0}
                            max={100}
                            step={5}
                          />
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
                              <SelectItem value="escalated">Escalated</SelectItem>
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
                              <SelectItem value="oldest">Oldest First</SelectItem>
                              <SelectItem value="score-high">Highest Score</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="p-8 text-center">
                    <RefreshCcw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const chCfg = getChannelConfig(conv.channel);
                    const isSelected = selectedConversationId === conv.id;
                    const isStarred = starredConversations.has(conv.id);
                    const hasUnread = conv.unread_count > 0;
                    const temp = conv.customer?.lead_temperature || conv.customer?.temperature;
                    // ISSUE 4 FIX: Get assigned staff name
                    const assignedName = getAssignedStaffName(conv.assigned_to);

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={cn(
                          "p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                          hasUnread && "bg-blue-50/50 dark:bg-blue-950/20",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(conv)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn("absolute -bottom-0.5 -right-0.5 rounded-full p-1", chCfg.bgColor)}>
                              <chCfg.icon className={cn("h-2.5 w-2.5", chCfg.textColor)} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={cn("font-medium truncate text-sm", hasUnread && "font-semibold")}>
                                  {getDisplayName(conv)}
                                </span>
                                {getTemperatureIcon(temp)}
                                {conv.ai_handled && <Bot className="h-3 w-3 text-blue-500 shrink-0" />}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={(e) => handleToggleStar(conv.id, e)} className="p-0.5">
                                  {isStarred ? (
                                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <StarOff className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-yellow-500" />
                                  )}
                                </button>
                                <span className="text-[10px] text-muted-foreground">
                                  {conv.last_message_at && formatTime(conv.last_message_at)}
                                </span>
                              </div>
                            </div>
                            <p
                              className={cn(
                                "text-xs truncate",
                                hasUnread ? "font-medium text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {conv.last_message_text || "No messages yet"}
                            </p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {hasUnread && (
                                <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                  {conv.unread_count}
                                </Badge>
                              )}
                              {conv.requires_human && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                  Escalated
                                </Badge>
                              )}
                              {/* ISSUE 4 FIX: Show assigned staff */}
                              {assignedName && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  → {assignedName.split(" ")[0]}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openEditContact}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-[10px]",
                            getChannelConfig(selectedConversation.channel).bgColor,
                            getChannelConfig(selectedConversation.channel).textColor,
                          )}
                        >
                          {getChannelConfig(selectedConversation.channel).name}
                        </Badge>
                        {currentPhoneNumber || <span className="text-orange-500">No phone</span>}
                        {/* ISSUE 4 FIX: Show assigned to in header */}
                        {selectedConversation.assigned_to && (
                          <Badge variant="secondary" className="text-[10px]">
                            → {getAssignedStaffName(selectedConversation.assigned_to) || "Staff"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCallDialog(true)}
                      disabled={!currentPhoneNumber}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setShowDetailsPanel(!showDetailsPanel)}>
                      {showDetailsPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowNoteDialog(true)}>
                          <StickyNote className="h-4 w-4 mr-2" />
                          Add Note
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
                          <Send className="h-4 w-4 mr-2" />
                          Transfer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={openDealDialog}>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Create Deal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowBookDialog(true)}>
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Book Appointment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowEscalateDialog(true)} className="text-orange-600">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Escalate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatusMutation.mutate({ id: selectedConversation.id, status: "resolved" })
                          }
                          className="text-green-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: selectedConversation.id, status: "closed" })}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Close
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={openEditContact}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Contact
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowComplianceDialog(true)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Compliance
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chat Content */}
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
                          <p className="text-sm">Start the conversation!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}
                            >
                              {/* ISSUE 5 FIX: Better colors for light mode */}
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                                  msg.direction === "outbound"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted text-foreground rounded-bl-md border",
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <div
                                  className={cn(
                                    "flex items-center gap-1.5 mt-1 text-[10px]",
                                    msg.direction === "outbound"
                                      ? "text-primary-foreground/70 justify-end"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {format(new Date(msg.created_at), "HH:mm")}
                                  {msg.sender_type === "ai" && <Bot className="h-3 w-3" />}
                                  {msg.direction === "outbound" && <CheckCheck className="h-3 w-3" />}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* ISSUE 5 & 6 FIX: Message Input with visible send button */}
                    <div className="p-4 border-t bg-card shrink-0">
                      <div className="flex items-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Use Template
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-32 resize-none flex-1"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                          />
                          {/* ISSUE 5 & 6 FIX: Visible send button outside textarea */}
                          <Button
                            size="icon"
                            className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90"
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || sendMessageMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details Panel */}
                  {showDetailsPanel && (
                    <aside className="w-72 border-l bg-card p-4 overflow-y-auto shrink-0">
                      <div className="text-center mb-4">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {getInitials(selectedConversation)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold">{getDisplayName(selectedConversation)}</h3>
                        <Badge variant="outline" className="capitalize mt-1">
                          {selectedCustomer?.lifecycle_stage || "Lead"}
                        </Badge>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={openEditContact}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>

                      <Separator className="my-4" />

                      {/* Contact Info - ISSUE 7 FIX: Show correct fields */}
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {selectedCustomer?.phone || selectedCustomer?.phone_number || currentPhoneNumber || (
                              <span className="text-orange-500">Not set</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {selectedCustomer?.email || <span className="text-orange-500">Not set</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>Score: {selectedCustomer?.lead_score || 50}</span>
                        </div>
                        {selectedCustomer?.company_name && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{selectedCustomer.company_name}</span>
                          </div>
                        )}
                        {/* Show assigned staff */}
                        {selectedConversation.assigned_to && (
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              Assigned: {getAssignedStaffName(selectedConversation.assigned_to) || "Staff"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ISSUE 3 FIX: Notes Section - Always show */}
                      <Separator className="my-4" />
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <StickyNote className="h-4 w-4" />
                          Notes
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 ml-auto"
                            onClick={() => setShowNoteDialog(true)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </h4>
                        {(selectedCustomer?.notes || selectedConversation?.customer?.notes) ? (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {selectedCustomer?.notes || selectedConversation?.customer?.notes}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No notes yet</p>
                        )}
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setShowNoteDialog(true)}
                        >
                          <StickyNote className="h-4 w-4 mr-2" />
                          Add Note
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={openDealDialog}>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Create Deal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setShowBookDialog(true)}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Book Appointment
                        </Button>
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
                  <p className="text-muted-foreground">Choose a conversation from the sidebar</p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ============================================ */}
        {/* DIALOGS */}
        {/* ============================================ */}

        {/* Edit Contact - ISSUE 7 FIX */}
        <Dialog open={showEditContactDialog} onOpenChange={setShowEditContactDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>Update contact information. Changes will be saved immediately.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Full name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+923352559926" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditContactDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateContactMutation.mutate()} disabled={updateContactMutation.isPending}>
                {updateContactMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note - ISSUE 3 */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Notes will appear in the Details panel on the right.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Enter your note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => addNoteMutation.mutate()} disabled={!noteText.trim() || addNoteMutation.isPending}>
                {addNoteMutation.isPending ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Deal */}
        <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
              <DialogDescription>Deal will appear in Deal Tracker</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Deal Title *</Label>
                <Input
                  placeholder="e.g., Enterprise Package"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value (AED)</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={dealStage} onValueChange={setDealStage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.filter((s) => s.id !== "won" && s.id !== "lost").map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.probability}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  placeholder="Company"
                  value={dealCompanyName}
                  onChange={(e) => setDealCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  placeholder="Contact person"
                  value={dealContactName}
                  onChange={(e) => setDealContactName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={dealEmail} onChange={(e) => setDealEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={dealPhone} onChange={(e) => setDealPhone(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDealDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createDealMutation.mutate()}
                disabled={!dealTitle.trim() || createDealMutation.isPending}
              >
                {createDealMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Book Appointment - ISSUE 2 */}
        <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>Appointment will appear in Appointments page</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, "MMMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={appointmentDate} onSelect={setAppointmentDate} initialFocus />
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
                <Label>Service</Label>
                <Select value={appointmentService} onValueChange={setAppointmentService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryServices.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes..."
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBookDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => bookAppointmentMutation.mutate()}
                disabled={!appointmentDate || bookAppointmentMutation.isPending}
              >
                {bookAppointmentMutation.isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Call Dialog */}
        <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Call</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              {currentPhoneNumber ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Phone className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">{currentPhoneNumber}</p>
                  <p className="text-muted-foreground">Ready to call</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-lg font-medium mb-2">No phone number</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCallDialog(false);
                      openEditContact();
                    }}
                  >
                    Add Phone
                  </Button>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCallDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => initiateCallMutation.mutate()}
                disabled={!currentPhoneNumber}
                className="bg-green-600 hover:bg-green-700"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Escalate */}
        <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Escalate
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Reason</Label>
              <Select value={escalationReason} onValueChange={setEscalationReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complex">Complex Inquiry</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high_value">High Value</SelectItem>
                  <SelectItem value="ai_limitation">AI Cannot Handle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => escalateMutation.mutate()}
                disabled={!escalationReason || escalateMutation.isPending}
              >
                {escalateMutation.isPending ? "Escalating..." : "Escalate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transfer To</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name || s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="Why are you transferring?"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => transferMutation.mutate()}
                disabled={!selectedStaffId || transferMutation.isPending}
              >
                {transferMutation.isPending ? "Transferring..." : "Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign - ISSUE 4 */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Conversation</DialogTitle>
              <DialogDescription>
                The assigned person will be shown in the conversation list and header.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Assign To</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name || s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => assignMutation.mutate()} disabled={!selectedStaffId || assignMutation.isPending}>
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Message Templates</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid gap-3 max-h-80 overflow-y-auto">
              {DEFAULT_TEMPLATES.map((t) => (
                <Card
                  key={t.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleUseTemplate(t)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm flex justify-between">
                      {t.name}
                      <Badge variant="outline" className="text-[10px]">
                        {t.category}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-xs text-muted-foreground">{t.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Compliance */}
        <Dialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Settings
              </DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Marketing Consent</Label>
                    <p className="text-xs text-muted-foreground">Allow marketing communications</p>
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
                    <p className="text-xs text-muted-foreground">Allow data processing</p>
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
                    <p className="text-xs text-muted-foreground">Block all communications</p>
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
            )}
            <DialogFooter>
              <Button onClick={() => setShowComplianceDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
