import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PoundSterling,
  Clock,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
  Crown,
  ArrowDownUp,
  PlusCircle,
  Link2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  useFinanceKpis,
  type FinanceRange,
} from "@/hooks/useFinanceKpis";
import { useRevenueTrend } from "@/hooks/useRevenueTrend";
import { useTopClientsByRevenue } from "@/hooks/useTopClientsByRevenue";
import {
  useRecentTransactions,
  type FinanceTxn,
} from "@/hooks/useRecentTransactions";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const RANGE_OPTIONS: { value: FinanceRange; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

const STATUS_DONUT_COLORS: Record<string, string> = {
  draft: "hsl(220 14% 60%)",
  sent: "hsl(210 80% 55%)",
  partial: "hsl(40 90% 55%)",
  paid: "hsl(140 60% 45%)",
  overdue: "hsl(0 70% 55%)",
  cancelled: "hsl(280 10% 50%)",
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  draft: "secondary",
  sent: "default",
  paid: "secondary",
  partial: "outline",
  overdue: "destructive",
  cancelled: "outline",
};

function formatGBP(value: number, opts?: { compact?: boolean }): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: opts?.compact ? 1 : 0,
  }).format(value);
}

function formatDateUK(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  variant = "default",
  testId,
  loading,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive" | "muted";
  testId?: string;
  loading?: boolean;
}) {
  const valueClasses =
    variant === "destructive" ? "text-destructive" : variant === "muted" ? "text-muted-foreground" : "";
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-28" />
            ) : (
              <div className={`mt-1 text-2xl font-bold ${valueClasses}`}>{value}</div>
            )}
            {caption && !loading && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{caption}</p>
            )}
          </div>
          <Icon
            className={`h-5 w-5 shrink-0 ${
              variant === "destructive" ? "text-destructive" : "text-muted-foreground"
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DisabledActionButton({
  label,
  icon: Icon,
  tooltip,
  testId,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  testId?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button
              variant="outline"
              disabled
              data-testid={testId}
              className="pointer-events-none"
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AccountingFinance() {
  const [range, setRange] = useState<FinanceRange>("month");
  const { kpis, isLoading: kpisLoading, error: kpisError, hasNoData } = useFinanceKpis(range);
  const { data: trend = [], isLoading: trendLoading } = useRevenueTrend(6);
  const { data: topClients = [], isLoading: topClientsLoading } = useTopClientsByRevenue(range, 5);
  const { data: recent = [], isLoading: recentLoading } = useRecentTransactions(20);

  const donutData = kpis
    ? (["draft", "sent", "partial", "paid", "overdue", "cancelled"] as const)
        .map((key) => ({ name: key, value: kpis.invoiceCounts[key] }))
        .filter((d) => d.value > 0)
    : [];

  const showEmptyState = !kpisLoading && hasNoData;

  return (
    <div className="space-y-6 p-6" data-testid="accounting-finance-page">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">
            Cash position, outstanding receivables, and recent activity for your practice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as FinanceRange)}>
            <SelectTrigger className="w-40" data-testid="finance-range-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DisabledActionButton
            label="Add Payment"
            icon={PlusCircle}
            tooltip="Available after TrueLayer connected (Phase 2)"
            testId="finance-add-payment"
          />
          <DisabledActionButton
            label="Reconcile"
            icon={Link2}
            tooltip="Available after TrueLayer connected (Phase 2)"
            testId="finance-reconcile"
          />
        </div>
      </div>

      {kpisError && (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">
            Couldn&apos;t load finance data: {(kpisError as Error).message}
          </CardContent>
        </Card>
      )}

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard
          label="Cash Position"
          value={kpis ? formatGBP(kpis.cashPosition) : "—"}
          caption="Payments received this period"
          icon={PoundSterling}
          testId="kpi-cash-position"
          loading={kpisLoading}
        />
        <KpiCard
          label="Outstanding"
          value={kpis ? formatGBP(kpis.outstanding) : "—"}
          caption={kpis ? `${kpis.unpaidInvoiceCount} unpaid invoices` : undefined}
          icon={Clock}
          testId="kpi-outstanding"
          loading={kpisLoading}
        />
        <KpiCard
          label="Overdue"
          value={kpis ? formatGBP(kpis.overdue) : "—"}
          caption="Past due date"
          icon={AlertTriangle}
          variant={kpis && kpis.overdue > 0 ? "destructive" : "default"}
          testId="kpi-overdue"
          loading={kpisLoading}
        />
        <KpiCard
          label="MTD Revenue"
          value={kpis ? formatGBP(kpis.mtdRevenue) : "—"}
          caption="Month-to-date payments received"
          icon={TrendingUp}
          testId="kpi-mtd-revenue"
          loading={kpisLoading}
        />
        <KpiCard
          label="Avg DSO"
          value={kpis ? (kpis.avgDsoDays != null ? `${kpis.avgDsoDays} days` : "—") : "—"}
          caption={kpis ? `${kpis.paidInvoiceCount} paid in range` : undefined}
          icon={CalendarClock}
          testId="kpi-avg-dso"
          loading={kpisLoading}
        />
        <KpiCard
          label="Top Client"
          value={kpis && kpis.topClient ? kpis.topClient.name : "—"}
          caption={
            kpis && kpis.topClient ? formatGBP(kpis.topClient.amount) : "No paid invoices in range"
          }
          icon={Crown}
          testId="kpi-top-client"
          loading={kpisLoading}
        />
      </div>

      {/* Empty state */}
      {showEmptyState && (
        <Card className="border-primary/30 bg-card/60" data-testid="finance-empty-state">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Finance dashboard is ready — waiting for data
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Connect TrueLayer to see live cash position. Or wait for Saturday import of your
            436 clients&apos; historical invoices — the dashboard will light up automatically.
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="finance-revenue-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue trend — last 6 months</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {trendLoading ? (
              <Skeleton className="h-full w-full" />
            ) : trend.every((p) => p.revenue === 0 && p.invoicedAmount === 0) ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-8 w-8 opacity-40" />
                <span>No revenue data yet for this period.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: number) => formatGBP(Number(v), { compact: true })}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => formatGBP(Number(v))}
                    cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(140 60% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="finance-invoice-donut">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Invoice status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {kpisLoading ? (
              <Skeleton className="h-full w-full" />
            ) : donutData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <ArrowDownUp className="h-8 w-8 opacity-40" />
                <span>No invoices yet.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_DONUT_COLORS[entry.name] ?? "hsl(220 14% 50%)"}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value: string) => <span className="text-xs capitalize">{value}</span>}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => `${v} invoice${v === 1 ? "" : "s"}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 clients table */}
      <Card data-testid="finance-top-clients">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top clients — by revenue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Last paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClientsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skel-tc-${i}`}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={`skel-tc-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : topClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No client revenue data yet for this period.
                  </TableCell>
                </TableRow>
              ) : (
                topClients.map((c) => (
                  <TableRow key={c.clientId} data-testid={`top-client-row-${c.clientId}`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatGBP(c.paid)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatGBP(c.invoiced)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatGBP(c.outstanding)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateUK(c.lastPaidAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent transactions table */}
      <Card data-testid="finance-recent-transactions">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <Button variant="ghost" size="sm" asChild data-testid="finance-view-all-invoices">
            <a href="/accounting/invoices">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skel-rt-${i}`}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={`skel-rt-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((t: FinanceTxn) => (
                  <TableRow key={`${t.kind}-${t.id}`}>
                    <TableCell className="text-xs text-muted-foreground">{formatDateUK(t.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.kind === "payment_received" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {t.kind === "payment_received" ? "Payment" : "Invoice"}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.clientName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span
                        className={
                          t.amount >= 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground"
                        }
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {formatGBP(t.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t.status ? (
                        <Badge variant={STATUS_BADGE[t.status] ?? "secondary"} className="capitalize">
                          {t.status.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.ref ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer hint */}
      <Card className="border-primary/30 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            More finance features — Phase 2 onward
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          TrueLayer-powered live bank reconciliation, MoneyPax integration, partner-level KPIs, and
          cash-flow forecasting land in Phase 2. This page is your starting view.
        </CardContent>
      </Card>
    </div>
  );
}
