import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ArrowRight,
  Percent,
} from "lucide-react";
import { useCollections, type Settlement } from "@/hooks/useCollections";

const PIPELINE_STAGES = [
  "offered",
  "pending_approval",
  "approved",
  "accepted",
  "paid",
];

const STAGE_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  offered: {
    label: "Offered",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: <Banknote className="h-3 w-3" />,
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  accepted: {
    label: "Accepted",
    className: "bg-teal-500/10 text-teal-600 border-teal-500/30",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: <XCircle className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    className: "bg-gray-500/10 text-gray-600 border-gray-500/30",
    icon: <Clock className="h-3 w-3" />,
  },
};

export default function SettlementTracker() {
  const { accounts, isLoading } = useCollections();
  const { data: settlements = [], isLoading: settlementsLoading } =
    useCollections().useSettlements(null);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-AE", { minimumFractionDigits: 0 }).format(amount);

  // Group settlements by stage
  const stageGroups: Record<string, Settlement[]> = {};
  for (const stage of PIPELINE_STAGES) {
    stageGroups[stage] = settlements.filter((s) => s.status === stage);
  }
  const rejected = settlements.filter((s) => s.status === "rejected");
  const expired = settlements.filter((s) => s.status === "expired");

  // Stats
  const totalOffered = settlements.length;
  const totalPaid = settlements.filter((s) => s.status === "paid").length;
  const totalSettledAmount = settlements
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.settled_amount, 0);
  const avgDiscount =
    settlements.length > 0
      ? settlements.reduce((sum, s) => sum + (s.discount_percent || 0), 0) /
        settlements.length
      : 0;

  // Find account name for a settlement
  const getAccountInfo = (accountId: string) => {
    const acct = accounts.find((a) => a.id === accountId);
    return acct
      ? { name: acct.client_name, number: acct.account_number }
      : { name: "Unknown", number: "N/A" };
  };

  if (isLoading || settlementsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settlement Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Settlement offers pipeline &amp; approvals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalOffered}</p>
            <p className="text-sm text-muted-foreground">Total Offers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalPaid}</p>
            <p className="text-sm text-muted-foreground">Paid / Closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">
              {formatAmount(totalSettledAmount)}
            </p>
            <p className="text-sm text-muted-foreground">Collected (AED)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {avgDiscount.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">Avg Discount</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline View */}
      {settlements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No settlement offers yet</p>
            <p className="text-sm">
              Settlements can be offered for B5+ accounts via voice AI or
              manually
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pipeline columns */}
          <div className="flex items-center gap-2 mb-2">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div key={stage} className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={STAGE_CONFIG[stage].className}
                >
                  {STAGE_CONFIG[stage].label} ({stageGroups[stage]?.length || 0})
                </Badge>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Settlement Cards */}
          <div className="space-y-2">
            {settlements.map((s) => {
              const acctInfo = getAccountInfo(s.account_id);
              const stageCfg =
                STAGE_CONFIG[s.status] || STAGE_CONFIG.offered;
              return (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-center min-w-[80px]">
                          <p className="text-sm font-mono font-bold">
                            {acctInfo.number}
                          </p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{acctInfo.name}</p>
                            <Badge
                              variant="outline"
                              className={`${stageCfg.className} flex items-center gap-1`}
                            >
                              {stageCfg.icon}
                              {stageCfg.label}
                            </Badge>
                            {s.authority_level && (
                              <Badge variant="secondary" className="text-xs">
                                {s.authority_level.replace(/_/g, " ")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="text-muted-foreground">
                              Original: AED{" "}
                              <strong>
                                {formatAmount(s.original_outstanding)}
                              </strong>
                            </span>
                            <span className="flex items-center gap-1 text-green-600">
                              <Percent className="h-3 w-3" />
                              {s.discount_percent || 0}% off
                            </span>
                            <span className="font-medium">
                              Settlement: AED{" "}
                              <strong>{formatAmount(s.settled_amount)}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {s.offer_date && (
                              <span>Offered: {s.offer_date}</span>
                            )}
                            {s.expiry_date && (
                              <span>Expires: {s.expiry_date}</span>
                            )}
                            {s.payment_method && (
                              <span>Method: {s.payment_method}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Rejected / Expired */}
          {(rejected.length > 0 || expired.length > 0) && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Rejected ({rejected.length}) &middot; Expired ({expired.length})
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
