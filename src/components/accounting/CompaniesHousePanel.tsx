/**
 * CompaniesHousePanel — read-only Companies House detail for a client.
 *
 * MoneyPex (2026-06-09): Adil reported "still cannot see company info". The CH data
 * IS synced into `accounting_clients` (registered_office_address, directors, dates…)
 * but was only visible inside the Edit dialog (Wave-2a `acf-ch-panel`). This panel
 * surfaces the SAME data prominently WITHOUT requiring Edit — rendered in an
 * expandable client row on the Clients list. Additive, read-only.
 *
 * Includes the prominent "Sync from Companies House" action (Phase 3) so the sync is
 * discoverable right where the data lives.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Building2, ExternalLink } from "lucide-react";
import { formatCompanyType } from "@/lib/job-date-engine";
import type { AccountingClientFull } from "@/hooks/useAccountingClients";

/** UK date formatter (YYYY-MM-DD or ISO → DD MMM YYYY). */
function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const datePart = value.length >= 10 ? value.slice(0, 10) : value;
  const d = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Format the registered_office_address jsonb into a single UK address line. */
export function formatRegisteredAddress(addr: Record<string, unknown> | null | undefined): string | null {
  if (!addr || typeof addr !== "object") return null;
  const order = [
    "care_of",
    "po_box",
    "premises",
    "address_line_1",
    "address_line_2",
    "locality",
    "region",
    "postal_code",
    "country",
  ];
  const parts: string[] = [];
  for (const k of order) {
    const v = addr[k];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  return parts.length ? parts.join(", ") : null;
}

/** Pull the post code out of registered_office_address jsonb (fallback for the flat column). */
export function postCodeFromAddress(addr: Record<string, unknown> | null | undefined): string | null {
  if (!addr || typeof addr !== "object") return null;
  const v = (addr as { postal_code?: unknown }).postal_code;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

interface DirectorRow {
  name?: string;
  role?: string;
  resigned_on?: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export interface CompaniesHousePanelProps {
  client: AccountingClientFull;
  onSync?: (companyNo: string) => void;
  syncing?: boolean;
}

export function CompaniesHousePanel({ client: c, onSync, syncing }: CompaniesHousePanelProps) {
  const address = formatRegisteredAddress(c.registered_office_address);
  const sic = Array.isArray(c.sic_codes) && c.sic_codes.length ? c.sic_codes.join(", ") : null;
  const directors = (Array.isArray(c.directors) ? c.directors : []) as DirectorRow[];
  const activeDirectors = directors.filter((d) => !d.resigned_on);
  const synced = c.companies_house_sync_status === "synced" || !!c.companies_house_last_synced_at;
  const statusVariant = (c.company_status ?? "").toLowerCase() === "active" ? "default" : "secondary";

  return (
    <div className="rounded-md border bg-muted/30 p-4 space-y-4" data-testid={`ch-panel-${c.id}`}>
      {/* Header + prominent Sync action (Phase 3) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Companies House
          </span>
          {synced ? (
            c.companies_house_last_synced_at && (
              <span className="text-[10px] text-muted-foreground">
                synced {fmtDate(c.companies_house_last_synced_at)}
              </span>
            )
          ) : (
            <Badge variant="outline" className="text-[10px]">
              {c.companies_house_sync_status ?? "not synced"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {c.company_no && (
            <a
              href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(c.company_no)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              data-testid={`ch-panel-gov-link-${c.id}`}
            >
              View on gov.uk <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button
            size="sm"
            variant="default"
            disabled={!c.company_no || !!syncing}
            onClick={(e) => {
              e.stopPropagation();
              if (c.company_no && onSync) onSync(c.company_no);
            }}
            data-testid={`ch-panel-sync-${c.id}`}
            title={c.company_no ? "Refresh this client's data from Companies House" : "No company number — add a CRN first"}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Companies House"}
          </Button>
        </div>
      </div>

      {!c.company_no && (
        <p className="text-xs italic text-muted-foreground">
          This client has no company number, so there's no Companies House record to show. Add a CRN via Edit client to enable sync.
        </p>
      )}

      {/* Core CH fields */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Registered name" value={c.name} />
        <Field label="Company no." value={c.company_no ? <span className="font-mono">{c.company_no}</span> : null} />
        <Field
          label="Company status"
          value={
            c.company_status ? (
              <Badge variant={statusVariant} className="capitalize">{c.company_status}</Badge>
            ) : null
          }
        />
        <Field label="Company type" value={formatCompanyType(c.company_type)} />
        <Field label="Incorporated" value={fmtDate(c.date_of_incorporation)} />
        <Field label="Accounting period end" value={fmtDate(c.accounting_period_end)} />
        <Field label="Accounts next due" value={fmtDate(c.accounts_next_due)} />
        <Field label="Accounts last made up" value={fmtDate(c.accounts_last_made_up)} />
        <Field label="Conf. stmt next due" value={fmtDate(c.confirmation_statement_next_due)} />
        <Field label="Conf. stmt last made up" value={fmtDate(c.confirmation_statement_last_made_up)} />
        <Field label="VAT number" value={c.vat_number} />
        <Field label="SIC codes" value={sic} />
      </div>

      {/* Registered office address */}
      <div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Registered office address</span>
        <p className="text-sm font-medium">{address ?? "—"}</p>
      </div>

      {/* Directors */}
      <div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Directors {directors.length ? `(${activeDirectors.length} active${directors.length !== activeDirectors.length ? `, ${directors.length - activeDirectors.length} resigned` : ""})` : ""}
        </span>
        {directors.length ? (
          <ul className="mt-1 space-y-0.5" data-testid={`ch-panel-directors-${c.id}`}>
            {directors.map((d, i) => (
              <li key={i} className="text-sm">
                <span className={`font-medium ${d.resigned_on ? "line-through text-muted-foreground" : ""}`}>
                  {d.name ?? "—"}
                </span>
                {d.role && <span className="text-muted-foreground"> · {d.role}</span>}
                {d.resigned_on && <span className="text-[10px] text-muted-foreground"> (resigned {fmtDate(d.resigned_on)})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-medium">—</p>
        )}
      </div>
    </div>
  );
}
