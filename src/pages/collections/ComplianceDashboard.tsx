import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Phone,
  Ban,
} from "lucide-react";
import { useCollections, type ComplianceRule, type ComplianceLog } from "@/hooks/useCollections";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  block: "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function ComplianceDashboard() {
  const [activeView, setActiveView] = useState<"rules" | "violations" | "dnc">("rules");
  const { accounts, isLoading, useComplianceRules, useComplianceLogs } = useCollections();

  const { data: rules = [], isLoading: rulesLoading } = useComplianceRules();
  const { data: logs = [], isLoading: logsLoading } = useComplianceLogs();

  // DNC accounts
  const dncAccounts = accounts.filter((a: any) => a.is_dnc);

  // Call hours indicator (UAE time: UTC+4)
  const now = new Date();
  const uaeHour = (now.getUTCHours() + 4) % 24;
  const isCallHours = uaeHour >= 8 && uaeHour < 20;
  const isFriday = new Date(now.getTime() + 4 * 60 * 60 * 1000).getDay() === 5;

  // Stats
  const unresolvedViolations = logs.filter((l) => !l.resolved).length;
  const blockViolations = logs.filter((l) => l.severity === "block" && !l.resolved).length;
  const activeRules = rules.filter((r) => r.is_active).length;

  if (isLoading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        Loading compliance data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          CBUAE regulations, contact rules, and violation tracking
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${isCallHours && !isFriday ? "text-green-600" : "text-red-600"}`}>
              {isCallHours && !isFriday ? "OPEN" : "CLOSED"}
            </div>
            <p className="text-sm text-muted-foreground">
              Call Window {isFriday ? "(Friday)" : `${uaeHour}:00 UAE`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{activeRules}</p>
            <p className="text-sm text-muted-foreground">Active Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{unresolvedViolations}</p>
            <p className="text-sm text-muted-foreground">Open Violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{blockViolations}</p>
            <p className="text-sm text-muted-foreground">Block Violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{dncAccounts.length}</p>
            <p className="text-sm text-muted-foreground">DNC Accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "rules" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("rules")}
        >
          <Shield className="h-4 w-4 mr-1" /> Rules ({rules.length})
        </Button>
        <Button
          variant={activeView === "violations" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("violations")}
        >
          <AlertTriangle className="h-4 w-4 mr-1" /> Violations ({logs.length})
        </Button>
        <Button
          variant={activeView === "dnc" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("dnc")}
        >
          <Ban className="h-4 w-4 mr-1" /> DNC ({dncAccounts.length})
        </Button>
      </div>

      {/* Rules View */}
      {activeView === "rules" && (
        <div className="space-y-2">
          {rulesLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No compliance rules configured.
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="min-w-[100px]">
                      <p className="font-mono font-bold text-sm">{rule.rule_code}</p>
                      <Badge variant="outline" className="text-xs">{rule.regulation}</Badge>
                    </div>
                    <div>
                      <p className="font-medium">{rule.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Type: {rule.rule_type} &middot; Severity: {rule.severity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.info}>
                      {rule.severity}
                    </Badge>
                    {rule.is_active ? (
                      <Badge variant="outline" className="text-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">Inactive</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Violations View */}
      {activeView === "violations" && (
        <div className="space-y-2">
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                No compliance violations recorded.
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className={!log.resolved ? "border-l-4 border-l-red-500" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {log.resolved ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{log.event_type?.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">{log.description}</p>
                      {log.flagged_by && (
                        <p className="text-xs text-muted-foreground">Flagged by: {log.flagged_by}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info}>
                      {log.severity}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* DNC View */}
      {activeView === "dnc" && (
        <div className="space-y-2">
          {dncAccounts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                No accounts on the Do Not Contact list.
              </CardContent>
            </Card>
          ) : (
            dncAccounts.map((acct: any) => (
              <Card key={acct.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Ban className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">{acct.client_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{acct.account_number}</p>
                      {acct.dnc_reason && (
                        <p className="text-xs text-muted-foreground">Reason: {acct.dnc_reason}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="destructive">DNC</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
