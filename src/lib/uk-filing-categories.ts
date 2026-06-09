/**
 * UK filing categories — single source of truth for accounting_jobs.category.
 * Mirrors the CHECK constraint in `tenants/smart-ledger/deployment/36-uk-filing-categories-migration.sql`.
 *
 * Adding a new code → update BOTH this file AND the CHECK constraint (or relax the constraint
 * to allow free-text + soft-warn in UI).
 */

export type FilingCategory =
  | "vat"
  | "vat_mtd"
  | "ct600"
  | "accounts_full"
  | "accounts_micro"
  | "confirmation_statement"
  | "psc"
  | "sa100"
  | "sa800"
  | "paye_rti"
  | "p11d"
  | "cis"
  | "eps_p32"
  | "other";

export type FilingCadence =
  | "monthly"
  | "quarterly"
  | "annual"
  | "event"
  | "ad-hoc";

export interface FilingCategoryMeta {
  code: FilingCategory;
  label: string;
  short: string;
  color: string;
  cadence: FilingCadence;
}

export const FILING_CATEGORIES: FilingCategoryMeta[] = [
  { code: "vat", label: "VAT Return", short: "VAT", color: "hsl(210 80% 55%)", cadence: "quarterly" },
  { code: "vat_mtd", label: "VAT MTD Submission", short: "VAT-MTD", color: "hsl(210 70% 50%)", cadence: "quarterly" },
  { code: "ct600", label: "Corporation Tax (CT600)", short: "CT", color: "hsl(280 60% 55%)", cadence: "annual" },
  { code: "accounts_full", label: "Year-End Accounts (Full)", short: "YE-Full", color: "hsl(180 50% 45%)", cadence: "annual" },
  { code: "accounts_micro", label: "Year-End Accounts (Micro)", short: "YE-Micro", color: "hsl(180 50% 60%)", cadence: "annual" },
  { code: "confirmation_statement", label: "Confirmation Statement", short: "CS", color: "hsl(140 50% 45%)", cadence: "annual" },
  // Wave 1 rename (2026-06-02): label "PSC Update" → "Company Secretarial Services" per Adil.
  // code='psc' preserved for back-compat with legacy accounting_jobs.category rows; Wave-1
  // picker reads from useAccountingJobTypes (DB-backed). This legacy entry powers badge
  // labels/colors only when a legacy row's category is rendered in the Jobs table.
  { code: "psc", label: "Company Secretarial Services", short: "CSec", color: "hsl(140 40% 60%)", cadence: "event" },
  { code: "sa100", label: "Self Assessment (SA100)", short: "SA100", color: "hsl(30 70% 50%)", cadence: "annual" },
  { code: "sa800", label: "Partnership SA (SA800)", short: "SA800", color: "hsl(30 60% 60%)", cadence: "annual" },
  { code: "paye_rti", label: "PAYE RTI", short: "PAYE", color: "hsl(0 60% 55%)", cadence: "monthly" },
  { code: "p11d", label: "P11D Benefits", short: "P11D", color: "hsl(0 50% 65%)", cadence: "annual" },
  { code: "cis", label: "CIS Monthly Return", short: "CIS", color: "hsl(340 60% 55%)", cadence: "monthly" },
  { code: "eps_p32", label: "EPS / P32", short: "EPS", color: "hsl(340 50% 65%)", cadence: "monthly" },
  { code: "other", label: "Other", short: "?", color: "hsl(220 14% 60%)", cadence: "ad-hoc" },
];

export const CATEGORY_BY_CODE: Record<FilingCategory, FilingCategoryMeta> = Object.fromEntries(
  FILING_CATEGORIES.map((c) => [c.code, c]),
) as Record<FilingCategory, FilingCategoryMeta>;

/**
 * Wave 2a Phase 0 — badge metadata for the 14 DB-driven `accounting_job_types`
 * codes (Wave 1 Phase B). Migrated MoneyPex jobs use these codes; without an
 * entry here the Jobs-table badge rendered "untagged". This map powers
 * `jobCategoryMeta()` (badge label/short/color) WITHOUT bloating the legacy
 * FILING_CATEGORIES filter list. Keys are accounting_job_types.code values.
 */
