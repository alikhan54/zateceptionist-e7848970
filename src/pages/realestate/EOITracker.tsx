import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRealEstateEOI, REEOI } from "@/hooks/useRealEstateEOI";
import { useToast } from "@/hooks/use-toast";
import { FileCheck, Plus, CheckCircle2, Clock, DollarSign, AlertCircle, ArrowRight } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  waitlisted: "bg-yellow-100 text-yellow-800",
  allocated: "bg-indigo-100 text-indigo-800",
  converted_to_deal: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  waitlisted: "Waitlisted",
  allocated: "Allocated",
  converted_to_deal: "Converted",
  cancelled: "Cancelled",
  expired: "Expired",
};

export default function EOITracker() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const { eois, isLoading, stats, projects, createEOI, updateEOI } = useRealEstateEOI({
    status: statusFilter || undefined,
    project_name: projectFilter || undefined,
  });
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    project_name: "", developer_name: "", preferred_unit_type: "",
    preferred_floor: "", preferred_view: "", budget_max: 0,
    eoi_amount: 0, notes: "",
  });

  const handleAdd = async () => {
    if (!form.project_name) { toast({ title: "Error", description: "Project name is required", variant: "destructive" }); return; }
    try {
      await createEOI.mutateAsync({
        project_name: form.project_name,
        developer_name: form.developer_name || null,
        preferred_unit_type: form.preferred_unit_type || null,
        preferred_floor: form.preferred_floor || null,
        preferred_view: form.preferred_view || null,
        budget_max: form.budget_max || null,
        eoi_amount: form.eoi_amount || null,
        status: "submitted",
        eoi_paid: false,
        notes: form.notes || null,
      } as Partial<REEOI>);
      setShowAdd(false);
      setForm({ project_name: "", developer_name: "", preferred_unit_type: "", preferred_floor: "", preferred_view: "", budget_max: 0, eoi_amount: 0, notes: "" });
      toast({ title: "Success", description: "EOI submitted" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleConvert = async (eoi: REEOI) => {
    try {
      await updateEOI.mutateAsync({ id: eoi.id, updates: { status: "converted_to_deal" } });
      toast({ title: "Success", description: "EOI converted to deal" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleMarkPaid = async (eoi: REEOI) => {
    try {
      await updateEOI.mutateAsync({
        id: eoi.id,
        updates: {
          eoi_paid: true,
          eoi_payment_date: new Date().toISOString().split("T")[0],
          status: eoi.status === "submitted" ? "approved" : eoi.status,
        },
      });
      toast({ title: "Success", description: "Payment recorded" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  // Group by project
  const grouped = eois.reduce<Record<string, REEOI[]>>((acc, eoi) => {
    const key = eoi.project_name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(eoi);
    return acc;
  }, {});

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EOI Tracker</h1>
          <p className="text-muted-foreground">Off-plan expressions of interest</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Submit EOI</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Submit Expression of Interest</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Project Name</Label><Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} placeholder="e.g. Emaar Creek Views" /></div>
                <div><Label>Developer</Label><Input value={form.developer_name} onChange={e => setForm(f => ({ ...f, developer_name: e.target.value }))} placeholder="e.g. Emaar" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Unit Type</Label><Input value={form.preferred_unit_type} onChange={e => setForm(f => ({ ...f, preferred_unit_type: e.target.value }))} placeholder="1BR / 2BR" /></div>
                <div><Label>Floor</Label><Input value={form.preferred_floor} onChange={e => setForm(f => ({ ...f, preferred_floor: e.target.value }))} placeholder="High / Mid" /></div>
                <div><Label>View</Label><Input value={form.preferred_view} onChange={e => setForm(f => ({ ...f, preferred_view: e.target.value }))} placeholder="Sea / City" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Budget Max (AED)</Label><Input type="number" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: +e.target.value }))} /></div>
                <div><Label>EOI Amount (AED)</Label><Input type="number" value={form.eoi_amount} onChange={e => setForm(f => ({ ...f, eoi_amount: +e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Preferences, special requests..." /></div>
              <Button onClick={handleAdd} disabled={createEOI.isPending}>{createEOI.isPending ? "Submitting..." : "Submit EOI"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="allocated">Allocated</SelectItem>
            <SelectItem value="converted_to_deal">Converted</SelectItem>
          </SelectContent>
        </Select>
        {projects.length > 0 && (
          <Select value={projectFilter || "all"} onValueChange={v => setProjectFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.totalEOIs}</div><p className="text-xs text-muted-foreground">Total EOIs</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.approved + stats.allocated}</div><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.converted}</div><p className="text-xs text-muted-foreground">Converted to Deal</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatAED(stats.totalEOIValue)}</div><p className="text-xs text-muted-foreground">Total EOI Value</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : eois.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No EOIs found</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([project, items]) => (
            <div key={project}>
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{project}</h3>
                <span className="text-sm text-muted-foreground">({items.length} EOI{items.length !== 1 ? "s" : ""})</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map(eoi => (
                  <Card key={eoi.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{eoi.developer_name || "Developer TBC"}</p>
                          <p className="text-xs text-muted-foreground">
                            {[eoi.preferred_unit_type, eoi.preferred_floor && `Floor: ${eoi.preferred_floor}`, eoi.preferred_view && `${eoi.preferred_view} view`].filter(Boolean).join(" · ") || "No preferences"}
                          </p>
                        </div>
                        <Badge className={statusColors[eoi.status] || "bg-gray-100"}>{statusLabels[eoi.status] || eoi.status}</Badge>
                      </div>

                      <div className="space-y-1">
                        {eoi.budget_max && <p className="text-xs text-muted-foreground">Budget: {formatAED(eoi.budget_max)}</p>}
                        {eoi.eoi_amount && <p className="text-sm font-semibold">EOI: {formatAED(eoi.eoi_amount)}</p>}
                        {eoi.allocated_unit && <p className="text-xs text-green-700 font-medium">Unit: {eoi.allocated_unit}</p>}
                        {eoi.priority_number && <p className="text-xs text-muted-foreground">Priority #{eoi.priority_number}</p>}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {eoi.eoi_paid ? (
                          <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" /> Unpaid</Badge>
                        )}
                        {eoi.eoi_payment_date && <span className="text-muted-foreground">on {new Date(eoi.eoi_payment_date).toLocaleDateString()}</span>}
                      </div>

                      {eoi.notes && <p className="text-xs text-muted-foreground truncate">{eoi.notes}</p>}

                      <div className="flex gap-2 pt-1">
                        {!eoi.eoi_paid && eoi.status !== "cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkPaid(eoi)}>
                            <DollarSign className="h-3 w-3 mr-1" /> Mark Paid
                          </Button>
                        )}
                        {(eoi.status === "approved" || eoi.status === "allocated") && (
                          <Button size="sm" variant="outline" onClick={() => handleConvert(eoi)}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Convert to Deal
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </RTLWrapper>
  );
}
