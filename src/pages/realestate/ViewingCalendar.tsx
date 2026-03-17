import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRealEstateViewings, REViewing } from "@/hooks/useRealEstateViewings";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Eye, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
  rescheduled: "bg-yellow-100 text-yellow-800",
};

const reactionIcons: Record<string, string> = {
  too_high: "Price too high",
  fair: "Fair price",
  good_deal: "Good deal",
  willing_to_negotiate: "Will negotiate",
};

export default function ViewingCalendar() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { viewings, isLoading, stats, createViewing, updateViewing } = useRealEstateViewings(statusFilter ? { status: statusFilter } : undefined);
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ scheduled_date: "", scheduled_time: "10:00", duration_minutes: 30, notes: "" });
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ client_interested: false, client_feedback: "", price_reaction: "", likelihood_score: 50 });

  const handleAdd = async () => {
    if (!form.scheduled_date || !form.scheduled_time) { toast({ title: "Error", description: "Date and time required", variant: "destructive" }); return; }
    try {
      await createViewing.mutateAsync({
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        duration_minutes: form.duration_minutes,
        notes: form.notes || null,
      } as Partial<REViewing>);
      setShowAdd(false);
      toast({ title: "Success", description: "Viewing scheduled" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleFeedback = async () => {
    if (!feedbackId) return;
    try {
      await updateViewing.mutateAsync({
        id: feedbackId,
        updates: {
          status: "completed",
          client_interested: feedback.client_interested,
          client_feedback: feedback.client_feedback || null,
          price_reaction: feedback.price_reaction || null,
          likelihood_score: feedback.likelihood_score,
        },
      });
      setFeedbackId(null);
      toast({ title: "Success", description: "Feedback recorded" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const grouped = viewings.reduce<Record<string, REViewing[]>>((acc, v) => {
    const date = v.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(v);
    return acc;
  }, {});

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Viewings</h1>
          <p className="text-muted-foreground">Property viewing appointments</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Schedule Viewing</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Viewing</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} /></div>
                <div><Label>Time</Label><Input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} /></div>
              </div>
              <div><Label>Duration (minutes)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Client preferences, property details..." /></div>
              <Button onClick={handleAdd} disabled={createViewing.isPending}>{createViewing.isPending ? "Scheduling..." : "Schedule"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="no_show">No Show</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.todayViewings}</div><p className="text-xs text-muted-foreground">Today</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.thisWeekViewings}</div><p className="text-xs text-muted-foreground">This Week</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.conversionRate}%</div><p className="text-xs text-muted-foreground">Interest Rate</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.noShows}</div><p className="text-xs text-muted-foreground">No Shows</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : viewings.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No viewings found</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, views]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{new Date(date + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
              <div className="space-y-2">
                {views.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)).map((v) => (
                  <Card key={v.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm font-medium min-w-[80px]">
                          <Clock className="h-3 w-3" /> {v.scheduled_time.slice(0, 5)}
                        </div>
                        <Badge className={statusColors[v.status] || "bg-gray-100"}>{v.status}</Badge>
                        {v.client_interested === true && <ThumbsUp className="h-4 w-4 text-green-600" />}
                        {v.client_interested === false && v.status === "completed" && <ThumbsDown className="h-4 w-4 text-red-600" />}
                        {v.price_reaction && <span className="text-xs text-muted-foreground">{reactionIcons[v.price_reaction] || v.price_reaction}</span>}
                        {v.notes && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{v.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {v.likelihood_score !== null && <span className="text-xs text-muted-foreground">Score: {v.likelihood_score}%</span>}
                        {(v.status === "scheduled" || v.status === "confirmed") && (
                          <Button size="sm" variant="outline" onClick={() => { setFeedbackId(v.id); setFeedback({ client_interested: false, client_feedback: "", price_reaction: "", likelihood_score: 50 }); }}>
                            <Eye className="h-3 w-3 mr-1" /> Record Feedback
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

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackId} onOpenChange={() => setFeedbackId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post-Viewing Feedback</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <Button variant={feedback.client_interested ? "default" : "outline"} onClick={() => setFeedback(f => ({ ...f, client_interested: true }))} className="flex-1"><ThumbsUp className="mr-2 h-4 w-4" /> Interested</Button>
              <Button variant={!feedback.client_interested ? "destructive" : "outline"} onClick={() => setFeedback(f => ({ ...f, client_interested: false }))} className="flex-1"><ThumbsDown className="mr-2 h-4 w-4" /> Not Interested</Button>
            </div>
            <div><Label>Price Reaction</Label><Select value={feedback.price_reaction} onValueChange={v => setFeedback(f => ({ ...f, price_reaction: v }))}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="too_high">Too High</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="good_deal">Good Deal</SelectItem><SelectItem value="willing_to_negotiate">Willing to Negotiate</SelectItem></SelectContent></Select></div>
            <div><Label>Likelihood Score: {feedback.likelihood_score}%</Label><Input type="range" min={0} max={100} value={feedback.likelihood_score} onChange={e => setFeedback(f => ({ ...f, likelihood_score: +e.target.value }))} /></div>
            <div><Label>Feedback Notes</Label><Input value={feedback.client_feedback} onChange={e => setFeedback(f => ({ ...f, client_feedback: e.target.value }))} placeholder="Client comments..." /></div>
            <Button onClick={handleFeedback}>Save Feedback</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </RTLWrapper>
  );
}
