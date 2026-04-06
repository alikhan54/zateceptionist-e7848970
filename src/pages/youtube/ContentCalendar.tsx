import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useYTChannels,
  useYTCalendar,
  useCreateCalendarEntry,
  useUpdateCalendarEntry,
  useDeleteCalendarEntry,
  type YTContentCalendarEntry,
} from "@/hooks/useYouTubeAgency";

interface CalendarDayCell {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
}

interface EntryFormState {
  id?: string;
  channel_id: string;
  title: string;
  description: string;
  topic: string;
  niche: string;
  planned_date: string;
  planned_time: string;
  status: string;
  channel_name: string;
  notes: string;
}

const STATUS_OPTIONS = [
  { value: "idea", label: "Idea", color: "bg-slate-500", chipColor: "bg-slate-500/10 text-slate-700 border-slate-500/30" },
  { value: "scripted", label: "Scripted", color: "bg-blue-500", chipColor: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { value: "filming", label: "Filming", color: "bg-amber-500", chipColor: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { value: "editing", label: "Editing", color: "bg-purple-500", chipColor: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  { value: "ready", label: "Ready", color: "bg-green-500", chipColor: "bg-green-500/10 text-green-700 border-green-500/30" },
  { value: "published", label: "Published", color: "bg-cyan-500", chipColor: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30" },
  { value: "postponed", label: "Postponed", color: "bg-orange-500", chipColor: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500", chipColor: "bg-red-500/10 text-red-700 border-red-500/30" },
];

const getStatusMeta = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toMonthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const parseMonthKey = (key: string): Date => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

const formatMonthLabel = (key: string): string => {
  const d = parseMonthKey(key);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const isoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const buildCalendarCells = (monthKey: string): CalendarDayCell[] => {
  const first = parseMonthKey(monthKey);
  const year = first.getFullYear();
  const month = first.getMonth();
  const startWeekday = first.getDay();

  const cells: CalendarDayCell[] = [];

  // Leading days from previous month
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, iso: isoDate(d), isCurrentMonth: false });
  }

  // Current month
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, iso: isoDate(d), isCurrentMonth: true });
  }

  // Trailing days to fill the grid to a multiple of 7
  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1];
    const d = new Date(lastCell.date);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, iso: isoDate(d), isCurrentMonth: false });
  }

  return cells;
};

const emptyForm = (): EntryFormState => ({
  channel_id: "",
  title: "",
  description: "",
  topic: "",
  niche: "",
  planned_date: isoDate(new Date()),
  planned_time: "",
  status: "idea",
  channel_name: "",
  notes: "",
});

