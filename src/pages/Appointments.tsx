import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { supabase, callWebhook, WEBHOOKS } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Plus,
  List,
  Grid3X3,
  Clock,
  User,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bell,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  customer_id: string;
  customer_name: string;
  service_id: string | null;
  service_name: string | null;
  provider_id: string | null;
  provider_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no-show";
  notes: string | null;
  booking_id: string | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Provider {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  confirmed: "bg-info text-info-foreground",
  completed: "bg-success text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
  "no-show": "bg-destructive text-destructive-foreground",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  confirmed: <CheckCircle2 className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
  "no-show": <AlertCircle className="h-4 w-4" />,
};

export default function AppointmentsPage() {
  const { tenantId, translate, tenantConfig, isLoading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const location = useLocation();
  // Phase 9 A.2 — accept prefill from /clinic/patients/:id "Book" button
  const prefill = (location.state as { prefillPatientId?: string; prefillPhone?: string; prefillName?: string } | null) || null;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  // For add dialog
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [newAppointment, setNewAppointment] = useState({
    customer_id: "",
    service_id: "",
    provider_id: "",
    date: new Date(),
    time: "09:00",
    duration: 60,
    notes: "",
  });

  // Stats
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    completionRate: 0,
    noShowRate: 0,
  });

  const fetchAppointments = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

      // Query direct fields — NO embedded JOINs that break with null foreign keys
      let query = supabase
        .from("appointments")
        .select(`
          id,
          customer_id,
          customer_name,
          service_id,
          service_name,
          provider_id,
          provider,
          scheduled_at,
          appointment_date,
          appointment_time,
          start_time,
          duration_minutes,
          status,
          notes,
          booking_id
        `)
        .eq("tenant_id", tenantId)
        .order("scheduled_at", { ascending: true });

      // Filter by date range — use scheduled_at OR appointment_date
      query = query.or(
        `scheduled_at.gte.${monthStart},appointment_date.gte.${monthStart}`
      );

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Appointments query error:", error);
        throw error;
      }

      console.log("[Appointments] Fetched:", data?.length, "rows");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedAppointments: Appointment[] = (data || [])
        .filter((a: any) => {
          // Filter to current month
          const aptDate = a.scheduled_at || a.appointment_date;
          if (!aptDate) return false;
          const dateStr = aptDate.split("T")[0];
          return dateStr >= monthStart && dateStr <= monthEnd;
        })
        .map((a: any) => ({
          id: a.id,
          customer_id: a.customer_id,
          customer_name: a.customer_name || "Unknown",
          service_id: a.service_id,
          service_name: a.service_name || null,
          provider_id: a.provider_id,
          provider_name: a.provider || null,
          scheduled_at: a.scheduled_at || (a.appointment_date ? a.appointment_date + "T" + (a.start_time || a.appointment_time || "00:00:00") : null),
          duration_minutes: a.duration_minutes || 60,
          status: a.status,
          notes: a.notes,
          booking_id: a.booking_id,
        }));

      setAppointments(formattedAppointments);

      // Calculate stats
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const todayAppointments = formattedAppointments.filter(
        (a) => a.scheduled_at && a.scheduled_at.startsWith(todayStr)
      );

      const completed = formattedAppointments.filter((a) => a.status === "completed").length;
      const noShows = formattedAppointments.filter((a) => a.status === "no-show").length;
      const total = formattedAppointments.length;

      setStats({
        today: todayAppointments.length,
        thisWeek: formattedAppointments.length,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        noShowRate: total > 0 ? Math.round((noShows / total) * 100) : 0,
      });
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, selectedDate, statusFilter]);

  const fetchDropdownData = useCallback(async () => {
    if (!tenantId) return;

    try {
      const [customersRes, servicesRes, providersRes] = await Promise.all([
        supabase.from("customers").select("id, name").eq("tenant_id", tenantId).limit(100),
        supabase.from("services").select("id, name, duration_minutes, price").eq("tenant_id", tenantId),
        supabase.from("providers").select("id, name").eq("tenant_id", tenantId),
      ]);

      setCustomers(customersRes.data || []);
      setServices(servicesRes.data || []);
      setProviders(providersRes.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  // Phase 9 A.2 — when navigated from a patient profile, auto-open Add dialog
  // and pre-fill the customer field (by phone match if available).
  useEffect(() => {
    if (!prefill?.prefillPatientId && !prefill?.prefillPhone) return;
    if (customers.length === 0) return;
    let match: Customer | undefined;
    if (prefill.prefillName) match = customers.find(c => c.name?.toLowerCase() === prefill.prefillName!.toLowerCase());
    if (!match && prefill.prefillName) match = customers.find(c => c.name?.toLowerCase().includes(prefill.prefillName!.toLowerCase()));
    if (match) {
      setNewAppointment(prev => ({ ...prev, customer_id: match!.id, notes: prev.notes || `Booked from patient profile (${prefill.prefillName || ""})` }));
      setIsAddDialogOpen(true);
    }
  }, [prefill, customers]);

  const handleAddAppointment = async () => {
    if (!tenantId || !newAppointment.customer_id) return;

    try {
      const scheduledAt = new Date(newAppointment.date);
      const [hours, minutes] = newAppointment.time.split(":");
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // appointments table has BOTH the modern `scheduled_at` timestamptz AND
      // legacy `appointment_date` (date NOT NULL) + `start_time` (time NOT NULL)
      // columns. Insert with only `scheduled_at` fails with 23502 NOT NULL
      // violation. Populate all three from the same source so reads via either
      // column work.
      const appointmentDate = scheduledAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const startTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
      const endTime = (() => {
        const end = new Date(scheduledAt);
        end.setMinutes(end.getMinutes() + (newAppointment.duration || 30));
        return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:00`;
      })();

      const { error } = await supabase.from("appointments").insert({
        tenant_id: tenantId,
        customer_id: newAppointment.customer_id,
        service_id: newAppointment.service_id || null,
        provider_id: newAppointment.provider_id || null,
        scheduled_at: scheduledAt.toISOString(),
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: newAppointment.duration,
        status: "pending",
        notes: newAppointment.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${translate("appointment")} scheduled successfully`,
      });

      setIsAddDialogOpen(false);
      setNewAppointment({
        customer_id: "",
        service_id: "",
        provider_id: "",
        date: new Date(),
        time: "09:00",
        duration: 60,
        notes: "",
      });
      fetchAppointments();
    } catch (error) {
      console.error("Error adding appointment:", error);
      toast({
        title: "Error",
        description: `Failed to schedule ${translate("appointment").toLowerCase()}`,
        variant: "destructive",
      });
    }
  };

  const openReschedule = (appt: Appointment) => {
    setRescheduleAppt(appt);
    // Prefill from existing scheduled_at (timestamptz preferred), or
    // fall back to appointment_date + start_time (legacy columns).
    const src = (appt as any).scheduled_at
      || ((appt as any).appointment_date && (appt as any).start_time
        ? `${(appt as any).appointment_date}T${(appt as any).start_time}Z`
        : null);
    if (src) {
      const d = new Date(src);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      setRescheduleDate(`${yyyy}-${mm}-${dd}`);
      setRescheduleTime(`${hh}:${mi}`);
    } else {
      setRescheduleDate(new Date().toISOString().slice(0, 10));
      setRescheduleTime("10:00");
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleAppt || !tenantId) return;
    if (!rescheduleDate || !rescheduleTime) {
      toast({ title: "Pick a date and time first", variant: "destructive" });
      return;
    }
    setRescheduleSaving(true);
    try {
      const [yyyy, mm, dd] = rescheduleDate.split('-').map(Number);
      const [hh, mi] = rescheduleTime.split(':').map(Number);
      const scheduled = new Date(yyyy, mm - 1, dd, hh, mi, 0, 0);
      const startTime = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00`;
      const endMins = mi + ((rescheduleAppt as any).duration_minutes || 30);
      const endHh = hh + Math.floor(endMins / 60);
      const endMi = endMins % 60;
      const endTime = `${String(endHh % 24).padStart(2, '0')}:${String(endMi).padStart(2, '0')}:00`;

      const { error } = await supabase.from("appointments").update({
        scheduled_at: scheduled.toISOString(),
        appointment_date: rescheduleDate,
        start_time: startTime,
        end_time: endTime,
      }).eq("id", rescheduleAppt.id).eq("tenant_id", tenantId);
      if (error) throw error;

      // Optimistic local update so the UI reflects the new time immediately
      setAppointments(prev => prev.map(a => a.id === rescheduleAppt.id
        ? { ...a, scheduled_at: scheduled.toISOString() } as any
        : a));

      toast({ title: `${translate("appointment")} rescheduled`, description: scheduled.toLocaleString() });
      setRescheduleAppt(null);
    } catch (err: any) {
      toast({ title: "Could not reschedule", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setRescheduleSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Appointment["status"]) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id).eq("tenant_id", tenantId);

      if (error) throw error;

      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

      toast({
        title: "Status Updated",
        description: `${translate("appointment")} marked as ${status}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSendReminder = async (appointment: Appointment) => {
    if (!tenantId) return;

    try {
      await callWebhook(
        WEBHOOKS.BOOK_APPOINTMENT,
        {
          action: "reminder",
          appointment_id: appointment.id,
          customer_id: appointment.customer_id,
        },
        tenantId,
      );

      toast({
        title: "Reminder Sent",
        description: `Reminder sent to ${appointment.customer_name}`,
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((a) => isSameDay(parseISO(a.scheduled_at), date));
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate("appointments")}</h1>
          <p className="text-muted-foreground mt-1">Manage your {translate("appointments").toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
            <TabsList>
              <TabsTrigger value="calendar">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New {translate("appointment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule {translate("appointment")}</DialogTitle>
                <DialogDescription>Create a new {translate("appointment").toLowerCase()}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{translate("customer")} *</Label>
                  <Select
                    value={newAppointment.customer_id}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${translate("customer").toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{translate("service")}</Label>
                  <Select
                    value={newAppointment.service_id}
                    onValueChange={(value) => {
                      const service = services.find((s) => s.id === value);
                      setNewAppointment({
                        ...newAppointment,
                        service_id: value,
                        duration: service?.duration_minutes || 60,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${translate("service").toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{translate("staff")}</Label>
                  <Select
                    value={newAppointment.provider_id}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, provider_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${translate("staff").toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={format(newAppointment.date, "yyyy-MM-dd")}
                      onChange={(e) => setNewAppointment({ ...newAppointment, date: new Date(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Duration (minutes)</Label>
                  <Select
                    value={newAppointment.duration.toString()}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, duration: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAppointment} disabled={!newAppointment.customer_id}>
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.today}</p>
                <p className="text-xs text-muted-foreground">Today's {translate("appointments").toLowerCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.noShowRate}%</p>
                <p className="text-xs text-muted-foreground">No-show rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {viewMode === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Calendar */}
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md"
                modifiers={{
                  hasAppointments: appointments.map((a) => parseISO(a.scheduled_at)),
                }}
                modifiersStyles={{
                  hasAppointments: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                    color: "hsl(var(--primary))",
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Selected Date Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                <Badge variant="outline">
                  {getAppointmentsForDate(selectedDate).length} {translate("appointments").toLowerCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : getAppointmentsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {translate("appointments").toLowerCase()} for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getAppointmentsForDate(selectedDate).map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold">{format(parseISO(appointment.scheduled_at), "h:mm")}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(appointment.scheduled_at), "a")}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">{appointment.customer_name}</p>
                            {appointment.service_name && (
                              <p className="text-sm text-muted-foreground">{appointment.service_name}</p>
                            )}
                            {appointment.provider_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {appointment.provider_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[appointment.status]}>
                            {statusIcons[appointment.status]}
                            <span className="ml-1 capitalize">{appointment.status}</span>
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, "confirmed")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, "completed")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openReschedule(appointment)} data-testid={`reschedule-${appointment.id}`}>
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendReminder(appointment)}>
                                <Bell className="h-4 w-4 mr-2" />
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(appointment.id, "cancelled")}
                                data-testid={`cancel-appt-${appointment.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, "no-show")}>
                                <AlertCircle className="h-4 w-4 mr-2" />
                                No-Show
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No-Show</SelectItem>
                </SelectContent>
              </Select>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={translate("staff")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {translate("staff")}</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {translate("appointments").toLowerCase()} found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>{translate("customer")}</TableHead>
                    <TableHead>{translate("service")}</TableHead>
                    <TableHead>{translate("staff")}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>{format(parseISO(appointment.scheduled_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(parseISO(appointment.scheduled_at), "h:mm a")}</TableCell>
                      <TableCell className="font-medium">{appointment.customer_name}</TableCell>
                      <TableCell>{appointment.service_name || "-"}</TableCell>
                      <TableCell>{appointment.provider_name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[appointment.status]}>
                          {statusIcons[appointment.status]}
                          <span className="ml-1 capitalize">{appointment.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, "confirmed")}>
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, "completed")}>
                              Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openReschedule(appointment)}
                              data-testid={`reschedule-${appointment.id}`}
                            >
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder(appointment)}>
                              Send Reminder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(appointment.id, "cancelled")}
                              data-testid={`cancel-appt-${appointment.id}`}
                            >
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, "no-show")}>
                              No-Show
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reschedule dialog — Phase 5a J3 */}
      <Dialog open={!!rescheduleAppt} onOpenChange={(v) => !v && setRescheduleAppt(null)}>
        <DialogContent className="max-w-md" data-testid="reschedule-dialog">
          <DialogHeader>
            <DialogTitle>Reschedule {translate("appointment")}</DialogTitle>
            <DialogDescription>
              {rescheduleAppt?.customer_name ? `For ${rescheduleAppt.customer_name}` : "Pick a new date and time."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">New date</Label>
              <Input
                id="reschedule-date"
                data-testid="reschedule-date-input"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-time">New time</Label>
              <Input
                id="reschedule-time"
                data-testid="reschedule-time-input"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleAppt(null)}>Cancel</Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduleSaving || !rescheduleDate || !rescheduleTime}
              data-testid="reschedule-submit"
            >
              {rescheduleSaving ? "Saving..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
