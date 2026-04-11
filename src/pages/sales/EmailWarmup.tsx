import React, { useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Mail,
  Shield,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Circle,
  Loader2,
} from "lucide-react";

// 21-day warmup schedule
const WARMUP_SCHEDULE = [
  5, 5, 8, 8, 12, 12, 18, 18, 25, 25,
  35, 35, 45, 45, 55, 55, 65, 75, 85, 90, 100,
];

interface WarmupStatus {
  id: string;
  tenant_id: string;
  status: "warming" | "active" | "throttled" | "completed";
  current_day: number;
  daily_limit: number;
  emails_sent_today: number;
  domain_health?: string;       // textual stage label, e.g. "warming"
  health_score: number;         // numeric 0–100, used by Progress bar
  bounce_rate: number;
}

interface DailyLog {
  log_date: string;
  emails_sent: number;
  emails_bounced: number;
  emails_opened: number;
  daily_limit_active: number;
}

export default function EmailWarmup() {
  const { tenantId } = useTenant();

  const { data: warmupStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["email_warmup_status", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_warmup_status" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as WarmupStatus) || null;
    },
    enabled: !!tenantId,
  });

  const { data: dailyLogs } = useQuery({
    queryKey: ["warmup_daily_log", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_daily_log" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("log_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as unknown as DailyLog[]) ?? [];
    },
    enabled: !!tenantId,
  });

  const chartData = useMemo(() => {
    if (!dailyLogs?.length) {
      // Generate mock data for display
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        const limit = WARMUP_SCHEDULE[Math.min(i, 20)];
        const sent = Math.min(limit, Math.round(limit * (0.7 + Math.random() * 0.3)));
        return {
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          sent,
          bounced: Math.round(sent * 0.02),
          opened: Math.round(sent * 0.4),
          dailyLimit: limit,
        };
      });
    }
    return [...dailyLogs].reverse().map((l) => ({
      date: new Date(l.log_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sent: l.emails_sent,
      bounced: l.emails_bounced,
      opened: l.emails_opened,
      dailyLimit: l.daily_limit_active,
    }));
  }, [dailyLogs]);

  // If no warmup data exists, show empty state instead of fake defaults
  if (!warmupStatus && !statusLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Mail className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Email Warmup</h1>
            <p className="text-muted-foreground">Build domain reputation over 21 days</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <Shield className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">Email Warmup Not Started</h3>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            Configure your SMTP email settings in Settings to begin the warmup process.
            The system will gradually increase your sending volume over 21 days to build domain reputation.
          </p>
        </div>
      </div>
    );
  }

  const status = warmupStatus?.status ?? "warming";
  const currentDay = warmupStatus?.current_day ?? 1;
  const dailyLimit = warmupStatus?.daily_limit ?? 5;
  const sentToday = warmupStatus?.emails_sent_today ?? 0;
  const domainHealth = warmupStatus?.health_score ?? 50;
  const bounceRate = warmupStatus?.bounce_rate ?? 0;

  const statusConfig = {
    warming: {
      label: `Warming Up — Day ${currentDay} of 21`,
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse",
    },
    active: {
      label: "Fully Warmed — Sending at full capacity",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    throttled: {
      label: "Throttled — High bounce rate detected",
      className: "bg-destructive/20 text-red-400 border-destructive/30",
    },
  };

  const bounceColor =
    bounceRate < 5
      ? "text-emerald-400"
      : bounceRate <= 10
        ? "text-yellow-400"
        : "text-red-400";

  const healthColor =
    domainHealth >= 80
      ? "text-emerald-400"
      : domainHealth >= 60
        ? "text-yellow-400"
        : "text-red-400";

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Warmup</h1>
          <p className="text-muted-foreground">
            Gradually increase sending volume to build domain reputation
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-sm px-4 py-1.5 ${statusConfig[status].className}`}
        >
          {statusConfig[status].label}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Limit
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {sentToday} / {dailyLimit}
            </div>
            <Progress
              value={(sentToday / dailyLimit) * 100}
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">emails sent today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warmup Day
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currentDay} <span className="text-base font-normal text-muted-foreground">/ 21</span>
            </div>
            <Progress value={(currentDay / 21) * 100} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {21 - currentDay} days remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Domain Health
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${healthColor}`}>
              {domainHealth} <span className="text-base font-normal text-muted-foreground">/ 100</span>
            </div>
            <Progress value={domainHealth} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">reputation score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bounce Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${bounceColor}`}>
              {bounceRate}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {bounceRate < 5 ? (
                <CheckCircle className="h-3 w-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-400" />
              )}
              <span className="text-xs text-muted-foreground">
                {bounceRate < 5 ? "Healthy" : bounceRate <= 10 ? "Monitor closely" : "Action needed"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Daily Send Volume (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <ReferenceLine
                  y={dailyLimit}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  label={{ value: "Current Limit", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                  name="Sent"
                />
                <Area
                  type="monotone"
                  dataKey="bounced"
                  stackId="2"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.3}
                  name="Bounced"
                />
                <Area
                  type="monotone"
                  dataKey="opened"
                  stackId="3"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Opened"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Warmup Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">21-Day Warmup Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Daily Limit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WARMUP_SCHEDULE.map((limit, i) => {
                const day = i + 1;
                const isCompleted = day < currentDay;
                const isCurrent = day === currentDay;
                return (
                  <TableRow key={day} className={isCurrent ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium text-foreground">Day {day}</TableCell>
                    <TableCell className="text-foreground">{limit} emails</TableCell>
                    <TableCell>
                      {isCompleted && (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle className="h-4 w-4" /> Completed
                        </span>
                      )}
                      {isCurrent && (
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <Circle className="h-4 w-4 fill-blue-400" /> Current
                        </span>
                      )}
                      {!isCompleted && !isCurrent && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Circle className="h-4 w-4" /> Upcoming
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3">Tips for healthy email sending:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Never send more than the daily limit</li>
            <li>Mix cold outreach with warm emails (newsletters, follow-ups)</li>
            <li>Remove bounced emails immediately</li>
            <li>Keep bounce rate below 5%</li>
            <li>Monitor the domain health score daily</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
