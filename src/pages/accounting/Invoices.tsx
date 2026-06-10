import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Search,
  Send,
  PoundSterling,
  AlertTriangle,
  MoreVertical,
  Sparkles,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAccountingInvoices,
  type AccountingInvoice,
  type InvoiceStatus,
} from "@/hooks/useAccountingInvoices";
import { useAccountingClientsList } from "@/hooks/useAccountingClientsList";
import { useGenerateInvoiceNumber } from "@/hooks/useGenerateInvoiceNumber";
import { useRecordPayment } from "@/hooks/useRecordPayment";
import { useSendInvoice } from "@/hooks/useSendInvoice";
// Invoice Phase B (2026-06-10): per-tenant branding/bank/numbering settings + branded PDF.
import { useInvoiceSettings, useBumpInvoiceNumber } from "@/hooks/useInvoiceSettings";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";
// Email-delivery-layer v1: real per-invoice delivery state (queued→sending→sent/failed).
import { useInvoiceDeliveryStatus, type InvoiceDelivery } from "@/hooks/useInvoiceDeliveryStatus";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_OPTIONS: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
];

const STATUS_META: Record<InvoiceStatus, { variant: BadgeVariant; label: string }> = {
  draft: { variant: "outline", label: "Draft" },
  sent: { variant: "default", label: "Sent" },
  paid: { variant: "secondary", label: "Paid" },
  partial: { variant: "outline", label: "Partial" },
  overdue: { variant: "destructive", label: "Overdue" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

type VatMode = "standard" | "reduced" | "zero" | "exempt" | "outside";

const VAT_MODES: Array<{ code: VatMode; label: string; rate: number }> = [
  { code: "standard", label: "Standard 20%", rate: 0.2 },
  { code: "reduced", label: "Reduced 5%", rate: 0.05 },
  { code: "zero", label: "Zero rated 0%", rate: 0 },
  { code: "exempt", label: "Exempt", rate: 0 },
  { code: "outside", label: "Outside scope", rate: 0 },
];

interface InvoiceFormState {
  client_id: string;
  invoice_no: string;
  subtotal: string;       // user-entered net amount as string for input control
  vatMode: VatMode;
  description: string;
  due_at: string;         // YYYY-MM-DD
  status: InvoiceStatus;
}

const EMPTY_FORM: InvoiceFormState = {
  client_id: "",
  invoice_no: "",
  subtotal: "",
  vatMode: "standard",
  description: "",
  due_at: "",
  status: "draft",
};

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateUK(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdueDate(due_at: string | null, status: InvoiceStatus): boolean {
  if (!due_at) return false;
  if (status === "paid" || status === "cancelled") return false;
  return new Date(due_at).getTime() < Date.now();
}

/** Email-delivery-layer v1 — per-invoice delivery chip (real send state, not just "marked sent"). */
function DeliveryChip({ d }: { d: InvoiceDelivery | undefined }) {
  if (!d) return <span className="text-xs text-muted-foreground">—</span>;
  if (d.state === "sent") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px]"
        title={`Delivered via ${d.mailbox ?? "?"}\nSMTP message-id: ${d.messageId ?? "?"}`}
        data-testid={`delivery-chip-${d.invoiceId}`}
      >
        ✓ Delivered
      </Badge>
    );
  }
  if (d.state === "bounced" || d.state === "failed") {
    return (
      <Badge variant="destructive" className="text-[10px]" title={d.error ?? undefined} data-testid={`delivery-chip-${d.invoiceId}`}>
        {d.state === "bounced" ? "Bounced" : "Send failed"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]" data-testid={`delivery-chip-${d.invoiceId}`}>
      {d.state === "sending" ? "Sending…" : "Queued"}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  emphasised,
  testId,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasised?: boolean;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className={`mt-1 text-2xl font-bold ${emphasised ? "text-destructive" : ""}`}>
              {value}
            </div>
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${emphasised ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountingInvoices() {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const filters = useMemo(
    () => ({
      ...(statusFilter !== "all" && { status: statusFilter }),
      ...(clientFilter !== "all" && { clientId: clientFilter }),
      ...(search.trim() && { searchTerm: search.trim() }),
    }),
    [statusFilter, clientFilter, search],
  );

  const {
    invoices,
    isLoading,
    error,
    createInvoice,
    updateInvoice,
    cancelInvoice,
    deleteInvoice,
  } = useAccountingInvoices(filters);
  const { data: clients = [] } = useAccountingClientsList();
  // Phase B: settings drive the number scheme, the branded PDF, and the branded email.
  const { data: invoiceSettings = null } = useInvoiceSettings();
  const generateInvoiceNo = useGenerateInvoiceNumber(invoiceSettings);
  const bumpInvoiceNumber = useBumpInvoiceNumber();
  const recordPayment = useRecordPayment();
  const sendInvoice = useSendInvoice(invoiceSettings);
  const { data: deliveryByInvoice = {} } = useInvoiceDeliveryStatus();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<AccountingInvoice | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(EMPTY_FORM);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<AccountingInvoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", ref: "", notes: "" });

  // Hydrate edit form
  useEffect(() => {
    if (!editingInvoice) return;
    // Best-effort VAT reverse: assume Standard rate at first
    const total = Number(editingInvoice.amount) || 0;
    setForm({
      client_id: editingInvoice.client_id,
      invoice_no: editingInvoice.invoice_no,
      subtotal: total ? String((total / 1.2).toFixed(2)) : "",
      vatMode: "standard",
      description: editingInvoice.description ?? "",
      due_at: editingInvoice.due_at ?? "",
      status: editingInvoice.status,
    });
  }, [editingInvoice]);

  // Stats over filtered list
  const stats = useMemo(() => {
    const sum = (preds: ((inv: AccountingInvoice) => boolean)) =>
      invoices.filter(preds).reduce((s, inv) => s + (Number(inv.amount) || 0), 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    return {
      totalSent: sum((inv) => inv.status === "sent" || inv.status === "partial" || inv.status === "overdue" || inv.status === "paid"),
      outstanding: sum((inv) => inv.status === "sent" || inv.status === "partial" || inv.status === "overdue"),
      overdue: sum((inv) =>
        inv.status === "overdue" || (isOverdueDate(inv.due_at, inv.status) && inv.status !== "paid" && inv.status !== "cancelled"),
      ),
      mtdSent: sum((inv) => {
        if (!inv.sent_at) return false;
        return new Date(inv.sent_at).getTime() >= monthStartMs;
      }),
    };
  }, [invoices]);

  // VAT calculator
  const vatPreview = useMemo(() => {
    const sub = Number(form.subtotal) || 0;
    const mode = VAT_MODES.find((m) => m.code === form.vatMode) ?? VAT_MODES[0];
    const vat = sub * mode.rate;
    const total = sub + vat;
    return { subtotal: sub, vat, total, modeLabel: mode.label };
  }, [form.subtotal, form.vatMode]);

  async function openCreate() {
    setForm(EMPTY_FORM);
    try {
      const next = await generateInvoiceNo();
      setForm((prev) => ({ ...prev, invoice_no: next }));
    } catch {
      // best-effort; user can type manually
    }
    setShowCreateDialog(true);
  }

  function closeDialogs() {
    setShowCreateDialog(false);
    setEditingInvoice(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) {
      toast({ title: "Client required", description: "Pick a client for this invoice.", variant: "destructive" });
      return;
    }
    if (!form.invoice_no.trim()) {
      toast({ title: "Invoice number required", variant: "destructive" });
      return;
    }
    if (vatPreview.total <= 0) {
      toast({ title: "Amount must be > 0", variant: "destructive" });
      return;
    }
    const payload: Partial<AccountingInvoice> = {
      client_id: form.client_id,
      invoice_no: form.invoice_no.trim(),
      amount: vatPreview.total,
      currency: "GBP",
      status: form.status,
      description: form.description.trim() || null,
      due_at: form.due_at || null,
    };
    try {
      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, patch: payload });
        toast({ title: "Invoice updated", description: form.invoice_no });
      } else {
        await createInvoice.mutateAsync(payload);
        toast({ title: "Invoice created", description: form.invoice_no });
        // Phase B: advance the settings-driven sequence so the next invoice continues it.
        await bumpInvoiceNumber(form.invoice_no.trim(), invoiceSettings);
      }
      closeDialogs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Couldn't save invoice", description: msg, variant: "destructive" });
    }
  }

  async function handleSendInvoice(inv: AccountingInvoice) {
    try {
      const r = await sendInvoice.mutateAsync(inv);
      toast({ title: "Invoice sent", description: `From ${r.mailbox}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      toast({ title: "Couldn't send invoice", description: msg, variant: "destructive" });
    }
  }

  // Phase B: generate + download the branded PDF locally (no upload — that happens on Send).
  async function handleDownloadPdf(inv: AccountingInvoice) {
    setDownloadingId(inv.id);
    try {
      const doc = await buildInvoicePdf(inv, invoiceSettings);
      doc.save(invoicePdfFilename(inv));
      toast({ title: "PDF downloaded", description: invoicePdfFilename(inv) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF generation failed";
      toast({ title: "Couldn't generate PDF", description: msg, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleCancelInvoice(inv: AccountingInvoice) {
    try {
      await cancelInvoice.mutateAsync(inv.id);
      toast({ title: "Invoice cancelled", description: inv.invoice_no });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cancel failed";
      toast({ title: "Couldn't cancel invoice", description: msg, variant: "destructive" });
    }
  }

  async function confirmDelete() {
    if (!deletingInvoiceId) return;
    const id = deletingInvoiceId;
    setDeletingInvoiceId(null);
    try {
      await deleteInvoice.mutateAsync(id);
      toast({ title: "Invoice deleted" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Couldn't delete invoice", description: msg, variant: "destructive" });
    }
  }

  function openPaymentDialog(inv: AccountingInvoice) {
    const remaining = Number(inv.amount) || 0;
    setPaymentInvoice(inv);
    setPaymentForm({
      amount: remaining > 0 ? String(remaining.toFixed(2)) : "",
      date: new Date().toISOString().slice(0, 10),
      ref: "",
      notes: "",
    });
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentInvoice) return;
    const amt = Number(paymentForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (!paymentForm.date) {
      toast({ title: "Payment date required", variant: "destructive" });
      return;
    }
    try {
      const r = await recordPayment.mutateAsync({
        invoice_id: paymentInvoice.id,
        amount: amt,
        payment_date: paymentForm.date,
        transaction_ref: paymentForm.ref || null,
        notes: paymentForm.notes || null,
      });
      toast({
        title: "Payment recorded",
        description: `${formatGBP(amt)} → invoice now ${r.newStatus}`,
      });
      setPaymentInvoice(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Record failed";
      toast({ title: "Couldn't record payment", description: msg, variant: "destructive" });
    }
  }

  const isSaving = createInvoice.isPending || updateInvoice.isPending;
  const dialogOpen = showCreateDialog || !!editingInvoice;
  const dialogMode: "create" | "edit" = editingInvoice ? "edit" : "create";

  return (
    <div className="space-y-6 p-6" data-testid="accounting-invoices-page">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}${
                  statusFilter !== "all" || clientFilter !== "all" || search ? " (filtered)" : ""
                }`}
          </p>
        </div>
        <Button onClick={openCreate} data-testid="new-invoice-button">
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Sent" value={formatGBP(stats.totalSent)} icon={PoundSterling} testId="stat-total-sent" />
        <StatCard label="Outstanding" value={formatGBP(stats.outstanding)} icon={FileText} testId="stat-outstanding" />
        <StatCard label="Overdue" value={formatGBP(stats.overdue)} icon={AlertTriangle} emphasised={stats.overdue > 0} testId="stat-invoice-overdue" />
        <StatCard label="MTD Sent" value={formatGBP(stats.mtdSent)} icon={Send} testId="stat-mtd-sent" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice no / description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="invoices-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
          <SelectTrigger className="w-40" data-testid="invoice-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-52" data-testid="invoice-client-filter">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice no</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={`skel-${i}-${j}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-destructive">
                    Couldn&apos;t load invoices: {(error as Error).message}
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground" data-testid="invoices-empty">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <span>
                        {filters.status || filters.clientId || filters.searchTerm
                          ? "No invoices match your filters."
                          : "No invoices yet. Click 'New Invoice' to create your first."}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const effectiveStatus: InvoiceStatus =
                    isOverdueDate(inv.due_at, inv.status) && inv.status === "sent"
                      ? "overdue"
                      : inv.status;
                  const meta = STATUS_META[effectiveStatus];
                  const canSend = inv.status === "draft" || inv.status === "overdue";
                  const canRecordPayment = inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "draft";

                  return (
                    <TableRow
                      key={inv.id}
                      data-testid={`invoice-row-${inv.id}`}
                      data-invoice-no={inv.invoice_no}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      tabIndex={0}
                      onClick={() => setEditingInvoice(inv)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditingInvoice(inv);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-sm font-medium">{inv.invoice_no}</TableCell>
                      <TableCell>
                        {inv.accounting_clients?.name ?? <span className="text-xs italic text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateUK(inv.created_at)}</TableCell>
                      <TableCell className={isOverdueDate(inv.due_at, inv.status) ? "font-medium text-destructive" : ""}>
                        {formatDateUK(inv.due_at)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatGBP(Number(inv.amount) || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell><DeliveryChip d={deliveryByInvoice[inv.id]} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`invoice-row-menu-${inv.id}`} aria-label="Row actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingInvoice(inv);
                              }}
                            >
                              Edit details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={downloadingId === inv.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPdf(inv);
                              }}
                              data-testid={`invoice-row-download-pdf-${inv.id}`}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {downloadingId === inv.id ? "Generating…" : "Download PDF"}
                            </DropdownMenuItem>
                            {canSend && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendInvoice(inv);
                                }}
                                data-testid="invoice-row-menu-send"
                              >
                                <Send className="mr-2 h-4 w-4" /> Send via email
                              </DropdownMenuItem>
                            )}
                            {canRecordPayment && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPaymentDialog(inv);
                                }}
                                data-testid="invoice-row-menu-payment"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> Record payment
                              </DropdownMenuItem>
                            )}
                            {inv.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelInvoice(inv);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Mark cancelled
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingInvoiceId(inv.id);
                              }}
                              data-testid="invoice-row-menu-delete"
                            >
                              Delete
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

      {/* Footer hint */}
      <Card className="border-primary/30 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            More invoicing features — Phase 2
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Branded PDF download + branded invoice emails are live. TrueLayer auto-matched payments,
          customer portal, recurring invoices, and line-by-line VAT breakdown land in Phase 2.
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialogs(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "New Invoice" : "Edit Invoice"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Create a UK-VAT-aware invoice. Total = subtotal + VAT."
                : `Update ${editingInvoice?.invoice_no ?? ""}.`}
            </DialogDescription>
          </DialogHeader>
          <form id="invoice-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice-no">Invoice number *</Label>
                <Input
                  id="invoice-no"
                  data-testid="invoice-form-no"
                  value={form.invoice_no}
                  onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
                  placeholder="INV-2026-0001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as InvoiceStatus })}>
                  <SelectTrigger data-testid="invoice-form-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger data-testid="invoice-form-client"><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice-subtotal">Subtotal (net) *</Label>
                <Input
                  id="invoice-subtotal"
                  data-testid="invoice-form-subtotal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.subtotal}
                  onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>VAT mode</Label>
                <Select value={form.vatMode} onValueChange={(v) => setForm({ ...form, vatMode: v as VatMode })}>
                  <SelectTrigger data-testid="invoice-form-vat-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VAT_MODES.map((m) => (
                      <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatGBP(vatPreview.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VAT ({vatPreview.modeLabel})</span>
                <span className="font-mono">{formatGBP(vatPreview.vat)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t pt-1 font-medium">
                <span>Total (saved as invoice amount)</span>
                <span className="font-mono" data-testid="invoice-form-total-preview">{formatGBP(vatPreview.total)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoice-description">Description</Label>
              <Textarea
                id="invoice-description"
                data-testid="invoice-form-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional line summary, PO reference, etc."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice-due">Due date</Label>
                <Input
                  id="invoice-due"
                  data-testid="invoice-form-due"
                  type="date"
                  value={form.due_at}
                  onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialogs} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="invoice-form"
              disabled={isSaving || !form.invoice_no.trim() || !form.client_id}
              data-testid="invoice-form-submit"
            >
              {isSaving ? "Saving…" : dialogMode === "create" ? "Create Invoice" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentInvoice} onOpenChange={(open) => { if (!open) setPaymentInvoice(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paymentInvoice
                ? `Invoice ${paymentInvoice.invoice_no} — ${formatGBP(Number(paymentInvoice.amount) || 0)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form id="payment-form" onSubmit={handleRecordPayment} className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Amount (£)</Label>
                <Input
                  data-testid="payment-form-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Payment date</Label>
                <Input
                  data-testid="payment-form-date"
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Bank reference</Label>
              <Input
                data-testid="payment-form-ref"
                value={paymentForm.ref}
                onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                data-testid="payment-form-notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPaymentInvoice(null)} disabled={recordPayment.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="payment-form"
              disabled={recordPayment.isPending}
              data-testid="payment-form-submit"
            >
              {recordPayment.isPending ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingInvoiceId} onOpenChange={(open) => { if (!open) setDeletingInvoiceId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice and any matched payments. There&apos;s no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-invoice"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
