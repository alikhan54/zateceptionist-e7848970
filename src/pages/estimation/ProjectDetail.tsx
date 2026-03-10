import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstimationProjects, EstimationProject } from "@/hooks/useEstimationProjects";
import { useEstimationRooms, EstimationRoom } from "@/hooks/useEstimationRooms";
import { useEstimationTakeoff } from "@/hooks/useEstimationTakeoff";
import { useEstimationEstimates } from "@/hooks/useEstimationEstimates";
import { useEstimationRFIs } from "@/hooks/useEstimationRFIs";
import { useEstimationRevisions } from "@/hooks/useEstimationRevisions";
import { useEstimationTeam } from "@/hooks/useEstimationTeam";
import { useTenant } from "@/contexts/TenantContext";
import { exportEstimationData } from "@/lib/api/estimationApi";
import { exportQuantitiesXlsx, exportCostSheetXlsx, exportQualificationPdf, exportColorCodedPdf, exportCsv, type ExportData } from "@/lib/estimation/exportUtils";
import { ArrowLeft, Building2, Calendar, Users, DollarSign, Plus, Ruler, FileText, HelpCircle, History, Activity, Truck, Download, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  rfp_received: "RFP Received", reviewing: "Reviewing", in_progress: "In Progress",
  takeoff_complete: "Takeoff Complete", qa_review: "QA Review", estimate_drafted: "Estimate Drafted",
  sent_to_client: "Sent to Client", revision_requested: "Revision Requested",
  revision_in_progress: "Revision In Progress", bid_submitted: "Bid Submitted",
  awarded: "Awarded", lost: "Lost", cancelled: "Cancelled",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { projects, updateProject } = useEstimationProjects();
  const project = projects.find(p => p.id === id);

  const { rooms, stats: roomStats, isLoading: roomsLoading, createRoom } = useEstimationRooms(id);
  const { items: takeoffItems, stats: takeoffStats, isLoading: takeoffLoading, createItem } = useEstimationTakeoff(id);
  const { estimates, latestEstimate, createEstimate } = useEstimationEstimates(id);
  const { rfis, stats: rfiStats, createRFI } = useEstimationRFIs(id);
  const { revisions, stats: revisionStats } = useEstimationRevisions(id);
  const { assignments, createAssignment } = useEstimationTeam(id);

  // Dialogs
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddRFI, setShowAddRFI] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);

  const [newRoom, setNewRoom] = useState({ room_name: "", room_number: "", floor_level: "1", length_ft: "", width_ft: "", ceiling_height_ft: "9" });
  const [newRFI, setNewRFI] = useState({ topic: "", question: "", assumptions: "" });
  const [newTeam, setNewTeam] = useState({ team_member_name: "", role: "estimator", trades_assigned: "" });
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const { tenantId } = useTenant();

  // ── Estimation Mode ──────────────────────────────────────────────
  const estimationMode = (project?.estimation_mode as string) || "manual";
  const handleModeChange = async (mode: string) => {
    if (!project) return;
    await updateProject.mutateAsync({ id: project.id, updates: { estimation_mode: mode } });
    toast.success(`Mode changed to ${mode.replace(/_/g, " ")}`);
  };

  // ── Export Handler ───────────────────────────────────────────────
  const handleExport = async (exportType: "quantities_xlsx" | "cost_sheet" | "qualification" | "color_coded" | "csv") => {
    if (!project || !id) return;
    setExportLoading(exportType);
    try {
      const result = await exportEstimationData(id, exportType, tenantId || "marhama-group");
      const respData = (result as any)?.data || result;

      // Build ExportData from webhook response
      const exportData: ExportData = {
        project_name: project.project_name,
        project_number: project.project_number || undefined,
        client_name: project.client_name,
        columns: respData.columns || [],
        groups: respData.groups || [],
        totals: respData.totals || undefined,
        qualification: respData.qualification || {
          assumptions: project.assumptions,
          exclusions: project.exclusions,
          notes: project.qualification_notes,
        },
      };

      // Route to correct export function
      switch (exportType) {
        case "quantities_xlsx":
          exportQuantitiesXlsx(exportData);
          break;
        case "cost_sheet":
          exportCostSheetXlsx(exportData);
          break;
        case "qualification":
          exportQualificationPdf(exportData);
          break;
        case "color_coded":
          exportColorCodedPdf(exportData);
          break;
        case "csv":
          exportCsv(exportData);
          break;
      }
      toast.success(`Exported ${exportType.replace(/_/g, " ")} successfully`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Check console for details.");
    } finally {
      setExportLoading(null);
    }
  };

  if (!project) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/estimation/projects")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <div className="text-center py-12 text-muted-foreground">Project not found or still loading...</div>
      </div>
    );
  }

  const handleAddRoom = async () => {
    if (!newRoom.room_name) return;
    const l = parseFloat(newRoom.length_ft) || 0;
    const w = parseFloat(newRoom.width_ft) || 0;
    await createRoom.mutateAsync({
      project_id: id,
      room_name: newRoom.room_name,
      room_number: newRoom.room_number || null,
      floor_level: parseInt(newRoom.floor_level) || 1,
      length_ft: l || null,
      width_ft: w || null,
      ceiling_height_ft: parseFloat(newRoom.ceiling_height_ft) || 9,
      gross_area_sqft: l && w ? l * w : null,
      net_area_sqft: l && w ? l * w : null,
      perimeter_lf: l && w ? 2 * (l + w) : null,
      is_verified: false,
    } as any);
    setShowAddRoom(false);
    setNewRoom({ room_name: "", room_number: "", floor_level: "1", length_ft: "", width_ft: "", ceiling_height_ft: "9" });
  };

  const handleAddRFI = async () => {
    if (!newRFI.topic || !newRFI.question) return;
    await createRFI.mutateAsync({
      project_id: id,
      rfi_number: (rfiStats.totalRFIs || 0) + 1,
      topic: newRFI.topic,
      question: newRFI.question,
      assumptions: newRFI.assumptions || null,
      date_submitted: new Date().toISOString().split("T")[0],
      status: "open",
      priority: "normal",
      impacts_estimate: false,
    } as any);
    setShowAddRFI(false);
    setNewRFI({ topic: "", question: "", assumptions: "" });
  };

  const handleAddTeam = async () => {
    if (!newTeam.team_member_name) return;
    await createAssignment.mutateAsync({
      project_id: id,
      team_member_name: newTeam.team_member_name,
      role: newTeam.role,
      trades_assigned: newTeam.trades_assigned ? newTeam.trades_assigned.split(",").map(t => t.trim()) : null,
      status: "assigned",
      actual_hours: 0,
    } as any);
    setShowAddTeam(false);
    setNewTeam({ team_member_name: "", role: "estimator", trades_assigned: "" });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate("/estimation/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
          <h1 className="text-2xl font-bold">{project.project_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {project.project_number && <span className="text-sm font-mono text-muted-foreground">#{project.project_number}</span>}
            <Badge>{STATUS_LABELS[project.status] || project.status}</Badge>
            <Badge variant="outline">{project.priority}</Badge>
            {project.bid_date && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Bid: {new Date(project.bid_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <Select value={project.status} onValueChange={v => updateProject.mutateAsync({ id: project.id, updates: { status: v } })}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Rooms</div>
          <div className="text-xl font-bold">{roomStats.totalRooms}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Takeoff Items</div>
          <div className="text-xl font-bold">{takeoffStats.totalItems}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Material Cost</div>
          <div className="text-xl font-bold">${(takeoffStats.totalMaterialCost / 1000).toFixed(1)}K</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Open RFIs</div>
          <div className="text-xl font-bold">{rfiStats.openRFIs}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Revisions</div>
          <div className="text-xl font-bold">{revisionStats.totalRevisions}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="rooms"><Ruler className="h-4 w-4 mr-1" /> Rooms</TabsTrigger>
          <TabsTrigger value="takeoff"><FileText className="h-4 w-4 mr-1" /> Takeoff</TabsTrigger>
          <TabsTrigger value="estimate"><DollarSign className="h-4 w-4 mr-1" /> Estimate</TabsTrigger>
          <TabsTrigger value="rfis"><HelpCircle className="h-4 w-4 mr-1" /> RFIs</TabsTrigger>
          <TabsTrigger value="revisions"><History className="h-4 w-4 mr-1" /> Revisions</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Team</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1" /> Activity</TabsTrigger>
          <TabsTrigger value="suppliers"><Truck className="h-4 w-4 mr-1" /> Suppliers</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Project Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{project.project_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Building</span><span>{project.building_type || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{[project.city, project.state].filter(Boolean).join(", ") || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total SqFt</span><span>{project.total_sqft?.toLocaleString() || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Floors</span><span>{project.number_of_floors || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Complexity</span><span>{project.complexity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Est. Value</span><span>{project.estimated_project_value ? `$${project.estimated_project_value.toLocaleString()}` : "—"}</span></div>
                {project.trades_requested?.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Trades:</span>
                    <div className="flex flex-wrap gap-1 mt-1">{project.trades_requested.map(t => <Badge key={t} variant="outline" className="text-xs">{t.replace(/_/g, " ")}</Badge>)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Client / GC / Architect</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">{project.client_name}</div>
                  {project.client_company && <div className="text-muted-foreground">{project.client_company}</div>}
                  {project.client_email && <div className="text-muted-foreground">{project.client_email}</div>}
                  {project.client_phone && <div className="text-muted-foreground">{project.client_phone}</div>}
                </div>
                {project.gc_company && (
                  <div className="border-t pt-2">
                    <div className="text-xs text-muted-foreground mb-1">General Contractor</div>
                    <div className="font-medium">{project.gc_company}</div>
                    {project.gc_contact_name && <div className="text-muted-foreground">{project.gc_contact_name}</div>}
                    {project.gc_contact_email && <div className="text-muted-foreground">{project.gc_contact_email}</div>}
                  </div>
                )}
                {project.architect_firm && (
                  <div className="border-t pt-2">
                    <div className="text-xs text-muted-foreground mb-1">Architect</div>
                    <div className="font-medium">{project.architect_firm}</div>
                    {project.architect_contact && <div className="text-muted-foreground">{project.architect_contact}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Deliverables</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Qualification Letter", project.deliverable_qualification],
                  ["Color-Coded Plans", project.deliverable_color_coded],
                  ["Takeoff File", project.deliverable_takeoff_file],
                  ["Working Drawings", project.deliverable_working_drawings],
                  ["Quantities Excel", project.deliverable_quantities_excel],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center gap-2">
                    <span className={val ? "text-green-600" : "text-muted-foreground"}>{val ? "+" : "-"}</span>
                    <span>{label as string}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {project.notes && <div><span className="text-muted-foreground">Notes:</span> {project.notes}</div>}
                {project.assumptions && <div><span className="text-muted-foreground">Assumptions:</span> {project.assumptions}</div>}
                {project.exclusions && <div><span className="text-muted-foreground">Exclusions:</span> {project.exclusions}</div>}
                {project.special_instructions && <div><span className="text-muted-foreground">Special:</span> {project.special_instructions}</div>}
                {!project.notes && !project.assumptions && !project.exclusions && !project.special_instructions && (
                  <div className="text-muted-foreground">No notes added yet.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Estimation Mode Selector */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Estimation Mode</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={estimationMode} onValueChange={handleModeChange}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="ai_assisted">AI-Assisted</SelectItem>
                    <SelectItem value="ai_auto">Autonomous (AI)</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {estimationMode === "manual" && "All takeoff and estimation done manually by the estimator."}
                  {estimationMode === "ai_assisted" && "AI suggests materials, waste factors, and accessories. Estimator approves."}
                  {estimationMode === "ai_auto" && "AI generates full takeoff from bid documents. Estimator reviews and approves."}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROOMS TAB */}
        <TabsContent value="rooms" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{roomStats.totalRooms} rooms, {roomStats.totalAreaSqft.toLocaleString()} SF total, {roomStats.verifiedRooms} verified</div>
            <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Room</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Room Name *</Label><Input value={newRoom.room_name} onChange={e => setNewRoom(p => ({ ...p, room_name: e.target.value }))} placeholder="e.g., Main Dining" /></div>
                    <div className="space-y-2"><Label>Room Number</Label><Input value={newRoom.room_number} onChange={e => setNewRoom(p => ({ ...p, room_number: e.target.value }))} placeholder="101" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Length (ft)</Label><Input type="number" value={newRoom.length_ft} onChange={e => setNewRoom(p => ({ ...p, length_ft: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Width (ft)</Label><Input type="number" value={newRoom.width_ft} onChange={e => setNewRoom(p => ({ ...p, width_ft: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Ceiling (ft)</Label><Input type="number" value={newRoom.ceiling_height_ft} onChange={e => setNewRoom(p => ({ ...p, ceiling_height_ft: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>Floor Level</Label><Input type="number" value={newRoom.floor_level} onChange={e => setNewRoom(p => ({ ...p, floor_level: e.target.value }))} /></div>
                  <Button onClick={handleAddRoom} disabled={createRoom.isPending} className="w-full">{createRoom.isPending ? "Adding..." : "Add Room"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {roomsLoading ? <div className="text-center py-8 text-muted-foreground">Loading rooms...</div> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-left">Room</th><th className="p-3 text-left">Floor</th><th className="p-3 text-right">L x W</th>
                    <th className="p-3 text-right">Area (SF)</th><th className="p-3 text-right">Perimeter (LF)</th><th className="p-3 text-left">Status</th>
                  </tr></thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="p-3"><div className="font-medium">{r.room_name}</div>{r.room_number && <div className="text-xs text-muted-foreground">#{r.room_number}</div>}</td>
                        <td className="p-3">{r.floor_level}</td>
                        <td className="p-3 text-right">{r.length_ft && r.width_ft ? `${r.length_ft}' x ${r.width_ft}'` : "—"}</td>
                        <td className="p-3 text-right">{r.net_area_sqft?.toLocaleString() || "—"}</td>
                        <td className="p-3 text-right">{r.perimeter_lf?.toLocaleString() || "—"}</td>
                        <td className="p-3"><Badge variant={r.is_verified ? "default" : "outline"}>{r.is_verified ? "Verified" : "Draft"}</Badge></td>
                      </tr>
                    ))}
                    {rooms.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No rooms added yet.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAKEOFF TAB */}
        <TabsContent value="takeoff" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-3"><div className="text-xs text-muted-foreground">Total Items</div><div className="text-xl font-bold">{takeoffStats.totalItems}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Total SF</div><div className="text-xl font-bold">{takeoffStats.totalQuantitySF.toLocaleString()}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Total LF</div><div className="text-xl font-bold">{takeoffStats.totalQuantityLF.toLocaleString()}</div></Card>
            <Card className="p-3"><div className="text-xs text-muted-foreground">Material Cost</div><div className="text-xl font-bold">${takeoffStats.totalMaterialCost.toLocaleString()}</div></Card>
          </div>
          {takeoffStats.trades.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(takeoffStats.costByTrade).map(([trade, cost]) => (
                <Badge key={trade} variant="outline">{trade}: ${(cost as number).toLocaleString()}</Badge>
              ))}
            </div>
          )}
          {takeoffLoading ? <div className="text-center py-8 text-muted-foreground">Loading takeoff items...</div> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-left">Trade</th><th className="p-3 text-left">Surface</th><th className="p-3 text-left">Material</th>
                    <th className="p-3 text-right">Net Area</th><th className="p-3 text-right">Waste %</th><th className="p-3 text-right">Total Qty</th><th className="p-3 text-right">Cost</th>
                  </tr></thead>
                  <tbody>
                    {takeoffItems.map(item => (
                      <tr key={item.id} className="border-b hover:bg-muted/30">
                        <td className="p-3"><Badge variant="outline">{item.trade}</Badge></td>
                        <td className="p-3">{item.surface_type || "—"}</td>
                        <td className="p-3">{item.material_tag || "—"}</td>
                        <td className="p-3 text-right">{item.net_area_sqft?.toLocaleString() || "—"} SF</td>
                        <td className="p-3 text-right">{item.waste_factor_pct != null ? `${item.waste_factor_pct}%` : "—"}</td>
                        <td className="p-3 text-right">{item.total_quantity_with_waste?.toLocaleString() || "—"}</td>
                        <td className="p-3 text-right">{item.total_material_cost ? `$${item.total_material_cost.toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                    {takeoffItems.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No takeoff items yet.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ESTIMATE TAB */}
        <TabsContent value="estimate" className="space-y-4">
          {latestEstimate ? (
            <div className="space-y-4">
              {/* Export Buttons */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Export</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { type: "quantities_xlsx", label: "Quantities (.xlsx)" },
                        { type: "cost_sheet", label: "Cost Sheet (.xlsx)" },
                        { type: "qualification", label: "Qualification (.pdf)" },
                        { type: "color_coded", label: "Color-Coded (.pdf)" },
                        { type: "csv", label: "Raw Data (.csv)" },
                      ] as { type: "quantities_xlsx" | "cost_sheet" | "qualification" | "color_coded" | "csv"; label: string }[]
                    ).map(({ type, label }) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(type)}
                        disabled={exportLoading !== null}
                      >
                        {exportLoading === type ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Estimate v{latestEstimate.version} (Rev {latestEstimate.revision_number})</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><div className="text-muted-foreground">Materials</div><div className="font-bold">${latestEstimate.total_material_cost.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Labor</div><div className="font-bold">${latestEstimate.total_labor_cost.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Freight</div><div className="font-bold">${latestEstimate.total_freight_cost.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Subtotal</div><div className="font-bold">${latestEstimate.subtotal.toLocaleString()}</div></div>
                  </div>
                  <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><div className="text-muted-foreground">Overhead</div><div>{latestEstimate.overhead_pct}%</div></div>
                    <div><div className="text-muted-foreground">Profit</div><div>{latestEstimate.profit_pct}%</div></div>
                    <div><div className="text-muted-foreground">Tax</div><div>{latestEstimate.tax_pct}%</div></div>
                    <div><div className="text-muted-foreground text-lg">Grand Total</div><div className="text-2xl font-bold text-primary">${latestEstimate.grand_total.toLocaleString()}</div></div>
                  </div>
                  <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><div className="text-muted-foreground">Total SF</div><div>{latestEstimate.total_sqft.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Total LF</div><div>{latestEstimate.total_lf.toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Rooms</div><div>{latestEstimate.room_count}</div></div>
                    <div><div className="text-muted-foreground">Status</div><Badge>{latestEstimate.status}</Badge></div>
                  </div>
                </CardContent>
              </Card>
              {latestEstimate.qualification_assumptions && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Qualifications</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {latestEstimate.qualification_assumptions && <div><span className="text-muted-foreground">Assumptions:</span> {latestEstimate.qualification_assumptions}</div>}
                    {latestEstimate.qualification_exclusions && <div><span className="text-muted-foreground">Exclusions:</span> {latestEstimate.qualification_exclusions}</div>}
                    {latestEstimate.qualification_clarifications && <div><span className="text-muted-foreground">Clarifications:</span> {latestEstimate.qualification_clarifications}</div>}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No estimate created yet. Complete the takeoff first.</CardContent></Card>
          )}
          {estimates.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Version History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-left">Version</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Grand Total</th><th className="p-3 text-left">Created</th>
                  </tr></thead>
                  <tbody>
                    {estimates.map(e => (
                      <tr key={e.id} className="border-b">
                        <td className="p-3">v{e.version} (Rev {e.revision_number}) {e.is_latest && <Badge className="ml-1" variant="secondary">Latest</Badge>}</td>
                        <td className="p-3"><Badge variant="outline">{e.status}</Badge></td>
                        <td className="p-3 text-right font-medium">${e.grand_total.toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RFIs TAB */}
        <TabsContent value="rfis" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{rfiStats.openRFIs} open, {rfiStats.answeredRFIs} answered, {rfiStats.closedRFIs} closed</div>
            <Dialog open={showAddRFI} onOpenChange={setShowAddRFI}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New RFI</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit RFI</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Topic *</Label><Input value={newRFI.topic} onChange={e => setNewRFI(p => ({ ...p, topic: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Question *</Label><Textarea value={newRFI.question} onChange={e => setNewRFI(p => ({ ...p, question: e.target.value }))} rows={3} /></div>
                  <div className="space-y-2"><Label>Assumptions</Label><Textarea value={newRFI.assumptions} onChange={e => setNewRFI(p => ({ ...p, assumptions: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleAddRFI} disabled={createRFI.isPending} className="w-full">{createRFI.isPending ? "Submitting..." : "Submit"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">#</th><th className="p-3 text-left">Topic</th><th className="p-3 text-left">Question</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Date</th>
                </tr></thead>
                <tbody>
                  {rfis.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono">{r.rfi_number}</td>
                      <td className="p-3 font-medium">{r.topic}</td>
                      <td className="p-3 max-w-xs truncate">{r.question}</td>
                      <td className="p-3"><Badge variant={r.status === "open" ? "default" : "secondary"}>{r.status}</Badge></td>
                      <td className="p-3 text-muted-foreground">{new Date(r.date_submitted).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {rfis.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No RFIs for this project.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVISIONS TAB */}
        <TabsContent value="revisions" className="space-y-4">
          <div className="text-sm text-muted-foreground">{revisionStats.totalRevisions} revisions, ${revisionStats.totalCostImpact.toLocaleString()} total cost impact</div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Rev #</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Changes</th>
                  <th className="p-3 text-right">Cost Delta</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Date</th>
                </tr></thead>
                <tbody>
                  {revisions.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium">{r.revision_number}</td>
                      <td className="p-3">{r.revision_type || "—"}</td>
                      <td className="p-3 max-w-xs truncate">{r.material_schedule_changes || r.layout_changes || "—"}</td>
                      <td className="p-3 text-right"><span className={r.cost_delta && r.cost_delta > 0 ? "text-red-600" : r.cost_delta && r.cost_delta < 0 ? "text-green-600" : ""}>{r.cost_delta ? `$${r.cost_delta.toLocaleString()}` : "—"}</span></td>
                      <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                      <td className="p-3 text-muted-foreground">{new Date(r.requested_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {revisions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No revisions yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{assignments.length} team members assigned</div>
            <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Assign Member</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign Team Member</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Name *</Label><Input value={newTeam.team_member_name} onChange={e => setNewTeam(p => ({ ...p, team_member_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Role</Label>
                    <Select value={newTeam.role} onValueChange={v => setNewTeam(p => ({ ...p, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimator">Estimator</SelectItem>
                        <SelectItem value="lead_estimator">Lead Estimator</SelectItem>
                        <SelectItem value="qa_reviewer">QA Reviewer</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Trades (comma-separated)</Label><Input value={newTeam.trades_assigned} onChange={e => setNewTeam(p => ({ ...p, trades_assigned: e.target.value }))} placeholder="tile, epoxy" /></div>
                  <Button onClick={handleAddTeam} disabled={createAssignment.isPending} className="w-full">{createAssignment.isPending ? "Assigning..." : "Assign"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {assignments.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.team_member_name}</div>
                      <div className="text-sm text-muted-foreground">{a.role}</div>
                    </div>
                    <Badge variant={a.status === "assigned" ? "default" : "secondary"}>{a.status}</Badge>
                  </div>
                  {a.trades_assigned && a.trades_assigned.length > 0 && (
                    <div className="flex gap-1 mt-2">{a.trades_assigned.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Est: {a.estimated_hours || 0}h</span>
                    <span>Actual: {a.actual_hours}h</span>
                    {a.hourly_rate && <span>${a.hourly_rate}/h</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {assignments.length === 0 && (
              <Card className="col-span-2"><CardContent className="py-8 text-center text-muted-foreground">No team members assigned yet.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Activity log coming soon. Events will be tracked in estimation_activity_log.</CardContent></Card>
        </TabsContent>

        {/* SUPPLIERS TAB */}
        <TabsContent value="suppliers">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Supplier quotes coming soon. Track pricing from estimation_supplier_pricing.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
