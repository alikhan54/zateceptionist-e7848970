import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  CreditCard,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCcw,
  TrendingUp,
  AlertTriangle,
  Mic,
  Zap,
  Brain,
  Target,
  SmilePlus,
  Meh,
  Frown,
  Star,
  BarChart3,
} from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", CA: "\u{1F1E8}\u{1F1E6}", GB: "\u{1F1EC}\u{1F1E7}",
  AE: "\u{1F1E6}\u{1F1EA}", IN: "\u{1F1EE}\u{1F1F3}", AU: "\u{1F1E6}\u{1F1FA}",
  DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", SA: "\u{1F1F8}\u{1F1E6}",
  PK: "\u{1F1F5}\u{1F1F0}",
};

const STATUS_LABELS: Record<string, string> = {
  "completed": "Completed",
  "customer-ended-call": "Customer Hung Up",
  "assistant-ended-call": "AI Ended",
  "silence-timed-out": "Silence Timeout",
  "customer-did-not-answer": "No Answer",
  "failed": "Failed",
  "no-answer": "No Answer",
  "initiated": "Initiated",
  "ringing": "Ringing",
  "voicemail": "Voicemail",
};

export default function VoiceOverview() {
  const { tenantId, tenantConfig } = useTenant();

  const vapiConfigured =
    !!tenantConfig?.vapi_api_key &&
    !!tenantConfig?.vapi_assistant_id;

  // Fetch ALL voice_usage data (SLUG tenant_id) for full analytics
  const { data: allCalls = [], refetch: refetchStats } = useQuery({
    queryKey: ["voice-overview-all", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("voice_usage")
        .select("direction, duration_seconds, total_cost, call_status, started_at, sentiment, outcome, call_score, lead_name, lead_country, from_number, to_number, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) { console.error("[VoiceOverview] voice_usage error:", error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Fetch attempt count from sales_leads (SLUG tenant_id)
  const { data: attemptCount } = useQuery({
    queryKey: ["voice-overview-attempts", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { data, error } = await supabase
        .from("sales_leads")
        .select("calls_made")
        .eq("tenant_id", tenantConfig?.id);
      if (error) return 0;
      return (data || []).reduce((sum: number, l: any) => sum + (l.calls_made || 0), 0);
    },
    enabled: !!tenantId,
  });

  // Fetch credit balance (SLUG tenant_id)
  const { data: credits } = useQuery({
    queryKey: ["voice-overview-credits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("voice_credits")
        .select("balance_minutes, balance_amount, auto_recharge_enabled, current_rate_per_minute, total_purchased, total_used")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  // Phone numbers for coverage (SLUG tenant_id)
  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["voice-overview-phones", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("tenant_phone_numbers")
        .select("phone_number, country_code, can_call_countries, is_active, label")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Lead country distribution (SLUG tenant_id)
  const { data: leadCountries = [] } = useQuery({
    queryKey: ["voice-overview-lead-countries", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("sales_leads")
        .select("country")
        .eq("tenant_id", tenantConfig?.id);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((l: any) => {
        const c = (l.country || "").trim();
        if (c && c !== "Unknown") counts[c] = (counts[c] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!tenantId,
  });

  // === Computed Stats ===
  const today = new Date().toISOString().split("T")[0];
  const todayCalls = allCalls.filter((c: any) => c.started_at?.startsWith(today));
  const completedCalls = allCalls.filter((c: any) =>
    c.call_status === "completed" || c.call_status === "customer-ended-call" || c.call_status === "assistant-ended-call"
  );
  const totalDuration = allCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0);
  const totalCost = allCalls.reduce((s: number, c: any) => s + (Number(c.total_cost) || 0), 0);

  // Connection rate
  const connectionRate = attemptCount && attemptCount > 0
    ? Math.round((allCalls.length / attemptCount) * 100)
    : allCalls.length > 0 ? Math.round((completedCalls.length / allCalls.length) * 100) : 0;

  // Outcome breakdown
  const outcomeBreakdown: Record<string, number> = {};
  allCalls.forEach((c: any) => {
    const key = c.outcome || "unknown";
    outcomeBreakdown[key] = (outcomeBreakdown[key] || 0) + 1;
  });
  const outcomeEntries = Object.entries(outcomeBreakdown).sort((a, b) => b[1] - a[1]);

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
  allCalls.forEach((c: any) => {
    const s = c.sentiment || "unknown";
    if (s in sentimentBreakdown) sentimentBreakdown[s as keyof typeof sentimentBreakdown]++;
    else sentimentBreakdown.unknown++;
  });
  const sentimentTotal = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative;
  const positiveRate = sentimentTotal > 0 ? Math.round((sentimentBreakdown.positive / sentimentTotal) * 100) : 0;

  // Avg call score
  const scoredCalls = allCalls.filter((c: any) => c.call_score != null);
  const avgScore = scoredCalls.length > 0
    ? Math.round(scoredCalls.reduce((s: number, c: any) => s + c.call_score, 0) / scoredCalls.length)
    : null;

  // Avg duration
  const avgDuration = completedCalls.length > 0
    ? Math.round(totalDuration / completedCalls.length)
    : 0;

  // Coverage analysis
  const callableCountries = [...new Set((phoneNumbers as any[]).flatMap((p) => p.can_call_countries || []))];
  const coverageGaps = leadCountries.filter((lc) => {
    const code = lc.country === "UAE" ? "AE" : lc.country === "UK" ? "GB" : lc.country;
    return !callableCountries.includes(code);
  });

  // Credits calculations
  const creditsBalance = credits ? Number(credits.balance_minutes || 0) : 0;
  const creditsPurchased = credits ? Number(credits.total_purchased || 0) : 0;
  const creditsUsedPercent = creditsPurchased > 0 ? Math.round(((creditsPurchased - creditsBalance) / creditsPurchased) * 100) : 0;
  const estimatedCallsRemaining = avgDuration > 0 ? Math.floor((creditsBalance * 60) / avgDuration) : 0;
  const lowBalance = creditsBalance > 0 && creditsBalance < 20;

  // Recent calls (use first 10 from allCalls which is already sorted by created_at desc)
  const recentCalls = allCalls.slice(0, 10);

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

  const getOutcomeColor = (outcome: string) => {
    if (outcome === "appointment_booked") return "bg-green-100 text-green-800";
    if (outcome === "callback_requested" || outcome === "interested") return "bg-blue-100 text-blue-800";
    if (outcome === "not_interested") return "bg-red-100 text-red-800";
    if (outcome === "engaged") return "bg-purple-100 text-purple-800";
    if (outcome === "transferred") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* VAPI Status */}
      <Card
        className={
          vapiConfigured
            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
            : "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${vapiConfigured ? "bg-green-500" : "bg-amber-500"}`}>
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${vapiConfigured ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"}`}>
                  {vapiConfigured ? "VAPI Voice AI Active" : "VAPI Not Configured"}
                </h3>
                <p className={`text-sm ${vapiConfigured ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {vapiConfigured
                    ? `AI: ${tenantConfig?.ai_name || "Voice AI"} · ${allCalls.length} total calls`
                    : "Configure VAPI in the AI Config tab to enable voice calls"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchStats()}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Badge className={vapiConfigured ? "bg-green-500 text-white" : "bg-amber-500 text-white"}>
                <Activity className="h-3 w-3 mr-1" />
                {vapiConfigured ? "Connected" : "Setup Required"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid — 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calls Today</p>
                <p className="text-2xl font-bold">{todayCalls.length}</p>
              </div>
              <Phone className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Attempts</p>
              <p className="text-2xl font-bold">{attemptCount || 0}</p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">from sales sequencer</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold">{completedCalls.length}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <PhoneIncoming className="h-3 w-3" /> {allCalls.filter((c: any) => c.direction === "inbound").length} in
              </span>
              <span className="flex items-center gap-1">
                <PhoneOutgoing className="h-3 w-3" /> {allCalls.filter((c: any) => c.direction === "outbound").length} out
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connection Rate</p>
                <p className="text-2xl font-bold">{connectionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Talk Time</p>
                <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className={`text-2xl font-bold ${lowBalance ? "text-amber-600" : ""}`}>
                  {credits ? `${creditsBalance.toFixed(0)} min` : "N/A"}
                </p>
              </div>
              <CreditCard className={`h-8 w-8 ${lowBalance ? "text-amber-500" : "text-indigo-500"}`} />
            </div>
            {credits?.auto_recharge_enabled && (
              <p className="text-xs text-green-600 mt-1">Auto-recharge on</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Performance + Credits side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* AI Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" /> AI Performance
            </CardTitle>
            <CardDescription>Voice AI effectiveness metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="text-lg font-bold">{formatDuration(avgDuration)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Positive Sentiment</p>
                <p className="text-lg font-bold text-green-600">{positiveRate}%</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Call Score</p>
                <p className={`text-lg font-bold ${avgScore != null && avgScore >= 70 ? "text-green-600" : avgScore != null ? "text-amber-600" : ""}`}>
                  {avgScore != null ? `${avgScore}/100` : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>

            {/* Sentiment Breakdown */}
            {sentimentTotal > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Sentiment Breakdown</p>
                <div className="flex items-center gap-2 h-4 rounded-full overflow-hidden bg-gray-100">
                  {sentimentBreakdown.positive > 0 && (
                    <div className="bg-green-500 h-full" style={{ width: `${(sentimentBreakdown.positive / sentimentTotal) * 100}%` }} />
                  )}
                  {sentimentBreakdown.neutral > 0 && (
                    <div className="bg-yellow-400 h-full" style={{ width: `${(sentimentBreakdown.neutral / sentimentTotal) * 100}%` }} />
                  )}
                  {sentimentBreakdown.negative > 0 && (
                    <div className="bg-red-500 h-full" style={{ width: `${(sentimentBreakdown.negative / sentimentTotal) * 100}%` }} />
                  )}
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><SmilePlus className="h-3 w-3 text-green-500" /> {sentimentBreakdown.positive}</span>
                  <span className="flex items-center gap-1"><Meh className="h-3 w-3 text-yellow-500" /> {sentimentBreakdown.neutral}</span>
                  <span className="flex items-center gap-1"><Frown className="h-3 w-3 text-red-500" /> {sentimentBreakdown.negative}</span>
                </div>
              </div>
            )}

            {/* Outcome Breakdown */}
            {outcomeEntries.length > 0 && outcomeEntries[0][0] !== "unknown" && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Outcomes
                </p>
                <div className="flex flex-wrap gap-2">
                  {outcomeEntries.filter(([k]) => k !== "unknown").map(([outcome, count]) => (
                    <Badge key={outcome} className={getOutcomeColor(outcome)}>
                      {outcome.replace(/_/g, " ")} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Credits Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Voice Credits
            </CardTitle>
            <CardDescription>Balance and usage overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {credits ? (
              <>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${lowBalance ? "text-amber-600" : "text-primary"}`}>
                    {creditsBalance.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">minutes remaining</p>
                  {lowBalance && (
                    <Badge className="mt-2 bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Low Balance
                    </Badge>
                  )}
                </div>

                {/* Progress bar */}
                {creditsPurchased > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Used: {(creditsPurchased - creditsBalance).toFixed(0)} min</span>
                      <span>Total: {creditsPurchased.toFixed(0)} min</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          creditsUsedPercent > 80 ? "bg-red-500" : creditsUsedPercent > 60 ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${creditsUsedPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="font-bold">${Number(credits.current_rate_per_minute || 0.12).toFixed(2)}/min</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Est. Calls Left</p>
                    <p className="font-bold">{estimatedCallsRemaining > 0 ? `~${estimatedCallsRemaining}` : "N/A"}</p>
                  </div>
                </div>

                {credits.auto_recharge_enabled && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-700 dark:text-green-300">Auto-recharge enabled</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No credits configured</p>
                <p className="text-xs text-muted-foreground mt-1">Contact support to set up voice credits</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage Gaps */}
      {coverageGaps.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Coverage Gaps — Unreachable Leads</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {coverageGaps.map((g) => (
                    <div key={g.country} className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full px-3 py-1 text-sm text-amber-800 dark:text-amber-200">
                      <span>{COUNTRY_FLAGS[g.country === "UAE" ? "AE" : g.country === "UK" ? "GB" : g.country] || "\u{1F310}"}</span>
                      <span className="font-medium">{g.count} {g.country} leads</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Add phone numbers for these countries in the Phone Numbers tab to reach these leads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Country Coverage Map */}
      {leadCountries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Lead Countries & Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leadCountries.map((lc) => {
                const code = lc.country === "UAE" ? "AE" : lc.country === "UK" ? "GB" : lc.country;
                const covered = callableCountries.includes(code);
                return (
                  <div key={lc.country} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{COUNTRY_FLAGS[code] || "\u{1F310}"}</span>
                      <span className="text-sm font-medium">{lc.country}</span>
                      <span className="text-xs text-muted-foreground">{lc.count} leads</span>
                    </div>
                    <Badge className={covered ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {covered ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {covered ? "Covered" : "No Number"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest voice AI call activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No calls yet</h3>
              <p className="text-muted-foreground">
                {vapiConfigured
                  ? "Voice calls will appear here once leads are contacted via the sales sequencer"
                  : "Configure VAPI in the AI Config tab to start making AI voice calls"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call: any) => (
                <div key={call.id || call.created_at} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      call.direction === "inbound" ? "bg-blue-100" : "bg-green-100"
                    }`}>
                      {call.direction === "inbound"
                        ? <PhoneIncoming className="h-4 w-4 text-blue-600" />
                        : <PhoneOutgoing className="h-4 w-4 text-green-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.lead_name || (call.direction === "inbound" ? call.from_number : call.to_number) || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(call.created_at)} &middot; {formatDuration(call.duration_seconds || 0)}
                        {call.total_cost != null && Number(call.total_cost) > 0 && (
                          <> &middot; ${Number(call.total_cost).toFixed(3)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.outcome && call.outcome !== "unknown" && (
                      <Badge className={getOutcomeColor(call.outcome)} variant="outline">
                        {call.outcome.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {call.sentiment && (
                      <Badge variant="outline" className="text-xs">{call.sentiment}</Badge>
                    )}
                    <Badge className={
                      (call.call_status === "completed" || call.call_status === "customer-ended-call" || call.call_status === "assistant-ended-call")
                        ? "bg-green-100 text-green-800"
                        : call.call_status === "failed" || call.call_status === "no-answer"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100"
                    }>
                      {(call.call_status === "completed" || call.call_status === "customer-ended-call" || call.call_status === "assistant-ended-call")
                        ? <CheckCircle className="h-3 w-3 mr-1" />
                        : call.call_status === "failed" || call.call_status === "no-answer"
                        ? <XCircle className="h-3 w-3 mr-1" />
                        : <AlertCircle className="h-3 w-3 mr-1" />}
                      {STATUS_LABELS[call.call_status] || call.call_status || "initiated"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
