import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Zap, ExternalLink, Plus, X, Activity, Target, Send, Eye,
  Clock, Filter, Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const EVENT_TYPE_COLORS: Record<string, string> = {
  funding: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  hiring: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  expansion: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  negative_news: "bg-red-500/15 text-red-400 border-red-500/30",
  product_launch: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  partnership: "bg-teal-500/15 text-teal-400 border-teal-500/30",
};

const ACTION_STATUS_COLORS: Record<string, string> = {
  new: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  lead_created: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  outreach_sent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ignored: "bg-muted text-muted-foreground border-border",
};

const MONITOR_TYPES = [
  "industry_news", "company_watch", "keyword_alerts", "job_posting_watch", "competitor_watch",
] as const;

const EVENT_TYPES_LIST = [
  "funding", "hiring", "expansion", "negative_news", "product_launch", "partnership",
] as const;

const FREQUENCIES = ["hourly", "daily", "weekly"] as const;

// ---- Event Feed Tab ----
function EventFeedTab({ tenantId }: { tenantId: string }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState([0]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["trigger_events", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trigger_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("detected_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const filtered = events.filter((e: any) => {
    if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
    if ((e.opportunity_score ?? 0) < minScore[0]) return false;
    return true;
  });

  const thisWeek = events.filter((e: any) => {
    const d = new Date(e.detected_at);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });

  const highOpp = events.filter((e: any) => (e.opportunity_score ?? 0) > 70);
  const leadsCreated = events.filter((e: any) => e.action_status === "lead_created");
  const outreachSent = events.filter((e: any) => e.action_status === "outreach_sent");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events (Week)", value: thisWeek.length, icon: Activity },
          { label: "High Opportunity", value: highOpp.length, icon: Target },
          { label: "Leads Created", value: leadsCreated.length, icon: Zap },
          { label: "Outreach Sent", value: outreachSent.length, icon: Send },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EVENT_TYPES_LIST.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Min Opportunity: {minScore[0]}</span>
            <Slider value={minScore} onValueChange={setMinScore} max={100} step={5} className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading events...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No trigger events found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((evt: any) => (
            <Card key={evt.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={EVENT_TYPE_COLORS[evt.event_type] || "bg-muted text-muted-foreground"}>
                        {(evt.event_type || "unknown").replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className={ACTION_STATUS_COLORS[evt.action_status] || ACTION_STATUS_COLORS.new}>
                        {(evt.action_status || "new").replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {evt.detected_at ? formatDistanceToNow(new Date(evt.detected_at), { addSuffix: true }) : "—"}
                      </span>
                    </div>
                    <div className="font-semibold text-foreground">{evt.company_name || "Unknown Company"}</div>
                    <div className="text-sm text-foreground/80">{evt.event_title || evt.title}</div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{evt.summary}</p>
                    {evt.source_url && (
                      <a
                        href={evt.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {evt.relevance_score != null && (
                        <Badge variant="outline" className="text-xs bg-muted/50">Relevance: {evt.relevance_score}</Badge>
                      )}
                      {evt.urgency_score != null && (
                        <Badge variant="outline" className="text-xs bg-muted/50">Urgency: {evt.urgency_score}</Badge>
                      )}
                      {evt.opportunity_score != null && (
                        <Badge variant="outline" className="text-xs bg-muted/50">Opportunity: {evt.opportunity_score}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {evt.action_status === "new" && !evt.lead_id && (
                      <Button size="sm" variant="outline" onClick={() => toast.success("Lead creation triggered")}>
                        <Zap className="h-3 w-3 mr-1" /> Create Lead
                      </Button>
                    )}
                    {evt.outreach_message && (
                      <Button size="sm" variant="outline" onClick={() => toast.success("Outreach triggered")}>
                        <Send className="h-3 w-3 mr-1" /> Send Outreach
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Monitors Tab ----
function MonitorsTab({ tenantId }: { tenantId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editMonitor, setEditMonitor] = useState<any>(null);

  const { data: monitors = [], isLoading, refetch } = useQuery({
    queryKey: ["trigger_monitors", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trigger_monitors")
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Active Monitors</h3>
        <Button onClick={() => { setEditMonitor(null); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Monitor
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading monitors...</div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No monitors configured</div>
      ) : (
        <div className="space-y-3">
          {monitors.map((m: any) => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.name}</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                        {(m.type || m.monitor_type || "unknown").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {m.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.keywords.map((k: string) => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                    )}
                    {m.locations?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.locations.map((l: string) => (
                          <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Last checked: {m.last_checked_at ? formatDistanceToNow(new Date(m.last_checked_at), { addSuffix: true }) : "Never"}</span>
                      <span>Events: {m.events_found_count ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={m.is_active ?? true} onCheckedChange={() => toast.info("Toggle saved")} />
                    <Button size="sm" variant="outline" onClick={() => { setEditMonitor(m); setAddOpen(true); }}>
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MonitorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        monitor={editMonitor}
        tenantId={tenantId}
        onSaved={() => { refetch(); setAddOpen(false); }}
      />
    </div>
  );
}

// ---- Add/Edit Monitor Dialog ----
function MonitorDialog({
  open, onOpenChange, monitor, tenantId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  monitor: any;
  tenantId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(monitor?.name || "");
  const [type, setType] = useState(monitor?.type || monitor?.monitor_type || "keyword_alerts");
  const [keywords, setKeywords] = useState<string[]>(monitor?.keywords || []);
  const [locations, setLocations] = useState<string[]>(monitor?.locations || []);
  const [eventTypes, setEventTypes] = useState<string[]>(monitor?.event_types || []);
  const [frequency, setFrequency] = useState(monitor?.frequency || "daily");
  const [kwInput, setKwInput] = useState("");
  const [locInput, setLocInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name,
        type,
        keywords,
        locations,
        event_types: eventTypes,
        frequency,
        is_active: true,
      };
      const { error } = await supabase.from("trigger_monitors").insert(payload);
      if (error) throw error;
      toast.success("Monitor saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addTag = (list: string[], setList: (v: string[]) => void, val: string, setVal: (v: string) => void) => {
    const v = val.trim();
    if (v && !list.includes(v)) setList([...list, v]);
    setVal("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{monitor ? "Edit Monitor" : "Add Monitor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Monitor" />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONITOR_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Keywords</Label>
            <div className="flex gap-2">
              <Input
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                placeholder="Type & press Enter"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(keywords, setKeywords, kwInput, setKwInput))}
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {keywords.map((k) => (
                <Badge key={k} variant="secondary" className="text-xs cursor-pointer" onClick={() => setKeywords(keywords.filter((x) => x !== k))}>
                  {k} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Locations</Label>
            <div className="flex gap-2">
              <Input
                value={locInput}
                onChange={(e) => setLocInput(e.target.value)}
                placeholder="Type & press Enter"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(locations, setLocations, locInput, setLocInput))}
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {locations.map((l) => (
                <Badge key={l} variant="secondary" className="text-xs cursor-pointer" onClick={() => setLocations(locations.filter((x) => x !== l))}>
                  {l} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Event Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES_LIST.map((et) => (
                <div key={et} className="flex items-center gap-2">
                  <Checkbox
                    checked={eventTypes.includes(et)}
                    onCheckedChange={(checked) =>
                      setEventTypes(checked ? [...eventTypes, et] : eventTypes.filter((x) => x !== et))
                    }
                  />
                  <span className="text-sm">{et.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Monitor"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Page ----
export default function TriggerEvents() {
  const { tenantId } = useTenant();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Trigger Events</h1>
          <p className="text-sm text-muted-foreground">
            Monitor market signals and company events to find the perfect outreach moment
          </p>
        </div>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Event Feed</TabsTrigger>
          <TabsTrigger value="monitors">Monitors</TabsTrigger>
        </TabsList>
        <TabsContent value="feed">
          <EventFeedTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="monitors">
          <MonitorsTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