export const JOB_TYPE_BADGE_META: Record<string, { label: string; short: string; color: string }> = {
  annual_accounts:        { label: "Annual Accounts",            short: "AA",    color: "hsl(180 50% 45%)" },
  corporation_tax:        { label: "Corporation Tax",            short: "CT",    color: "hsl(280 60% 55%)" },
  confirmation_statement: { label: "Confirmation Statement",     short: "CS",    color: "hsl(140 50% 45%)" },
  paye_monthly:           { label: "PAYE (Monthly)",             short: "PAYE",  color: "hsl(0 60% 55%)" },
  self_assessment:        { label: "Self Assessment",            short: "SA",    color: "hsl(30 70% 50%)" },
  vat_quarterly:          { label: "VAT Quarterly",              short: "VAT",   color: "hsl(210 80% 55%)" },
  vat_registration:       { label: "VAT Registration",           short: "VAT-R", color: "hsl(210 70% 45%)" },
  company_restoration:    { label: "Company Restoration",        short: "Rest",  color: "hsl(220 14% 50%)" },
  vat_mtd:                { label: "VAT MTD Submission",         short: "MTD",   color: "hsl(210 70% 50%)" },
  year_end_micro:         { label: "Year-End Accounts (Micro)",  short: "YE-M",  color: "hsl(180 50% 60%)" },
  partnership_sa:         { label: "Partnership SA (SA800)",     short: "SA800", color: "hsl(30 60% 60%)" },
  p11d:                   { label: "P11D Benefits",              short: "P11D",  color: "hsl(0 50% 65%)" },
  cis_monthly:            { label: "CIS Monthly",                short: "CIS",   color: "hsl(340 60% 55%)" },
  company_secretarial:    { label: "Company Secretarial Services", short: "CSec", color: "hsl(140 40% 60%)" },
};

/**
 * Resolve badge metadata for a job's category code. Checks the Wave-2a
 * job-type map first (DB-driven codes), then the legacy FILING_CATEGORIES,
 * then a neutral fallback. Never returns null — callers always get a chip.
 */
export function jobCategoryMeta(code: string | null | undefined): { label: string; short: string; color: string } | null {
  if (!code) return null;
  const w2 = JOB_TYPE_BADGE_META[code];
  if (w2) return w2;
  const legacy = CATEGORY_BY_CODE[code as FilingCategory];
  if (legacy) return { label: legacy.label, short: legacy.short, color: legacy.color };
  return null;
}

// MoneyPex taxonomy alignment (2026-06-09): the DB-driven `accounting_job_types`
// codes (corporation_tax, annual_accounts, confirmation_statement, …) are the real
// codes on `accounting_jobs.category`. The legacy FILING_CATEGORIES list uses
// different codes (ct600, accounts_full, …), so these label/short/color resolvers
// must consult `jobCategoryMeta` FIRST (which checks JOB_TYPE_BADGE_META then legacy)
// before the legacy-only CATEGORY_BY_CODE map — otherwise a DB-coded job rendered
// its raw code (e.g. "corporation_tax") instead of "Corporation Tax".

export function categoryLabel(code: string | null | undefined): string {
  if (!code) return "Untagged";
  return jobCategoryMeta(code)?.label ?? CATEGORY_BY_CODE[code as FilingCategory]?.label ?? code;
}

export function categoryShort(code: string | null | undefined): string {
  if (!code) return "—";
  return jobCategoryMeta(code)?.short ?? CATEGORY_BY_CODE[code as FilingCategory]?.short ?? code;
}

export function categoryColor(code: string | null | undefined): string {
  if (!code) return "hsl(220 14% 60%)";
  return jobCategoryMeta(code)?.color ?? CATEGORY_BY_CODE[code as FilingCategory]?.color ?? "hsl(220 14% 60%)";
}

export function isValidCategory(value: string | null | undefined): value is FilingCategory {
  if (!value) return false;
  return FILING_CATEGORIES.some((c) => c.code === value);
}
