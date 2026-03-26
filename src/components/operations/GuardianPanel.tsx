import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, RefreshCw, CheckCircle, AlertTriangle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LG_BASE = "https://webhooks.zatesystems.com/webhook";

interface GuardianPanelProps {
  tenantId: string;    // UUID
  tenantSlug: string;  // SLUG
  industry: string;
}

interface QualityCheck {
  check_type: string;
  check_name: string;
  score: number;
  status: string;
  findings: { issue: string; severity: string; recommendation?: string }[];
  metrics: Record<string, any>;
}

interface AuditResult {
  overall_score: number;
  overall_status: string;
  checks: QualityCheck[];
  alerts_generated: number;
  summary: string;
}

interface QualityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  source_module: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  pass: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle, label: "Pass" },
  warn: { color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: AlertTriangle, label: "Warning" },
  fail: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Fail" },
  critical: { color: "text-red-800 bg-red-100 border-red-300", icon: XCircle, label: "Critical" },
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  critical: "bg-red-100 text-red-700",
  emergency: "bg-red-200 text-red-900",
};

export function GuardianPanel({ tenantId, tenantSlug, industry }: GuardianPanelProps) {
  const [lastAudit, setLastAudit] = useState<AuditResult | null>(null);
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ["guardian-alerts", tenantSlug],
    queryFn: async () => {
      const resp = await fetch(
        `http://localhost:8123/ops/guardian/alerts?tenant_slug=${tenantSlug}&tenant_id=${tenantId}&status=open`
      );
      return resp.json();
    },
    refetchInterval: 300000, // 5 min
  });

  const alerts: QualityAlert[] = alertsData?.alerts || [];

  // Run audit mutation
  const auditMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch("http://localhost:8123/ops/guardian/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          tenant_slug: tenantSlug,
          industry: industry || "technology",
          region: "uae",
        }),
      });
      return resp.json();
    },
    onSuccess: (data) => {
      setLastAudit(data);
      queryClient.invalidateQueries({ queryKey: ["guardian-alerts"] });
      toast.success(`Audit complete: ${data.overall_score}/100`);
    },
    onError: () => toast.error("Audit failed"),
  });

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">GUARDIAN — Quality & Compliance</h3>
        </div>
        <Button
          size="sm"
          onClick={() => auditMutation.mutate()}
          disabled={auditMutation.isPending}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", auditMutation.isPending && "animate-spin")} />
          {auditMutation.isPending ? "Auditing..." : "Run Audit"}
        </Button>
      </div>

      {/* Score Card */}
      {lastAudit && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Quality Score</p>
                <p className={cn("text-4xl font-bold", scoreColor(lastAudit.overall_score))}>
                  {lastAudit.overall_score}<span className="text-lg text-muted-foreground">/100</span>
                </p>
              </div>
              <div className="text-right space-y-1">
                <Badge className={STATUS_CONFIG[lastAudit.overall_status]?.color || ""}>
                  {lastAudit.overall_status.toUpperCase()}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {lastAudit.checks.length} checks | {lastAudit.alerts_generated} alerts
                </p>
              </div>
            </div>
            {lastAudit.summary && (
              <p className="text-xs text-muted-foreground mt-3 border-t pt-2">{lastAudit.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check Results */}
      {lastAudit && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lastAudit.checks.map((check, i) => {
            const cfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.pass;
            const Icon = cfg.icon;
            return (
              <Card key={i} className={cn("border", cfg.color.split(" ").slice(1).join(" "))}>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Icon className="h-4 w-4" />
                    {check.check_name}
                    <span className="ml-auto font-bold">{check.score}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {check.findings.slice(0, 2).map((f, j) => (
                    <p key={j} className="text-[11px] text-muted-foreground">
                      <Badge variant="outline" className={cn("text-[9px] mr-1", SEVERITY_COLORS[f.severity] || "")}>
                        {f.severity}
                      </Badge>
                      {f.issue}
                    </p>
                  ))}
                  {check.findings.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">All clear</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Open Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 p-2 rounded border text-sm">
                <Badge className={SEVERITY_COLORS[alert.severity] || ""} variant="outline">
                  {alert.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{alert.description}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!lastAudit && alerts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">
              Click "Run Audit" to check quality and compliance
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
