import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Briefcase,
  Plus,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle,
  MoreVertical,
  Search,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAccountingJobs,
  type AccountingJob,
  type AccountingJobPriority,
  type AccountingJobStatus,
} from "@/hooks/useAccountingJobs";
import { useAccountingClientsList } from "@/hooks/useAccountingClientsList";
import { useAccountingTeam } from "@/hooks/useAccountingTeam";
import { useAuth } from "@/contexts/AuthContext";
import {
  FILING_CATEGORIES,
  CATEGORY_BY_CODE,
  type FilingCategory,
} from "@/lib/uk-filing-categories";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const CATEGORY_UNTAGGED_VALUE = "__untagged__";
const OWNER_ALL = "all";
const OWNER_ME = "me";
const OWNER_UNASSIGNED = "unassigned";

const STATUS_OPTIONS: AccountingJobStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
  "blocked",
];

const PRIORITY_OPTIONS: AccountingJobPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
];

const STATUS_META: Record<
  AccountingJobStatus,
  { variant: BadgeVariant; label: string }
> = {
  backlog: { variant: "outline", label: "Backlog" },
  in_progress: { variant: "default", label: "In Progress" },
  review: { variant: "secondary", label: "Review" },
  done: { variant: "secondary", label: "Done" },
  blocked: { variant: "destructive", label: "Blocked" },
};

const PRIORITY_META: Record<
  AccountingJobPriority,
  { variant: BadgeVariant; label: string }
> = {
  urgent: { variant: "destructive", label: "Urgent" },
  high: { variant: "default", label: "High" },
  medium: { variant: "secondary", label: "Medium" },
  low: { variant: "outline", label: "Low" },
};

const INTERNAL_CLIENT_VALUE = "__internal__";

interface JobFormState {
  title: string;
  description: string;
  client_id: string;
  status: AccountingJobStatus;
  priority: AccountingJobPriority;
  owner_user_id: string;
  deadline: string;
  category: string;  // FilingCategory code or CATEGORY_UNTAGGED_VALUE
}

const EMPTY_FORM: JobFormState = {
  title: "",
  description: "",
  client_id: INTERNAL_CLIENT_VALUE,
  status: "backlog",
  priority: "medium",
  owner_user_id: "",
  deadline: "",
  category: CATEGORY_UNTAGGED_VALUE,
};

