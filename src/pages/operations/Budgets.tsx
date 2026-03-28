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
} from "lucide-react";

const SAVINGS_STATUS_BADGE: Record<string, string> = {
  identified: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  implemented: "bg-green-500/10 text-green-600 border-green-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function Budgets() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";

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
        .order("created_at", { ascending: false });
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-2xl font-bold">
                  ${overview.totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                  ${overview.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                  ${Math.abs(overview.remaining).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                  ${overview.totalPotentialSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                          ${spent.toLocaleString()} / ${budgeted.toLocaleString()}
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
                        ${(s.estimated_saving || 0).toLocaleString()}
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
