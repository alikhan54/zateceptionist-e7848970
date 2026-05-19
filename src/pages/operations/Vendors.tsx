import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Truck,
  Search,
  Star,
  CheckCircle2,
  Clock,
  Globe,
  Tag,
  Loader2,
  Sparkles,
} from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-sm">--</span>;
  const s = Number(score);
  const cls =
    s >= 4.5
      ? "bg-green-500/10 text-green-600 border-green-500/30"
      : s >= 4.0
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : s >= 3.5
      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
      : "bg-red-500/10 text-red-600 border-red-500/30";
  return (
    <Badge variant="outline" className={cls}>
      <Star className="h-3 w-3 mr-1 fill-current" />
      {s.toFixed(2)} / 5
    </Badge>
  );
}

export default function Vendors() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id ?? "";
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [scoring, setScoring] = useState(false);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["ops_vendors", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_vendors")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("score", { ascending: false, nullsFirst: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const filtered = useMemo(() => {
    if (!searchTerm) return vendors;
    const term = searchTerm.toLowerCase();
    return vendors.filter(
      (v: any) =>
        (v.name || "").toLowerCase().includes(term) ||
        (v.city || "").toLowerCase().includes(term) ||
        (v.country || "").toLowerCase().includes(term) ||
        (v.categories || []).some((c: string) => c.toLowerCase().includes(term))
    );
  }, [vendors, searchTerm]);

  const stats = useMemo(() => {
    const total = vendors.length;
    const approved = vendors.filter((v: any) => v.is_approved && !v.is_blacklisted).length;
    const avgScore =
      vendors.length > 0
        ? vendors.reduce((sum: number, v: any) => sum + Number(v.score || 0), 0) /
          vendors.length
        : 0;
    const topPerformer = vendors[0]?.name ?? "--";
    return { total, approved, avgScore, topPerformer };
  }, [vendors]);

  const handleScoreVendors = async () => {
    setScoring(true);
    try {
      const resp = await fetch(
        "https://webhooks.zatesystems.com/webhook/ops/dispatch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenantSlug,
            tenant_slug: tenantSlug,
            industry: tenantConfig?.industry ?? "",
            region: tenantConfig?.region ?? "",
            goal: "DIPLOMAT: re-score all vendors based on the last 30 days of performance data",
            mode: "auto",
          }),
        }
      );
      if (resp.ok) {
        toast.success("DIPLOMAT scoring vendors — refresh in a few seconds");
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["ops_vendors", tenantSlug] });
        }, 4000);
      } else {
        toast.error(`Scoring failed (HTTP ${resp.status})`);
      }
    } catch (err: any) {
      toast.error("Scoring failed: " + (err?.message || "network error"));
    } finally {
      setScoring(false);
    }
  };

  if (!tenantConfig) return <PageLoading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-500" />
            Vendors
          </h1>
          <p className="text-muted-foreground mt-1">
            DIPLOMAT agent ranks suppliers by reliability, quality, and price
          </p>
        </div>
        <Button onClick={handleScoreVendors} disabled={scoring}>
          {scoring ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scoring...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" /> Score Vendors
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Vendors</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg. Score</p>
            <p className="text-2xl font-bold text-amber-500">
              {stats.avgScore.toFixed(2)} / 5
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Performer</p>
            <p className="text-base font-semibold truncate" title={stats.topPerformer}>
              {stats.topPerformer}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <PageLoading />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No vendors found</p>
            <p className="text-sm">Adjust your search or add a new vendor.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v: any) => (
            <Card key={v.id} className="hover:border-blue-500/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" title={v.name}>
                      {v.name}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                      <Globe className="h-3 w-3" />
                      <span>
                        {[v.city, v.country].filter(Boolean).join(", ") || "Location not set"}
                      </span>
                    </div>
                  </div>
                  <ScoreBadge score={v.score} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Categories */}
                <div className="flex flex-wrap gap-1">
                  {(v.categories || []).slice(0, 4).map((c: string) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="text-xs flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      {c}
                    </Badge>
                  ))}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {v.lead_time_days != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {v.lead_time_days}d lead
                    </span>
                  )}
                  {v.payment_terms && (
                    <span>{v.payment_terms}</span>
                  )}
                  {v.currency && <span>{v.currency}</span>}
                  {v.is_approved && !v.is_blacklisted && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </span>
                  )}
                </div>

                {(v.email || v.phone || v.whatsapp) && (
                  <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
                    {v.email && <div className="truncate">{v.email}</div>}
                    {v.phone && <div>{v.phone}</div>}
                    {v.whatsapp && <div>WhatsApp: {v.whatsapp}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
