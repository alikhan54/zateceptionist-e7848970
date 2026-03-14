import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Settings2,
  Mic,
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VoiceSetupWizard } from "@/components/voice/VoiceSetupWizard";

export default function VoiceAI() {
  const { tenantId, tenantConfig } = useTenant();
  const navigate = useNavigate();

  // Check VAPI configuration status from tenant config
  const vapiConfigured =
    !!tenantConfig?.vapi_api_key &&
    !!tenantConfig?.vapi_assistant_id &&
    !!tenantConfig?.vapi_phone_number;

  // Fetch call stats from voice_usage
  const { data: callStats, refetch: refetchStats } = useQuery({
    queryKey: ["voice", "stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return { totalCalls: 0, inbound: 0, outbound: 0, totalDuration: 0, totalCost: 0, today: 0 };
      const { data, error } = await supabase
        .from("voice_usage")
        .select("direction, duration_seconds, total_cost, created_at")
        .eq("tenant_id", tenantId);
      if (error) {
        console.error("[VoiceAI] Error fetching voice_usage:", error);
        return { totalCalls: 0, inbound: 0, outbound: 0, totalDuration: 0, totalCost: 0, today: 0 };
      }
      const calls = data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        totalCalls: calls.length,
        inbound: calls.filter((c: any) => c.direction === "inbound").length,
        outbound: calls.filter((c: any) => c.direction === "outbound").length,
        totalDuration: calls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0),
        totalCost: calls.reduce((sum: number, c: any) => sum + (Number(c.total_cost) || 0), 0),
        today: calls.filter((c: any) => new Date(c.created_at) >= today).length,
      };
    },
    enabled: !!tenantId,
  });

  // Fetch credit balance from voice_credits
  const { data: credits } = useQuery({
    queryKey: ["voice", "credits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("voice_credits")
        .select("balance_minutes, balance_amount, current_rate_per_minute, total_purchased, total_used, auto_recharge_enabled")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) {
        console.error("[VoiceAI] Error fetching voice_credits:", error);
        return null;
      }
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch recent calls
  const { data: recentCalls = [] } = useQuery({
    queryKey: ["voice", "recent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("voice_usage")
        .select("id, call_id, direction, from_number, to_number, duration_seconds, total_cost, call_status, sentiment, outcome, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        console.error("[VoiceAI] Error fetching recent calls:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantId,
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <VoiceSetupWizard />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice AI</h1>
          <p className="text-muted-foreground">AI-powered voice communications via VAPI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchStats()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/settings/voice-ai")}>
            <Settings2 className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* VAPI Config Status */}
      <Card className={vapiConfigured
        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
        : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
      }>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${vapiConfigured ? "bg-green-500" : "bg-amber-500"}`}>
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${vapiConfigured ? "text-green-800" : "text-amber-800"}`}>
                  {vapiConfigured ? "VAPI Voice AI Active" : "VAPI Not Configured"}
                </h3>
                <p className={`text-sm ${vapiConfigured ? "text-green-600" : "text-amber-600"}`}>
                  {vapiConfigured
                    ? `Phone: ${tenantConfig?.vapi_phone_number || "Connected"}`
                    : "Configure VAPI API key and assistant to enable voice calls"
                  }
                </p>
              </div>
            </div>
            <Badge className={vapiConfigured ? "bg-green-500 text-white" : "bg-amber-500 text-white"}>
              <Activity className="h-3 w-3 mr-1" />
              {vapiConfigured ? "Connected" : "Setup Required"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{callStats?.totalCalls || 0}</p>
              </div>
              <Mic className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">Talk Time</p>
                <p className="text-2xl font-bold">{formatDuration(callStats?.totalDuration || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${(callStats?.totalCost || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credit Balance</p>
                <p className="text-2xl font-bold">
                  {credits ? `${Number(credits.balance_minutes || 0).toFixed(0)} min` : "N/A"}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-amber-500" />
            </div>
            {credits?.auto_recharge_enabled && (
              <p className="text-xs text-green-600 mt-2">Auto-recharge enabled</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls</CardTitle>
          <CardDescription>Voice AI call history from VAPI</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No calls yet</h3>
              <p className="text-muted-foreground mb-4">
                {vapiConfigured
                  ? "Voice calls will appear here once leads are contacted via the sales sequencer"
                  : "Configure VAPI in Settings to start making AI voice calls"
                }
              </p>
              {!vapiConfigured && (
                <Button onClick={() => navigate("/settings/voice-ai")}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configure VAPI
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call: any) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      call.direction === "inbound" ? "bg-blue-100" : "bg-green-100"
                    }`}>
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.direction === "inbound" ? call.from_number : call.to_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(call.created_at)} &middot; {formatDuration(call.duration_seconds || 0)}
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
                      variant={call.call_status === "completed" ? "default" : "secondary"}
                      className={
                        call.call_status === "completed" ? "bg-green-100 text-green-800" :
                        call.call_status === "failed" ? "bg-red-100 text-red-800" :
                        "bg-gray-100"
                      }
                    >
                      {call.call_status === "completed" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : call.call_status === "failed" ? (
                        <XCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {call.call_status || "unknown"}
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
