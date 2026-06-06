import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Bot,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Terminal,
  TrendingUp,
  Truck,
  Users,
  Sparkles,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageLoading } from "@/components/shared/PageLoading";
import { useCurrencyFormatter } from "@/lib/formatCurrency";

export default function OpsCommandCenter() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const tenantSlug = tenantConfig?.tenant_id ?? "";
  const formatCurrency = useCurrencyFormatter();
  const [command, setCommand] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // Inventory items
  const { data: inventory = [] } = useQuery({
    queryKey: ["ops_inventory_items", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_inventory_items")
        .select("*")
        .eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Agent tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["ops_agent_tasks", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_agent_tasks")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Purchase orders
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["ops_purchase_orders", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_purchase_orders")
        .select("*")
        .eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ["ops_budgets", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_budgets")
        .select("*")
        .eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Tier 2 — agent-computed metrics (surfacing existing data; read-only)
  const { data: vendorPerf = [] } = useQuery({
    queryKey: ["ops_vendor_performance", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_vendor_performance")
        .select("*")
        .eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: savings = [] } = useQuery({
    queryKey: ["ops_cost_savings_occ", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_cost_savings")
        .select("*")
        .eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ["ops_demand_forecasts_occ", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_demand_forecasts")
        .select("item_name,predicted_quantity,confidence_score,horizon_days,narrative")
        .eq("tenant_id", tenantSlug)
        .order("confidence_score", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["ops_shipments_occ", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_shipments")
        .select("status,estimated_delivery,actual_delivery")
        .eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const lowStockCount = useMemo(
    () => inventory.filter((i: any) => Number(i.current_stock ?? 0) <= Number(i.reorder_point ?? 0)).length,
    [inventory]
  );

  const budgetRemaining = useMemo(() => {
    return budgets.reduce(
      (sum: number, b: any) => sum + ((b.budgeted_amount || 0) - (b.spent_amount || 0)),
      0
    );
  }, [budgets]);

  const poByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      pending_approval: 0,
      approved: 0,
      delivered: 0,
    };
    purchaseOrders.forEach((po: any) => {
      if (counts[po.status] !== undefined) counts[po.status]++;
    });
    return counts;
  }, [purchaseOrders]);

  // Tier 2 — success metrics derived ONLY from real per-tenant data; null when absent.
  const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

  const inventoryHealth = useMemo(() => {
    if (!inventory.length) return null;
    const healthy = inventory.filter(
      (i: any) => num(i.current_stock) !== null && num(i.reorder_point) !== null
        && (num(i.current_stock) as number) > (num(i.reorder_point) as number)
    ).length;
    return Math.round((healthy / inventory.length) * 100);
  }, [inventory]);

  const criticalItem = useMemo(() => {
    const below = inventory
      .filter((i: any) => num(i.current_stock) !== null && num(i.reorder_point) !== null
        && (num(i.current_stock) as number) <= (num(i.reorder_point) as number))
      .sort((a: any, b: any) =>
        ((num(a.current_stock) as number) - (num(a.reorder_point) as number))
        - ((num(b.current_stock) as number) - (num(b.reorder_point) as number)));
    return below[0] || null;
  }, [inventory]);

  const vendorStats = useMemo(() => {
    if (!vendorPerf.length) return { onTime: null as number | null, avgScore: null as number | null, issued: 0 };
    const issued = vendorPerf.reduce((s: number, v: any) => s + (num(v.pos_issued) || 0), 0);
    const onTimeN = vendorPerf.reduce((s: number, v: any) => s + (num(v.pos_on_time) || 0), 0);
    const scores = vendorPerf.map((v: any) => num(v.overall_score)).filter((x: any) => x !== null) as number[];
    return {
      onTime: issued > 0 ? Math.round((onTimeN / issued) * 100) : null,
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      issued,
    };
  }, [vendorPerf]);

  const poAiPct = useMemo(() => {
    if (!purchaseOrders.length) return null;
    const aiGen = purchaseOrders.filter((p: any) => Array.isArray(p.agent_actions) && p.agent_actions.length > 0).length;
    return Math.round((aiGen / purchaseOrders.length) * 100);
  }, [purchaseOrders]);

  const shipOnTime = useMemo(() => {
    const delivered = shipments.filter((s: any) => s.status === "delivered" && s.actual_delivery && s.estimated_delivery);
    if (!delivered.length) return null;
    const onTime = delivered.filter((s: any) => new Date(s.actual_delivery) <= new Date(s.estimated_delivery)).length;
    return Math.round((onTime / delivered.length) * 100);
  }, [shipments]);

  const savingsIdentified = useMemo(
    () => savings.filter((s: any) => s.status !== "rejected").reduce((sum: number, s: any) => sum + (num(s.estimated_saving) || 0), 0),
    [savings]
  );

  const topForecast = forecasts[0] || null;

  // Most recent task time per agent (for "agent outcomes" freshness)
  const lastTaskByAgent = useMemo(() => {
    const m: Record<string, string> = {};
    tasks.forEach((t: any) => {
      const a = (t.agent_name || "").toString().toUpperCase();
      if (a && !m[a]) m[a] = t.created_at;
    });
    return m;
  }, [tasks]);

  const healthAttention = (lowStockCount > 0) || (vendorStats.onTime !== null && vendorStats.onTime < 80);

  // Agent outcome rows — REAL data only; graceful "no actions yet" when empty.
  const agentOutcomes = useMemo(() => {
    const fmtAgo = (ts?: string) => {
      try { return ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : null; } catch { return null; }
    };
    return [
      {
        agent: "STOCKMASTER", icon: Boxes, color: "text-amber-500",
        text: inventory.length === 0
          ? "No inventory tracked yet"
          : lowStockCount > 0
            ? `Flagged ${lowStockCount} item${lowStockCount > 1 ? "s" : ""} below reorder${criticalItem ? `: ${criticalItem.name} (${num(criticalItem.current_stock)} vs ${num(criticalItem.reorder_point)})` : ""}`
            : `All ${inventory.length} items above reorder — no action needed`,
        ago: fmtAgo(lastTaskByAgent["STOCKMASTER"]),
      },
      {
        agent: "ORACLE", icon: TrendingUp, color: "text-blue-500",
        text: forecasts.length === 0
          ? "No demand forecasts yet"
          : `${forecasts.length} demand forecast${forecasts.length > 1 ? "s" : ""}${topForecast ? ` — top: ${Math.round(num(topForecast.predicted_quantity) || 0)}× ${topForecast.item_name} (${topForecast.horizon_days}d)` : ""}`,
        ago: fmtAgo(lastTaskByAgent["ORACLE"]),
      },
      {
        agent: "BUYER", icon: ShoppingCart, color: "text-indigo-500",
        text: purchaseOrders.length === 0
          ? "No purchase orders yet"
          : `${purchaseOrders.length} purchase orders${poAiPct !== null ? `, ${poAiPct}% AI-generated` : ""}`,
        ago: fmtAgo(lastTaskByAgent["BUYER"]),
      },
      {
        agent: "DIPLOMAT", icon: Users, color: "text-cyan-600",
        text: vendorPerf.length === 0
          ? "No vendor scorecards yet"
          : `Vendor scorecard${vendorStats.avgScore !== null ? ` avg ${vendorStats.avgScore}/5` : ""}${vendorStats.onTime !== null ? `, ${vendorStats.onTime}% on-time across ${vendorStats.issued} POs` : ""}`,
        ago: fmtAgo(lastTaskByAgent["DIPLOMAT"]),
      },
      {
        agent: "OPTIMIZER", icon: Sparkles, color: "text-emerald-500",
        text: savings.length === 0
          ? "No savings identified yet"
          : `Identified ${formatCurrency(savingsIdentified)} across ${savings.length} opportunit${savings.length > 1 ? "ies" : "y"}`,
        ago: fmtAgo(lastTaskByAgent["OPTIMIZER"]),
      },
    ];
  }, [inventory, lowStockCount, criticalItem, forecasts, topForecast, purchaseOrders, poAiPct, vendorPerf, vendorStats, savings, savingsIdentified, lastTaskByAgent, formatCurrency]);

  const handleDispatch = async () => {
    if (!command.trim()) return;
    setDispatching(true);
    try {
      const resp = await fetch(
        "https://webhooks.zatesystems.com/webhook/ops/dispatch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenantSlug,
            tenant_slug: tenantSlug,
            industry: tenantConfig?.industry ?? "",
            region: tenantConfig?.region ?? "",
            goal: command.trim(),
            mode: "auto",
          }),
        }
      );
      if (resp.ok) {
        toast({ title: "Command dispatched", description: "Agent is processing your request." });
        setCommand("");
        refetchTasks();
      } else {
        toast({ title: "Dispatch failed", description: "Could not reach ops agent.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Failed to connect.", variant: "destructive" });
    } finally {
      setDispatching(false);
    }
  };

  const TASK_STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    awaiting_approval: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    running: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    complete: "bg-green-500/10 text-green-600 border-green-500/30",
    completed: "bg-green-500/10 text-green-600 border-green-500/30",
    failed: "bg-red-500/10 text-red-600 border-red-500/30",
    escalated: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  if (!tenantConfig) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ops Command Center</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered operations management hub
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Activity className="w-3 h-3 mr-1" /> Live
        </Badge>
      </div>

      {/* Headline insight — honest verdict from real numbers */}
      <Card className={healthAttention ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {healthAttention ? (
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-lg leading-snug">
                {inventory.length === 0
                  ? "Operations module ready — no inventory tracked yet"
                  : healthAttention
                    ? `Operations need attention — ${lowStockCount > 0 ? `${lowStockCount} item${lowStockCount > 1 ? "s" : ""} below reorder${criticalItem ? ` (${criticalItem.name})` : ""}` : "vendor delivery lagging"}`
                    : "Operations healthy — all items stocked, vendors performing"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {inventory.length > 0 && <>Inventory {inventoryHealth}% healthy. </>}
                {vendorStats.onTime !== null && <>Vendors {vendorStats.onTime}% on-time. </>}
                {poAiPct !== null && <>{purchaseOrders.length} POs ({poAiPct}% AI-generated). </>}
                {savingsIdentified > 0 && <>{formatCurrency(savingsIdentified)} in savings identified.</>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Items</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-amber-500">{lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Orders</p>
                <p className="text-2xl font-bold">{purchaseOrders.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-indigo-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget Remaining</p>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(budgetRemaining)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agent Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <Bot className="h-8 w-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Chain success metrics — "are you winning?" (real data; — when absent) */}
      <div>
        <h3 className="font-semibold text-lg mb-3">Supply Chain Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Inventory Health</p>
              <p className={`text-2xl font-bold ${inventoryHealth === null ? "" : inventoryHealth >= 90 ? "text-green-500" : inventoryHealth >= 70 ? "text-amber-500" : "text-red-500"}`}>
                {inventoryHealth === null ? "—" : `${inventoryHealth}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">% items above reorder</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Vendor On-Time</p>
              <p className={`text-2xl font-bold ${vendorStats.onTime === null ? "" : vendorStats.onTime >= 85 ? "text-green-500" : vendorStats.onTime >= 70 ? "text-amber-500" : "text-red-500"}`}>
                {vendorStats.onTime === null ? "—" : `${vendorStats.onTime}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">DIPLOMAT scorecard</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">POs AI-Generated</p>
              <p className="text-2xl font-bold text-indigo-500">
                {poAiPct === null ? "—" : `${poAiPct}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">BUYER automation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Shipments On-Time</p>
              <p className={`text-2xl font-bold ${shipOnTime === null ? "" : shipOnTime >= 85 ? "text-green-500" : shipOnTime >= 60 ? "text-amber-500" : "text-red-500"}`}>
                {shipOnTime === null ? "—" : `${shipOnTime}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">COURIER tracking</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Savings Identified</p>
              <p className="text-2xl font-bold text-emerald-500">
                {savingsIdentified > 0 ? formatCurrency(savingsIdentified) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">OPTIMIZER</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agent Outcomes — proof the AI worked; REAL task data, graceful when empty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            What Your Agents Did
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentOutcomes.map((o) => {
              const Icon = o.icon;
              return (
                <div key={o.agent} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${o.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-wide">{o.agent}</span>
                      {o.ago && <span className="text-xs text-muted-foreground">· {o.ago}</span>}
                    </div>
                    <p className="text-sm mt-0.5">{o.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Command Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Natural Language Command
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder='Try: "Reorder low stock items" or "Generate PO for office supplies"'
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDispatch()}
              className="flex-1"
            />
            <Button onClick={handleDispatch} disabled={dispatching || !command.trim()}>
              {dispatching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Dispatch
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PO Status Cards */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Purchase Order Status</h3>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Pending Approval</span>
                </div>
                <span className="font-bold text-amber-500">{poByStatus.pending_approval}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Approved</span>
                </div>
                <span className="font-bold text-blue-500">{poByStatus.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Delivered</span>
                </div>
                <span className="font-bold text-green-500">{poByStatus.delivered}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg">Live Activity Feed</h3>
          <Card>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent agent tasks
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0">
                          {(task.status === "completed" || task.status === "complete") ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (task.status === "failed" || task.status === "escalated") ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (task.status === "in_progress" || task.status === "running") ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {task.description || task.task_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.agent_name} &middot;{" "}
                            {task.created_at
                              ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
                              : ""}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={TASK_STATUS_BADGE[task.status] || ""}
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
