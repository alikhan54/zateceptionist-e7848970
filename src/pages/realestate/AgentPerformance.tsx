import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgentPerformance } from "@/hooks/useAgentPerformance";
import { Users, TrendingUp, DollarSign, Home, BarChart3, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useCurrency } from "@/hooks/useCurrency";


function TrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current > previous) return <ArrowUp className="h-3 w-3 text-green-600" />;
  if (current < previous) return <ArrowDown className="h-3 w-3 text-red-600" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
}

export default function AgentPerformance() {
  const { formatPrice } = useCurrency();
  const { metrics, isLoading, error, totals } = useAgentPerformance();

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Performance</h1>
        <p className="text-muted-foreground">Track team performance and conversion metrics</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viewings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : totals.totalViewings}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Closed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : totals.totalDeals}</div>
            <p className="text-xs text-muted-foreground">Year to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatPrice(totals.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">Team total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : totals.totalListings}</div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Table */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load data. Please try again.</p>
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading agent metrics...</p>
      ) : metrics.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No agent data available. Assign agents to viewings and deals to see performance metrics.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Agent Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium text-center">Viewings</th>
                    <th className="pb-3 font-medium text-center">Trend</th>
                    <th className="pb-3 font-medium text-center">Deals Closed</th>
                    <th className="pb-3 font-medium text-center">Active Deals</th>
                    <th className="pb-3 font-medium text-center">Listings</th>
                    <th className="pb-3 font-medium text-center">Conversion</th>
                    <th className="pb-3 font-medium text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.sort((a, b) => b.total_commission - a.total_commission).map((agent) => (
                    <tr key={agent.agent_id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">
                        <div className="font-medium">{agent.agent_name}</div>
                      </td>
                      <td className="py-3 text-center">{agent.viewings_this_month}</td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendIcon current={agent.viewings_this_month} previous={agent.viewings_last_month} />
                          <span className="text-xs text-muted-foreground">{agent.viewings_last_month} prev</span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={agent.deals_closed_ytd > 0 ? "default" : "outline"}>
                          {agent.deals_closed_ytd}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">{agent.deals_active}</td>
                      <td className="py-3 text-center">{agent.active_listings}</td>
                      <td className="py-3 text-center">
                        <Badge variant="outline" className={
                          agent.conversion_rate >= 30 ? "border-green-300 text-green-700" :
                          agent.conversion_rate >= 15 ? "border-yellow-300 text-yellow-700" :
                          "border-gray-200 text-gray-500"
                        }>
                          {agent.conversion_rate}%
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-medium">{formatPrice(agent.total_commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </RTLWrapper>
  );
}
