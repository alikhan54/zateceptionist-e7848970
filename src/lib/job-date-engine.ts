/**
 * Wave 1 Phase C — pure-function date engine for the Create Job dialog.
 *
 * Given the picked `accounting_job_types` row and the selected client (or null for
 * internal jobs), compute the `period_end` and the statutory `deadline`. Both are
 * returned as ISO date strings (YYYY-MM-DD) or null when they cannot be derived.
 *
 * Anchor sources:
 *   ch_accounts  — uses the client's accounts_last_made_up + accounts_next_due
 *                  (which CH populates on sync). period_end = last_made_up + period_interval,
 *                  deadline = accounts_next_due directly (CH calculated it).
 *   ch_confstmt  — same pattern, using confirmation_statement_* fields.
 *   fixed_date   — picks the next future occurrence of fixed_period_date / fixed_deadline_date
 *                  (both are 'MM-DD' format, e.g. '04-05' for 5 Apr, '01-31' for 31 Jan).
 *                  Used for Self Assessment + Partnership SA.
 *   manual       — period_end = null (user picks); deadline = null (or period_end + interval).
 *   none         — both null (e.g. VAT Registration, Company Restoration).
 *
 * Pure / deterministic / no React, no Supabase, no side effects. Unit-testable in Node.
 */

import type { AccountingJobType } from "@/hooks/useAccountingJobTypes";

export interface JobDateClient {
  accounts_last_made_up: string | null;
  accounts_next_due: string | null;
  confirmation_statement_last_made_up: string | null;
  confirmation_statement_next_due: string | null;
}

export interface ComputedJobDates {
  period_end: string | null;   // YYYY-MM-DD
  deadline: string | null;     // YYYY-MM-DD
}

/** Parse a YYYY-MM-DD string into a UTC Date (DOM-safe). Returns null on bad input. */
function parseIsoDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const slim = s.length >= 10 ? s.slice(0, 10) : s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(slim);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

/** Format a Date back to YYYY-MM-DD (UTC). */
function fmtIsoDate(d: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Add an interval to a date (UTC). Day adds days; Month/Year add the calendar unit. */
export function addInterval(
  date: Date,
  value: number | null | undefined,
  unit: "day" | "month" | "year" | null | undefined,
): Date {
  if (!value || !unit) return new Date(date.getTime());
  const out = new Date(date.getTime());
  if (unit === "day") {
    out.setUTCDate(out.getUTCDate() + value);
  } else if (unit === "month") {
    // setUTCMonth handles overflow (month 13 → next year month 1) and day clamping
    // for short months (e.g. 31 Jan + 1 month → 28/29 Feb).
    const targetMonth = out.getUTCMonth() + value;
    const targetYear = out.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const originalDay = out.getUTCDate();
    // Compute last valid day in target month
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    out.setUTCFullYear(targetYear, normalizedMonth, Math.min(originalDay, lastDay));
  } else if (unit === "year") {
    out.setUTCFullYear(out.getUTCFullYear() + value);
  }
  return out;
}

/** Pick the next occurrence of 'MM-DD' on or after `from` (UTC). */
function nextOccurrence(mmdd: string, from: Date): Date | null {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const fromY = from.getUTCFullYear();
  const candidate = new Date(Date.UTC(fromY, mm - 1, dd));
  if (candidate.getTime() >= from.getTime()) return candidate;
  return new Date(Date.UTC(fromY + 1, mm - 1, dd));
}

/**
 * Compute period_end + deadline for a job given its job_type and the selected client.
 * Returns null/null for missing inputs rather than throwing — the form fields stay
 * editable so the user can fill in manually.
 *
 * `now` defaults to current UTC; pass it in for deterministic unit tests.
 */
export function computeJobDates(
  jobType: AccountingJobType | null | undefined,
  client: JobDateClient | null | undefined,
  now: Date = new Date(),
): ComputedJobDates {
  if (!jobType) return { period_end: null, deadline: null };

  const anchor = jobType.anchor_source;

  if (anchor === "none") {
    return { period_end: null, deadline: null };
  }

  if (anchor === "manual") {
    return { period_end: null, deadline: null };
  }

  if (anchor === "fixed_date") {
    const pe = jobType.fixed_period_date
      ? nextOccurrence(jobType.fixed_period_date, now)
      : null;
    const dl = jobType.fixed_deadline_date
      ? nextOccurrence(jobType.fixed_deadline_date, now)
      : null;
    return { period_end: fmtIsoDate(pe), deadline: fmtIsoDate(dl) };
  }

  if (anchor === "ch_accounts") {
    if (!client) return { period_end: null, deadline: null };
    const lastPE = parseIsoDate(client.accounts_last_made_up);
    const peNext =
      lastPE && jobType.period_interval_value && jobType.period_interval_unit
        ? addInterval(lastPE, jobType.period_interval_value, jobType.period_interval_unit)
        : null;
    // CH gives us the next deadline directly — prefer that over math.
    const dl = parseIsoDate(client.accounts_next_due);
    return { period_end: fmtIsoDate(peNext), deadline: fmtIsoDate(dl) };
  }

  if (anchor === "ch_confstmt") {
    if (!client) return { period_end: null, deadline: null };
    const lastPE = parseIsoDate(client.confirmation_statement_last_made_up);
    const peNext =
      lastPE && jobType.period_interval_value && jobType.period_interval_unit
        ? addInterval(lastPE, jobType.period_interval_value, jobType.period_interval_unit)
        : null;
    const dl = parseIsoDate(client.confirmation_statement_next_due);
    return { period_end: fmtIsoDate(peNext), deadline: fmtIsoDate(dl) };
  }

  return { period_end: null, deadline: null };
}

/** Human label for accounting_clients.company_type (CH-style codes). */
export function formatCompanyType(code: string | null | undefined): string | null {
  if (!code) return null;
  const m: Record<string, string> = {
    "ltd": "Private Limited Company",
    "private-limited-shares-section-30-exemption": "Private Limited (Sec 30 exemption)",
    "private-limited-guarant-nsc": "Private Limited by Guarantee (No Share Capital)",
    "private-limited-guarant-nsc-limited-exemption": "Private Limited by Guarantee (limited exemption)",
    "private-unlimited": "Private Unlimited Company",
    "private-unlimited-nsc": "Private Unlimited (No Share Capital)",
    "plc": "Public Limited Company",
    "llp": "Limited Liability Partnership",
    "limited-partnership": "Limited Partnership",
    "old-public-company": "Old Public Company",
    "scottish-partnership": "Scottish Partnership",
    "registered-society-non-jurisdictional": "Registered Society",
    "northern-ireland": "Northern Ireland Company",
    "northern-ireland-other": "Northern Ireland (Other)",
    "scottish-charitable-incorporated-organisation": "Scottish Charitable Incorporated Organisation",
    "charitable-incorporated-organisation": "Charitable Incorporated Organisation",
    "industrial-and-provident-society": "Industrial & Provident Society",
    "royal-charter": "Royal Charter Company",
    "uk-establishment": "UK Establishment (overseas company)",
    "icvc-securities": "Investment Company with Variable Capital — Securities",
    "icvc-warrant": "Investment Company with Variable Capital — Warrant",
    "icvc-umbrella": "Investment Company with Variable Capital — Umbrella",
  };
  return m[code] ?? code;
}
