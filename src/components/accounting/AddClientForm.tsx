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
// Auto-fire CH sync on save when a CRN is set (Limited companies).
import { useTriggerCompaniesHouseSync } from "@/hooks/useTriggerCompaniesHouseSync";
// Reused (Wave 2b Phase B): register-wide CH name search — gated to Limited Company below.
import { useCompaniesHouseSearch, type ChSearchMatch } from "@/hooks/useCompaniesHouseSearch";
// Staff source for the Partner Responsible picker.
import { useAccountingTeam } from "@/hooks/useAccountingTeam";

// Wave 2b — MoneyPex 3-section client form with a client-type selector.
type ClientType = "limited_company" | "sole_trader" | "person";

const CLIENT_TYPES: Array<{ code: ClientType; label: string }> = [
  { code: "limited_company", label: "Limited Company" },
  { code: "sole_trader", label: "Sole Trader" },
  { code: "person", label: "Person" },
  // Extensible: add e.g. { code: "partnership", label: "Partnership" } later.
];

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

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
  client_type: ClientType;
  // Basic
  reference_no: string;
  name: string; // Business Name (limited / optional sole_trader); composed on save
  first_name: string;
  last_name: string;
  gender: string;
  contact_email: string; // Email (reused)
  contact_phone: string; // Mobile (reused)
  partner_responsible: string;
  company_no: string; // Limited only
  hmrc_utr: string; // UTR (plain; trigger encrypts)
  ni_number: string;
  passport_mrz: string;
  gb_driving_licence: string;
  home_telephone: string;
  work_telephone: string;
  date_of_birth: string;
  date_of_death: string;
  // Address
  address_line_1: string;
  address_line_2: string;
  city: string;
  post_code: string;
  county: string;
  country: string;
  // Miscellaneous
  date_joined: string; // default today
  companies_house_auth_code: string; // Auth Code (plain; trigger encrypts)
  payee_reference_no: string;
  account_office_reference: string;
  vat_registration_date: string;
  vat_number: string; // VAT Registration # (reused)
  balance: string; // read-only, default "0"
  charges_quoted: string;
  notes: string; // reused
  beneficial_owner: string; // preserved (Miscellaneous)
  status: ClientStatus; // preserved (editable)
  accounting_period_end: string; // preserved (editable)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function dateForInput(v: string | null | undefined): string {
  return v ? v.slice(0, 10) : "";
}

function emptyForm(): FormState {
  return {
    client_type: "limited_company",
    reference_no: "",
    name: "",
    first_name: "",
    last_name: "",
    gender: "",
    contact_email: "",
    contact_phone: "",
    partner_responsible: "",
    company_no: "",
    hmrc_utr: "",
    ni_number: "",
    passport_mrz: "",
    gb_driving_licence: "",
    home_telephone: "",
    work_telephone: "",
    date_of_birth: "",
    date_of_death: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    post_code: "",
    county: "",
    country: "",
    date_joined: todayISO(),
    companies_house_auth_code: "",
    payee_reference_no: "",
    account_office_reference: "",
    vat_registration_date: "",
    // VAT defaults to "Exempt" per Adil's brief (many sub-threshold UK clients).
    vat_number: "Exempt",
    balance: "0",
    charges_quoted: "",
    notes: "",
    beneficial_owner: "",
    status: "active",
    accounting_period_end: "",
  };
}

function inferClientType(c: AccountingClientFull): ClientType {
  if (c.client_type === "limited_company" || c.client_type === "sole_trader" || c.client_type === "person") {
    return c.client_type;
  }
  if (c.company_no || ["ltd", "plc", "llp"].includes((c.company_type ?? "").toLowerCase())) {
    return "limited_company";
  }
  if (c.first_name || c.last_name) return "person";
  return "limited_company";
}

