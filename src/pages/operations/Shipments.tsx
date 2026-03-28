import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  Search,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  in_transit: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  returned: "bg-red-500/10 text-red-600 border-red-500/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  in_transit: <Truck className="h-3 w-3" />,
  delivered: <CheckCircle2 className="h-3 w-3" />,
  returned: <RotateCcw className="h-3 w-3" />,
};

function DelayBadge({ probability }: { probability: number | null }) {
  if (probability == null) return <span className="text-muted-foreground">--</span>;
  const pct = Math.round(probability * 100);
  if (pct >= 60)
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {pct}% delay risk
      </Badge>
    );
  if (pct >= 30)
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
        {pct}% delay risk
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
      {pct}% on track
    </Badge>
  );
}

export default function Shipments() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["ops_shipments", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_shipments")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const filtered = useMemo(() => {
    let list = shipments;
    if (activeTab !== "all") {
      list = list.filter((s: any) => s.status === activeTab);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (s: any) =>
          (s.tracking_number || "").toLowerCase().includes(term) ||
          (s.carrier || "").toLowerCase().includes(term) ||
          (s.po_number || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [shipments, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter((s: any) => s.status === "in_transit").length;
    const delivered = shipments.filter((s: any) => s.status === "delivered").length;
    return { total, inTransit, delivered };
  }, [shipments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-blue-500" />
          Shipments
        </h1>
        <p className="text-muted-foreground mt-1">
          COURIER agent tracks logistics and delivery timelines
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inTransit}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tracking#, carrier, PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading shipments...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No shipments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 font-medium text-muted-foreground">PO #</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Tracking</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Carrier</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Origin</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Destination</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Est. Delivery</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Delay Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s: any) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 font-mono">{s.po_number || "--"}</td>
                      <td className="py-3 font-mono text-xs">{s.tracking_number || "--"}</td>
                      <td className="py-3">{s.carrier || "--"}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${STATUS_BADGE[s.status] || ""}`}
                        >
                          {STATUS_ICON[s.status]}
                          {(s.status || "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.origin || "--"}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.destination || "--"}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {s.estimated_delivery
                          ? format(new Date(s.estimated_delivery), "MMM d, yyyy")
                          : "--"}
                      </td>
                      <td className="py-3">
                        <DelayBadge probability={s.delay_probability} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
