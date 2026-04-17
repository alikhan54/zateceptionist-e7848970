import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formatPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expiring_soon: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  renewed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const VISIT_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
  rescheduled: "bg-amber-100 text-amber-800",
};

const STATUSES = ["active", "expiring_soon", "expired", "renewed"];

const daysColor = (days: number) => {
  if (days <= 0) return "text-red-600 font-semibold";
  if (days < 30) return "text-amber-600 font-semibold";
  if (days < 90) return "text-yellow-600";
  return "text-green-600";
};

export default function AMCContracts() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";

  const { data: contracts = [] } = useQuery({
    queryKey: ["amc-contracts", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("maintenance_contracts")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("end_date", { ascending: true });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["service-visits", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_visits")
        .select("*, maintenance_contracts(contract_number, customer_name)")
        .eq("tenant_id", tenantSlug)
        .order("scheduled_date", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const counts: Record<string, number> = {};
  STATUSES.forEach((s) => (counts[s] = 0));
  contracts.forEach((c: any) => {
    if (counts[c.status] !== undefined) counts[c.status]++;
  });

  const expiringSoon = contracts.filter(
    (c: any) => c.status === "expiring_soon" || (c.days_to_expiry !== null && c.days_to_expiry < 30 && c.days_to_expiry >= 0)
  );

  const upcomingVisits = visits.filter((v: any) => v.status === "scheduled");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCheck className="w-7 h-7" /> AMC Contracts
        </h1>
        <p className="text-muted-foreground mt-1">{contracts.length} maintenance contracts</p>
      </div>

      {expiringSoon.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="text-sm text-amber-900">
            <strong>{expiringSoon.length} contract{expiringSoon.length > 1 ? "s" : ""}</strong> expiring in the next 30 days — start renewal discussions now.
          </div>
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUSES.map((s) => (
          <Card key={s}>
            <CardContent className="pt-6">
              <div className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 capitalize ${STATUS_COLORS[s]}`}>
                {s.replace(/_/g, " ")}
              </div>
              <div className="text-2xl font-bold">{counts[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="visits">Upcoming Visits ({upcomingVisits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Contract #</th>
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-left px-4 py-2 font-medium">Instrument</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Annual Value</th>
                    <th className="text-left px-4 py-2 font-medium">End Date</th>
                    <th className="text-left px-4 py-2 font-medium">Days Left</th>
                    <th className="text-left px-4 py-2 font-medium">Visits</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No contracts yet.</td></tr>
                  ) : (
                    contracts.map((c: any) => (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{c.contract_number}</td>
                        <td className="px-4 py-2 text-xs">{c.customer_name}</td>
                        <td className="px-4 py-2 text-xs">
                          <div>{c.instrument_model}</div>
                          <div className="text-muted-foreground">{c.instrument_serial}</div>
                        </td>
                        <td className="px-4 py-2 text-xs capitalize">{c.contract_type?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 font-medium">{formatPKR(c.annual_value)}</td>
                        <td className="px-4 py-2 text-xs">
                          {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                        </td>
                        <td className={`px-4 py-2 text-xs ${daysColor(c.days_to_expiry ?? 9999)}`}>
                          {c.days_to_expiry === null ? "—" : c.days_to_expiry <= 0 ? "Expired" : `${c.days_to_expiry} days`}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {c.visits_completed || 0}/{c.visits_per_year || 0}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] || "bg-gray-100"}`}>
                            {c.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Contract</th>
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Scheduled</th>
                    <th className="text-left px-4 py-2 font-medium">Engineer</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No visits scheduled.</td></tr>
                  ) : (
                    visits.map((v: any) => (
                      <tr key={v.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{v.maintenance_contracts?.contract_number || "—"}</td>
                        <td className="px-4 py-2 text-xs">{v.maintenance_contracts?.customer_name || "—"}</td>
                        <td className="px-4 py-2 text-xs capitalize">{v.visit_type}</td>
                        <td className="px-4 py-2 text-xs">
                          {v.scheduled_date ? formatDistanceToNow(new Date(v.scheduled_date), { addSuffix: true }) : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs">{v.engineer_name || "—"}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${VISIT_STATUS_COLORS[v.status] || "bg-gray-100"}`}>
                            {v.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
