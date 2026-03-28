import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, Info, CheckCircle, Bell, Sun, X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useOmegaVoice } from "@/hooks/useOmegaVoice";

const SEVERITY = {
  critical: { icon: AlertCircle, color: "text-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", bar: "bg-red-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", bar: "bg-amber-500" },
  info: { icon: Info, color: "text-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", bar: "bg-blue-500" },
};

export default function OmegaAlerts() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const { speakText, isSpeaking, stopSpeaking, voiceEnabled } = useOmegaVoice();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["omega-alerts-full", tenantId, filter],
    queryFn: async () => {
      let query = supabase
        .from("omega_alerts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "critical") query = query.eq("severity", "critical");
      else if (filter === "warnings") query = query.eq("severity", "warning");
      else if (filter === "briefings") query = query.eq("alert_type", "daily_briefing");

      const { data } = await query;
      return data || [];
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const dismissAlert = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("omega_alerts").update({ is_dismissed: true, dismissed_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["omega-alerts"] }),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("omega_alerts").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["omega-alerts"] }),
  });

  const unread = alerts.filter((a: any) => !a.is_read).length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">OMEGA Alerts</h1>
            <p className="text-sm text-muted-foreground">{unread} unread of {alerts.length} total</p>
          </div>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
          <TabsTrigger value="briefings">Briefings</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                <p className="text-lg font-medium">All Clear</p>
                <p className="text-sm text-muted-foreground">No alerts to show. System running smoothly.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: any) => {
                const sev = SEVERITY[alert.severity as keyof typeof SEVERITY] || SEVERITY.info;
                const Icon = sev.icon;
                const isBriefing = alert.alert_type === "daily_briefing";

                return (
                  <Card key={alert.id} className={cn("relative overflow-hidden", !alert.is_read && "ring-1 ring-primary/20")}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", sev.bar)} />
                    <CardHeader className="pb-2 pl-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {isBriefing ? <Sun className="h-5 w-5 text-amber-500" /> : <Icon className={cn("h-5 w-5", sev.color)} />}
                          <CardTitle className="text-base">{alert.title}</CardTitle>
                          <Badge variant="outline" className={cn("text-[10px]", sev.badge)}>{alert.severity}</Badge>
                          {alert.category && <Badge variant="secondary" className="text-[10px]">{alert.category}</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          {voiceEnabled && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isSpeaking ? stopSpeaking() : speakText(alert.message)}>
                              <Volume2 className={cn("h-3.5 w-3.5", isSpeaking && "animate-pulse text-primary")} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismissAlert.mutate(alert.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pl-5 pb-3">
                      <p className={cn("text-sm whitespace-pre-line", isBriefing ? "font-mono text-xs" : "text-muted-foreground")}>
                        {alert.message}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(alert.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })})
                        </span>
                        <div className="flex gap-2">
                          {!alert.is_read && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markRead.mutate(alert.id)}>
                              Mark read
                            </Button>
                          )}
                          {alert.action_label && alert.action_url && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => window.location.href = alert.action_url}>
                              {alert.action_label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
