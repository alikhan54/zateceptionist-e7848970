/**
 * Wave 1 Phase F — pure-function cadence builder for statutory-deadline reminders.
 *
 * Cadence (locked decision 5 — hardcoded per type, not configurable in Wave 1;
 * per-type custom cadences are Wave 2):
 *
 *   T-30 days  (first nudge)
 *   T-26, T-22, T-18, T-14, T-10   (every 4 days while > 7 days out)
 *   T-7, T-5, T-3, T-1             (every 2 days in the final week)
 *   T-0                            (day-of alert)
 *
 * That's a max of 11 fire dates per job. Past-dated entries (relative to `now`)
 * are filtered out — if the caller passes a job already <30 days from deadline,
 * only the future dates are enrolled.
 *
 * Returns an empty array if deadline is in the past or invalid.
 *
 * Time-of-day: the reminders engine REM.1 cron fires every 30 min Mon-Fri
 * 09:00-17:00 Europe/London. REM.2 also gates on bank holidays. So we set
 * scheduled_for to 09:00 UTC on each fire date — the engine picks the next
 * valid biz-hours/holiday-safe slot. Setting earlier than 09:00 risks the
 * Friday-evening-into-Monday batching landing on the right day.
 *
 * Pure / no React / no Supabase. Unit-testable in Node.
 */

export interface PlannedReminder {
  scheduled_for: Date;
  days_before: number;
  label: string; // human-readable for logs ("T-30", "T-0 (day-of)")
}

/** Days before deadline at which to fire — locked Wave-1 cadence. */
export const REMINDER_CADENCE_DAYS_BEFORE: number[] = [
  30, 26, 22, 18, 14, 10,  // every 4 days while >7
  7, 5, 3, 1,              // every 2 days in final week
  0,                       // day-of
];

/** Strip a Date to 09:00 UTC of the same calendar day. */
function at09UTC(d: Date): Date {
  const out = new Date(d.getTime());
  out.setUTCHours(9, 0, 0, 0);
  return out;
}

/** Calendar-day-only comparison: returns true if `a`'s UTC calendar date is >= `b`'s. */
function isSameOrLaterUTCDay(a: Date, b: Date): boolean {
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return a.getUTCFullYear() > b.getUTCFullYear();
  if (a.getUTCMonth() !== b.getUTCMonth()) return a.getUTCMonth() > b.getUTCMonth();
  return a.getUTCDate() >= b.getUTCDate();
}

/**
 * Build the cadence for one job's deadline. Returns same-day-or-future-day
 * entries (relative to `now`), oldest-first. "Today's 09:00 still counts as
 * today" — even if the planned 09:00 fire window already passed by the time
 * the job is created, the engine cron (Mon-Fri 09:00-17:00 every 30 min) will
 * pick the row up at the next tick and fire it the same day. Past calendar
 * days are skipped.
 *
 * Returns [] if deadline is null, unparseable, or already past.
 * Pass `now` explicitly for deterministic unit tests; defaults to current time.
 */
export function buildReminderSchedule(
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): PlannedReminder[] {
  if (!deadline) return [];
  const dl = typeof deadline === "string" ? new Date(deadline) : deadline;
  if (Number.isNaN(dl.getTime())) return [];
  if (dl.getTime() <= now.getTime()) return []; // deadline already passed

  const out: PlannedReminder[] = [];
  for (const dbef of REMINDER_CADENCE_DAYS_BEFORE) {
    const fireDate = new Date(dl.getTime());
    fireDate.setUTCDate(fireDate.getUTCDate() - dbef);
    const scheduledFor = at09UTC(fireDate);
    // Include fire-date entries whose calendar day is >= today. This lets a
    // job created mid-day on a T-X day still enrol T-X (engine fires at next
    // cron tick) while excluding clearly-stale fire dates from past days.
    if (!isSameOrLaterUTCDay(scheduledFor, now)) continue;
    out.push({
      scheduled_for: scheduledFor,
      days_before: dbef,
      label: dbef === 0 ? "T-0 (day-of)" : `T-${dbef}`,
    });
  }
  return out;
}

/**
 * Pick the right `workflow_type` (SMTP mailbox) for a job-type code.
 * Smart Ledger has 5 active mailboxes; the relevant ones for filing-deadline
 * reminders are:
 *   - `vat`      → vat@smartledgersolutions.co.uk (VAT period reminders)
 *   - `accounts` → accounts@smartledgersolutions.co.uk (default filing reminders)
 * Other tenants without a `vat` mailbox configured will fall back to `accounts`
 * via the SMTP router's existing fallback logic (D1 SMTP router).
 */
export function pickReminderWorkflowType(jobTypeCode: string | null | undefined): string {
  if (!jobTypeCode) return "accounts";
  if (jobTypeCode === "vat_quarterly" || jobTypeCode === "vat_mtd" || jobTypeCode === "vat_registration") {
    return "vat";
  }
  return "accounts";
}
