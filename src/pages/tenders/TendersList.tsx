import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formatPKR = (n: number) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-gray-100 text-gray-800",
  bid_prep: "bg-amber-100 text-amber-800",
  submitted: "bg-yellow-100 text-yellow-800",
  awarded: "bg-blue-100 text-blue-800",
  delivering: "bg-indigo-100 text-indigo-800",
  installed: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const TABS = ["all", "discovered", "bid_prep", "awarded", "delivering", "installed", "completed", "lost"];

export default function TendersList() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "welkin-demo";
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: tenders = [] } = useQuery({
    queryKey: ["tenders-list", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenders")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const filtered = tenders.filter((t: any) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (t.title || "").toLowerCase().includes(s) ||
        (t.tender_number || "").toLowerCase().includes(s) ||
        (t.issuing_authority || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Tenders</h1>
          <p className="text-muted-foreground mt-1">{tenders.length} total tenders</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" /> Add Tender
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title, tender #, authority..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tender #</th>
                <th className="text-left px-4 py-2 font-medium">Title</th>
                <th className="text-left px-4 py-2 font-medium">Authority</th>
                <th className="text-left px-4 py-2 font-medium">Category</th>
                <th className="text-left px-4 py-2 font-medium">Value</th>
                <th className="text-left px-4 py-2 font-medium">Deadline</th>
                <th className="text-left px-4 py-2 font-medium">Assigned</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No tenders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => (
                  <>
                    <tr
                      key={t.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{t.tender_number}</td>
                      <td className="px-4 py-2 max-w-xs truncate">{t.title}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{t.issuing_authority}</td>
                      <td className="px-4 py-2 text-xs">{t.category?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2 font-medium">{formatPKR(t.estimated_value)}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {t.submission_deadline ? formatDistanceToNow(new Date(t.submission_deadline), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs">{t.assigned_to || "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-800"}`}>
                          {t.status?.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                    {expandedId === t.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-2 text-sm">
                            <div><strong>Description:</strong> {t.description || "—"}</div>
                            {t.notes && <div><strong>Notes:</strong> {t.notes}</div>}
                            {Array.isArray(t.tags) && t.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {t.tags.map((tag: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            )}
                            {t.po_number && (
                              <div><strong>PO:</strong> {t.po_number} · {formatPKR(t.po_amount)}</div>
                            )}
                          </div>
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
