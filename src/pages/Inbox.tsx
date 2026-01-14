// ============================================
// FILE: src/pages/Inbox.tsx
// VERSION 8.0 - USES EXACT WORKING SCHEMA
// ============================================
//
// SCHEMA FIXES (Matching Deals.tsx and Appointments.tsx):
// ✅ Deals: title, company_name, contact_name, value, stage, probability, weighted_value
// ✅ Appointments: customer_id, scheduled_at, duration_minutes, status, notes
// ✅ All dialogs properly wired
// ✅ Details panel toggles correctly
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
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
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
    return { success: false, error: String(error) };
  }
}

// ============================================
// PIPELINE STAGES (from Deals.tsx)
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
// INDUSTRY CONFIG
// ============================================
const INDUSTRY_CONFIG: Record<string, { name: string; services: string[]; compliance: string[] }> = {
  healthcare: {
    name: "Healthcare",
    services: ["Consultation", "Treatment", "Follow-up", "Botox", "Filler"],
    compliance: ["HIPAA"],
  },
  real_estate: {
    name: "Real Estate",
    services: ["Property Viewing", "Market Analysis", "Investment Consultation"],
    compliance: ["Fair Housing"],
  },
  salon: {
    name: "Salon & Beauty",
    services: ["Haircut", "Color", "Styling", "Manicure", "Facial"],
    compliance: ["Product Safety"],
  },
  restaurant: {
    name: "Restaurant",
    services: ["Reservation", "Catering", "Private Event"],
    compliance: ["Food Safety"],
  },
  flooring: {
    name: "Flooring",
    services: ["Free Estimate", "Installation", "Repair"],
    compliance: ["Contractor License"],
  },
  general: { name: "General Business", services: ["Consultation", "Service", "Support"], compliance: ["Data Privacy"] },
};

// ============================================
// CHANNELS
// ============================================
const CHANNELS: Record<string, { id: string; name: string; icon: any; bgColor: string; textColor: string }> = {
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
  twitter: { id: "twitter", name: "X (Twitter)", icon: Twitter, bgColor: "bg-black/5", textColor: "text-black" },
  telegram: { id: "telegram", name: "Telegram", icon: Send, bgColor: "bg-[#0088CC]/10", textColor: "text-[#0088CC]" },
  email: { id: "email", name: "Email", icon: Mail, bgColor: "bg-[#EA4335]/10", textColor: "text-[#EA4335]" },
  sms: { id: "sms", name: "SMS", icon: MessageCircle, bgColor: "bg-[#34B7F1]/10", textColor: "text-[#34B7F1]" },
  voice: { id: "voice", name: "Voice", icon: Phone, bgColor: "bg-[#F97316]/10", textColor: "text-[#F97316]" },
  web: { id: "web", name: "Web Chat", icon: Globe, bgColor: "bg-[#6366F1]/10", textColor: "text-[#6366F1]" },
  pinterest: {
    id: "pinterest",
    name: "Pinterest",
    icon: Globe,
    bgColor: "bg-[#E60023]/10",
    textColor: "text-[#E60023]",
  },
  tiktok: { id: "tiktok", name: "TikTok", icon: Video, bgColor: "bg-black/5", textColor: "text-black" },
  youtube: { id: "youtube", name: "YouTube", icon: Video, bgColor: "bg-[#FF0000]/10", textColor: "text-[#FF0000]" },
  slack: { id: "slack", name: "Slack", icon: Hash, bgColor: "bg-[#4A154B]/10", textColor: "text-[#4A154B]" },
  teams: { id: "teams", name: "Teams", icon: Users, bgColor: "bg-[#6264A7]/10", textColor: "text-[#6264A7]" },
};

