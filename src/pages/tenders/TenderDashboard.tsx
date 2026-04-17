import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, FileText, DollarSign, Shield, AlertCircle, TrendingUp, Clock, FileCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_ORDER = ["discovered", "bid_prep", "submitted", "awarded", "delivering", "installed", "completed", "lost"];

const formatPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

export default function TenderDashboard() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";

  const { data: tenders = [] } = useQuery({
    queryKey: ["tenders-dashboard", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase.from("tenders").select("*").eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["tender-payments-dash", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase.from("tender_payments").select("*").eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: amc = [] } = useQuery({
    queryKey: ["amc-dash", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_contracts").select("*").eq("tenant_id", tenantSlug);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["tender-stages-recent", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("tender_stages")
        .select("*, tenders(title, tender_number)")
        .eq("tenant_id", tenantSlug)
        .order("entered_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // KPIs
  const activeTenders = tenders.filter((t) => !["completed", "lost"].includes(t.status)).length;
  const pipelineValue = tenders
    .filter((t) => !["completed", "lost"].includes(t.status))
    .reduce((sum, t) => sum + Number(t.estimated_value || 0), 0);
  const overduePayments = payments.filter((p) => p.status === "overdue").length;
  const expiringAMCs = amc.filter((c) => c.status === "expiring_soon").length;

  // Pipeline funnel
  const statusCounts: Record<string, number> = {};
  tenders.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(statusCounts), 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tender Operations</h1>
        <p className="text-muted-foreground mt-1">
          Pipeline overview for scientific instruments & tender-based trading
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Tenders</span>
            </div>
            <div className="text-2xl font-bold">{activeTenders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Pipeline Value</span>
            </div>
            <div className="text-2xl font-bold">{formatPKR(pipelineValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Overdue Payments</span>
            </div>
            <div className="text-2xl font-bold">{overduePayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Expiring AMCs</span>
            </div>
            <div className="text-2xl font-bold">{expiringAMCs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" /> Pipeline Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STATUS_ORDER.map((status) => {
            const count = statusCounts[status] || 0;
            const pct = (count / maxCount) * 100;
            return (
              <div key={status} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{status.replace("_", " ")}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Recent Stage Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {stages.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-sm">
                      {s.tenders?.tender_number || "—"} {s.tenders?.title && <span className="text-muted-foreground">· {s.tenders.title}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.notes || `Stage: ${s.stage}`}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{s.stage?.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
