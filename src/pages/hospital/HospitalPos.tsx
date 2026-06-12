// HOSPITAL-POS [Brief 11 · A] — the THIN POS: one receipt, one total, one paper. Deliberately NOT
// a billing engine (no discounts/refunds/cancels/tariffs/VAT). One NEW additive table
// `hospital_pos_sales` (5-policy RLS). Two contexts:
//   • PHARMACY — a POS section under the dispense queue: pick a patient → their medication orders
//     load as lines with PREFILLED prices from the static in-code list (free-text items = manual
//     price; every price stays editable); walk-in = no patient, free entry. Dispensing behaviour
//     itself is untouched (the FIX3 payment-at-dispense dialog stays as-is).
//   • DISCHARGE — after a SIGNED discharge: bed-days (LOS × static ward rate) + the discharge meds
//     + manual lines. Strictly post-sign; the sign flow is untouched.
// Receipt prints via the body-attr multiplexed pattern (`hx-pos-print` — the 5th discriminator).
import { useEffect, useMemo, useState } from "react";
import { Receipt, Plus, Printer, Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useHospitalOrders } from "@/hooks/useHospitalOrders";
import { priceForMed, WARD_DAILY_RATES, DEFAULT_WARD_RATE } from "@/lib/hospital/pickLists";
import { hxPrintCss, printHxBlock } from "./hospitalShared";
import { SendDocControl } from "./SendDoc";
import { useHospitalT } from "./i18n";
import type { DischargeRow } from "@/hooks/useHospitalDischarge";

export interface PosLine { label: string; qty: number; unit_price: number }
const lineTotal = (l: PosLine) => Math.max(0, (Number(l.qty) || 0) * (Number(l.unit_price) || 0));
const sum = (ls: PosLine[]) => ls.reduce((n, l) => n + lineTotal(l), 0);
const fmtBDT = (n: number) => `৳ ${n.toLocaleString("en-US")}`;

export interface SaleRow {
  id: string; patient_id: string | null; context: "pharmacy" | "discharge";
  items: (PosLine & { line_total: number })[]; total: number; paid_method: string; billed_at: string;
}

function useRecordSale() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { patientId: string | null; context: "pharmacy" | "discharge"; lines: PosLine[]; paidMethod: "cash" | "other" }) => {
      const items = p.lines.filter((l) => l.label.trim()).map((l) => ({ ...l, line_total: lineTotal(l) }));
      if (items.length === 0) throw new Error("No items");
      const { data, error } = await supabase.from("hospital_pos_sales" as any).insert({
        tenant_id: tenantId, patient_id: p.patientId, context: p.context,
        items, total: sum(items), paid_method: p.paidMethod,
        billed_by: authUser?.id ?? null, billed_at: new Date().toISOString(),
      } as any).select().single();
      if (error) throw error;
      return (data as any) as SaleRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hx-pos-sales"] }),
  });
}

/** [Brief 11 · C] compact receipt text for the delivery webhook. */
function composeReceiptText(sale: SaleRow, patientName: string | null): string {
  const L = [
    `Bangladesh Specialized Hospital — receipt (${sale.context})`,
    `${patientName || "Walk-in"} · ${new Date(sale.billed_at).toLocaleString()}`,
    "",
    ...sale.items.map((l) => `${l.label} × ${l.qty} @ ${l.unit_price} = ${l.line_total}`),
    "",
    `TOTAL: BDT ${sale.total} (${sale.paid_method})`,
  ];
  return L.join("\n").slice(0, 3400);
}

