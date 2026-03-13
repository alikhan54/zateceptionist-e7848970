import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstimationProjects, EstimationProject } from "@/hooks/useEstimationProjects";
import { useNavigate } from "react-router-dom";
import { Building2, Calendar, TrendingUp, DollarSign, Plus, Search, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  rfp_received: "RFP Received",
  reviewing: "Reviewing",
  in_progress: "In Progress",
  takeoff_complete: "Takeoff Complete",
  qa_review: "QA Review",
  estimate_drafted: "Estimate Drafted",
  sent_to_client: "Sent to Client",
  revision_requested: "Revision Requested",
  revision_in_progress: "Revision In Progress",
  bid_submitted: "Bid Submitted",
  awarded: "Awarded",
  lost: "Lost",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  rfp_received: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  takeoff_complete: "bg-indigo-100 text-indigo-800",
  qa_review: "bg-orange-100 text-orange-800",
  estimate_drafted: "bg-cyan-100 text-cyan-800",
  sent_to_client: "bg-teal-100 text-teal-800",
  revision_requested: "bg-red-100 text-red-800",
  revision_in_progress: "bg-amber-100 text-amber-800",
  bid_submitted: "bg-green-100 text-green-800",
  awarded: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-200 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-400 text-white",
};

const TRADES = ["tile", "concrete_coating", "epoxy", "waterproofing", "painting", "drywall", "flooring", "insulation"];

