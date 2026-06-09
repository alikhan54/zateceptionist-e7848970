import { Fragment, useMemo, useState } from "react";
// Phase 4 (2026-06-02): per-client tasking — clicking a row navigates to Jobs
// filtered by client_id; "New job for this client" goes through the same URL with new=1.
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTriggerCompaniesHouseSync } from "@/hooks/useTriggerCompaniesHouseSync";
import { MoreVertical, RefreshCw, Search, Users, Plus, Pencil, ChevronRight, ChevronDown, Building2 } from "lucide-react";
import { CompaniesHousePanel, postCodeFromAddress } from "@/components/accounting/CompaniesHousePanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddClientForm } from "@/components/accounting/AddClientForm";
import { useAccountingClients, type AccountingClientFull } from "@/hooks/useAccountingClients";

interface AccountingClient {
  id: string;
  name: string;
  company_no: string | null;
  vat_number: string | null;
  status: string | null;
  accounting_period_end: string | null;
  contact_email: string | null;
  // Wave 2a Phase 1: surface CH company status + next accounts due in the list.
  company_status: string | null;
  accounts_next_due: string | null;
  // Wave 2b Phase C: drive the "fetching from CH" spinner.
  companies_house_sync_status: string | null;
  // MoneyPex (2026-06-09): list columns "Partner Responsible" + "Post Code".
  // post_code flat column is mostly empty on the synced roster — fall back to the
  // postal_code inside registered_office_address (populated by CH sync).
  partner_responsible: string | null;
  post_code: string | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  prospect: "outline",
};

