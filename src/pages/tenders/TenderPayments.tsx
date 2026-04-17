import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, AlertCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formatPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const BUCKETS = [
  { key: "current", label: "Current", color: "bg-green-100 text-green-800" },
  { key: "1-30", label: "1-30 Days", color: "bg-yellow-100 text-yellow-800" },
  { key: "31-60", label: "31-60 Days", color: "bg-amber-100 text-amber-800" },
  { key: "61-90", label: "61-90 Days", color: "bg-orange-100 text-orange-800" },
  { key: "90+", label: "90+ Days", color: "bg-red-100 text-red-800" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  partially_paid: "bg-amber-100 text-amber-800",
};

export default function TenderPayments() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";

  const { data: payments = [] } = useQuery({
    queryKey: ["tender-payments", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("tender_payments")
        .select("*, tenders(tender_number, title)")
        .eq("tenant_id", tenantSlug)
        .order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const runAgingUpdate = async () => {
    try {
      await fetch("https://webhooks.zatesystems.com/webhook/payment-aging-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantSlug }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const bucketCounts: Record<string, { count: number; sum: number }> = {};
  BUCKETS.forEach((b) => (bucketCounts[b.key] = { count: 0, sum: 0 }));
  payments.forEach((p: any) => {
    const key = p.aging_bucket || "current";
    if (bucketCounts[key]) {
      bucketCounts[key].count += 1;
      bucketCounts[key].sum += Number(p.amount || 0);
    }
  });

  const overdueCount = payments.filter((p: any) => p.status === "overdue").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7" /> Payment Aging
          </h1>
          <p className="text-muted-foreground mt-1">Tender payment tracking by aging bucket</p>
        </div>
        <Button variant="outline" onClick={runAgingUpdate}>
          <RefreshCw className="w-4 h-4 mr-2" /> Run Aging Update
        </Button>
      </div>

      {overdueCount > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="text-sm">
            <strong className="text-red-900">{overdueCount} overdue payment{overdueCount > 1 ? "s" : ""}</strong>
            <span className="text-red-700 ml-1">requiring immediate follow-up.</span>
          </div>
        </div>
      )}

      {/* Bucket cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {BUCKETS.map((b) => {
          const data = bucketCounts[b.key];
          return (
            <Card key={b.key}>
              <CardContent className="pt-6">
                <div className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${b.color}`}>{b.label}</div>
                <div className="text-2xl font-bold">{data.count}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatPKR(data.sum)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payments table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Invoice #</th>
                <th className="text-left px-4 py-2 font-medium">Tender</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Due</th>
                <th className="text-left px-4 py-2 font-medium">Bucket</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payment records yet.</td></tr>
              ) : (
                payments.map((p: any) => {
                  const bucket = BUCKETS.find((b) => b.key === p.aging_bucket);
                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{p.invoice_number || "—"}</td>
                      <td className="px-4 py-2 text-xs">
                        <div className="font-medium">{p.tenders?.tender_number || "—"}</div>
                        <div className="text-muted-foreground truncate max-w-xs">{p.tenders?.title}</div>
                      </td>
                      <td className="px-4 py-2 text-xs capitalize">{p.payment_type}</td>
                      <td className="px-4 py-2 font-medium">{formatPKR(p.amount)}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {p.due_date ? formatDistanceToNow(new Date(p.due_date), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        {bucket && <span className={`text-xs px-2 py-0.5 rounded-full ${bucket.color}`}>{bucket.label}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-800"}`}>
                          {p.status?.replace("_", " ")}
                        </span>
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