/** The shared line editor + total + record/print controls. */
function PosEditor({ lines, setLines, context, patientId, patientName, patientPhone, patientEmail, onRecorded, testid }: {
  lines: PosLine[]; setLines: (f: (p: PosLine[]) => PosLine[]) => void;
  context: "pharmacy" | "discharge"; patientId: string | null; patientName: string | null;
  patientPhone?: string | null; patientEmail?: string | null;
  onRecorded?: (s: SaleRow) => void; testid: string;
}) {
  const { t } = useHospitalT();
  const { toast } = useToast();
  const record = useRecordSale();
  const [method, setMethod] = useState<"cash" | "other">("cash");
  const [sale, setSale] = useState<SaleRow | null>(null);
  useEffect(() => { setSale(null); }, [patientId, context]);
  const total = sum(lines);

  async function onRecord() {
    try {
      const s = await record.mutateAsync({ patientId, context, lines, paidMethod: method });
      setSale(s);
      onRecorded?.(s);
      toast({ title: t("pos.recorded"), description: fmtBDT(s.total) });
    } catch (e: any) {
      toast({ title: t("pos.recordFail"), description: e?.message || t("common.tryAgain"), variant: "destructive" });
    }
  }

  return (
    <div data-testid={testid}>
      <div className="space-y-1.5">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center" data-testid={`${testid}-line`}>
            <input className="hx-input col-span-6" value={l.label} placeholder={t("pos.itemPh")}
              onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} data-testid={`${testid}-label`} />
            <input type="number" min="0" className="hx-input col-span-2" value={l.qty}
              onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} data-testid={`${testid}-qty`} />
            <input type="number" min="0" className="hx-input col-span-2" value={l.unit_price}
              onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, unit_price: Number(e.target.value) } : x)))} data-testid={`${testid}-price`} />
            <div className="col-span-2 flex items-center gap-1">
              <span className="hx-mono text-sm flex-1 text-right" data-testid={`${testid}-linetotal`}>{fmtBDT(lineTotal(l))}</span>
              <button type="button" className="hx-faint" style={{ opacity: 0.7 }} onClick={() => setLines((p) => p.filter((_, j) => j !== i))} aria-label="remove line">×</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.3rem 0.65rem" }}
          onClick={() => setLines((p) => [...p, { label: "", qty: 1, unit_price: 0 }])} data-testid={`${testid}-add`}>
          <Plus className="h-3.5 w-3.5" /> {t("pos.addLine")}
        </button>
        <span className="ml-auto hx-label" style={{ margin: 0 }}>{t("pos.total")}</span>
        <span className="hx-mono font-semibold" style={{ fontSize: "1.05rem", color: "var(--hx-strong)" }} data-testid={`${testid}-total`}>{fmtBDT(total)}</span>
        <select className="hx-select" style={{ width: "auto" }} value={method} onChange={(e) => setMethod(e.target.value as any)} data-testid={`${testid}-method`}>
          <option value="cash">{t("method.cash")}</option>
          <option value="other">{t("pos.methodOther")}</option>
        </select>
        <button type="button" className="hx-btn hx-btn--primary" style={{ padding: "0.35rem 0.8rem" }}
          onClick={onRecord} disabled={record.isPending || total <= 0} data-testid={`${testid}-record`}>
          {record.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {t("pos.record")}
        </button>
        {sale && (
          <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.8rem" }}
            onClick={() => printHxBlock("hx-pos-print")} data-testid={`${testid}-print`}>
            <Printer className="h-4 w-4" /> {t("pos.printReceipt")}
          </button>
        )}
        {sale && (
          <SendDocControl testid={`${testid}-senddoc`}
            defaultPhone={patientPhone} defaultEmail={patientEmail}
            subject="Bangladesh Specialized Hospital — your receipt"
            composeText={() => composeReceiptText(sale, patientName)} />
        )}
      </div>
      {sale && <span className="hx-chip hx-chip--ok mt-2" style={{ display: "inline-flex" }} data-testid={`${testid}-recorded-chip`}><CheckCircle2 className="h-3 w-3" /> {t("pos.recordedChip")} · {fmtBDT(sale.total)}</span>}
      {sale && <ReceiptPaper sale={sale} patientName={patientName} />}
    </div>
  );
}

