import React, { useState, useMemo } from "react";
import { useLtvCac, LtvCacCustomer } from "@/hooks/useLtvCac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  RefreshCw,
  Search,
  ArrowUpDown,
  Brain,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

const GRADE_BG: Record<string, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  F: "bg-red-500/20 text-red-400 border-red-500/30",
};

const SOURCE_COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f59e0b",
];

function formatCurrency(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function formatRatio(val: number): string {
  if (val >= 10000) return `${(val / 1000).toFixed(0)}K:1`;
  if (val >= 100) return `${val.toFixed(0)}:1`;
  return `${val.toFixed(1)}:1`;
}

export default function LtvCac() {
  const { customerData, snapshots, summary, latestSnapshot, isLoading, refetch } = useLtvCac();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof LtvCacCustomer>("total_revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customerData;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.customer_name?.toLowerCase().includes(q) ||
          c.source?.toLowerCase().includes(q) ||
          c.health_grade?.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      return sortDir === "desc"
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
  }, [customerData, searchQuery, sortField, sortDir]);

  // Source breakdown chart data
  const sourceChartData = useMemo(() => {
    if (!summary?.sourceBreakdown) return [];
    return Object.entries(summary.sourceBreakdown)
      .map(([source, data]) => ({
        source: source.replace(/_/g, " ").replace(/b2c /i, "B2C "),
        avgCac: Number(data.totalCac / data.count || 0),
        avgLtv: Number(data.totalLtv / data.count || 0),
        count: data.count,
        ratio: data.avgRatio,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [summary]);

  // Grade distribution for pie chart
  const gradeChartData = useMemo(() => {
    if (!summary?.gradeDistribution) return [];
    return Object.entries(summary.gradeDistribution)
      .filter(([, count]) => count > 0)
      .map(([grade, count]) => ({
        name: `Grade ${grade}`,
        value: count,
        fill: GRADE_COLORS[grade] || "#666",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [summary]);

  // Trend chart data from snapshots
  const trendData = useMemo(() => {
    return snapshots.map((s) => ({
      date: new Date(s.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ratio: s.avg_ltv_cac_ratio,
      avgLtv: s.avg_ltv,
      avgCac: s.avg_cac,
      customers: s.total_customers,
    }));
  }, [snapshots]);

  const handleSort = (field: keyof LtvCacCustomer) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-blue-400" />
            LTV:CAC Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Customer acquisition cost vs lifetime value analysis
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg LTV:CAC Ratio</p>
                <p className="text-2xl font-bold text-white">
                  {summary ? formatRatio(summary.avgRatio) : "—"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {summary && summary.avgRatio >= 3 ? "Healthy" : summary && summary.avgRatio >= 1 ? "Marginal" : "Needs improvement"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg CAC</p>
                <p className="text-2xl font-bold text-white">
                  {summary ? formatCurrency(summary.avgCac) : "—"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Cost to acquire one customer</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg LTV</p>
                <p className="text-2xl font-bold text-white">
                  {summary ? formatCurrency(summary.avgLtv) : "—"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {summary?.customersWithRevenue || 0} customers with revenue
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">ROI</p>
                <p className="text-2xl font-bold text-white">
                  {summary ? `${summary.roi.toFixed(0)}%` : "—"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {summary?.totalCustomers || 0} total customers tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channel CAC</TabsTrigger>
          <TabsTrigger value="customers">Customer Table</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trend Chart */}
            <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white text-sm">LTV:CAC Ratio Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <ReferenceLine y={3} stroke="#eab308" strokeDasharray="5 5" label={{ value: "3:1 Healthy", fill: "#eab308", fontSize: 11 }} />
                      <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "1:1 Break-even", fill: "#ef4444", fontSize: 11 }} />
                      <Line type="monotone" dataKey="ratio" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} name="LTV:CAC Ratio" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <p>Trend data will appear after multiple daily snapshots</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Health Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={gradeChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {gradeChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">No data</div>
                )}
                {/* Grade legend */}
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {["A", "B", "C", "D", "F"].map((g) => (
                    <Badge key={g} variant="outline" className={GRADE_BG[g]}>
                      {g}: {summary?.gradeDistribution?.[g] || 0}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channel CAC Tab */}
        <TabsContent value="channels" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">CAC by Acquisition Source</CardTitle>
            </CardHeader>
            <CardContent>
              {sourceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={sourceChartData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <YAxis type="category" dataKey="source" stroke="#9CA3AF" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      formatter={(value: number, name: string) => [
                        `$${value.toFixed(4)}`,
                        name === "avgCac" ? "Avg CAC" : "Avg LTV",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="avgCac" name="Avg CAC" radius={[0, 4, 4, 0]}>
                      {sourceChartData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">No source data</div>
              )}
            </CardContent>
          </Card>

          {/* Source stats table */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Source Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left py-2 px-3">Source</th>
                      <th className="text-right py-2 px-3">Customers</th>
                      <th className="text-right py-2 px-3">Avg CAC</th>
                      <th className="text-right py-2 px-3">Avg LTV</th>
                      <th className="text-right py-2 px-3">Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceChartData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-white">{row.source}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{row.count}</td>
                        <td className="py-2 px-3 text-right text-red-400">{formatCurrency(row.avgCac)}</td>
                        <td className="py-2 px-3 text-right text-green-400">{formatCurrency(row.avgLtv)}</td>
                        <td className="py-2 px-3 text-right text-blue-400">{formatRatio(row.ratio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Table Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-sm">Customer LTV:CAC</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left py-2 px-3">Customer</th>
                      <th className="text-left py-2 px-3">Source</th>
                      <th
                        className="text-right py-2 px-3 cursor-pointer hover:text-white"
                        onClick={() => handleSort("total_revenue")}
                      >
                        Revenue <ArrowUpDown className="inline h-3 w-3" />
                      </th>
                      <th
                        className="text-right py-2 px-3 cursor-pointer hover:text-white"
                        onClick={() => handleSort("total_cac")}
                      >
                        CAC <ArrowUpDown className="inline h-3 w-3" />
                      </th>
                      <th
                        className="text-right py-2 px-3 cursor-pointer hover:text-white"
                        onClick={() => handleSort("ltv_cac_ratio")}
                      >
                        Ratio <ArrowUpDown className="inline h-3 w-3" />
                      </th>
                      <th className="text-center py-2 px-3">Grade</th>
                      <th className="text-right py-2 px-3">Touches</th>
                      <th className="text-left py-2 px-3">Insight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-white font-medium">{c.customer_name}</td>
                        <td className="py-2 px-3 text-gray-400 text-xs">
                          {(c.source || "").replace(/_/g, " ")}
                        </td>
                        <td className="py-2 px-3 text-right text-green-400">
                          {formatCurrency(c.total_revenue)}
                        </td>
                        <td className="py-2 px-3 text-right text-red-400">
                          {formatCurrency(c.total_cac)}
                        </td>
                        <td className="py-2 px-3 text-right text-blue-400 font-medium">
                          {formatRatio(c.ltv_cac_ratio)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="outline" className={GRADE_BG[c.health_grade] || GRADE_BG.F}>
                            {c.health_grade}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">{c.total_touches}</td>
                        <td className="py-2 px-3 text-xs text-gray-500 max-w-48 truncate">
                          {c.insights?.[0]?.text || "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          {searchQuery ? "No matching customers" : "No LTV:CAC data yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Insights */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" /> Top Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestSnapshot?.top_insights && latestSnapshot.top_insights.length > 0 ? (
                  latestSnapshot.top_insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                    >
                      {insight.type === "positive" ? (
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                      ) : insight.type === "warning" ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                      ) : (
                        <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-gray-200">{insight.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Affects {insight.count} customer{insight.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Insights will appear after the daily pipeline runs</p>
                )}
              </CardContent>
            </Card>

            {/* Strategy Recommendations */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-400" /> Strategy Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary && (
                  <>
                    {/* Best channel */}
                    {sourceChartData.length > 0 && (() => {
                      const best = [...sourceChartData].sort((a, b) => b.ratio - a.ratio)[0];
                      return best && best.ratio > 0 ? (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <p className="text-sm text-green-300">
                            <strong>Best channel:</strong> {best.source} with {formatRatio(best.ratio)} ratio.
                            Consider increasing budget here.
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {/* Worst channel */}
                    {sourceChartData.length > 1 && (() => {
                      const worst = [...sourceChartData].filter(s => s.ratio > 0).sort((a, b) => a.ratio - b.ratio)[0];
                      return worst && worst.ratio < 3 ? (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-sm text-red-300">
                            <strong>Lowest ROI:</strong> {worst.source} at {formatRatio(worst.ratio)}.
                            Review targeting or reduce spend.
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {/* F-grade warning */}
                    {(summary.gradeDistribution?.F || 0) > 0 && (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <p className="text-sm text-orange-300">
                          <strong>{summary.gradeDistribution.F} customers</strong> have F-grade (ratio &lt; 0.5:1).
                          These cost more to acquire than they generate.
                        </p>
                      </div>
                    )}

                    {/* Upsell opportunity */}
                    {(summary.gradeDistribution?.A || 0) > 0 && (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-blue-300">
                          <strong>{summary.gradeDistribution.A} A-grade customers</strong> are highly
                          profitable. Target them for upsells and referral programs.
                        </p>
                      </div>
                    )}

                    {/* General health */}
                    <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                      <p className="text-sm text-gray-300">
                        Overall health: <strong>{summary.customersWithRevenue}</strong> of{" "}
                        <strong>{summary.totalCustomers}</strong> customers generate revenue
                        ({summary.totalCustomers > 0
                          ? ((summary.customersWithRevenue / summary.totalCustomers) * 100).toFixed(0)
                          : 0}
                        % conversion rate).
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
