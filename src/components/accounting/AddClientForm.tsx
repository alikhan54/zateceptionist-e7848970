import { useEffect, useState } from "react";
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
  vat_number: "",
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

  const [form, setForm] = useState<FormState>(initial ? fromExisting(initial) : EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ac-name">Client name *</Label>
          <Input
            id="ac-name"
            data-testid="acf-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Acme Holdings Ltd"
            required
            autoFocus
          />
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
