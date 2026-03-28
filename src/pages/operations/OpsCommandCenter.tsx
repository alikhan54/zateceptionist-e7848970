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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function OpsCommandCenter() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";
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

  const lowStockCount = useMemo(
    () => inventory.filter((i: any) => i.quantity_on_hand <= (i.reorder_point || 0)).length,
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
            command: command.trim(),
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
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    completed: "bg-green-500/10 text-green-600 border-green-500/30",
    failed: "bg-red-500/10 text-red-600 border-red-500/30",
  };

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
                  ${budgetRemaining.toLocaleString()}
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
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : task.status === "failed" ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : task.status === "in_progress" ? (
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
