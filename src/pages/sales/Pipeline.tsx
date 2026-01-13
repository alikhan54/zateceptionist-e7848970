// ============================================================================
// UPDATED PIPELINE.TSX - Uses Unified Contacts Table
// This component shows ALL contacts in a kanban-style pipeline view
// ============================================================================

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  RefreshCcw,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Linkedin,
  Building2,
  Calendar,
  MessageSquare,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  GripVertical,
  User,
  DollarSign,
  Target,
  Activity,
  Clock,
  ArrowRight,
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
  source: string;
  lifecycle_stage: string;
  pipeline_stage: string;
  lead_score: number;
  lead_grade: string;
  lead_temperature: string;
  owner_id: string | null;
  linkedin_url: string | null;
  website: string | null;
  city: string | null;
  country_code: string | null;
  tags: string[] | null;
  last_contacted_at: string | null;
  last_responded_at: string | null;
  total_conversations: number;
  total_emails_sent: number;
  active_sequence_id: string | null;
  sequence_status: string | null;
  created_at: string;
  updated_at: string;
}

interface Deal {
  id: string;
  contact_id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date: string | null;
}

// ============================================================================
// PIPELINE STAGES CONFIGURATION
// ============================================================================

const PIPELINE_STAGES = [
  {
    id: "PROS",
    name: "Prospect",
    probability: 10,
    category: "Discovery",
    color: "bg-slate-500",
    description: "New leads not yet researched",
  },
  {
    id: "RES",
    name: "Research",
    probability: 20,
    category: "Discovery",
    color: "bg-blue-500",
    description: "Being enriched and researched",
  },
  {
    id: "CONT",
    name: "Contact",
    probability: 30,
    category: "Qualification",
    color: "bg-cyan-500",
    description: "First outreach sent",
  },
  {
    id: "PITCH",
    name: "Pitch",
    probability: 50,
    category: "Qualification",
    color: "bg-purple-500",
    description: "Proposal/pitch presented",
  },
  {
    id: "OBJ",
    name: "Objection",
    probability: 60,
    category: "Closing",
    color: "bg-orange-500",
    description: "Handling objections",
  },
  {
    id: "CLOSE",
    name: "Closing",
    probability: 80,
    category: "Closing",
    color: "bg-amber-500",
    description: "In final negotiations",
  },
  {
    id: "RET",
    name: "Retained",
    probability: 100,
    category: "Won",
    color: "bg-green-500",
    description: "Converted to customer",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTemperatureIcon(temp: string) {
  switch (temp) {
    case "HOT":
      return <Flame className="h-3.5 w-3.5 text-red-500" />;
    case "WARM":
      return <Thermometer className="h-3.5 w-3.5 text-orange-500" />;
    default:
      return <Snowflake className="h-3.5 w-3.5 text-blue-500" />;
  }
}

function getGradeBadgeColor(grade: string) {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800 border-green-200";
    case "B":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "C":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getInitials(contact: Contact): string {
  if (contact.first_name && contact.last_name) {
    return `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();
  }
  if (contact.first_name) {
    return contact.first_name.substring(0, 2).toUpperCase();
  }
  if (contact.email) {
    return contact.email.substring(0, 2).toUpperCase();
  }
  return "??";
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ============================================================================
// CONTACT CARD COMPONENT
// ============================================================================

interface ContactCardProps {
  contact: Contact;
  deals?: Deal[];
  onSelect: (contact: Contact) => void;
  onMoveStage: (contactId: string, newStage: string) => void;
}

function ContactCard({ contact, deals = [], onSelect, onMoveStage }: ContactCardProps) {
  const contactDeals = deals.filter((d) => d.contact_id === contact.id);
  const totalDealValue = contactDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card
      className="p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor:
          contact.lead_temperature === "HOT" ? "#ef4444" : contact.lead_temperature === "WARM" ? "#f97316" : "#3b82f6",
      }}
      onClick={() => onSelect(contact)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(contact)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {contact.full_name || contact.first_name || contact.email || contact.phone || "Unknown"}
            </p>
            {contact.company_name && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {contact.company_name}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <Phone className="h-4 w-4 mr-2" /> Call
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <Mail className="h-4 w-4 mr-2" /> Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <Calendar className="h-4 w-4 mr-2" /> Schedule Meeting
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {PIPELINE_STAGES.filter((s) => s.id !== contact.pipeline_stage).map((stage) => (
              <DropdownMenuItem
                key={stage.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveStage(contact.id, stage.id);
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" /> Move to {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Score & Grade */}
      <div className="flex items-center gap-2 mb-2">
        <Badge className={`text-xs ${getGradeBadgeColor(contact.lead_grade)}`}>Grade {contact.lead_grade}</Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {getTemperatureIcon(contact.lead_temperature)}
          <span>{contact.lead_score}</span>
        </div>
        {contact.sequence_status === "active" && (
          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
            In Sequence
          </Badge>
        )}
      </div>

      {/* Contact Info */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
        {contact.email && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {contact.email.length > 20 ? contact.email.substring(0, 20) + "..." : contact.email}
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {contact.phone}
          </span>
        )}
      </div>

      {/* Deal Value (if any) */}
      {totalDealValue > 0 && (
        <div className="flex items-center gap-1 text-xs font-medium text-green-600 mb-2">
          <DollarSign className="h-3 w-3" />
          {totalDealValue.toLocaleString()} AED
        </div>
      )}

      {/* Last Activity */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(contact.last_contacted_at || contact.created_at)}
        </span>
        <span className="capitalize text-xs px-1.5 py-0.5 rounded bg-muted">{contact.source.replace(/_/g, " ")}</span>
      </div>
    </Card>
  );
}

// ============================================================================
// CONTACT DETAIL SHEET
// ============================================================================

interface ContactDetailSheetProps {
  contact: Contact | null;
  deals: Deal[];
  open: boolean;
  onClose: () => void;
  onMoveStage: (contactId: string, newStage: string) => void;
}

function ContactDetailSheet({ contact, deals, open, onClose, onMoveStage }: ContactDetailSheetProps) {
  if (!contact) return null;

  const contactDeals = deals.filter((d) => d.contact_id === contact.id);

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">{getInitials(contact)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">
                {contact.full_name || contact.first_name || "Unknown Contact"}
              </SheetTitle>
              <SheetDescription>
                {contact.job_title && contact.company_name
                  ? `${contact.job_title} at ${contact.company_name}`
                  : contact.company_name || contact.email || contact.phone}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{contact.lead_score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold flex justify-center">
                {getTemperatureIcon(contact.lead_temperature)}
              </div>
              <div className="text-xs text-muted-foreground">{contact.lead_temperature}</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">Grade {contact.lead_grade}</div>
              <div className="text-xs text-muted-foreground">Quality</div>
            </div>
          </div>

          {/* Pipeline Stage */}
          <div>
            <Label className="text-sm font-medium">Pipeline Stage</Label>
            <Select value={contact.pipeline_stage} onValueChange={(value) => onMoveStage(contact.id, value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name} ({stage.probability}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Contact Information</Label>
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center gap-2 text-sm">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn Profile
                </a>
              </div>
            )}
          </div>

          {/* Deals */}
          {contactDeals.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Active Deals</Label>
              {contactDeals.map((deal) => (
                <Card key={deal.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.stage}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {deal.value.toLocaleString()} {deal.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">{deal.probability}%</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Engagement</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>{contact.total_conversations} conversations</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.total_emails_sent} emails sent</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-medium">Quick Actions</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" /> Call
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" /> Email
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" /> Schedule
              </Button>
            </div>
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 text-xs text-muted-foreground pt-4 border-t">
            <div className="flex justify-between">
              <span>Source</span>
              <span className="capitalize">{contact.source.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span>{new Date(contact.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Contacted</span>
              <span>{formatRelativeTime(contact.last_contacted_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Response</span>
              <span>{formatRelativeTime(contact.last_responded_at)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// ADD CONTACT DIALOG
// ============================================================================

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (contact: Partial<Contact>) => void;
}

function AddContactDialog({ open, onOpenChange, onAdd }: AddContactDialogProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    pipeline_stage: "PROS",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company_name: "",
      job_title: "",
      pipeline_stage: "PROS",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="company_name">Company</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="pipeline_stage">Initial Stage</Label>
            <Select
              value={formData.pipeline_stage}
              onValueChange={(value) => setFormData({ ...formData, pipeline_stage: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Contact</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PIPELINE COMPONENT
// ============================================================================

export default function Pipeline() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");

  // Fetch all contacts from unified contacts table
  const {
    data: contacts = [],
    isLoading: contactsLoading,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: ["contacts", "pipeline", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId)
        .neq("pipeline_stage", "LOST") // Exclude lost contacts
        .order("lead_score", { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!tenantId,
  });

  // Fetch deals for value display
  const { data: deals = [] } = useQuery({
    queryKey: ["deals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("tenant_id", tenantId)
        .not("stage", "in", '("Won","Lost")');

      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!tenantId,
  });

  // Move contact to new pipeline stage
  const moveToStage = useMutation({
    mutationFn: async ({ contactId, newStage }: { contactId: string; newStage: string }) => {
      const { error } = await supabase
        .from("contacts")
        .update({
          pipeline_stage: newStage,
          pipeline_stage_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contactId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "pipeline", tenantId] });
      toast({
        title: "Contact moved",
        description: "Pipeline stage updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to move contact: " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Add new contact
  const addContact = useMutation({
    mutationFn: async (contactData: Partial<Contact>) => {
      const { error } = await supabase.from("contacts").insert({
        tenant_id: tenantId,
        first_name: contactData.first_name,
        last_name: contactData.last_name,
        email: contactData.email || null,
        phone: contactData.phone || null,
        company_name: contactData.company_name || null,
        job_title: contactData.job_title || null,
        pipeline_stage: contactData.pipeline_stage || "PROS",
        lifecycle_stage: "lead",
        source: "manual",
        lead_score: 40,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "pipeline", tenantId] });
      toast({
        title: "Contact added",
        description: "New contact created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add contact: " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  // Filter and group contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(term) ||
          c.first_name?.toLowerCase().includes(term) ||
          c.last_name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.includes(term) ||
          c.company_name?.toLowerCase().includes(term),
      );
    }

    // Temperature filter
    if (temperatureFilter !== "all") {
      filtered = filtered.filter((c) => c.lead_temperature === temperatureFilter);
    }

    return filtered;
  }, [contacts, searchTerm, temperatureFilter]);

  // Group by pipeline stage
  const contactsByStage = useMemo(() => {
    const grouped: Record<string, Contact[]> = {};
    PIPELINE_STAGES.forEach((stage) => {
      grouped[stage.id] = [];
    });
    filteredContacts.forEach((contact) => {
      if (grouped[contact.pipeline_stage]) {
        grouped[contact.pipeline_stage].push(contact);
      }
    });
    return grouped;
  }, [filteredContacts]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = deals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    const hot = contacts.filter((c) => c.lead_temperature === "HOT").length;
    const warm = contacts.filter((c) => c.lead_temperature === "WARM").length;
    const cold = contacts.filter((c) => c.lead_temperature === "COLD").length;

    return {
      totalContacts: contacts.length,
      pipelineValue: totalValue,
      weightedValue,
      hot,
      warm,
      cold,
    };
  }, [contacts, deals]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetail(true);
  };

  const handleMoveStage = (contactId: string, newStage: string) => {
    moveToStage.mutate({ contactId, newStage });
    // If the detail sheet is open, update the selected contact
    if (selectedContact?.id === contactId) {
      setSelectedContact({ ...selectedContact, pipeline_stage: newStage });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground">
            {stats.totalContacts} contacts • {stats.hot} hot • {stats.warm} warm • {stats.cold} cold
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchContacts()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.totalContacts}</div>
          <div className="text-xs text-muted-foreground">Total Contacts</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-600">{stats.pipelineValue.toLocaleString()} AED</div>
          <div className="text-xs text-muted-foreground">Pipeline Value</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.weightedValue.toLocaleString()} AED</div>
          <div className="text-xs text-muted-foreground">Weighted Value</div>
        </Card>
        <Card className="p-3 flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-red-500" />
            <span className="font-bold">{stats.hot}</span>
          </div>
          <div className="flex items-center gap-1">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <span className="font-bold">{stats.warm}</span>
          </div>
          <div className="flex items-center gap-1">
            <Snowflake className="h-4 w-4 text-blue-500" />
            <span className="font-bold">{stats.cold}</span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Temperatures</SelectItem>
            <SelectItem value="HOT">🔥 Hot Only</SelectItem>
            <SelectItem value="WARM">🌡️ Warm Only</SelectItem>
            <SelectItem value="COLD">❄️ Cold Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-h-[500px]">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-72">
              {/* Stage Header */}
              <div className={`${stage.color} text-white rounded-t-lg px-3 py-2`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{stage.name}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {contactsByStage[stage.id]?.length || 0}
                  </Badge>
                </div>
                <div className="text-xs opacity-80">{stage.probability}% probability</div>
              </div>

              {/* Stage Cards */}
              <div className="bg-muted/50 rounded-b-lg p-2 min-h-[400px]">
                {contactsLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
                ) : contactsByStage[stage.id]?.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No contacts</div>
                ) : (
                  contactsByStage[stage.id]?.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      deals={deals}
                      onSelect={handleSelectContact}
                      onMoveStage={handleMoveStage}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contact={selectedContact}
        deals={deals}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        onMoveStage={handleMoveStage}
      />

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={(data) => addContact.mutate(data)}
      />
    </div>
  );
}
