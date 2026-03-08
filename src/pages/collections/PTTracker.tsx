import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Banknote,
} from "lucide-react";
import { useCollections } from "@/hooks/useCollections";

const PTP_STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "kept", label: "Kept" },
  { key: "broken", label: "Broken" },
];

const PTP_STATUS_BADGE: Record<string, { className: string; icon: React.ReactNode }> = {
  pending: {
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    icon: <Clock className="h-3 w-3" />,
  },
  kept: {
    className: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  broken: {
    className: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: <XCircle className="h-3 w-3" />,
  },
};

export default function PTTracker() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { accounts, isLoading, stats } = useCollections();

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-AE", { minimumFractionDigits: 0 }).format(amount);

  // Filter accounts that have PTPs
  const ptpAccounts = accounts.filter((a) => a.ptp_count > 0 || a.ptp_status);

  const filteredAccounts =
    statusFilter === "all"
      ? ptpAccounts
      : ptpAccounts.filter((a) => a.ptp_status === statusFilter);

  const today = new Date().toISOString().split("T")[0];

  // Sort: pending first, then by ptp_date ascending
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (a.ptp_status === "pending" && b.ptp_status !== "pending") return -1;
    if (a.ptp_status !== "pending" && b.ptp_status === "pending") return 1;
    if (a.ptp_date && b.ptp_date) return a.ptp_date.localeCompare(b.ptp_date);
    return 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PTP Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Promise-to-Pay monitoring &amp; follow-up
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.ptpsPending}
            </p>
            <p className="text-sm text-muted-foreground">Pending PTPs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {stats.ptpsDueThisWeek}
            </p>
            <p className="text-sm text-muted-foreground">Due This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.ptpsKept}
            </p>
            <p className="text-sm text-muted-foreground">Kept (Total)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {stats.ptpsBroken}
            </p>
            <p className="text-sm text-muted-foreground">Broken (Total)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1">
        {PTP_STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* PTP List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading PTPs...
        </div>
      ) : sortedAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No PTPs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedAccounts.map((acct) => {
            const ptpBadge =
              PTP_STATUS_BADGE[acct.ptp_status || "pending"] ||
              PTP_STATUS_BADGE.pending;
            const isToday = acct.ptp_date === today;
            const isOverdue =
              acct.ptp_status === "pending" &&
              acct.ptp_date &&
              acct.ptp_date < today;

            return (
              <Card
                key={acct.id}
                className={
                  isToday
                    ? "border-blue-500 bg-blue-500/5"
                    : isOverdue
                    ? "border-red-500 bg-red-500/5"
                    : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-mono font-bold">
                          {acct.account_number}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {acct.bucket}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{acct.client_name}</p>
                          <Badge
                            variant="outline"
                            className={`${ptpBadge.className} flex items-center gap-1`}
                          >
                            {ptpBadge.icon}
                            {acct.ptp_status || "none"}
                          </Badge>
                          {isToday && (
                            <Badge className="bg-blue-600 text-xs">
                              DUE TODAY
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> OVERDUE
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Banknote className="h-3 w-3" />
                            PTP: AED{" "}
                            <strong>{formatAmount(acct.ptp_amount || 0)}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Due: <strong>{acct.ptp_date || "N/A"}</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Outstanding: AED{" "}
                            {formatAmount(acct.outstanding_balance)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Total PTPs: {acct.ptp_count}</span>
                          <span className="text-green-600">
                            Kept: {acct.ptp_kept_count}
                          </span>
                          <span className="text-red-600">
                            Broken: {acct.ptp_broken_count}
                          </span>
                          <span>
                            PKR:{" "}
                            {acct.ptp_kept_count + acct.ptp_broken_count > 0
                              ? (
                                  (acct.ptp_kept_count /
                                    (acct.ptp_kept_count +
                                      acct.ptp_broken_count)) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
