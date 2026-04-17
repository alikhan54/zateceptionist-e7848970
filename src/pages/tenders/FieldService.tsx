import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  dispatched: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUSES = ["pending", "dispatched", "in_progress", "completed"];

export default function FieldService() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";
  const [engineerFilter, setEngineerFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ["field-jobs", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("field_job_cards")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("assigned_date", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const engineers = Array.from(new Set(jobs.map((j: any) => j.assigned_engineer).filter(Boolean)));
  const filtered = engineerFilter === "all" ? jobs : jobs.filter((j: any) => j.assigned_engineer === engineerFilter);

  const counts: Record<string, number> = {};
  STATUSES.forEach((s) => (counts[s] = 0));
  jobs.forEach((j: any) => {
    if (counts[j.status] !== undefined) counts[j.status]++;
  });

  const duration = (checkin: string, checkout: string) => {
    if (!checkin || !checkout) return "—";
    const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="w-7 h-7" /> Field Service Jobs
        </h1>
        <p className="text-muted-foreground mt-1">{jobs.length} total jobs</p>
      </div>

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

      {/* Engineer filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Engineer:</label>
        <select
          className="border rounded px-3 py-1 text-sm bg-background"
          value={engineerFilter}
          onChange={(e) => setEngineerFilter(e.target.value)}
        >
          <option value="all">All ({jobs.length})</option>
          {engineers.map((e) => (
            <option key={e} value={e}>{e} ({jobs.filter((j: any) => j.assigned_engineer === e).length})</option>
          ))}
        </select>
      </div>

      {/* Jobs table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Job #</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Customer</th>
                <th className="text-left px-4 py-2 font-medium">City</th>
                <th className="text-left px-4 py-2 font-medium">Engineer</th>
                <th className="text-left px-4 py-2 font-medium">Assigned</th>
                <th className="text-left px-4 py-2 font-medium">Duration</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No jobs found.</td></tr>
              ) : (
                filtered.map((j: any) => (
                  <>
                    <tr
                      key={j.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{j.job_number}</td>
                      <td className="px-4 py-2 text-xs capitalize">{j.job_type}</td>
                      <td className="px-4 py-2 text-xs">{j.customer_name}</td>
                      <td className="px-4 py-2 text-xs">{j.city}</td>
                      <td className="px-4 py-2 text-xs">{j.assigned_engineer}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {j.assigned_date ? formatDistanceToNow(new Date(j.assigned_date), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs">{duration(j.checkin_time, j.checkout_time)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[j.status] || "bg-gray-100"}`}>
                          {j.status?.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                    {expandedId === j.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={8} className="px-4 py-3 text-sm space-y-1">
                          <div><strong>Site:</strong> {j.site_address}</div>
                          {j.work_description && <div><strong>Work:</strong> {j.work_description}</div>}
                          {j.completion_notes && <div><strong>Notes:</strong> {j.completion_notes}</div>}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
