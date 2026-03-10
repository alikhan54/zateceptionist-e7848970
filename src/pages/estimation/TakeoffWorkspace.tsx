import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEstimationProjects } from "@/hooks/useEstimationProjects";
import { useNavigate } from "react-router-dom";
import { Ruler, Calendar, ArrowRight } from "lucide-react";

const TAKEOFF_STATUSES = ["in_progress", "takeoff_complete", "qa_review"];

export default function TakeoffWorkspace() {
  const { projects, isLoading } = useEstimationProjects();
  const navigate = useNavigate();

  const takeoffProjects = projects.filter(p => TAKEOFF_STATUSES.includes(p.status));
  const otherActive = projects.filter(p => p.status === "rfp_received" || p.status === "reviewing");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Takeoff Workspace</h1>
        <p className="text-muted-foreground">Projects currently in quantity takeoff phase</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
      ) : (
        <>
          {takeoffProjects.length === 0 && otherActive.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No projects in takeoff phase. Start a takeoff from the Projects Dashboard.
              </CardContent>
            </Card>
          ) : (
            <>
              {takeoffProjects.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">In Takeoff ({takeoffProjects.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {takeoffProjects.map(p => (
                      <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/estimation/projects/${p.id}`)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{p.project_name}</CardTitle>
                            <Badge variant={p.status === "takeoff_complete" ? "secondary" : p.status === "qa_review" ? "default" : "outline"}>
                              {p.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{p.client_name}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.trades_requested || []).map(t => (
                              <Badge key={t} variant="outline" className="text-xs">{t.replace(/_/g, " ")}</Badge>
                            ))}
                          </div>
                          {p.bid_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Bid: {new Date(p.bid_date).toLocaleDateString()}
                            </div>
                          )}
                          {p.assigned_estimator_name && (
                            <div className="text-sm text-muted-foreground">
                              Estimator: {p.assigned_estimator_name}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-primary">
                            <Ruler className="h-4 w-4" />
                            Open Takeoff <ArrowRight className="h-3 w-3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {otherActive.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Pending Takeoff ({otherActive.length})</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {otherActive.map(p => (
                      <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow opacity-75" onClick={() => navigate(`/estimation/projects/${p.id}`)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{p.project_name}</div>
                              <div className="text-sm text-muted-foreground">{p.client_name}</div>
                            </div>
                            <Badge variant="outline">{p.status.replace(/_/g, " ")}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
