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

export function categoryLabel(code: string | null | undefined): string {
  if (!code) return "Untagged";
  return CATEGORY_BY_CODE[code as FilingCategory]?.label ?? code;
}

export function categoryShort(code: string | null | undefined): string {
  if (!code) return "—";
  return CATEGORY_BY_CODE[code as FilingCategory]?.short ?? code;
}

export function categoryColor(code: string | null | undefined): string {
  if (!code) return "hsl(220 14% 60%)";
  return CATEGORY_BY_CODE[code as FilingCategory]?.color ?? "hsl(220 14% 60%)";
}

export function isValidCategory(value: string | null | undefined): value is FilingCategory {
  if (!value) return false;
  return FILING_CATEGORIES.some((c) => c.code === value);
}
