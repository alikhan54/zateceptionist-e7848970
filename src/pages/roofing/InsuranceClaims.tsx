import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/webhook";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Plus, Copy, Loader2, FileText } from "lucide-react";

type Claim = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  claim_number: string | null;
  insurance_carrier: string | null;
  policy_number: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  adjuster_visit_date: string | null;
  filed_at: string;
  status: string;
  damage_type: string | null;
  damage_photos: Array<{ url: string; caption?: string; uploaded_at?: string }> | null;
  scope_of_loss_letter: string | null;
  scope_draft_model: string | null;
  scope_draft_generated_at: string | null;
  estimated_claim_amount: number | null;
  approved_claim_amount: number | null;
  deductible: number | null;
  settled_at: string | null;
  notes: string | null;
  created_at: string;
};

type Customer = { id: string; name: string | null; phone_number: string | null };

const STATUS_CHIPS: Array<{ id: string; label: string; color: string }> = [
  { id: "all", label: "All", color: "bg-slate-100 text-slate-800" },
  { id: "filed", label: "Filed", color: "bg-blue-100 text-blue-800" },
  { id: "adjuster_scheduled", label: "Adjuster Scheduled", color: "bg-indigo-100 text-indigo-800" },
  { id: "adjuster_visited", label: "Adjuster Visited", color: "bg-purple-100 text-purple-800" },
  { id: "scope_drafted", label: "Scope Drafted", color: "bg-violet-100 text-violet-800" },
  { id: "settlement_pending", label: "Settlement Pending", color: "bg-amber-100 text-amber-800" },
  { id: "settled", label: "Settled", color: "bg-emerald-100 text-emerald-800" },
  { id: "denied", label: "Denied", color: "bg-red-100 text-red-800" },
  { id: "closed", label: "Closed", color: "bg-slate-200 text-slate-700" },
];

const DAMAGE_TYPES = ["hurricane", "hail", "wind", "fire", "tree", "other"];

