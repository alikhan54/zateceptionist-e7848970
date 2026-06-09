import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, MapPin, Navigation, Zap, RefreshCw, Bike, Store, Hand } from "lucide-react";
import { toast } from "sonner";

// --- config (free map stack: OpenStreetMap tiles + public OSRM; no API keys) ---
const RESTAURANT_ORIGIN = { lat: 24.8170, lng: 67.0300, name: "Bar.B.Q Tonight (Clifton)" };
const OSRM_BASE = "https://router.project-osrm.org";
const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DISPATCH_WEBHOOK =
  (import.meta as any)?.env?.VITE_DISPATCH_WEBHOOK || "https://webhooks.zatesystems.com/webhook/bbq-dispatch-assign";

const AREA_COLORS: Record<string, string> = {
  DHA: "#2563eb", Clifton: "#16a34a", Gulshan: "#ea580c", Unknown: "#7c3aed",
};
const colorFor = (area: string) => AREA_COLORS[area] || "#7c3aed";

interface Rider {
  id: string; name: string; phone: string | null; status: string;
  current_area: string | null; current_lat: number | null; current_lng: number | null;
}
interface DispatchOrder {
  id: string; order_number: number; customer_name: string | null; customer_phone: string | null;
  status: string; total: number | null; delivery_rider_id: string | null;
  area: string; address: string; lat: number; lng: number;
}
interface RouteInfo {
  positions: [number, number][]; ordered: DispatchOrder[];
  distanceKm: number | null; durationMin: number | null; source: "osrm" | "fallback";
}

function pin(color: string, label: string) {
  return L.divIcon({
    className: "dispatch-pin",
    html: `<div style="background:${color};color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${label}</div>`,
    iconSize: [26, 26], iconAnchor: [13, 13],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      try { map.fitBounds(points as any, { padding: [40, 40], maxZoom: 14 }); } catch { /* ignore */ }
    }
  }, [JSON.stringify(points), map]);
  return null;
}

async function fetchRoute(stops: DispatchOrder[]): Promise<RouteInfo> {
  const coords = [RESTAURANT_ORIGIN, ...stops];
  const path = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `${OSRM_BASE}/trip/v1/driving/${path}?source=first&roundtrip=false&geometries=geojson&overview=full`;
  try {
    const res = await fetch(url);
    const j = await res.json();
    if (j.code !== "Ok" || !j.trips?.length) throw new Error("osrm");
    const positions: [number, number][] = j.trips[0].geometry.coordinates.map((p: number[]) => [p[1], p[0]]);
    // waypoints[i] maps to input coord i; input 0 = origin. Order stops by waypoint_index.
    const wps: { input: number; order: number }[] = j.waypoints.map((w: any, i: number) => ({ input: i, order: w.waypoint_index }));
    const ordered = wps.slice(1).sort((a, b) => a.order - b.order).map((w) => stops[w.input - 1]);
    return { positions, ordered, distanceKm: j.trips[0].distance / 1000, durationMin: j.trips[0].duration / 60, source: "osrm" };
  } catch {
    // fallback: straight line origin -> stops (input order); still renders a route + list
    const positions: [number, number][] = [RESTAURANT_ORIGIN, ...stops].map((c) => [c.lat, c.lng]);
    return { positions, ordered: stops, distanceKm: null, durationMin: null, source: "fallback" };
  }
}

