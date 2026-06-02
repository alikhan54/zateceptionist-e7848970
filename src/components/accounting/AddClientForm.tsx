import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useAccountingClients,
  jurisdictionFromCrn,
  type ClientStatus,
  type ClientUpsertPayload,
  type AccountingClientFull,
} from "@/hooks/useAccountingClients";
// Phase 3 (2026-06-02): on save with a CRN, auto-fire CH sync so n8n PATCHes
// name + address + dates + officers into the row we just INSERTed. The patched
// CHS.11/CHS.13 (n8n RCLewTLovTg1GxV4) write name + formatted address back.
import { useTriggerCompaniesHouseSync } from "@/hooks/useTriggerCompaniesHouseSync";
// Phase B (2026-06-02): CH name search → autocomplete on the client-name field.
import { useCompaniesHouseSearch, type ChSearchMatch } from "@/hooks/useCompaniesHouseSearch";

const JURISDICTIONS: Array<{ code: string; label: string }> = [
  { code: "GB-ENG", label: "England & Wales" },
  { code: "GB-SCT", label: "Scotland" },
  { code: "GB-NIR", label: "Northern Ireland" },
  { code: "GB", label: "United Kingdom (catch-all)" },
];

const STATUS_OPTIONS: Array<{ code: ClientStatus; label: string }> = [
  { code: "active", label: "Active" },
  { code: "prospect", label: "Prospect" },
  { code: "inactive", label: "Inactive" },
];

interface FormState {
  name: string;
  company_no: string;
  vat_number: string;
  contact_email: string;
  contact_phone: string;
  beneficial_owner: string;
  jurisdiction: string;
  accounting_period_end: string;
  status: ClientStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  company_no: "",
  // Phase 3 (2026-06-02): VAT defaults to "Exempt" per Adil's brief — UK accounting
  // practices have many sub-threshold clients; "Exempt" is the safe default they can
  // overwrite with a real VAT number.
  vat_number: "Exempt",
  contact_email: "",
  contact_phone: "",
  beneficial_owner: "",
  jurisdiction: "",
  accounting_period_end: "",
  status: "active",
  notes: "",
};

function fromExisting(c: AccountingClientFull): FormState {
  return {
    name: c.name ?? "",
    company_no: c.company_no ?? "",
    vat_number: c.vat_number ?? "",
    contact_email: c.contact_email ?? "",
    contact_phone: c.contact_phone ?? "",
    beneficial_owner: c.beneficial_owner ?? "",
    jurisdiction: c.jurisdiction ?? "",
    accounting_period_end: c.accounting_period_end ?? "",
    status: ((c.status as ClientStatus) ?? "active") as ClientStatus,
    notes: c.notes ?? "",
  };
}

function payloadFromForm(s: FormState): ClientUpsertPayload {
  return {
    name: s.name.trim(),
    company_no: s.company_no.trim() || null,
    vat_number: s.vat_number.trim() || null,
    contact_email: s.contact_email.trim() || null,
    contact_phone: s.contact_phone.trim() || null,
    beneficial_owner: s.beneficial_owner.trim() || null,
    jurisdiction: s.jurisdiction || null,
    accounting_period_end: s.accounting_period_end || null,
    status: s.status,
    notes: s.notes.trim() || null,
  };
}

export type ClientFormMode = "create" | "edit";

export interface AddClientFormProps {
  mode?: ClientFormMode;
  initial?: AccountingClientFull | null;
  onSuccess?: (client: AccountingClientFull) => void;
  onCancel?: () => void;
}

