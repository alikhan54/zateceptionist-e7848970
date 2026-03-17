import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3, MapPin } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

interface MarketRecord {
  id: string;
  community: string;
  property_type: string;
  data: {
    avg_price_sqft: number;
    avg_rent_sqft: number;
    gross_yield: number;
    transaction_volume_30d: number;
    supply_pipeline: number;
    demand_score: number;
    price_trend_pct: number;
  };
  source: string;
  period: string;
}

const formatAED = (n: number) => `AED ${n.toLocaleString()}`;

function YieldBadge({ yield_pct }: { yield_pct: number }) {
  if (yield_pct >= 7) return <Badge className="bg-green-100 text-green-800">{yield_pct.toFixed(1)}%</Badge>;
  if (yield_pct >= 5) return <Badge className="bg-amber-100 text-amber-800">{yield_pct.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-100 text-red-800">{yield_pct.toFixed(1)}%</Badge>;
}

function TrendIndicator({ pct }: { pct: number }) {
  if (pct > 0) return <span className="flex items-center text-green-600 text-sm font-medium"><TrendingUp className="h-3 w-3 mr-1" />+{pct.toFixed(1)}%</span>;
  if (pct < 0) return <span className="flex items-center text-red-600 text-sm font-medium"><TrendingDown className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</span>;
  return <span className="flex items-center text-gray-500 text-sm"><Minus className="h-3 w-3 mr-1" />0%</span>;
}

function DemandBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-green-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score}</span>
    </div>
  );
}

type SortKey = "community" | "avg_price_sqft" | "gross_yield" | "demand_score" | "price_trend_pct";

export default function MarketIntelligence() {
  const { tenantId } = useTenant();
  const [sortBy, setSortBy] = useState<SortKey>("gross_yield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["re_market_data", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("re_market_data" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("data_type", "community_stats");
      if (error) throw error;
      return (data || []) as unknown as MarketRecord[];
    },
    enabled: !!tenantId,
  });

  const filtered = typeFilter === "all" ? records : records.filter((r) => r.property_type === typeFilter);

  const sorted = [...filtered].sort((a, b) => {
    const av = sortBy === "community" ? a.community : (a.data as any)[sortBy];
    const bv = sortBy === "community" ? b.community : (b.data as any)[sortBy];
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const avgYield = filtered.length > 0 ? filtered.reduce((s, r) => s + r.data.gross_yield, 0) / filtered.length : 0;
  const totalTransactions = filtered.reduce((s, r) => s + r.data.transaction_volume_30d, 0);
  const topDemand = filtered.reduce((best, r) => r.data.demand_score > (best?.data.demand_score ?? 0) ? r : best, filtered[0]);

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" /> Market Intelligence
        </h1>
        <p className="text-muted-foreground">Dubai community-level market data and yield analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Communities Tracked</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Gross Yield</p>
            <p className="text-2xl font-bold text-green-600">{avgYield.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">30d Transactions</p>
            <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Highest Demand</p>
            <p className="text-2xl font-bold flex items-center gap-1"><MapPin className="h-4 w-4" />{topDemand?.community || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="apartment">Apartments</SelectItem>
            <SelectItem value="villa">Villas</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">Click column headers to sort</p>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading market data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 cursor-pointer hover:bg-muted" onClick={() => toggleSort("community")}>
                      Community {sortBy === "community" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3 cursor-pointer hover:bg-muted" onClick={() => toggleSort("avg_price_sqft")}>
                      Avg Price/sqft {sortBy === "avg_price_sqft" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-right p-3 cursor-pointer hover:bg-muted" onClick={() => toggleSort("gross_yield")}>
                      Gross Yield {sortBy === "gross_yield" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-center p-3 cursor-pointer hover:bg-muted" onClick={() => toggleSort("demand_score")}>
                      Demand {sortBy === "demand_score" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-center p-3 cursor-pointer hover:bg-muted" onClick={() => toggleSort("price_trend_pct")}>
                      Trend {sortBy === "price_trend_pct" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-right p-3">Transactions</th>
                    <th className="text-right p-3">Supply</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{r.community}</td>
                      <td className="p-3"><Badge variant="outline" className="capitalize">{r.property_type}</Badge></td>
                      <td className="p-3 text-right">{formatAED(r.data.avg_price_sqft)}</td>
                      <td className="p-3 text-right"><YieldBadge yield_pct={r.data.gross_yield} /></td>
                      <td className="p-3"><DemandBar score={r.data.demand_score} /></td>
                      <td className="p-3 text-center"><TrendIndicator pct={r.data.price_trend_pct} /></td>
                      <td className="p-3 text-right">{r.data.transaction_volume_30d}</td>
                      <td className="p-3 text-right">{r.data.supply_pipeline.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RTLWrapper>
  );
}
