import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CloudLightning, Plus, Loader2, Zap, MapPin } from "lucide-react";

type StormEvent = {
  id: string;
  event_id: string | null;
  source: string | null;
  event_type: string | null;
  severity: string | null;
  name: string | null;
  affected_states: string[] | null;
  affected_counties: string[] | null;
  affected_zips: string[] | null;
  started_at: string | null;
  ended_at: string | null;
  peak_wind_mph: number | null;
  peak_hail_inches: number | null;
  raw_data: unknown;
  created_at: string;
};

const EVENT_TYPES = ["hurricane", "tropical_storm", "hail", "wind", "tornado"];
const SEVERITIES = ["minor", "moderate", "major", "cat1", "cat2", "cat3", "cat4", "cat5"];

export default function StormAlerts() {
  const { tenantId, tenantConfig } = useTenant();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["storm_events_feed"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("storm_events")
        .select("*")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as StormEvent[];
    },
  });

  // Response stats: leads created from storm_trigger source for this tenant
  const statsQuery = useQuery({
    queryKey: ["storm_response_stats", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_leads")
        .select("notes")
        .eq("tenant_id", tenantId!)
        .eq("source", "storm_trigger")
        .limit(500);
      if (error) throw error;
      const byName: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        const notes = (r.notes ?? "") as string;
        const match = notes.match(/storm[: ]+([^\n,]+)/i);
        const key = (match?.[1] ?? "unknown").trim().toLowerCase();
        byName[key] = (byName[key] ?? 0) + 1;
      });
      return byName;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("storm_events_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "storm_events" },
        () => qc.invalidateQueries({ queryKey: ["storm_events_feed"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const trigger = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!tenantId) throw new Error("No tenant");
      const r = await callWebhook("/roofing-storm-manual", payload, tenantId);
      if (!r.success) throw new Error(r.error || "Webhook failed");
      return r.data;
    },
    onSuccess: () => {
      toast.success("Storm event logged. Proactive outreach triggered for affected customers.");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["storm_events_feed"] });
      qc.invalidateQueries({ queryKey: ["storm_response_stats", tenantId] });
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  if (!tenantConfig) return null;
  const events = eventsQuery.data ?? [];
  const stats = statsQuery.data ?? {};

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CloudLightning className="h-6 w-6 text-primary" />
            Storm Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            NOAA-fed storm feed + manual triggers. Shared cross-tenant.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> Trigger Manual Storm
        </Button>
      </div>

      {eventsQuery.isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CloudLightning className="mx-auto mb-3 h-8 w-8 opacity-50" />
            No storm events in the last 30 days.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => {
            const key = (e.name ?? "").toLowerCase();
            const responseCount = stats[key] ?? 0;
            return (
              <Card key={e.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {e.name ?? e.event_type ?? "Unnamed event"}
                    </CardTitle>
                    <div className="flex gap-1">
                      {e.severity && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {e.severity}
                        </Badge>
                      )}
                      {e.source && (
                        <Badge variant="secondary" className="text-[10px]">
                          {e.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span className="capitalize">{e.event_type ?? "—"}</span>
                    {e.peak_wind_mph != null && (
                      <span className="text-xs text-muted-foreground">• {e.peak_wind_mph} mph</span>
                    )}
                    {e.peak_hail_inches != null && (
                      <span className="text-xs text-muted-foreground">• {e.peak_hail_inches}" hail</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.started_at ? new Date(e.started_at).toLocaleString() : "—"}
                    {e.ended_at ? ` → ${new Date(e.ended_at).toLocaleString()}` : ""}
                  </div>
                  {Array.isArray(e.affected_zips) && e.affected_zips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {e.affected_zips.slice(0, 10).map((z) => (
                        <Badge key={z} variant="outline" className="text-[10px]">
                          {z}
                        </Badge>
                      ))}
                      {e.affected_zips.length > 10 && (
                        <span className="text-xs text-muted-foreground">
                          +{e.affected_zips.length - 10} more
                        </span>
                      )}
                    </div>
                  )}
                  <div className="rounded border bg-muted/30 p-2 text-xs">
                    <p className="font-medium">Response Stats (this tenant)</p>
                    <p className="text-muted-foreground">
                      {responseCount} lead{responseCount === 1 ? "" : "s"} created from this event
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TriggerDialog
        open={showNew}
        onOpenChange={setShowNew}
        isSubmitting={trigger.isPending}
        onSubmit={(p) => trigger.mutate(p)}
      />
    </div>
  );
}

function TriggerDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (p: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("hurricane");
  const [severity, setSeverity] = useState("cat2");
  const [zipsText, setZipsText] = useState("");
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 16));

  const submit = () => {
    const zips = zipsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name || zips.length === 0) return;
    props.onSubmit({
      name,
      event_type: eventType,
      severity,
      affected_zips: zips,
      started_at: new Date(startedAt).toISOString(),
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger Manual Storm Event</DialogTitle>
          <DialogDescription>
            Creates a storm_events row and kicks off proactive outreach to customers in affected ZIPs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Event Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hurricane Milton"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="uppercase">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Started At *</Label>
            <Input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>
          <div>
            <Label>Affected ZIPs *</Label>
            <Textarea
              rows={3}
              value={zipsText}
              onChange={(e) => setZipsText(e.target.value)}
              placeholder="32801, 32803, 32805 …"
            />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated. At least 1 required.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={props.isSubmitting || !name || !zipsText.trim()}>
            {props.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
