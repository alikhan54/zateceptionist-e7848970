// src/pages/sales/DealTracker.tsx
// COMPLETE - Connected to real database with pipeline visualization
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Target,
  Trophy,
  AlertCircle,
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
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Deal {
  id: string;
  tenant_id: string;
  title: string;
  value: number;
  weighted_value: number;
  currency: string;
  stage: string;
  probability: number;
  contact_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  expected_close_date: string | null;
  ai_notes: string | null;
  created_at: string;
}

const PIPELINE_STAGES = [
  { id: "lead", name: "Lead", probability: 10, color: "bg-slate-500" },
  { id: "qualified", name: "Qualified", probability: 25, color: "bg-blue-500" },
  { id: "proposal", name: "Proposal", probability: 50, color: "bg-amber-500" },
  { id: "negotiation", name: "Negotiation", probability: 75, color: "bg-purple-500" },
  { id: "won", name: "Won", probability: 100, color: "bg-green-500" },
  { id: "lost", name: "Lost", probability: 0, color: "bg-red-500" },
];

export default function DealTracker() {
  const navigate = useNavigate();
  // CRITICAL FIX: Get both tenantId (slug) and tenantConfig (full object with UUID)
  const { tenantId, tenantConfig } = useTenant();
  // USE THIS FOR ALL DATABASE OPERATIONS - This is the actual UUID!
  const tenantUuid = tenantConfig?.id;
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: "",
    value: "",
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    stage: "lead",
  });

  useEffect(() => {
    if (tenantId) {
      fetchDeals();
    }
  }, [tenantId]);

  const fetchDeals = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("tenant_id", tenantId) // Use SLUG for deals table
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDeal = async () => {
    if (!tenantId) return;
    try {
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === newDeal.stage);
      const value = parseFloat(newDeal.value) || 0;

      // Call n8n webhook
      const response = await fetch("https://webhooks.zatesystems.com/webhook/deal-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId, // Use SLUG for deals table
          title: newDeal.title,
          value: value,
          stage: newDeal.stage,
          company_name: newDeal.company_name,
          contact_name: newDeal.contact_name,
          email: newDeal.email,
          phone: newDeal.phone,
        }),
      });

      if (!response.ok) {
        // Fallback to direct insert if webhook fails
        const { error } = await supabase.from("deals").insert({
          tenant_id: tenantId, // Use SLUG for deals table
          title: newDeal.title,
          value: value,
          weighted_value: (value * (stageConfig?.probability || 10)) / 100,
          stage: newDeal.stage,
          probability: stageConfig?.probability || 10,
          company_name: newDeal.company_name,
          contact_name: newDeal.contact_name,
          email: newDeal.email,
          phone: newDeal.phone,
        });

        if (error) throw error;
      }

      setShowCreateDialog(false);
      setNewDeal({ title: "", value: "", company_name: "", contact_name: "", email: "", phone: "", stage: "lead" });
      fetchDeals();
    } catch (error) {
      console.error("Error creating deal:", error);
    }
  };

  const updateDealStage = async (dealId: string, newStage: string) => {
    if (!tenantId) return;
    try {
      const stageConfig = PIPELINE_STAGES.find((s) => s.id === newStage);
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;

      // Call n8n webhook
      await fetch("https://webhooks.zatesystems.com/webhook/deal-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId, // Use SLUG for deals table
          deal_id: dealId,
          stage: newStage,
        }),
      });

      // Update locally
      const { error } = await supabase
        .from("deals")
        .update({
          stage: newStage,
          probability: stageConfig?.probability || 0,
          weighted_value: (deal.value * (stageConfig?.probability || 0)) / 100,
          actual_close_date: ["won", "lost"].includes(newStage) ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dealId);

      if (error) throw error;
      fetchDeals();
    } catch (error) {
      console.error("Error updating deal:", error);
    }
  };

  const deleteDeal = async (dealId: string) => {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    try {
      const { error } = await supabase.from("deals").delete().eq("id", dealId);

      if (error) throw error;
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    } catch (error) {
      console.error("Error deleting deal:", error);
    }
  };

  // Filter deals
  const filteredDeals = deals.filter(
    (deal) =>
      !searchQuery ||
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Calculate metrics
  const activeDeals = filteredDeals.filter((d) => !["won", "lost"].includes(d.stage));
  const wonDeals = filteredDeals.filter((d) => d.stage === "won");
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedPipeline = activeDeals.reduce((sum, d) => sum + (d.weighted_value || 0), 0);

  // Group deals by stage for Kanban view
  const dealsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.id] = filteredDeals.filter((d) => d.stage === stage.id);
      return acc;
    },
    {} as Record<string, Deal[]>,
  );

  const formatCurrency = (value: number, currency = "AED") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const DealCard = ({ deal }: { deal: Deal }) => (
    <Card className="mb-2 hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-sm line-clamp-1">{deal.title}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/sales/deals/${deal.id}`)}>View Details</DropdownMenuItem>
              {PIPELINE_STAGES.filter((s) => s.id !== deal.stage).map((stage) => (
                <DropdownMenuItem key={stage.id} onClick={() => updateDealStage(deal.id, stage.id)}>
                  <ArrowRight className="h-4 w-4 mr-2" /> Move to {stage.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem className="text-red-600" onClick={() => deleteDeal(deal.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-lg font-bold text-green-600 mb-2">{formatCurrency(deal.value, deal.currency)}</p>

        {deal.company_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{deal.company_name}</span>
          </div>
        )}

        {deal.contact_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <User className="h-3 w-3" />
            <span className="truncate">{deal.contact_name}</span>
          </div>
        )}

        {deal.ai_notes && (
          <div className="flex items-start gap-1 text-xs text-purple-600 bg-purple-50 rounded p-1.5 mb-1">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{deal.ai_notes}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">{deal.probability}% probability</span>
          <div className="flex gap-1">
            {deal.email && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                <a href={`mailto:${deal.email}`}>
                  <Mail className="h-3 w-3" />
                </a>
              </Button>
            )}
            {deal.phone && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                <a href={`tel:${deal.phone}`}>
                  <Phone className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deal Tracker</h1>
          <p className="text-muted-foreground">Track and manage your deals</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchDeals} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Add Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Deal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Deal Title *</Label>
                  <Input
                    placeholder="e.g., Enterprise Package"
                    value={newDeal.title}
                    onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value (AED) *</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company name"
                      value={newDeal.company_name}
                      onChange={(e) => setNewDeal({ ...newDeal, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input
                      placeholder="Contact name"
                      value={newDeal.contact_name}
                      onChange={(e) => setNewDeal({ ...newDeal, contact_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="email@company.com"
                      value={newDeal.email}
                      onChange={(e) => setNewDeal({ ...newDeal, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+971..."
                      value={newDeal.phone}
                      onChange={(e) => setNewDeal({ ...newDeal, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.filter((s) => !["won", "lost"].includes(s.id)).map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={createDeal} disabled={!newDeal.title || !newDeal.value}>
                  Create Deal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won This Month</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(wonValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deals</p>
                <p className="text-2xl font-bold">{activeDeals.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(pipelineValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weighted Pipeline</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(weightedPipeline)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban Pipeline */}
      {isLoading ? (
        <div className="grid grid-cols-6 gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="space-y-2">
              <div className="h-8 bg-muted animate-pulse rounded" />
              <div className="h-32 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="space-y-2">
              {/* Stage Header */}
              <div className={`${stage.color} text-white p-2 rounded-lg`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{stage.name}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    {dealsByStage[stage.id]?.length || 0}
                  </Badge>
                </div>
                <p className="text-xs mt-1 opacity-80">
                  {formatCurrency(dealsByStage[stage.id]?.reduce((s, d) => s + (d.value || 0), 0) || 0)}
                </p>
              </div>

              {/* Deals in Stage */}
              <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                {dealsByStage[stage.id]?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">No deals</div>
                ) : (
                  dealsByStage[stage.id]?.map((deal) => <DealCard key={deal.id} deal={deal} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
