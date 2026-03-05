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
  DollarSign,
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
} from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", CA: "\u{1F1E8}\u{1F1E6}", GB: "\u{1F1EC}\u{1F1E7}",
  AE: "\u{1F1E6}\u{1F1EA}", IN: "\u{1F1EE}\u{1F1F3}", AU: "\u{1F1E6}\u{1F1FA}",
  DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", SA: "\u{1F1F8}\u{1F1E6}",
  PK: "\u{1F1F5}\u{1F1F0}",
};

export default function VoiceOverview() {
  const { tenantId, tenantConfig } = useTenant();

  const vapiConfigured =
    !!tenantConfig?.vapi_api_key &&
    !!tenantConfig?.vapi_assistant_id &&
    !!tenantConfig?.vapi_phone_number;

  // Fetch voice_usage stats (SLUG tenant_id)
  const { data: callStats, refetch: refetchStats } = useQuery({
    queryKey: ["voice-overview-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("voice_usage")
        .select("direction, duration_seconds, total_cost, call_status, started_at")
        .eq("tenant_id", tenantId);
      if (error) { console.error("[VoiceOverview] voice_usage error:", error); return null; }
      const calls = data || [];
      const today = new Date().toISOString().split("T")[0];
      const todayCalls = calls.filter((c: any) => c.started_at?.startsWith(today));
      const completed = calls.filter((c: any) => c.call_status === "completed");
      return {
        totalConnected: calls.length,
        inbound: calls.filter((c: any) => c.direction === "inbound").length,
        outbound: calls.filter((c: any) => c.direction === "outbound").length,
        today: todayCalls.length,
        completed: completed.length,
        successRate: calls.length > 0 ? Math.round((completed.length / calls.length) * 100) : 0,
        totalDuration: calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0),
        totalCost: calls.reduce((s: number, c: any) => s + (Number(c.total_cost) || 0), 0),
      };
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
        .eq("tenant_id", tenantId);
      if (error) { console.error("[VoiceOverview] sales_leads error:", error); return 0; }
      return (data || []).reduce((sum: number, l: any) => sum + (l.calls_made || 0), 0);
    },
    enabled: !!tenantId,
  });

  // Fetch credit balance (SLUG tenant_id)
  const { data: credits } = useQuery({
    queryKey: ["voice-overview-credits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("voice_credits")
        .select("balance_minutes, balance_amount, auto_recharge_enabled, current_rate_per_minute, total_purchased, total_used")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) { console.error("[VoiceOverview] voice_credits error:", error); return null; }
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
        .eq("tenant_id", tenantId);
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

  // Recent calls (SLUG tenant_id)
  const { data: recentCalls = [] } = useQuery({
    queryKey: ["voice-overview-recent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("voice_usage")
        .select("id, call_id, direction, from_number, to_number, duration_seconds, total_cost, call_status, sentiment, outcome, lead_name, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Coverage analysis
  const callableCountries = [...new Set((phoneNumbers as any[]).flatMap((p) => p.can_call_countries || []))];
  const coverageGaps = leadCountries.filter((lc) => {
    const code = lc.country === "UAE" ? "AE" : lc.country === "UK" ? "GB" : lc.country;
    return !callableCountries.includes(code);
  });

  const connectionRate =
    attemptCount && attemptCount > 0
      ? Math.round(((callStats?.totalConnected || 0) / attemptCount) * 100)
      : 0;

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
    return (
      date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " +
      date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="space-y-6">
      {/* VAPI Status */}
      <Card
        className={
          vapiConfigured
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
            : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  vapiConfigured ? "bg-green-500" : "bg-amber-500"
                }`}
              >
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3
                  className={`font-semibold ${
                    vapiConfigured ? "text-green-800" : "text-amber-800"
                  }`}
                >
                  {vapiConfigured ? "VAPI Voice AI Active" : "VAPI Not Configured"}
                </h3>
                <p
                  className={`text-sm ${
                    vapiConfigured ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {vapiConfigured
                    ? `Phone: ${tenantConfig?.vapi_phone_number || "Connected"}`
                    : "Configure VAPI in the AI Config tab to enable voice calls"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchStats()}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Badge
                className={
                  vapiConfigured ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                }
              >
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
                <p className="text-2xl font-bold">{callStats?.today || 0}</p>
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
              <span className="text-xs text-muted-foreground">
                from sales sequencer
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold">{callStats?.totalConnected || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <PhoneIncoming className="h-3 w-3" /> {callStats?.inbound || 0} in
              </span>
              <span className="flex items-center gap-1">
                <PhoneOutgoing className="h-3 w-3" /> {callStats?.outbound || 0} out
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
                <p className="text-2xl font-bold">
                  {formatDuration(callStats?.totalDuration || 0)}
                </p>
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
                <p className="text-2xl font-bold">
                  {credits
                    ? `${Number(credits.balance_minutes || 0).toFixed(0)} min`
                    : "N/A"}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-amber-500" />
            </div>
            {credits?.auto_recharge_enabled && (
              <p className="text-xs text-green-600 mt-1">Auto-recharge on</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coverage Gaps */}
      {coverageGaps.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  Coverage Gaps — Unreachable Leads
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {coverageGaps.map((g) => (
                    <div
                      key={g.country}
                      className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3 py-1 text-sm text-amber-800"
                    >
                      <span>
                        {COUNTRY_FLAGS[
                          g.country === "UAE"
                            ? "AE"
                            : g.country === "UK"
                            ? "GB"
                            : g.country
                        ] || "\u{1F310}"}
                      </span>
                      <span className="font-medium">
                        {g.count} {g.country} leads
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Add phone numbers for these countries in the Phone Numbers tab to
                  reach these leads.
                </p>
              </div>
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
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        call.direction === "inbound"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.lead_name ||
                          (call.direction === "inbound"
                            ? call.from_number
                            : call.to_number) ||
                          "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(call.created_at)} &middot;{" "}
                        {formatDuration(call.duration_seconds || 0)}
                        {call.total_cost != null && Number(call.total_cost) > 0 && (
                          <> &middot; ${Number(call.total_cost).toFixed(3)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.sentiment && (
                      <Badge variant="outline" className="text-xs">
                        {call.sentiment}
                      </Badge>
                    )}
                    <Badge
                      className={
                        call.call_status === "completed"
                          ? "bg-green-100 text-green-800"
                          : call.call_status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100"
                      }
                    >
                      {call.call_status === "completed" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : call.call_status === "failed" ? (
                        <XCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {call.call_status || "initiated"}
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
