import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Microscope, Search } from "lucide-react";

const COUNTRY_FLAGS: Record<string, string> = {
  Germany: "🇩🇪",
  China: "🇨🇳",
  Spain: "🇪🇸",
  Poland: "🇵🇱",
  Japan: "🇯🇵",
  USA: "🇺🇸",
  UK: "🇬🇧",
};

const STATUS_COLORS: Record<string, string> = {
  in_stock: "bg-blue-100 text-blue-800",
  allocated: "bg-amber-100 text-amber-800",
  installed: "bg-green-100 text-green-800",
  under_repair: "bg-red-100 text-red-800",
  decommissioned: "bg-gray-100 text-gray-800",
};

const STATUSES = ["in_stock", "allocated", "installed", "under_repair", "decommissioned"];

export default function Instruments() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";
  const [search, setSearch] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["instrument-registry", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("instrument_registry")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const filtered = items.filter((i: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (i.serial_number || "").toLowerCase().includes(s) ||
      (i.model_name || "").toLowerCase().includes(s) ||
      (i.customer_name || "").toLowerCase().includes(s) ||
      (i.brand || "").toLowerCase().includes(s)
    );
  });

  const counts: Record<string, number> = {};
  STATUSES.forEach((s) => (counts[s] = 0));
  items.forEach((i: any) => {
    if (counts[i.status] !== undefined) counts[i.status]++;
  });

  const now = Date.now();
  const warrantyExpiringSoon = (endDate: string) => {
    if (!endDate) return false;
    const days = (new Date(endDate).getTime() - now) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 30;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Microscope className="w-7 h-7" /> Instrument Registry
        </h1>
        <p className="text-muted-foreground mt-1">{items.length} instruments tracked</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search serial, model, customer..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Serial #</th>
                <th className="text-left px-4 py-2 font-medium">Model</th>
                <th className="text-left px-4 py-2 font-medium">Brand</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Origin</th>
                <th className="text-left px-4 py-2 font-medium">Customer</th>
                <th className="text-left px-4 py-2 font-medium">Warranty End</th>
                <th className="text-left px-4 py-2 font-medium">Calibration Due</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No instruments match.</td></tr>
              ) : (
                filtered.map((i: any) => (
                  <tr key={i.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-xs">{i.serial_number}</td>
                    <td className="px-4 py-2 text-xs">{i.model_name}</td>
                    <td className="px-4 py-2 text-xs">{i.brand}</td>
                    <td className="px-4 py-2 text-xs capitalize">{i.category}</td>
                    <td className="px-4 py-2 text-xs">
                      {COUNTRY_FLAGS[i.country_of_origin] || "🏳️"} {i.country_of_origin}
                    </td>
                    <td className="px-4 py-2 text-xs">{i.customer_name || <span className="text-muted-foreground">—</span>}</td>
                    <td className={`px-4 py-2 text-xs ${warrantyExpiringSoon(i.warranty_end) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {i.warranty_end ? new Date(i.warranty_end).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {i.calibration_due_date ? new Date(i.calibration_due_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[i.status] || "bg-gray-100"}`}>
                        {i.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