function formatDateUK(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDeadlineInputValue(value: string | null): string {
  if (!value) return "";
  // accept timestamptz or date strings; emit YYYY-MM-DD for <input type="date">
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function toDeadlineDbValue(value: string): string | null {
  if (!value) return null;
  // <input type="date"> returns YYYY-MM-DD; persist as start-of-day UTC timestamptz
  return `${value}T09:00:00+00:00`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  emphasised,
  testId,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  emphasised?: boolean;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div
              className={`text-2xl font-bold ${emphasised ? "text-destructive" : ""}`}
            >
              {value}
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          <Icon
            className={`h-5 w-5 ${emphasised ? "text-destructive" : "text-muted-foreground"}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountingJobs() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountingJobStatus | "all">(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    AccountingJobPriority | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>(OWNER_ALL);

  // Resolve current user's public.users.id (used for "My Pending" filter)
  const { data: team = [] } = useAccountingTeam();
  const currentUserPublicId = useMemo(() => {
    if (!user?.email) return null;
    return team.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())?.id ?? null;
  }, [team, user?.email]);

  const filters = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (statusFilter !== "all") f.status = statusFilter;
    if (priorityFilter !== "all") f.priority = priorityFilter;
    if (search.trim()) f.searchTerm = search.trim();
    if (categoryFilter !== "all") f.category = categoryFilter;
    if (ownerFilter === OWNER_ME && currentUserPublicId) {
      f.ownerUserId = currentUserPublicId;
    } else if (ownerFilter === OWNER_UNASSIGNED) {
      f.ownerUserId = "unassigned";
    } else if (ownerFilter !== OWNER_ALL && ownerFilter !== OWNER_ME) {
      f.ownerUserId = ownerFilter;
    }
    return f;
  }, [statusFilter, priorityFilter, search, categoryFilter, ownerFilter, currentUserPublicId]);

  const {
    jobs,
    isLoading,
    error,
    refetch,
    createJob,
    updateJob,
    deleteJob,
  } = useAccountingJobs(filters);
  const { data: clients = [] } = useAccountingClientsList();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<AccountingJob | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Hydrate form when opening edit dialog
  useEffect(() => {
    if (!editingJob) return;
    setForm({
      title: editingJob.title ?? "",
      description: editingJob.description ?? "",
      client_id: editingJob.client_id ?? INTERNAL_CLIENT_VALUE,
      status: editingJob.status,
      priority: editingJob.priority,
      owner_user_id: editingJob.owner_user_id ?? "",
      deadline: toDeadlineInputValue(editingJob.deadline),
      category: editingJob.category ?? CATEGORY_UNTAGGED_VALUE,
    });
  }, [editingJob]);

  // Stats over the unfiltered list would be misleading once filters are active;
  // compute stats over the currently-displayed list so the dashboard reflects the view.
  const stats = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();
    return {
      totalOpen: jobs.filter((j) => j.status !== "done").length,
      overdue: jobs.filter(
        (j) =>
          j.status !== "done" &&
          j.deadline &&
          new Date(j.deadline).getTime() < now,
      ).length,
      dueThisWeek: jobs.filter(
        (j) =>
          j.status !== "done" &&
          j.deadline &&
          new Date(j.deadline).getTime() >= now &&
          new Date(j.deadline).getTime() <= weekFromNow,
      ).length,
      doneThisMonth: jobs.filter(
        (j) =>
          j.status === "done" &&
          j.completed_at &&
          new Date(j.completed_at).getTime() >= monthStartMs,
      ).length,
    };
  }, [jobs]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setShowCreateDialog(true);
  }

  function closeDialogs() {
    setShowCreateDialog(false);
    setEditingJob(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({
        title: "Title required",
        description: "Give the job a short, recognisable title.",
        variant: "destructive",
      });
      return;
    }
    const payload: Partial<AccountingJob> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      client_id:
        form.client_id === INTERNAL_CLIENT_VALUE ? null : form.client_id,
      status: form.status,
      priority: form.priority,
      owner_user_id: form.owner_user_id || null,
      deadline: toDeadlineDbValue(form.deadline),
      category: form.category === CATEGORY_UNTAGGED_VALUE ? null : form.category,
    };
    try {
      if (editingJob) {
        await updateJob.mutateAsync({ id: editingJob.id, patch: payload });
        toast({ title: "Job updated", description: form.title.trim() });
      } else {
        await createJob.mutateAsync(payload);
        toast({ title: "Job created", description: form.title.trim() });
      }
      closeDialogs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Couldn't save job", description: msg, variant: "destructive" });
    }
  }

  async function handleQuickStatus(job: AccountingJob, next: AccountingJobStatus) {
    try {
      await updateJob.mutateAsync({ id: job.id, patch: { status: next } });
      toast({
        title: "Status changed",
        description: `${job.title} → ${STATUS_META[next].label}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Couldn't change status", description: msg, variant: "destructive" });
    }
  }

  async function confirmDelete() {
    if (!deletingJobId) return;
    const id = deletingJobId;
    setDeletingJobId(null);
    try {
      await deleteJob.mutateAsync(id);
      toast({ title: "Job deleted" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Couldn't delete job", description: msg, variant: "destructive" });
    }
  }

  const isSaving = createJob.isPending || updateJob.isPending;
  const dialogOpen = showCreateDialog || !!editingJob;
  const dialogMode: "create" | "edit" = editingJob ? "edit" : "create";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}${
                  statusFilter !== "all" || priorityFilter !== "all" || search
                    ? " (filtered)"
                    : ""
                }`}
          </p>
        </div>
        <Button onClick={openCreate} data-testid="new-job-button">
          <Plus className="mr-2 h-4 w-4" /> New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Open Jobs"
          value={stats.totalOpen}
          icon={Briefcase}
          testId="stat-open-jobs"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          emphasised={stats.overdue > 0}
          testId="stat-overdue"
        />
        <StatCard
          label="Due This Week"
          value={stats.dueThisWeek}
          icon={CalendarIcon}
          testId="stat-due-week"
        />
        <StatCard
          label="Done This Month"
          value={stats.doneThisMonth}
          icon={CheckCircle}
          testId="stat-done-month"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="jobs-search"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AccountingJobStatus | "all")}
        >
          <SelectTrigger className="w-40" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) =>
            setPriorityFilter(v as AccountingJobPriority | "all")
          }
        >
          <SelectTrigger className="w-40" data-testid="priority-filter">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-testid="category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {FILING_CATEGORIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-44" data-testid="owner-filter">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OWNER_ALL}>All owners</SelectItem>
            {currentUserPublicId && (
              <SelectItem value={OWNER_ME}>My pending only</SelectItem>
            )}
            <SelectItem value={OWNER_UNASSIGNED}>Unassigned</SelectItem>
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name ?? m.email ?? m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={`skel-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-destructive"
                  >
                    Couldn&apos;t load jobs: {(error as Error).message}.{" "}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => refetch()}
                      data-testid="jobs-retry"
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-sm text-muted-foreground"
                    data-testid="jobs-empty"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Briefcase className="h-8 w-8 text-muted-foreground/50" />
                      <span>
                        {filters.status || filters.priority || filters.searchTerm
                          ? "No jobs match your filters. Try changing the search or filters."
                          : "No jobs yet. Click 'New Job' to create your first."}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => {
                  const isOverdue =
                    !!job.deadline &&
                    job.status !== "done" &&
                    new Date(job.deadline).getTime() < Date.now();
                  const owner = team.find((m) => m.id === job.owner_user_id);
                  return (
                    <TableRow
                      key={job.id}
                      data-testid={`job-row-${job.id}`}
                      data-job-title={job.title}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      tabIndex={0}
                      onClick={() => setEditingJob(job)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditingJob(job);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>
                        {job.accounting_clients?.name ?? (
                          <span className="text-xs italic text-muted-foreground">
                            internal
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.category && CATEGORY_BY_CODE[job.category as FilingCategory] ? (
                          <Badge
                            variant="outline"
                            className="font-medium"
                            style={{
                              borderColor: CATEGORY_BY_CODE[job.category as FilingCategory].color,
                              color: CATEGORY_BY_CODE[job.category as FilingCategory].color,
                            }}
                          >
                            {CATEGORY_BY_CODE[job.category as FilingCategory].short}
                          </Badge>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">untagged</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_META[job.status].variant}>
                          {STATUS_META[job.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_META[job.priority].variant}>
                          {PRIORITY_META[job.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          isOverdue ? "font-medium text-destructive" : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {formatDateUK(job.deadline)}
                          {isOverdue && <AlertTriangle className="h-3 w-3" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {owner?.full_name ??
                          owner?.email ?? (
                            <span className="italic">unassigned</span>
                          )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`job-row-menu-${job.id}`}
                              aria-label="Row actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {STATUS_OPTIONS.filter((s) => s !== job.status).map(
                              (s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickStatus(job, s);
                                  }}
                                  data-testid={`job-row-menu-status-${s}`}
                                >
                                  Move to {STATUS_META[s].label}
                                </DropdownMenuItem>
                              ),
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingJob(job);
                              }}
                            >
                              Edit details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingJobId(job.id);
                              }}
                              data-testid={`job-row-menu-delete`}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer hint */}
      <Card className="border-primary/30 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Smart Reminders — coming May 25, 2026
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Once Reminders launches, each job&apos;s deadline can auto-schedule polite
          client nudges via Email, WhatsApp, or SMS — UK business-hours aware,
          skipping bank holidays.
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "New Job" : "Edit Job"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Track a piece of client work — VAT returns, year-end accounts, tax filings, anything."
                : `Update the details for "${editingJob?.title ?? ""}".`}
            </DialogDescription>
          </DialogHeader>
          <form
            id="job-form"
            onSubmit={handleSubmit}
            className="grid gap-4 py-2"
          >
            <div className="grid gap-2">
              <Label htmlFor="job-title">Title *</Label>
              <Input
                id="job-title"
                data-testid="job-form-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. VAT return Q1 2026 — Acme Ltd"
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="job-description">Description</Label>
              <Textarea
                id="job-description"
                data-testid="job-form-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional notes, references, checklist hints…"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Client</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger data-testid="job-form-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INTERNAL_CLIENT_VALUE}>
                    (internal — no client)
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as AccountingJobStatus })
                  }
                >
                  <SelectTrigger data-testid="job-form-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm({ ...form, priority: v as AccountingJobPriority })
                  }
                >
                  <SelectTrigger data-testid="job-form-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Owner</Label>
                <Select
                  value={form.owner_user_id || "__unassigned__"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      owner_user_id: v === "__unassigned__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger data-testid="job-form-owner">
                    <SelectValue placeholder="Assign owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {team.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name ?? m.email ?? m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-deadline">Deadline</Label>
                <Input
                  id="job-deadline"
                  data-testid="job-form-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>UK filing category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger data-testid="job-form-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_UNTAGGED_VALUE}>
                    Untagged
                  </SelectItem>
                  {FILING_CATEGORIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialogs}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="job-form"
              disabled={isSaving || !form.title.trim()}
              data-testid="job-form-submit"
            >
              {isSaving
                ? "Saving…"
                : dialogMode === "create"
                  ? "Create Job"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingJobId}
        onOpenChange={(open) => {
          if (!open) setDeletingJobId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the job. There&apos;s no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-job"
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
