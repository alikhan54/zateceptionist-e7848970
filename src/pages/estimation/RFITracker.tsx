import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstimationRFIs } from "@/hooks/useEstimationRFIs";
import { HelpCircle, Plus, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const STATUS_ICON: Record<string, any> = {
  open: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  answered: <CheckCircle className="h-4 w-4 text-green-500" />,
  closed: <XCircle className="h-4 w-4 text-gray-400" />,
};

export default function RFITracker() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { rfis, isLoading, stats, createRFI } = useEstimationRFIs(undefined, statusFilter);

  const [newRFI, setNewRFI] = useState({
    project_id: "",
    topic: "",
    question: "",
    assumptions: "",
    reference_sheets: "",
    directed_to: "",
    priority: "normal",
  });

  const handleCreate = async () => {
    if (!newRFI.topic || !newRFI.question) return;
    await createRFI.mutateAsync({
      ...newRFI,
      rfi_number: (stats.totalRFIs || 0) + 1,
      date_submitted: new Date().toISOString().split("T")[0],
      status: "open",
      impacts_estimate: false,
      assumptions: newRFI.assumptions || null,
      reference_sheets: newRFI.reference_sheets || null,
      directed_to: newRFI.directed_to || null,
    } as any);
    setShowCreate(false);
    setNewRFI({ project_id: "", topic: "", question: "", assumptions: "", reference_sheets: "", directed_to: "", priority: "normal" });
  };

  const daysOpen = (dateSubmitted: string) => Math.floor((Date.now() - new Date(dateSubmitted).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RFI Tracker</h1>
          <p className="text-muted-foreground">Requests for Information across all projects</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New RFI</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit New RFI</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input value={newRFI.topic} onChange={e => setNewRFI(p => ({ ...p, topic: e.target.value }))} placeholder="e.g., Floor Finish Spec Clarification" />
              </div>
              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea value={newRFI.question} onChange={e => setNewRFI(p => ({ ...p, question: e.target.value }))} placeholder="Detail the question..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Assumptions (if no answer received)</Label>
                <Textarea value={newRFI.assumptions} onChange={e => setNewRFI(p => ({ ...p, assumptions: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reference Sheets</Label>
                  <Input value={newRFI.reference_sheets} onChange={e => setNewRFI(p => ({ ...p, reference_sheets: e.target.value }))} placeholder="e.g., A2.1, A4.3" />
                </div>
                <div className="space-y-2">
                  <Label>Directed To</Label>
                  <Input value={newRFI.directed_to} onChange={e => setNewRFI(p => ({ ...p, directed_to: e.target.value }))} placeholder="Architect / GC" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newRFI.priority} onValueChange={v => setNewRFI(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={createRFI.isPending} className="w-full">
                {createRFI.isPending ? "Submitting..." : "Submit RFI"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total RFIs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRFIs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRFIs}</div>
            <p className="text-xs text-muted-foreground">Avg {Math.round(stats.avgDaysOpen)} days open</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.answeredRFIs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedRFIs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="answered">Answered</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading RFIs...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">RFI #</th>
                    <th className="p-3 text-left font-medium">Topic</th>
                    <th className="p-3 text-left font-medium">Question</th>
                    <th className="p-3 text-left font-medium">Assumptions</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Priority</th>
                    <th className="p-3 text-left font-medium">Directed To</th>
                    <th className="p-3 text-right font-medium">Days Open</th>
                  </tr>
                </thead>
                <tbody>
                  {rfis.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium">#{r.rfi_number}</td>
                      <td className="p-3 font-medium">{r.topic}</td>
                      <td className="p-3 max-w-xs truncate">{r.question}</td>
                      <td className="p-3 max-w-xs truncate text-muted-foreground">{r.assumptions || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {STATUS_ICON[r.status]}
                          <span className="capitalize">{r.status}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={r.priority === "urgent" ? "destructive" : r.priority === "high" ? "default" : "secondary"}>
                          {r.priority}
                        </Badge>
                      </td>
                      <td className="p-3">{r.directed_to || "—"}</td>
                      <td className="p-3 text-right">
                        {r.status === "open" ? (
                          <span className={daysOpen(r.date_submitted) > 5 ? "text-red-600 font-medium" : ""}>
                            {daysOpen(r.date_submitted)}d
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                  {rfis.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No RFIs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
