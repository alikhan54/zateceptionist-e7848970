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
} from "lucide-react";
import {
  useYTPipelineStats,
  useYTPayments,
  useYTChannels,
} from "@/hooks/useYouTubeAgency";

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

  const isLoading = statsLoading || paymentsLoading || channelsLoading;

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
    </div>
  );
}
