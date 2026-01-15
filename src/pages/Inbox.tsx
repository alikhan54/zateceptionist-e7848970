// ============================================
// FILE: src/pages/Inbox.tsx
// VERSION 9.0 - ALL 6 ISSUES FIXED
// ============================================
//
// FIXES APPLIED:
// ✅ FIX 1: Edit Contact - proper validation + tenant filter
// ✅ FIX 2: Notes - saves to customer.notes + refreshes UI
// ✅ FIX 3: Deals - EXACT schema from Deals.tsx (title, company_name, contact_name, weighted_value)
// ✅ FIX 4: Appointments - EXACT schema from Appointments.tsx (scheduled_at, duration_minutes)
// ✅ FIX 5: Escalate/Resolve - clears requires_human flag on resolve/close
// ✅ FIX 6: Deal Tracker - deals now save correctly (was schema mismatch)
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
// CONSTANTS
// ============================================
const N8N_WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

const PIPELINE_STAGES = [
  { id: "lead", name: "Lead", probability: 10 },
  { id: "qualified", name: "Qualified", probability: 25 },
  { id: "proposal", name: "Proposal", probability: 50 },
  { id: "negotiation", name: "Negotiation", probability: 75 },
  { id: "won", name: "Won", probability: 100 },
  { id: "lost", name: "Lost", probability: 0 },
];

