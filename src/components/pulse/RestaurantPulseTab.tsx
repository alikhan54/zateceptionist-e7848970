import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Receipt, TrendingUp, ChefHat, Truck } from "lucide-react";

/**
 * Phase 12.D — Restaurant-specific Pulse widgets (BBQ Tonight + future).
 *
 * Reads existing tables only — uses graceful "—" when data isn't available
 * for the tenant. NO schema-add.
 */
export function RestaurantPulseTab() {
  const { tenantId } = useTenant();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // Orders today — try common order/transaction table names
  const { data: ordersToday = [] } = useQuery({
    queryKey: ["restpulse_orders_today", tenantId, todayISO],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("orders" as any)
        .select("id,total,channel,status,created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", todayISO)
        .lt("created_at", tomorrowISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: ordersLast7 = [] } = useQuery({
    queryKey: ["restpulse_orders_7", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("orders" as any)
        .select("id,total,channel,menu_item_id")
        .eq("tenant_id", tenantId)
        .gte("created_at", sevenDaysAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["restpulse_menu", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("menu_items" as any)
        .select("id,name")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    const todayCount = ordersToday.length;
    const todayRevenue = ordersToday.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const avgTicket = ordersLast7.length > 0
      ? Math.round(ordersLast7.reduce((s: number, o: any) => s + (o.total || 0), 0) / ordersLast7.length)
      : null;
    const deliveryCount = ordersLast7.filter((o: any) => /deliver|takeaway/i.test(String(o.channel || ""))).length;
    const dineInCount = ordersLast7.filter((o: any) => /dine|table/i.test(String(o.channel || ""))).length;
    const deliveryPct = ordersLast7.length > 0 ? Math.round((deliveryCount / ordersLast7.length) * 100) : null;

    const byItem: Record<string, number> = {};
    ordersLast7.forEach((o: any) => { if (o.menu_item_id) byItem[o.menu_item_id] = (byItem[o.menu_item_id] || 0) + 1; });
    const sortedItems = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topItems = sortedItems.map(([id, n]) => ({ name: menuItems.find((m: any) => m.id === id)?.name || "—", count: n }));

    return { todayCount, todayRevenue, avgTicket, deliveryPct, dineInCount, topItems };
  }, [ordersToday, ordersLast7, menuItems]);

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent" data-testid="industry-tab-restaurant">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Utensils className="h-5 w-5 text-amber-500" /> Restaurant Intelligence</h2>
            <p className="text-xs text-muted-foreground">Industry-specific pulse · today + 7-day rolling</p>
          </div>
          <Badge variant="outline" className="text-[10px]">restaurant</Badge>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Widget testid="restpulse-orders-today" icon={<Receipt className="h-4 w-4 text-emerald-500" />} label="Orders today" value={stats.todayCount > 0 ? String(stats.todayCount) : "—"} hint={stats.todayCount === 0 ? "No orders yet today" : `AED ${stats.todayRevenue}`} />
          <Widget testid="restpulse-avg-ticket" icon={<TrendingUp className="h-4 w-4 text-violet-500" />} label="Avg ticket (7d)" value={stats.avgTicket !== null ? `AED ${stats.avgTicket}` : "—"} hint={stats.avgTicket === null ? "Not enough data yet" : "Per-order average"} />
          <Widget testid="restpulse-delivery-pct" icon={<Truck className="h-4 w-4 text-sky-500" />} label="Delivery share" value={stats.deliveryPct !== null ? `${stats.deliveryPct}%` : "—"} hint={stats.deliveryPct === null ? "Not enough data" : `${stats.dineInCount} dine-in (7d)`} />
          <Widget testid="restpulse-top-item" icon={<ChefHat className="h-4 w-4 text-rose-500" />} label="Top menu item" value={stats.topItems[0]?.name || "—"} hint={stats.topItems[0] ? `${stats.topItems[0].count} sold (7d)` : "Not enough data"} />
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
