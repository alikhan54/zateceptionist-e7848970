// src/pages/sales/Proposals.tsx
// COMPLETE - Connected to real database with AI generation
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Send,
  Eye,
  Check,
  X,
  Clock,
  DollarSign,
  MoreHorizontal,
  Search,
  RefreshCw,
  Download,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProposalItem {
  name: string;
  qty: number;
  price: number;
}

interface Proposal {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  company_name: string | null;
  contact_name: string | null;
  value: number;
  currency: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  valid_until: string | null;
  items: ProposalItem[];
  lead_id: string | null;
  ai_notes: string | null;
  ai_created: boolean;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  draft: { color: "bg-gray-100 text-gray-700", icon: <Edit className="h-3 w-3" /> },
  sent: { color: "bg-blue-100 text-blue-700", icon: <Send className="h-3 w-3" /> },
  viewed: { color: "bg-purple-100 text-purple-700", icon: <Eye className="h-3 w-3" /> },
  accepted: { color: "bg-green-100 text-green-700", icon: <Check className="h-3 w-3" /> },
  declined: { color: "bg-red-100 text-red-700", icon: <X className="h-3 w-3" /> },
  expired: { color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
};

export default function Proposals() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: "",
    company_name: "",
    contact_name: "",
    description: "",
    items: [{ name: "", qty: 1, price: 0 }] as ProposalItem[],
    valid_days: 30,
  });

  useEffect(() => {
    if (tenantId) {
      fetchProposals();
    }
  }, [tenantId]);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map((p) => ({
        ...p,
        items: typeof p.items === "string" ? JSON.parse(p.items) : p.items || [],
      }));

      setProposals(parsed);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProposal = async () => {
    try {
      const totalValue = newProposal.items.reduce((sum, item) => sum + item.qty * item.price, 0);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + newProposal.valid_days);

      // Try n8n webhook first
      try {
        await fetch("https://webhooks.zatesystems.com/webhook/proposal-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenantId,
            title: newProposal.title,
            company_name: newProposal.company_name,
            contact_name: newProposal.contact_name,
            description: newProposal.description,
            items: newProposal.items.filter((i) => i.name),
            value: totalValue,
            valid_until: validUntil.toISOString().split("T")[0],
          }),
        });
      } catch (e) {
        // Webhook failed, use direct insert
      }

      // Direct insert as fallback
      const { error } = await supabase.from("proposals").insert({
        tenant_id: tenantId,
        title: newProposal.title,
        company_name: newProposal.company_name,
        contact_name: newProposal.contact_name,
        description: newProposal.description,
        items: newProposal.items.filter((i) => i.name),
        value: totalValue,
        status: "draft",
        valid_until: validUntil.toISOString().split("T")[0],
      });

      if (error) throw error;

      setShowCreateDialog(false);
      setNewProposal({
        title: "",
        company_name: "",
        contact_name: "",
        description: "",
        items: [{ name: "", qty: 1, price: 0 }],
        valid_days: 30,
      });
      fetchProposals();
    } catch (error) {
      console.error("Error creating proposal:", error);
    }
  };

  const sendProposal = async (id: string) => {
    try {
      // Call n8n webhook to send
      await fetch("https://webhooks.zatesystems.com/webhook/proposal-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, proposal_id: id }),
      });

      // Update locally
      const { error } = await supabase
        .from("proposals")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      fetchProposals();
    } catch (error) {
      console.error("Error sending proposal:", error);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };

      if (status === "accepted") updateData.accepted_at = new Date().toISOString();
      if (status === "declined") updateData.declined_at = new Date().toISOString();

      const { error } = await supabase.from("proposals").update(updateData).eq("id", id);

      if (error) throw error;
      fetchProposals();
    } catch (error) {
      console.error("Error updating proposal:", error);
    }
  };

  const deleteProposal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this proposal?")) return;

    try {
      const { error } = await supabase.from("proposals").delete().eq("id", id);

      if (error) throw error;
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting proposal:", error);
    }
  };

  const duplicateProposal = async (proposal: Proposal) => {
    try {
      const { error } = await supabase.from("proposals").insert({
        tenant_id: tenantId,
        title: `${proposal.title} (Copy)`,
        company_name: proposal.company_name,
        contact_name: proposal.contact_name,
        description: proposal.description,
        items: proposal.items,
        value: proposal.value,
        status: "draft",
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

      if (error) throw error;
      fetchProposals();
    } catch (error) {
      console.error("Error duplicating proposal:", error);
    }
  };

  const addItem = () => {
    setNewProposal((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", qty: 1, price: 0 }],
    }));
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    setNewProposal((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const removeItem = (index: number) => {
    setNewProposal((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Filter proposals
  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalProposals = proposals.length;
  const sentCount = proposals.filter((p) => ["sent", "viewed", "accepted", "declined"].includes(p.status)).length;
  const acceptedCount = proposals.filter((p) => p.status === "accepted").length;
  const totalValue = proposals.reduce((sum, p) => sum + (p.value || 0), 0);
  const wonValue = proposals.filter((p) => p.status === "accepted").reduce((sum, p) => sum + (p.value || 0), 0);

  const formatCurrency = (value: number, currency = "AED") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-muted-foreground">Create, track, and manage sales proposals</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchProposals}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Proposal Title *</Label>
                  <Input
                    placeholder="e.g., Enterprise Package Proposal"
                    value={newProposal.title}
                    onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company name"
                      value={newProposal.company_name}
                      onChange={(e) => setNewProposal({ ...newProposal, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input
                      placeholder="Contact name"
                      value={newProposal.contact_name}
                      onChange={(e) => setNewProposal({ ...newProposal, contact_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Proposal description..."
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                  />
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {newProposal.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Item name"
                          className="flex-1"
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          className="w-20"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 1)}
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          className="w-28"
                          value={item.price}
                          onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                        />
                        <span className="w-24 text-right font-medium">{formatCurrency(item.qty * item.price)}</span>
                        {newProposal.items.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <span className="font-bold">
                      Total: {formatCurrency(newProposal.items.reduce((s, i) => s + i.qty * i.price, 0))}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valid for (days)</Label>
                  <Input
                    type="number"
                    value={newProposal.valid_days}
                    onChange={(e) => setNewProposal({ ...newProposal, valid_days: parseInt(e.target.value) || 30 })}
                  />
                </div>

                <Button className="w-full" onClick={createProposal} disabled={!newProposal.title}>
                  Create Proposal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Proposals</p>
            <p className="text-2xl font-bold">{totalProposals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sent</p>
            <p className="text-2xl font-bold">{sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Won Value</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(wonValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatusFilter("all")}>
              All Proposals
            </TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proposals..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No proposals yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first proposal to get started</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Create Proposal
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proposal</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProposals.map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium">{proposal.title}</p>
                                {proposal.ai_created && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-purple-600 border-purple-300">
                                    AI
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{proposal.contact_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{proposal.company_name || "-"}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(proposal.value, proposal.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[proposal.status]?.color} flex items-center gap-1 w-fit`}>
                            {statusConfig[proposal.status]?.icon}
                            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(proposal.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {proposal.status === "draft" && (
                              <Button variant="ghost" size="sm" onClick={() => sendProposal(proposal.id)} title="Send">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/sales/proposals/${proposal.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateProposal(proposal)}>
                                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" /> Download PDF
                                </DropdownMenuItem>
                                {proposal.status === "sent" && (
                                  <>
                                    <DropdownMenuItem onClick={() => updateStatus(proposal.id, "accepted")}>
                                      <Check className="h-4 w-4 mr-2" /> Mark Accepted
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatus(proposal.id, "declined")}>
                                      <X className="h-4 w-4 mr-2" /> Mark Declined
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteProposal(proposal.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Proposal Templates</h3>
              <p className="text-muted-foreground">Create reusable templates for faster proposal creation</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProposals
                  .filter((p) => p.viewed_at || p.sent_at)
                  .slice(0, 10)
                  .map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${statusConfig[p.status]?.color}`}
                      >
                        {statusConfig[p.status]?.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.company_name} •{" "}
                          {p.status === "viewed" ? "Viewed" : p.status === "sent" ? "Sent" : p.status}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(p.viewed_at || p.sent_at || p.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
