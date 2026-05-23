import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Eye, Clock4, Target } from "lucide-react";

/**
 * Phase 12.D — Real estate Pulse widgets (Aamerah + future).
 * Uses re_listings + re_viewings + sales_leads filtered by industry.
 */
export function RealEstatePulseTab() {
  const { tenantId } = useTenant();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const { data: listings = [] } = useQuery({
    queryKey: ["repulse_listings", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("re_listings" as any)
        .select("id,status,listed_at,price")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: viewings7 = [] } = useQuery({
    queryKey: ["repulse_viewings_7", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("re_viewings" as any)
        .select("id,listing_id,viewer_id,viewed_at,outcome")
        .eq("tenant_id", tenantId)
        .gte("viewed_at", sevenDaysAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["repulse_leads", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("sales_leads" as any)
        .select("id,lead_status,created_at")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    const activeListings = listings.filter((l: any) => /active|listed|available/i.test(String(l.status || ""))).length || listings.length;
    const viewingsCount = viewings7.length;
    const totalLeads = leads.length;
    const uniqueViewers = new Set(viewings7.map((v: any) => v.viewer_id).filter(Boolean)).size;
    const conversionPct = totalLeads > 0 ? Math.round((uniqueViewers / totalLeads) * 100) : null;

    // Avg days on market
    const dom = listings
      .filter((l: any) => l.listed_at)
      .map((l: any) => Math.max(0, (today.getTime() - new Date(l.listed_at).getTime()) / (24 * 3600 * 1000)));
    const avgDom = dom.length > 0 ? Math.round(dom.reduce((s: number, n: number) => s + n, 0) / dom.length) : null;

    return { activeListings, viewingsCount, conversionPct, avgDom };
  }, [listings, viewings7, leads]);

  return (
    <Card className="border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-transparent" data-testid="industry-tab-real_estate">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-500" /> Real Estate Intelligence</h2>
            <p className="text-xs text-muted-foreground">Listings · viewings · conversion (7d window)</p>
          </div>
          <Badge variant="outline" className="text-[10px]">real_estate</Badge>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Widget testid="repulse-active-listings" icon={<Building2 className="h-4 w-4 text-emerald-500" />} label="Active listings" value={stats.activeListings > 0 ? String(stats.activeListings) : "—"} hint={stats.activeListings === 0 ? "Not enough data yet" : `${listings.length} total on file`} />
          <Widget testid="repulse-viewings" icon={<Eye className="h-4 w-4 text-violet-500" />} label="Viewings (7d)" value={stats.viewingsCount > 0 ? String(stats.viewingsCount) : "—"} hint={stats.viewingsCount === 0 ? "No viewings logged" : "Last 7 days"} />
          <Widget testid="repulse-dom" icon={<Clock4 className="h-4 w-4 text-sky-500" />} label="Avg DOM" value={stats.avgDom !== null ? `${stats.avgDom}d` : "—"} hint={stats.avgDom === null ? "Not enough data" : "Days on market"} />
          <Widget testid="repulse-conversion" icon={<Target className="h-4 w-4 text-rose-500" />} label="Lead→viewing %" value={stats.conversionPct !== null ? `${stats.conversionPct}%` : "—"} hint={stats.conversionPct === null ? "Not enough data" : `${leads.length} leads on file`} />
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