function formatPeriodEnd(value: string | null): string {
  if (!value) return "—";
  // ISO date or full timestamp — extract YYYY-MM-DD and format DD MMM YYYY (UK)
  const datePart = value.length >= 10 ? value.slice(0, 10) : value;
  const d = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function AccountingClients() {
  const { toast } = useToast();
  const chSync = useTriggerCompaniesHouseSync();
  const {
    clients: fullClients,
    isLoading: clientsLoading,
    error: clientsError,
  } = useAccountingClients();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  // Wave 2b Phase C: id of a just-added client awaiting CH sync → row shows a spinner.
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AccountingClientFull | null>(null);
  // MoneyPex (2026-06-09): which client row is expanded to show the Companies House panel.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Shared CH-sync trigger used by both the row dropdown and the expanded panel button.
  // Sets syncingId so the row's CH-Status cell shows the "Fetching…" spinner; cleared
  // when the mutation settles (the hook shows the success/partial/fail toast).
  const handleCompaniesHouseSync = (companyNo: string, clientId: string) => {
    if (!companyNo) return;
    setSyncingId(clientId);
    chSync
      .mutateAsync([companyNo])
      .catch(() => {
        /* toast handled inside hook */
      })
      .finally(() => setSyncingId((cur) => (cur === clientId ? null : cur)));
  };

  const clients: AccountingClient[] = useMemo(
    () =>
      (fullClients ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        company_no: c.company_no,
        vat_number: c.vat_number,
        status: c.status,
        accounting_period_end: c.accounting_period_end,
        contact_email: c.contact_email,
        company_status: c.company_status,
        accounts_next_due: c.accounts_next_due,
        companies_house_sync_status: c.companies_house_sync_status,
        partner_responsible: c.partner_responsible,
        // Prefer the flat column; fall back to the CH registered-office postal_code.
        post_code: c.post_code ?? postCodeFromAddress(c.registered_office_address),
      })),
    [fullClients],
  );
  const isLoading = clientsLoading;
  const error = clientsError ? (clientsError as Error).message : null;

  const filtered = useMemo(() => {
    const raw = search.trim();
    const q = raw.toLowerCase();
    if (!q) return clients;
    // Wave 2a Phase 5: a numeric (or CRN-shaped, e.g. SC123456) query targets the
    // company number; otherwise match by name. CRN match is a normalized
    // startsWith so "12345678" or "SC1234" both resolve precisely (not a fuzzy
    // both-field contains).
    const looksLikeCrn = /^[0-9]+$/.test(raw) || /^[a-z]{1,2}[0-9]{4,}$/i.test(raw);
    if (looksLikeCrn) {
      const qn = q.replace(/\s+/g, "");
      return clients.filter((c) => (c.company_no ?? "").toLowerCase().replace(/\s+/g, "").startsWith(qn));
    }
    return clients.filter((c) => c.name?.toLowerCase().includes(q));
  }, [clients, search]);

  const navigate = useNavigate();
  // Phase 4: row click → Jobs filtered by this client.
  // Full 360-view (invoices/payments/comms in one panel) stays Phase 2; this unblocks tasking now.
  const handleRowClick = (clientId: string) => {
    navigate(`/accounting/jobs?client=${encodeURIComponent(clientId)}`);
  };

  const handleNewJobForClient = (clientId: string) => {
    navigate(`/accounting/jobs?client=${encodeURIComponent(clientId)}&new=1`);
  };

  const handleEditClient = (id: string) => {
    const target = (fullClients ?? []).find((c) => c.id === id);
    if (target) setEditTarget(target);
  };

  return (
    <div className="space-y-6 p-6" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${clients.length} ${clients.length === 1 ? "client" : "clients"} on your roster`}
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search: number → CRN, text → name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              disabled={isLoading || !!error}
            />
          </div>
          <Button onClick={() => setAddOpen(true)} data-testid="clients-add-button">
            <Plus className="h-4 w-4 mr-1" />
            Add client
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Company No.</TableHead>
                <TableHead>VAT Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CH Status</TableHead>
                <TableHead>Partner Responsible</TableHead>
                <TableHead>Post Code</TableHead>
                <TableHead>Accounts Due</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {Array.from({ length: 12 }).map((__, j) => (
                      <TableCell key={`skel-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-destructive py-8">
                    Couldn't load clients: {error}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-12">
                    {clients.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <span>No clients yet. Your real roster imports during Day 5.</span>
                      </div>
                    ) : (
                      <span>No clients match "{search}". Try a different search term.</span>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const statusKey = (c.status ?? "active").toLowerCase();
                  const variant = STATUS_VARIANT[statusKey] ?? "secondary";
                  const isExpanded = expandedId === c.id;
                  const full = (fullClients ?? []).find((fc) => fc.id === c.id) ?? null;
                  const rowSyncing = c.id === syncingId && c.companies_house_sync_status !== "synced";
                  return (
                    <Fragment key={c.id}>
                    <TableRow
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => handleRowClick(c.id)}
                      data-testid={`client-row-${c.id}`}
                      data-state={isExpanded ? "expanded" : undefined}
                    >
                      <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={isExpanded ? "Hide company details" : "Show company details"}
                          aria-expanded={isExpanded}
                          data-testid={`client-row-expand-${c.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId((cur) => (cur === c.id ? null : c.id));
                          }}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.company_no || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.vat_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={variant} className="capitalize">
                          {c.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rowSyncing ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" data-testid={`ch-fetching-${c.id}`}>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Fetching from Companies House…
                          </span>
                        ) : c.company_status ? (
                          <Badge
                            variant={c.company_status.toLowerCase() === "active" ? "default" : "secondary"}
                            className="capitalize text-[10px]"
                          >
                            {c.company_status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{c.partner_responsible || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.post_code || "—"}</TableCell>
                      <TableCell className="text-xs">{formatPeriodEnd(c.accounts_next_due)}</TableCell>
                      <TableCell>{formatPeriodEnd(c.accounting_period_end)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.contact_email || "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Row actions"
                              data-testid={`client-row-menu-${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId((cur) => (cur === c.id ? null : c.id));
                              }}
                              data-testid={`client-row-details-${c.id}`}
                            >
                              <Building2 className="mr-2 h-4 w-4" />
                              {isExpanded ? "Hide company details" : "View company details"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClient(c.id);
                              }}
                              data-testid={`client-row-edit-${c.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit client
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!c.company_no || rowSyncing}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.company_no) handleCompaniesHouseSync(c.company_no, c.id);
                              }}
                              data-testid={`client-row-ch-sync-${c.id}`}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Sync from Companies House
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(c.id);
                              }}
                              data-testid={`client-row-view-jobs-${c.id}`}
                            >
                              View jobs for this client
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewJobForClient(c.id);
                              }}
                              data-testid={`client-row-new-job-${c.id}`}
                            >
                              New job for this client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {isExpanded && full && (
                      <TableRow data-testid={`client-detail-row-${c.id}`} className="hover:bg-transparent">
                        <TableCell colSpan={12} className="bg-muted/20 p-3">
                          <CompaniesHousePanel
                            client={full}
                            syncing={rowSyncing}
                            onSync={(companyNo) => handleCompaniesHouseSync(companyNo, c.id)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add client dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-client-dialog">
          <DialogHeader>
            <DialogTitle>Add a client</DialogTitle>
            <DialogDescription>
              Add a UK client to your roster. CRN prefix auto-detects the jurisdiction. Encrypted CH auth + UTR are
              filled later via the Companies House sync action.
            </DialogDescription>
          </DialogHeader>
          <AddClientForm
            mode="create"
            onSuccess={(created) => {
              setAddOpen(false);
              // Phase C: if the new client has a CRN, the on-save CH sync is now
              // running (~10-15s). Flag the row so it shows a "Fetching…" spinner
              // until its sync_status flips to 'synced' (auto-cleared by the
              // realtime-refreshed list, or after a 25s safety timeout).
              if (created?.company_no) {
                setSyncingId(created.id);
                setTimeout(() => setSyncingId((cur) => (cur === created.id ? null : cur)), 25000);
              }
            }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit client dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-client-dialog">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>{editTarget?.name}</DialogDescription>
          </DialogHeader>
          <AddClientForm
            mode="edit"
            initial={editTarget}
            onSuccess={() => setEditTarget(null)}
            onCancel={() => setEditTarget(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
