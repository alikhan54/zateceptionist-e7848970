import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEstimationTeam } from "@/hooks/useEstimationTeam";
import { Users, Clock, Briefcase, BarChart3 } from "lucide-react";

export default function TeamWorkload() {
  const { members, isLoading, stats } = useEstimationTeam();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Workload</h1>
        <p className="text-muted-foreground">Estimator assignments and capacity tracking</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueMembers}</div>
            <p className="text-xs text-muted-foreground">{stats.totalAssignments} total assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAssignments}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Allocated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHoursAllocated}</div>
            <p className="text-xs text-muted-foreground">{stats.totalHoursSpent} hours spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalHoursAllocated > 0 ? Math.round((stats.totalHoursSpent / stats.totalHoursAllocated) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Hours spent / allocated</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading team data...</div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No team assignments yet. Assign estimators from the Project Detail page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map(member => {
            const utilization = member.totalHoursAllocated > 0
              ? Math.round((member.totalHoursSpent / member.totalHoursAllocated) * 100)
              : 0;
            return (
              <Card key={member.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <Badge variant={member.activeProjects > 3 ? "destructive" : member.activeProjects > 1 ? "default" : "secondary"}>
                      {member.activeProjects} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Hours: {member.totalHoursSpent} / {member.totalHoursAllocated}</span>
                      <span className="font-medium">{utilization}%</span>
                    </div>
                    <Progress value={Math.min(utilization, 100)} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    {member.assignments.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm border-t pt-2">
                        <div>
                          <span className="font-medium">{a.role}</span>
                          {a.trades_assigned && a.trades_assigned.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {a.trades_assigned.map(t => (
                                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant={a.status === "assigned" ? "default" : a.status === "completed" ? "secondary" : "outline"}>
                          {a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
