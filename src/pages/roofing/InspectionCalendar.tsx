import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/webhook";
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
import { ClipboardCheck, Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Appt = {
  id: string;
  tenant_id: string;
  service: string | null;
  service_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  scheduled_at: string | null;
  appointment_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  appointment_status: string | null;
  status: string | null;
  location: string | null;
  notes: string | null;
  provider_name: string | null;
  reminder_sent: boolean | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-500 text-white",
  completed: "bg-emerald-500 text-white",
  cancelled: "bg-red-500 text-white",
  no_show: "bg-gray-400 text-white",
  "no-show": "bg-gray-400 text-white",
};

export default function InspectionCalendar() {
  const { tenantId, tenantConfig } = useTenant();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rangeStart = startOfWeek(startOfMonth(cursor));
  const rangeEnd = endOfWeek(endOfMonth(cursor));

  const appointmentsQuery = useQuery({
    queryKey: ["inspection_calendar", tenantId, cursor.toISOString()],
    enabled: !!tenantId,
    queryFn: async () => {
      // Inspection appointments filtered in-memory to cover both service_name="Free Roof Inspection"
      // and service ILIKE %inspection%
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("tenant_id", tenantId!)
        .gte("scheduled_at", rangeStart.toISOString())
        .lte("scheduled_at", rangeEnd.toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Appt[]).filter((a) => {
        const svc = (a.service_name ?? a.service ?? "").toLowerCase();
        return svc.includes("inspection");
      });
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`inspection_calendar:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["inspection_calendar", tenantId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenantId, qc]);

  const bookInspection = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!tenantId) throw new Error("No tenant");
      const r = await callWebhook("/roofing-inspection-request", payload, tenantId);
      if (!r.success) throw new Error(r.error || "Webhook failed");
      return r.data;
    },
    onSuccess: () => {
      toast.success("Inspection booked. Confirmation sent on active channels.");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["inspection_calendar", tenantId] });
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_status: "completed",
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked complete");
      qc.invalidateQueries({ queryKey: ["inspection_calendar", tenantId] });
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const days = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [
    rangeStart.toISOString(),
    rangeEnd.toISOString(),
  ]);

  const byDay = useMemo(() => {
    const map: Record<string, Appt[]> = {};
    (appointmentsQuery.data ?? []).forEach((a) => {
      if (!a.scheduled_at) return;
      const d = format(new Date(a.scheduled_at), "yyyy-MM-dd");
      (map[d] ||= []).push(a);
    });
    return map;
  }, [appointmentsQuery.data]);

  if (!tenantConfig) return null;
  const selected = (appointmentsQuery.data ?? []).find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Inspection Calendar
          </h1>
          <p className="text-sm text-muted-foreground">Free roof inspections scheduled by customers</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Book Inspection
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{format(cursor, "MMMM yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCursor(addMonths(cursor, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const entries = byDay[key] ?? [];
              const inMonth = isSameMonth(d, cursor);
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={key}
                  className={`min-h-[96px] rounded border p-1 text-xs ${
                    inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"
                  } ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="mb-1 font-medium">{format(d, "d")}</div>
                  <div className="space-y-1">
                    {entries.slice(0, 3).map((a) => {
                      const st = (a.appointment_status ?? a.status ?? "scheduled").toLowerCase();
                      const cls = STATUS_STYLES[st] ?? "bg-slate-500 text-white";
                      return (
                        <button
                          key={a.id}
                          className={`block w-full truncate rounded px-1 py-0.5 text-left ${cls}`}
                          onClick={() => setSelectedId(a.id)}
                        >
                          {a.scheduled_at ? format(new Date(a.scheduled_at), "HH:mm") : ""}{" "}
                          {a.customer_name ?? "—"}
                        </button>
                      );
                    })}
                    {entries.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{entries.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {Object.entries(STATUS_STYLES).map(([k, cls]) => (
          <div key={k} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded ${cls}`} />
            <span className="capitalize">{k.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>

      <BookInspectionDialog
        open={showNew}
        onOpenChange={setShowNew}
        isSubmitting={bookInspection.isPending}
        onSubmit={(p) => bookInspection.mutate(p)}
      />

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.customer_name ?? "Inspection"}</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 py-4 text-sm">
                <InfoLine label="Scheduled">
                  {selected.scheduled_at ? new Date(selected.scheduled_at).toLocaleString() : "—"}
                </InfoLine>
                <InfoLine label="Duration">
                  {selected.duration_minutes ? `${selected.duration_minutes} min` : "—"}
                </InfoLine>
                <InfoLine label="Phone">{selected.customer_phone ?? "—"}</InfoLine>
                <InfoLine label="Email">{selected.customer_email ?? "—"}</InfoLine>
                <InfoLine label="Location">{selected.location ?? "—"}</InfoLine>
                <InfoLine label="Crew">{selected.provider_name ?? "unassigned"}</InfoLine>
                <InfoLine label="Reminder">
                  {selected.reminder_sent ? (
                    <Badge className="bg-emerald-100 text-emerald-800">sent</Badge>
                  ) : (
                    <Badge variant="outline">pending</Badge>
                  )}
                </InfoLine>
                <InfoLine label="Notes">{selected.notes ?? "—"}</InfoLine>
                <InfoLine label="Status">
                  <Badge variant="outline" className="capitalize">
                    {selected.appointment_status ?? selected.status ?? "scheduled"}
                  </Badge>
                </InfoLine>

                {(selected.appointment_status ?? selected.status) !== "completed" && (
                  <Button
                    className="w-full"
                    onClick={() => markComplete.mutate(selected.id)}
                    disabled={markComplete.isPending}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoLine(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-muted-foreground">{props.label}</span>
      <span className="text-right">{props.children}</span>
    </div>
  );
}

function BookInspectionDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (p: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name || !phone || !address) return;
    props.onSubmit({
      customer_name: name,
      phone,
      email: email || null,
      address,
      zip: zip || null,
      preferred_date: preferredDate,
      service_type: "inspection",
      notes: notes || null,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Book Roof Inspection</DialogTitle>
          <DialogDescription>45-minute free inspection. Customer gets SMS/WhatsApp/email confirmation.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1..." />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label>Address *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ZIP</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div>
              <Label>Preferred Date</Label>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
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
          <Button onClick={submit} disabled={props.isSubmitting || !name || !phone || !address}>
            {props.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
