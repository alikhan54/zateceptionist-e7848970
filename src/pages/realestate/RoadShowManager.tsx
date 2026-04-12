import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRealEstateRoadShows, RERoadShow } from "@/hooks/useRealEstateRoadShows";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Users, Eye, Handshake, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useCurrency } from "@/hooks/useCurrency";


const statusColors: Record<string, string> = {
  planning: "bg-gray-100 text-gray-800",
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  international_roadshow: "International Road Show",
  local_event: "Local Event",
  exhibition: "Exhibition",
  broker_event: "Broker Event",
  developer_launch: "Developer Launch",
  open_house: "Open House",
};

export default function RoadShowManager() {
  const { formatPrice } = useCurrency();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { roadShows, isLoading, stats, createRoadShow } = useRealEstateRoadShows({
    status: statusFilter || undefined,
  });
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    event_name: "", event_type: "international_roadshow", location: "",
    city: "", country: "", start_date: "", end_date: "",
    budget: 0, notes: "",
  });

  const handleAdd = async () => {
    if (!form.event_name || !form.start_date) {
      toast({ title: "Error", description: "Event name and start date are required", variant: "destructive" });
      return;
    }
    try {
      await createRoadShow.mutateAsync({
        event_name: form.event_name,
        event_type: form.event_type,
        location: form.location || null,
        city: form.city || null,
        country: form.country || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        budget: form.budget || null,
        status: "planning",
        leads_captured: 0,
        viewings_booked: 0,
        deals_closed: 0,
        total_deal_value: 0,
        notes: form.notes || null,
      } as Partial<RERoadShow>);
      setShowAdd(false);
      setForm({ event_name: "", event_type: "international_roadshow", location: "", city: "", country: "", start_date: "", end_date: "", budget: 0, notes: "" });
      toast({ title: "Success", description: "Road show created" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Road Shows</h1>
          <p className="text-muted-foreground">Events, exhibitions, and property showcases</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Create Event</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Road Show / Event</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Event Name</Label><Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="Dubai Property Show London 2025" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Event Type</Label>
                  <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="international_roadshow">International Road Show</SelectItem>
                      <SelectItem value="local_event">Local Event</SelectItem>
                      <SelectItem value="exhibition">Exhibition</SelectItem>
                      <SelectItem value="broker_event">Broker Event</SelectItem>
                      <SelectItem value="developer_launch">Developer Launch</SelectItem>
                      <SelectItem value="open_house">Open House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue name" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="London" /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="UK" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Budget (AED)</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: +e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Target audience, projects to showcase..." /></div>
              <Button onClick={handleAdd} disabled={createRoadShow.isPending}>{createRoadShow.isPending ? "Creating..." : "Create Event"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.totalEvents}</div><p className="text-xs text-muted-foreground">Total Events</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.totalLeads}</div><p className="text-xs text-muted-foreground">Leads Captured</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.totalDeals}</div><p className="text-xs text-muted-foreground">Deals Closed</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.roi}%</div><p className="text-xs text-muted-foreground">ROI</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : roadShows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No road shows found</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadShows.map(show => {
            const isUpcoming = show.start_date > today;
            const isActive = show.start_date <= today && (!show.end_date || show.end_date >= today);

            return (
              <Card key={show.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{show.event_name}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {[show.location, show.city, show.country].filter(Boolean).join(", ") || "Location TBC"}
                      </p>
                    </div>
                    <Badge className={statusColors[show.status] || "bg-gray-100"}>{show.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{new Date(show.start_date + "T00:00").toLocaleDateString()}</span>
                    {show.end_date && <span>- {new Date(show.end_date + "T00:00").toLocaleDateString()}</span>}
                  </div>

                  <Badge variant="outline" className="text-xs">{typeLabels[show.event_type] || show.event_type}</Badge>

                  {/* Funnel metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center border rounded-lg p-2">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> Leads</div>
                      <p className="text-lg font-bold">{show.leads_captured}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> Viewings</div>
                      <p className="text-lg font-bold">{show.viewings_booked}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Handshake className="h-3 w-3" /> Deals</div>
                      <p className="text-lg font-bold">{show.deals_closed}</p>
                    </div>
                  </div>

                  {/* Financial */}
                  <div className="space-y-1 text-xs">
                    {show.total_deal_value > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Deal Value</span>
                        <span className="font-semibold text-green-700">{formatPrice(show.total_deal_value)}</span>
                      </div>
                    )}
                    {show.budget && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Budget</span>
                        <span>{formatPrice(show.budget)}</span>
                      </div>
                    )}
                    {show.actual_cost && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Actual Cost</span>
                        <span>{formatPrice(show.actual_cost)}</span>
                      </div>
                    )}
                    {show.actual_cost && show.total_deal_value > 0 && (
                      <div className="flex items-center justify-between border-t pt-1">
                        <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ROI</span>
                        <span className="font-semibold">{Math.round((show.total_deal_value / show.actual_cost) * 100)}%</span>
                      </div>
                    )}
                  </div>

                  {show.notes && <p className="text-xs text-muted-foreground truncate">{show.notes}</p>}
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