function fromExisting(c: AccountingClientFull): FormState {
  return {
    client_type: inferClientType(c),
    reference_no: c.reference_no ?? "",
    name: c.name ?? "",
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    gender: c.gender ?? "",
    contact_email: c.contact_email ?? "",
    contact_phone: c.contact_phone ?? "",
    partner_responsible: c.partner_responsible ?? "",
    company_no: c.company_no ?? "",
    hmrc_utr: c.hmrc_utr ?? "",
    ni_number: c.ni_number ?? "",
    passport_mrz: c.passport_mrz ?? "",
    gb_driving_licence: c.gb_driving_licence ?? "",
    home_telephone: c.home_telephone ?? "",
    work_telephone: c.work_telephone ?? "",
    date_of_birth: dateForInput(c.date_of_birth),
    date_of_death: dateForInput(c.date_of_death),
    address_line_1: c.address_line_1 ?? "",
    address_line_2: c.address_line_2 ?? "",
    city: c.city ?? "",
    post_code: c.post_code ?? "",
    county: c.county ?? "",
    country: c.country ?? "",
    date_joined: dateForInput(c.date_joined) || todayISO(),
    companies_house_auth_code: c.companies_house_auth_code ?? "",
    payee_reference_no: c.payee_reference_no ?? "",
    account_office_reference: c.account_office_reference ?? "",
    vat_registration_date: dateForInput(c.vat_registration_date),
    vat_number: c.vat_number ?? "",
    balance: c.balance != null ? String(c.balance) : "0",
    charges_quoted: c.charges_quoted != null ? String(c.charges_quoted) : "",
    notes: c.notes ?? "",
    beneficial_owner: c.beneficial_owner ?? "",
    status: ((c.status as ClientStatus) ?? "active") as ClientStatus,
    accounting_period_end: dateForInput(c.accounting_period_end),
  };
}

/** name compose-on-save: never returns empty (validated upstream too). */
function composeName(s: FormState): string {
  const full = `${s.first_name} ${s.last_name}`.replace(/\s+/g, " ").trim();
  if (s.client_type === "limited_company") return s.name.trim();
  if (s.client_type === "sole_trader") return s.name.trim() || full;
  return full; // person
}

function toNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function payloadFromForm(s: FormState): ClientUpsertPayload {
  const isLtd = s.client_type === "limited_company";
  return {
    name: composeName(s),
    client_type: s.client_type,
    reference_no: s.reference_no.trim() || null,
    company_no: isLtd ? s.company_no.trim() || null : null,
    vat_number: s.vat_number.trim() || null,
    contact_email: s.contact_email.trim() || null,
    contact_phone: s.contact_phone.trim() || null,
    partner_responsible: s.partner_responsible.trim() || null,
    first_name: s.first_name.trim() || null,
    last_name: s.last_name.trim() || null,
    gender: s.gender || null,
    hmrc_utr: s.hmrc_utr.trim() || null,
    ni_number: s.ni_number.trim() || null,
    passport_mrz: s.passport_mrz.trim() || null,
    gb_driving_licence: s.gb_driving_licence.trim() || null,
    home_telephone: s.home_telephone.trim() || null,
    work_telephone: s.work_telephone.trim() || null,
    date_of_birth: s.date_of_birth || null,
    date_of_death: s.date_of_death || null,
    address_line_1: s.address_line_1.trim() || null,
    address_line_2: s.address_line_2.trim() || null,
    city: s.city.trim() || null,
    post_code: s.post_code.trim() || null,
    county: s.county.trim() || null,
    country: s.country.trim() || null,
    date_joined: s.date_joined || null,
    companies_house_auth_code: s.companies_house_auth_code.trim() || null,
    payee_reference_no: s.payee_reference_no.trim() || null,
    account_office_reference: s.account_office_reference.trim() || null,
    vat_registration_date: s.vat_registration_date || null,
    balance: toNum(s.balance) ?? 0,
    charges_quoted: toNum(s.charges_quoted),
    notes: s.notes.trim() || null,
    beneficial_owner: s.beneficial_owner.trim() || null,
    jurisdiction: s.client_type === "limited_company"
      ? (jurisdictionFromCrn(s.company_no) || null)
      : null,
    accounting_period_end: s.accounting_period_end || null,
    status: s.status,
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
  const chSync = useTriggerCompaniesHouseSync();
  const { data: team = [] } = useAccountingTeam();

  const [form, setForm] = useState<FormState>(initial ? fromExisting(initial) : emptyForm());
  const [submitting, setSubmitting] = useState(false);

  // CH name autocomplete — Limited Company + create mode ONLY.
  const [nameQuery, setNameQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const justPicked = useRef(false);
  const chSearchEnabled = mode === "create" && form.client_type === "limited_company";
  const { matches: chMatches, loading: chSearchLoading } = useCompaniesHouseSearch(
    chSearchEnabled ? nameQuery : "",
  );

  useEffect(() => {
    setForm(initial ? fromExisting(initial) : emptyForm());
  }, [initial]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleCrnBlur() {
    const j = jurisdictionFromCrn(form.company_no);
    if (j) set("company_no", form.company_no.trim().toUpperCase());
  }

  function pickChMatch(m: ChSearchMatch) {
    justPicked.current = true;
    setShowSuggest(false);
    const crn = (m.company_number || "").toUpperCase();
    setForm((prev) => ({ ...prev, name: m.title || prev.name, company_no: crn }));
  }

  function onBusinessNameChange(v: string) {
    set("name", v);
    if (!chSearchEnabled) return;
    if (justPicked.current) { justPicked.current = false; return; }
    setNameQuery(v);
    setShowSuggest(true);
  }

  function validate(): string | null {
    if (!form.client_type) return "Client type is required.";
    if (!form.reference_no.trim()) return "Reference No is required.";
    if (!form.partner_responsible.trim()) return "Partner Responsible is required.";
    if (form.client_type === "limited_company" && !form.name.trim()) {
      return "Business Name is required for a Limited Company.";
    }
    if ((form.client_type === "sole_trader" || form.client_type === "person") && !form.first_name.trim()) {
      return "First Name is required.";
    }
    if (!composeName(form)) return "A client name could not be composed — fill Business Name or First/Last name.";
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      return "Email looks malformed.";
    }
    if (form.client_type === "limited_company" && form.company_no) {
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
        const crn = payload.company_no?.trim();
        if (crn && form.client_type === "limited_company") {
          chSync.mutateAsync([crn]).catch(() => { /* toast handled in hook */ });
        }
        setForm(emptyForm());
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

  const isLtd = form.client_type === "limited_company";
  const isSole = form.client_type === "sole_trader";
  const isPerson = form.client_type === "person";
  const showBusinessName = isLtd || isSole;
  const showPersonFields = isSole || isPerson;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="add-client-form">
      {/* ============ Client Type ============ */}
      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="ac-type">Client Type *</Label>
        <Select value={form.client_type} onValueChange={(v) => set("client_type", v as ClientType)}>
          <SelectTrigger id="ac-type" data-testid="acf-client-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_TYPES.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ============ Section 1 — Basic Details ============ */}
      <fieldset className="rounded-md border p-3" data-testid="acf-section-basic">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic Details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ac-ref">Reference No *</Label>
            <Input id="ac-ref" data-testid="acf-reference-no" value={form.reference_no}
              onChange={(e) => set("reference_no", e.target.value)} placeholder="e.g. SL-0001" autoComplete="off" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ac-partner">Partner Responsible *</Label>
            {team.length > 0 ? (
              <Select value={form.partner_responsible || undefined} onValueChange={(v) => set("partner_responsible", v)}>
                <SelectTrigger id="ac-partner" data-testid="acf-partner-responsible">
                  <SelectValue placeholder="Assign a partner / staff member" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((m) => {
                    const lbl = m.full_name || m.email || m.id;
                    return <SelectItem key={m.id} value={lbl}>{lbl}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input id="ac-partner" data-testid="acf-partner-responsible" value={form.partner_responsible}
                onChange={(e) => set("partner_responsible", e.target.value)} placeholder="Partner / staff name" />
            )}
          </div>

          {/* Business Name (Limited + Sole Trader) — autocomplete only when Limited */}
          {showBusinessName && (
            <div className="space-y-1.5 sm:col-span-2 relative">
              <Label htmlFor="ac-name">Business Name {isLtd ? "*" : "(optional)"}</Label>
              <Input id="ac-name" data-testid="acf-name" value={form.name}
                onChange={(e) => onBusinessNameChange(e.target.value)}
                onFocus={() => { if (chSearchEnabled && form.name.trim().length >= 2 && chMatches.length) setShowSuggest(true); }}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                placeholder={isLtd ? "Start typing to search Companies House…" : "Trading name (optional)"}
                autoComplete="off" required={isLtd} />
              {chSearchEnabled && showSuggest && (chSearchLoading || chMatches.length > 0) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-y-auto" data-testid="acf-name-suggest">
                  {chSearchLoading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching Companies House…</div>}
                  {chMatches.map((m) => (
                    <button key={m.company_number ?? m.title ?? Math.random()} type="button"
                      className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-xs hover:bg-muted/60 last:border-b-0"
                      data-testid={`acf-suggest-${m.company_number}`}
                      onMouseDown={(e) => { e.preventDefault(); pickChMatch(m); }}>
                      <span className="font-medium">{m.title}</span>
                      <span className="text-muted-foreground">
                        {m.company_number}{m.company_status ? ` · ${m.company_status}` : ""}{m.address_snippet ? ` · ${m.address_snippet}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {isLtd && (
                <p className="text-[10px] text-muted-foreground">Pick a match to auto-fill the CRN + Companies House details, or enter the CRN manually below.</p>
              )}
            </div>
          )}

          {/* Person/Sole Trader name fields */}
          {showPersonFields && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ac-first">First Name *</Label>
                <Input id="ac-first" data-testid="acf-first-name" value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)} placeholder="Given name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-last">Last Name</Label>
                <Input id="ac-last" data-testid="acf-last-name" value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)} placeholder="Family name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-gender">Gender</Label>
                <Select value={form.gender || undefined} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger id="ac-gender" data-testid="acf-gender"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Company No (Limited only) */}
          {isLtd && (
            <div className="space-y-1.5">
              <Label htmlFor="ac-crn">Company No.</Label>
              <Input id="ac-crn" data-testid="acf-company-no" value={form.company_no}
                onChange={(e) => set("company_no", e.target.value)} onBlur={handleCrnBlur}
                placeholder="e.g. 12345678 or SC123456" autoComplete="off" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ac-email">Email</Label>
            <Input id="ac-email" data-testid="acf-email" type="email" value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)} placeholder="finance@client.example" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-mobile">Mobile</Label>
            <Input id="ac-mobile" data-testid="acf-phone" value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)} placeholder="+44 7700 900123" autoComplete="tel" />
          </div>

          {/* UTR — all types */}
          <div className="space-y-1.5">
            <Label htmlFor="ac-utr">UTR</Label>
            <Input id="ac-utr" data-testid="acf-utr" value={form.hmrc_utr}
              onChange={(e) => set("hmrc_utr", e.target.value)} placeholder="10-digit HMRC UTR" autoComplete="off" />
          </div>

          {/* Person/Sole Trader-only identity fields */}
          {showPersonFields && (
            <div className="space-y-1.5">
              <Label htmlFor="ac-ni">NI Number</Label>
              <Input id="ac-ni" data-testid="acf-ni-number" value={form.ni_number}
                onChange={(e) => set("ni_number", e.target.value)} placeholder="QQ123456C" autoComplete="off" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ac-passport">Passport MRZ</Label>
            <Input id="ac-passport" data-testid="acf-passport-mrz" value={form.passport_mrz}
              onChange={(e) => set("passport_mrz", e.target.value)} placeholder="Machine-readable zone" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-dl">GB Driving Licence</Label>
            <Input id="ac-dl" data-testid="acf-gb-driving-licence" value={form.gb_driving_licence}
              onChange={(e) => set("gb_driving_licence", e.target.value)} placeholder="Licence number" autoComplete="off" />
          </div>
          {showPersonFields && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ac-dob">Date of Birth</Label>
                <Input id="ac-dob" data-testid="acf-date-of-birth" type="date" value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-dod">Date of Death</Label>
                <Input id="ac-dod" data-testid="acf-date-of-death" type="date" value={form.date_of_death}
                  onChange={(e) => set("date_of_death", e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ac-home-tel">Home Telephone</Label>
            <Input id="ac-home-tel" data-testid="acf-home-telephone" value={form.home_telephone}
              onChange={(e) => set("home_telephone", e.target.value)} placeholder="+44 20 7946 0000" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-work-tel">Work Telephone</Label>
            <Input id="ac-work-tel" data-testid="acf-work-telephone" value={form.work_telephone}
              onChange={(e) => set("work_telephone", e.target.value)} placeholder="+44 20 7946 0001" autoComplete="off" />
          </div>
        </div>
      </fieldset>

      {/* ============ Section 2 — Address Details ============ */}
      <fieldset className="rounded-md border p-3" data-testid="acf-section-address">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address Details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ac-addr1">Address Line 1</Label>
            <Input id="ac-addr1" data-testid="acf-address-line-1" value={form.address_line_1}
              onChange={(e) => set("address_line_1", e.target.value)} autoComplete="address-line1" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ac-addr2">Address Line 2</Label>
            <Input id="ac-addr2" data-testid="acf-address-line-2" value={form.address_line_2}
              onChange={(e) => set("address_line_2", e.target.value)} autoComplete="address-line2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-city">City</Label>
            <Input id="ac-city" data-testid="acf-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-postcode">Post Code</Label>
            <Input id="ac-postcode" data-testid="acf-post-code" value={form.post_code} onChange={(e) => set("post_code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-county">County</Label>
            <Input id="ac-county" data-testid="acf-county" value={form.county} onChange={(e) => set("county", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-country">Country</Label>
            <Input id="ac-country" data-testid="acf-country" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="United Kingdom" />
          </div>
        </div>
      </fieldset>

      {/* ============ Section 3 — Miscellaneous ============ */}
      <fieldset className="rounded-md border p-3" data-testid="acf-section-misc">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Miscellaneous</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ac-joined">Date Joined</Label>
            <Input id="ac-joined" data-testid="acf-date-joined" type="date" value={form.date_joined}
              onChange={(e) => set("date_joined", e.target.value)} />
          </div>
          {/* Incorporation date is CH-synced — read-only display (edit mode) */}
          {mode === "edit" && (
            <div className="space-y-1.5">
              <Label htmlFor="ac-incorp">Incorporation Date</Label>
              <Input id="ac-incorp" data-testid="acf-incorporation-date" type="date"
                value={dateForInput(initial?.date_of_incorporation)} readOnly disabled />
              <p className="text-[10px] text-muted-foreground">Synced from Companies House.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ac-auth">Authentication Code</Label>
            <Input id="ac-auth" data-testid="acf-auth-code" value={form.companies_house_auth_code}
              onChange={(e) => set("companies_house_auth_code", e.target.value)} placeholder="CH web-filing auth code" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-payee">Payee Reference No</Label>
            <Input id="ac-payee" data-testid="acf-payee-ref" value={form.payee_reference_no}
              onChange={(e) => set("payee_reference_no", e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-aor">Account Office Reference #</Label>
            <Input id="ac-aor" data-testid="acf-account-office-ref" value={form.account_office_reference}
              onChange={(e) => set("account_office_reference", e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-vatdate">VAT Registration Date</Label>
            <Input id="ac-vatdate" data-testid="acf-vat-reg-date" type="date" value={form.vat_registration_date}
              onChange={(e) => set("vat_registration_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-vat">VAT Registration #</Label>
            <Input id="ac-vat" data-testid="acf-vat" value={form.vat_number}
              onChange={(e) => set("vat_number", e.target.value)} placeholder="GB123456789 or Exempt" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-balance">Balance</Label>
            <Input id="ac-balance" data-testid="acf-balance" type="number" value={form.balance} readOnly disabled />
            <p className="text-[10px] text-muted-foreground">Read-only — derived from ledger.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-charges">Charges Quoted</Label>
            <Input id="ac-charges" data-testid="acf-charges-quoted" type="number" step="0.01" value={form.charges_quoted}
              onChange={(e) => set("charges_quoted", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-bo">Beneficial Owner</Label>
            <Input id="ac-bo" data-testid="acf-beneficial-owner" value={form.beneficial_owner}
              onChange={(e) => set("beneficial_owner", e.target.value)} placeholder="Owner / group lead name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ClientStatus)}>
              <SelectTrigger id="ac-status" data-testid="acf-status"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-period">Accounting Period End</Label>
            <Input id="ac-period" data-testid="acf-period-end" type="date" value={form.accounting_period_end}
              onChange={(e) => set("accounting_period_end", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ac-notes">Notes</Label>
            <Textarea id="ac-notes" data-testid="acf-notes" value={form.notes}
              onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes about this client" rows={3} />
          </div>
        </div>
      </fieldset>

      {/* Wave 2a Phase 1: read-only Companies House data panel (edit mode). PRESERVED. */}
      {mode === "edit" && initial && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2" data-testid="acf-ch-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Companies House</span>
            {initial.companies_house_last_synced_at && (
              <span className="text-[10px] text-muted-foreground">synced {fmtChDate(initial.companies_house_last_synced_at)}</span>
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
            <ChField label="SIC codes" value={Array.isArray(initial.sic_codes) && initial.sic_codes.length ? initial.sic_codes.join(", ") : null} />
            <ChField label="Directors" value={Array.isArray(initial.directors) && initial.directors.length ? String(initial.directors.length) : null} />
          </div>
          {!initial.companies_house_last_synced_at && (
            <p className="text-[10px] italic text-muted-foreground">Not yet synced from Companies House. Use the row "Sync from Companies House" action.</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
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
