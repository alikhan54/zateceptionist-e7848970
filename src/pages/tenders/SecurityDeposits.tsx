import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formatPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  held: { label: "Held", color: "bg-blue-100 text-blue-800", icon: Lock },
  claim_pending: { label: "Claim Pending", color: "bg-amber-100 text-amber-800", icon: RefreshCw },
  released: { label: "Released", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  forfeited: { label: "Forfeited", color: "bg-red-100 text-red-800", icon: XCircle },
};

const maturityColor = (days: number) => {
  if (days <= 0) return "text-red-600 font-semibold";
  if (days < 7) return "text-red-600";
  if (days < 30) return "text-amber-600";
  if (days < 90) return "text-yellow-600";
  return "text-green-600";
};

export default function SecurityDeposits() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";

  const { data: deposits = [] } = useQuery({
    queryKey: ["security-deposits", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_deposits")
        .select("*, tenders(tender_number, title)")
        .eq("tenant_id", tenantSlug)
        .order("maturity_date", { ascending: true });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const byStatus: Record<string, { count: number; sum: number }> = {};
  Object.keys(STATUS_META).forEach((k) => (byStatus[k] = { count: 0, sum: 0 }));
  deposits.forEach((d: any) => {
    if (byStatus[d.status]) {
      byStatus[d.status].count += 1;
      byStatus[d.status].sum += Number(d.amount || 0);
    }
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-7 h-7" /> Security Deposits
        </h1>
        <p className="text-muted-foreground mt-1">Bid securities, performance guarantees, retention money</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_META).map(([k, meta]) => {
          const Icon = meta.icon;
          return (
            <Card key={k}>
              <CardContent className="pt-6">
                <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2 ${meta.color}`}>
                  <Icon className="w-3 h-3" /> {meta.label}
                </div>
                <div className="text-2xl font-bold">{byStatus[k]?.count || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatPKR(byStatus[k]?.sum || 0)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Deposits table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Guarantee #</th>
                <th className="text-left px-4 py-2 font-medium">Tender</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Bank</th>
                <th className="text-left px-4 py-2 font-medium">Submitted</th>
                <th className="text-left px-4 py-2 font-medium">Maturity</th>
                <th className="text-left px-4 py-2 font-medium">Days Left</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {deposits.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No security deposits on record.</td></tr>
              ) : (
                deposits.map((d: any) => {
                  const meta = STATUS_META[d.status];
                  const days = d.days_to_maturity ?? 0;
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{d.guarantee_number || "—"}</td>
                      <td className="px-4 py-2 text-xs">
                        <div className="font-medium">{d.tenders?.tender_number || "—"}</div>
                        <div className="text-muted-foreground truncate max-w-xs">{d.tenders?.title}</div>
                      </td>
                      <td className="px-4 py-2 text-xs capitalize">{d.deposit_type?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2 font-medium">{formatPKR(d.amount)}</td>
                      <td className="px-4 py-2 text-xs">{d.bank_name || "—"}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {d.submitted_date ? formatDistanceToNow(new Date(d.submitted_date), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {d.maturity_date ? new Date(d.maturity_date).toLocaleDateString() : "—"}
                      </td>
                      <td className={`px-4 py-2 text-xs ${maturityColor(days)}`}>
                        {days <= 0 ? "Matured" : `${days} days`}
                      </td>
                      <td className="px-4 py-2">
                        {meta && <span className={`text-xs px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
