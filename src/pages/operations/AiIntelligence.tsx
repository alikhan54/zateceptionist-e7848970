import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain,
  Zap,
  Shield,
  BarChart2,
  Package,
  Truck,
  DollarSign,
  CheckSquare,
  Users,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AGENTS = [
  { codename: "NEXUS", role: "Operations Supervisor", phase: "P26 — Full Orchestration", icon: Brain, live: true },
  { codename: "ORACLE", role: "Demand Forecasting", phase: "P21 — Active", icon: TrendingUp, live: true },
  { codename: "STOCKMASTER", role: "Inventory Management", phase: "P21 — Active", icon: Package, live: true },
  { codename: "SOURCER", role: "Vendor Discovery", phase: "P22 — Active", icon: Users, live: true },
  { codename: "BUYER", role: "Purchase Orders", phase: "P22 — Active", icon: ShoppingCart, live: true },
  { codename: "DIPLOMAT", role: "Vendor Relations", phase: "P22 — Active", icon: Users, live: true },
  { codename: "FACTORY", role: "Production Planning", phase: "P23 — Active", icon: Zap, live: true },
  { codename: "SENTINEL", role: "Quality Control", phase: "P23 — Active", icon: CheckSquare, live: true },
  { codename: "COURIER", role: "Logistics & Routing", phase: "P24 — Active", icon: Truck, live: true },
  { codename: "OPTIMIZER", role: "Cost Intelligence", phase: "P24 — Active", icon: BarChart2, live: true },
  { codename: "TREASURER", role: "Budget Intelligence", phase: "P25 — Active", icon: DollarSign, live: true },
  { codename: "GUARDIAN", role: "Compliance", phase: "P25 — Active", icon: Shield, live: true },
];

const AUTONOMY_MODES = [
  {
    level: "supervised",
    label: "Supervised",
    description: "All actions wait for your approval before executing.",
  },
  {
    level: "semi_autonomous",
    label: "Semi-Autonomous",
    description: "Small actions execute automatically. Large actions wait for approval.",
  },
  {
    level: "full_autonomous",
    label: "Full Autonomous",
    description: "Agents execute and notify you of outcomes. Maximum efficiency.",
  },
];

const statusColor = (status: string) =>
  ({
    running: "bg-amber-100 text-amber-800",
    complete: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-600",
    dispatched: "bg-blue-100 text-blue-800",
    awaiting_approval: "bg-purple-100 text-purple-800",
    escalated: "bg-orange-100 text-orange-800",
  })[status] || "bg-gray-100 text-gray-600";

