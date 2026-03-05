import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Send,
  Check,
  X,
  Clock,
  DollarSign,
  Edit,
  Save,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProposalItem {
  name: string;
  qty: number;
  price: number;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  draft: { color: "bg-gray-100 text-gray-700", icon: <Edit className="h-3 w-3" />, label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", icon: <Send className="h-3 w-3" />, label: "Sent" },
  viewed: { color: "bg-purple-100 text-purple-700", icon: <Eye className="h-3 w-3" />, label: "Viewed" },
  accepted: { color: "bg-green-100 text-green-700", icon: <Check className="h-3 w-3" />, label: "Accepted" },
  declined: { color: "bg-red-100 text-red-700", icon: <X className="h-3 w-3" />, label: "Declined" },
  expired: { color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" />, label: "Expired" },
};

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    company_name: "",
    contact_name: "",
    terms: "",
    valid_until: "",
    items: [] as ProposalItem[],
  });

  useEffect(() => {
    if (id && tenantId) fetchProposal();
  }, [id, tenantId]);

  const fetchProposal = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

      if (error) throw error;

      const parsed = {
        ...data,
        items: typeof data.items === "string" ? JSON.parse(data.items) : data.items || [],
      };
      setProposal(parsed);
      setEditData({
        title: parsed.title || "",
        description: parsed.description || "",
        company_name: parsed.company_name || "",
        contact_name: parsed.contact_name || "",
        terms: parsed.terms || "",
        valid_until: parsed.valid_until || "",
        items: parsed.items.length > 0 ? parsed.items : [{ name: "", qty: 1, price: 0 }],
      });
    } catch (error) {
      console.error("Error fetching proposal:", error);
      toast({ title: "Error", description: "Proposal not found", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const totalValue = editData.items
        .filter((i) => i.name)
        .reduce((sum, item) => sum + item.qty * item.price, 0);

      const { error } = await supabase
        .from("proposals")
        .update({
          title: editData.title,
          description: editData.description,
          company_name: editData.company_name,
          contact_name: editData.contact_name,
          terms: editData.terms,
          valid_until: editData.valid_until || null,
          items: editData.items.filter((i) => i.name),
          value: totalValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Saved", description: "Proposal updated successfully" });
      setIsEditing(false);
      fetchProposal();
    } catch (error) {
      console.error("Error saving proposal:", error);
      toast({ title: "Error", description: "Failed to save proposal", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    try {
      await fetch("https://webhooks.zatesystems.com/webhook/60ff10ba-4801-4f5e-9901-530b709b90bc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, proposal_id: id }),
      });

      const { error } = await supabase
        .from("proposals")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sent", description: "Proposal sent successfully" });
      fetchProposal();
    } catch (error) {
      console.error("Error sending proposal:", error);
      toast({ title: "Error", description: "Failed to send proposal", variant: "destructive" });
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === "accepted") updateData.accepted_at = new Date().toISOString();
      if (status === "declined") updateData.declined_at = new Date().toISOString();

      const { error } = await supabase.from("proposals").update(updateData).eq("id", id);
      if (error) throw error;
      toast({ title: "Updated", description: `Proposal marked as ${status}` });
      fetchProposal();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const addItem = () => {
    setEditData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", qty: 1, price: 0 }],
    }));
  };

  const updateItem = (index: number, field: keyof ProposalItem, value: any) => {
    setEditData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const removeItem = (index: number) => {
    setEditData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const formatCurrency = (value: number, currency = "AED") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-6 text-center py-20">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Proposal not found</h3>
        <Button onClick={() => navigate("/sales/proposals")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Proposals
        </Button>
      </div>
    );
  }

  const items: ProposalItem[] = isEditing ? editData.items : proposal.items || [];
  const totalValue = items.filter((i) => i.name).reduce((sum, i) => sum + i.qty * i.price, 0);
  const statusInfo = statusConfig[proposal.status] || statusConfig.draft;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales/proposals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            <p className="text-muted-foreground">
              {proposal.company_name || "No company"} &middot; {proposal.contact_name || "No contact"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${statusInfo.color} flex items-center gap-1`}>
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
          {!isEditing ? (
            <>
              {proposal.status === "draft" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button size="sm" onClick={handleSend}>
                    <Send className="h-4 w-4 mr-2" /> Send
                  </Button>
                </>
              )}
              {proposal.status === "sent" && (
                <>
                  <Button variant="outline" size="sm" className="text-green-600" onClick={() => updateStatus("accepted")}>
                    <Check className="h-4 w-4 mr-2" /> Accept
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => updateStatus("declined")}>
                    <X className="h-4 w-4 mr-2" /> Decline
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proposal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input value={editData.company_name} onChange={(e) => setEditData({ ...editData, company_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact</Label>
                      <Input value={editData.contact_name} onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Terms</Label>
                    <Textarea value={editData.terms} onChange={(e) => setEditData({ ...editData, terms: e.target.value })} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input type="date" value={editData.valid_until} onChange={(e) => setEditData({ ...editData, valid_until: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  {proposal.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p>{proposal.description}</p>
                    </div>
                  )}
                  {proposal.terms && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Terms</p>
                      <p className="whitespace-pre-wrap">{proposal.terms}</p>
                    </div>
                  )}
                  {proposal.ai_notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">AI Notes</p>
                      <p className="text-sm bg-purple-50 p-3 rounded-lg">{proposal.ai_notes}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Line Items</CardTitle>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {editData.items.map((item, idx) => (
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
                      {editData.items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.qty}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.qty * item.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">No line items</p>
              )}
              <div className="flex justify-end pt-4 border-t mt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue, proposal.currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                  {statusInfo.icon} {statusInfo.label}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Value</span>
                <span className="font-bold">{formatCurrency(proposal.value || 0, proposal.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{new Date(proposal.created_at).toLocaleDateString()}</span>
              </div>
              {proposal.valid_until && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valid Until</span>
                  <span className="text-sm">{new Date(proposal.valid_until).toLocaleDateString()}</span>
                </div>
              )}
              {proposal.sent_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <span className="text-sm">{new Date(proposal.sent_at).toLocaleString()}</span>
                </div>
              )}
              {proposal.viewed_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Viewed</span>
                  <span className="text-sm">{new Date(proposal.viewed_at).toLocaleString()}</span>
                </div>
              )}
              {proposal.accepted_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Accepted</span>
                  <span className="text-sm">{new Date(proposal.accepted_at).toLocaleString()}</span>
                </div>
              )}
              {proposal.declined_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Declined</span>
                  <span className="text-sm">{new Date(proposal.declined_at).toLocaleString()}</span>
                </div>
              )}
              {proposal.ai_created && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created by</span>
                  <Badge variant="outline" className="text-purple-600 border-purple-300">AI Generated</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
