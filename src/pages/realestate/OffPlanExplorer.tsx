import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, MapPin, Calendar, TrendingUp, DollarSign, Users, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useOffPlanProjects, OffPlanProject, OffPlanMatch } from "@/hooks/useOffPlanProjects";
import { useRealEstateClients } from "@/hooks/useRealEstateClients";
import { toast } from "sonner";

const formatAED = (n: number) => `AED ${Number(n).toLocaleString()}`;

const statusColors: Record<string, string> = {
  announced: "bg-gray-100 text-gray-700",
  pre_launch: "bg-purple-100 text-purple-700",
  launched: "bg-blue-100 text-blue-700",
  under_construction: "bg-yellow-100 text-yellow-700",
  near_completion: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  sold_out: "bg-red-100 text-red-700",
};

export default function OffPlanExplorer() {
  const { projects, isLoading, stats, matchToClient, isMatching, matchResults } = useOffPlanProjects();
  const { clients } = useRealEstateClients();
  const [locationFilter, setLocationFilter] = useState("all");
  const [developerFilter, setDeveloperFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const filtered = projects.filter((p) => {
    if (locationFilter !== "all" && p.location !== locationFilter) return false;
    if (developerFilter !== "all" && p.developer_name !== developerFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const handleMatch = async () => {
    if (!selectedClientId) { toast.error("Select a client"); return; }
    try {
      await matchToClient({ client_id: selectedClientId });
      toast.success("Matching complete!");
    } catch { toast.error("Matching failed"); }
  };

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Off-Plan Projects</h1>
            <p className="text-muted-foreground">Browse and match off-plan projects with cross-border intelligence</p>
          </div>
          <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
            <DialogTrigger asChild>
              <Button><Sparkles className="h-4 w-4 mr-2" />Match to Buyer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>AI Buyer-Project Matching</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                  <SelectContent>
                    {(clients || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || `${c.first_name} ${c.last_name}`} — {c.nationality || "?"} — {c.budget_max ? formatAED(c.budget_max) : "No budget"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleMatch} disabled={isMatching || !selectedClientId} className="w-full">
                  {isMatching ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Matching...</> : "Find Best Projects"}
                </Button>
                {matchResults && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium">{matchResults.total_matches} matches found</p>
                    {matchResults.matches.slice(0, 5).map((m: OffPlanMatch, i: number) => (
                      <Card key={i} className="border-l-4" style={{ borderLeftColor: m.match_score >= 70 ? "#22c55e" : m.match_score >= 50 ? "#eab308" : "#9ca3af" }}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{m.project.project_name}</p>
                              <p className="text-xs text-muted-foreground">{m.project.developer_name} — {m.project.location}</p>
                              <p className="text-xs mt-1">{formatAED(m.project.price_range_min)} - {formatAED(m.project.price_range_max)}</p>
                            </div>
                            <Badge className={m.match_score >= 70 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>{m.match_score}%</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {m.match_reasons.map((r, j) => <Badge key={j} variant="outline" className="text-xs">{r}</Badge>)}
                          </div>
                          {m.cross_border && (
                            <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                              <p><strong>Home currency:</strong> {m.cross_border.property_range}</p>
                              <p><strong>Down payment:</strong> {m.cross_border.down_payment}</p>
                              <p><strong>Monthly:</strong> {m.cross_border.monthly_installment}</p>
                              <p className="text-purple-700 font-medium">{m.cross_border.visa_benefit}</p>
                            </div>
                          )}
                          {m.ai_recommendation && <p className="text-xs text-muted-foreground mt-2 italic">{m.ai_recommendation}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Near Completion</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{isLoading ? "..." : stats.nearCompletion}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Yield</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : `${stats.avgYield}%`}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Developers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.developers.length}</div></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Locations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {stats.locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={developerFilter} onValueChange={setDeveloperFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Developers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Developers</SelectItem>
              {stats.developers.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="launched">Launched</SelectItem>
              <SelectItem value="under_construction">Under Construction</SelectItem>
              <SelectItem value="near_completion">Near Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No projects match your filters</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const isExpanded = expandedId === p.id;
              const pp = p.payment_plan || {};
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{p.project_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{p.developer_name}</p>
                      </div>
                      <Badge className={statusColors[p.status] || ""}>{p.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />{p.location}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{formatAED(p.price_range_min)} - {formatAED(p.price_range_max)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>{p.completion_percentage}%</span>
                      </div>
                      <Progress value={p.completion_percentage} className="h-2" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span><Calendar className="h-3 w-3 inline mr-1" />Handover: {p.handover_date ? new Date(p.handover_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "TBA"}</span>
                      {p.expected_rental_yield_pct > 0 && (
                        <span className="text-green-600 font-medium"><TrendingUp className="h-3 w-3 inline mr-1" />{p.expected_rental_yield_pct}% yield</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(p.amenities || []).slice(0, 4).map((a, i) => <Badge key={i} variant="outline" className="text-xs">{a.replace(/_/g, " ")}</Badge>)}
                      {(p.amenities || []).length > 4 && <Badge variant="outline" className="text-xs">+{p.amenities.length - 4}</Badge>}
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-3 mt-3 space-y-3">
                        {pp.down_payment_pct && (
                          <div>
                            <h4 className="text-xs font-medium mb-1">Payment Plan</h4>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="bg-blue-50 p-2 rounded text-center">
                                <div className="font-bold">{pp.down_payment_pct}%</div>
                                <div className="text-muted-foreground">Down</div>
                              </div>
                              <div className="bg-yellow-50 p-2 rounded text-center">
                                <div className="font-bold">{pp.during_construction_pct || 0}%</div>
                                <div className="text-muted-foreground">Construction</div>
                              </div>
                              <div className="bg-green-50 p-2 rounded text-center">
                                <div className="font-bold">{pp.on_handover_pct || 0}%</div>
                                <div className="text-muted-foreground">Handover</div>
                              </div>
                            </div>
                            {pp.post_handover_plan && (
                              <p className="text-xs text-green-600 mt-1">Post-handover plan: {pp.post_handover_months || "?"} months</p>
                            )}
                          </div>
                        )}
                        {(p.unit_types || []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-1">Unit Types</h4>
                            <div className="flex flex-wrap gap-1">
                              {p.unit_types.map((u, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {u.type.replace(/_/g, " ")} {u.count ? `(${u.count})` : ""}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(p.key_selling_points || []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-1">Key Selling Points</h4>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {p.key_selling_points.map((ksp, i) => <li key={i}>• {ksp}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RTLWrapper>
  );
}
