import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Eye, Users, Flame, FileText, Monitor, Smartphone, Tablet,
  ChevronDown, ChevronRight, Copy, Check, ArrowRight, Globe,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { FeatureBanner } from "@/components/FeatureBanner";

// --- Types ---
interface WebsiteVisitor {
  id: string;
  tenant_id: string;
  visitor_id: string;
  session_id?: string;
  page_url?: string;
  page_type?: string;
  intent_score?: number;
  intent_level?: string;
  device_type?: string;
  email?: string;
  lead_id?: string;
  action_triggered?: string;
  form_interactions?: number;
  created_at: string;
}

interface VisitorSession {
  id: string;
  tenant_id: string;
  visitor_id: string;
  device_type?: string;
  country?: string;
  pages_viewed?: number;
  total_time_seconds?: number;
  peak_intent_score?: number;
  intent_level?: string;
  page_journey?: string[];
  lead_id?: string;
  email?: string;
  referrer?: string;
  utm_source?: string;
  utm_campaign?: string;
  first_seen_at?: string;
  last_seen_at: string;
}

// --- Constants ---
const INTENT_COLORS: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 border-red-500/30",
  warm: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  cool: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

function DeviceIcon({ type }: { type?: string }) {
  const Icon = DEVICE_ICONS[type || "desktop"] || Monitor;
  return <Icon size={14} className="text-muted-foreground" />;
}