export default function InsuranceClaims() {
  const { tenantId, tenantConfig } = useTenant();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- queries ----
  const claimsQuery = useQuery({
    queryKey: ["insurance_claims", tenantId, statusFilter],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("insurance_claims")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("filed_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Claim[];
    },
  });

  const customersQuery = useQuery({
    queryKey: ["customers_for_claims", tenantId],
    enabled: !!tenantId && showNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone_number")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  // ---- realtime ----
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`insurance_claims:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insurance_claims", filter: `tenant_id=eq.${tenantId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["insurance_claims", tenantId] });
          qc.invalidateQueries({ queryKey: ["insurance_claim_detail"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  // ---- mutations ----
  const submitClaim = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!tenantId) throw new Error("No tenant");
      const r = await callWebhook("/roofing-insurance-claim", payload, tenantId);
      if (!r.success) throw new Error(r.error || "Webhook failed");
      return r.data;
    },
    onSuccess: () => {
      toast.success("Claim filed. Scope-of-loss letter drafting in background.");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["insurance_claims", tenantId] });
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });

  if (!tenantConfig) return null;
  const claims = claimsQuery.data ?? [];
  const selected = claims.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Insurance Claims
          </h1>
          <p className="text-sm text-muted-foreground">
            Storm-damage claims with AI-drafted scope-of-loss letters
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Claim
        </Button>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.id}
            onClick={() => setStatusFilter(c.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${c.color} ${
              statusFilter === c.id ? "ring-2 ring-offset-1 ring-primary" : "opacity-80 hover:opacity-100"
            }`}
          >
            {c.label}
            {statusFilter === c.id && claimsQuery.data ? ` (${claims.length})` : ""}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {claimsQuery.isLoading
              ? "Loading…"
              : `${claims.length} claim${claims.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
              No insurance claims yet. File your first claim — we'll draft the scope-of-loss letter automatically.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filed</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Damage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Estimate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell className="text-xs">
                      {new Date(c.filed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{c.insurance_carrier ?? "—"}</TableCell>
                    <TableCell className="capitalize">{c.damage_type ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {c.status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.scope_of_loss_letter ? (
                        <Badge className="bg-emerald-100 text-emerald-800">drafted</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {c.estimated_claim_amount != null
                        ? `$${Number(c.estimated_claim_amount).toLocaleString()}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewClaimDialog
        open={showNew}
        onOpenChange={setShowNew}
        customers={customersQuery.data ?? []}
        isSubmitting={submitClaim.isPending}
        onSubmit={(p) => submitClaim.mutate(p)}
      />

      <ClaimDetailSheet
        claim={selected}
        tenantId={tenantId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["insurance_claims", tenantId] })}
      />
    </div>
  );
}

// ============================================================
// New Claim Dialog
// ============================================================
function NewClaimDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: Customer[];
  isSubmitting: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [damageType, setDamageType] = useState("hurricane");
  const [photoUrlsText, setPhotoUrlsText] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setCustomerId("");
    setCarrier("");
    setPolicyNumber("");
    setDamageType("hurricane");
    setPhotoUrlsText("");
    setNotes("");
  };

  const submit = () => {
    const urls = photoUrlsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s));
    if (!carrier) return;
    if (urls.length === 0) return;
    props.onSubmit({
      customer_id: customerId || null,
      carrier,
      policy_number: policyNumber || null,
      damage_type: damageType,
      damage_photo_urls: urls,
      notes: notes || null,
    });
  };

  return (
    <Dialog
      open={props.open}
      onOpenChange={(v) => {
        if (!v) reset();
        props.onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File a New Insurance Claim</DialogTitle>
          <DialogDescription>
            We'll draft a scope-of-loss letter using the damage photos (takes up to 60s).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {props.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name ?? "Unnamed"} — {c.phone_number ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Damage Type</Label>
              <Select value={damageType} onValueChange={setDamageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAMAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Insurance Carrier *</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. State Farm" />
            </div>
            <div>
              <Label>Policy Number</Label>
              <Input
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <Label>Damage Photo URLs *</Label>
            <Textarea
              rows={4}
              value={photoUrlsText}
              onChange={(e) => setPhotoUrlsText(e.target.value)}
              placeholder="Paste public https:// URLs, one per line"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              At least 1 URL required. File upload coming in a later release.
            </p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={props.isSubmitting || !carrier || !photoUrlsText.trim()}
          >
            {props.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            File Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Detail Sheet
// ============================================================
function ClaimDetailSheet(props: {
  claim: Claim | null;
  tenantId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { claim, tenantId, onClose, onUpdated } = props;
  const [status, setStatus] = useState<string>(claim?.status ?? "filed");
  const [adjName, setAdjName] = useState(claim?.adjuster_name ?? "");
  const [adjEmail, setAdjEmail] = useState(claim?.adjuster_email ?? "");
  const [adjPhone, setAdjPhone] = useState(claim?.adjuster_phone ?? "");
  const [settledAmount, setSettledAmount] = useState<string>(
    claim?.approved_claim_amount != null ? String(claim.approved_claim_amount) : "",
  );

  useEffect(() => {
    if (!claim) return;
    setStatus(claim.status);
    setAdjName(claim.adjuster_name ?? "");
    setAdjEmail(claim.adjuster_email ?? "");
    setAdjPhone(claim.adjuster_phone ?? "");
    setSettledAmount(
      claim.approved_claim_amount != null ? String(claim.approved_claim_amount) : "",
    );
  }, [claim]);

  const save = async () => {
    if (!claim || !tenantId) return;
    const update: Record<string, unknown> = {
      status,
      adjuster_name: adjName || null,
      adjuster_email: adjEmail || null,
      adjuster_phone: adjPhone || null,
      approved_claim_amount: settledAmount ? Number(settledAmount) : null,
    };
    if (status === "settled" && !claim.settled_at) update.settled_at = new Date().toISOString();
    const { error } = await supabase
      .from("insurance_claims")
      .update(update)
      .eq("id", claim.id)
      .eq("tenant_id", tenantId); // double-key per governing rule
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Claim updated");
    onUpdated();
  };

  return (
    <Sheet open={!!claim} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {claim && (
          <>
            <SheetHeader>
              <SheetTitle>
                Claim {claim.claim_number ?? claim.id.slice(0, 8)} — {claim.insurance_carrier ?? "Unknown carrier"}
              </SheetTitle>
              <SheetDescription>Filed {new Date(claim.filed_at).toLocaleString()}</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-4">
              {/* Status + adjuster */}
              <section className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_CHIPS.filter((s) => s.id !== "all").map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Adjuster Name</Label>
                  <Input value={adjName} onChange={(e) => setAdjName(e.target.value)} />
                </div>
                <div>
                  <Label>Adjuster Phone</Label>
                  <Input value={adjPhone} onChange={(e) => setAdjPhone(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>Adjuster Email</Label>
                  <Input value={adjEmail} onChange={(e) => setAdjEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Estimated</Label>
                  <Input
                    readOnly
                    value={
                      claim.estimated_claim_amount != null
                        ? `$${Number(claim.estimated_claim_amount).toLocaleString()}`
                        : "—"
                    }
                  />
                </div>
                <div>
                  <Label>Settled Amount</Label>
                  <Input
                    type="number"
                    value={settledAmount}
                    onChange={(e) => setSettledAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </section>

              <Button onClick={save} className="w-full">
                Save Changes
              </Button>

              {/* Scope letter */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Scope-of-Loss Letter</Label>
                  {claim.scope_of_loss_letter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(claim.scope_of_loss_letter ?? "");
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy
                    </Button>
                  )}
                </div>
                {claim.scope_of_loss_letter ? (
                  <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap">
                    {claim.scope_of_loss_letter}
                  </pre>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Scope letter not drafted yet. Will appear when Gemini analysis completes.
                  </div>
                )}
                {claim.scope_draft_model && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Drafted by {claim.scope_draft_model}{" "}
                    {claim.scope_draft_generated_at
                      ? `on ${new Date(claim.scope_draft_generated_at).toLocaleString()}`
                      : ""}
                  </p>
                )}
              </section>

              {/* Photos */}
              <section>
                <Label>Photos ({(claim.damage_photos ?? []).length})</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(claim.damage_photos ?? []).map((p, i) => (
                    <a
                      key={i}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded border"
                    >
                      <img src={p.url} alt="" className="h-24 w-full object-cover" />
                    </a>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
