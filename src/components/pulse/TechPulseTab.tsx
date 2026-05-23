import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Users, TrendingUp, Activity } from "lucide-react";

/**
 * Phase 12.D — Tech / platform Pulse (zateceptionist itself + future).
 * Reads tenant_config + agent_actions + system_events to surface platform health.
 */
export function TechPulseTab() {
  const { tenantId } = useTenant();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const oneDayAgoISO = oneDayAgo.toISOString();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { data: tenants = [] } = useQuery({
    queryKey: ["techpulse_tenants"],
    queryFn: async () => {
      // Active-tenant count (only zateceptionist itself sees this widget meaningfully)
      const { data } = await supabase.from("tenant_config" as any)
        .select("id,tenant_id,subscription_status")
        .eq("subscription_status", "active");
      return data || [];
    },
  });

  const { data: invocations = [] } = useQuery({
    queryKey: ["techpulse_invocations", tenantId, oneDayAgoISO],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("agent_actions" as any)
        .select("id,agent_name,created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", oneDayAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: events7 = [] } = useQuery({
    queryKey: ["techpulse_events_7", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("system_events" as any)
        .select("id,event_type,severity,created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", sevenDaysAgoISO)
        .limit(500);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    const invocations24h = invocations.length;
    const errorEvents = events7.filter((e: any) => /error|critical|failed/i.test(String(e.severity || ""))).length;
    const totalEvents = events7.length;
    const errorRatePct = totalEvents > 0 ? Math.round((errorEvents / totalEvents) * 100) : null;

    // Agent breakdown (top 3)
    const byAgent: Record<string, number> = {};
    invocations.forEach((i: any) => {
      const n = String(i.agent_name || "").toLowerCase();
      if (n) byAgent[n] = (byAgent[n] || 0) + 1;
    });
    const topAgent = Object.entries(byAgent).sort((a, b) => b[1] - a[1])[0];

    return {
      activeTenants: tenants.length,
      invocations24h,
      topAgentName: topAgent?.[0] || null,
      topAgentCount: topAgent?.[1] || 0,
      errorRatePct,
    };
  }, [tenants, invocations, events7]);

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent" data-testid="industry-tab-technology">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Cpu className="h-5 w-5 text-indigo-500" /> Platform Intelligence</h2>
            <p className="text-xs text-muted-foreground">Tenant health · agent activity · 24h + 7d windows</p>
          </div>
          <Badge variant="outline" className="text-[10px]">technology</Badge>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Widget testid="techpulse-tenants" icon={<Users className="h-4 w-4 text-emerald-500" />} label="Active tenants" value={stats.activeTenants > 0 ? String(stats.activeTenants) : "—"} hint={stats.activeTenants === 0 ? "Not enough data" : "subscription_status=active"} />
          <Widget testid="techpulse-invocations" icon={<Activity className="h-4 w-4 text-violet-500" />} label="Agent calls (24h)" value={stats.invocations24h > 0 ? String(stats.invocations24h) : "—"} hint={stats.invocations24h === 0 ? "No calls logged" : "Last 24 hours"} />
          <Widget testid="techpulse-top-agent" icon={<TrendingUp className="h-4 w-4 text-sky-500" />} label="Top agent" value={stats.topAgentName || "—"} hint={stats.topAgentName ? `${stats.topAgentCount} calls (24h)` : "Not enough data"} />
          <Widget testid="techpulse-error-rate" icon={<Cpu className="h-4 w-4 text-rose-500" />} label="Error rate (7d)" value={stats.errorRatePct !== null ? `${stats.errorRatePct}%` : "—"} hint={stats.errorRatePct === null ? "No events logged" : `${events7.length} events`} />
        </div>
      </CardContent>
    </Card>
  );
}

function Widget({ testid, icon, label, value, hint }: { testid: string; icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2.5" data-testid={testid}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span></div>
      <div className="text-xl font-semibold truncate">{value}</div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
