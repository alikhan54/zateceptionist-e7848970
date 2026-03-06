import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  DollarSign,
  BarChart3,
  CreditCard,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

export default function VoiceCredits() {
  const { tenantId } = useTenant();

  // Fetch voice credits balance (SLUG tenant_id)
  const { data: credits, isLoading: creditsLoading, refetch: refetchCredits } = useQuery({
    queryKey: ["voice-credits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("voice_credits")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) { console.error("[VoiceCredits] Error:", error); return null; }
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch voice usage for cost analysis (SLUG tenant_id)
  const { data: usageData = [] } = useQuery({
    queryKey: ["voice-credits-usage", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("voice_usage")
        .select("total_cost, duration_seconds, direction, started_at, call_status")
        .eq("tenant_id", tenantId)
        .gte("started_at", thirtyDaysAgo)
        .order("started_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!tenantId,
  });

  const balance = credits?.balance_minutes ?? 0;
  const totalMinutesPurchased = credits?.total_minutes_purchased ?? 0;
  const ratePerMinute = credits?.rate_per_minute ?? 0.05;
  const autoRecharge = credits?.auto_recharge ?? false;
  const lowBalanceThreshold = credits?.low_balance_threshold ?? 10;
  const lowBalance = balance <= lowBalanceThreshold;

  // Calculate usage stats
  const totalCost30d = usageData.reduce((sum: number, u: any) => sum + (Number(u.total_cost) || 0), 0);
  const totalMinutes30d = usageData.reduce((sum: number, u: any) => sum + (Number(u.duration_seconds) || 0), 0) / 60;
  const totalCalls30d = usageData.length;
  const inboundCalls = usageData.filter((u: any) => u.direction === "inbound").length;
  const outboundCalls = usageData.filter((u: any) => u.direction === "outbound").length;
  const avgCostPerCall = totalCalls30d > 0 ? totalCost30d / totalCalls30d : 0;
  const avgDurationPerCall = totalCalls30d > 0 ? totalMinutes30d / totalCalls30d : 0;
  const estimatedCallsRemaining = ratePerMinute > 0 && avgDurationPerCall > 0
    ? Math.floor(balance / avgDurationPerCall)
    : Math.floor(balance / 2); // Default 2 min per call estimate

  // Daily cost breakdown (last 7 days)
  const dailyCosts: { day: string; cost: number; calls: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
    const dayData = usageData.filter((u: any) => u.started_at && u.started_at.startsWith(dateStr));
    dailyCosts.push({
      day: dayName,
      cost: dayData.reduce((s: number, u: any) => s + (Number(u.total_cost) || 0), 0),
      calls: dayData.length,
    });
  }
  const maxDailyCost = Math.max(...dailyCosts.map((d) => d.cost), 0.01);

  // Balance progress (used vs total)
  const usedMinutes = totalMinutesPurchased - balance;
  const usagePercent = totalMinutesPurchased > 0 ? Math.min((usedMinutes / totalMinutesPurchased) * 100, 100) : 0;

  const CREDIT_PACKAGES = [
    { name: "Starter", minutes: 100, price: 9.99, perMin: 0.10, popular: false },
    { name: "Growth", minutes: 500, price: 39.99, perMin: 0.08, popular: true },
    { name: "Business", minutes: 2000, price: 119.99, perMin: 0.06, popular: false },
    { name: "Enterprise", minutes: 10000, price: 449.99, perMin: 0.045, popular: false },
  ];

  return (
    <div className="space-y-6">
      {/* Low Balance Warning */}
      {lowBalance && balance > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">Low Balance Warning</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  You have {balance.toFixed(0)} minutes remaining. Consider adding more credits to avoid service interruption.
                </p>
              </div>
              {!autoRecharge && (
                <Badge className="bg-amber-100 text-amber-800">Auto-recharge OFF</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {balance <= 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">No Credits Remaining</p>
                <p className="text-sm text-red-600 dark:text-red-400">Voice calls are paused. Add credits to resume.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-4xl font-bold">{balance.toFixed(0)} <span className="text-lg font-normal text-muted-foreground">min</span></p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
            </div>
            {/* Usage progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{usedMinutes.toFixed(0)} min used</span>
                <span>{totalMinutesPurchased.toFixed(0)} min total</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-red-500" : usagePercent > 60 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{usagePercent.toFixed(0)}% used</span>
                <div className="flex items-center gap-1">
                  {autoRecharge ? (
                    <><CheckCircle className="h-3 w-3 text-green-500" /><span className="text-green-600">Auto-recharge ON</span></>
                  ) : (
                    <><AlertTriangle className="h-3 w-3 text-amber-500" /><span className="text-amber-600">Auto-recharge OFF</span></>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Calls Left</p>
                <p className="text-3xl font-bold">{estimatedCallsRemaining}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ~{avgDurationPerCall.toFixed(1)} min/call avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate / Minute</p>
                <p className="text-3xl font-bold">${ratePerMinute.toFixed(3)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Per-minute billing rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Usage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">30d Cost</p>
            <p className="text-xl font-bold">${totalCost30d.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">30d Calls</p>
            <p className="text-xl font-bold">{totalCalls30d}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">30d Minutes</p>
            <p className="text-xl font-bold">{totalMinutes30d.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <ArrowDownLeft className="h-3 w-3 text-blue-500" />
              <p className="text-xs text-muted-foreground">Inbound</p>
            </div>
            <p className="text-xl font-bold">{inboundCalls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">Outbound</p>
            </div>
            <p className="text-xl font-bold">{outboundCalls}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Daily Usage (7 Days)
              </CardTitle>
              <CardDescription>Cost and call volume per day</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchCredits()}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-32">
            {dailyCosts.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] text-muted-foreground">${day.cost.toFixed(2)}</p>
                <div className="w-full rounded-t relative" style={{ height: `${Math.max((day.cost / maxDailyCost) * 100, 4)}%` }}>
                  <div className={`absolute inset-0 rounded-t ${day.calls > 0 ? "bg-primary/60" : "bg-muted"}`} />
                </div>
                <p className="text-[10px] font-medium">{day.day}</p>
                <p className="text-[10px] text-muted-foreground">{day.calls}c</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Credit Packages
          </CardTitle>
          <CardDescription>Add voice minutes to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <div key={pkg.name}
                className={`p-4 rounded-lg border-2 transition-colors hover:border-primary/50 ${
                  pkg.popular ? "border-primary bg-primary/5" : "border-border"
                }`}>
                {pkg.popular && (
                  <Badge className="bg-primary text-primary-foreground mb-2">
                    <Zap className="h-3 w-3 mr-1" /> Most Popular
                  </Badge>
                )}
                <p className="font-semibold text-lg">{pkg.name}</p>
                <p className="text-3xl font-bold mt-1">${pkg.price}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {pkg.minutes.toLocaleString()} minutes
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ${pkg.perMin.toFixed(3)}/min
                </p>
                <Button variant={pkg.popular ? "default" : "outline"} className="w-full mt-3" size="sm">
                  Purchase
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Contact support for custom enterprise volumes or auto-recharge configuration.
          </p>
        </CardContent>
      </Card>

      {/* Recent Cost Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> Recent Call Costs
          </CardTitle>
          <CardDescription>Last 20 calls with cost breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No call cost data available</p>
          ) : (
            <div className="space-y-2">
              {usageData.slice(0, 20).map((call: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {call.direction === "inbound" ? (
                      <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium capitalize">{call.direction} Call</p>
                      <p className="text-xs text-muted-foreground">
                        {call.started_at ? new Date(call.started_at).toLocaleString() : "Unknown date"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm">{Math.ceil((call.duration_seconds || 0) / 60)} min</p>
                      <p className="text-xs text-muted-foreground">{call.duration_seconds || 0}s</p>
                    </div>
                    <Badge variant={call.call_status === "completed" || call.call_status === "customer-ended-call" || call.call_status === "assistant-ended-call"
                      ? "default" : "destructive"} className="text-xs">
                      ${(Number(call.total_cost) || 0).toFixed(3)}
                    </Badge>
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
