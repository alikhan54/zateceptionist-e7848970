import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Brain,
  ShoppingCart,
  Truck,
  Factory,
  Shield,
  Warehouse,
  DollarSign,
  TrendingDown,
  Clock,
  BarChart3,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentDef {
  codename: string;
  role: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const AGENTS: AgentDef[] = [
  {
    codename: "OVERSEER",
    role: "Supervisor",
    description: "Routes commands to specialist agents and orchestrates multi-agent workflows",
    icon: <Brain className="h-6 w-6" />,
    color: "text-purple-500",
  },
  {
    codename: "BUYER",
    role: "Procurement",
    description: "Creates POs, negotiates with vendors, manages supplier relationships",
    icon: <ShoppingCart className="h-6 w-6" />,
    color: "text-indigo-500",
  },
  {
    codename: "COURIER",
    role: "Logistics",
    description: "Tracks shipments, predicts delays, optimizes delivery routes",
    icon: <Truck className="h-6 w-6" />,
    color: "text-blue-500",
  },
  {
    codename: "KEEPER",
    role: "Inventory",
    description: "Monitors stock levels, triggers reorders, manages warehouse locations",
    icon: <Warehouse className="h-6 w-6" />,
    color: "text-teal-500",
  },
  {
    codename: "FACTORY",
    role: "Production",
    description: "Plans production schedules, assigns tasks, tracks progress",
    icon: <Factory className="h-6 w-6" />,
    color: "text-orange-500",
  },
  {
    codename: "SENTINEL",
    role: "Quality",
    description: "Runs QC inspections, tracks defects, ensures compliance",
    icon: <Shield className="h-6 w-6" />,
    color: "text-green-500",
  },
  {
    codename: "TREASURER",
    role: "Finance",
    description: "Tracks budgets, approves expenditures, generates financial reports",
    icon: <DollarSign className="h-6 w-6" />,
    color: "text-emerald-500",
  },
  {
    codename: "OPTIMIZER",
    role: "Cost Reduction",
    description: "Identifies savings, negotiates better rates, consolidates purchases",
    icon: <TrendingDown className="h-6 w-6" />,
    color: "text-cyan-500",
  },
  {
    codename: "PLANNER",
    role: "Demand Forecast",
    description: "Predicts demand, plans inventory needs, seasonal adjustments",
    icon: <BarChart3 className="h-6 w-6" />,
    color: "text-violet-500",
  },
  {
    codename: "SCHEDULER",
    role: "Workforce",
    description: "Manages shifts, assigns workers, tracks labor capacity",
    icon: <Clock className="h-6 w-6" />,
    color: "text-amber-500",
  },
  {
    codename: "DISPATCHER",
    role: "Order Fulfillment",
    description: "Processes orders, coordinates picking and packing, manages returns",
    icon: <Zap className="h-6 w-6" />,
    color: "text-rose-500",
  },
  {
    codename: "ANALYST",
    role: "Reporting",
    description: "Generates dashboards, trend analysis, operational KPIs",
    icon: <Activity className="h-6 w-6" />,
    color: "text-sky-500",
  },
];

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  failed: <XCircle className="h-3 w-3 text-red-500" />,
  in_progress: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
  pending: <Clock className="h-3 w-3 text-amber-500" />,
};

export default function AgentNetwork() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["ops_agent_tasks_all", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_agent_tasks")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Stats grouped by agent
  const agentStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; failed: number; latest: string | null }> = {};
    tasks.forEach((t: any) => {
      const name = (t.agent_name || "UNKNOWN").toUpperCase();
      if (!map[name]) {
        map[name] = { total: 0, completed: 0, failed: 0, latest: null };
      }
      map[name].total++;
      if (t.status === "completed") map[name].completed++;
      if (t.status === "failed") map[name].failed++;
      if (!map[name].latest || (t.created_at && t.created_at > map[name].latest!)) {
        map[name].latest = t.created_at;
      }
    });
    return map;
  }, [tasks]);

  const recentTasks = useMemo(() => tasks.slice(0, 15), [tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8 text-purple-500" />
          Agent Network
        </h1>
        <p className="text-muted-foreground mt-1">
          12 AI agents powering autonomous operations
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Agents</p>
            <p className="text-2xl font-bold">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">
              {tasks.filter((t: any) => t.status === "completed").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Agents</p>
            <p className="text-2xl font-bold text-purple-500">
              {Object.keys(agentStats).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Agent Roster</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {AGENTS.map((agent) => {
            const stats = agentStats[agent.codename] || {
              total: 0,
              completed: 0,
              failed: 0,
              latest: null,
            };
            const isActive = stats.total > 0;
            const successRate =
              stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

            return (
              <Card
                key={agent.codename}
                className={`relative overflow-hidden transition-colors ${
                  isActive ? "hover:bg-muted/50" : "opacity-70"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={agent.color}>{agent.icon}</div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {isActive ? "Active" : "Idle"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm">{agent.codename}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{agent.role}</p>
                  <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3">
                    {agent.description}
                  </p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {stats.total} task{stats.total !== 1 ? "s" : ""}
                    </span>
                    {stats.total > 0 && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          successRate >= 90
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : successRate >= 70
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : "bg-red-500/10 text-red-600 border-red-500/30"
                        }`}
                      >
                        {successRate}% success
                      </Badge>
                    )}
                  </div>

                  {stats.latest && (
                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                      Last active{" "}
                      {formatDistanceToNow(new Date(stats.latest), { addSuffix: true })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Tasks Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No agent activity recorded yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {TASK_STATUS_ICON[task.status] || <Clock className="h-3 w-3" />}
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        <span className="font-medium">{task.agent_name || "UNKNOWN"}</span>
                        <span className="text-muted-foreground"> - </span>
                        <span className="text-muted-foreground">
                          {task.description || task.task_type || "Task"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">
                    {task.created_at
                      ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