/** The printable receipt — `hx-pos-print` (multiplexed; invisible on screen except in print). */
function ReceiptPaper({ sale, patientName }: { sale: SaleRow; patientName: string | null }) {
  const { t } = useHospitalT();
  const { tenantConfig } = useTenant();
  const { authUser } = useAuth();
  return (
    <>
      <style>{hxPrintCss("hx-pos-print")}</style>
      <div id="hx-pos-print" style={{ position: "absolute", left: -10000, top: 0, width: 420, background: "#fff", color: "#111", padding: 24, fontFamily: "ui-sans-serif, system-ui" }} aria-hidden="true" data-testid="hx-pos-paper">
        <div style={{ textAlign: "center", borderBottom: "1px solid #ccc", paddingBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{(tenantConfig as any)?.company_name || "Hospital"}</div>
          <div style={{ fontSize: 11, color: "#555" }}>{t(`pos.ctx.${sale.context}`)} · {t("pos.receipt")}</div>
        </div>
        <div style={{ fontSize: 12, margin: "10px 0", display: "flex", justifyContent: "space-between" }}>
          <span>{patientName || t("pos.walkIn")}</span>
          <span>{new Date(sale.billed_at).toLocaleString()}</span>
        </div>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
            <th style={{ padding: "4px 0" }}>{t("pos.item")}</th><th>{t("pos.qty")}</th><th style={{ textAlign: "right" }}>{t("pos.price")}</th><th style={{ textAlign: "right" }}>{t("pos.amount")}</th>
          </tr></thead>
          <tbody>
            {sale.items.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px dashed #eee" }}>
                <td style={{ padding: "4px 0", maxWidth: 180 }}>{l.label}</td><td>{l.qty}</td>
                <td style={{ textAlign: "right" }}>{l.unit_price}</td><td style={{ textAlign: "right" }}>{l.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontWeight: 700, fontSize: 14 }}>
          <span>{t("pos.total")}</span><span>{fmtBDT(sale.total)}</span>
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
          {t("pay.method")}: {sale.paid_method === "cash" ? t("method.cash") : t("pos.methodOther")} · {t("pos.billedBy")}: {authUser?.full_name || authUser?.email || "—"}
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#888", marginTop: 14 }}>{t("pos.footer")}</div>
      </div>
    </>
  );
}

/** PHARMACY POS — mounts under the dispense queue (one gate; the queue behaviour untouched). */
export function PharmacyPos() {
  const { t } = useHospitalT();
  const { patients } = useClinicPatients();
  const { orders } = useHospitalOrders({ orderType: "medication" });
  const [patientId, setPatientId] = useState<string>("");   // "" = walk-in
  const [lines, setLines] = useState<PosLine[]>([]);
  const patient = useMemo(() => (patients as any[]).find((p) => p.id === patientId) ?? null, [patients, patientId]);
  const patientName = patient?.full_name ?? null;

  // patient picked → their dispensable/dispensed med orders become lines with prefilled prices
  useEffect(() => {
    if (!patientId) { setLines([]); return; }
    const theirs = orders.filter((o) => o.patient_id === patientId && o.status !== "cancelled");
    setLines(theirs.map((o) => {
      const label = ((o.details as any)?.item as string) || "—";
      return { label, qty: 1, unit_price: priceForMed(label) ?? 0 };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  return (
    <div className="hx-panel hx-rise mt-4" style={{ animationDelay: "200ms" }} data-testid="hx-pos-pharmacy">
      <div className="hx-panel-h">
        <Receipt className="h-4 w-4" style={{ color: "var(--hx-accent)" }} />
        <span className="font-semibold">{t("pos.pharmacyTitle")}</span>
        <span className="hx-faint text-xs">{t("pos.thinNote")}</span>
        <select className="hx-select ml-auto" style={{ width: "auto", minWidth: 190 }} value={patientId}
          onChange={(e) => setPatientId(e.target.value)} data-testid="hx-pos-patient">
          <option value="">{t("pos.walkIn")}</option>
          {(patients as any[]).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="hx-panel-b">
        {lines.length === 0 && !patientId && <p className="hx-faint text-xs mb-2">{t("pos.walkInHint")}</p>}
        <PosEditor lines={lines} setLines={setLines} context="pharmacy" patientId={patientId || null}
          patientName={patientName} patientPhone={patient?.phone ?? null} patientEmail={patient?.email ?? null} testid="hx-pos" />
      </div>
    </div>
  );
}

/** DISCHARGE BILL — strictly post-sign; pre-loads bed-days + the signed-Rx discharge meds. */
export function DischargeBill({ patient, discharge }: { patient: any; discharge: DischargeRow }) {
  const { t, ti } = useHospitalT();
  const { tenantId } = useTenant();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<PosLine[] | null>(null);

  // LOS + ward type for the bed-days line (read-only context; latest assignment of the admission)
  const { data: bedCtx } = useQuery({
    queryKey: ["hx-pos-bedctx", tenantId, discharge.admission_id],
    queryFn: async () => {
      const { data: adm } = await supabase.from("hospital_admissions" as any)
        .select("created_at").eq("id", discharge.admission_id).maybeSingle();
      const { data: asg } = await supabase.from("hospital_bed_assignments" as any)
        .select("bed_id, assigned_at").eq("tenant_id", tenantId).eq("admission_id", discharge.admission_id)
        .order("assigned_at", { ascending: false }).limit(1);
      const bedId = (asg as any[])?.[0]?.bed_id;
      let bedType = "general"; let ward = "";
      if (bedId) {
        const { data: bed } = await supabase.from("hospital_beds" as any).select("ward,bed_type").eq("id", bedId).maybeSingle();
        bedType = (bed as any)?.bed_type || "general"; ward = (bed as any)?.ward || "";
      }
      return { admittedAt: (adm as any)?.created_at as string | undefined, bedType, ward };
    },
    enabled: !!tenantId && !!discharge.admission_id && open,
  });

  // pre-load once the context resolves (bed-days math + the signed-Rx meds; everything editable)
  useEffect(() => {
    if (!open || lines !== null || !bedCtx) return;
    const from = bedCtx.admittedAt ? +new Date(bedCtx.admittedAt) : NaN;
    const to = discharge.signed_at ? +new Date(discharge.signed_at) : Date.now();
    const days = isNaN(from) ? 1 : Math.max(1, Math.ceil((to - from) / 86_400_000));
    const rate = WARD_DAILY_RATES[bedCtx.bedType] ?? DEFAULT_WARD_RATE;
    const preset: PosLine[] = [
      { label: ti("pos.bedDays", { ward: bedCtx.ward || bedCtx.bedType, type: bedCtx.bedType, n: days }), qty: days, unit_price: rate },
      ...(discharge.discharge_meds || []).map((m) => ({
        label: `${m.name}${m.dose ? ` ${m.dose}` : ""}`, qty: 1,
        unit_price: priceForMed(`${m.name} ${m.dose || ""}`) ?? 0,
      })),
    ];
    setLines(preset);
  }, [open, bedCtx, lines, discharge, ti]);

  if (discharge.status !== "signed") return null;
  return (
    <div className="mt-2" data-testid="hx-discharge-bill">
      {!open ? (
        <button type="button" className="hx-btn hx-btn--ghost" style={{ padding: "0.35rem 0.8rem" }}
          onClick={() => setOpen(true)} data-testid="hx-discharge-bill-open">
          <Receipt className="h-4 w-4" /> {t("pos.billBtn")}
        </button>
      ) : (
        <div className="hx-intake">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-3.5 w-3.5" style={{ color: "var(--hx-accent)" }} />
            <span className="hx-label" style={{ margin: 0 }}>{t("pos.dischargeTitle")}</span>
            <span className="hx-faint text-xs">{t("pos.thinNote")}</span>
          </div>
          {lines === null ? <p className="hx-dim text-sm">{t("common.loading")}</p> : (
            <PosEditor lines={lines} setLines={(f) => setLines((p) => f(p || []))} context="discharge"
              patientId={patient?.id ?? null} patientName={patient?.full_name ?? null}
              patientPhone={patient?.phone ?? null} patientEmail={patient?.email ?? null} testid="hx-dpos" />
          )}
        </div>
      )}
    </div>
  );
}