// Templates
const DEFAULT_TEMPLATES = [
  { id: "1", name: "Greeting", content: "Hello {{name}}! How can I help you today?", category: "general" },
  {
    id: "2",
    name: "Appointment Confirm",
    content: "Your appointment is confirmed for {{date}}. See you soon!",
    category: "appointment",
  },
  { id: "3", name: "Follow Up", content: "Hi {{name}}! Just following up on our conversation.", category: "followup" },
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
  phone?: string;
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
  facebook_id?: string;
  instagram_id?: string;
  whatsapp_id?: string;
  company_name?: string;
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
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const industry = tenantConfig?.industry || "general";
  const industryConfig = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.general;
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

  // DIALOG STATES
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

  // FORM STATES
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
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // EDIT CONTACT FORM
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [messageTemplates] = useState(DEFAULT_TEMPLATES);

  // FILTERS
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

  // Conversations with customer join
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

      if (selectedChannel !== "all") {
        query = query.eq("channel", selectedChannel);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Query error:", error);
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

  // Customers for enrichment
  const { data: customers = [] } = useQuery({
    queryKey: ["inbox-customers", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase.from("customers").select("*").eq("tenant_id", tenantUuid);
      return (data || []) as Customer[];
    },
    enabled: !!tenantUuid,
  });

  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Enrich conversations
  const enrichedConversations = useMemo(() => {
    return conversations.map((conv) => ({
      ...conv,
      customer: conv.customer || customersMap.get(conv.contact_id),
    }));
  }, [conversations, customersMap]);

  // Messages
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

  // Staff
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantUuid);
      return (data || []) as StaffMember[];
    },
    enabled: !!tenantUuid,
  });

  // Selected conversation and customer
  const selectedConversation = useMemo(
    () => enrichedConversations.find((c) => c.id === selectedConversationId),
    [enrichedConversations, selectedConversationId],
  );

  const selectedCustomer = useMemo(() => selectedConversation?.customer || null, [selectedConversation]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getDisplayName = useCallback((conv: Conversation): string => {
    const c = conv.customer;
    if (c?.name && c.name.trim() && c.name !== "Customer") return c.name;
    if (c?.first_name) return c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name;
    if (conv.customer_name && conv.customer_name.trim()) return conv.customer_name;
    if (c?.email)
      return c.email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    if (c?.phone_number || c?.phone) return c.phone_number || c.phone || "";
    if (conv.customer_phone) return conv.customer_phone;
    if (c?.facebook_id) return `FB ${c.facebook_id.slice(-6)}`;
    if (c?.instagram_id) return `IG ${c.instagram_id.slice(-6)}`;
    if (c?.whatsapp_id) return c.whatsapp_id;
    return "New Contact";
  }, []);

  const getPhoneNumber = useCallback((conv: Conversation): string | null => {
    const c = conv.customer;
    if (c?.phone_number) return c.phone_number;
    if (c?.phone) return c.phone;
    if (conv.customer_phone) return conv.customer_phone;
    if (c?.whatsapp_id && /^\+?\d{10,}$/.test(c.whatsapp_id)) return c.whatsapp_id;
    return null;
  }, []);

  const getEmail = useCallback((conv: Conversation): string | null => {
    return conv.customer?.email || null;
  }, []);

  const getInitials = useCallback(
    (conv: Conversation): string => {
      const name = getDisplayName(conv);
      const parts = name.split(" ");
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    },
    [getDisplayName],
  );

  const getChannelConfig = (channel: string) => CHANNELS[channel] || CHANNELS.web;

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
      result = result.filter((c) => {
        const temp = c.customer?.lead_temperature || c.customer?.temperature;
        return temp === filters.leadTemperature;
      });
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

  // Send Message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) throw new Error("Conversation not found");

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        tenant_id: tenantUuid,
        direction: "outbound",
        content,
        sender_type: "staff",
        channel: conv.channel,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      await supabase
        .from("conversations")
        .update({
          last_message_text: content,
          last_message_at: new Date().toISOString(),
          last_message_direction: "outbound",
          message_count: (conv.message_count || 0) + 1,
          ai_handled: false,
        })
        .eq("id", conversationId);

      await callWebhook(
        "/send-message",
        {
          conversation_id: conversationId,
          customer_id: conv.contact_id,
          message: content,
          channel: conv.channel,
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

  // CREATE DEAL - EXACT SCHEMA FROM Deals.tsx
  const createDealMutation = useMutation({
    mutationFn: async () => {
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === dealStage);
      const value = parseFloat(dealValue) || 0;
      const probability = stageConfig?.probability || 10;
      const weightedValue = (value * probability) / 100;

      // First try webhook (same as Deals.tsx)
      const webhookResponse = await fetch(`${N8N_WEBHOOK_BASE}/deal-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantUuid,
          title: dealTitle,
          value: value,
          stage: dealStage,
          company_name: dealCompanyName || selectedCustomer?.company_name || "",
          contact_name: dealContactName || getDisplayName(selectedConversation!),
          email: dealEmail || selectedCustomer?.email || "",
          phone: dealPhone || getPhoneNumber(selectedConversation!) || "",
        }),
      });

      if (!webhookResponse.ok) {
        // Fallback to direct insert (EXACT schema from Deals.tsx)
        const { error } = await supabase.from("deals").insert({
          tenant_id: tenantUuid,
          title: dealTitle,
          value: value,
          weighted_value: weightedValue,
          stage: dealStage,
          probability: probability,
          company_name: dealCompanyName || selectedCustomer?.company_name || "",
          contact_name: dealContactName || getDisplayName(selectedConversation!),
          email: dealEmail || selectedCustomer?.email || "",
          phone: dealPhone || getPhoneNumber(selectedConversation!) || "",
        });

        if (error) throw error;
      }

      // Update customer lifecycle
      if (selectedConversation?.contact_id) {
        await supabase
          .from("customers")
          .update({ lifecycle_stage: "opportunity" })
          .eq("id", selectedConversation.contact_id);
      }
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
      toast.success("Deal created!");
    },
    onError: (err) => {
      console.error("Deal error:", err);
      toast.error("Failed to create deal");
    },
  });

  // BOOK APPOINTMENT - EXACT SCHEMA FROM Appointments.tsx
  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentDate || !selectedConversation?.contact_id) {
        throw new Error("Missing date or customer");
      }

      const scheduledAt = new Date(appointmentDate);
      const [hours, minutes] = appointmentTime.split(":").map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // EXACT schema from Appointments.tsx
      const { error } = await supabase.from("appointments").insert({
        tenant_id: tenantUuid,
        customer_id: selectedConversation.contact_id,
        service_id: null, // Optional
        provider_id: null, // Optional
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 60,
        status: "pending",
        notes: appointmentNotes || null,
      });

      if (error) throw error;

      // Also call webhook for confirmation
      await callWebhook(
        "/book-appointment",
        {
          customer_id: selectedConversation.contact_id,
          customer_name: getDisplayName(selectedConversation),
          customer_phone: getPhoneNumber(selectedConversation),
          scheduled_at: scheduledAt.toISOString(),
          notes: appointmentNotes,
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setShowBookDialog(false);
      setAppointmentDate(undefined);
      setAppointmentTime("10:00");
      setAppointmentNotes("");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked!");
    },
    onError: (err) => {
      console.error("Appointment error:", err);
      toast.error("Failed to book appointment");
    },
  });

  // Add Note
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.contact_id || !noteText.trim()) return;

      const { data: customer } = await supabase
        .from("customers")
        .select("notes")
        .eq("id", selectedConversation.contact_id)
        .single();

      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
      const existingNotes = customer?.notes || "";
      const newNotes = existingNotes ? `${existingNotes}\n\n[${timestamp}] ${noteText}` : `[${timestamp}] ${noteText}`;

      await supabase
        .from("customers")
        .update({ notes: newNotes, updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.contact_id);

      await callWebhook(
        "/orchestrator",
        {
          event_type: "note_added",
          entity_id: selectedConversation.id,
          data: { content: noteText },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setShowNoteDialog(false);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  // Escalate
  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !escalationReason) return;

      await supabase
        .from("conversations")
        .update({
          requires_human: true,
          priority: "high",
          ai_handled: false,
          status: "escalated",
        })
        .eq("id", selectedConversationId);

      await callWebhook(
        "/orchestrator",
        {
          event_type: "conversation_escalated",
          entity_id: selectedConversationId,
          data: {
            reason: escalationReason,
            customer_name: selectedConversation ? getDisplayName(selectedConversation) : null,
            customer_phone: getPhoneNumber(selectedConversation!),
            channel: selectedConversation?.channel,
          },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setShowEscalateDialog(false);
      setEscalationReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Escalated - team notified");
    },
    onError: () => toast.error("Failed to escalate"),
  });

  // Transfer
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !selectedStaffId) return;

      await supabase.from("conversations").update({ assigned_to: selectedStaffId }).eq("id", selectedConversationId);

      await callWebhook(
        "/orchestrator",
        {
          event_type: "conversation_transferred",
          entity_id: selectedConversationId,
          data: { to_staff_id: selectedStaffId, reason: transferReason },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setShowTransferDialog(false);
      setSelectedStaffId("");
      setTransferReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Transferred");
    },
    onError: () => toast.error("Failed to transfer"),
  });

  // Assign
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !selectedStaffId) return;
      await supabase
        .from("conversations")
        .update({ assigned_to: selectedStaffId, ai_handled: false })
        .eq("id", selectedConversationId);
    },
    onSuccess: () => {
      setShowAssignDialog(false);
      setSelectedStaffId("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Assigned");
    },
  });

  // Initiate Call
  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      const phoneNumber = getPhoneNumber(selectedConversation!);
      if (!phoneNumber || !selectedConversation?.contact_id) return;

      await supabase.from("activities").insert({
        tenant_id: tenantUuid,
        customer_id: selectedConversation.contact_id,
        type: "call",
        description: `Outbound call to ${phoneNumber}`,
        created_at: new Date().toISOString(),
      });

      await callWebhook(
        "/vapi/outbound-call",
        {
          customer_id: selectedConversation.contact_id,
          phone_number: phoneNumber,
          assistant_id: "d7e846ab-9c1c-4f59-92f0-c755424e6c3f",
          from_number: "+12722350215",
        },
        tenantUuid!,
      );

      window.open(`tel:${phoneNumber}`, "_self");
    },
    onSuccess: () => {
      setShowCallDialog(false);
      toast.success("Call initiated");
    },
    onError: () => toast.error("Failed to initiate call"),
  });

  // Update Contact
  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.contact_id) return;

      const { error } = await supabase
        .from("customers")
        .update({
          name: editName || null,
          phone_number: editPhone || null,
          email: editEmail || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.contact_id);

      if (error) throw error;
    },
    onSuccess: () => {
      setShowEditContactDialog(false);
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      toast.success("Contact updated!");
    },
    onError: () => toast.error("Failed to update contact"),
  });

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] }),
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
      toast.success("Updated");
    },
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

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversationId) return;
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
      if (selectedConversation) content = content.replace("{{name}}", getDisplayName(selectedConversation));
      setMessageInput(content);
      setShowTemplateDialog(false);
    },
    [selectedConversation, getDisplayName],
  );

  // Open Edit Contact - PROPERLY INITIALIZE FORM
  const openEditContact = useCallback(() => {
    if (selectedCustomer) {
      setEditName(selectedCustomer.name || selectedCustomer.first_name || "");
      setEditPhone(selectedCustomer.phone_number || selectedCustomer.phone || "");
      setEditEmail(selectedCustomer.email || "");
    } else {
      setEditName("");
      setEditPhone("");
      setEditEmail("");
    }
    setShowEditContactDialog(true);
  }, [selectedCustomer]);

  // Open Deal Dialog - PRE-FILL FORM
  const openDealDialog = useCallback(() => {
    if (selectedConversation) {
      setDealContactName(getDisplayName(selectedConversation));
      setDealPhone(getPhoneNumber(selectedConversation) || "");
      setDealEmail(getEmail(selectedConversation) || "");
      setDealCompanyName(selectedCustomer?.company_name || "");
    }
    setShowDealDialog(true);
  }, [selectedConversation, selectedCustomer, getDisplayName, getPhoneNumber, getEmail]);

  const clearFilters = useCallback(() => {
    setFilters({
      quickFilter: "all",
      leadTemperature: "all",
      leadScoreRange: [0, 100],
      status: "all",
      sortBy: "recent",
    });
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time
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
        if (!isMuted && (payload.new as any).direction === "inbound") toast.info("New message");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantUuid, selectedConversationId, queryClient, refetchMessages, isMuted]);

  // Filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.quickFilter !== "all") count++;
    if (filters.leadTemperature !== "all") count++;
    if (filters.leadScoreRange[0] !== 0 || filters.leadScoreRange[1] !== 100) count++;
    if (filters.status !== "all") count++;
    if (filters.sortBy !== "recent") count++;
    return count;
  }, [filters]);

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
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
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

          {/* Channels */}
          <ScrollArea className="max-w-xl">
            <div className="flex gap-1 px-1">
              <button
                onClick={() => setSelectedChannel("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium",
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
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1",
                      selectedChannel === ch.id
                        ? `${ch.bgColor} ${ch.textColor}`
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <ch.icon className="h-3.5 w-3.5" />
                  </button>
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

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetchConversations()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* MAIN */}
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
                              {filters.leadScoreRange[0]}-{filters.leadScoreRange[1]}
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
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No conversations</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const channelConfig = getChannelConfig(conv.channel);
                    const isSelected = selectedConversationId === conv.id;
                    const isStarred = starredConversations.has(conv.id);
                    const hasUnread = conv.unread_count > 0;
                    const displayName = getDisplayName(conv);
                    const temp = conv.customer?.lead_temperature || conv.customer?.temperature;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={cn(
                          "p-3 border-b cursor-pointer hover:bg-muted/50",
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
                                {getTemperatureIcon(temp)}
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
                                  {conv.last_message_at && formatTime(conv.last_message_at)}
                                </span>
                              </div>
                            </div>
                            <p className={cn("text-xs truncate", hasUnread ? "font-medium" : "text-muted-foreground")}>
                              {conv.last_message_direction === "outbound" && (
                                <Check className="h-3 w-3 inline mr-1 text-green-500" />
                              )}
                              {conv.last_message_text || "No messages"}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
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
                        {getTemperatureIcon(selectedCustomer?.lead_temperature || selectedCustomer?.temperature)}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openEditContact}>
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
                        {currentPhoneNumber ? (
                          <span>{currentPhoneNumber}</span>
                        ) : (
                          <span className="text-orange-500">No phone - click edit</span>
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
                        <DropdownMenuItem onClick={openDealDialog}>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Create Deal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowBookDialog(true)}>
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Book Appointment
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowEscalateDialog(true)}>
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
                          <p>No messages</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2.5",
                                  msg.direction === "outbound"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md",
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
                            <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Templates
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex-1 relative">
                          <Textarea
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

                  {/* DETAILS PANEL */}
                  {showDetailsPanel && (
                    <aside className="w-72 border-l bg-card p-4 overflow-y-auto shrink-0">
                      <div className="text-center mb-4">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {getInitials(selectedConversation)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold">{getDisplayName(selectedConversation)}</h3>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {getTemperatureIcon(selectedCustomer?.lead_temperature || selectedCustomer?.temperature)}
                          <Badge variant="outline" className="capitalize">
                            {selectedCustomer?.lifecycle_stage || "Lead"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={openEditContact}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{currentPhoneNumber || <span className="text-orange-500">Not set</span>}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">
                            {selectedCustomer?.email || <span className="text-orange-500">Not set</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span>Score: {selectedCustomer?.lead_score || 50}</span>
                        </div>
                        {selectedCustomer?.source && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedCustomer.source}</span>
                          </div>
                        )}
                      </div>
                      {selectedCustomer?.notes && (
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
                  <p className="text-muted-foreground">Choose from the list</p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* ===== DIALOGS ===== */}

        {/* EDIT CONTACT */}
        <Dialog open={showEditContactDialog} onOpenChange={setShowEditContactDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>Update contact information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Full name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+1234567890" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
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
                {updateContactMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ASSIGN */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Conversation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
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

        {/* NOTE */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
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
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => addNoteMutation.mutate()} disabled={!noteText.trim() || addNoteMutation.isPending}>
                {addNoteMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CREATE DEAL - MATCHES Deals.tsx SCHEMA */}
        <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
              <DialogDescription>Add to sales pipeline (same schema as Deals page)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
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
                      {PIPELINE_STAGES.map((s) => (
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
                  <Input
                    type="email"
                    placeholder="email"
                    value={dealEmail}
                    onChange={(e) => setDealEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="phone" value={dealPhone} onChange={(e) => setDealPhone(e.target.value)} />
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

        {/* BOOK APPOINTMENT - MATCHES Appointments.tsx SCHEMA */}
        <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>Schedule using same schema as Appointments page</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date *</Label>
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
                {bookAppointmentMutation.isPending ? "Booking..." : "Book"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CALL */}
        <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Call</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              {currentPhoneNumber ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-10 w-10 text-green-600" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">{currentPhoneNumber}</p>
                  <p className="text-sm text-muted-foreground">Via VAPI: +1 272 235 0215</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-yellow-600" />
                  </div>
                  <p className="text-muted-foreground mb-2">No phone number</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCallDialog(false);
                      openEditContact();
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
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
                disabled={!currentPhoneNumber || initiateCallMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                {initiateCallMutation.isPending ? "Connecting..." : "Call"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ESCALATE */}
        <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Escalate
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Select value={escalationReason} onValueChange={setEscalationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complex">Complex Inquiry</SelectItem>
                  <SelectItem value="complaint">Customer Complaint</SelectItem>
                  <SelectItem value="urgent">Urgent Request</SelectItem>
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

        {/* TRANSFER */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Transfer To</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
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

        {/* TEMPLATE */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Templates</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid gap-3 max-h-80 overflow-y-auto">
              {messageTemplates.map((t) => (
                <Card key={t.id} className="cursor-pointer hover:shadow-md" onClick={() => handleUseTemplate(t)}>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {t.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
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

        {/* COMPLIANCE */}
        <Dialog open={showComplianceDialog} onOpenChange={setShowComplianceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance
              </DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2">{industryConfig.name} Compliance</h4>
                  <div className="flex flex-wrap gap-2">
                    {industryConfig.compliance.map((r) => (
                      <Badge key={r} variant="outline">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Marketing</Label>
                      <p className="text-xs text-muted-foreground">Allow marketing</p>
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
                      <p className="text-xs text-muted-foreground">Allow storage</p>
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
                      <p className="text-xs text-muted-foreground">Block outreach</p>
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
                      <span className="text-sm font-medium">DNC Active</span>
                    </div>
                  </div>
                )}
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
