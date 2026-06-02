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
  Search,} from "lucide-react";
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
  jobCategoryMeta,
} from "@/lib/uk-filing-categories";
import { useAccountingJobTypes } from "@/hooks/useAccountingJobTypes";
import { useAccountingJobStatuses } from "@/hooks/useAccountingJobStatuses";
import { useAccountingJobStatusCounts } from "@/hooks/useAccountingJobStatusCounts";
import { computeJobDates, formatCompanyType, computePriority, computeJobDescription } from "@/lib/job-date-engine";
// Phase 4 (2026-06-02): per-client tasking via ?client=<id>&new=1 URL params.
import { useSearchParams } from "react-router-dom";
// Phase E: auto-create a draft invoice when a job is created with an assignee
// and the job-type has a default_fee. Idempotency is enforced at the DB layer
// by the partial UNIQUE index on (tenant_id, job_id) WHERE job_id IS NOT NULL.
import { useAccountingInvoices } from "@/hooks/useAccountingInvoices";
import { useGenerateInvoiceNumber } from "@/hooks/useGenerateInvoiceNumber";
// Phase F: bulk-enrol the statutory-deadline cadence (T-30 → T-0). The Reminders
// Engine workflow (n8n iuCAelOlyPluKdHg) reads accounting_reminders AS-IS via
// REM.7's target_type='job' branch — no n8n edit. Engine handles bank holidays.
import { useScheduleJobReminders } from "@/hooks/useScheduleJobReminders";
import { pickReminderWorkflowType } from "@/lib/reminder-cadence";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const CATEGORY_UNTAGGED_VALUE = "__untagged__";
const OWNER_ALL = "all";
const OWNER_ME = "me";
const OWNER_UNASSIGNED = "unassigned";

