import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ShoppingCart,
  Search,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Package,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/PageLoading";
import { useCurrencyFormatter, formatCurrencyAmount } from "@/lib/formatCurrency";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_OPTIONS = ["draft", "pending_approval", "approved", "sent", "delivered", "cancelled"];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  pending_approval: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  approved: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  sent: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  pending_approval: <Clock className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  delivered: <Package className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

const BLANK_FORM = {
  po_number: "",
  vendor_name: "",
  total_amount: "",
  currency: "AED",
  status: "draft",
  delivery_date: "",
  payment_terms: "NET-30",
  notes: "",
};

function isManualPO(po: any) {
  return !Array.isArray(po.agent_actions) || po.agent_actions.length === 0;
}

export default function PurchaseOrders() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id ?? "";
  const formatCurrency = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["ops_purchase_orders", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_purchase_orders")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const defaults = useMemo(() => ({
    industry: purchaseOrders[0]?.industry || tenantConfig?.industry || "general",
    region: purchaseOrders[0]?.region || tenantConfig?.region || "uae",
    currency: purchaseOrders[0]?.currency || "AED",
  }), [purchaseOrders, tenantConfig]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ops_purchase_orders", tenantSlug] });

  const genPoNumber = () =>
    `PO-${(tenantSlug || "T").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}-${Date.now().toString().slice(-7)}`;

  const buildRow = () => ({
    vendor_name: form.vendor_name.trim() || null,
    total_amount: form.total_amount === "" ? 0 : Number(form.total_amount),
    currency: form.currency.trim() || defaults.currency,
    status: form.status,
    delivery_date: form.delivery_date || null,
    payment_terms: form.payment_terms.trim() || "NET-30",
    notes: form.notes.trim() || null,
  });

  const addPO = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ops_purchase_orders").insert({
        po_number: form.po_number.trim() || genPoNumber(),
        tenant_id: tenantSlug,
        industry: defaults.industry,
        region: defaults.region,
        agent_actions: [],
        ...buildRow(),
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Purchase order created"); closeDialog(); },
    onError: (e: any) => toast.error("Failed to create PO: " + (e?.message || "error")),
  });

  const updatePO = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ops_purchase_orders")
        .update({ ...buildRow(), updated_at: new Date().toISOString() })
        .eq("id", editingId)
        .eq("tenant_id", tenantSlug);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Purchase order updated"); closeDialog(); },
    onError: (e: any) => toast.error("Failed to update PO: " + (e?.message || "error")),
  });

  const deletePO = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ops_purchase_orders")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantSlug);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Purchase order deleted"); setDeleteTarget(null); },
    onError: (e: any) => toast.error("Failed to delete PO: " + (e?.message || "error")),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, currency: defaults.currency });
    setDialogOpen(true);
  };

  const openEdit = (po: any) => {
    setEditingId(po.id);
    setForm({
      po_number: po.po_number || "",
      vendor_name: po.vendor_name || "",
      total_amount: po.total_amount == null ? "" : String(po.total_amount),
      currency: po.currency || defaults.currency,
      status: po.status || "draft",
      delivery_date: po.delivery_date ? String(po.delivery_date).slice(0, 10) : "",
      payment_terms: po.payment_terms || "NET-30",
      notes: po.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setSaving(false); };

  const handleSave = async () => {
    if (!form.vendor_name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      if (editingId) await updatePO.mutateAsync();
      else await addPO.mutateAsync();
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    let list = purchaseOrders;
    if (activeTab !== "all") {
      list = list.filter((po: any) => po.status === activeTab);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (po: any) =>
          (po.po_number || "").toLowerCase().includes(term) ||
          (po.vendor_name || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [purchaseOrders, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const total = purchaseOrders.length;
    const totalValue = purchaseOrders.reduce(
      (sum: number, po: any) => sum + (po.total_amount || 0),
      0
    );
    const pendingCount = purchaseOrders.filter(
      (po: any) => po.status === "pending_approval"
    ).length;
    const deliveredCount = purchaseOrders.filter(
      (po: any) => po.status === "delivered"
    ).length;
    // Health-strip derivation (additive): % BUYER-generated (non-manual).
    const aiCount = purchaseOrders.filter((po: any) => !isManualPO(po)).length;
    const aiPct = total > 0 ? Math.round((aiCount / total) * 100) : null;
    return { total, totalValue, pendingCount, deliveredCount, aiPct };
  }, [purchaseOrders]);

  // Tier 2-style health verdict — pending approvals are the action item.
  const poAttention = stats.total > 0 && stats.pendingCount > 0;

  if (!tenantConfig) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-indigo-500" />
            Purchase Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            BUYER agent auto-generates POs — or create and manage them manually
          </p>
        </div>
        <Button variant="outline" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Create PO
        </Button>
      </div>

      {/* Health strip (Tier 2 style) — surfaces existing metrics, graceful when empty */}
      <Card
        className={
          stats.total === 0
            ? "border-border"
            : poAttention
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-emerald-500/40 bg-emerald-500/5"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {stats.total === 0 ? (
              <ShoppingCart className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            ) : poAttention ? (
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold leading-snug">
                {stats.total === 0
                  ? "No purchase orders yet"
                  : poAttention
                  ? `Purchasing needs attention — ${stats.pendingCount} pending approval`
                  : "Purchasing on track"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.total === 0 ? (
                  "Create POs or let BUYER auto-generate them to track spend and approvals."
                ) : (
                  <>
                    {stats.aiPct === null ? "—" : `${stats.aiPct}%`} AI-generated
                    {" · "}
                    {stats.pendingCount} pending approval
                    {" · "}
                    {formatCurrency(stats.totalValue)} total
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total POs</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold text-indigo-500">
              {formatCurrency(stats.totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Delivered</p>
            <p className="text-2xl font-bold text-green-500">{stats.deliveredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO# or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading purchase orders...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No purchase orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 font-medium text-muted-foreground">PO Number</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Source</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Delivery</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po: any) => (
                    <tr
                      key={po.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors group"
                    >
                      <td className="py-3 font-mono font-medium">{po.po_number || "--"}</td>
                      <td className="py-3">{po.vendor_name || "--"}</td>
                      <td className="py-3 text-right font-medium">
                        {po.total_amount != null
                          ? formatCurrencyAmount(Number(po.total_amount), po.currency)
                          : "--"}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${STATUS_BADGE[po.status] || ""}`}
                        >
                          {STATUS_ICON[po.status]}
                          {(po.status || "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {isManualPO(po) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <User className="h-3 w-3" /> Manual
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                            <Sparkles className="h-3 w-3" /> AI
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {po.delivery_date
                          ? format(new Date(po.delivery_date), "MMM d, yyyy")
                          : "--"}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="h-7 px-2" aria-label="Edit PO" title="Edit PO" onClick={() => openEdit(po)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" aria-label="Delete PO" title="Delete PO" onClick={() => setDeleteTarget(po)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update this PO. You can override BUYER-generated orders." : "Manually raise a PO. Leave PO number blank to auto-generate."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="po-vendor">Vendor *</Label>
              <Input id="po-vendor" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="e.g. Allergan Aesthetics MENA" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-number">PO Number</Label>
              <Input id="po-number" value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} placeholder="auto" disabled={!!editingId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-amount">Total Amount</Label>
              <Input id="po-amount" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-currency">Currency</Label>
              <Input id="po-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="po-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-delivery">Delivery Date</Label>
              <Input id="po-delivery" type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-terms">Payment Terms</Label>
              <Input id="po-terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="po-notes">Notes</Label>
              <Textarea id="po-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-mono font-semibold">{deleteTarget?.po_number}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deletePO.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
