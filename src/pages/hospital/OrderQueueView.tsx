import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Inbox, CreditCard, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import {
  useHospitalOrders, STATUS_LABEL, NEXT_STATUS, type HospitalOrderType,
} from "@/hooks/useHospitalOrders";
import { HospitalGate, EcgLine } from "./hospitalShared";

const PENDING = ["ordered", "routed", "in_progress"];
const FULFILLED = ["resulted", "dispensed", "reviewed"];

interface Props {
  type: HospitalOrderType;
  title: string;
  eyebrow: string;
  icon: any;
  actionLabel: string; // e.g. "Dispense" / "Mark resulted"
  embedded?: boolean;  // hide the big hero header when embedded under another page (e.g. Laboratory)
}

export function OrderQueueInner({ type, title, eyebrow, icon: Icon, actionLabel, embedded }: Props) {
  const { orders, updateOrderStatus } = useHospitalOrders({ orderType: type });
  const { patients } = useClinicPatients();
  const { pharmacists } = useHospitalStaff();
  const { toast } = useToast();
  const [pharmacistId, setPharmacistId] = useState("");
  // pharmacy payment-at-dispense [FIX3] — optional record; never blocks dispensing
  const [payFor, setPayFor] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payStatus, setPayStatus] = useState("paid");
  const openPay = (o: any) => { setPayFor(o); setPayAmount(""); setPayMethod("cash"); setPayStatus("paid"); };
  async function confirmPay() {
    if (!payFor) return;
    try {
      await updateOrderStatus.mutateAsync({
        id: payFor.id, status: NEXT_STATUS.medication!,
        payment: { amount: payAmount.trim() === "" ? null : Number(payAmount), currency: "BDT", method: payMethod, status: payStatus },
      });
      toast({ title: "Dispensed", description: `Payment: BDT ${payAmount || 0} · ${payMethod} · ${payStatus}` });
      setPayFor(null);
    } catch (e: any) {
      toast({ title: "Could not dispense", description: e?.message || "Try again.", variant: "destructive" });
    }
  }
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    (patients as any[]).forEach((p) => { m[p.id] = p.full_name; });
    return m;
  }, [patients]);

  const pending = orders.filter((o) => PENDING.includes(o.status));
  const fulfilled = orders.filter((o) => FULFILLED.includes(o.status));

  const Row = ({ o, done }: { o: any; done: boolean }) => (
    <li className="flex items-center gap-3 py-2.5 border-t" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-queue-row">
      <span className={`hx-chip ${done ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.1rem 0.5rem" }}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{STATUS_LABEL[o.status]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{(o.details as any)?.item || "—"}</div>
        <div className="hx-faint text-xs truncate">{nameById[o.patient_id] || "Unknown patient"} · {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      {!done && NEXT_STATUS[type] && (
        <button className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.7rem" }}
          onClick={() => (type === "medication" ? openPay(o) : updateOrderStatus.mutate({ id: o.id, status: NEXT_STATUS[type]! }))} data-testid="hx-queue-action">
          {actionLabel}
        </button>
      )}
    </li>
  );

  return (
    <div data-testid={`hx-queue-page-${type}`}>
      {embedded ? (
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
          <span className="font-semibold">{title}</span>
          <span className="hx-chip hx-chip--warn ml-auto" data-testid="hx-queue-pending-count">{pending.length} pending</span>
          <span className="hx-chip hx-chip--ok">{fulfilled.length} done</span>
        </div>
      ) : (
        <div className="hx-panel hx-panel--accent hx-rise">
          <div className="hx-panel-b">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6" style={{ color: "var(--hx-accent)" }} />
              <div>
                <div className="hx-eyebrow">{eyebrow}</div>
                <h1 className="hx-h1">{title}</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {type === "medication" && (
                  <select className="hx-select" style={{ width: "auto", minWidth: 170 }} value={pharmacistId} onChange={(e) => setPharmacistId(e.target.value)} data-testid="hx-pharmacist-select">
                    <option value="">Pharmacist on duty…</option>
                    {pharmacists.map((s) => <option key={s.id} value={s.id}>{s.name}{s.job_title ? ` · ${s.job_title}` : ""}</option>)}
                  </select>
                )}
                <span className="hx-chip hx-chip--warn" data-testid="hx-queue-pending-count">{pending.length} pending</span>
                <span className="hx-chip hx-chip--ok">{fulfilled.length} done</span>
              </div>
            </div>
            <EcgLine className="mt-3" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="hx-panel hx-rise" style={{ animationDelay: "80ms" }}>
          <div className="hx-panel-h"><Clock className="h-4 w-4" style={{ color: "var(--hx-warn)" }} /><span className="font-semibold">Worklist · Pending</span></div>
          <div className="hx-panel-b">
            {pending.length === 0 ? (
              <div className="text-center py-8 hx-faint"><Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" /><p className="text-sm">Queue clear — no pending orders.</p></div>
            ) : <ul>{pending.map((o) => <Row key={o.id} o={o} done={false} />)}</ul>}
          </div>
        </div>
        <div className="hx-panel hx-rise" style={{ animationDelay: "140ms" }}>
          <div className="hx-panel-h"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--hx-ok)" }} /><span className="font-semibold">Completed today</span></div>
          <div className="hx-panel-b">
            {fulfilled.length === 0 ? <p className="hx-faint text-sm py-4">Nothing completed yet.</p>
              : <ul>{fulfilled.map((o) => <Row key={o.id} o={o} done />)}</ul>}
          </div>
        </div>
      </div>

      {/* Pharmacy payment-at-dispense [FIX3] — records amount/method/status, never blocks dispensing */}
      <Dialog open={!!payFor} onOpenChange={(v) => { if (!v) setPayFor(null); }}>
        <DialogContent className="hx-dialog max-w-md border p-0" style={{ background: "var(--hx-dialog-bg)", borderColor: "var(--hx-dialog-border)", color: "var(--hx-text)" }}>
          <DialogTitle className="sr-only">Pharmacy payment</DialogTitle>
          <div className="hx" style={{ margin: 0, minHeight: 0, padding: "1.3rem 1.4rem 1.5rem", background: "transparent" }} data-testid="hx-pharmacy-pay-dialog">
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="h-5 w-5" style={{ color: "var(--hx-accent)" }} />
              <div>
                <div className="hx-eyebrow">Pharmacy · Dispense</div>
                <div className="hx-h1" style={{ fontSize: "1.15rem" }}>Collect payment</div>
              </div>
            </div>
            <p className="hx-dim text-sm mb-4"><strong style={{ color: "var(--hx-strong)" }}>{(payFor?.details as any)?.item || "Medication"}</strong> — record the payment, then dispense. Payment is optional and never blocks dispensing.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="hx-label">Amount</label>
                <div className="flex items-center gap-1.5">
                  <span className="hx-faint text-sm">BDT</span>
                  <input type="number" className="hx-input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" data-testid="hx-pay-amount" />
                </div></div>
              <div><label className="hx-label">Method</label>
                <select className="hx-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} data-testid="hx-pay-method">
                  <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option>
                  <option value="insurance">Insurance</option><option value="waived">Waived</option></select></div>
              <div><label className="hx-label">Status</label>
                <select className="hx-select" value={payStatus} onChange={(e) => setPayStatus(e.target.value)} data-testid="hx-pay-status">
                  <option value="paid">Paid</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="waived">Waived</option></select></div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" className="hx-btn hx-btn--ghost" onClick={() => setPayFor(null)}>Cancel</button>
              <button type="button" className="hx-btn hx-btn--primary" onClick={confirmPay} disabled={updateOrderStatus.isPending} data-testid="hx-pay-confirm">
                {updateOrderStatus.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Dispensing…</> : <><CheckCircle2 className="h-4 w-4" /> Dispense &amp; record</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrderQueueView(props: Props) {
  return <HospitalGate><OrderQueueInner {...props} /></HospitalGate>;
}
