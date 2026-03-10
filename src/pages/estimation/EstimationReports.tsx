import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEstimationProjects } from "@/hooks/useEstimationProjects";
import { useEstimationTeam } from "@/hooks/useEstimationTeam";
import { useEstimationRFIs } from "@/hooks/useEstimationRFIs";
import { TrendingUp, DollarSign, Clock, BarChart3, Users, HelpCircle } from "lucide-react";

export default function EstimationReports() {
  const { projects, stats: projectStats } = useEstimationProjects();
  const { stats: teamStats } = useEstimationTeam();
  const { stats: rfiStats } = useEstimationRFIs();

  const awarded = projects.filter(p => p.status === "awarded");
  const lost = projects.filter(p => p.status === "lost");
  const awardedValue = awarded.reduce((s, p) => s + (p.estimated_project_value || 0), 0);
  const lostValue = lost.reduce((s, p) => s + (p.estimated_project_value || 0), 0);

  // Group by month
  const monthlyData: Record<string, { created: number; awarded: number; lost: number; value: number }> = {};
  projects.forEach(p => {
    const month = p.created_at?.substring(0, 7) || "unknown";
    if (!monthlyData[month]) monthlyData[month] = { created: 0, awarded: 0, lost: 0, value: 0 };
    monthlyData[month].created++;
    if (p.status === "awarded") { monthlyData[month].awarded++; monthlyData[month].value += p.estimated_project_value || 0; }
    if (p.status === "lost") monthlyData[month].lost++;
  });
  const months = Object.entries(monthlyData).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);

  // Turnaround analysis
  const completedWithDates = projects.filter(p => p.actual_completion && p.received_at);
  const avgTurnaround = completedWithDates.length > 0
    ? Math.round(completedWithDates.reduce((s, p) => {
        const days = (new Date(p.actual_completion!).getTime() - new Date(p.received_at).getTime()) / (1000 * 60 * 60 * 24);
        return s + days;
      }, 0) / completedWithDates.length)
    : 0;

  // Trade distribution
  const tradeCounts: Record<string, number> = {};
  projects.forEach(p => (p.trades_requested || []).forEach(t => { tradeCounts[t] = (tradeCounts[t] || 0) + 1; }));
  const topTrades = Object.entries(tradeCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estimation Reports</h1>
        <p className="text-muted-foreground">Performance analytics and business intelligence</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.winRate}%</div>
            <p className="text-xs text-muted-foreground">{awarded.length} won, {lost.length} lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awarded Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(awardedValue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">${(lostValue / 1000).toFixed(0)}K lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnaround</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTurnaround || "—"} days</div>
            <p className="text-xs text-muted-foreground">From RFP to completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open RFIs</CardTitle>
            <HelpCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfiStats.openRFIs}</div>
            <p className="text-xs text-muted-foreground">{rfiStats.totalRFIs} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {months.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Month</th>
                    <th className="p-2 text-right font-medium">Projects Created</th>
                    <th className="p-2 text-right font-medium">Awarded</th>
                    <th className="p-2 text-right font-medium">Lost</th>
                    <th className="p-2 text-right font-medium">Awarded Value</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(([month, data]) => (
                    <tr key={month} className="border-b">
                      <td className="p-2 font-medium">{month}</td>
                      <td className="p-2 text-right">{data.created}</td>
                      <td className="p-2 text-right text-green-600">{data.awarded}</td>
                      <td className="p-2 text-right text-red-600">{data.lost}</td>
                      <td className="p-2 text-right">${(data.value / 1000).toFixed(0)}K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Trade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {topTrades.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No trade data</p>
            ) : (
              <div className="space-y-3">
                {topTrades.map(([trade, count]) => (
                  <div key={trade} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{trade.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${(count / (topTrades[0]?.[1] || 1)) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Members</span>
                <span className="font-medium">{teamStats.uniqueMembers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Assignments</span>
                <span className="font-medium">{teamStats.totalAssignments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Hours Allocated</span>
                <span className="font-medium">{teamStats.totalHoursAllocated}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Hours Spent</span>
                <span className="font-medium">{teamStats.totalHoursSpent}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Utilization</span>
                <span className="font-medium">
                  {teamStats.totalHoursAllocated > 0 ? Math.round((teamStats.totalHoursSpent / teamStats.totalHoursAllocated) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
