import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarCheck,
  Plus,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useReservations, type Reservation } from "@/hooks/useReservations";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  seated: { label: "Seated", className: "bg-green-500/10 text-green-600 border-green-500/30" },
  completed: { label: "Completed", className: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  no_show: { label: "No Show", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
};

export default function Reservations() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const { reservations, isLoading, createReservation, updateStatus } =
    useReservations(selectedDate);
  const { toast } = useToast();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    date: selectedDate,
    time: "19:00",
    party_size: "2",
    special_requests: "",
  });

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleCreate = async () => {
    if (!form.customer_name || !form.date || !form.time) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    try {
      await createReservation.mutateAsync({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || undefined,
        date: form.date,
        time: form.time,
        party_size: parseInt(form.party_size) || 2,
        special_requests: form.special_requests || undefined,
      });
      toast({ title: "Reservation created!" });
      setShowNewDialog(false);
      setForm({
        customer_name: "",
        customer_phone: "",
        date: selectedDate,
        time: "19:00",
        party_size: "2",
        special_requests: "",
      });
    } catch {
      toast({ title: "Failed to create reservation", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: Reservation["status"]) => {
    try {
      await updateStatus.mutateAsync({ reservationId: id, status });
      toast({ title: `Reservation ${status}` });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  const today = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === today;

  // Summary stats
  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const seated = reservations.filter((r) => r.status === "seated").length;
  const totalGuests = reservations
    .filter((r) => r.status === "confirmed" || r.status === "seated")
    .reduce((sum, r) => sum + r.party_size, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservations</h1>
          <p className="text-muted-foreground mt-1">Manage table reservations</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Reservation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="Guest name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  placeholder="+971 50 123 4567"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Party Size</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={form.party_size}
                    onChange={(e) => setForm({ ...form, party_size: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Special Requests</Label>
                <Input
                  value={form.special_requests}
                  onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                  placeholder="Birthday, window seat, allergies..."
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createReservation.isPending}
              >
                {createReservation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CalendarCheck className="h-4 w-4 mr-2" />
                )}
                Confirm Reservation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{reservations.length}</p>
            <p className="text-sm text-muted-foreground">Total Reservations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{confirmed + seated}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalGuests}</p>
            <p className="text-sm text-muted-foreground">Expected Guests</p>
          </CardContent>
        </Card>
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-lg">{formatDate(selectedDate)}</p>
          {isToday && (
            <Badge variant="secondary" className="text-xs">
              Today
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        {!isToday && (
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>
            Today
          </Button>
        )}
      </div>

      {/* Reservations list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading reservations...
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No reservations for this date</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => {
            const statusCfg = STATUS_CONFIG[res.status] || STATUS_CONFIG.confirmed;
            return (
              <Card key={res.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold">{res.time}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{res.customer_name}</p>
                          <Badge variant="outline" className={statusCfg.className}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {res.party_size} guests
                          </span>
                          {res.customer_phone && <span>{res.customer_phone}</span>}
                          {res.table_number && <span>Table {res.table_number}</span>}
                          {res.source && (
                            <Badge variant="secondary" className="text-xs">
                              {res.source}
                            </Badge>
                          )}
                        </div>
                        {res.special_requests && (
                          <p className="text-sm text-orange-600 mt-1 italic">
                            {res.special_requests}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {res.status === "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(res.id, "seated")}
                        >
                          <UserCheck className="h-4 w-4 mr-1" /> Seat
                        </Button>
                      )}
                      {res.status === "seated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(res.id, "completed")}
                        >
                          Complete
                        </Button>
                      )}
                      {(res.status === "confirmed" || res.status === "seated") && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-orange-600"
                            onClick={() => handleStatusChange(res.id, "no_show")}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleStatusChange(res.id, "cancelled")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
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