function IntentBadge({ level }: { level?: string }) {
  const l = level || "low";
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${INTENT_COLORS[l] || INTENT_COLORS.low}`}>
      {l.charAt(0).toUpperCase() + l.slice(1)}
    </Badge>
  );
}

function truncateUrl(url?: string, max = 40) {
  if (!url) return "—";
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > max ? path.slice(0, max) + "…" : path;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function formatTime(seconds?: number) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ============ MAIN COMPONENT ============
export default function WebsiteVisitors() {
  const { tenantId } = useTenant();
  const [intentFilter, setIntentFilter] = useState("all");
  const [pageTypeFilter, setPageTypeFilter] = useState("all");
  const [setupOpen, setSetupOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Queries ---
  const { data: visitors = [] } = useQuery<WebsiteVisitor[]>({
    queryKey: ["website_visitors", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("website_visitors")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data as WebsiteVisitor[]) || [];
    },
    enabled: !!tenantId,
  });

  const { data: sessions = [] } = useQuery<VisitorSession[]>({
    queryKey: ["visitor_sessions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("visitor_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_seen_at", { ascending: false })
        .limit(50);
      return (data as VisitorSession[]) || [];
    },
    enabled: !!tenantId,
  });

  // --- Today stats ---
  const todayVisitors = useMemo(() => (visitors || []).filter((v) => isToday(new Date(v.created_at))), [visitors]);
  const hotToday = useMemo(() => (todayVisitors || []).filter((v) => v.intent_level === "hot").length, [todayVisitors]);
  const knownToday = useMemo(() => (todayVisitors || []).filter((v) => v.lead_id).length, [todayVisitors]);
  const formInteractions = useMemo(
    () => (todayVisitors || []).reduce((s, v) => s + (v.form_interactions || 0), 0),
    [todayVisitors]
  );

  // --- Filters ---
  const filteredVisitors = useMemo(() => {
    let list = visitors || [];
    if (intentFilter !== "all") list = list.filter((v) => v.intent_level === intentFilter);
    if (pageTypeFilter !== "all") list = list.filter((v) => v.page_type === pageTypeFilter);
    return list;
  }, [visitors, intentFilter, pageTypeFilter]);

  const pageTypes = useMemo(() => {
    const s = new Set((visitors || []).map((v) => v.page_type).filter(Boolean));
    return Array.from(s) as string[];
  }, [visitors]);

  // --- Pixel code ---
  const pixelCode = `<script>
(function(){
  var t="${tenantId || "TENANT_ID_HERE"}";
  var s=document.createElement("script");
  s.src="https://pixel.zateceptionist.com/tracker.js?tid="+t;
  s.async=true;
  document.head.appendChild(s);
})();
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pixelCode);
    setCopied(true);
    toast.success("Pixel code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Website Intent</h1>
          <p className="text-sm text-muted-foreground">Track visitor behavior and score buying intent in real-time</p>
        </div>

      <FeatureBanner icon={Eye} title="Website Visitor Intelligence" description="Track which companies visit your website. Deploy the pixel to start." />
      </div>

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="live">Live Visitors</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* ============ TAB 1 — LIVE VISITORS ============ */}
        <TabsContent value="live" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Visitors Today" value={todayVisitors.length} icon={<Users size={18} />} />
            <StatCard title="Hot Intent" value={hotToday} icon={<Flame size={18} />} accent="text-red-400" />
            <StatCard title="Known Leads" value={knownToday} icon={<Eye size={18} />} accent="text-emerald-400" />
            <StatCard title="Form Interactions" value={formInteractions} icon={<FileText size={18} />} accent="text-blue-400" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger className="w-[160px] bg-card border-border">
                <SelectValue placeholder="Intent Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intents</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageTypeFilter} onValueChange={setPageTypeFilter}>
              <SelectTrigger className="w-[160px] bg-card border-border">
                <SelectValue placeholder="Page Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {pageTypes.map((pt) => (
                  <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visitor Table */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Page</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Score</th>
                      <th className="text-left p-3 font-medium">Intent</th>
                      <th className="text-left p-3 font-medium">Device</th>
                      <th className="text-left p-3 font-medium">Action</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisitors.length === 0 && (
                      <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No visitors found</td></tr>
                    )}
                    {filteredVisitors.map((v) => (
                      <TooltipProvider key={v.id}>
                        <tr
                          className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                            v.intent_level === "hot" ? "border-l-2 border-l-red-500/60" : ""
                          }`}
                        >
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                          </td>
                          <td className="p-3 max-w-[200px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-foreground truncate block cursor-default">{truncateUrl(v.page_url)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p className="max-w-xs break-all">{v.page_url}</p></TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="p-3">
                            {v.page_type && (
                              <Badge variant="outline" className="text-xs bg-muted/50">{v.page_type}</Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono text-foreground">{v.intent_score ?? "—"}</td>
                          <td className="p-3"><IntentBadge level={v.intent_level} /></td>
                          <td className="p-3"><DeviceIcon type={v.device_type} /></td>
                          <td className="p-3 text-muted-foreground text-xs">{v.action_triggered || "—"}</td>
                          <td className="p-3 space-x-1">
                            {v.lead_id && (
                              <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Known Lead</Badge>
                            )}
                            {v.email && !v.lead_id && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 cursor-default">Has Email</Badge>
                                </TooltipTrigger>
                                <TooltipContent>{v.email}</TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      </TooltipProvider>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB 2 — SESSIONS ============ */}
        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center text-muted-foreground">No sessions recorded yet</CardContent>
            </Card>
          )}
          {sessions.map((s) => (
            <Card key={s.id} className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <DeviceIcon type={s.device_type} />
                    <span className="font-mono text-sm text-foreground">
                      Visitor {s.visitor_id?.slice(0, 10)}…
                    </span>
                    {s.country && (
                      <Badge variant="outline" className="text-xs bg-muted/50">
                        <Globe size={10} className="mr-1" />{s.country}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <IntentBadge level={s.intent_level} />
                    {s.lead_id && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Matched Lead</Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pages:</span>{" "}
                    <span className="text-foreground font-medium">{s.pages_viewed ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>{" "}
                    <span className="text-foreground font-medium">{formatTime(s.total_time_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Peak Score:</span>
                    <IntentBadge level={
                      (s.peak_intent_score ?? 0) >= 80 ? "hot" :
                      (s.peak_intent_score ?? 0) >= 50 ? "warm" :
                      (s.peak_intent_score ?? 0) >= 25 ? "cool" : "low"
                    } />
                    <span className="font-mono text-foreground">{s.peak_intent_score ?? 0}</span>
                  </div>
                </div>

                {/* Page Journey */}
                {s.page_journey && s.page_journey.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    {s.page_journey.map((page, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="px-2 py-1 rounded bg-muted/60 text-foreground">{page}</span>
                        {i < (s.page_journey?.length ?? 0) - 1 && <ArrowRight size={12} className="text-muted-foreground" />}
                      </span>
                    ))}
                  </div>
                )}

                {/* Source & Email */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {(s.referrer || s.utm_source) && (
                    <span>Source: <span className="text-foreground">{s.utm_source || s.referrer}</span></span>
                  )}
                  {s.utm_campaign && (
                    <span>Campaign: <span className="text-foreground">{s.utm_campaign}</span></span>
                  )}
                  {s.email && (
                    <span>Email: <span className="text-foreground">{s.email}</span></span>
                  )}
                  <span className="ml-auto">
                    Last seen {formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ============ SETUP SECTION ============ */}
      <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-foreground hover:bg-muted/50 border border-border rounded-lg p-4 h-auto">
            <span className="font-semibold">How to Install</span>
            {setupOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="bg-card border-border mt-2">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste this script before <code className="text-foreground bg-muted px-1 rounded">&lt;/body&gt;</code> on every page of your website. The pixel tracks visitor behavior and scores intent in real-time.
              </p>
              <div className="relative">
                <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs text-foreground overflow-x-auto font-mono">
                  {pixelCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// --- Stat Card ---
function StatCard({ title, value, icon, accent }: { title: string; value: number; icon: React.ReactNode; accent?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${accent || "text-foreground"}`}>{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
      </CardContent>
    </Card>
  );
}
