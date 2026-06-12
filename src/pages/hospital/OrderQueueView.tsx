import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Inbox, CreditCard, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { priceForMed } from "@/lib/hospital/pickLists";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import {
  useHospitalOrders, STATUS_LABEL, NEXT_STATUS, type HospitalOrderType,
} from "@/hooks/useHospitalOrders";
import { HospitalGate, EcgLine, displayName } from "./hospitalShared";
import { useHospitalT } from "./i18n";

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
  const { t, ti } = useHospitalT();
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
      toast({ title: t("pay.dispensed"), description: ti("pay.dispensedDesc", { amount: payAmount || 0, method: t(`method.${payMethod}`), status: t(`pstatus.${payStatus}`) }) });
      setPayFor(null);
    } catch (e: any) {
      toast({ title: t("pay.dispenseFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    (patients as any[]).forEach((p) => { m[p.id] = displayName(p.full_name); });
    return m;
  }, [patients]);

  // [ZATEOS C1] the SIGNED-Rx instruction detail per patient (dose - frequency - duration) --
  // joined read-only onto the med order lines so the pharmacist sees how/when/for-how-long.
  const { tenantId } = useTenant();
  const { data: rxByPatient } = useQuery({
    queryKey: ["hx-queue-rxmap", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("hospital_prescriptions" as any)
        .select("patient_id,items,status,signed_at").eq("tenant_id", tenantId).eq("status", "signed")
        .order("signed_at", { ascending: false });
      const m = new Map<string, any[]>();
      ((data as any[]) || []).forEach((r) => { if (!m.has(r.patient_id)) m.set(r.patient_id, r.items || []); });
      return m;
    },
    enabled: !!tenantId && type === "medication",
  });
  const rxDetail = (o: any): string | null => {
    const items = rxByPatient?.get(o.patient_id);
    const label = String((o.details as any)?.item || "").toLowerCase();
    const hit = (items || []).find((it: any) => it.name && label.includes(String(it.name).toLowerCase().split(" ")[0]));
    if (!hit) return null;
    return [hit.dose, hit.frequency, hit.duration, hit.route].filter(Boolean).join(" · ");
  };
  // static in-code availability vs the Brief-8 pick-list (unavailable = amber, still POS-billable)
  const isAvailable = (o: any) => type !== "medication" || priceForMed(String((o.details as any)?.item || "")) != null;

  const pending = orders.filter((o) => PENDING.includes(o.status));
  const fulfilled = orders.filter((o) => FULFILLED.includes(o.status));
  // [ZATEOS C1] pending GROUPED BY PATIENT, collapsed by default -- one expanded at a time
  const [openPatient, setOpenPatient] = useState<string | null>(null);
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    pending.forEach((o) => { const k = o.patient_id || "walkin"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(o); });
    return Array.from(m.entries()).map(([pid, os]) => ({ pid, os }));
  }, [pending]);

  const Row = ({ o, done }: { o: any; done: boolean }) => (
    <li className="flex items-center gap-3 py-2.5 border-t" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-queue-row">
      <span className={`hx-chip ${done ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.1rem 0.5rem" }}>
        {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{t(`ostatus.${o.status}`, STATUS_LABEL[o.status])}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{(o.details as any)?.item || "—"}{done ? " ×1" : ""}</div>
        <div className="hx-faint text-xs truncate">
          {done && rxDetail(o) ? `${rxDetail(o)} — ` : ""}{nameById[o.patient_id] || t("queue.unknownPatient")} · {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
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
          <span className="hx-chip hx-chip--warn ml-auto" data-testid="hx-queue-pending-count">{ti("queue.pendingCount", { n: pending.length })}</span>
          <span className="hx-chip hx-chip--ok">{ti("queue.doneCount", { n: fulfilled.length })}</span>
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
                    <option value="">{t("queue.pharmacistOnDuty")}</option>
                    {pharmacists.map((s) => <option key={s.id} value={s.id}>{s.name}{s.job_title ? ` · ${s.job_title}` : ""}</option>)}
                  </select>
                )}
                <span className="hx-chip hx-chip--warn" data-testid="hx-queue-pending-count">{ti("queue.pendingCount", { n: pending.length })}</span>
                <span className="hx-chip hx-chip--ok">{ti("queue.doneCount", { n: fulfilled.length })}</span>
              </div>
            </div>
            <EcgLine className="mt-3" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="hx-panel hx-rise" style={{ animationDelay: "80ms" }}>
          <div className="hx-panel-h"><Clock className="h-4 w-4" style={{ color: "var(--hx-warn)" }} /><span className="font-semibold">{t("queue.pending")}</span></div>
          <div className="hx-panel-b">
            {pending.length === 0 ? (
              <div className="text-center py-8 hx-faint"><Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" /><p className="text-sm">{t("queue.clear")}</p></div>
            ) : (
              <div className="space-y-2" data-testid="hx-queue-groups">
                {groups.map(({ pid, os }) => {
                  const open = openPatient === pid;
                  const avail = os.filter(isAvailable).length;
                  return (
                    <div key={pid}>
                      <button type="button" className="hx-stage-row" onClick={() => setOpenPatient(open ? null : pid)}
                        data-testid="hx-queue-patient-row" data-expanded={open ? "1" : "0"}>
                        <span className="font-semibold">{nameById[pid] || t("queue.unknownPatient")}</span>
                        <span className="hx-chip text-xs">{ti("queue.pendingCount", { n: os.length })}</span>
                        {type === "medication" && avail < os.length && (
                          <span className="hx-chip hx-chip--warn text-xs">{ti("queue.unavailableN", { n: os.length - avail })}</span>
                        )}
                        {open ? <ChevronUp className="h-4 w-4 ml-auto hx-dim" /> : <ChevronDown className="h-4 w-4 ml-auto hx-dim" />}
                      </button>
                      {open && (
                        <ul className="mt-1 ml-2" data-testid="hx-queue-group-items">
                          {os.map((o) => (
                            <li key={o.id} className="flex items-center gap-3 py-2.5 border-t" style={{ borderColor: "var(--hx-border)" }} data-testid="hx-queue-row">
                              <span className={`hx-chip ${isAvailable(o) ? "hx-chip--ok" : "hx-chip--warn"}`} style={{ padding: "0.1rem 0.5rem" }}>
                                {isAvailable(o) ? t("queue.available", "Available") : t("queue.unavailable", "Unavailable")}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{(o.details as any)?.item || "—"}</div>
                                <div className="hx-faint text-xs truncate" data-testid="hx-queue-rxdetail">
                                  {rxDetail(o) || t(`ostatus.${o.status}`, STATUS_LABEL[o.status])} · {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                {!isAvailable(o) && <div className="hx-faint text-xs">{t("queue.unavailableNote", "Out of stock here — billable in POS so the patient knows")}</div>}
                              </div>
                              {NEXT_STATUS[type] && (
                                <button className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.7rem" }}
                                  onClick={() => (type === "medication" ? openPay(o) : updateOrderStatus.mutate({ id: o.id, status: NEXT_STATUS[type]! }))} data-testid="hx-queue-action">
                                  {actionLabel}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="hx-panel hx-rise" style={{ animationDelay: "140ms" }}>
          <div className="hx-panel-h"><CheckCircle2 className="h-4 w-4" style={{ color: "var(--hx-ok)" }} /><span className="font-semibold">{t("queue.completed")}</span></div>
          <div className="hx-panel-b">
            {fulfilled.length === 0 ? <p className="hx-faint text-sm py-4">{t("queue.nothingDone")}</p>
              : <ul>{fulfilled.map((o) => <Row key={o.id} o={o} done />)}</ul>}
          </div>
        </div>
      </div>

      {/* Pharmacy payment-at-dispense [FIX3] — records amount/method/status, never blocks dispensing */}
      <Dialog open={!!payFor} onOpenChange={(v) => { if (!v) setPayFor(null); }}>
        <DialogContent className="hx-dialog max-w-md border p-0" style={{ background: "var(--hx-dialog-bg)", borderColor: "var(--hx-dialog-border)", color: "var(--hx-text)" }}>
          <DialogTitle className="sr-only">{t("pay.title")}</DialogTitle>
          <div className="hx" style={{ margin: 0, minHeight: 0, padding: "1.3rem 1.4rem 1.5rem", background: "transparent" }} data-testid="hx-pharmacy-pay-dialog">
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="h-5 w-5" style={{ color: "var(--hx-accent)" }} />
              <div>
                <div className="hx-eyebrow">{t("pay.eyebrow")}</div>
                <div className="hx-h1" style={{ fontSize: "1.15rem" }}>{t("pay.title")}</div>
              </div>
            </div>
            <p className="hx-dim text-sm mb-4">{ti("pay.note", { item: (payFor?.details as any)?.item || t("pay.medication") })}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="hx-label">{t("pay.amount")}</label>
                <div className="flex items-center gap-1.5">
                  <span className="hx-faint text-sm">BDT</span>
                  <input type="number" className="hx-input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" data-testid="hx-pay-amount" />
                </div></div>
              <div><label className="hx-label">{t("pay.method")}</label>
                <select className="hx-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} data-testid="hx-pay-method">
                  <option value="cash">{t("method.cash")}</option><option value="card">{t("method.card")}</option><option value="bank_transfer">{t("method.bank_transfer")}</option>
                  <option value="insurance">{t("method.insurance")}</option><option value="waived">{t("method.waived")}</option></select></div>
              <div><label className="hx-label">{t("pay.status")}</label>
                <select className="hx-select" value={payStatus} onChange={(e) => setPayStatus(e.target.value)} data-testid="hx-pay-status">
                  <option value="paid">{t("pstatus.paid")}</option><option value="pending">{t("pstatus.pending")}</option><option value="partial">{t("pstatus.partial")}</option><option value="waived">{t("pstatus.waived")}</option></select></div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" className="hx-btn hx-btn--ghost" onClick={() => setPayFor(null)}>{t("common.cancel")}</button>
              <button type="button" className="hx-btn hx-btn--primary" onClick={confirmPay} disabled={updateOrderStatus.isPending} data-testid="hx-pay-confirm">
                {updateOrderStatus.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("pay.dispensing")}</> : <><CheckCircle2 className="h-4 w-4" /> {t("pay.confirm")}</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrderQueueView(props: Props) {
  return <HospitalGate allow={["doctor", "admin"]}><OrderQueueInner {...props} /></HospitalGate>;
}
