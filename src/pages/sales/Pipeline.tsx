// src/pages/sales/Pipeline.tsx
// COMPLETE LEAD PIPELINE WITH 7 STAGES + LEADS INTEGRATION
// Version 2.0 - Matches Sales Dashboard stages, shows actual leads

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Target,
  AlertTriangle,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  User,
  Building2,
  ArrowRight,
  RefreshCw,
  Filter,
  Search,
  Clock,
  Check,
  X,
  Flame,
  Snowflake,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Eye,
  Edit,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

// =====================================================
// PIPELINE STAGES - 7 STAGES MATCHING SALES DASHBOARD
// =====================================================
const PIPELINE_STAGES = [
  { id: "PROS", label: "Prospect", shortLabel: "PROS", phase: "Discovery", color: "bg-blue-500", probability: 10 },
  { id: "RES", label: "Research", shortLabel: "RES", phase: "Discovery", color: "bg-indigo-500", probability: 20 },
  { id: "CONT", label: "Contact", shortLabel: "CONT", phase: "Qualification", color: "bg-purple-500", probability: 30 },
  { id: "PITCH", label: "Pitch", shortLabel: "PITCH", phase: "Qualification", color: "bg-pink-500", probability: 50 },
  { id: "OBJ", label: "Objection", shortLabel: "OBJ", phase: "Closing", color: "bg-orange-500", probability: 60 },
  { id: "CLOSE", label: "Closing", shortLabel: "CLOSE", phase: "Closing", color: "bg-green-500", probability: 80 },
  { id: "RET", label: "Retained", shortLabel: "RET", phase: "Retained", color: "bg-emerald-500", probability: 100 },
];

// =====================================================
// TYPES
// =====================================================
interface SalesLead {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  job_title: string;
  website: string;
  linkedin_url: string;
  source: string;
  source_channel: string;
  lead_score: number;
  lead_grade: string;
  temperature: string;
  status: string;
  deal_stage: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_contacted_at: string;
  sequence_status: string;
}