const INDUSTRY_CONFIG: Record<string, { name: string; services: string[]; compliance: string[] }> = {
  healthcare: {
    name: "Healthcare",
    services: ["Consultation", "Treatment", "Follow-up", "Botox", "Filler"],
    compliance: ["HIPAA"],
  },
  real_estate: {
    name: "Real Estate",
    services: ["Property Viewing", "Market Analysis", "Investment"],
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
};

const DEFAULT_TEMPLATES = [
  { id: "1", name: "Greeting", content: "Hello {{name}}! How can I help you today?", category: "general" },
  {
    id: "2",
    name: "Appointment Confirm",
    content: "Your appointment is confirmed for {{date}}.",
    category: "appointment",
  },
  { id: "3", name: "Follow Up", content: "Hi {{name}}! Just following up on our conversation.", category: "followup" },
];

// ============================================
// HELPER FUNCTION
// ============================================
async function callWebhook(endpoint: string, data: Record<string, unknown>, tenantId: string) {
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tenant_id: tenantId }),
    });
    return { success: response.ok };
  } catch (error) {
    console.error(`Webhook ${endpoint} error:`, error);
    return { success: false };
  }
}

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

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-members", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase.from("users").select("id, full_name, email").eq("tenant_id", tenantUuid);
      return (data || []) as StaffMember[];
    },
    enabled: !!tenantUuid,
  });

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

  const getPhoneNumber = useCallback((conv: Conversation | null | undefined): string | null => {
    if (!conv) return null;
    const c = conv.customer;
    if (c?.phone_number) return c.phone_number;
    if (c?.phone) return c.phone;
    if (conv.customer_phone) return conv.customer_phone;
    if (c?.whatsapp_id && /^\+?\d{10,}$/.test(c.whatsapp_id)) return c.whatsapp_id;
    return null;
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
  // MUTATIONS - ALL FIXED
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

  // FIX #1: UPDATE CONTACT - With proper validation
  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.contact_id) throw new Error("No contact selected");
      if (!tenantUuid) throw new Error("No tenant ID");

      console.log("Updating contact:", selectedConversation.contact_id);

      const { data, error } = await supabase
        .from("customers")
        .update({
          name: editName.trim() || null,
          phone_number: editPhone.trim() || null,
          email: editEmail.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.contact_id)
        .eq("tenant_id", tenantUuid)
        .select()
        .single();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      setShowEditContactDialog(false);
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      toast.success("Contact updated!");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // FIX #2: ADD NOTE - Saves to customer.notes
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation?.contact_id) throw new Error("No contact");
      if (!noteText.trim()) throw new Error("Empty note");
      if (!tenantUuid) throw new Error("No tenant");

      const { data: customer } = await supabase
        .from("customers")
        .select("notes")
        .eq("id", selectedConversation.contact_id)
        .single();

      const existing = customer?.notes || "";
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
      const newNotes = existing
        ? `${existing}\n\n[${timestamp}] ${noteText.trim()}`
        : `[${timestamp}] ${noteText.trim()}`;

      const { error } = await supabase
        .from("customers")
        .update({ notes: newNotes, updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.contact_id);

      if (error) throw error;
    },
    onSuccess: () => {
      setShowNoteDialog(false);
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["inbox-customers"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Note added!");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // FIX #3: CREATE DEAL - EXACT Deals.tsx schema
  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant");
      if (!dealTitle.trim()) throw new Error("Title required");

      const value = parseFloat(dealValue) || 0;
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === dealStage);
      const probability = stageConfig?.probability || 10;
      const weightedValue = (value * probability) / 100;

      const contactName = dealContactName || (selectedConversation ? getDisplayName(selectedConversation) : "");
      const companyName = dealCompanyName || selectedCustomer?.company_name || "";
      const email = dealEmail || selectedCustomer?.email || "";
      const phone = dealPhone || getPhoneNumber(selectedConversation) || "";

      console.log("Creating deal with:", { tenantUuid, dealTitle, value, dealStage });

      const { data, error } = await supabase
        .from("deals")
        .insert({
          tenant_id: tenantUuid,
          title: dealTitle.trim(),
          value: value,
          weighted_value: weightedValue,
          stage: dealStage,
          probability: probability,
          company_name: companyName,
          contact_name: contactName,
          email: email,
          phone: phone,
        })
        .select()
        .single();

      if (error) {
        console.error("Deal insert error:", error);
        throw error;
      }
      console.log("Deal created:", data);
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

  // FIX #4: BOOK APPOINTMENT - EXACT Appointments.tsx schema
  const bookAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!tenantUuid) throw new Error("No tenant");
      if (!appointmentDate) throw new Error("Date required");
      if (!selectedConversation?.contact_id) throw new Error("No customer");

      const scheduledAt = new Date(appointmentDate);
      const [h, m] = appointmentTime.split(":").map(Number);
      scheduledAt.setHours(h || 10, m || 0, 0, 0);

      console.log("Booking appointment:", { tenantUuid, customerId: selectedConversation.contact_id, scheduledAt });

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          tenant_id: tenantUuid,
          customer_id: selectedConversation.contact_id,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: 60,
          status: "pending",
          notes: appointmentNotes.trim() || null,
        })
        .select()
        .single();

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
      setAppointmentNotes("");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment booked! Check Appointments page.");
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  // Escalate
  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !escalationReason) throw new Error("Missing data");
      await supabase
        .from("conversations")
        .update({
          requires_human: true,
          priority: "high",
          status: "escalated",
          ai_handled: false,
        })
        .eq("id", selectedConversationId);
      await callWebhook(
        "/orchestrator",
        {
          event_type: "conversation_escalated",
          entity_id: selectedConversationId,
          data: { reason: escalationReason },
        },
        tenantUuid!,
      );
    },
    onSuccess: () => {
      setShowEscalateDialog(false);
      setEscalationReason("");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Escalated");
    },
    onError: () => toast.error("Failed to escalate"),
  });

  // FIX #5: UPDATE STATUS - Clears escalation flags
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      // CRITICAL: Clear escalation flags when resolving/closing
      if (status === "resolved" || status === "closed") {
        updates.requires_human = false;
        updates.priority = "normal";
      }
      await supabase.from("conversations").update(updates).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed"),
  });

  // Transfer
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !selectedStaffId) throw new Error("Missing data");
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
    onError: () => toast.error("Failed"),
  });

  // Assign
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversationId || !selectedStaffId) throw new Error("Missing data");
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

  // Call
  const initiateCallMutation = useMutation({
    mutationFn: async () => {
      const phone = getPhoneNumber(selectedConversation);
      if (!phone) throw new Error("No phone");
      await callWebhook(
        "/vapi/outbound-call",
        {
          customer_id: selectedConversation?.contact_id,
          phone_number: phone,
        },
        tenantUuid!,
      );
      window.open(`tel:${phone}`, "_self");
    },
    onSuccess: () => {
      setShowCallDialog(false);
      toast.success("Call initiated");
    },
    onError: () => toast.error("Failed"),
  });

  // Consent
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

  const openEditContact = useCallback(() => {
    setEditName(selectedCustomer?.name || selectedCustomer?.first_name || "");
    setEditPhone(selectedCustomer?.phone_number || selectedCustomer?.phone || "");
    setEditEmail(selectedCustomer?.email || "");
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
        if (!isMuted && (payload.new as any).direction === "inbound") toast.info("New message");
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
                          Filters
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Clear
                          </Button>
                        </SheetTitle>
                      </SheetHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Temperature</Label>
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
                            Score: {filters.leadScoreRange[0]}-{filters.leadScoreRange[1]}
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
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
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
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No conversations</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const chCfg = getChannelConfig(conv.channel);
                    const isSelected = selectedConversationId === conv.id;
                    const isStarred = starredConversations.has(conv.id);
                    const hasUnread = conv.unread_count > 0;
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
                                    <StarOff className="h-3.5 w-3.5 text-muted-foreground/30" />
                                  )}
                                </button>
                                <span className="text-[10px] text-muted-foreground">
                                  {conv.last_message_at && formatTime(conv.last_message_at)}
                                </span>
                              </div>
                            </div>
                            <p className={cn("text-xs truncate", hasUnread ? "font-medium" : "text-muted-foreground")}>
                              {conv.last_message_text || "No messages"}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
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

          {/* CHAT */}
          <main className="flex-1 flex flex-col min-w-0 bg-background">
            {selectedConversation ? (
              <>
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
                          className={cn("h-5 text-[10px]", getChannelConfig(selectedConversation.channel).bgColor)}
                        >
                          {getChannelConfig(selectedConversation.channel).name}
                        </Badge>
                        {currentPhoneNumber || <span className="text-orange-500">No phone</span>}
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
                  <div className="flex-1 flex flex-col min-w-0">
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <div className="flex justify-center h-full">
                          <RefreshCcw className="h-6 w-6 animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
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
                              disabled={!messageInput.trim()}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                </div>
              </div>
            )}
          </main>
        </div>

        {/* DIALOGS */}
        <Dialog open={showEditContactDialog} onOpenChange={setShowEditContactDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>Update customer information</DialogDescription>
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

        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign</DialogTitle>
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
              <Button onClick={() => assignMutation.mutate()} disabled={!selectedStaffId}>
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Note will be saved to customer record</DialogDescription>
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

        <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
              <DialogDescription>Add to Deal Tracker pipeline</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value (AED)</Label>
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
                <Label>Company</Label>
                <Input
                  placeholder="Company name"
                  value={dealCompanyName}
                  onChange={(e) => setDealCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input
                  placeholder="Contact name"
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

        <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>Schedule appointment</DialogDescription>
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
                  placeholder="Optional notes"
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

        <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Call</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              {currentPhoneNumber ? (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-10 w-10 text-green-600" />
                  </div>
                  <p className="text-2xl font-semibold">{currentPhoneNumber}</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-yellow-600" />
                  </div>
                  <p>No phone number</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
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
                Call
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              <Button variant="destructive" onClick={() => escalateMutation.mutate()} disabled={!escalationReason}>
                Escalate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
              <Button onClick={() => transferMutation.mutate()} disabled={!selectedStaffId}>
                Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Templates</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid gap-3 max-h-80 overflow-y-auto">
              {DEFAULT_TEMPLATES.map((t) => (
                <Card key={t.id} className="cursor-pointer hover:shadow-md" onClick={() => handleUseTemplate(t)}>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{t.name}</CardTitle>
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
                  <h4 className="text-sm font-medium mb-2">{industryConfig.name}</h4>
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