export default function Dispatch() {
  const { tenantId } = useTenant();
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"manual" | "autonomous">("manual");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [routes, setRoutes] = useState<Record<string, RouteInfo>>({});
  const [busy, setBusy] = useState(false);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["dispatch_orders", tenantId],
    enabled: !!tenantId,
    refetchInterval: 15000,
    queryFn: async (): Promise<DispatchOrder[]> => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("restaurant_orders")
        .select("id, order_number, customer_name, customer_phone, status, total, delivery_rider_id, delivery_address")
        .eq("tenant_id", tenantId)
        .eq("order_type", "delivery")
        .in("status", ["ready", "dispatched"])
        .order("order_number");
      return (data || [])
        .map((o: any) => {
          let da = o.delivery_address || {};
          if (typeof da === "string") { try { da = JSON.parse(da); } catch { da = {}; } }
          return {
            id: o.id, order_number: o.order_number, customer_name: o.customer_name, customer_phone: o.customer_phone,
            status: o.status, total: o.total, delivery_rider_id: o.delivery_rider_id,
            area: da.area || "Unknown", address: da.address || "", lat: Number(da.lat), lng: Number(da.lng),
          };
        })
        .filter((o: DispatchOrder) => isFinite(o.lat) && isFinite(o.lng));
    },
  });

  const { data: riders = [] } = useQuery({
    queryKey: ["dispatch_riders", tenantId],
    enabled: !!tenantId,
    refetchInterval: 15000,
    queryFn: async (): Promise<Rider[]> => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("restaurant_riders")
        .select("id, name, phone, status, current_area, current_lat, current_lng")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name");
      return (data || []) as Rider[];
    },
  });

  const ridersById = useMemo(() => Object.fromEntries(riders.map((r) => [r.id, r])), [riders]);
  const availableRiders = useMemo(() => riders.filter((r) => r.status === "available"), [riders]);

  // group orders by area
  const groups = useMemo(() => {
    const g: Record<string, DispatchOrder[]> = {};
    for (const o of orders) (g[o.area] = g[o.area] || []).push(o);
    return g;
  }, [orders]);

  // compute OSRM routes per area whenever the set of order ids changes
  const orderSig = useMemo(() => orders.map((o) => o.id).sort().join(","), [orders]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        Object.entries(groups).map(async ([area, grp]) => [area, await fetchRoute(grp)] as const)
      );
      if (!cancelled) setRoutes(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSig]);

  const allPoints: [number, number][] = useMemo(
    () => [[RESTAURANT_ORIGIN.lat, RESTAURANT_ORIGIN.lng], ...orders.map((o) => [o.lat, o.lng] as [number, number])],
    [orders]
  );

  const assignedRiderFor = (grp: DispatchOrder[]): Rider | null => {
    const ids = Array.from(new Set(grp.map((o) => o.delivery_rider_id).filter(Boolean)));
    return ids.length === 1 ? ridersById[ids[0] as string] || null : null;
  };

  async function assignManual(area: string) {
    const riderId = sel[area];
    const grp = groups[area];
    if (!riderId || !grp?.length || !tenantId) { toast.error("Pick a rider first"); return; }
    setBusy(true);
    const ids = grp.map((o) => o.id);
    const { error: e1 } = await supabase.from("restaurant_orders").update({ delivery_rider_id: riderId, status: "dispatched" }).in("id", ids).eq("tenant_id", tenantId);
    const { error: e2 } = await supabase.from("restaurant_riders").update({ status: "on-delivery" }).eq("id", riderId).eq("tenant_id", tenantId);
    setBusy(false);
    if (e1 || e2) { toast.error("Assignment failed"); return; }
    toast.success(`${ridersById[riderId]?.name || "Rider"} assigned to ${area} (${grp.length} stop${grp.length > 1 ? "s" : ""})`);
    qc.invalidateQueries({ queryKey: ["dispatch_orders", tenantId] });
    qc.invalidateQueries({ queryKey: ["dispatch_riders", tenantId] });
  }

  async function autoAssignAll() {
    setBusy(true);
    try {
      // Fire the n8n autonomous dispatch engine (nearest available rider per area group).
      // no-cors: request executes server-side; the engine reads the DB itself, ignores body.
      await fetch(DISPATCH_WEBHOOK, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: "{}" });
      toast.info("Autonomous dispatch running — assigning nearest riders…");
    } catch {
      toast.error("Could not reach the dispatch engine");
    }
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["dispatch_orders", tenantId] });
      qc.invalidateQueries({ queryKey: ["dispatch_riders", tenantId] });
      setBusy(false);
    }, 2800);
  }

  const areaKeys = Object.keys(groups);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6 text-orange-500" /> Delivery Dispatch</h1>
          <p className="text-muted-foreground">Ready deliveries, grouped by area — assign riders &amp; route the run</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" data-testid="dispatch-mode-toggle">
            <button
              onClick={() => setMode("manual")}
              data-testid="mode-manual"
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            ><Hand className="h-3.5 w-3.5" /> Manual</button>
            <button
              onClick={() => setMode("autonomous")}
              data-testid="mode-autonomous"
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${mode === "autonomous" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            ><Zap className="h-3.5 w-3.5" /> Autonomous</button>
          </div>
          {mode === "autonomous" && (
            <Button onClick={autoAssignAll} disabled={busy || areaKeys.length === 0} data-testid="auto-assign-all" className="gap-1">
              <Zap className="h-4 w-4" /> Auto-assign nearest
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => { qc.invalidateQueries({ queryKey: ["dispatch_orders", tenantId] }); qc.invalidateQueries({ queryKey: ["dispatch_riders", tenantId] }); }} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold flex items-center justify-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />{orders.length}</p>
          <p className="text-xs text-muted-foreground">Ready deliveries</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{areaKeys.length}</p>
          <p className="text-xs text-muted-foreground">Area groups</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1"><Bike className="h-4 w-4" />{availableRiders.length}</p>
          <p className="text-xs text-muted-foreground">Riders available</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{riders.filter((r) => r.status === "on-delivery").length}</p>
          <p className="text-xs text-muted-foreground">On delivery</p>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: area groups + routes */}
        <div className="space-y-4" data-testid="dispatch-groups">
          {ordersLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading deliveries…</p>
          ) : areaKeys.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No ready deliveries right now. Orders appear here when marked <b>Ready</b>.</p>
            </CardContent></Card>
          ) : (
            areaKeys.map((area) => {
              const grp = groups[area];
              const route = routes[area];
              const assigned = assignedRiderFor(grp);
              const orderedStops = route?.ordered?.length ? route.ordered : grp;
              return (
                <Card key={area} data-testid={`dispatch-group-${area}`} className="border-l-4" style={{ borderLeftColor: colorFor(area) }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ background: colorFor(area) }} />
                        {area} · {grp.length} stop{grp.length > 1 ? "s" : ""}
                      </span>
                      {route && (
                        <span className="text-xs font-normal text-muted-foreground" data-testid={`dispatch-route-distance-${area}`}>
                          {route.distanceKm != null ? `${route.distanceKm.toFixed(1)} km` : "route"}
                          {route.durationMin != null ? ` · ~${Math.round(route.durationMin)} min` : ""}
                          {route.source === "fallback" ? " (est.)" : ""}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* ordered stop list */}
                    <ol className="space-y-1" data-testid={`dispatch-stoplist-${area}`}>
                      {orderedStops.map((o, i) => (
                        <li key={o.id} data-testid={`dispatch-stop-${area}-${i}`} className="flex items-start gap-2 text-sm">
                          <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                          <span className="min-w-0">
                            <span className="font-medium">{o.customer_name || "Customer"}</span>
                            <span className="text-muted-foreground"> · #{o.order_number}{o.total != null ? ` · ${formatPrice(Number(o.total))}` : ""}</span>
                            <span className="block text-xs text-muted-foreground truncate">{o.address}</span>
                          </span>
                        </li>
                      ))}
                    </ol>

                    {/* assignment */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t">
                      {assigned ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1" data-testid={`assigned-rider-${area}`}>
                          <Bike className="h-3 w-3" /> {assigned.name}
                        </Badge>
                      ) : mode === "manual" ? (
                        <div className="flex items-center gap-2">
                          <Select value={sel[area] || ""} onValueChange={(v) => setSel((s) => ({ ...s, [area]: v }))}>
                            <SelectTrigger className="w-44 h-8" data-testid={`rider-select-${area}`}><SelectValue placeholder="Pick a rider" /></SelectTrigger>
                            <SelectContent>
                              {availableRiders.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No riders available</div>}
                              {availableRiders.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name} · {r.current_area}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="h-8 gap-1" disabled={busy || !sel[area]} onClick={() => assignManual(area)} data-testid={`assign-btn-${area}`}>
                            <Navigation className="h-3.5 w-3.5" /> Assign
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Auto-assign will pick the nearest available rider</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right: map */}
        <Card className="overflow-hidden">
          <div data-testid="dispatch-map" style={{ height: 520, width: "100%" }}>
            <MapContainer center={[RESTAURANT_ORIGIN.lat, RESTAURANT_ORIGIN.lng]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer url={OSM_TILES} attribution={OSM_ATTRIB} />
              <FitBounds points={allPoints} />
              {/* restaurant origin */}
              <Marker position={[RESTAURANT_ORIGIN.lat, RESTAURANT_ORIGIN.lng]} icon={pin("#dc2626", "🍢")}>
                <Popup>{RESTAURANT_ORIGIN.name}<br />Dispatch origin</Popup>
              </Marker>
              {/* order markers */}
              {orders.map((o) => (
                <Marker key={o.id} position={[o.lat, o.lng]} icon={pin(colorFor(o.area), String(o.order_number))}>
                  <Popup>
                    <b>#{o.order_number} · {o.customer_name}</b><br />
                    {o.address}<br />
                    {o.area}{o.delivery_rider_id && ridersById[o.delivery_rider_id] ? ` · ${ridersById[o.delivery_rider_id].name}` : " · unassigned"}
                  </Popup>
                </Marker>
              ))}
              {/* route polylines per area */}
              {Object.entries(routes).map(([area, r]) => (
                <Polyline key={area} positions={r.positions} pathOptions={{ color: colorFor(area), weight: 4, opacity: 0.75 }} />
              ))}
            </MapContainer>
          </div>
          <CardContent className="py-2 text-[11px] text-muted-foreground flex items-center gap-2">
            <Store className="h-3 w-3" /> Origin: {RESTAURANT_ORIGIN.name} · free OpenStreetMap tiles · routing by OSRM
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
