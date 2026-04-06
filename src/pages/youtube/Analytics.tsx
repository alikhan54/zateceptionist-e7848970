import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BarChart3,
  Users,
  Send,
  UserCheck,
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
  TrendingDown,
  AlertTriangle,
  DollarSign as DollarIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useYTPipelineStats,
  useYTPayments,
  useYTChannels,
  useYTEconomics,
} from "@/hooks/useYouTubeAgency";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const PIPELINE_STAGES = [
  { key: "discovered", label: "Discovered", color: "bg-slate-500" },
  { key: "qualified", label: "Qualified", color: "bg-blue-500" },
  { key: "sample_sent", label: "Sample Sent", color: "bg-indigo-500" },
  { key: "in_conversation", label: "In Conversation", color: "bg-purple-500" },
  { key: "negotiating", label: "Negotiating", color: "bg-amber-500" },
  { key: "payment_pending", label: "Payment Pending", color: "bg-orange-500" },
  { key: "active_client", label: "Active Client", color: "bg-green-500" },
];

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-slate-500/10 text-slate-600 border-slate-500/30",
  qualified: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  sample_sent: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  in_conversation: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  negotiating: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  payment_pending: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  active_client: "bg-green-500/10 text-green-600 border-green-500/30",
  upsell: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  lost: "bg-red-500/10 text-red-600 border-red-500/30",
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);