export function AddClientForm({
  mode = "create",
  initial = null,
  onSuccess,
  onCancel,
}: AddClientFormProps) {
  const { toast } = useToast();
  const { createClient, updateClient } = useAccountingClients();
  // Phase 3 (2026-06-02): auto-CH-sync after CREATE when CRN is set.
  const chSync = useTriggerCompaniesHouseSync();

  const [form, setForm] = useState<FormState>(initial ? fromExisting(initial) : EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  // Phase B: CH name autocomplete. nameQuery drives the search; showSuggest toggles
  // the dropdown; justPicked suppresses re-search right after a pick.
  const [nameQuery, setNameQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const justPicked = useRef(false);
  const { matches: chMatches, loading: chSearchLoading } = useCompaniesHouseSearch(
    mode === "create" ? nameQuery : "",
  );

  useEffect(() => {
    setForm(initial ? fromExisting(initial) : EMPTY_FORM);
  }, [initial]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleCrnBlur() {
    const j = jurisdictionFromCrn(form.company_no);
    if (j && !form.jurisdiction) set("jurisdiction", j);
  }

  // Phase B: pick a Companies House match → fill name + CRN (+ jurisdiction).
  // The existing on-save CRN auto-sync then fills address/status/dates.
  function pickChMatch(m: ChSearchMatch) {
    justPicked.current = true;
    setShowSuggest(false);
    const crn = (m.company_number || "").toUpperCase();
    setForm((prev) => ({
      ...prev,
      name: m.title || prev.name,
      company_no: crn,
      jurisdiction: prev.jurisdiction || jurisdictionFromCrn(crn) || "",
    }));
  }

  function onNameChange(v: string) {
    set("name", v);
    if (justPicked.current) { justPicked.current = false; return; }
    setNameQuery(v);
    setShowSuggest(true);
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Client name is required.";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      return "Email looks malformed.";
    }
    if (form.company_no) {
      const v = form.company_no.trim().toUpperCase().replace(/\s+/g, "");
      if (v.length > 0 && !/^[A-Z0-9]{6,10}$/.test(v)) {
        return "Company number should be 6-10 alphanumeric characters.";
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Couldn't save", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = payloadFromForm(form);
      if (mode === "create") {
        const created = await createClient.mutateAsync(payload);
        toast({ title: "Client added", description: `${created.name} is on your roster.` });
        // Phase 3 (2026-06-02): if a CRN was provided, auto-fire CH sync so the
        // patched workflow (CHS.11/CHS.13) writes the official name + address +
        // accounts/confirmation-statement dates + officers. Non-blocking — the
        // client is already saved; sync failures surface their own toast via the
        // hook. Realtime + onSuccess invalidations will refresh the list UI.
        const crn = payload.company_no?.trim();
        if (crn) {
          chSync.mutateAsync([crn]).catch(() => {
            /* toast handled inside the hook */
          });
        }
        setForm(EMPTY_FORM);
        onSuccess?.(created);
      } else {
        if (!initial) throw new Error("Missing client to edit");
        const updated = await updateClient.mutateAsync({ id: initial.id, patch: payload });
        toast({ title: "Client updated", description: `${updated.name} saved.` });
        onSuccess?.(updated);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Couldn't save client", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-client-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2 relative">
          <Label htmlFor="ac-name">Client name *</Label>
          <Input
            id="ac-name"
            data-testid="acf-name"
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={() => { if (form.name.trim().length >= 2 && chMatches.length) setShowSuggest(true); }}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            placeholder="Start typing a company name to search Companies House…"
            autoComplete="off"
            required
            autoFocus
          />
          {/* Phase B: CH name-search autocomplete dropdown (create mode). */}
          {mode === "create" && showSuggest && (chSearchLoading || chMatches.length > 0) && (
            <div
              className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-y-auto"
              data-testid="acf-name-suggest"
            >
              {chSearchLoading && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Searching Companies House…</div>
              )}
              {chMatches.map((m) => (
                <button
                  key={m.company_number ?? m.title ?? Math.random()}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-xs hover:bg-muted/60 last:border-b-0"
                  data-testid={`acf-suggest-${m.company_number}`}
                  onMouseDown={(e) => { e.preventDefault(); pickChMatch(m); }}
                >
                  <span className="font-medium">{m.title}</span>
                  <span className="text-muted-foreground">
                    {m.company_number}
                    {m.company_status ? ` · ${m.company_status}` : ""}
                    {m.address_snippet ? ` · ${m.address_snippet}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          {mode === "create" && (
            <p className="text-[10px] text-muted-foreground">
              Pick a match to auto-fill the CRN + Companies House details, or type a name and enter the CRN manually.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-crn">Company No.</Label>
          <Input
            id="ac-crn"
            data-testid="acf-company-no"
            value={form.company_no}
            onChange={(e) => set("company_no", e.target.value)}
            onBlur={handleCrnBlur}
            placeholder="e.g. 12345678 or SC123456"
            autoComplete="off"
          />
          <p className="text-[10px] text-muted-foreground">
            Jurisdiction auto-fills from CRN prefix when you tab away.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-vat">VAT Number</Label>
          <Input
            id="ac-vat"
            data-testid="acf-vat"
            value={form.vat_number}
            onChange={(e) => set("vat_number", e.target.value)}
            placeholder="e.g. GB 123 4567 89"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-email">Email</Label>
          <Input
            id="ac-email"
            data-testid="acf-email"
            type="email"
            value={form.contact_email}
            onChange={(e) => set("contact_email", e.target.value)}
            placeholder="finance@client.example"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-phone">Phone</Label>
          <Input
            id="ac-phone"
            data-testid="acf-phone"
            value={form.contact_phone}
            onChange={(e) => set("contact_phone", e.target.value)}
            placeholder="+44 20 7946 0958"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-bo">Beneficial owner</Label>
          <Input
            id="ac-bo"
            data-testid="acf-beneficial-owner"
            value={form.beneficial_owner}
            onChange={(e) => set("beneficial_owner", e.target.value)}
            placeholder="Owner / group lead name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-juris">Jurisdiction</Label>
          <Select value={form.jurisdiction || "auto"} onValueChange={(v) => set("jurisdiction", v === "auto" ? "" : v)}>
            <SelectTrigger id="ac-juris" data-testid="acf-jurisdiction">
              <SelectValue placeholder="Auto-detect from CRN" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect from CRN</SelectItem>
              {JURISDICTIONS.map((j) => (
                <SelectItem key={j.code} value={j.code}>{j.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-status">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as ClientStatus)}>
            <SelectTrigger id="ac-status" data-testid="acf-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ac-period">Accounting period end</Label>
          <Input
            id="ac-period"
            data-testid="acf-period-end"
            type="date"
            value={form.accounting_period_end}
            onChange={(e) => set("accounting_period_end", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ac-notes">Notes</Label>
          <Textarea
            id="ac-notes"
            data-testid="acf-notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Internal notes about this client"
            rows={3}
          />
        </div>
      </div>

      {/* Wave 2a Phase 1: read-only Companies House data panel (edit mode).
          All fields are populated by the CH sync workflow + enrichment; shown
          here so the practice can see the full official record at a glance. */}
      {mode === "edit" && initial && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2" data-testid="acf-ch-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Companies House
            </span>
            {initial.companies_house_last_synced_at && (
              <span className="text-[10px] text-muted-foreground">
                synced {fmtChDate(initial.companies_house_last_synced_at)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <ChField label="Company status" value={initial.company_status} />
            <ChField label="Company type" value={initial.company_type} />
            <ChField label="Incorporated" value={fmtChDate(initial.date_of_incorporation)} />
            <ChField label="Accounts next due" value={fmtChDate(initial.accounts_next_due)} />
            <ChField label="Accounts last made up" value={fmtChDate(initial.accounts_last_made_up)} />
            <ChField label="Conf. stmt next due" value={fmtChDate(initial.confirmation_statement_next_due)} />
            <ChField label="Conf. stmt last made up" value={fmtChDate(initial.confirmation_statement_last_made_up)} />
            <ChField
              label="SIC codes"
              value={Array.isArray(initial.sic_codes) && initial.sic_codes.length ? initial.sic_codes.join(", ") : null}
            />
            <ChField
              label="Directors"
              value={Array.isArray(initial.directors) && initial.directors.length ? String(initial.directors.length) : null}
            />
          </div>
          {!initial.companies_house_last_synced_at && (
            <p className="text-[10px] italic text-muted-foreground">
              Not yet synced from Companies House. Use the row "Sync from Companies House" action.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} data-testid="acf-submit">
          {submitting ? "Saving…" : mode === "create" ? "Add client" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/** UK date formatter for the CH panel (YYYY-MM-DD or ISO → DD MMM YYYY). */
function fmtChDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const datePart = value.length >= 10 ? value.slice(0, 10) : value;
  const d = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function ChField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value ?? "—"}</span>
    </div>
  );
}
