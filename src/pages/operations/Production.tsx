import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Factory,
  Search,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ListChecks,
  Shield,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const PLAN_STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  in_progress: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  completed: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
};

const QC_STATUS_BADGE: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/30",
  fail: "bg-red-500/10 text-red-600 border-red-500/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

export default function Production() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";
  const [mainTab, setMainTab] = useState("plans");
  const [searchTerm, setSearchTerm] = useState("");

  // Production plans
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["ops_production_plans", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_production_plans")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Production tasks
  const { data: prodTasks = [] } = useQuery({
    queryKey: ["ops_production_tasks", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_production_tasks")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // QC results
  const { data: qcResults = [], isLoading: loadingQC } = useQuery({
    queryKey: ["ops_qc_results", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_qc_results")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("inspected_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const filteredPlans = useMemo(() => {
    if (!searchTerm) return plans;
    const term = searchTerm.toLowerCase();
    return plans.filter(
      (p: any) =>
        (p.plan_name || "").toLowerCase().includes(term) ||
        (p.status || "").toLowerCase().includes(term)
    );
  }, [plans, searchTerm]);

  const filteredQC = useMemo(() => {
    if (!searchTerm) return qcResults;
    const term = searchTerm.toLowerCase();
    return qcResults.filter(
      (q: any) =>
        (q.checkpoint_id || "").toLowerCase().includes(term) ||
        (q.result_status || "").toLowerCase().includes(term)
    );
  }, [qcResults, searchTerm]);

  const planStats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p: any) => p.status === "in_progress").length;
    const completed = plans.filter((p: any) => p.status === "completed").length;
    return { total, active, completed };
  }, [plans]);

  const qcStats = useMemo(() => {
    const total = qcResults.length;
    const passed = qcResults.filter((q: any) => q.result_status === "pass").length;
    const failed = qcResults.filter((q: any) => q.result_status === "fail").length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { total, passed, failed, passRate };
  }, [qcResults]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Factory className="h-8 w-8 text-orange-500" />
          Production
        </h1>
        <p className="text-muted-foreground mt-1">
          FACTORY and SENTINEL agents manage production plans and quality control
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Plans</p>
            <p className="text-2xl font-bold">{planStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Plans</p>
            <p className="text-2xl font-bold text-indigo-500">{planStats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">QC Inspections</p>
            <p className="text-2xl font-bold">{qcStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pass Rate</p>
            <p className={`text-2xl font-bold ${qcStats.passRate >= 90 ? "text-green-500" : qcStats.passRate >= 70 ? "text-amber-500" : "text-red-500"}`}>
              {qcStats.passRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plans or QC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="plans" className="gap-1">
            <ListChecks className="h-4 w-4" /> Plans
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1">
            <Shield className="h-4 w-4" /> Quality
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {loadingPlans ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPlans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No production plans found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-3 font-medium text-muted-foreground">Plan Name</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Plan Date</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Tasks</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlans.map((plan: any) => {
                        const taskCount = prodTasks.filter(
                          (t: any) => t.production_plan_id === plan.id
                        ).length;
                        return (
                          <tr
                            key={plan.id}
                            className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">{plan.plan_name || "--"}</td>
                            <td className="py-3 text-muted-foreground">
                              {plan.plan_date
                                ? format(new Date(plan.plan_date), "MMM d, yyyy")
                                : "--"}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant="outline"
                                className={PLAN_STATUS_BADGE[plan.status] || ""}
                              >
                                {(plan.status || "").replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">{taskCount}</td>
                            <td className="py-3 text-muted-foreground">
                              {plan.created_at
                                ? format(new Date(plan.created_at), "MMM d, yyyy")
                                : "--"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-green-500" />
                QC Inspections
                <Badge variant="outline" className="ml-2">
                  {qcStats.passed} pass / {qcStats.failed} fail
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingQC ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredQC.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No QC results found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-3 font-medium text-muted-foreground">Checkpoint</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Result</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Score</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Inspector</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Inspected</th>
                        <th className="text-left pb-3 font-medium text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQC.map((qc: any) => (
                        <tr
                          key={qc.id}
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 font-mono text-xs">{qc.checkpoint_id || "--"}</td>
                          <td className="py-3">
                            <Badge
                              variant="outline"
                              className={`gap-1 ${QC_STATUS_BADGE[qc.result_status] || ""}`}
                            >
                              {qc.result_status === "pass" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : qc.result_status === "fail" ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {qc.result_status || "--"}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {qc.score != null ? (
                              <span
                                className={`font-medium ${
                                  qc.score >= 90
                                    ? "text-green-500"
                                    : qc.score >= 70
                                    ? "text-amber-500"
                                    : "text-red-500"
                                }`}
                              >
                                {qc.score}/100
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td className="py-3 text-muted-foreground">{qc.inspector || "--"}</td>
                          <td className="py-3 text-muted-foreground">
                            {qc.inspected_at
                              ? format(new Date(qc.inspected_at), "MMM d, yyyy HH:mm")
                              : "--"}
                          </td>
                          <td className="py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                            {qc.notes || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
