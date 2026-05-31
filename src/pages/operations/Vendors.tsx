import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Star,
  CheckCircle2,
  Clock,
  Globe,
  Tag,
  Loader2,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-sm">--</span>;
  const s = Number(score);
  const cls =
    s >= 4.5
      ? "bg-green-500/10 text-green-600 border-green-500/30"
      : s >= 4.0
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : s >= 3.5
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
      : "bg-red-500/10 text-red-600 border-red-500/30";
  return (
    <Badge variant="outline" className={cls}>
      <Star className="h-3 w-3 mr-1 fill-current" />
      {s.toFixed(2)} / 5
    </Badge>
  );
}

const BLANK_FORM = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "",
  country: "UAE",
  categories: "",
  payment_terms: "NET-30",
  currency: "AED",
  lead_time_days: "",
  is_approved: true,
};

export default function Vendors() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id ?? "";
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [scoring, setScoring] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["ops_vendors", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_vendors")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("score", { ascending: false, nullsFirst: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // New manual rows inherit the tenant's existing ops industry/region so they
  // match AI-created rows (industry/region are NOT NULL on ops_vendors).
  const defaults = useMemo(() => ({
    industry: vendors[0]?.industry || tenantConfig?.industry || "general",
    region: vendors[0]?.region || tenantConfig?.region || "uae",
    currency: vendors[0]?.currency || "AED",
  }), [vendors, tenantConfig]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ops_vendors", tenantSlug] });

  const buildRow = () => {
    const cats = form.categories
      .split(",").map((c) => c.trim()).filter(Boolean);
    return {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      categories: cats,
      payment_terms: form.payment_terms.trim() || null,
      currency: form.currency.trim() || defaults.currency,
      lead_time_days: form.lead_time_days === "" ? null : Number(form.lead_time_days),
      is_approved: form.is_approved,
    };
  };

  const addVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ops_vendors").insert({
        tenant_id: tenantSlug,
        industry: defaults.industry,
        region: defaults.region,
        discovery_source: "manual",
        ...buildRow(),
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Vendor added"); closeDialog(); },
    onError: (e: any) => toast.error("Failed to add vendor: " + (e?.message || "error")),
  });

  const updateVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ops_vendors")
        .update({ ...buildRow(), updated_at: new Date().toISOString() })
        .eq("id", editingId)
        .eq("tenant_id", tenantSlug);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Vendor updated"); closeDialog(); },
    onError: (e: any) => toast.error("Failed to update vendor: " + (e?.message || "error")),
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ops_vendors")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantSlug);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Vendor deleted"); setDeleteTarget(null); },
    onError: (e: any) => toast.error("Failed to delete vendor: " + (e?.message || "error")),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, currency: defaults.currency });
    setDialogOpen(true);
  };

  const openEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      name: v.name || "",
      email: v.email || "",
      phone: v.phone || "",
      whatsapp: v.whatsapp || "",
      city: v.city || "",
      country: v.country || "UAE",
      categories: (v.categories || []).join(", "),
      payment_terms: v.payment_terms || "NET-30",
      currency: v.currency || defaults.currency,
      lead_time_days: v.lead_time_days == null ? "" : String(v.lead_time_days),
      is_approved: !!v.is_approved,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setSaving(false); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Vendor name is required"); return; }
    setSaving(true);
    try {
      if (editingId) await updateVendor.mutateAsync();
      else await addVendor.mutateAsync();
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return vendors;
    const term = searchTerm.toLowerCase();
    return vendors.filter(
      (v: any) =>
        (v.name || "").toLowerCase().includes(term) ||
        (v.city || "").toLowerCase().includes(term) ||
        (v.country || "").toLowerCase().includes(term) ||
        (v.categories || []).some((c: string) => c.toLowerCase().includes(term))
    );
  }, [vendors, searchTerm]);

  const stats = useMemo(() => {
    const total = vendors.length;
    const approved = vendors.filter((v: any) => v.is_approved && !v.is_blacklisted).length;
    const avgScore =
      vendors.length > 0
        ? vendors.reduce((sum: number, v: any) => sum + Number(v.score || 0), 0) /
          vendors.length
        : 0;
    const topPerformer = vendors[0]?.name ?? "--";
    return { total, approved, avgScore, topPerformer };
  }, [vendors]);

  const handleScoreVendors = async () => {
    setScoring(true);
    try {
      const resp = await fetch(
        "https://webhooks.zatesystems.com/webhook/ops/dispatch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenantSlug,
            tenant_slug: tenantSlug,
            industry: tenantConfig?.industry ?? "",
            region: tenantConfig?.region ?? "",
            goal: "DIPLOMAT: re-score all vendors based on the last 30 days of performance data",
            mode: "auto",
          }),
        }
      );
      if (resp.ok) {
        toast.success("DIPLOMAT scoring vendors — refresh in a few seconds");
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["ops_vendors", tenantSlug] });
        }, 4000);
      } else {
        toast.error(`Scoring failed (HTTP ${resp.status})`);
      }
    } catch (err: any) {
      toast.error("Scoring failed: " + (err?.message || "network error"));
    } finally {
      setScoring(false);
    }
  };

  if (!tenantConfig) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-500" />
            Vendors
          </h1>
          <p className="text-muted-foreground mt-1">
            DIPLOMAT agent ranks suppliers — or add and manage them manually
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Vendor
          </Button>
          <Button onClick={handleScoreVendors} disabled={scoring}>
            {scoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scoring...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Score Vendors
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Vendors</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg. Score</p>
            <p className="text-2xl font-bold text-amber-500">
              {stats.avgScore.toFixed(2)} / 5
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Performer</p>
            <p className="text-base font-semibold truncate" title={stats.topPerformer}>
              {stats.topPerformer}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <PageLoading />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No vendors found</p>
            <p className="text-sm">Adjust your search or add a new vendor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v: any) => (
            <Card key={v.id} className="hover:border-blue-500/40 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" title={v.name}>
                      {v.name}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                      <Globe className="h-3 w-3" />
                      <span>
                        {[v.city, v.country].filter(Boolean).join(", ") || "Location not set"}
                      </span>
                    </div>
                  </div>
                  <ScoreBadge score={v.score} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Categories */}
                <div className="flex flex-wrap gap-1">
                  {(v.categories || []).slice(0, 4).map((c: string) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      {c}
                    </Badge>
                  ))}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {v.lead_time_days != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {v.lead_time_days}d lead
                    </span>
                  )}
                  {v.payment_terms && (
                    <span>{v.payment_terms}</span>
                  )}
                  {v.currency && <span>{v.currency}</span>}
                  {v.is_approved && !v.is_blacklisted && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </span>
                  )}
                </div>

                {(v.email || v.phone || v.whatsapp) && (
                  <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
                    {v.email && <div className="truncate">{v.email}</div>}
                    {v.phone && <div>{v.phone}</div>}
                    {v.whatsapp && <div>WhatsApp: {v.whatsapp}</div>}
                  </div>
                )}

                {/* Provenance + manual actions */}
                <div className="flex items-center justify-between border-t pt-2">
                  {v.discovery_source === "manual" ? (
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-400/40">
                      <User className="h-3 w-3 mr-1" /> Manual
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-violet-500 border-violet-400/40">
                      <Sparkles className="h-3 w-3 mr-1" /> AI-sourced
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 px-2" aria-label="Edit vendor" title="Edit vendor" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" aria-label="Delete vendor" title="Delete vendor" onClick={() => setDeleteTarget(v)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update this supplier's details. You can override AI-sourced vendors." : "Manually add a supplier. The DIPLOMAT agent will score it on the next cycle."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="v-name">Name *</Label>
              <Input id="v-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Allergan Aesthetics MENA" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-email">Email</Label>
              <Input id="v-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-phone">Phone</Label>
              <Input id="v-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-whatsapp">WhatsApp</Label>
              <Input id="v-whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-city">City</Label>
              <Input id="v-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-country">Country</Label>
              <Input id="v-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-lead">Lead time (days)</Label>
              <Input id="v-lead" type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="v-cats">Categories (comma-separated)</Label>
              <Input id="v-cats" value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="injectables, fillers" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-terms">Payment terms</Label>
              <Input id="v-terms" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-currency">Currency</Label>
              <Input id="v-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <Switch id="v-approved" checked={form.is_approved} onCheckedChange={(c) => setForm({ ...form, is_approved: c })} />
              <Label htmlFor="v-approved">Approved supplier</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-semibold">{deleteTarget?.name}</span> from your vendor list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteVendor.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
