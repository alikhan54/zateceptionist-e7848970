import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Volume2,
  MessageSquare,
  TrendingUp,
  CreditCard,
  X,
  RefreshCcw,
  Star,
  Brain,
  Target,
  Calendar,
} from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", CA: "\u{1F1E8}\u{1F1E6}", GB: "\u{1F1EC}\u{1F1E7}",
  AE: "\u{1F1E6}\u{1F1EA}", IN: "\u{1F1EE}\u{1F1F3}", AU: "\u{1F1E6}\u{1F1FA}",
  DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", SA: "\u{1F1F8}\u{1F1E6}",
  PK: "\u{1F1F5}\u{1F1F0}",
};

// Map VAPI ended_reason to human-readable labels
const STATUS_LABELS: Record<string, string> = {
  "completed": "Completed",
  "customer-ended-call": "Customer Hung Up",
  "assistant-ended-call": "AI Ended",
  "silence-timed-out": "Silence Timeout",
  "customer-did-not-answer": "No Answer",
  "voicemail": "Voicemail",
  "failed": "Failed",
  "no-answer": "No Answer",
  "initiated": "Initiated",
  "ringing": "Ringing",
  "busy": "Busy",
  "error": "Error",
};

export default function VoiceCallLog() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    direction: "all",
    status: "all",
    outcome: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
  });

  // Real-time subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("voice-calllog-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voice_usage", filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["voice-calllog"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, queryClient]);

  // Fetch all calls (SLUG tenant_id)
  const { data: calls = [], isLoading, refetch } = useQuery({
    queryKey: ["voice-calllog", tenantId, filters.direction, filters.status, filters.outcome, filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("voice_usage")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(200);
      if (filters.direction !== "all") query = query.eq("direction", filters.direction);
      if (filters.status !== "all") query = query.eq("call_status", filters.status);
      if (filters.outcome !== "all") query = query.eq("outcome", filters.outcome);
      if (filters.dateFrom) query = query.gte("started_at", filters.dateFrom + "T00:00:00");
      if (filters.dateTo) query = query.lte("started_at", filters.dateTo + "T23:59:59");
      const { data, error } = await query;
      if (error) { console.error("[VoiceCallLog] Error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Client-side search
  const filteredCalls = filters.search
    ? calls.filter((c: any) => {
        const s = filters.search.toLowerCase();
        return (
          (c.lead_name || "").toLowerCase().includes(s) ||
          (c.from_number || "").includes(s) ||
          (c.to_number || "").includes(s) ||
          (c.lead_company || "").toLowerCase().includes(s) ||
          (c.ai_summary || "").toLowerCase().includes(s)
        );
      })
    : calls;

  // Credits
  const { data: credits } = useQuery({
    queryKey: ["voice-calllog-credits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("voice_credits")
        .select("balance_minutes, balance_amount, auto_recharge_enabled")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const todayCalls = calls.filter((c: any) => c.started_at?.startsWith(today));
  const completedCalls = calls.filter((c: any) => c.call_status === "completed" || c.call_status === "customer-ended-call" || c.call_status === "assistant-ended-call");
  const successRate = calls.length > 0 ? Math.round((completedCalls.length / calls.length) * 100) : 0;
  const avgDuration = completedCalls.length > 0
    ? Math.round(completedCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / completedCalls.length)
    : 0;
  const avgScore = calls.filter((c: any) => c.call_score != null).length > 0
    ? Math.round(calls.filter((c: any) => c.call_score != null).reduce((s: number, c: any) => s + (c.call_score || 0), 0) / calls.filter((c: any) => c.call_score != null).length)
    : null;

  // Unique outcomes for filter
  const uniqueOutcomes = Array.from(new Set(calls.map((c: any) => c.outcome).filter(Boolean)));

  const hasActiveFilters = filters.search || filters.direction !== "all" || filters.status !== "all" || filters.outcome !== "all" || filters.dateFrom || filters.dateTo;

  const formatDuration = (s: number) => {
    if (!s) return "0s";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const formatTime = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (s: string) => {
    if (s === "completed" || s === "customer-ended-call" || s === "assistant-ended-call") return "bg-green-100 text-green-800";
    if (s === "failed" || s === "no-answer" || s === "error" || s === "customer-did-not-answer") return "bg-red-100 text-red-800";
    if (s === "initiated" || s === "ringing") return "bg-blue-100 text-blue-800";
    if (s === "voicemail" || s === "silence-timed-out" || s === "busy") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-600";
  };

  const getSentimentColor = (s: string | null) => {
    if (!s) return "";
    if (s === "positive") return "bg-green-100 text-green-800";
    if (s === "negative") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayCalls.length}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{calls.length}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <PhoneIncoming className="h-3 w-3" /> {calls.filter((c: any) => c.direction === "inbound").length} in
              </span>
              <span className="flex items-center gap-1">
                <PhoneOutgoing className="h-3 w-3" /> {calls.filter((c: any) => c.direction === "outbound").length} out
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className={`text-2xl font-bold ${avgScore != null ? getScoreColor(avgScore) : ""}`}>
                  {avgScore != null ? `${avgScore}/100` : "N/A"}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">
                  {credits ? `${Number(credits.balance_minutes || 0).toFixed(0)}m` : "N/A"}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, phone, or summary..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.direction}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="customer-ended-call">Customer Ended</option>
              <option value="assistant-ended-call">AI Ended</option>
              <option value="failed">Failed</option>
              <option value="no-answer">No Answer</option>
              <option value="voicemail">Voicemail</option>
              <option value="silence-timed-out">Silence Timeout</option>
            </select>
            {uniqueOutcomes.length > 0 && (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.outcome}
                onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}
              >
                <option value="all">All Outcomes</option>
                {uniqueOutcomes.map((o: string) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="h-10 w-36"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                placeholder="From"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                className="h-10 w-36"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                placeholder="To"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm"
                onClick={() => setFilters({ direction: "all", status: "all", outcome: "all", search: "", dateFrom: "", dateTo: "" })}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" /> Call Log
          </CardTitle>
          <CardDescription>
            {filteredCalls.length} call{filteredCalls.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading calls...</p>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No calls yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Calls will appear here once voice outreach begins.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCalls.map((call: any) => (
                <div key={call.id}>
                  {/* Row */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                      expandedCall === call.id ? "bg-muted/50 border-primary/30" : "bg-background"
                    }`}
                    onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {expandedCall === call.id
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        call.direction === "inbound" ? "bg-blue-100" : "bg-green-100"
                      }`}>
                        {call.direction === "inbound"
                          ? <PhoneIncoming className="h-4 w-4 text-blue-600" />
                          : <PhoneOutgoing className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {call.lead_name || (call.direction === "inbound" ? call.from_number : call.to_number) || "Unknown"}
                          </span>
                          {call.lead_company && (
                            <span className="text-xs text-muted-foreground truncate">({call.lead_company})</span>
                          )}
                          {call.lead_country && (
                            <span className="text-xs">{COUNTRY_FLAGS[call.lead_country] || ""}</span>
                          )}
                          {call.call_score != null && (
                            <span className={`text-xs font-medium ${getScoreColor(call.call_score)}`}>
                              <Star className="h-3 w-3 inline mr-0.5" />{call.call_score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(call.started_at)}</span>
                          <span>&middot;</span>
                          <span>{formatDuration(call.duration_seconds || 0)}</span>
                          {call.total_cost != null && Number(call.total_cost) > 0 && (
                            <><span>&middot;</span><span>${Number(call.total_cost).toFixed(3)}</span></>
                          )}
                          {call.outcome && (
                            <><span>&middot;</span>
                            <span className="flex items-center gap-0.5">
                              <Target className="h-3 w-3" /> {call.outcome}
                            </span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {call.sentiment && (
                        <Badge className={getSentimentColor(call.sentiment)} variant="outline">
                          {call.sentiment}
                        </Badge>
                      )}
                      <Badge className={getStatusColor(call.call_status || "unknown")}>
                        {(call.call_status === "completed" || call.call_status === "customer-ended-call" || call.call_status === "assistant-ended-call")
                          ? <CheckCircle className="h-3 w-3 mr-1" />
                          : <AlertCircle className="h-3 w-3 mr-1" />}
                        {STATUS_LABELS[call.call_status] || call.call_status || "initiated"}
                      </Badge>
                    </div>
                  </div>

                  {/* Expanded */}
                  {expandedCall === call.id && (
                    <div className="ml-8 mr-2 mt-1 mb-3 p-4 bg-muted/30 rounded-lg border space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Call Details</p>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Direction:</span> {call.direction}</p>
                            <p><span className="text-muted-foreground">From:</span> {call.from_number || "\u2014"}</p>
                            <p><span className="text-muted-foreground">To:</span> {call.to_number || "\u2014"}</p>
                            <p><span className="text-muted-foreground">Duration:</span> {formatDuration(call.duration_seconds || 0)}</p>
                            <p><span className="text-muted-foreground">Cost:</span> ${Number(call.total_cost || 0).toFixed(4)}</p>
                            {call.vapi_mode && <p><span className="text-muted-foreground">Mode:</span> {call.vapi_mode}</p>}
                            {call.language && <p><span className="text-muted-foreground">Language:</span> {call.language}</p>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <Brain className="h-3 w-3" /> AI Analysis
                          </p>
                          <div className="space-y-1 text-sm">
                            {call.call_score != null && (
                              <p>
                                <span className="text-muted-foreground">Call Score:</span>{" "}
                                <span className={`font-bold ${getScoreColor(call.call_score)}`}>{call.call_score}/100</span>
                              </p>
                            )}
                            {call.sentiment && <p><span className="text-muted-foreground">Sentiment:</span> {call.sentiment}</p>}
                            {call.outcome && <p><span className="text-muted-foreground">Outcome:</span> {call.outcome}</p>}
                            {call.next_action && <p><span className="text-muted-foreground">Next Action:</span> {call.next_action}</p>}
                            {call.follow_up_action && (
                              <p>
                                <span className="text-muted-foreground">Follow-up:</span> {call.follow_up_action}
                                {call.follow_up_sent && <Badge className="ml-2 bg-green-100 text-green-800 text-[10px]">Sent</Badge>}
                              </p>
                            )}
                            {call.talk_ratio != null && (
                              <p><span className="text-muted-foreground">Talk Ratio:</span> {Number(call.talk_ratio).toFixed(0)}% customer / {(100 - Number(call.talk_ratio)).toFixed(0)}% AI</p>
                            )}
                            {call.questions_asked != null && call.questions_asked > 0 && (
                              <p><span className="text-muted-foreground">Questions Asked:</span> {call.questions_asked}</p>
                            )}
                            {call.objections_raised != null && call.objections_raised > 0 && (
                              <p><span className="text-muted-foreground">Objections:</span> {call.objections_raised}</p>
                            )}
                            {!call.sentiment && !call.outcome && !call.call_score && (
                              <p className="text-muted-foreground italic">No AI analysis yet</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Lead Info</p>
                          <div className="space-y-1 text-sm">
                            {call.lead_name && <p><span className="text-muted-foreground">Name:</span> {call.lead_name}</p>}
                            {call.lead_company && <p><span className="text-muted-foreground">Company:</span> {call.lead_company}</p>}
                            {call.lead_country && <p><span className="text-muted-foreground">Country:</span> {call.lead_country}</p>}
                            {call.industry && <p><span className="text-muted-foreground">Industry:</span> {call.industry}</p>}
                            {call.lead_id && (
                              <p><span className="text-muted-foreground">Lead ID:</span>{" "}
                                <span className="font-mono text-xs">{call.lead_id.substring(0, 8)}...</span>
                              </p>
                            )}
                            {!call.lead_name && !call.lead_company && !call.lead_country && !call.lead_id && (
                              <p className="text-muted-foreground italic">No lead data</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Coaching Notes */}
                      {call.ai_coaching_notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <Brain className="h-3 w-3" /> AI Coaching Notes
                          </p>
                          <div className="text-sm bg-amber-50 dark:bg-amber-950/30 p-3 rounded border border-amber-200 dark:border-amber-800">
                            {call.ai_coaching_notes}
                          </div>
                        </div>
                      )}

                      {(call.ai_summary || call.summary) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> AI Summary
                          </p>
                          <p className="text-sm bg-background p-3 rounded border">
                            {call.ai_summary || call.summary}
                          </p>
                        </div>
                      )}

                      {call.recording_url && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <Play className="h-3 w-3" /> Recording
                          </p>
                          <audio controls className="w-full" src={call.recording_url}>
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}

                      {call.transcript && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <Volume2 className="h-3 w-3" /> Transcript
                          </p>
                          <div className="text-sm bg-background p-3 rounded border max-h-60 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                            {typeof call.transcript === "string"
                              ? call.transcript
                              : JSON.stringify(call.transcript, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
