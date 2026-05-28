import { useMemo, useState } from "react";
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
import { MoreVertical, RefreshCw, Search, Users, Plus, Pencil } from "lucide-react";
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
  const [editTarget, setEditTarget] = useState<AccountingClientFull | null>(null);

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
      })),
    [fullClients],
  );
  const isLoading = clientsLoading;
  const error = clientsError ? (clientsError as Error).message : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.company_no?.toLowerCase().includes(q) ||
        c.vat_number?.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const handleRowClick = () => {
    toast({
      title: "Per-client detail view",
      description: "Jobs / invoices / payments / communication for a single client — coming in Phase 2.",
    });
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
              placeholder="Search by name, CRN, or VAT…"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company No.</TableHead>
                <TableHead>VAT Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={`skel-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-destructive py-8">
                    Couldn't load clients: {error}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
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
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={handleRowClick}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs">{c.company_no || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{c.vat_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={variant} className="capitalize">
                          {c.status ?? "active"}
                        </Badge>
                      </TableCell>
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
                                handleEditClient(c.id);
                              }}
                              data-testid={`client-row-edit-${c.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit client
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!c.company_no || chSync.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!c.company_no) return;
                                chSync.mutateAsync([c.company_no]).catch(() => {
                                  /* toast handled inside hook */
                                });
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
                                handleRowClick();
                              }}
                            >
                              View details (Phase 2)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add client dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl" data-testid="add-client-dialog">
          <DialogHeader>
            <DialogTitle>Add a client</DialogTitle>
            <DialogDescription>
              Add a UK client to your roster. CRN prefix auto-detects the jurisdiction. Encrypted CH auth + UTR are
              filled later via the Companies House sync action.
            </DialogDescription>
          </DialogHeader>
          <AddClientForm
            mode="create"
            onSuccess={() => setAddOpen(false)}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit client dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-2xl" data-testid="edit-client-dialog">
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
