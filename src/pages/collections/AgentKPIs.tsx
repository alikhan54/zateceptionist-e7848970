import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useCollections } from "@/hooks/useCollections";

interface KPICard {
  label: string;
  value: string;
  target: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  icon: React.ReactNode;
}

export default function AgentKPIs() {
  const { accounts, isLoading, stats } = useCollections();

  // Calculate KPIs from account data
  const totalContacts = accounts.reduce(
    (sum, a) => sum + (a.total_contact_attempts || 0),
    0
  );
  const contactedAccounts = accounts.filter(
    (a) => a.total_contact_attempts > 0
  ).length;
  const contactRate =
    accounts.length > 0 ? (contactedAccounts / accounts.length) * 100 : 0;

  const ptpAccounts = accounts.filter(
    (a) => a.ptp_count > 0
  ).length;
  const ptpRate =
    contactedAccounts > 0 ? (ptpAccounts / contactedAccounts) * 100 : 0;

  const totalKept = accounts.reduce(
    (sum, a) => sum + (a.ptp_kept_count || 0),
    0
  );
  const totalBroken = accounts.reduce(
    (sum, a) => sum + (a.ptp_broken_count || 0),
    0
  );
  const pkr =
    totalKept + totalBroken > 0
      ? (totalKept / (totalKept + totalBroken)) * 100
      : 0;

  // Migration rate: accounts that changed bucket (approximate)
  const b1Count = stats.bucketCounts["B1"] || 0;
  const migrationRate =
    stats.totalAccounts > 0
      ? ((stats.totalAccounts - b1Count) / stats.totalAccounts) * 100
      : 0;

  const kpis: KPICard[] = [
    {
      label: "Total Contacts",
      value: totalContacts.toString(),
      target: "Target: 50/day",
      targetValue: 50,
      actualValue: totalContacts,
      unit: "",
      icon: <Phone className="h-5 w-5" />,
    },
    {
      label: "Contact Rate",
      value: `${contactRate.toFixed(1)}%`,
      target: "Target: 70%",
      targetValue: 70,
      actualValue: contactRate,
      unit: "%",
      icon: <Target className="h-5 w-5" />,
    },
    {
      label: "PTP Rate",
      value: `${ptpRate.toFixed(1)}%`,
      target: "Target: 40%",
      targetValue: 40,
      actualValue: ptpRate,
      unit: "%",
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      label: "PTP Kept Rate (PKR)",
      value: `${pkr.toFixed(1)}%`,
      target: "Target: 60%",
      targetValue: 60,
      actualValue: pkr,
      unit: "%",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Cure Rate",
      value: `${stats.cureRate.toFixed(1)}%`,
      target: "Target: 15%",
      targetValue: 15,
      actualValue: stats.cureRate,
      unit: "%",
      icon: <ArrowUpRight className="h-5 w-5" />,
    },
    {
      label: "Migration Rate",
      value: `${migrationRate.toFixed(1)}%`,
      target: "Target: <30%",
      targetValue: 30,
      actualValue: migrationRate,
      unit: "%",
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ];

  const getStatusColor = (kpi: KPICard) => {
    const ratio = kpi.actualValue / kpi.targetValue;
    // For migration rate, lower is better
    if (kpi.label === "Migration Rate") {
      if (kpi.actualValue <= kpi.targetValue) return "green";
      if (kpi.actualValue <= kpi.targetValue * 1.3) return "yellow";
      return "red";
    }
    if (ratio >= 1) return "green";
    if (ratio >= 0.7) return "yellow";
    return "red";
  };

  const colorMap = {
    green: {
      bg: "bg-green-500/10",
      text: "text-green-600",
      border: "border-green-500/30",
      bar: "bg-green-500",
      badge: "bg-green-500/10 text-green-600 border-green-500/30",
    },
    yellow: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-600",
      border: "border-yellow-500/30",
      bar: "bg-yellow-500",
      badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-600",
      border: "border-red-500/30",
      bar: "bg-red-500",
      badge: "bg-red-500/10 text-red-600 border-red-500/30",
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent KPIs</h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics &amp; targets
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const status = getStatusColor(kpi);
          const colors = colorMap[status];
          const pct = Math.min(
            (kpi.actualValue / kpi.targetValue) * 100,
            100
          );

          return (
            <Card key={kpi.label} className={`${colors.border} border`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <span className={colors.text}>{kpi.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className={`text-2xl font-bold ${colors.text}`}>
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={colors.badge}>
                    {status === "green" ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : status === "red" ? (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    ) : null}
                    {status === "green"
                      ? "On Target"
                      : status === "yellow"
                      ? "Near Target"
                      : "Below Target"}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{kpi.target}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${colors.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Portfolio Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-xl font-bold">{stats.totalAccounts}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Active Accounts
              </p>
              <p className="text-xl font-bold text-blue-600">
                {stats.activeAccounts}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Outstanding
              </p>
              <p className="text-xl font-bold text-red-600">
                AED{" "}
                {new Intl.NumberFormat("en-AE").format(stats.totalOutstanding)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg DPD</p>
              <p className="text-xl font-bold">
                {accounts.length > 0
                  ? Math.round(
                      accounts.reduce((sum, a) => sum + a.dpd, 0) /
                        accounts.length
                    )
                  : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bucket Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bucket Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["B1", "B2", "B3", "B4", "B5", "B6", "B7"].map((bucket) => {
              const count = stats.bucketCounts[bucket] || 0;
              const amount = stats.bucketAmounts[bucket] || 0;
              const pct =
                stats.totalAccounts > 0
                  ? (count / stats.totalAccounts) * 100
                  : 0;

              return (
                <div key={bucket} className="flex items-center gap-4">
                  <span className="font-mono font-bold w-8">{bucket}</span>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          bucket <= "B2"
                            ? "bg-green-500"
                            : bucket <= "B4"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-20 text-right">
                    {count} accts
                  </span>
                  <span className="text-sm text-muted-foreground w-32 text-right">
                    AED {new Intl.NumberFormat("en-AE").format(amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
