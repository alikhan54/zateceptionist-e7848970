import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccountingJobs, type AccountingJob, type AccountingJobStatus } from "@/hooks/useAccountingJobs";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<AccountingJobStatus, string> = {
  backlog:    "bg-slate-400",
  in_progress: "bg-blue-500",
  review:     "bg-amber-500",
  done:       "bg-green-500",
  blocked:    "bg-red-500",
};

const STATUS_LABEL: Record<AccountingJobStatus, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

// UK bank holidays (same list as useNextReminderFireWindow.ts — Phase 2: dedupe).
const UK_HOLIDAYS_BY_ISO: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-05-04": "Early May",
  "2026-05-25": "Spring",
  "2026-08-31": "Summer",
  "2026-12-25": "Christmas",
  "2026-12-28": "Boxing (sub)",
  "2027-01-01": "New Year",
  "2027-03-26": "Good Friday",
  "2027-03-29": "Easter Monday",
  "2027-05-03": "Early May",
  "2027-05-31": "Spring",
  "2027-08-30": "Summer",
  "2027-12-27": "Christmas (sub)",
  "2027-12-28": "Boxing (sub)",
};

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function buildMonthGrid(anchor: Date): Date[] {
  // 6-row grid starting from the Monday before/on the 1st (UK week start).
  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  // Monday = 1 ... Sunday = 0; convert so Monday = 0, Sunday = 6
  const dayOfWeek = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - dayOfWeek);
  const out: Date[] = [];
  const cur = new Date(gridStart);
  while (out.length < 42) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    if (out.length >= 28 && cur > last && (cur.getDay() + 6) % 7 === 0) break;
  }
  while (out.length < 35) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export interface JobsCalendarProps {
  monthAnchor?: Date;
  onJobClick?: (job: AccountingJob) => void;
  className?: string;
}

export function JobsCalendar({ monthAnchor, onJobClick, className }: JobsCalendarProps) {
  const [anchor, setAnchor] = useState<Date>(monthAnchor ?? startOfMonth(new Date()));
  const { jobs, isLoading } = useAccountingJobs();
  const [openDayIso, setOpenDayIso] = useState<string | null>(null);

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const jobsByDay = useMemo(() => {
    const m = new Map<string, AccountingJob[]>();
    for (const j of jobs ?? []) {
      if (!j.deadline) continue;
      const iso = j.deadline.slice(0, 10);
      if (!m.has(iso)) m.set(iso, []);
      m.get(iso)!.push(j);
    }
    return m;
  }, [jobs]);

  const today = isoLocal(new Date());

  const monthSummary = useMemo(() => {
    const monthStart = isoLocal(startOfMonth(anchor));
    const monthEnd = isoLocal(endOfMonth(anchor));
    let inMonth = 0;
    const byStatus: Record<AccountingJobStatus, number> = {
      backlog: 0, in_progress: 0, review: 0, done: 0, blocked: 0,
    };
    for (const j of jobs ?? []) {
      if (!j.deadline) continue;
      const iso = j.deadline.slice(0, 10);
      if (iso < monthStart || iso > monthEnd) continue;
      inMonth += 1;
      byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    }
    return { inMonth, byStatus };
  }, [jobs, anchor]);

  const openDayJobs = openDayIso ? jobsByDay.get(openDayIso) ?? [] : [];

  return (
    <Card className={className} data-testid="jobs-calendar">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Jobs calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              data-testid="cal-prev"
              onClick={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[8rem] text-center" data-testid="cal-month-label">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              data-testid="cal-next"
              onClick={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              data-testid="cal-today"
              onClick={() => setAnchor(startOfMonth(new Date()))}
            >
              Today
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1" data-testid="cal-summary">
          <span><strong>{monthSummary.inMonth}</strong> jobs this month</span>
          <span className="flex items-center gap-1.5">
            {(Object.keys(STATUS_LABEL) as AccountingJobStatus[]).map((s) =>
              monthSummary.byStatus[s] > 0 ? (
                <span key={s} className="flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_COLOR[s])} aria-hidden />
                  {monthSummary.byStatus[s]}
                </span>
              ) : null,
            )}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-7 gap-1 text-[10px] uppercase text-muted-foreground tracking-wide text-center">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" data-testid="cal-grid">
              {days.map((d, idx) => {
                const iso = isoLocal(d);
                const inMonth = d.getMonth() === anchor.getMonth();
                const dayJobs = jobsByDay.get(iso) ?? [];
                const holiday = UK_HOLIDAYS_BY_ISO[iso];
                const isToday = iso === today;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => dayJobs.length > 0 && setOpenDayIso(iso)}
                    disabled={dayJobs.length === 0}
                    data-testid={`cal-day-${iso}`}
                    data-has-jobs={dayJobs.length > 0 ? "yes" : "no"}
                    data-holiday={holiday ? "yes" : "no"}
                    className={cn(
                      "aspect-square rounded border p-1 text-left text-xs relative flex flex-col items-stretch transition-colors",
                      !inMonth && "opacity-40",
                      isWeekend && "bg-muted/30",
                      holiday && "bg-amber-50 dark:bg-amber-950/30 border-amber-300/40",
                      isToday && "ring-2 ring-primary",
                      dayJobs.length > 0 && "hover:bg-primary/10 cursor-pointer",
                      dayJobs.length === 0 && "cursor-default",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("font-medium", isToday && "text-primary")}>{d.getDate()}</span>
                      {holiday && (
                        <Sparkles className="h-2.5 w-2.5 text-amber-600" aria-label={`Bank holiday: ${holiday}`} />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-auto">
                      {dayJobs.slice(0, 4).map((j) => (
                        <span
                          key={j.id}
                          className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLOR[j.status])}
                          aria-label={`${STATUS_LABEL[j.status]} job`}
                        />
                      ))}
                      {dayJobs.length > 4 && (
                        <span className="text-[9px] text-muted-foreground leading-tight">+{dayJobs.length - 4}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2 flex-wrap" data-testid="cal-legend">
              {(Object.keys(STATUS_LABEL) as AccountingJobStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_COLOR[s])} aria-hidden />
                  {STATUS_LABEL[s]}
                </span>
              ))}
              <span className="flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-amber-600" aria-hidden />
                UK bank holiday
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!openDayIso} onOpenChange={(o) => !o && setOpenDayIso(null)}>
        <DialogContent className="max-w-md" data-testid="cal-day-dialog">
          <DialogHeader>
            <DialogTitle>
              Jobs due {openDayIso ? new Date(openDayIso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {openDayIso && UK_HOLIDAYS_BY_ISO[openDayIso] && (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                Bank holiday: {UK_HOLIDAYS_BY_ISO[openDayIso]}
              </div>
            )}
            {openDayJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs.</p>
            ) : (
              openDayJobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  className="w-full text-left rounded border p-3 hover:bg-muted/40 transition-colors"
                  data-testid={`cal-day-job-${j.id}`}
                  onClick={() => {
                    if (onJobClick) onJobClick(j);
                    setOpenDayIso(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{j.title}</span>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      <span className={cn("h-1.5 w-1.5 rounded-full mr-1", STATUS_COLOR[j.status])} aria-hidden />
                      {STATUS_LABEL[j.status]}
                    </Badge>
                  </div>
                  {j.accounting_clients?.name && (
                    <div className="text-xs text-muted-foreground mt-1">{j.accounting_clients.name}</div>
                  )}
                  {j.priority && (
                    <div className="text-[10px] text-muted-foreground mt-1 capitalize">Priority: {j.priority}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
