import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Truck,
  Search,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  MapPin,
  Calendar,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { PageLoading } from "@/components/shared/PageLoading";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
];

const STATUS_OPTIONS = ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "returned", "lost"];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  picked_up: "bg-slate-500/10 text-slate-600 border-slate-500/30",
  in_transit: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  out_for_delivery: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  returned: "bg-red-500/10 text-red-600 border-red-500/30",
  lost: "bg-red-500/10 text-red-600 border-red-500/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  in_transit: <Truck className="h-3 w-3" />,
  delivered: <CheckCircle2 className="h-3 w-3" />,
  returned: <RotateCcw className="h-3 w-3" />,
};

function DelayBadge({ probability }: { probability: number | null }) {
  if (probability == null) return <span className="text-muted-foreground">--</span>;
  const pct = Math.round(probability * 100);
  if (pct >= 60)
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {pct}% delay risk
      </Badge>
    );
  if (pct >= 30)
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
        {pct}% delay risk
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
      {pct}% on track
    </Badge>
  );
}

const BLANK_FORM = {
  po_number: "",
  carrier: "",
  carrier_tracking_number: "",
  origin_address: "",
  destination_address: "",
  status: "pending",
  estimated_delivery: "",
  shipping_cost: "",
  currency: "AED",
};

function isManualShipment(s: any) {
  return s.metadata && s.metadata.source === "manual";
}

