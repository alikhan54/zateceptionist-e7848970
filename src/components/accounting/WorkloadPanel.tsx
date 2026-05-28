import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, AlertTriangle, Clock, ArrowDownUp } from "lucide-react";
import { useAccountingJobs, type AccountingJob, type AccountingJobStatus } from "@/hooks/useAccountingJobs";
import { useAccountingTeam } from "@/hooks/useAccountingTeam";
import { cn } from "@/lib/utils";

type SortKey = "open" | "overdue" | "due_this_week" | "done_this_month";

const SORT_LABEL: Record<SortKey, string> = {
  open: "Open jobs",
  overdue: "Overdue",
  due_this_week: "Due this week",
  done_this_month: "Done this month",
};

export interface WorkloadRow {
  userId: string | null;
  name: string;
  email: string | null;
  role: string | null;
  openCount: number;
  overdueCount: number;
  dueThisWeekCount: number;
  doneThisMonthCount: number;
}

export interface WorkloadPanelProps {
  maxRows?: number;
  showUnassigned?: boolean;
  className?: string;
}

export function WorkloadPanel({
  maxRows = 8,
  showUnassigned = true,
  className,
}: WorkloadPanelProps) {
  const [statusFilter, setStatusFilter] = useState<AccountingJobStatus | "open" | "all">("open");
  const [sortKey, setSortKey] = useState<SortKey>("open");

  const filteredJobsHook = useAccountingJobs(
    statusFilter === "open" || statusFilter === "all" ? {} : { status: statusFilter as AccountingJobStatus },
  );
  const { data: team = [], isLoading: teamLoading } = useAccountingTeam();
  const jobsLoading = filteredJobsHook.isLoading;
  const allJobs = filteredJobsHook.jobs ?? [];

  const rows: WorkloadRow[] = useMemo(() => {
    if (jobsLoading || teamLoading) return [];
    const filteredJobs: AccountingJob[] = statusFilter === "open"
      ? allJobs.filter((j) => j.status !== "done" && j.status !== "cancelled" as never)
      : allJobs;

    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    const byUser = new Map<string | null, WorkloadRow>();
    function ensure(userId: string | null): WorkloadRow {
      const existing = byUser.get(userId);
      if (existing) return existing;
      const member = userId ? team.find((t) => t.id === userId) : null;
      const row: WorkloadRow = {
        userId,
        name: member?.full_name?.trim() || member?.email || (userId ? "(unknown user)" : "Unassigned"),
        email: member?.email ?? null,
        role: member?.role ?? null,
        openCount: 0,
        overdueCount: 0,
        dueThisWeekCount: 0,
        doneThisMonthCount: 0,
      };
      byUser.set(userId, row);
      return row;
    }

    // Seed every staff member so admins see zero-load people too
    for (const m of team) ensure(m.id);
    if (showUnassigned) ensure(null);

    for (const j of filteredJobs) {
      const r = ensure(j.owner_user_id);
      const isOpen = j.status !== "done";
      if (isOpen) {
        r.openCount += 1;
        if (j.deadline) {
          const dlMs = new Date(j.deadline).getTime();
          if (Number.isFinite(dlMs)) {
            if (dlMs < now) r.overdueCount += 1;
            else if (dlMs <= weekFromNow) r.dueThisWeekCount += 1;
          }
        }
      }
      if (j.status === "done" && j.completed_at && new Date(j.completed_at).getTime() >= monthStartMs) {
        r.doneThisMonthCount += 1;
      }
    }

    const arr = [...byUser.values()];
    if (!showUnassigned) {
      const idx = arr.findIndex((r) => r.userId === null);
      if (idx !== -1) arr.splice(idx, 1);
    }
    arr.sort((a, b) => {
      const get = (r: WorkloadRow) => {
        if (sortKey === "open") return r.openCount;
        if (sortKey === "overdue") return r.overdueCount;
        if (sortKey === "due_this_week") return r.dueThisWeekCount;
        return r.doneThisMonthCount;
      };
      const diff = get(b) - get(a);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
    return arr.slice(0, maxRows);
  }, [allJobs, team, jobsLoading, teamLoading, statusFilter, sortKey, maxRows, showUnassigned]);

  const isLoading = jobsLoading || teamLoading;

  return (
    <Card className={className} data-testid="workload-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team workload
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AccountingJobStatus | "open" | "all")}>
              <SelectTrigger className="h-7 text-xs w-28" data-testid="workload-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-7 text-xs w-36" data-testid="workload-sort-key">
                <ArrowDownUp className="h-3 w-3 mr-1 inline" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{SORT_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No staff with workload yet.</div>
        ) : (
          <div className="space-y-2" data-testid="workload-rows">
            {rows.map((row) => (
              <div
                key={row.userId ?? "unassigned"}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded border p-2 sm:p-2.5",
                  row.userId === null && "border-dashed",
                )}
                data-testid={`workload-row-${row.userId ?? "unassigned"}`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{row.name}</div>
                  {row.role && (
                    <div className="text-[10px] text-muted-foreground capitalize">{row.role}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]" data-testid={`workload-open-${row.userId ?? "unassigned"}`}>
                    {row.openCount} open
                  </Badge>
                  {row.overdueCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {row.overdueCount}
                    </Badge>
                  )}
                  {row.dueThisWeekCount > 0 && (
                    <Badge className="text-[10px] gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {row.dueThisWeekCount} wk
                    </Badge>
                  )}
                  {row.doneThisMonthCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {row.doneThisMonthCount} done
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
