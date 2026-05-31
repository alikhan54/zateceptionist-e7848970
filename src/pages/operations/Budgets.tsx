import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingDown,
  PiggyBank,
  Wallet,
  Target,
  CheckCircle2,
  Clock,
  XCircle,
  Lightbulb,
  ArrowDownRight,
  BarChart3,
  Flame,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Bot,
  Sparkles,
} from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";
import { useCurrencyFormatter } from "@/lib/formatCurrency";

const SAVINGS_STATUS_BADGE: Record<string, string> = {
  identified: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  implemented: "bg-green-500/10 text-green-600 border-green-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function Budgets() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id ?? "";
  const formatCurrency = useCurrencyFormatter();

  // Budgets
  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ["ops_budgets", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_budgets")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("category", { ascending: true });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Cost savings
  const { data: savings = [], isLoading: loadingSavings } = useQuery({
    queryKey: ["ops_cost_savings", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_cost_savings")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("identified_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Tier 2 — revenue forecast (surfacing; graceful when a tenant has none)
  const { data: revForecasts = [] } = useQuery({
    queryKey: ["revenue_forecasts_budgets", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_forecasts")
        .select("period_type,period_start,period_end,forecast_revenue,confidence")
        .eq("tenant_id", tenantSlug)
        .order("period_start", { ascending: true });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Tier 2 — recent TREASURER/OPTIMIZER tasks for real agent-outcome narratives
  const { data: finTasks = [] } = useQuery({
    queryKey: ["ops_agent_tasks_fin", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_agent_tasks")
        .select("agent_name,status,result,created_at")
        .eq("tenant_id", tenantSlug)
        .in("agent_name", ["TREASURER", "OPTIMIZER"])
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const overview = useMemo(() => {
    const totalBudgeted = budgets.reduce(
      (sum: number, b: any) => sum + (b.budgeted_amount || 0),
      0
    );
    const totalSpent = budgets.reduce(
      (sum: number, b: any) => sum + (b.spent_amount || 0),
      0
    );
    const remaining = totalBudgeted - totalSpent;
    const utilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
    const totalPotentialSavings = savings
      .filter((s: any) => s.status !== "rejected")
      .reduce((sum: number, s: any) => sum + (s.estimated_saving || 0), 0);
    return { totalBudgeted, totalSpent, remaining, utilization, totalPotentialSavings };
  }, [budgets, savings]);

  // Current-month burn/projection (TREASURER-style), computed from real current-month rows only.
  const finance = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(y, m, 0).getDate();
    const cur = budgets.filter((b: any) => Number(b.period_year) === y && Number(b.period_month) === m);
    const curBudgeted = cur.reduce((s: number, b: any) => s + (b.budgeted_amount || 0), 0);
    const curSpent = cur.reduce((s: number, b: any) => s + (b.spent_amount || 0), 0);
    const hasCurrent = cur.length > 0 && dayOfMonth > 0;
    const dailyBurn = hasCurrent ? curSpent / dayOfMonth : null;
    const projectedMonthEnd = dailyBurn !== null ? dailyBurn * daysInMonth : null;
    const variance = projectedMonthEnd !== null ? curBudgeted - projectedMonthEnd : null; // +under / -over
    const variancePct = (variance !== null && curBudgeted > 0) ? Math.round((variance / curBudgeted) * 1000) / 10 : null;

    // Savings captured vs identified
    const captured = savings
      .filter((s: any) => ["approved", "implemented"].includes(s.status))
      .reduce((sum: number, s: any) => sum + (s.estimated_saving || 0), 0);
    const identifiedTotal = savings
      .filter((s: any) => s.status !== "rejected")
      .reduce((sum: number, s: any) => sum + (s.estimated_saving || 0), 0);

    // Projected revenue — latest monthly forecast if present
    const monthly = revForecasts.filter((r: any) => r.period_type === "monthly");
    const projectedRevenue = monthly.length ? monthly[monthly.length - 1].forecast_revenue : null;

    return { curBudgeted, curSpent, hasCurrent, dailyBurn, projectedMonthEnd, variance, variancePct, captured, identifiedTotal, projectedRevenue };
  }, [budgets, savings, revForecasts]);

  const treasurerNarrative = useMemo(() => {
    const t = finTasks.find((x: any) => x.agent_name === "TREASURER" && x.result && x.result.narrative);
    return t?.result?.narrative || null;
  }, [finTasks]);

  if (!tenantConfig) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8 text-emerald-500" />
          Budgets & Cost Optimization
        </h1>
        <p className="text-muted-foreground mt-1">
          TREASURER and OPTIMIZER agents manage finances and find savings
        </p>
      </div>

      {/* Headline insight — honest verdict from real numbers */}
      {(() => {
        const over = finance.variance !== null && finance.variance < 0;
        const tight = overview.utilization > 90;
        const attention = over || tight;
        return (
          <Card className={attention ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {attention ? (
                  <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-lg leading-snug">
                    {budgets.length === 0
                      ? "Finance module ready — no budgets configured yet"
                      : finance.variance !== null
                        ? over
                          ? `Finance needs attention — projected ${finance.variancePct !== null ? `${Math.abs(finance.variancePct)}% ` : ""}over budget this month`
                          : `Finance on track — projected ${finance.variancePct !== null ? `${finance.variancePct}% ` : ""}under budget this month`
                        : `Finance — ${overview.utilization}% of budget used`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {budgets.length > 0 && <>{overview.utilization}% of budget used. </>}
                    {finance.dailyBurn !== null && <>{formatCurrency(finance.dailyBurn)}/day burn. </>}
                    {finance.captured > 0 || finance.identifiedTotal > 0
                      ? <>{formatCurrency(finance.captured)} of {formatCurrency(finance.identifiedTotal)} savings captured.</>
                      : null}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(overview.totalBudgeted)}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-amber-500">
                  {formatCurrency(overview.totalSpent)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-2xl font-bold ${overview.remaining >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(Math.abs(overview.remaining))}
                  {overview.remaining < 0 && " over"}
                </p>
              </div>
              <PiggyBank className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(overview.totalPotentialSavings)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Budget Utilization</span>
            <span
              className={`text-sm font-bold ${
                overview.utilization > 90
                  ? "text-red-500"
                  : overview.utilization > 75
                  ? "text-amber-500"
                  : "text-green-500"
              }`}
            >
              {overview.utilization}%
            </span>
          </div>
          <Progress value={Math.min(overview.utilization, 100)} className="h-3" />
        </CardContent>
      </Card>

      {/* Finance success metrics — TREASURER projection + OPTIMIZER capture (real data; — when absent) */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Finance Performance (this month)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Daily Burn</p>
                  <p className="text-2xl font-bold">
                    {finance.dailyBurn === null ? "—" : formatCurrency(finance.dailyBurn)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">spend pace</p>
                </div>
                <Flame className="h-8 w-8 text-orange-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Month-End</p>
                  <p className="text-2xl font-bold">
                    {finance.projectedMonthEnd === null ? "—" : formatCurrency(finance.projectedMonthEnd)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">at current pace</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Budget Variance</p>
                  <p className={`text-2xl font-bold ${finance.variance === null ? "" : finance.variance >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {finance.variance === null ? "—" : `${finance.variance >= 0 ? "" : "-"}${formatCurrency(Math.abs(finance.variance))}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {finance.variancePct === null ? "vs budget" : finance.variance >= 0 ? `${finance.variancePct}% under` : `${Math.abs(finance.variancePct)}% over`}
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground opacity-60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Savings Captured</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {finance.identifiedTotal > 0 ? formatCurrency(finance.captured) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {finance.identifiedTotal > 0 ? `of ${formatCurrency(finance.identifiedTotal)} identified` : "OPTIMIZER"}
                  </p>
                </div>
                <PiggyBank className="h-8 w-8 text-emerald-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>
        {finance.projectedRevenue !== null && (
          <p className="text-xs text-muted-foreground mt-2">
            Projected revenue (forecast): <span className="font-medium text-foreground">{formatCurrency(finance.projectedRevenue)}</span> this month
          </p>
        )}
      </div>

      {/* Agent Outcomes — TREASURER + OPTIMIZER, REAL data, graceful when empty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            What Your Finance Agents Did
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 border-b border-border/50 pb-3">
              <Wallet className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold tracking-wide">TREASURER</span>
                <p className="text-sm mt-0.5">
                  {treasurerNarrative
                    ? treasurerNarrative
                    : finance.projectedMonthEnd !== null
                      ? `Projected month-end ${formatCurrency(finance.projectedMonthEnd)} vs ${formatCurrency(finance.curBudgeted)} budget — ${finance.variance !== null && finance.variance >= 0 ? "on track" : "over budget"}.`
                      : budgets.length === 0 ? "No budgets to monitor yet" : "Monitoring spend."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold tracking-wide">OPTIMIZER</span>
                <p className="text-sm mt-0.5">
                  {savings.length === 0
                    ? "No savings identified yet"
                    : `Identified ${formatCurrency(finance.identifiedTotal)} across ${savings.length} opportunit${savings.length > 1 ? "ies" : "y"}${finance.captured > 0 ? `; ${formatCurrency(finance.captured)} captured so far` : ""}.`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Budget by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBudgets ? (
              <p className="text-center text-muted-foreground py-8">Loading budgets...</p>
            ) : budgets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No budgets configured</p>
            ) : (
              <div className="space-y-4">
                {budgets.map((b: any) => {
                  const budgeted = b.budgeted_amount || 0;
                  const spent = b.spent_amount || 0;
                  const pct = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
                  return (
                    <div key={b.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {(b.category || "Uncategorized").replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(spent)} / {formatCurrency(budgeted)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min(pct, 100)}
                          className="h-2 flex-1"
                        />
                        <span
                          className={`text-xs font-medium w-10 text-right ${
                            pct > 90
                              ? "text-red-500"
                              : pct > 75
                              ? "text-amber-500"
                              : "text-green-500"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Savings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Cost Savings Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSavings ? (
              <p className="text-center text-muted-foreground py-8">Loading savings...</p>
            ) : savings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No savings opportunities identified yet
              </p>
            ) : (
              <div className="space-y-3">
                {savings.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.opportunity || s.description || "--"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.category ? s.category.replace(/_/g, " ") : "General"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3" />
                        {formatCurrency(s.estimated_saving || 0)}
                      </span>
                      <Badge
                        variant="outline"
                        className={SAVINGS_STATUS_BADGE[s.status] || ""}
                      >
                        {s.status === "implemented" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {s.status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
                        {s.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                        {(s.status || "").replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