interface Deal {
  id: string;
  tenant_id: string;
  name: string;
  title: string;
  customer_name: string;
  value: number;
  weighted_value: number;
  currency: string;
  stage: string;
  probability: number;
  lead_id: string;
  contact_name: string;
  company_name: string;
  email: string;
  phone: string;
  expected_close_date: string;
  actual_close_date: string;
  next_action: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HELPER COMPONENTS
// =====================================================
const GradeBadge = ({ grade }: { grade: string }) => {
  const colors: Record<string, string> = {
    A: "bg-green-500",
    B: "bg-blue-500",
    C: "bg-amber-500",
    D: "bg-red-500",
  };
  return (
    <span
      className={cn(
        "h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold",
        colors[grade] || "bg-gray-500",
      )}
    >
      {grade}
    </span>
  );
};

const TemperatureIcon = ({ temperature }: { temperature?: string }) => {
  if (temperature === "hot") return <Flame className="h-3 w-3 text-red-500" />;
  if (temperature === "warm") return <TrendingUp className="h-3 w-3 text-amber-500" />;
  return <Snowflake className="h-3 w-3 text-blue-500" />;
};

// =====================================================
// LEAD CARD COMPONENT
// =====================================================
function LeadCard({
  lead,
  onSelect,
  onMove,
  onAction,
}: {
  lead: SalesLead;
  onSelect: () => void;
  onMove: (direction: "left" | "right") => void;
  onAction: (action: string) => void;
}) {
  const daysInStage = differenceInDays(new Date(), new Date(lead.updated_at || lead.created_at));
  const isStale = daysInStage > 14;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all border-l-4 group",
        lead.temperature === "hot" && "border-l-red-500",
        lead.temperature === "warm" && "border-l-amber-500",
        lead.temperature === "cold" && "border-l-blue-500",
        !lead.temperature && "border-l-gray-300",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{lead.company_name || "Unknown Company"}</h4>
              {lead.lead_grade && <GradeBadge grade={lead.lead_grade} />}
            </div>
            {lead.contact_name && <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction("call")}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("email")}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("schedule")}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction("sequence")}>
                <Play className="h-4 w-4 mr-2" />
                Start Sequence
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Score & Temperature */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <TemperatureIcon temperature={lead.temperature} />
            <span className="text-xs text-muted-foreground">{lead.lead_score || 0}pts</span>
          </div>
          {lead.source && (
            <Badge variant="outline" className="text-[10px] h-5">
              {lead.source}
            </Badge>
          )}
        </div>

        {/* Stale Warning */}
        {isStale && (
          <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
            <AlertTriangle className="h-3 w-3" />
            <span>Stale {daysInStage}d</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMove("left");
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{daysInStage}d</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMove("right");
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// DEAL CARD COMPONENT
// =====================================================
function DealCard({
  deal,
  onSelect,
  onMove,
}: {
  deal: Deal & { daysInStage: number; isStale: boolean };
  onSelect: () => void;
  onMove: (direction: "left" | "right") => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all group" onClick={onSelect}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{deal.name || deal.title}</h4>
            {deal.customer_name && <p className="text-xs text-muted-foreground truncate">{deal.customer_name}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-green-600">
                <Check className="h-4 w-4 mr-2" />
                Mark Won
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <X className="h-4 w-4 mr-2" />
                Mark Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            ${(deal.value || 0).toLocaleString()}
          </Badge>
          <span className="text-xs text-muted-foreground">{deal.probability}%</span>
        </div>

        {deal.isStale && (
          <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
            <AlertTriangle className="h-3 w-3" />
            <span>Stale {deal.daysInStage}d</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 mt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMove("left");
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{deal.daysInStage}d</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMove("right");
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function LeadPipeline() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [viewMode, setViewMode] = useState<"leads" | "deals" | "both">("both");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addToStage, setAddToStage] = useState<string | null>(null);
  const [newDeal, setNewDeal] = useState({ name: "", customer_name: "", value: "", probability: "50", notes: "" });

  // =====================================================
  // FETCH LEADS
  // =====================================================
  const {
    data: leads = [],
    isLoading: loadingLeads,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["pipeline-leads", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("sales_leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .not("status", "in", '("won","lost","converted")')
        .order("lead_score", { ascending: false });
      if (error) throw error;
      return data as SalesLead[];
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // FETCH DEALS
  // =====================================================
  const {
    data: deals = [],
    isLoading: loadingDeals,
    refetch: refetchDeals,
  } = useQuery({
    queryKey: ["pipeline-deals", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("tenant_id", tenantId)
        .not("stage", "in", '("Won","Lost")')
        .order("value", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        daysInStage: differenceInDays(new Date(), new Date(d.updated_at || d.created_at)),
        isStale: differenceInDays(new Date(), new Date(d.updated_at || d.created_at)) > 14,
      }));
    },
    enabled: !!tenantId,
  });

  // =====================================================
  // UPDATE LEAD STAGE
  // =====================================================
  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
      const { error } = await supabase
        .from("sales_leads")
        .update({
          deal_stage: stage,
          status: stage === "RET" ? "converted" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-leads", tenantId] });
      toast({ title: "Lead moved" });
    },
  });

  // =====================================================
  // UPDATE DEAL STAGE
  // =====================================================
  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === stage);
      const { error } = await supabase
        .from("deals")
        .update({ stage, probability: stageConfig?.probability || 50, updated_at: new Date().toISOString() })
        .eq("id", dealId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals", tenantId] });
      toast({ title: "Deal moved" });
    },
  });

  // =====================================================
  // ADD DEAL
  // =====================================================
  const addDealMutation = useMutation({
    mutationFn: async (dealData: typeof newDeal & { stage: string }) => {
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === dealData.stage);
      const { data, error } = await supabase
        .from("deals")
        .insert({
          tenant_id: tenantId,
          name: dealData.name,
          customer_name: dealData.customer_name || null,
          value: parseFloat(dealData.value) || 0,
          probability: stageConfig?.probability || parseInt(dealData.probability) || 50,
          stage: dealData.stage,
          notes: dealData.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals", tenantId] });
      toast({ title: "Deal created" });
      setShowAddDialog(false);
      setNewDeal({ name: "", customer_name: "", value: "", probability: "50", notes: "" });
    },
  });

  // =====================================================
  // GET ITEMS FOR STAGE
  // =====================================================
  const getLeadsForStage = useCallback(
    (stageId: string) => {
      return leads
        .filter((lead) => {
          const leadStage = lead.deal_stage || "PROS";
          return leadStage === stageId;
        })
        .filter((lead) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return (
            lead.company_name?.toLowerCase().includes(q) ||
            lead.contact_name?.toLowerCase().includes(q) ||
            lead.email?.toLowerCase().includes(q)
          );
        });
    },
    [leads, searchQuery],
  );

  const getDealsForStage = useCallback(
    (stageId: string) => {
      return deals
        .filter((deal) => deal.stage === stageId)
        .filter((deal) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return deal.name?.toLowerCase().includes(q) || deal.customer_name?.toLowerCase().includes(q);
        });
    },
    [deals, searchQuery],
  );

  // =====================================================
  // MOVE HANDLERS
  // =====================================================
  const moveLeadToStage = (leadId: string, currentStage: string, direction: "left" | "right") => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);
    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      updateLeadStageMutation.mutate({ leadId, stage: PIPELINE_STAGES[newIndex].id });
    }
  };

  const moveDealToStage = (dealId: string, currentStage: string, direction: "left" | "right") => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);
    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      updateDealStageMutation.mutate({ dealId, stage: PIPELINE_STAGES[newIndex].id });
    }
  };

  // =====================================================
  // STATS
  // =====================================================
  const stats = useMemo(() => {
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const weightedValue = deals.reduce((sum, d) => sum + ((d.value || 0) * (d.probability || 0)) / 100, 0);
    return {
      totalValue,
      weightedValue,
      activeDeals: deals.length,
      totalLeads: leads.length,
      staleCount:
        deals.filter((d) => d.isStale).length +
        leads.filter((l) => differenceInDays(new Date(), new Date(l.updated_at || l.created_at)) > 14).length,
    };
  }, [leads, deals]);

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lead Pipeline</h1>
            <p className="text-muted-foreground">Manage and track your leads & deals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetchLeads();
                refetchDeals();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b bg-muted/30 px-6 py-3">
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Total Pipeline</div>
            <div className="text-xl font-bold">${stats.totalValue.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Weighted Value</div>
            <div className="text-xl font-bold text-green-600">${stats.weightedValue.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Active Deals</div>
            <div className="text-xl font-bold">{stats.activeDeals}</div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Total Leads</div>
            <div className="text-xl font-bold">{stats.totalLeads}</div>
          </Card>
          <Card className="p-3">
            <div className="text-sm text-muted-foreground">Stale Items</div>
            <div className={cn("text-xl font-bold", stats.staleCount > 0 && "text-red-600")}>{stats.staleCount}</div>
          </Card>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = getLeadsForStage(stage.id);
            const stageDeals = getDealsForStage(stage.id);
            const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            const itemCount = stageLeads.length + stageDeals.length;

            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
                <Card className="bg-muted/30">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                        <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                        <Badge variant="secondary" className="h-5 text-xs">
                          {itemCount}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setAddToStage(stage.id);
                          setShowAddDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>${stageTotal.toLocaleString()}</span>
                      <span>${((stageTotal * stage.probability) / 100).toLocaleString()} weighted</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[calc(100vh-340px)]">
                      <div className="space-y-2">
                        {/* Leads */}
                        {(viewMode === "leads" || viewMode === "both") &&
                          stageLeads.map((lead) => (
                            <LeadCard
                              key={lead.id}
                              lead={lead}
                              onSelect={() => setSelectedLead(lead)}
                              onMove={(dir) => moveLeadToStage(lead.id, stage.id, dir)}
                              onAction={(action) => toast({ title: `${action} for ${lead.company_name}` })}
                            />
                          ))}

                        {/* Deals */}
                        {(viewMode === "deals" || viewMode === "both") &&
                          stageDeals.map((deal) => (
                            <DealCard
                              key={deal.id}
                              deal={deal}
                              onSelect={() => setSelectedDeal(deal)}
                              onMove={(dir) => moveDealToStage(deal.id, stage.id, dir)}
                            />
                          ))}

                        {/* Empty State */}
                        {itemCount === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No items in this stage</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setAddToStage(stage.id);
                                setShowAddDialog(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Deal
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="w-[500px]">
          <SheetHeader>
            <SheetTitle>{selectedLead?.company_name}</SheetTitle>
            <SheetDescription>Lead Details</SheetDescription>
          </SheetHeader>
          {selectedLead && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                {selectedLead.lead_grade && <GradeBadge grade={selectedLead.lead_grade} />}
                <Badge variant="outline">{selectedLead.status}</Badge>
                <Badge>{selectedLead.source}</Badge>
              </div>
              <div className="space-y-2">
                {selectedLead.contact_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.contact_name}</span>
                  </div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">
                      {selectedLead.email}
                    </a>
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Score</span>
                <div className="flex items-center gap-2">
                  <Progress value={selectedLead.lead_score || 0} className="w-24 h-2" />
                  <span className="font-bold">{selectedLead.lead_score || 0}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Deal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deal</DialogTitle>
            <DialogDescription>
              Create a new deal in {PIPELINE_STAGES.find((s) => s.id === addToStage)?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Deal Name</Label>
              <Input
                value={newDeal.name}
                onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                placeholder="e.g., Enterprise Contract"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={newDeal.customer_name}
                onChange={(e) => setNewDeal({ ...newDeal, customer_name: e.target.value })}
                placeholder="Company or contact name"
              />
            </div>
            <div className="space-y-2">
              <Label>Value ($)</Label>
              <Input
                type="number"
                value={newDeal.value}
                onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newDeal.notes}
                onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addDealMutation.mutate({ ...newDeal, stage: addToStage || "PROS" })}
              disabled={!newDeal.name}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