const formatSubscribers = (count: number): string =>
  Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count);

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useYTPipelineStats();
  const { data: payments, isLoading: paymentsLoading } = useYTPayments();
  const { data: channels, isLoading: channelsLoading } = useYTChannels();
  const { data: economics } = useYTEconomics();

  const isLoading = statsLoading || paymentsLoading || channelsLoading;

  // === ECONOMICS AGGREGATES ===
  const economicsData = economics || [];
  const totalEcoRevenue = economicsData.reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalEcoCost = economicsData.reduce((sum, e) => sum + (e.total_cost || 0), 0);
  const totalEcoProfit = totalEcoRevenue - totalEcoCost;
  const avgMargin =
    economicsData.length > 0
      ? economicsData.reduce((sum, e) => sum + (e.profit_margin_pct || 0), 0) /
        economicsData.length
      : 0;
  const avgLTV =
    economicsData.length > 0
      ? economicsData.reduce((sum, e) => sum + (e.ltv || 0), 0) / economicsData.length
      : 0;
  const negativeMarginClients = economicsData.filter((e) => (e.profit_margin_pct || 0) < 0);

  // Chart data
  const ecoChartData = economicsData.slice(0, 10).map((e) => ({
    name:
      (e.channel_name || "Unknown").length > 15
        ? (e.channel_name || "Unknown").substring(0, 15) + "..."
        : e.channel_name || "Unknown",
    Revenue: Math.round(e.revenue || 0),
    Cost: Math.round(e.total_cost || 0),
  }));

  const costBreakdownData = [
    {
      name: "API Calls",
      value: economicsData.reduce((s, e) => s + (e.cost_api_calls || 0), 0),
    },
    {
      name: "Generation",
      value: economicsData.reduce((s, e) => s + (e.cost_generation || 0), 0),
    },
    {
      name: "Outreach",
      value: economicsData.reduce((s, e) => s + (e.cost_outreach || 0), 0),
    },
    {
      name: "Specialist Hours",
      value: economicsData.reduce(
        (s, e) => s + (e.cost_specialist_hours || 0) * (e.cost_specialist_rate || 0),
        0,
      ),
    },
  ].filter((d) => d.value > 0);

  const COST_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

  // Revenue calculations
  const confirmedPayments =
    payments?.filter((p) => p.status === "confirmed") || [];
  const totalRevenue = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);
  const confirmedCount = confirmedPayments.length;
  const avgDeal = confirmedCount > 0 ? totalRevenue / confirmedCount : 0;
  const conversionRate =
    stats && stats.total > 0
      ? ((stats.active_client / stats.total) * 100).toFixed(1)
      : "0";

  // Payment method breakdown
  const methodBreakdown: Record<string, number> = {};
  (payments || []).forEach((p) => {
    const method = p.payment_method.replace(/_/g, " ");
    methodBreakdown[method] = (methodBreakdown[method] || 0) + p.amount;
  });
  const totalPaymentAmount =
    payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  // Recent 10 channels
  const recentChannels = (channels || []).slice(0, 10);

  // Funnel max for bar scaling
  const funnelMax = stats
    ? Math.max(
        stats.discovered,
        stats.qualified,
        stats.sample_sent,
        stats.in_conversation,
        stats.negotiating,
        stats.payment_pending,
        stats.active_client,
        1
      )
    : 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            YouTube Agency performance overview
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          YouTube Agency performance overview
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="economics">Unit Economics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Discovered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-indigo-600">
              {stats?.sample_sent || 0}
            </p>
            <p className="text-xs text-muted-foreground">Samples Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-green-600">
              {stats?.active_client || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-purple-600">
              {conversionRate}%
            </p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(avgDeal)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Deal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats &&
              PIPELINE_STAGES.map((stage) => {
                const count =
                  stats[stage.key as keyof typeof stats] as number;
                const pct = funnelMax > 0 ? (count / funnelMax) * 100 : 0;
                return (
                  <div key={stage.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {stage.label}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-6 bg-muted rounded overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded flex items-center justify-end pr-2 text-white text-xs font-medium transition-all`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      >
                        {pct > 15 ? count : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(methodBreakdown).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No payments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(methodBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => {
                    const pct =
                      totalPaymentAmount > 0
                        ? ((amount / totalPaymentAmount) * 100).toFixed(1)
                        : "0";
                    return (
                      <div
                        key={method}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{method}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            {formatCurrency(amount)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {pct}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChannels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No channels discovered yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {ch.channel_name || ch.handle || "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatSubscribers(ch.subscriber_count)} subs
                        </span>
                        {ch.niche && (
                          <Badge variant="secondary" className="text-xs">
                            {ch.niche}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        STATUS_COLORS[ch.status.replace(/ /g, "_")] ||
                        STATUS_COLORS.discovered
                      }
                    >
                      {ch.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ch.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="economics" className="space-y-6">
          {economicsData.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <DollarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No economics data yet</p>
                <p className="text-sm mt-2">
                  Unit economics tracking will appear once client revenue and costs
                  are recorded.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Negative Margin Alert */}
              {negativeMarginClients.length > 0 && (
                <Card className="border-red-500/40 bg-red-500/5">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-600">
                        {negativeMarginClients.length} client
                        {negativeMarginClients.length > 1 ? "s" : ""} operating at
                        negative margin
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Review costs or adjust pricing:{" "}
                        {negativeMarginClients
                          .slice(0, 3)
                          .map((c) => c.channel_name || "Unknown")
                          .join(", ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Economics KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalEcoRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalEcoCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p
                      className={`text-2xl font-bold ${
                        totalEcoProfit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(totalEcoProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground">Gross Profit</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p
                      className={`text-2xl font-bold ${
                        avgMargin >= 20
                          ? "text-green-600"
                          : avgMargin >= 0
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {avgMargin.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Margin</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <UserCheck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(avgLTV)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg LTV</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Revenue vs Cost (Top 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ecoChartData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No data to display</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={ecoChartData}>
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                          <Bar dataKey="Revenue" fill="#10b981" />
                          <Bar dataKey="Cost" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {costBreakdownData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No cost data to display</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={costBreakdownData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={(entry) =>
                              `${entry.name}: ${formatCurrency(entry.value || 0)}`
                            }
                            labelLine={false}
                          >
                            {costBreakdownData.map((_, idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={COST_COLORS[idx % COST_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Profitability Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client Profitability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 px-2 font-medium">
                            Client
                          </th>
                          <th className="text-right py-2 px-2 font-medium">
                            Revenue
                          </th>
                          <th className="text-right py-2 px-2 font-medium">
                            Cost
                          </th>
                          <th className="text-right py-2 px-2 font-medium">
                            Profit
                          </th>
                          <th className="text-right py-2 px-2 font-medium">
                            Margin %
                          </th>
                          <th className="text-right py-2 px-2 font-medium">LTV</th>
                          <th className="text-right py-2 px-2 font-medium">
                            Months
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {economicsData.map((eco) => {
                          const margin = eco.profit_margin_pct || 0;
                          const profit = eco.gross_profit || 0;
                          const marginColor =
                            margin >= 20
                              ? "text-green-600"
                              : margin < 0
                                ? "text-red-600"
                                : "text-amber-600";
                          return (
                            <tr
                              key={eco.id}
                              className="border-b last:border-0 hover:bg-muted/30"
                            >
                              <td className="py-2 px-2 font-medium">
                                {eco.channel_name || "Unknown"}
                              </td>
                              <td className="text-right py-2 px-2">
                                {formatCurrency(eco.revenue || 0)}
                              </td>
                              <td className="text-right py-2 px-2">
                                {formatCurrency(eco.total_cost || 0)}
                              </td>
                              <td
                                className={`text-right py-2 px-2 font-semibold ${
                                  profit >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {formatCurrency(profit)}
                              </td>
                              <td
                                className={`text-right py-2 px-2 font-semibold ${marginColor}`}
                              >
                                {margin.toFixed(1)}%
                              </td>
                              <td className="text-right py-2 px-2">
                                {formatCurrency(eco.ltv || 0)}
                              </td>
                              <td className="text-right py-2 px-2 text-muted-foreground">
                                {eco.months_as_client || 0}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
