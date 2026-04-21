import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarClock, Plus, Loader2, Send } from "lucide-react";

type WarrantyRow = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  project_id: string | null;
  installation_date: string;
  warranty_years: number | null;
  warranty_expires_at: string | null;
  last_touch_at: string | null;
  touches: Array<{ type?: string; channel?: string; sent_at?: string; result?: string }> | null;
  next_touch_due: string | null;
  next_touch_type: string | null;
  is_active: boolean;
  created_at: string;
};

type Customer = { id: string; name: string | null; phone_number: string | null };

type KPIs = {
  active: number;
  expiring_this_month: number;
  touches_last_30d: number;
  overdue_touches: number;
};

export default function WarrantyTracker() {
  const { tenantId, tenantConfig } = useTenant();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"active" | "expired" | "all">("active");
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Warranty rows
  const rowsQuery = useQuery({
    queryKey: ["warranty_tracking", tenantId, filter],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("warranty_tracking")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("next_touch_due", { ascending: true, nullsFirst: false });
      if (filter === "active") q = q.eq("is_active", true);
      if (filter === "expired") q = q.eq("is_active", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WarrantyRow[];
    },
  });

  // KPIs (separate query so we can show totals regardless of filter)
  const kpisQuery = useQuery({
    queryKey: ["warranty_kpis", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<KPIs> => {
      const today = new Date().toISOString().slice(0, 10);
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const monthEndStr = monthEnd.toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [activeRes, expRes, touchesRes, overdueRes] = await Promise.all([
        supabase
          .from("warranty_tracking")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("is_active", true),
        supabase
          .from("warranty_tracking")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("is_active", true)
          .lte("warranty_expires_at", monthEndStr)
          .gte("warranty_expires_at", today),
        supabase
          .from("warranty_tracking")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .gte("last_touch_at", thirtyDaysAgo),
        supabase
          .from("warranty_tracking")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("is_active", true)
          .lt("next_touch_due", today),
      ]);
      return {
        active: activeRes.count ?? 0,
        expiring_this_month: expRes.count ?? 0,
        touches_last_30d: touchesRes.count ?? 0,
        overdue_touches: overdueRes.count ?? 0,
      };
    },
  });

  const customersQuery = useQuery({
    queryKey: ["customers_for_warranty", tenantId],
    enabled: !!tenantId && showNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone_number")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`warranty_tracking:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "warranty_tracking", filter: `tenant_id=eq.${tenantId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["warranty_tracking", tenantId] });
          qc.invalidateQueries({ queryKey: ["warranty_kpis", tenantId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenantId, qc]);

  // Register installation mutation
  const register = useMutation({
    mutationFn: async (payload: {
      customer_id: string | null;
      installation_date: string;
      warranty_years: number;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const today = new Date();
      const sixMo = new Date(today);
      sixMo.setMonth(sixMo.getMonth() + 6);
      const { data, error } = await supabase
        .from("warranty_tracking")
        .insert({
          tenant_id: tenantId,
          customer_id: payload.customer_id,
          installation_date: payload.installation_date,
          warranty_years: payload.warranty_years,
          next_touch_due: sixMo.toISOString().slice(0, 10),
          next_touch_type: "6mo",
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WarrantyRow;
    },
    onSuccess: () => {
      toast.success("Warranty registered. First touch scheduled for 6 months.");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["warranty_tracking", tenantId] });
      qc.invalidateQueries({ queryKey: ["warranty_kpis", tenantId] });
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  // Send-touch-now mutation (optimistic log)
  const sendTouch = useMutation({
    mutationFn: async (row: WarrantyRow) => {
      if (!tenantId) throw new Error("No tenant");
      const touches = (row.touches ?? []).concat([
        { type: "manual", channel: "manual", sent_at: new Date().toISOString(), result: "queued" },
      ]);
      const { error } = await supabase
        .from("warranty_tracking")
        .update({ touches, last_touch_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Touch logged");
      qc.invalidateQueries({ queryKey: ["warranty_tracking", tenantId] });
      qc.invalidateQueries({ queryKey: ["warranty_kpis", tenantId] });
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  if (!tenantConfig) return null;
  const rows = rowsQuery.data ?? [];
  const kpis = kpisQuery.data ?? { active: 0, expiring_this_month: 0, touches_last_30d: 0, overdue_touches: 0 };
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Warranty Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Automated 6mo / 1yr / 2yr / 3yr / 4yr / pre-expiry touchpoints
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Register Installation
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KPICard label="Active warranties" value={kpis.active} />
        <KPICard label="Expiring this month" value={kpis.expiring_this_month} />
        <KPICard label="Touches (last 30d)" value={kpis.touches_last_30d} />
        <KPICard
          label="Overdue touches"
          value={kpis.overdue_touches}
          tone={kpis.overdue_touches > 0 ? "warn" : "default"}
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["active", "expired", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rowsQuery.isLoading ? "Loading…" : `${rows.length} warrant${rows.length === 1 ? "y" : "ies"}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No warranty rows yet. Register an installation to start tracking.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Install Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Next Touch</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Touches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <TableCell>{r.installation_date}</TableCell>
                    <TableCell>{r.warranty_expires_at ?? "—"}</TableCell>
                    <TableCell>{r.next_touch_due ?? "—"}</TableCell>
                    <TableCell className="capitalize">{r.next_touch_type ?? "—"}</TableCell>
                    <TableCell>{(r.touches ?? []).length}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "outline"}>
                        {r.is_active ? "active" : "ended"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={sendTouch.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          sendTouch.mutate(r);
                        }}
                      >
                        <Send className="mr-1 h-3 w-3" /> Touch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegisterInstallationDialog
        open={showNew}
        onOpenChange={setShowNew}
        customers={customersQuery.data ?? []}
        isSubmitting={register.isPending}
        onSubmit={(p) => register.mutate(p)}
      />

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Warranty {selected.id.slice(0, 8)}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <section className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Installed" value={selected.installation_date} />
                  <Info label="Years" value={String(selected.warranty_years ?? "—")} />
                  <Info label="Expires" value={selected.warranty_expires_at ?? "—"} />
                  <Info label="Next touch" value={selected.next_touch_due ?? "—"} />
                  <Info label="Stage" value={selected.next_touch_type ?? "—"} />
                  <Info label="Last touch" value={selected.last_touch_at ?? "—"} />
                </section>

                <section>
                  <Label>Touch history ({(selected.touches ?? []).length})</Label>
                  <div className="mt-2 space-y-2">
                    {(selected.touches ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No touches yet.</p>
                    ) : (
                      (selected.touches ?? [])
                        .slice()
                        .reverse()
                        .map((t, i) => (
                          <div
                            key={i}
                            className="rounded border bg-muted/20 px-3 py-2 text-xs font-mono"
                          >
                            <div>
                              <strong className="capitalize">{t.type ?? "?"}</strong>{" "}
                              via {t.channel ?? "?"}
                            </div>
                            <div className="text-muted-foreground">
                              {t.sent_at ? new Date(t.sent_at).toLocaleString() : ""} — {t.result ?? ""}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KPICard(props: { label: string; value: number; tone?: "default" | "warn" }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{props.label}</p>
        <p
          className={`text-2xl font-bold ${
            props.tone === "warn" && props.value > 0 ? "text-amber-600" : ""
          }`}
        >
          {props.value}
        </p>
      </CardContent>
    </Card>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{props.label}</p>
      <p className="font-medium">{props.value}</p>
    </div>
  );
}

function RegisterInstallationDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: Customer[];
  isSubmitting: boolean;
  onSubmit: (p: { customer_id: string | null; installation_date: string; warranty_years: number; notes?: string }) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10));
  const [years, setYears] = useState("5");
  const [notes, setNotes] = useState("");

  const submit = () => {
    const y = Number(years);
    if (!installDate || !y || y < 1) return;
    props.onSubmit({
      customer_id: customerId || null,
      installation_date: installDate,
      warranty_years: y,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Roof Installation</DialogTitle>
          <DialogDescription>
            Starts the automated warranty touchpoint sequence (6mo / 1yr / 2yr / 3yr / 4yr / pre-expiry).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                {props.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? "Unnamed"} — {c.phone_number ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Installation Date *</Label>
              <Input
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Warranty Years *</Label>
              <Input
                type="number"
                min={1}
                max={25}
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={props.isSubmitting || !installDate || !years}>
            {props.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
