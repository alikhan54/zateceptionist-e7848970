import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  Plus,
  Search,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  AlertTriangle,
  MoreVertical,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAccountingReminders,
  type ReminderChannel,
  type ReminderStatus,
  type ReminderTargetType,
} from "@/hooks/useAccountingReminders";
import { useReminderTargets, type ReminderTargetOption } from "@/hooks/useReminderTargets";
import { useNextReminderFireWindow } from "@/hooks/useNextReminderFireWindow";
import { ChannelSelector, DEFAULT_CHANNEL_OPTIONS } from "@/components/accounting/ChannelSelector";

const STATUS_META: Record<ReminderStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "default", label: "Pending" },
  sent: { variant: "secondary", label: "Sent" },
  failed: { variant: "destructive", label: "Failed" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

const STATUS_ICON: Record<ReminderStatus, typeof Clock> = {
  pending: Clock,
  sent: CheckCircle,
  failed: XCircle,
  cancelled: Ban,
};

const TARGET_TYPE_LABEL: Record<ReminderTargetType, string> = {
  invoice: "Invoice",
  job: "Job",
  filing: "Filing",
  general: "General",
};

interface ScheduleFormState {
  target_type: ReminderTargetType | "";
  target_id: string;
  channel: ReminderChannel;
  scheduled_for_local: string;
}

const EMPTY_FORM: ScheduleFormState = {
  target_type: "",
  target_id: "",
  channel: "email",
  scheduled_for_local: "",
};

function toLocalDatetimeInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalDatetimeInput(v: string): Date {
  return new Date(v);
}

function formatScheduledFor(iso: string): string {
  const d = new Date(iso);
  const ldn = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${ldn} London`;
}

export default function AccountingReminders() {
  const { toast } = useToast();
  const { nextFireLocalLabel } = useNextReminderFireWindow();

  const [statusFilter, setStatusFilter] = useState<ReminderStatus | "">("");
  const [channelFilter, setChannelFilter] = useState<ReminderChannel | "">("");
  const [targetTypeFilter, setTargetTypeFilter] = useState<ReminderTargetType | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>(EMPTY_FORM);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    reminders,
    isLoading,
    scheduleReminder,
    cancelReminder,
    resendReminder,
    deleteReminder,
  } = useAccountingReminders({
    status: statusFilter || undefined,
    channel: channelFilter || undefined,
    targetType: targetTypeFilter || undefined,
  });

  const { data: targets = [], isFetching: targetsLoading } = useReminderTargets(form.target_type);

  const filteredReminders = useMemo(() => {
    if (!searchTerm.trim()) return reminders;
    const t = searchTerm.trim().toLowerCase();
    return reminders.filter((r) => {
      return (
        (r.target_id ?? "").toLowerCase().includes(t) ||
        (r.workflow_type ?? "").toLowerCase().includes(t) ||
        (r.error_message ?? "").toLowerCase().includes(t) ||
        (r.mailbox_used ?? "").toLowerCase().includes(t)
      );
    });
  }, [reminders, searchTerm]);

  const kpis = useMemo(() => {
    const all = reminders;
    const pending = all.filter((r) => r.status === "pending").length;
    const failed = all.filter((r) => r.status === "failed").length;
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sent30 = all.filter(
      (r) => r.status === "sent" && r.sent_at && new Date(r.sent_at).getTime() >= since30,
    ).length;
    return { pending, failed, sent30 };
  }, [reminders]);

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function openSchedule() {
    const next = new Date();
    next.setHours(9, 0, 0, 0);
    if (next.getTime() < Date.now()) next.setDate(next.getDate() + 1);
    setForm({ ...EMPTY_FORM, scheduled_for_local: toLocalDatetimeInputValue(next) });
    setScheduleOpen(true);
  }

  async function handleSchedule() {
    if (!form.target_type) {
      toast({ title: "Pick a target type", description: "Choose what this reminder is about (invoice / job / filing / general).", variant: "destructive" });
      return;
    }
    if (form.target_type !== "general" && !form.target_id) {
      toast({ title: "Pick a target", description: "Pick the specific invoice / job / client.", variant: "destructive" });
      return;
    }
    if (!form.scheduled_for_local) {
      toast({ title: "Pick a date/time", description: "Reminder needs a scheduled fire time.", variant: "destructive" });
      return;
    }
    if (form.channel !== "email") {
      const optMeta = DEFAULT_CHANNEL_OPTIONS.find((o) => o.code === form.channel);
      if (optMeta && !optMeta.configured) {
        toast({
          title: `${optMeta.label} channel not configured`,
          description: `${optMeta.label} isn't provisioned for this tenant yet. The reminder will be created but won't deliver until the channel is set up.`,
          variant: "destructive",
        });
      }
    }
    try {
      await scheduleReminder.mutateAsync({
        target_type: form.target_type as ReminderTargetType,
        target_id: form.target_type === "general" ? (form.target_id || null) : form.target_id,
        channel: form.channel,
        scheduled_for: fromLocalDatetimeInput(form.scheduled_for_local).toISOString(),
      });
      toast({ title: "Reminder scheduled", description: `Will fire at ${form.scheduled_for_local} (your local time).` });
      setScheduleOpen(false);
      resetForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Couldn't schedule", description: msg, variant: "destructive" });
    }
  }

  async function handleCancelConfirm() {
    if (!confirmCancelId) return;
    try {
      await cancelReminder.mutateAsync(confirmCancelId);
      toast({ title: "Reminder cancelled" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Couldn't cancel", description: msg, variant: "destructive" });
    } finally {
      setConfirmCancelId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!confirmDeleteId) return;
    try {
      await deleteReminder.mutateAsync(confirmDeleteId);
      toast({ title: "Reminder deleted" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Couldn't delete", description: msg, variant: "destructive" });
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleResend(id: string) {
    try {
      await resendReminder.mutateAsync(id);
      toast({ title: "Reminder requeued", description: "Will fire at the next window." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Couldn't resend", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-6" data-testid="reminders-page">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Smart Reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-send polite reminders via Email / WhatsApp / SMS. UK business-hours aware (9–18 Mon–Fri, skips bank holidays).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ChannelSelector
            value={(channelFilter || "email") as ReminderChannel}
            onChange={(v) => setChannelFilter(channelFilter === v ? "" : v)}
            size="sm"
            data-testid="channel-filter"
          />
          <Button onClick={openSchedule} data-testid="schedule-reminder-button">
            <Plus className="h-4 w-4 mr-1" />
            Schedule Reminder
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpis">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-pending">{kpis.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-sent30">{kpis.sent30}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-failed">{kpis.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Fire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold" data-testid="kpi-next-fire">{nextFireLocalLabel}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative md:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by target / mailbox / error"
                className="pl-8"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : (v as ReminderStatus))}>
              <SelectTrigger className="md:w-44" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetTypeFilter || "all"} onValueChange={(v) => setTargetTypeFilter(v === "all" ? "" : (v as ReminderTargetType))}>
              <SelectTrigger className="md:w-44" data-testid="target-type-filter">
                <SelectValue placeholder="Target type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All targets</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="filing">Filing</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto" data-testid="reminders-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last attempt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ) : filteredReminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No reminders match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReminders.map((r) => {
                    const Icon = STATUS_ICON[r.status];
                    const isCancellable = r.status === "pending";
                    const isResendable = r.status === "failed";
                    const isDeletable = r.status === "cancelled" || r.status === "pending";
                    return (
                      <TableRow key={r.id} data-testid={`reminder-row-${r.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {formatScheduledFor(r.scheduled_for)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{TARGET_TYPE_LABEL[r.target_type]}</div>
                          {r.target_id && (
                            <div className="text-xs text-muted-foreground truncate max-w-[18ch]" title={r.target_id}>
                              {r.target_id.slice(0, 8)}…
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.channel}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-4 w-4" />
                            <Badge variant={STATUS_META[r.status].variant}>
                              {STATUS_META[r.status].label}
                            </Badge>
                          </div>
                          {r.status === "failed" && r.error_message && (
                            <div
                              className="text-xs text-destructive truncate max-w-[24ch] mt-1"
                              title={r.error_message}
                            >
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {r.error_message}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                          {r.mailbox_used && (
                            <div className="text-[10px]">via {r.mailbox_used}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`row-menu-${r.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isCancellable && (
                                <DropdownMenuItem
                                  onClick={() => setConfirmCancelId(r.id)}
                                  data-testid={`cancel-action-${r.id}`}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              {isResendable && (
                                <DropdownMenuItem
                                  onClick={() => handleResend(r.id)}
                                  data-testid={`resend-action-${r.id}`}
                                >
                                  <RotateCw className="h-4 w-4 mr-2" />
                                  Resend now
                                </DropdownMenuItem>
                              )}
                              {(isCancellable || isResendable) && isDeletable && <DropdownMenuSeparator />}
                              {isDeletable && (
                                <DropdownMenuItem
                                  onClick={() => setConfirmDeleteId(r.id)}
                                  className="text-destructive focus:text-destructive"
                                  data-testid={`delete-action-${r.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Reminders fire Mon–Fri 09:00–18:00 London, skipping UK bank holidays. Next fire window: <strong>{nextFireLocalLabel}</strong>.
          </p>
        </CardContent>
      </Card>

      <Dialog open={scheduleOpen} onOpenChange={(o) => { setScheduleOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg" data-testid="schedule-dialog">
          <DialogHeader>
            <DialogTitle>Schedule reminder</DialogTitle>
            <DialogDescription>
              Pick a target, a channel, and when D6 should fire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Target type</Label>
              <Select
                value={form.target_type || ""}
                onValueChange={(v) => setForm({ ...form, target_type: v as ReminderTargetType, target_id: "" })}
              >
                <SelectTrigger data-testid="form-target-type">
                  <SelectValue placeholder="Choose target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice (chase payment)</SelectItem>
                  <SelectItem value="job">Job (chase deliverable)</SelectItem>
                  <SelectItem value="filing">Filing (CH/HMRC deadline)</SelectItem>
                  <SelectItem value="general">General (one-off nudge)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target_type && (
              <div className="space-y-1.5">
                <Label>Target</Label>
                <Select
                  value={form.target_id}
                  onValueChange={(v) => setForm({ ...form, target_id: v })}
                  disabled={targetsLoading || targets.length === 0}
                >
                  <SelectTrigger data-testid="form-target-id">
                    <SelectValue placeholder={targetsLoading ? "Loading…" : targets.length === 0 ? "No options" : "Pick one"} />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((opt: ReminderTargetOption) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}{opt.sublabel ? ` — ${opt.sublabel}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Channel</Label>
              <ChannelSelector
                value={form.channel}
                onChange={(v) => setForm({ ...form, channel: v })}
                data-testid="form-channel"
              />
              <p className="text-[11px] text-muted-foreground">
                Email is fully configured. WhatsApp / SMS need tenant provisioning before they can dispatch.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-when">When (your local time)</Label>
              <Input
                id="form-when"
                type="datetime-local"
                value={form.scheduled_for_local}
                onChange={(e) => setForm({ ...form, scheduled_for_local: e.target.value })}
                data-testid="form-scheduled-for"
              />
              <p className="text-[11px] text-muted-foreground">
                D6 only fires during business hours — Mon-Fri 09:00-18:00 London, skipping bank holidays. Anything outside that window queues to the next valid slot.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setScheduleOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={scheduleReminder.isPending} data-testid="form-submit">
              <Send className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmCancelId} onOpenChange={(o) => !o && setConfirmCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              The reminder will be marked cancelled and skipped by D6. You can still delete it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>Cancel reminder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the row. Already-sent reminders keep their audit trail elsewhere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
