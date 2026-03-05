import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Headphones,
  Activity,
  Clock,
  Users,
  RefreshCcw,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function VoiceCallCenter() {
  const { tenantId, tenantConfig } = useTenant();
  const queryClient = useQueryClient();

  const vapiConfigured =
    !!tenantConfig?.vapi_api_key && !!tenantConfig?.vapi_assistant_id;

  // Real-time subscription for live call updates
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("voice-callcenter-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_usage",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["callcenter-active"] });
          queryClient.invalidateQueries({ queryKey: ["callcenter-recent"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  // Active/in-progress calls (SLUG tenant_id)
  const { data: activeCalls = [], refetch: refetchActive } = useQuery({
    queryKey: ["callcenter-active", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("voice_usage")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("call_status", ["initiated", "ringing", "in-progress"])
        .order("started_at", { ascending: false });
      if (error) {
        console.error("[VoiceCallCenter] active calls error:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 10000, // 10s for live monitoring
  });

  // Queue — calls waiting to be made (initiated but not yet ringing)
  const queuedCalls = activeCalls.filter(
    (c: any) => c.call_status === "initiated"
  );
  const ringingCalls = activeCalls.filter(
    (c: any) => c.call_status === "ringing"
  );
  const inProgressCalls = activeCalls.filter(
    (c: any) => c.call_status === "in-progress"
  );

  // Recently completed calls (last hour)
  const { data: recentCompleted = [] } = useQuery({
    queryKey: ["callcenter-recent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("voice_usage")
        .select(
          "id, call_id, direction, from_number, to_number, duration_seconds, total_cost, call_status, lead_name, lead_company, sentiment, started_at"
        )
        .eq("tenant_id", tenantId)
        .in("call_status", ["completed", "failed", "no-answer"])
        .gte("started_at", oneHourAgo)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const formatDuration = (s: number) => {
    if (!s) return "0s";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const formatTime = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getElapsedTime = (startedAt: string) => {
    if (!startedAt) return "0s";
    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );
    return formatDuration(elapsed);
  };

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              activeCalls.length > 0 ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          />
          <span className="text-sm font-medium">
            {activeCalls.length > 0
              ? `${activeCalls.length} active call${activeCalls.length !== 1 ? "s" : ""}`
              : "No active calls"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchActive()}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={
            inProgressCalls.length > 0
              ? "border-green-300 bg-green-50/50"
              : ""
          }
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold">{inProgressCalls.length}</p>
              </div>
              <Headphones className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={
            ringingCalls.length > 0 ? "border-blue-300 bg-blue-50/50" : ""
          }
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ringing</p>
                <p className="text-3xl font-bold">{ringingCalls.length}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Queue</p>
                <p className="text-3xl font-bold">{queuedCalls.length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed (1hr)</p>
                <p className="text-3xl font-bold">{recentCompleted.length}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Calls Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wifi className="h-5 w-5 text-green-500" /> Active Calls
          </CardTitle>
          <CardDescription>
            Live call monitoring — updates every 10 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!vapiConfigured ? (
            <div className="text-center py-12">
              <WifiOff className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">VAPI Not Configured</h3>
              <p className="text-muted-foreground">
                Configure VAPI in the AI Config tab to start monitoring live
                calls.
              </p>
            </div>
          ) : activeCalls.length === 0 ? (
            <div className="text-center py-12">
              <Headphones className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No active calls</h3>
              <p className="text-muted-foreground">
                Active calls will appear here in real-time when voice outreach is
                running.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCalls.map((call: any) => (
                <div
                  key={call.id}
                  className={`p-4 rounded-lg border-2 ${
                    call.call_status === "in-progress"
                      ? "border-green-300 bg-green-50/50"
                      : call.call_status === "ringing"
                      ? "border-blue-300 bg-blue-50/50 animate-pulse"
                      : "border-amber-300 bg-amber-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-green-600" />
                      )}
                      <span className="font-medium text-sm">
                        {call.lead_name || call.to_number || call.from_number || "Unknown"}
                      </span>
                    </div>
                    <Badge
                      className={
                        call.call_status === "in-progress"
                          ? "bg-green-100 text-green-800"
                          : call.call_status === "ringing"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {call.call_status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      {call.direction === "inbound" ? "From: " : "To: "}
                      {call.direction === "inbound"
                        ? call.from_number
                        : call.to_number}
                    </p>
                    {call.lead_company && <p>Company: {call.lead_company}</p>}
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Elapsed: {getElapsedTime(call.started_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Completed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Recently Completed (Last Hour)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCompleted.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              No completed calls in the last hour
            </p>
          ) : (
            <div className="space-y-2">
              {recentCompleted.map((call: any) => (
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
                        {call.lead_name || call.to_number || call.from_number || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(call.started_at)} &middot;{" "}
                        {formatDuration(call.duration_seconds || 0)}
                        {call.total_cost != null &&
                          Number(call.total_cost) > 0 && (
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
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {call.call_status === "completed" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {call.call_status}
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