export default function Shipments() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id ?? "";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["ops_shipments", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_shipments")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const defaults = useMemo(() => ({
    currency: shipments[0]?.currency || "AED",
  }), [shipments]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ops_shipments", tenantSlug] });

  const buildRow = (forUpdate = false) => {
    const row: any = {
      po_number: form.po_number.trim() || null,
      carrier: form.carrier.trim() || null,
      carrier_tracking_number: form.carrier_tracking_number.trim() || null,
      origin_address: form.origin_address.trim() || null,
      destination_address: form.destination_address.trim() || null,
      status: form.status,
      estimated_delivery: form.estimated_delivery ? new Date(form.estimated_delivery).toISOString() : null,
      shipping_cost: form.shipping_cost === "" ? 0 : Number(form.shipping_cost),
      currency: form.currency.trim() || defaults.currency,
    };
    return row;
  };

  const addShipment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ops_shipments").insert({
        tenant_id: tenantSlug,
        metadata: { source: "manual" },
        ...buildRow(),
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Shipment added"); closeDialog(); },
    onError: (e: any) => toast.error("Failed to add shipment: " + (e?.message || "error")),
  });

  const updateShipment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ops_shipments")
        .update({ ...buildRow(true), updated_at: new Date().toISOString() })
        .eq("id", editingId)
        .eq("tenant_id", tenantSlug);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Shipment updated"); closeDialog(); },
    onError: (e: any) => toast.error("Failed to update shipment: " + (e?.message || "error")),
  });

  const deleteShipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ops_shipments")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantSlug);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Shipment deleted"); setDeleteTarget(null); },
    onError: (e: any) => toast.error("Failed to delete shipment: " + (e?.message || "error")),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, currency: defaults.currency });
    setDialogOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      po_number: s.po_number || "",
      carrier: s.carrier || "",
      carrier_tracking_number: s.carrier_tracking_number || "",
      origin_address: s.origin_address || "",
      destination_address: s.destination_address || "",
      status: s.status || "pending",
      estimated_delivery: s.estimated_delivery ? String(s.estimated_delivery).slice(0, 10) : "",
      shipping_cost: s.shipping_cost == null ? "" : String(s.shipping_cost),
      currency: s.currency || defaults.currency,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setSaving(false); };

  const handleSave = async () => {
    if (!form.carrier.trim() && !form.po_number.trim()) {
      toast.error("Add a carrier or PO number to identify this shipment");
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateShipment.mutateAsync();
      else await addShipment.mutateAsync();
    } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    let list = shipments;
    if (activeTab !== "all") {
      list = list.filter((s: any) => s.status === activeTab);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s: any) =>
          (s.carrier_tracking_number || s.tracking_number || "").toLowerCase().includes(term) ||
          (s.carrier || "").toLowerCase().includes(term) ||
          (s.po_number || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [shipments, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter((s: any) => s.status === "in_transit").length;
    const delivered = shipments.filter((s: any) => s.status === "delivered").length;
    // Health-strip derivations (additive; only from already-fetched rows).
    const deliveredWithDates = shipments.filter(
      (s: any) => s.status === "delivered" && s.actual_delivery && s.estimated_delivery
    );
    const onTimePct = deliveredWithDates.length
      ? Math.round(
          (deliveredWithDates.filter(
            (s: any) => new Date(s.actual_delivery) <= new Date(s.estimated_delivery)
          ).length /
            deliveredWithDates.length) *
            100
        )
      : null;
    const atRisk = shipments.filter(
      (s: any) =>
        s.status !== "delivered" &&
        s.status !== "returned" &&
        Number(s.delay_probability ?? 0) >= 0.6
    ).length;
    return { total, inTransit, delivered, onTimePct, atRisk };
  }, [shipments]);

  // Tier 2-style health verdict — at-risk shipments or sub-80% on-time = attention.
  const shipAttention =
    stats.total > 0 &&
    (stats.atRisk > 0 || (stats.onTimePct !== null && stats.onTimePct < 80));

  if (!tenantConfig) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-500" />
            Shipments
          </h1>
          <p className="text-muted-foreground mt-1">
            COURIER agent tracks logistics — or log and manage shipments manually
          </p>
        </div>
        <Button variant="outline" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Shipment
        </Button>
      </div>

      {/* Health strip (Tier 2 style) — surfaces existing metrics, graceful when empty */}
      <Card
        className={
          stats.total === 0
            ? "border-border"
            : shipAttention
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-emerald-500/40 bg-emerald-500/5"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {stats.total === 0 ? (
              <Truck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            ) : shipAttention ? (
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold leading-snug">
                {stats.total === 0
                  ? "No shipments yet"
                  : shipAttention
                  ? `Logistics needs attention${stats.atRisk > 0 ? ` — ${stats.atRisk} at delay risk` : ""}`
                  : "Logistics on track"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.total === 0 ? (
                  "Log shipments or let COURIER track them to monitor on-time delivery."
                ) : (
                  <>
                    {stats.onTimePct === null ? "—" : `${stats.onTimePct}%`} on-time
                    {" · "}
                    {stats.inTransit} in transit
                    {" · "}
                    {stats.atRisk} at delay risk
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inTransit}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-60" />
            </div>
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
            placeholder="Search tracking#, carrier, PO..."
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
            <p className="text-center text-muted-foreground py-8">Loading shipments...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No shipments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 font-medium text-muted-foreground">PO #</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Tracking</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Carrier</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Source</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Est. Delivery</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Delay Risk</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: any) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors group"
                    >
                      <td className="py-3 font-mono">{s.po_number || "--"}</td>
                      <td className="py-3 font-mono text-xs">{s.carrier_tracking_number || s.tracking_number || "--"}</td>
                      <td className="py-3">{s.carrier || "--"}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${STATUS_BADGE[s.status] || ""}`}
                        >
                          {STATUS_ICON[s.status]}
                          {(s.status || "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {isManualShipment(s) ? (
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
                        {s.estimated_delivery
                          ? format(new Date(s.estimated_delivery), "MMM d, yyyy")
                          : "--"}
                      </td>
                      <td className="py-3">
                        <DelayBadge probability={s.delay_probability} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="h-7 px-2" aria-label="Edit shipment" title="Edit shipment" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" aria-label="Delete shipment" title="Delete shipment" onClick={() => setDeleteTarget(s)}>
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
            <DialogTitle>{editingId ? "Edit Shipment" : "Add Shipment"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update this shipment. You can override COURIER-tracked shipments." : "Manually log a shipment for tracking."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-po">PO Number</Label>
              <Input id="s-po" value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-carrier">Carrier</Label>
              <Input id="s-carrier" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. Aramex" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="s-track">Tracking Number</Label>
              <Input id="s-track" value={form.carrier_tracking_number} onChange={(e) => setForm({ ...form, carrier_tracking_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-origin">Origin</Label>
              <Input id="s-origin" value={form.origin_address} onChange={(e) => setForm({ ...form, origin_address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-dest">Destination</Label>
              <Input id="s-dest" value={form.destination_address} onChange={(e) => setForm({ ...form, destination_address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="s-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-eta">Est. Delivery</Label>
              <Input id="s-eta" type="date" value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-cost">Shipping Cost</Label>
              <Input id="s-cost" type="number" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-currency">Currency</Label>
              <Input id="s-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the shipment {deleteTarget?.carrier_tracking_number ? <span className="font-mono font-semibold">{deleteTarget.carrier_tracking_number}</span> : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteShipment.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
