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
  { codename: "NEXUS", role: "Operations Supervisor", phase: "P20 — Active", icon: Brain, live: true },
  { codename: "ORACLE", role: "Demand Forecasting", phase: "P21", icon: TrendingUp, live: false },
  { codename: "STOCKMASTER", role: "Inventory Management", phase: "P21", icon: Package, live: false },
  { codename: "SOURCER", role: "Vendor Discovery", phase: "P22", icon: Users, live: false },
  { codename: "BUYER", role: "Purchase Orders", phase: "P22", icon: ShoppingCart, live: false },
  { codename: "DIPLOMAT", role: "Vendor Relations", phase: "P22", icon: Users, live: false },
  { codename: "FACTORY", role: "Production Planning", phase: "P23", icon: Zap, live: false },
  { codename: "SENTINEL", role: "Quality Control", phase: "P23", icon: CheckSquare, live: false },
  { codename: "COURIER", role: "Logistics & Routing", phase: "P24", icon: Truck, live: false },
  { codename: "OPTIMIZER", role: "Cost Intelligence", phase: "P24", icon: BarChart2, live: false },
  { codename: "TREASURER", role: "Budget Intelligence", phase: "P25", icon: DollarSign, live: false },
  { codename: "GUARDIAN", role: "Compliance", phase: "P25", icon: Shield, live: false },
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
          Phase 20 Active — Foundation
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
          {response && (
            <div
              className={`mt-3 p-3 rounded-md text-sm border ${
                (response as Record<string, unknown>).success
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20"
                  : "bg-red-50 border-red-200 dark:bg-red-900/20"
              }`}
            >
              {(response as Record<string, unknown>).success ? (
                <div>
                  <strong>NEXUS:</strong>{" "}
                  {((response as Record<string, unknown>).result as Record<string, unknown>)?.message as string ||
                    "Task acknowledged"}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Task ID: {(response as Record<string, unknown>).task_id as string}
                  </span>
                </div>
              ) : (
                <div className="text-red-700">
                  Error: {(response as Record<string, unknown>).error as string}
                </div>
              )}
            </div>
          )}
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
    </div>
  );
}