export default function AiIntelligence() {
  const [goal, setGoal] = useState("");
  const [industry, setIndustry] = useState("restaurant");
  const [mode, setMode] = useState<"auto" | "manual" | "hybrid">("auto");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const { tenantConfig } = useTenant();
  const { toast } = useToast();

  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";
  const tenantId = tenantConfig?.id || "ac308ab6-f381-4eef-88ec-4d5c7a860ff9";

  // Fetch recent tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["ops-tasks", tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_agent_tasks")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch inventory items
  const { data: inventory = [] } = useQuery({
    queryKey: ["ops-inventory", tenantSlug, industry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_inventory_items")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .eq("industry", industry)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch demand forecasts
  const { data: forecasts = [], refetch: refetchForecasts } = useQuery({
    queryKey: ["ops-forecasts", tenantSlug, industry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_demand_forecasts")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .eq("industry", industry)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch vendors (Phase 22)
  const { data: vendors = [] } = useQuery({
    queryKey: ["ops-vendors", tenantSlug, industry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_vendors")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .eq("industry", industry)
        .order("score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch purchase orders (Phase 22)
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["ops-purchase-orders", tenantSlug, industry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_purchase_orders")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .eq("industry", industry)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch production plans (Phase 23)
  const { data: productionPlans = [] } = useQuery({
    queryKey: ["ops-production-plans", tenantSlug, industry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_production_plans")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .eq("industry", industry)
        .order("plan_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch QC results (Phase 23)
  const { data: qcResults = [] } = useQuery({
    queryKey: ["ops-qc-results", tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_qc_results")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("inspected_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch shipments (Phase 24)
  const { data: shipments = [] } = useQuery({
    queryKey: ["ops-shipments", tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_shipments")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch cost savings (Phase 24)
  const { data: savings = [] } = useQuery({
    queryKey: ["ops-savings", tenantSlug, industry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_cost_savings")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("identified_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch budget status (Phase 25)
  const { data: budgetStatus = [] } = useQuery({
    queryKey: ["ops-budgets", tenantSlug, industry],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from("ops_budgets")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .eq("industry", industry)
        .eq("period_year", now.getFullYear())
        .eq("period_month", now.getMonth() + 1);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch compliance log (Phase 25)
  const { data: complianceLogs = [] } = useQuery({
    queryKey: ["ops-compliance", tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_compliance_log")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("checked_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const [forecastLoading, setForecastLoading] = useState(false);

  const runForecast = async () => {
    setForecastLoading(true);
    try {
      const r = await fetch(
        "https://webhooks.zatesystems.com/webhook/ops/dispatch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_slug: tenantSlug,
            tenant_id: tenantId,
            industry,
            region: "uae",
            goal: "forecast_all_items",
            mode: "auto",
          }),
        }
      );
      const data = await r.json();
      if (data.success) {
        toast({ title: "Forecast running", description: "ORACLE is generating forecasts..." });
        setTimeout(() => refetchForecasts(), 5000);
      }
    } catch (e) {
      toast({ title: "Forecast failed", description: String(e), variant: "destructive" });
    } finally {
      setForecastLoading(false);
    }
  };

  // Fetch industry configs
  const { data: configs = [] } = useQuery({
    queryKey: ["ops-configs", tenantSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_industry_configs")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("industry");
      if (error) throw error;
      return data || [];
    },
  });

  const dispatchToNexus = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const r = await fetch(
        "https://webhooks.zatesystems.com/webhook/ops/dispatch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_slug: tenantSlug,
            tenant_id: tenantId,
            industry,
            region: "uae",
            goal: goal.trim(),
            mode,
          }),
        }
      );
      const data = await r.json();
      setResponse(data);
      refetchTasks();
      if (data.success) {
        toast({ title: "NEXUS received your goal", description: data.result?.message });
      }
    } catch (e) {
      setResponse({ success: false, error: String(e) });
      toast({ title: "Dispatch failed", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Operations Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Powered by OpsNexus — 12-agent autonomous operations system
        </p>
        <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200">
          Phase 26 — Full Orchestration Active
        </Badge>
      </div>

      {/* NEXUS Command Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-blue-600" />
            Tell NEXUS What You Need
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder='e.g. "How is our inventory doing?" or "Prepare for next week" or "Find a new meat supplier"'
            className="resize-none h-20"
          />
          <div className="flex gap-3 flex-wrap items-center">
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
            >
              <option value="restaurant">Restaurant</option>
              <option value="construction">Construction</option>
              <option value="healthcare">Healthcare</option>
              <option value="technology">Technology</option>
              <option value="realestate">Real Estate</option>
            </select>
            <div className="flex gap-0.5 border rounded-md overflow-hidden text-sm">
              {(["auto", "manual", "hybrid"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Button onClick={dispatchToNexus} disabled={loading || !goal.trim()} size="sm">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send to NEXUS
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["How is our inventory this week?", "Check budget and find savings",
              "Daily operations summary", "Review vendor performance"].map((eg) => (
              <button key={eg} onClick={() => setGoal(eg)}
                className="text-xs px-2 py-1 border rounded-md text-muted-foreground hover:bg-muted transition-colors">
                {eg}
              </button>
            ))}
          </div>
          {response && (() => {
            const res = response as Record<string, unknown>;
            const result = (res.result || res) as Record<string, unknown>;
            const isManual = result.status === "awaiting_approval";
            const briefing = result.briefing as string;
            const plan = result.plan as Record<string, unknown> | undefined;

            if (!res.success && !result.success) {
              return (
                <div className="mt-3 p-3 rounded-md text-sm border bg-red-50 border-red-200 dark:bg-red-900/20">
                  <div className="text-red-700">Error: {(res.error || result.error) as string}</div>
                </div>
              );
            }

            if (isManual && plan) {
              const tasks = (plan.tasks || []) as Record<string, unknown>[];
              return (
                <div className="mt-3 p-4 rounded-md text-sm border bg-amber-50 border-amber-200 dark:bg-amber-900/10">
                  <div className="font-semibold mb-2">NEXUS Plan — Awaiting Approval</div>
                  <p className="text-xs text-muted-foreground mb-2">{plan.primary_impact as string}</p>
                  <div className="space-y-1 mb-3">
                    {tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{t.agent as string}</Badge>
                        <span className="text-xs">{t.action as string}</span>
                        <span className="text-xs text-muted-foreground">— {t.rationale as string}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Task ID: {result.task_id as string}</span>
                </div>
              );
            }

            return (
              <div className="mt-3 p-4 rounded-md text-sm border bg-green-50 border-green-200 dark:bg-green-900/10">
                {briefing ? (
                  <div className="whitespace-pre-wrap">{briefing}</div>
                ) : (
                  <div><strong>NEXUS:</strong> {result.message as string || "Goal completed"}</div>
                )}
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  {result.tasks_run != null && <span>Tasks: {result.tasks_run as number}</span>}
                  {result.duration_s != null && <span>Duration: {result.duration_s as number}s</span>}
                  {result.escalated && (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">Escalated to OMEGA</Badge>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Agent Roster */}
      <div>
        <h2 className="font-semibold mb-3 text-lg">Agent Roster</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {AGENTS.map((a) => {
            const Icon = a.icon;
            return (
              <Card
                key={a.codename}
                className={a.live ? "border-blue-300 bg-blue-50/50 dark:bg-blue-900/10" : ""}
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${a.live ? "text-blue-600" : "text-muted-foreground"}`} />
                    <span className="font-mono font-bold text-sm">{a.codename}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.role}</p>
                  <Badge
                    variant="outline"
                    className={`mt-2 text-[10px] ${
                      a.live ? "bg-blue-100 text-blue-800 border-blue-200" : ""
                    }`}
                  >
                    {a.phase}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Autonomy Modes */}
      <div>
        <h2 className="font-semibold mb-3 text-lg">Operations Mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AUTONOMY_MODES.map((am) => {
            const matchingConfigs = configs.filter(
              (c: Record<string, unknown>) =>
                (c.config as Record<string, unknown>)?.autonomy_level === am.level
            );
            return (
              <Card key={am.level}>
                <CardContent className="pt-4">
                  <div className="font-medium text-sm mb-1">{am.label}</div>
                  <p className="text-xs text-muted-foreground mb-2">{am.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {matchingConfigs.map((c: Record<string, unknown>) => (
                      <Badge key={c.industry as string} variant="secondary" className="text-[10px]">
                        {c.industry as string}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h2 className="font-semibold mb-3 text-lg">Recent Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Dispatch a goal to get started.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Agent</th>
                      <th className="text-left px-4 py-2 font-medium">Goal</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium">Mode</th>
                      <th className="text-left px-4 py-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t: Record<string, unknown>) => (
                      <tr key={t.id as string} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono font-bold text-xs">
                          {t.agent_name as string}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">
                          {(t.goal as string)?.substring(0, 60)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${statusColor(
                              t.status as string
                            )}`}
                          >
                            {t.status as string}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {t.trigger_mode as string}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {timeAgo(t.created_at as string)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Inventory Status */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <Package className="w-5 h-5" /> Inventory Status
        </h2>
        {inventory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inventory items for {industry}. Seed items to enable ORACLE forecasting.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">SKU</th>
                      <th className="text-left px-4 py-2 font-medium">Name</th>
                      <th className="text-left px-4 py-2 font-medium">Stock</th>
                      <th className="text-left px-4 py-2 font-medium">Reorder At</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item: Record<string, unknown>) => {
                      const current = Number(item.current_stock) || 0;
                      const reorder = Number(item.reorder_point) || 0;
                      const max = Number(item.max_stock) || 1;
                      const pct = current / max;
                      const status =
                        current <= 0
                          ? "OUT"
                          : current <= reorder
                            ? "CRITICAL"
                            : current <= reorder * 1.5
                              ? "LOW"
                              : "OK";
                      const sColor = {
                        OUT: "bg-red-200 text-red-900",
                        CRITICAL: "bg-red-100 text-red-800",
                        LOW: "bg-amber-100 text-amber-800",
                        OK: "bg-green-100 text-green-800",
                      }[status];
                      const barColor = {
                        OUT: "bg-red-500",
                        CRITICAL: "bg-red-500",
                        LOW: "bg-amber-500",
                        OK: "bg-green-500",
                      }[status];
                      return (
                        <tr key={item.id as string} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{item.sku as string}</td>
                          <td className="px-4 py-2">
                            {item.name as string}
                            {item.is_perishable && (
                              <span className="ml-1 text-[10px] text-orange-600">perishable</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-medium">{current}</span>{" "}
                            <span className="text-muted-foreground text-xs">{item.unit as string}</span>
                            <div className="w-16 bg-gray-200 rounded h-1 mt-1">
                              <div
                                className={`h-1 rounded ${barColor}`}
                                style={{ width: `${Math.min(100, pct * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {reorder} {item.unit as string}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${sColor}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Demand Forecasts — ORACLE */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Demand Forecasts — ORACLE
          </h2>
          <Button onClick={runForecast} disabled={forecastLoading} size="sm" variant="outline">
            {forecastLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-1" />
            )}
            Run Forecast
          </Button>
        </div>
        {forecasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No forecasts yet. Click Run Forecast to generate.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {forecasts.slice(0, 6).map((f: Record<string, unknown>) => {
              const conf = Number(f.confidence_score) || 0;
              const signals = (f.signals || {}) as Record<string, unknown>;
              return (
                <Card key={f.id as string}>
                  <CardContent className="pt-4">
                    <div className="font-medium text-sm">{f.item_name as string}</div>
                    <div className="text-2xl font-bold mt-1">
                      {Number(f.predicted_quantity)?.toFixed(0)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        units / {f.horizon_days as number}d
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Confidence</span>
                        <span>{(conf * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-1.5">
                        <div
                          className="h-1.5 rounded bg-blue-500"
                          style={{ width: `${conf * 100}%` }}
                        />
                      </div>
                    </div>
                    {f.narrative && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {f.narrative as string}
                      </p>
                    )}
                    {signals.stock_gap && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">Stock gap predicted</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Orders — BUYER */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Purchase Orders — BUYER
        </h2>
        {purchaseOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No POs yet. BUYER creates them automatically from stock gaps.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: "Total POs", val: purchaseOrders.length, color: "text-gray-700" },
                { label: "Pending Approval", val: purchaseOrders.filter((p: Record<string, unknown>) => p.status === "pending_approval").length, color: "text-amber-700" },
                { label: "Sent", val: purchaseOrders.filter((p: Record<string, unknown>) => p.status === "sent").length, color: "text-blue-700" },
                { label: "Delivered", val: purchaseOrders.filter((p: Record<string, unknown>) => p.status === "delivered").length, color: "text-green-700" },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="pt-3 pb-2 text-center">
                    <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.val}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">PO #</th>
                        <th className="text-left px-4 py-2 font-medium">Vendor</th>
                        <th className="text-left px-4 py-2 font-medium">Amount</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                        <th className="text-left px-4 py-2 font-medium">Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.slice(0, 10).map((po: Record<string, unknown>) => {
                        const poStatus = po.status as string;
                        const poColor = {
                          draft: "bg-gray-100 text-gray-600",
                          pending_approval: "bg-amber-100 text-amber-800",
                          approved: "bg-blue-100 text-blue-800",
                          sent: "bg-indigo-100 text-indigo-800",
                          delivered: "bg-green-100 text-green-800",
                          disputed: "bg-red-100 text-red-800",
                          cancelled: "bg-gray-100 text-gray-500",
                        }[poStatus] || "bg-gray-100 text-gray-600";
                        return (
                          <tr key={po.id as string} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2 font-mono text-xs">{po.po_number as string}</td>
                            <td className="px-4 py-2">{po.vendor_name as string}</td>
                            <td className="px-4 py-2 font-medium">
                              {po.currency as string} {Number(po.total_amount)?.toFixed(2)}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${poColor}`}>
                                {poStatus?.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground text-xs">
                              {po.delivery_date as string}
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
      </div>

      {/* Vendor Directory — SOURCER */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <Users className="w-5 h-5" /> Vendors — SOURCER
        </h2>
        {vendors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vendors yet. Use NEXUS to discover vendors.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vendors.map((v: Record<string, unknown>) => {
              const vScore = Number(v.score) || 0;
              const scoreColor = vScore >= 8 ? "bg-green-500" : vScore >= 6 ? "bg-amber-500" : "bg-red-500";
              return (
                <Card key={v.id as string}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{v.name as string}</div>
                      {v.is_approved && (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                          Approved
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Score</span>
                        <span>{vScore.toFixed(1)}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-1.5">
                        <div className={`h-1.5 rounded ${scoreColor}`}
                          style={{ width: `${vScore * 10}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {((v.categories as string[]) || []).map((cat) => (
                        <span key={cat} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Lead time: {v.lead_time_days as number} days | {v.payment_terms as string}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Production Plans — FACTORY */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <Zap className="w-5 h-5" /> Production Plans — FACTORY
        </h2>
        {productionPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No plans yet. FACTORY creates them daily from ORACLE forecasts.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Date</th>
                      <th className="text-left px-4 py-2 font-medium">Name</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium">Bottlenecks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionPlans.slice(0, 5).map((p: Record<string, unknown>) => {
                      const pStatus = p.status as string;
                      const pColor = {
                        draft: "bg-gray-100 text-gray-600", approved: "bg-blue-100 text-blue-800",
                        in_progress: "bg-amber-100 text-amber-800", complete: "bg-green-100 text-green-800",
                        cancelled: "bg-gray-100 text-gray-500",
                      }[pStatus] || "bg-gray-100 text-gray-600";
                      const bottlenecks = (p.bottlenecks as string[]) || [];
                      return (
                        <tr key={p.id as string} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{p.plan_date as string}</td>
                          <td className="px-4 py-2">{(p.name as string)?.substring(0, 40)}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${pColor}`}>{pStatus}</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {bottlenecks.length > 0
                              ? <span className="text-amber-600">{bottlenecks.length} issue(s)</span>
                              : <span className="text-green-600">None</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quality Control — SENTINEL */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <CheckSquare className="w-5 h-5" /> Quality Control — SENTINEL
        </h2>
        {qcResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No QC inspections yet. Submit via webhook or SENTINEL automation.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Card>
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {qcResults.filter((r: Record<string, unknown>) => r.status === "pass").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {qcResults.filter((r: Record<string, unknown>) => r.status === "fail").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="text-2xl font-bold">
                    {qcResults.length > 0
                      ? `${Math.round((qcResults.filter((r: Record<string, unknown>) => r.status === "pass").length / qcResults.length) * 100)}%`
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">Pass Rate</div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Type</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                        <th className="text-left px-4 py-2 font-medium">Corrective</th>
                        <th className="text-left px-4 py-2 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qcResults.slice(0, 10).map((r: Record<string, unknown>) => {
                        const qcStatus = r.status as string;
                        const qcColor = {
                          pass: "bg-green-100 text-green-800", fail: "bg-red-100 text-red-800",
                          conditional: "bg-amber-100 text-amber-800", waived: "bg-gray-100 text-gray-600",
                        }[qcStatus] || "bg-gray-100 text-gray-600";
                        return (
                          <tr key={r.id as string} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2 text-xs">{r.reference_type as string}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${qcColor}`}>{qcStatus}</span>
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {r.corrective_status === "open"
                                ? <span className="text-red-600 font-medium">Open</span>
                                : r.corrective_status === "resolved"
                                  ? <span className="text-green-600">Resolved</span>
                                  : "—"}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {timeAgo(r.inspected_at as string)}
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
      </div>
      {/* Shipments — COURIER (Phase 24) */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <Truck className="w-5 h-5" /> Shipments — COURIER
        </h2>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shipments yet. BUYER creates shipments when POs are sent.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">PO</th>
                      <th className="text-left px-4 py-2 font-medium">Carrier</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium">ETA</th>
                      <th className="text-left px-4 py-2 font-medium">Delay Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((s: Record<string, unknown>) => {
                      const delayPct = Number(s.delay_probability) * 100 || 0;
                      const delayColor = delayPct > 70 ? "bg-red-500" : delayPct > 30 ? "bg-amber-500" : "bg-green-500";
                      const shipStatusColor = {
                        pending: "bg-gray-100 text-gray-600",
                        picked_up: "bg-blue-100 text-blue-800",
                        in_transit: "bg-indigo-100 text-indigo-800",
                        out_for_delivery: "bg-amber-100 text-amber-800",
                        delivered: "bg-green-100 text-green-800",
                        returned: "bg-red-100 text-red-800",
                        lost: "bg-red-200 text-red-900",
                      }[s.status as string] || "bg-gray-100 text-gray-600";
                      return (
                        <tr key={s.id as string} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{(s.po_number as string) || "—"}</td>
                          <td className="px-4 py-2">{s.carrier as string}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${shipStatusColor}`}>
                              {s.status as string}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {s.estimated_delivery ? (s.estimated_delivery as string).substring(0, 10) : "—"}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded h-1.5">
                                <div className={`h-1.5 rounded ${delayColor}`}
                                  style={{ width: `${Math.min(100, delayPct)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{delayPct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cost Savings — OPTIMIZER (Phase 24) */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <BarChart2 className="w-5 h-5" /> Cost Savings — OPTIMIZER
        </h2>
        {savings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No savings identified yet. OPTIMIZER analyses procurement patterns weekly.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Card>
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="text-2xl font-bold">
                    {savings.reduce((sum: number, s: Record<string, unknown>) =>
                      sum + Number(s.estimated_saving || 0), 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Identified (AED)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {savings.filter((s: Record<string, unknown>) => s.status === "implemented")
                      .reduce((sum: number, s: Record<string, unknown>) =>
                        sum + Number(s.estimated_saving || 0), 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Implemented (AED)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-2 text-center">
                  <div className="text-2xl font-bold">{savings.length}</div>
                  <div className="text-xs text-muted-foreground">Opportunities</div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Category</th>
                        <th className="text-left px-4 py-2 font-medium">Opportunity</th>
                        <th className="text-left px-4 py-2 font-medium">Saving</th>
                        <th className="text-left px-4 py-2 font-medium">Confidence</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savings.map((s: Record<string, unknown>) => {
                        const confColor = {
                          high: "bg-green-100 text-green-800",
                          medium: "bg-amber-100 text-amber-800",
                          low: "bg-gray-100 text-gray-600",
                        }[s.confidence as string] || "bg-gray-100 text-gray-600";
                        const savStatusColor = {
                          identified: "bg-gray-100 text-gray-600",
                          approved: "bg-blue-100 text-blue-800",
                          implemented: "bg-green-100 text-green-800",
                          declined: "bg-red-100 text-red-800",
                        }[s.status as string] || "bg-gray-100 text-gray-600";
                        return (
                          <tr key={s.id as string} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <Badge variant="outline" className="text-[10px]">
                                {(s.category as string)?.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 max-w-xs truncate text-muted-foreground">
                              {(s.opportunity as string)?.substring(0, 80)}
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {s.currency as string} {Number(s.estimated_saving)?.toFixed(0)}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${confColor}`}>
                                {s.confidence as string}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${savStatusColor}`}>
                                {s.status as string}
                              </span>
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
      </div>
      {/* Budget Status — TREASURER (Phase 25) */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Budget Status — TREASURER
        </h2>
        {budgetStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No budgets configured for current month.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {budgetStatus.map((b: Record<string, unknown>) => {
              const budgeted = Number(b.budgeted_amount) || 0;
              const spent = Number(b.spent_amount) || 0;
              const pct = budgeted > 0 ? (spent / budgeted) * 100 : 0;
              const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";
              return (
                <Card key={b.id as string}>
                  <CardContent className="pt-3 pb-2">
                    <div className="font-medium text-sm capitalize">{(b.category as string)?.replace("_", " ")}</div>
                    <div className="text-lg font-bold mt-1">
                      AED {spent.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/ {budgeted.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2 mt-2">
                      <div className={`h-2 rounded ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% used</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Compliance — GUARDIAN (Phase 25) */}
      <div>
        <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" /> Compliance Log — GUARDIAN
        </h2>
        {complianceLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No compliance checks recorded yet. GUARDIAN screens every PO automatically.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Region</th>
                      <th className="text-left px-4 py-2 font-medium">Regulation</th>
                      <th className="text-left px-4 py-2 font-medium">Entity</th>
                      <th className="text-left px-4 py-2 font-medium">Result</th>
                      <th className="text-left px-4 py-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceLogs.map((l: Record<string, unknown>) => {
                      const resultColor = {
                        pass: "bg-green-100 text-green-800",
                        warning: "bg-amber-100 text-amber-800",
                        fail: "bg-red-100 text-red-800",
                        requires_review: "bg-purple-100 text-purple-800",
                      }[l.check_result as string] || "bg-gray-100 text-gray-600";
                      return (
                        <tr key={l.id as string} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 uppercase text-xs font-mono">{l.region as string}</td>
                          <td className="px-4 py-2">{l.regulation as string}</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{l.entity_type as string}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${resultColor}`}>
                              {l.check_result as string}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {timeAgo(l.checked_at as string)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
