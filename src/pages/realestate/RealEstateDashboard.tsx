import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRealEstateListings } from "@/hooks/useRealEstateListings";
import { useRealEstateClients } from "@/hooks/useRealEstateClients";
import { useRealEstateDeals } from "@/hooks/useRealEstateDeals";
import { useRealEstateViewings } from "@/hooks/useRealEstateViewings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Building2, Users, DollarSign, Calendar, TrendingUp, Home, Handshake, Target, Sparkles, AlertTriangle, Link2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

const stageLabels: Record<string, string> = {
  offer: "Offer",
  negotiation: "Negotiation",
  mou_signing: "MOU Signing",
  deposit_received: "Deposit Received",
  noc_applied: "NOC Applied",
  noc_received: "NOC Received",
  dld_transfer: "DLD Transfer",
  completed: "Completed",
};

const stageColors: Record<string, string> = {
  offer: "bg-blue-100 text-blue-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  mou_signing: "bg-purple-100 text-purple-800",
  deposit_received: "bg-indigo-100 text-indigo-800",
  noc_applied: "bg-orange-100 text-orange-800",
  noc_received: "bg-teal-100 text-teal-800",
  dld_transfer: "bg-pink-100 text-pink-800",
  completed: "bg-green-100 text-green-800",
};

export default function RealEstateDashboard() {
  const { tenantId } = useTenant();
  const { stats: listingStats, isLoading: listingsLoading, error: listingsError } = useRealEstateListings();
  const { clients, stats: clientStats, isLoading: clientsLoading, error: clientsError } = useRealEstateClients();
  const { deals, stats: dealStats, isLoading: dealsLoading, error: dealsError } = useRealEstateDeals();
  const { stats: viewingStats, isLoading: viewingsLoading, error: viewingsError } = useRealEstateViewings();

  const { data: recentMatches = [] } = useQuery({
    queryKey: ["re-matches-recent", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("re_matches" as any)
        .select("*, client:re_clients!client_id(full_name), listing:re_listings!listing_id(title, community, price)")
        .eq("tenant_id", tenantId)
        .eq("status", "new")
        .order("match_score", { ascending: false })
        .limit(5);
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const { data: complianceAlerts = [] } = useQuery({
    queryKey: ["re-compliance-alerts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("re_compliance_alerts" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .is("acknowledged_at", null)
        .order("severity", { ascending: true })
        .limit(5);
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const isLoading = listingsLoading || clientsLoading || dealsLoading || viewingsLoading;
  const hasError = listingsError || clientsError || dealsError || viewingsError;

  if (hasError) {
    return (
      <RTLWrapper>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-red-500">Failed to load data. Please try again.</p>
          </div>
        </div>
      </RTLWrapper>
    );
  }

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Real Estate Dashboard</h1>
        <p className="text-muted-foreground">Dubai property brokerage overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : listingStats.activeListings}</div>
            <p className="text-xs text-muted-foreground">{listingStats.forSale} sale, {listingStats.forRent} rent, {listingStats.offPlan} off-plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewings This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : viewingStats.thisWeekViewings}</div>
            <p className="text-xs text-muted-foreground">{viewingStats.todayViewings} today, {viewingStats.conversionRate}% interest rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatAED(dealStats.pipelineValue)}</div>
            <p className="text-xs text-muted-foreground">{dealStats.activeDeals} active deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatAED(dealStats.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">{formatAED(dealStats.commissionPending)} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats.activeClients}</div>
            <p className="text-xs text-muted-foreground">{clientStats.buyers} buyers, {clientStats.investors} investors, {clientStats.tenants} tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Price/sqft</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatAED(listingStats.avgPricePerSqft)}</div>
            <p className="text-xs text-muted-foreground">Across {listingStats.communities.length} communities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatAED(listingStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">{listingStats.totalListings} total listings</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel + Recent Deals */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" /> Deal Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dealStats.pipeline.filter(p => p.count > 0).map((p) => (
              <div key={p.stage} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={stageColors[p.stage] || "bg-gray-100 text-gray-800"}>{stageLabels[p.stage] || p.stage}</Badge>
                  <span className="text-sm text-muted-foreground">{p.count} deal{p.count !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-sm font-medium">{formatAED(p.value)}</span>
              </div>
            ))}
            {dealStats.pipeline.every(p => p.count === 0) && (
              <p className="text-sm text-muted-foreground">No active deals in pipeline</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Top Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.slice(0, 5).map((client) => (
              <div key={client.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{client.full_name}</p>
                  <p className="text-xs text-muted-foreground">{client.nationality} &middot; {client.client_type} &middot; {client.financing}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={client.client_tier === "vip" ? "default" : "outline"}>
                    {client.client_tier.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-medium">{client.ai_score}</span>
                </div>
              </div>
            ))}
            {clients.length === 0 && <p className="text-sm text-muted-foreground">No clients yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* AI Matches + Compliance Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> AI Property Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMatches.length > 0 ? recentMatches.map((match: any) => (
              <div key={match.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{match.client?.full_name || "Client"}</p>
                  <p className="text-xs text-muted-foreground">
                    {match.listing?.title || "Listing"} &middot; {match.listing?.community}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={match.match_score >= 80 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {match.match_score}%
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No new matches. The auto-matcher runs every 30 minutes.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {complianceAlerts.length > 0 ? complianceAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-2 border-b pb-2 last:border-0">
                <Badge className={
                  alert.severity === "critical" ? "bg-red-100 text-red-800 mt-0.5" :
                  alert.severity === "warning" ? "bg-yellow-100 text-yellow-800 mt-0.5" :
                  "bg-blue-100 text-blue-800 mt-0.5"
                }>
                  {alert.severity}
                </Badge>
                <div>
                  <p className="text-sm">{alert.message}</p>
                  {alert.days_remaining !== null && alert.days_remaining > 0 && (
                    <p className="text-xs text-muted-foreground">{alert.days_remaining} days remaining</p>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No compliance alerts. All deals are on track.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </RTLWrapper>
  );
}