export default function ContentCalendar() {
  const { toast } = useToast();
  const [monthKey, setMonthKey] = useState<string>(toMonthKey(new Date()));
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<YTContentCalendarEntry | null>(null);
  const [form, setForm] = useState<EntryFormState>(emptyForm());

  const { data: channels } = useYTChannels();
  const {
    data: entries,
    isLoading,
  } = useYTCalendar(monthKey, channelFilter || undefined);
  const createEntry = useCreateCalendarEntry();
  const updateEntry = useUpdateCalendarEntry();
  const deleteEntry = useDeleteCalendarEntry();

  const cells = useMemo(() => buildCalendarCells(monthKey), [monthKey]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, YTContentCalendarEntry[]>();
    (entries || []).forEach((e) => {
      const key = e.planned_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [entries]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (entries || []).forEach((e) => {
      counts[e.status] = (counts[e.status] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const totalThisMonth = entries?.length || 0;

  const handlePrevMonth = () => {
    const d = parseMonthKey(monthKey);
    d.setMonth(d.getMonth() - 1);
    setMonthKey(toMonthKey(d));
  };

  const handleNextMonth = () => {
    const d = parseMonthKey(monthKey);
    d.setMonth(d.getMonth() + 1);
    setMonthKey(toMonthKey(d));
  };

  const handleToday = () => {
    setMonthKey(toMonthKey(new Date()));
  };

  const openNewEntry = (dateIso?: string) => {
    setEditingEntry(null);
    setForm({
      ...emptyForm(),
      planned_date: dateIso || isoDate(new Date()),
    });
    setDialogOpen(true);
  };

  const openEditEntry = (entry: YTContentCalendarEntry) => {
    setEditingEntry(entry);
    setForm({
      id: entry.id,
      channel_id: entry.channel_id || "",
      title: entry.title,
      description: entry.description || "",
      topic: entry.topic || "",
      niche: entry.niche || "",
      planned_date: entry.planned_date,
      planned_time: entry.planned_time || "",
      status: entry.status,
      channel_name: entry.channel_name || "",
      notes: entry.notes || "",
    });
    setDialogOpen(true);
  };

  const handleChannelSelect = (channelId: string) => {
    const ch = (channels || []).find((c) => c.id === channelId);
    setForm((prev) => ({
      ...prev,
      channel_id: channelId,
      channel_name: ch?.channel_name || ch?.handle || prev.channel_name,
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the content.",
        variant: "destructive",
      });
      return;
    }
    if (!form.planned_date) {
      toast({
        title: "Date required",
        description: "Please select a planned date.",
        variant: "destructive",
      });
      return;
    }

    const payload: Partial<YTContentCalendarEntry> = {
      channel_id: form.channel_id || null,
      channel_name: form.channel_name || null,
      title: form.title.trim(),
      description: form.description || null,
      topic: form.topic || null,
      niche: form.niche || null,
      planned_date: form.planned_date,
      planned_time: form.planned_time || null,
      status: form.status,
      notes: form.notes || null,
    };

    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({ id: editingEntry.id, ...payload });
        toast({ title: "Updated", description: "Calendar entry updated." });
      } else {
        await createEntry.mutateAsync(payload);
        toast({ title: "Created", description: "Calendar entry created." });
      }
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    try {
      await deleteEntry.mutateAsync(editingEntry.id);
      toast({ title: "Deleted", description: "Calendar entry removed." });
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const todayIso = isoDate(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Plan and schedule content across all your clients
        </p>
      </div>

      {/* Top bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center">
                <p className="text-lg font-semibold">
                  {formatMonthLabel(monthKey)}
                </p>
              </div>
              <Button size="icon" variant="outline" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleToday}>
                Today
              </Button>
            </div>

            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1">
                <Select
                  value={channelFilter}
                  onValueChange={(val) =>
                    setChannelFilter(val === "all" ? "" : val)
                  }
                >
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All channels</SelectItem>
                    {(channels || []).map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.channel_name || ch.handle || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => openNewEntry()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            {formatMonthLabel(monthKey)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading calendar...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-center text-xs font-semibold text-muted-foreground py-2"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell) => {
                  const dayEntries = entriesByDate.get(cell.iso) || [];
                  const isToday = cell.iso === todayIso;
                  return (
                    <div
                      key={cell.iso}
                      className={`min-h-[110px] border rounded-md p-1.5 flex flex-col gap-1 ${
                        cell.isCurrentMonth
                          ? "bg-card"
                          : "bg-muted/20 opacity-60"
                      } ${isToday ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            isToday ? "text-primary" : ""
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>
                        <button
                          onClick={() => openNewEntry(cell.iso)}
                          className="opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          title="Add content"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEntries.slice(0, 3).map((entry) => {
                          const meta = getStatusMeta(entry.status);
                          return (
                            <button
                              key={entry.id}
                              onClick={() => openEditEntry(entry)}
                              className={`w-full text-left rounded px-1.5 py-1 border text-[10px] leading-tight ${meta.chipColor}`}
                            >
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-block w-1.5 h-1.5 rounded-full ${meta.color}`}
                                />
                                <span className="truncate font-medium">
                                  {entry.channel_name || "No channel"}
                                </span>
                              </div>
                              <p className="truncate">{entry.title}</p>
                            </button>
                          );
                        })}
                        {dayEntries.length > 3 && (
                          <p className="text-[10px] text-muted-foreground pl-1">
                            +{dayEntries.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Total this month</p>
              <p className="text-xl font-bold">{totalThisMonth}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex items-center gap-3 flex-wrap flex-1">
              {STATUS_OPTIONS.map((s) => (
                <div
                  key={s.value}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${s.color}`}
                  />
                  <span className="text-muted-foreground capitalize">
                    {s.label}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {statusCounts[s.value] || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Content" : "Add Content"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-channel">Channel</Label>
              <Select
                value={form.channel_id}
                onValueChange={handleChannelSelect}
              >
                <SelectTrigger id="form-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {(channels || []).map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.channel_name || ch.handle || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="form-title"
                placeholder="e.g. How I gained 10k subs in 30 days"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="form-date">
                  Planned Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="form-date"
                  type="date"
                  value={form.planned_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, planned_date: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-time">Time</Label>
                <Input
                  id="form-time"
                  type="time"
                  value={form.planned_time}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, planned_time: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="form-topic">Topic</Label>
                <Input
                  id="form-topic"
                  placeholder="e.g. YouTube growth"
                  value={form.topic}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, topic: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger id="form-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-notes">Notes</Label>
              <Textarea
                id="form-notes"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            {editingEntry && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEntry.isPending}
                className="mr-auto"
              >
                {deleteEntry.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createEntry.isPending || updateEntry.isPending}
            >
              {(createEntry.isPending || updateEntry.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : editingEntry ? (
                <Edit className="h-4 w-4 mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {editingEntry ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
