import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Banknote,
  Search,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  Phone,
  Loader2,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  useCollections,
  type CollectionsAccount,
} from "@/hooks/useCollections";

const BUCKET_COLORS: Record<string, string> = {
  B1: "bg-green-500",
  B2: "bg-lime-500",
  B3: "bg-yellow-500",
  B4: "bg-orange-500",
  B5: "bg-red-400",
  B6: "bg-red-600",
  B7: "bg-red-900",
};

const BUCKET_TEXT: Record<string, string> = {
  B1: "text-green-600",
  B2: "text-lime-600",
  B3: "text-yellow-600",
  B4: "text-orange-600",
  B5: "text-red-400",
  B6: "text-red-600",
  B7: "text-red-900",
};

const BUCKET_LABELS: Record<string, string> = {
  B1: "1-30 DPD",
  B2: "31-60 DPD",
  B3: "61-90 DPD",
  B4: "91-120 DPD",
  B5: "121-150 DPD",
  B6: "151-180 DPD",
  B7: "180+ DPD",
};

const BUCKET_TABS = [
  { key: "all", label: "All" },
  { key: "B1", label: "B1" },
  { key: "B2", label: "B2" },
  { key: "B3", label: "B3" },
  { key: "B4", label: "B4" },
  { key: "B5", label: "B5" },
  { key: "B6", label: "B6" },
  { key: "B7", label: "B7" },
];

const STATUS_BADGE: Record<string, string> = {
  active: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  paid_in_full: "bg-green-500/10 text-green-600 border-green-500/30",
  settled: "bg-teal-500/10 text-teal-600 border-teal-500/30",
  write_off: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  legal: "bg-red-500/10 text-red-600 border-red-500/30",
};

export default function CollectionsDashboard() {
  const [bucketFilter, setBucketFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] =
    useState<CollectionsAccount | null>(null);

  const { accounts, isLoading, stats } = useCollections(
    bucketFilter === "all" ? undefined : bucketFilter
  );

  const filteredAccounts = searchTerm
    ? accounts.filter(
        (a) =>
          a.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.account_number?.includes(searchTerm) ||
          a.client_phone?.includes(searchTerm)
      )
    : accounts;

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-AE", { minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collections Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Portfolio overview &amp; account management
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalAccounts}</p>
            <p className="text-sm text-muted-foreground">Total Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {formatAmount(stats.totalOutstanding)}
            </p>
            <p className="text-sm text-muted-foreground">Outstanding (AED)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {stats.activeAccounts}
            </p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.ptpsDueThisWeek}
            </p>
            <p className="text-sm text-muted-foreground">PTPs This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.cureRate.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">Cure Rate (PKR)</p>
          </CardContent>
        </Card>
      </div>

      {/* Bucket Distribution Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Bucket Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex rounded-lg overflow-hidden h-8 mb-3">
            {["B1", "B2", "B3", "B4", "B5", "B6", "B7"].map((bucket) => {
              const count = stats.bucketCounts[bucket] || 0;
              const pct =
                stats.totalAccounts > 0
                  ? (count / stats.totalAccounts) * 100
                  : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={bucket}
                  className={`${BUCKET_COLORS[bucket]} flex items-center justify-center text-white text-xs font-bold transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${bucket}: ${count} accounts (${pct.toFixed(0)}%)`}
                >
                  {pct > 8 ? `${bucket} (${count})` : count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {["B1", "B2", "B3", "B4", "B5", "B6", "B7"].map((bucket) => (
              <div key={bucket} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${BUCKET_COLORS[bucket]}`}
                />
                <span className="text-muted-foreground">
                  {bucket} ({BUCKET_LABELS[bucket]}):{" "}
                  <strong className={BUCKET_TEXT[bucket]}>
                    {formatAmount(stats.bucketAmounts[bucket] || 0)} AED
                  </strong>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bucket Tabs + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-1">
          {BUCKET_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={bucketFilter === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setBucketFilter(tab.key)}
            >
              {tab.label}
              {tab.key !== "all" && stats.bucketCounts[tab.key] ? (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {stats.bucketCounts[tab.key]}
                </Badge>
              ) : null}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Accounts Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading accounts...
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No accounts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredAccounts.map((acct) => {
            const bucketColor = BUCKET_TEXT[acct.bucket] || "text-gray-600";
            return (
              <Card
                key={acct.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  setSelectedAccount(
                    selectedAccount?.id === acct.id ? null : acct
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-mono font-bold">
                          {acct.account_number}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold ${bucketColor}`}
                        >
                          {acct.bucket} &middot; {acct.dpd}d
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{acct.client_name}</p>
                          <Badge
                            variant="outline"
                            className={
                              STATUS_BADGE[acct.status] || STATUS_BADGE.active
                            }
                          >
                            {acct.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {acct.product_type?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            AED {formatAmount(acct.outstanding_balance)}
                          </span>
                          {acct.monthly_payment && (
                            <span>EMI: {formatAmount(acct.monthly_payment)}</span>
                          )}
                          {acct.assigned_team && (
                            <span>{acct.assigned_team.replace(/_/g, " ")}</span>
                          )}
                        </div>
                        {/* PTP info */}
                        {acct.ptp_status === "pending" && acct.ptp_date && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-yellow-600">
                            <Calendar className="h-3 w-3" />
                            PTP: AED {formatAmount(acct.ptp_amount || 0)} due{" "}
                            {acct.ptp_date}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {acct.total_contact_attempts || 0} contacts
                        </div>
                        {acct.last_contact_date && (
                          <div className="text-xs">
                            Last:{" "}
                            {new Date(
                              acct.last_contact_date
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          selectedAccount?.id === acct.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {selectedAccount?.id === acct.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Original Amount</p>
                        <p className="font-medium">
                          AED {formatAmount(acct.original_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p className="font-medium">{acct.due_date || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Payment</p>
                        <p className="font-medium">
                          {acct.last_payment_date
                            ? `AED ${formatAmount(
                                acct.last_payment_amount || 0
                              )} on ${acct.last_payment_date}`
                            : "None"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">PTP History</p>
                        <p className="font-medium">
                          Total: {acct.ptp_count} | Kept: {acct.ptp_kept_count}{" "}
                          | Broken: {acct.ptp_broken_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">
                          {acct.client_phone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">
                          {acct.client_email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Action</p>
                        <p className="font-medium">
                          {acct.next_action || "None scheduled"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Settlement</p>
                        <p className="font-medium">
                          {acct.settlement_status || "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