// Legacy 5-status fallback (used only when no DB statuses are seeded, e.g. a
// non-accounting tenant). Wave 2a tenants drive status from accounting_job_statuses.
const STATUS_OPTIONS: string[] = [
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

const STATUS_META: Record<string, { variant: BadgeVariant; label: string }> = {
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
  // Wave 1 Phase C: period covered + internal staff-only notes (separate from `description`).
  period_end: string;   // YYYY-MM-DD (empty string when blank)
  staff_notes: string;
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
  period_end: "",
  staff_notes: "",
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

  // Phase 4 (2026-06-02): /accounting/jobs?client=<uuid>&new=1 drives per-client tasking.
  const [searchParams, setSearchParams] = useSearchParams();
  const clientParam = searchParams.get("client") || "";
  const newJobParam = searchParams.get("new") === "1";

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
    // Phase 4: filter the Jobs list to a single client when present.
    if (clientParam) f.clientId = clientParam;
    return f;
  }, [statusFilter, priorityFilter, search, categoryFilter, ownerFilter, currentUserPublicId, clientParam]);

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
  // Wave 1: DB-driven job-type picker. Empty array for non-accounting tenants (no rows seeded).
  const { data: jobTypes = [] } = useAccountingJobTypes();
  const jobTypeByCode = useMemo(
    () => new Map(jobTypes.map((t) => [t.code, t])),
    [jobTypes],
  );
  // Wave 2a Phase 3: DB-driven 13-stage status workflow.
  const { data: jobStatuses = [] } = useAccountingJobStatuses();
  const statusByCode = useMemo(
    () => new Map(jobStatuses.map((s) => [s.code, s])),
    [jobStatuses],
  );
  // Status codes to offer in selects/filters: DB stages (by sort_order) when
  // seeded, else the legacy 5. Resolver returns {label,color,variant} for badges.
  const statusOptionCodes = useMemo(
    () => (jobStatuses.length ? jobStatuses.map((s) => s.code) : STATUS_OPTIONS),
    [jobStatuses],
  );
  const statusMeta = (code: string): { label: string; color: string | null; variant: BadgeVariant } => {
    const db = statusByCode.get(code);
    if (db) return { label: db.label, color: db.color, variant: "outline" };
    const legacy = STATUS_META[code];
    if (legacy) return { label: legacy.label, color: null, variant: legacy.variant };
    return { label: code, color: null, variant: "secondary" };
  };
  // Phase 3: unfiltered per-stage counts for the pipeline chip strip.
  const { data: statusCounts = {} } = useAccountingJobStatusCounts();
  // Phase E: invoice creator + invoice-number generator (used inside handleSubmit
  // only — the auto-invoice path runs after a successful createJob).
  const { createInvoice } = useAccountingInvoices();
  const generateInvoiceNumber = useGenerateInvoiceNumber();
  // Phase F: bulk reminder enrolment for jobs with a statutory deadline.
  const scheduleJobReminders = useScheduleJobReminders();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<AccountingJob | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  // Wave 2a Phase 2: track manual edits so auto-priority/auto-description never
  // overwrite what the user typed/picked. Reset on dialog open/close.
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

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
      // Phase C: hydrate period_end + staff_notes. Empty string when null.
      period_end: editingJob.period_end ?? "",
      staff_notes: editingJob.staff_notes ?? "",
    });
    // Phase 2: existing job's priority + description are user data — preserve them
    // (treat as touched so re-picking category won't auto-overwrite a saved value).
    setPriorityTouched(true);
    setDescriptionTouched(!!(editingJob.description && editingJob.description.trim()));
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

  function openCreate(presetClientId?: string) {
    setForm({
      ...EMPTY_FORM,
      client_id: presetClientId && presetClientId !== ""
        ? presetClientId
        : EMPTY_FORM.client_id,
    });
    // Phase 2: fresh create → allow auto-priority/auto-description.
    setPriorityTouched(false);
    setDescriptionTouched(false);
    setShowCreateDialog(true);
  }

  function closeDialogs() {
    setShowCreateDialog(false);
    setEditingJob(null);
    setForm(EMPTY_FORM);
    // Phase 4: clear the new=1 URL param so reload doesn't re-open the dialog.
    if (newJobParam) {
      const sp = new URLSearchParams(searchParams);
      sp.delete("new");
      setSearchParams(sp, { replace: true });
    }
  }

  // Phase 4: on mount, if ?new=1, auto-open the Create dialog pre-filled with the URL client.
  useEffect(() => {
    if (newJobParam && !showCreateDialog && !editingJob) {
      openCreate(clientParam || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newJobParam, clientParam]);

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
    // Wave 1 Phase B: write `category` (text) AND `job_type_id` (FK) side-by-side.
    // If the picked code matches a row in accounting_job_types, persist the UUID; else null.
    // Legacy FILING_CATEGORIES codes (vat, ct600, accounts_full, etc.) will not match any
    // job_type row and will land as job_type_id=NULL — that's intentional back-compat for
    // the 5 demo jobs created before the migration.
    const pickedCategory =
      form.category === CATEGORY_UNTAGGED_VALUE ? null : form.category;
    const pickedJobTypeId =
      pickedCategory != null ? (jobTypeByCode.get(pickedCategory)?.id ?? null) : null;
    const payload: Partial<AccountingJob> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      client_id:
        form.client_id === INTERNAL_CLIENT_VALUE ? null : form.client_id,
      status: form.status,
      priority: form.priority,
      owner_user_id: form.owner_user_id || null,
      deadline: toDeadlineDbValue(form.deadline),
      category: pickedCategory,
      job_type_id: pickedJobTypeId,
      // Phase C: persist period_end + staff_notes. Empty form-string ⇒ null in DB.
      period_end: form.period_end || null,
      staff_notes: form.staff_notes.trim() || null,
    };
    try {
      if (editingJob) {
        await updateJob.mutateAsync({ id: editingJob.id, patch: payload });
        toast({ title: "Job updated", description: form.title.trim() });
      } else {
        const newJob = await createJob.mutateAsync(payload);
        toast({ title: "Job created", description: form.title.trim() });

        // Phase E: auto-create a DRAFT invoice when:
        //   1. Job has an assigned owner (owner_user_id set)
        //   2. A real client is linked (not internal)
        //   3. The picked job_type has a default_fee set (NOT NULL, > 0)
        // Idempotency: the partial UNIQUE index on (tenant_id, job_id) WHERE
        // job_id IS NOT NULL will reject a duplicate — we catch that quietly.
        // Failure to create the invoice is non-fatal: the job still saved.
        const jt = pickedCategory ? jobTypeByCode.get(pickedCategory) : null;
        const eligible =
          !!newJob.owner_user_id &&
          !!newJob.client_id &&
          !!jt &&
          jt.default_fee != null &&
          Number(jt.default_fee) > 0;
        if (eligible && jt) {
          try {
            const invoiceNo = await generateInvoiceNumber();
            await createInvoice.mutateAsync({
              client_id: newJob.client_id as string,
              invoice_no: invoiceNo,
              amount: Number(jt.default_fee),
              currency: jt.default_currency || "GBP",
              status: "draft",
              description: jt.name,
              job_id: newJob.id,
            });
            toast({
              title: "Draft invoice created",
              description: `${invoiceNo} • ${jt.default_currency || "GBP"} ${Number(jt.default_fee).toFixed(2)} • ${jt.name}`,
            });
          } catch (invErr) {
            // 23505 = unique_violation from Postgres → idempotent duplicate skip.
            const msg = invErr instanceof Error ? invErr.message : String(invErr);
            const code = (invErr as { code?: string } | null)?.code;
            const isDup =
              code === "23505" ||
              /duplicate|unique|uq_acc_inv_tenant_job/i.test(msg);
            if (!isDup) {
              toast({
                title: "Auto-invoice skipped",
                description: msg,
                variant: "destructive",
              });
            }
            // Silent on dup — the draft already exists, nothing to do.
          }
        }

        // Phase F: enroll the statutory-deadline reminder cadence when:
        //   1. The new job has a deadline (NULL ⇒ skip)
        //   2. The job has a client (no recipient ⇒ skip — can't email)
        //   3. The picked job_type has auto_reminder=true (decision #5: per-type opt-in)
        // The Reminders Engine (n8n iuCAelOlyPluKdHg) reads accounting_reminders
        // AS-IS via REM.7's target_type='job' branch; engine handles bank
        // holidays + business-hours windows itself. We only INSERT here.
        // Idempotent inside the hook: existing pending/sent reminders for the
        // (job, target_type='job') triple ⇒ enrolment skipped silently.
        const reminderEligible =
          !!newJob.deadline &&
          !!newJob.client_id &&
          !!jt &&
          jt.auto_reminder === true;
        if (reminderEligible && jt) {
          try {
            const result = await scheduleJobReminders.mutateAsync({
              jobId: newJob.id,
              deadline: newJob.deadline,
              channel: "email",
              workflowType: pickReminderWorkflowType(jt.code),
            });
            if (result.inserted > 0) {
              toast({
                title: "Reminder schedule enrolled",
                description: `${result.inserted} reminder${result.inserted === 1 ? "" : "s"} queued for "${form.title.trim()}"`,
              });
            }
            // Silent on inserted=0 — either deadline in past or already enrolled.
          } catch (remErr) {
            const msg = remErr instanceof Error ? remErr.message : String(remErr);
            toast({
              title: "Reminder enrolment skipped",
              description: msg,
              variant: "destructive",
            });
          }
        }
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
        description: `${job.title} → ${statusMeta(next).label}`,
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

  // Phase 4: name of the client we're filtered to (for header chip).
  const filteredClientName = useMemo(() => {
    if (!clientParam) return null;
    return clients.find((c) => c.id === clientParam)?.name ?? null;
  }, [clientParam, clients]);

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
                  statusFilter !== "all" || priorityFilter !== "all" || search || clientParam
                    ? " (filtered)"
                    : ""
                }`}
          </p>
          {/* Phase 4: per-client filter chip — visible when ?client= is in the URL */}
          {clientParam && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs"
                 data-testid="jobs-client-filter-chip">
              <span className="text-muted-foreground">Showing jobs for:</span>
              <span className="font-medium">{filteredClientName ?? clientParam}</span>
              <button
                type="button"
                className="ml-auto text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const sp = new URLSearchParams(searchParams);
                  sp.delete("client");
                  sp.delete("new");
                  setSearchParams(sp, { replace: true });
                }}
                data-testid="jobs-clear-client-filter"
                aria-label="Clear client filter"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
        <Button onClick={() => openCreate(clientParam || undefined)} data-testid="new-job-button">
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
            {statusOptionCodes.map((s) => (
              <SelectItem key={s} value={s}>
                {statusMeta(s).label}
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

      {/* Phase 3: compact pipeline chip strip — one chip per stage with its count,
          click to filter. Only shown when DB stages are seeded (accounting tenant). */}
      {jobStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="jobs-pipeline-strip">
          {jobStatuses.map((s) => {
            const count = statusCounts[s.code] ?? 0;
            const activeChip = statusFilter === s.code;
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => setStatusFilter(activeChip ? "all" : s.code)}
                data-testid={`pipeline-chip-${s.code}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  activeChip ? "ring-2 ring-offset-1" : "hover:bg-muted/60"
                }`}
                style={{ borderColor: s.color ?? undefined, color: s.color ?? undefined }}
                title={`${s.label}: ${count} job${count === 1 ? "" : "s"}`}
              >
                <span className="font-medium">{s.label}</span>
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      )}

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
                        {(() => {
                          // Wave 2a Phase 0: resolve badge from the 14 DB-driven job_type
                          // codes (migrated jobs) first, then legacy categories. Tooltip
                          // shows the full label.
                          const meta = jobCategoryMeta(job.category);
                          return meta ? (
                            <Badge
                              variant="outline"
                              className="font-medium"
                              style={{ borderColor: meta.color, color: meta.color }}
                              title={meta.label}
                            >
                              {meta.short}
                            </Badge>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">untagged</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const sm = statusMeta(job.status);
                          return sm.color ? (
                            <Badge variant="outline" className="font-medium" style={{ borderColor: sm.color, color: sm.color }}>
                              {sm.label}
                            </Badge>
                          ) : (
                            <Badge variant={sm.variant}>{sm.label}</Badge>
                          );
                        })()}
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
                            {statusOptionCodes.filter((s) => s !== job.status).map(
                              (s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickStatus(job, s);
                                  }}
                                  data-testid={`job-row-menu-status-${s}`}
                                >
                                  Move to {statusMeta(s).label}
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
                onChange={(e) => {
                  setDescriptionTouched(true); // Phase 2: stop auto-description overwriting
                  setForm({ ...form, description: e.target.value });
                }}
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
              {/* Phase C: read-only Client Type display from accounting_clients.company_type
                  (populated by CH sync). Only renders when a real client is selected and
                  the field is non-null. */}
              {form.client_id !== INTERNAL_CLIENT_VALUE && (() => {
                const c = clients.find((x) => x.id === form.client_id);
                const label = formatCompanyType(c?.company_type);
                if (!label) return null;
                return (
                  <p
                    className="text-xs text-muted-foreground"
                    data-testid="job-form-client-type"
                  >
                    Client type: <span className="font-medium">{label}</span>
                  </p>
                );
              })()}
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
                    {statusOptionCodes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusMeta(s).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => {
                    setPriorityTouched(true); // Phase 2: stop auto-priority overwriting
                    setForm({ ...form, priority: v as AccountingJobPriority });
                  }}
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
                  onChange={(e) => {
                    // Phase 2: manual deadline edit refreshes auto-priority (unless
                    // the user has set priority manually).
                    const dl = e.target.value;
                    const autoPriority = !priorityTouched && dl ? computePriority(dl) : null;
                    setForm({ ...form, deadline: dl, priority: autoPriority ?? form.priority });
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>UK filing category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => {
                  // Phase C: on category change, auto-fill Period End + Deadline
                  // from the picked job_type's anchor source. Fields remain editable
                  // (the user can override afterwards). When the new type has no
                  // computable dates (anchor='none' or 'manual', or required client
                  // dates missing), the existing form values are preserved.
                  const code = v === CATEGORY_UNTAGGED_VALUE ? null : v;
                  const jt = code ? jobTypeByCode.get(code) ?? null : null;
                  const selClient =
                    form.client_id !== INTERNAL_CLIENT_VALUE
                      ? clients.find((c) => c.id === form.client_id) ?? null
                      : null;
                  const dates = computeJobDates(jt, selClient);
                  const newPeriodEnd = dates.period_end ?? form.period_end;
                  const newDeadline = dates.deadline ?? form.deadline;
                  // Phase 2: auto-priority from the (new) deadline + auto-description
                  // from job type + period end — but NEVER overwrite manual input.
                  const autoPriority =
                    !priorityTouched && newDeadline
                      ? computePriority(newDeadline)
                      : null;
                  const autoDesc =
                    !descriptionTouched && jt && newPeriodEnd
                      ? computeJobDescription(jt.name, newPeriodEnd)
                      : null;
                  setForm({
                    ...form,
                    category: v,
                    period_end: newPeriodEnd,
                    deadline: newDeadline,
                    priority: autoPriority ?? form.priority,
                    description: autoDesc !== null && autoDesc !== "" ? autoDesc : form.description,
                  });
                }}
              >
                <SelectTrigger data-testid="job-form-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_UNTAGGED_VALUE}>
                    Untagged
                  </SelectItem>
                  {/* Wave 1: DB-driven options from accounting_job_types (active, by sort_order).
                      Falls back to legacy FILING_CATEGORIES when no job_types are seeded
                      (non-accounting tenants, or any tenant before the seed migration runs). */}
                  {jobTypes.length > 0
                    ? jobTypes.map((t) => (
                        <SelectItem key={t.id} value={t.code}>
                          {t.name}
                        </SelectItem>
                      ))
                    : FILING_CATEGORIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phase C: Period End — period the job covers. Auto-filled by computeJobDates
                on category change for ch_accounts/ch_confstmt/fixed_date anchors. Editable. */}
            <div className="grid gap-2">
              <Label htmlFor="job-period-end">Period end</Label>
              <Input
                id="job-period-end"
                data-testid="job-form-period-end"
                type="date"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                Auto-fills from the client's Companies House dates or the job type's fixed schedule; you can override.
              </p>
            </div>

            {/* Phase C: internal staff-only notes. Separate from `description` which is
                client-facing context. Plain textarea, optional. */}
            <div className="grid gap-2">
              <Label htmlFor="job-staff-notes">Notes for staff</Label>
              <Textarea
                id="job-staff-notes"
                data-testid="job-form-staff-notes"
                value={form.staff_notes}
                onChange={(e) => setForm({ ...form, staff_notes: e.target.value })}
                placeholder="Internal-only notes for the team (not shared with the client)."
                rows={2}
              />
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
