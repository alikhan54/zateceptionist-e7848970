import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat, Clock, Maximize2, Minimize2, RefreshCw, Play, CheckCircle, UtensilsCrossed,
} from "lucide-react";
import { useKitchenDisplay } from "@/hooks/useKitchenDisplay";
import { cn } from "@/lib/utils";

function getElapsedMinutes(createdAt: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
}
function getTimerColor(m: number): string {
  if (m < 15) return "text-green-600";
  if (m < 25) return "text-yellow-600";
  return "text-red-600";
}
function getTimerBg(m: number): string {
  if (m < 15) return "bg-green-500/10 border-green-500/30";
  if (m < 25) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/15 border-red-500/40";
}

// Station display config (primary station of each ticket)
const STATION_META: Record<string, { label: string; emoji: string }> = {
  grill: { label: "Grill", emoji: "🔥" },
  karahi: { label: "Karahi / Handi", emoji: "🍲" },
  tandoor: { label: "Tandoor", emoji: "🫓" },
  rice: { label: "Rice", emoji: "🍚" },
  cold: { label: "Cold / Salads", emoji: "🧊" },
  beverage: { label: "Beverages", emoji: "🥤" },
  buffet: { label: "Buffet", emoji: "🍽️" },
};
const STATION_ORDER = ["grill", "karahi", "tandoor", "rice", "cold", "beverage", "buffet"];
const primaryStation = (station: string): string => (String(station || "grill").split(",")[0] || "grill").trim();
const stationMeta = (s: string) => STATION_META[s] || { label: s.charAt(0).toUpperCase() + s.slice(1), emoji: "🍳" };

export default function KitchenDisplay() {
  const { kitchenOrders, queued, preparing, isLoading, refetch, startPreparation, markReady } = useKitchenDisplay();
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); setFullscreen(true); }
    else { document.exitFullscreen?.(); setFullscreen(false); }
  };

  // group active tickets by primary station
  const byStation = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const o of kitchenOrders) {
      const s = primaryStation(o.station);
      (g[s] = g[s] || []).push(o);
    }
    for (const s of Object.keys(g)) {
      g[s].sort((a, b) => getElapsedMinutes(b.created_at, now) - getElapsedMinutes(a.created_at, now));
    }
    return g;
  }, [kitchenOrders, now]);

  const stationKeys = useMemo(() => {
    const present = Object.keys(byStation);
    const ordered = STATION_ORDER.filter((s) => present.includes(s));
    const extra = present.filter((s) => !STATION_ORDER.includes(s));
    return [...ordered, ...extra];
  }, [byStation]);

  const TicketCard = ({ order }: { order: any }) => {
    const elapsed = getElapsedMinutes(order.created_at, now);
    const isPrep = order.status === "preparing";
    const isLate = elapsed >= 25;
    return (
      <Card data-testid={`kds-ticket-${order.order_number}`} className={cn("border-2", getTimerBg(elapsed), isLate && "animate-pulse")}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl">#{order.order_number ?? "?"}</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {order.order_type === "delivery" ? "Delivery" : order.order_type === "takeaway" || order.order_type === "pickup" ? "Takeaway" : `Dine-in${order.table_number ? ` T${order.table_number}` : ""}`}
              </Badge>
            </div>
            <Badge className={cn("text-[10px]", isPrep ? "bg-blue-600" : "bg-amber-500")}>{isPrep ? "PREPARING" : "NEW"}</Badge>
          </div>

          {order.customer_name && <p className="text-xs text-muted-foreground -mt-1">{order.customer_name}</p>}

          {/* BIG timer */}
          <div className={cn("flex items-center gap-1.5 font-mono font-extrabold text-3xl leading-none", getTimerColor(elapsed))} data-testid={`kds-timer-${order.order_number}`}>
            <Clock className="h-5 w-5" /> {elapsed}<span className="text-base font-bold">m</span>
          </div>

          <div className="space-y-0.5 pt-1">
            {(order.items || []).map((it: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-bold tabular-nums">{it.quantity}×</span>
                <span className="truncate">{it.name}</span>
              </div>
            ))}
          </div>

          {isPrep ? (
            <Button data-testid={`kds-ready-${order.order_number}`} className="w-full h-9 bg-green-600 hover:bg-green-700"
              onClick={() => markReady.mutate(order.id)} disabled={markReady.isPending}>
              <CheckCircle className="h-4 w-4 mr-1.5" /> Mark Ready
            </Button>
          ) : (
            <Button data-testid={`kds-start-${order.order_number}`} className="w-full h-9"
              onClick={() => startPreparation.mutate(order.id)} disabled={startPreparation.isPending}>
              <Play className="h-4 w-4 mr-1.5" /> Start Preparing
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-4 p-2", fullscreen && "p-4 bg-background min-h-screen")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Kitchen Display</h1>
            <p className="text-sm text-muted-foreground">
              {kitchenOrders.length} active · {queued.length} new · {preparing.length} preparing — by station
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading kitchen orders…</div>
      ) : kitchenOrders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No active orders</p>
          <p className="text-sm">New orders (counter, phone, or app) appear here in real-time</p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(stationKeys.length, 5)}, minmax(220px, 1fr))` }} data-testid="kds-board">
          {stationKeys.map((s) => {
            const meta = stationMeta(s);
            const tickets = byStation[s];
            return (
              <div key={s} className="space-y-2" data-testid={`kds-station-${s}`}>
                <div className="flex items-center gap-2 px-1 sticky top-0">
                  <span className="text-lg">{meta.emoji}</span>
                  <h2 className="font-bold uppercase tracking-wide text-sm">{meta.label}</h2>
                  <Badge variant="secondary">{tickets.length}</Badge>
                </div>
                {tickets.map((o) => <TicketCard key={o.id} order={o} />)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