function daysUntilBid(bidDate: string | null): number | null {
  if (!bidDate) return null;
  return Math.ceil((new Date(bidDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ProjectsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const navigate = useNavigate();

  const { projects, isLoading, stats, createProject } = useEstimationProjects(
    searchTerm || undefined,
    statusFilter
  );

  const [newProject, setNewProject] = useState({
    project_name: "",
    project_type: "commercial",
    client_name: "",
    gc_company: "",
    building_type: "",
    city: "",
    state: "",
    bid_date: "",
    priority: "normal",
    trades_requested: [] as string[],
  });

  const handleCreate = async () => {
    if (!newProject.project_name || !newProject.client_name) return;
    try {
      await createProject.mutateAsync({
        ...newProject,
        status: "rfp_received",
        country: "US",
        number_of_buildings: 1,
        estimation_mode: "manual",
        current_revision: 0,
        total_revisions: 0,
        has_addenda: false,
        addenda_count: 0,
        alternates: [],
        building_sections: [],
        unit_system: "imperial",
        estimation_fee_status: "unpaid",
        deliverable_qualification: true,
        deliverable_color_coded: true,
        deliverable_takeoff_file: true,
        deliverable_working_drawings: false,
        deliverable_quantities_excel: true,
      } as any);
      toast.success("Project created successfully");
      setShowCreate(false);
      setNewProject({ project_name: "", project_type: "commercial", client_name: "", gc_company: "", building_type: "", city: "", state: "", bid_date: "", priority: "normal", trades_requested: [] });
    } catch (error) {
      console.error("Create project error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create project. Please try again.");
    }
  };

  const toggleTrade = (trade: string) => {
    setNewProject(p => ({
      ...p,
      trades_requested: p.trades_requested.includes(trade)
        ? p.trades_requested.filter(t => t !== trade)
        : [...p.trades_requested, trade],
    }));
  };

  const kanbanStatuses = ["rfp_received", "reviewing", "in_progress", "takeoff_complete", "qa_review", "estimate_drafted", "sent_to_client", "bid_submitted"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimation Projects</h1>
          <p className="text-muted-foreground">Manage bids, takeoffs, and client estimates</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input value={newProject.project_name} onChange={e => setNewProject(p => ({ ...p, project_name: e.target.value }))} placeholder="e.g., Cava Restaurant Pflugerville" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Type</Label>
                  <Select value={newProject.project_type} onValueChange={v => setNewProject(p => ({ ...p, project_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="institutional">Institutional</SelectItem>
                      <SelectItem value="mixed_use">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newProject.priority} onValueChange={v => setNewProject(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input value={newProject.client_name} onChange={e => setNewProject(p => ({ ...p, client_name: e.target.value }))} placeholder="e.g., Fazio Floors" />
              </div>
              <div className="space-y-2">
                <Label>GC Company</Label>
                <Input value={newProject.gc_company} onChange={e => setNewProject(p => ({ ...p, gc_company: e.target.value }))} placeholder="General Contractor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Building Type</Label>
                  <Input value={newProject.building_type} onChange={e => setNewProject(p => ({ ...p, building_type: e.target.value }))} placeholder="e.g., restaurant" />
                </div>
                <div className="space-y-2">
                  <Label>Bid Date</Label>
                  <Input type="date" value={newProject.bid_date} onChange={e => setNewProject(p => ({ ...p, bid_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={newProject.city} onChange={e => setNewProject(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={newProject.state} onChange={e => setNewProject(p => ({ ...p, state: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Trades Requested</Label>
                <div className="flex flex-wrap gap-2">
                  {TRADES.map(t => (
                    <Badge key={t} variant={newProject.trades_requested.includes(t) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleTrade(t)}>
                      {t.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createProject.isPending} className="w-full">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">{stats.totalProjects} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dueThisWeek}</div>
            <p className="text-xs text-muted-foreground">{stats.overdue} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground">Awarded / (Awarded + Lost)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalEstimatedValue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">${(stats.totalFees / 1000).toFixed(0)}K in fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="sent_to_client">Sent</TabsTrigger>
            <TabsTrigger value="awarded">Awarded</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-1 border rounded-md">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")}>Table</Button>
          <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("kanban")}>Kanban</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
      ) : viewMode === "table" ? (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Project</th>
                    <th className="p-3 text-left font-medium">Client</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Priority</th>
                    <th className="p-3 text-left font-medium">Bid Date</th>
                    <th className="p-3 text-left font-medium">Trades</th>
                    <th className="p-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => {
                    const days = daysUntilBid(p.bid_date);
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/estimation/projects/${p.id}`)}>
                        <td className="p-3">
                          <div className="font-medium">{p.project_name}</div>
                          <div className="text-xs text-muted-foreground">{p.building_type} {p.city && `- ${p.city}, ${p.state}`}</div>
                        </td>
                        <td className="p-3">{p.client_name}</td>
                        <td className="p-3">
                          <Badge className={STATUS_COLORS[p.status] || "bg-gray-100"}>{STATUS_LABELS[p.status] || p.status}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={PRIORITY_COLORS[p.priority] || "bg-gray-400 text-white"} variant="secondary">{p.priority}</Badge>
                        </td>
                        <td className="p-3">
                          {p.bid_date ? (
                            <div className="flex items-center gap-1">
                              {days !== null && days < 0 ? (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              ) : days !== null && days <= 3 ? (
                                <Clock className="h-3 w-3 text-orange-500" />
                              ) : null}
                              <span className={days !== null && days < 0 ? "text-red-600 font-medium" : ""}>
                                {new Date(p.bid_date).toLocaleDateString()}
                              </span>
                              {days !== null && <span className="text-xs text-muted-foreground ml-1">({days < 0 ? `${Math.abs(days)}d late` : `${days}d`})</span>}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.trades_requested || []).slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-xs">{t.replace(/_/g, " ")}</Badge>
                            ))}
                            {(p.trades_requested || []).length > 3 && <Badge variant="outline" className="text-xs">+{p.trades_requested.length - 3}</Badge>}
                          </div>
                        </td>
                        <td className="p-3 text-right">{p.estimated_project_value ? `$${p.estimated_project_value.toLocaleString()}` : "—"}</td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No projects found. Create your first project to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStatuses.map(status => {
            const statusProjects = projects.filter(p => p.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Badge>
                  <span className="text-xs text-muted-foreground">{statusProjects.length}</span>
                </div>
                <div className="space-y-2">
                  {statusProjects.map(p => (
                    <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/estimation/projects/${p.id}`)}>
                      <CardContent className="p-3">
                        <div className="font-medium text-sm">{p.project_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{p.client_name}</div>
                        {p.bid_date && (
                          <div className="text-xs mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(p.bid_date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(p.trades_requested || []).slice(0, 2).map(t => (
                            <Badge key={t} variant="outline" className="text-xs">{t.replace(/_/g, " ")}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {statusProjects.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">No projects</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
