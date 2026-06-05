/**
 * Custom Orders (Project JX, Phase 7). Bespoke spec + FIX-RATE lock ("Gold Rate
 * Protection") + advance + status pipeline. Estimates via calc.ts at fixed_rate (when
 * locked) else the live jx_gold_rate. Records jx_order/jx_order_item via jx_create_order.
 * SCOPE: NO final sale, NO gold ledger, NO vouchers (Phase 8). Notifications PREPARED
 * (displayed) only — Phase 13 sends.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ClipboardList, Lock, Bell } from "lucide-react";
import { useGoldRates, useJewelrySetting, JX_KARATS } from "@/hooks/useJewelry";
import { useJewelryCustomers, useJewelryTaxRules } from "@/hooks/useJewelrySales";
import { useJewelryOrders, ORDER_STATUSES, orderStatusMessage, type JxOrder, type JxOrderItem, type OrderStatus } from "@/hooks/useJewelryOrders";
import { saleLineTotal, saleTotal, pureWeight, goldLedgerFineGrams, round2, round3, type TaxBasis } from "@/lib/jewelry/calc";

const GOLD = "#C9A227";
const METALS = ["Gold", "Diamond", "Silver", "Platinum", "Palladium"];
const n = (v: any): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };
const emptyLine = () => ({ metal: "Gold", karat: "22", net: "", waste: "", makingType: "per_gram", makingValue: "", stoneValue: "", note: "" });

export default function Orders() {
  const { toast } = useToast();
  const { latestByKarat } = useGoldRates();
  const { currency } = useJewelrySetting();
  const { customers, createCustomer } = useJewelryCustomers();
  const { taxRules } = useJewelryTaxRules();
  const { orders, isLoading, createOrder, updateStatus, fetchOrderItems, finalizeOrder } = useJewelryOrders();

  const [customerId, setCustomerId] = useState("");
  const [quickName, setQuickName] = useState(""); const [quickPhone, setQuickPhone] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [fix, setFix] = useState(false);
  const [fixedRate, setFixedRate] = useState<number | null>(null);
  const [fixedAt, setFixedAt] = useState<string | null>(null);
  const defRule = taxRules[0];
  const [taxBasis, setTaxBasis] = useState<TaxBasis | "none">((defRule?.basis as TaxBasis) || "none");
  const [taxRate, setTaxRate] = useState(defRule ? String(defRule.rate) : "");
  const [discount, setDiscount] = useState("");
  const [adv, setAdv] = useState({ cash: "", card: "", cheque: "" });
  const [delivery, setDelivery] = useState("");
  const [sel, setSel] = useState<JxOrder | null>(null);
  const [selItems, setSelItems] = useState<JxOrderItem[]>([]);
  // Phase 8b — finalize (deliver & invoice)
  const [finOpen, setFinOpen] = useState(false);
  const [finW, setFinW] = useState<Record<string, string>>({});
  const [finT, setFinT] = useState({ cash: "", card: "", cheque: "" });
  const [finInvoice, setFinInvoice] = useState<any>(null);

  const money = (v: number) => `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const liveRate = (k: number) => n(latestByKarat[k]?.rate_per_gram);
  const effRate = (k: number) => (fix && fixedRate != null ? fixedRate : liveRate(k));

  const setLine = (i: number, k: string, v: string) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines((ls) => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);

  const toggleFix = (on: boolean) => {
    setFix(on);
    if (on) { const r = liveRate(n(lines[0]?.karat) || 22); setFixedRate(r || null); setFixedAt(new Date().toISOString()); }
    else { setFixedRate(null); setFixedAt(null); }
  };

  const lineCalc = (l: ReturnType<typeof emptyLine>) => saleLineTotal({
    netGrams: n(l.net), karat: n(l.karat), wastePct: n(l.waste), ratePerGram: effRate(n(l.karat)),
    making: { type: l.makingType as "per_gram" | "fixed", value: n(l.makingValue) },
    polish: { type: "fixed", value: 0 }, stones: [{ price: n(l.stoneValue) }],
  });
  const lineResults = lines.map(lineCalc);
  const taxRule = { basis: (taxBasis === "none" ? "value" : taxBasis) as TaxBasis, rate: taxBasis === "none" ? 0 : n(taxRate) };
  const totals = saleTotal({ lines: lineResults, taxRule, discount: n(discount), oldGold: undefined, tender: { cash: 0, card: 0, cheque: 0, usedGoldValue: 0 } });
  const advanceAmount = round2(n(adv.cash) + n(adv.card) + n(adv.cheque));
  const balance = round2(totals.netBill - advanceAmount);

  const save = async () => {
    if (!lines.some((l) => n(l.net) > 0)) { toast({ title: "Add a line", description: "At least one item spec with a net weight.", variant: "destructive" }); return; }
    try {
      let custId = customerId;
      if (!custId && quickName.trim()) { const c = await createCustomer.mutateAsync({ name: quickName.trim(), phone: quickPhone.trim() || undefined }); custId = c.id; }
      const payloadLines = lines.map((l, i) => {
        const lc = lineResults[i];
        return {
          tag_number: `${l.metal} ${l.karat}K${l.note ? " " + l.note : ""}`, karat: n(l.karat), net_weight: n(l.net),
          waste_pct: n(l.waste), total_weight: round3(n(l.net) + lc.wastageGrams), making: lc.making, polish: lc.polish,
          stone_value: lc.stoneValue, line_total: lc.lineSubtotal, workshop_status: "pending",
        };
      });
      const order = {
        customer_id: custId || null, order_date: new Date().toISOString(), delivery_date: delivery || null,
        is_fix_rate: fix, fixed_rate: fix ? fixedRate : null, advance_amount: advanceAmount,
        advance_tender: { cash: n(adv.cash), card: n(adv.card), cheque: n(adv.cheque) },
        discount: n(discount), net_amount: totals.netBill, balance, status: "booked",
      };
      const res = await createOrder.mutateAsync({ order, lines: payloadLines });
      toast({ title: `Order ${(res as any).order_no} booked`, description: `Net ${money(totals.netBill)}, balance ${money(balance)}${fix ? ` · rate locked @ ${money(fixedRate || 0)}/g` : ""}` });
      setLines([emptyLine()]); setFix(false); setFixedRate(null); setFixedAt(null); setAdv({ cash: "", card: "", cheque: "" }); setDiscount(""); setDelivery(""); setCustomerId(""); setQuickName(""); setQuickPhone("");
    } catch (e: any) { toast({ title: "Order failed", description: e?.message || "Unknown", variant: "destructive" }); }
  };

  const openOrder = async (o: JxOrder) => { setSel(o); try { setSelItems(await fetchOrderItems(o.id)); } catch { setSelItems([]); } };

  // Detail estimate recomputed via calc.ts using the order's effective rate (fixed when locked).
  const detailRate = (o: JxOrder, karat: number) => (o.is_fix_rate && o.fixed_rate != null ? Number(o.fixed_rate) : liveRate(karat));
  const detailLine = (o: JxOrder, it: JxOrderItem) => saleLineTotal({
    netGrams: n(it.net_weight), karat: n(it.karat), wastePct: n(it.waste_pct), ratePerGram: detailRate(o, n(it.karat)),
    making: { type: "fixed", value: n(it.making) }, polish: { type: "fixed", value: n(it.polish) }, stones: [{ price: n(it.stone_value) }],
  });
  const advanceStatus = async (o: JxOrder, status: OrderStatus) => {
    try { await updateStatus.mutateAsync({ id: o.id, status }); setSel({ ...o, status }); toast({ title: `Order ${o.order_no} → ${status}`, description: orderStatusMessage(status) }); }
    catch (e: any) { toast({ title: "Status update failed", description: e?.message, variant: "destructive" }); }
  };

  const openFinalize = () => {
    if (!sel) return;
    setFinW(Object.fromEntries(selItems.map((it) => [it.id, String(it.net_weight ?? "")])));
    setFinT({ cash: String(Number(sel.balance ?? 0)), card: "", cheque: "" });
    setFinOpen(true);
  };

  const doFinalize = async () => {
    if (!sel) return;
    try {
      const rate = (kt: number) => (sel.is_fix_rate && sel.fixed_rate != null ? Number(sel.fixed_rate) : liveRate(kt));
      const items: any[] = []; const lines: any[] = [];
      selItems.forEach((it, i) => {
        const actNet = n(finW[it.id]); const kt = n(it.karat);
        const lc = saleLineTotal({ netGrams: actNet, karat: kt, wastePct: n(it.waste_pct), ratePerGram: rate(kt), making: { type: "fixed", value: n(it.making) }, polish: { type: "fixed", value: n(it.polish) }, stones: [{ price: n(it.stone_value) }] });
        const tag = `${sel.order_no}-${i + 1}`;
        const metal = (it.tag_number || "Gold").split(" ")[0] || "Gold";
        items.push({ metal, karat: kt, tag_number: tag, net_weight: actNet, gross_weight: round3(actNet + lc.wastageGrams), stone_weight: 0, pure_weight: round3(pureWeight(actNet, kt)), waste_pct: n(it.waste_pct), making_type: "fixed", making_value: n(it.making) });
        lines.push({ tag_number: tag, karat: kt, net_weight: actNet, waste_pct: n(it.waste_pct), total_weight: round3(actNet + lc.wastageGrams), making: lc.making, polish: lc.polish, stone_value: lc.stoneValue, line_total: lc.lineSubtotal, fine_grams: goldLedgerFineGrams(actNet, kt, "out") });
      });
      const subtotal = round2(lines.reduce((s, l) => s + l.line_total, 0));
      const discount = n(sel.discount); const net_bill = round2(subtotal - discount);
      const cash = n(finT.cash), card = n(finT.card), cheque = n(finT.cheque), advance = n(sel.advance_amount);
      const cash_balance = round2(cash + card + cheque + advance - net_bill);
      const snapshot: Record<number, number> = {}; JX_KARATS.forEach((kk) => { if (latestByKarat[kk]?.rate_per_gram != null) snapshot[kk] = Number(latestByKarat[kk].rate_per_gram); });
      const sale = { customer_id: sel.customer_id || null, sale_date: new Date().toISOString(), gold_rate_snapshot: snapshot, subtotal, discount, tax: 0, old_gold_credit: 0, net_bill, paid_cash: cash, paid_card: card, paid_cheque: cheque, paid_used_gold_value: 0, cash_balance, status: "completed" };
      const res = await finalizeOrder.mutateAsync({ orderId: sel.id, payload: { items, sale, lines, old_gold: null } });
      setFinInvoice({ sale_no: (res as any).sale_no, order_no: (res as any).order_no, lines: selItems.map((it, i) => ({ tag: `${sel.order_no}-${i + 1}`, karat: it.karat, net: n(finW[it.id]), line_total: lines[i].line_total })), subtotal, discount, net_bill, advance, cash, card, cheque, cash_balance });
      toast({ title: `Order ${(res as any).order_no} delivered`, description: `Invoice ${(res as any).sale_no} · advance ${money(advance)} cleared` });
      setFinOpen(false); setSel({ ...sel, status: "delivered", finalized_sale_id: (res as any).sale_id } as any);
    } catch (e: any) { toast({ title: "Finalize failed", description: e?.message || "Unknown", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ClipboardList className="h-7 w-7" style={{ color: GOLD }} /> Orders</h1>
        <p className="text-muted-foreground">Custom / bespoke orders — fix-rate protection, advance, workshop pipeline</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5"><Label className="text-xs">Existing</Label>
                <Select value={customerId} onValueChange={setCustomerId}><SelectTrigger data-testid="ord-customer"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1.5"><Label className="text-xs">Quick-add name</Label><Input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="(optional)" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Quick-add phone</Label><Input value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} placeholder="(optional)" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Item specs</CardTitle>
              <Button variant="outline" size="sm" onClick={addLine} data-testid="ord-add-line"><Plus className="h-3 w-3 mr-1" /> Add line</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lines.map((l, i) => {
                const lc = lineResults[i];
                return (
                  <div key={i} className="rounded-lg border p-3 space-y-2" data-testid={`ord-line-${i}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Line {i + 1}</span>
                      <div className="flex items-center gap-2"><span className="font-semibold" style={{ color: GOLD }} data-testid={`ord-line-est-${i}`}>{money(lc.lineSubtotal)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="grid gap-1"><Label className="text-[11px]">Metal</Label>
                        <Select value={l.metal} onValueChange={(v) => setLine(i, "metal", v)}><SelectTrigger className="h-8" data-testid={`ord-line-metal-${i}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{METALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Karat</Label><Input className="h-8" type="number" value={l.karat} onChange={(e) => setLine(i, "karat", e.target.value)} data-testid={`ord-line-karat-${i}`} /></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Est net (g)</Label><Input className="h-8" type="number" value={l.net} onChange={(e) => setLine(i, "net", e.target.value)} data-testid={`ord-line-net-${i}`} /></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Waste %</Label><Input className="h-8" type="number" value={l.waste} onChange={(e) => setLine(i, "waste", e.target.value)} data-testid={`ord-line-waste-${i}`} /></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Making type</Label>
                        <Select value={l.makingType} onValueChange={(v) => setLine(i, "makingType", v)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="per_gram">Per gram</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent></Select></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Making</Label><Input className="h-8" type="number" value={l.makingValue} onChange={(e) => setLine(i, "makingValue", e.target.value)} data-testid={`ord-line-making-${i}`} /></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Stones (est)</Label><Input className="h-8" type="number" value={l.stoneValue} onChange={(e) => setLine(i, "stoneValue", e.target.value)} data-testid={`ord-line-stone-${i}`} /></div>
                      <div className="grid gap-1"><Label className="text-[11px]">Design note</Label><Input className="h-8" value={l.note} onChange={(e) => setLine(i, "note", e.target.value)} /></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">@ {money(effRate(n(l.karat)))}/g {fix ? "(locked)" : "(live)"} · metal {money(lc.metalValue)} · making {money(lc.making)} · stones {money(lc.stoneValue)}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card style={fix ? { borderColor: GOLD } : undefined}>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" style={{ color: GOLD }} /> Gold Rate Protection</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={fix} onCheckedChange={(v) => toggleFix(!!v)} data-testid="ord-fixrate" /> Lock today's gold rate (fix-rate)</label>
              {fix && fixedRate != null && (
                <p className="text-sm font-medium" style={{ color: GOLD }} data-testid="ord-fixed-note">
                  Rate locked at {money(fixedRate)}/g{fixedAt ? ` on ${new Date(fixedAt).toLocaleDateString()}` : ""}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">Locked rate is used for the estimate even if the market rate moves.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tax / Discount / Advance</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-1"><Label className="text-xs">Tax basis</Label>
                <Select value={taxBasis} onValueChange={(v) => setTaxBasis(v as any)}><SelectTrigger data-testid="ord-tax-basis"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="value">On value</SelectItem><SelectItem value="making">On making</SelectItem><SelectItem value="fixed_per_gram">Fixed / fine g</SelectItem></SelectContent></Select></div>
              {taxBasis !== "none" && <div className="grid gap-1"><Label className="text-xs">Tax rate</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} data-testid="ord-tax-rate" /></div>}
              <div className="grid gap-1"><Label className="text-xs">Discount</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} data-testid="ord-discount" /></div>
              <div className="grid gap-1"><Label className="text-xs">Advance — cash</Label><Input type="number" value={adv.cash} onChange={(e) => setAdv({ ...adv, cash: e.target.value })} data-testid="ord-adv-cash" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1"><Label className="text-xs">card</Label><Input type="number" value={adv.card} onChange={(e) => setAdv({ ...adv, card: e.target.value })} data-testid="ord-adv-card" /></div>
                <div className="grid gap-1"><Label className="text-xs">cheque</Label><Input type="number" value={adv.cheque} onChange={(e) => setAdv({ ...adv, cheque: e.target.value })} data-testid="ord-adv-cheque" /></div>
              </div>
              <div className="grid gap-1"><Label className="text-xs">Delivery date</Label><Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} data-testid="ord-delivery" /></div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: GOLD }}>
            <CardContent className="pt-5 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{money(totals.tax)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>− {money(n(discount))}</span></div>
              <div className="border-t my-1" />
              <div className="flex justify-between font-bold text-base"><span>NET AMOUNT</span><span data-testid="ord-net-amount">{money(totals.netBill)}</span></div>
              <div className="flex justify-between"><span>Advance</span><span>− {money(advanceAmount)}</span></div>
              <div className="flex justify-between font-bold"><span>BALANCE</span><span data-testid="ord-balance">{money(balance)}</span></div>
              <Button onClick={save} disabled={createOrder.isPending} className="w-full mt-3 text-black hover:opacity-90" style={{ backgroundColor: GOLD }} data-testid="ord-save">{createOrder.isPending ? "Booking…" : "Book Order"}</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders list */}
      <Card>
        <CardHeader><CardTitle>Booked Orders ({orders.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
            <div className="space-y-2">
              {orders.map((o) => (
                <button key={o.id} type="button" className="flex w-full items-center justify-between rounded border p-3 text-left hover:bg-accent" onClick={() => openOrder(o)} data-testid={`ord-row-${o.order_no}`}>
                  <span className="font-medium">{o.order_no}</span>
                  <span className="flex items-center gap-3 text-sm">
                    {o.is_fix_rate && <Badge variant="outline" className="gap-1" style={{ borderColor: GOLD, color: GOLD }}><Lock className="h-3 w-3" /> {money(Number(o.fixed_rate))}/g</Badge>}
                    <span className="text-muted-foreground">{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString() : "—"}</span>
                    <span>bal {money(Number(o.balance))}</span>
                    <Badge variant="outline">{o.status}</Badge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order detail + pipeline */}
      {sel && (
        <Card data-testid="ord-detail">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>{sel.order_no}</CardTitle>
              <p className="text-xs text-muted-foreground">{sel.is_fix_rate ? <span data-testid="ord-locked-rate"><Lock className="inline h-3 w-3" /> Rate locked @ {money(Number(sel.fixed_rate))}/g</span> : "Live rate"}</p></div>
            <div className="flex items-center gap-2">
              {sel.status !== "cancelled" && !sel.finalized_sale_id && (
                <Button size="sm" onClick={openFinalize} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90" data-testid="ord-finalize-open">Deliver &amp; Invoice</Button>
              )}
              {sel.finalized_sale_id && <Badge variant="outline" style={{ borderColor: "#16a34a", color: "#16a34a" }}>finalized</Badge>}
              <Button variant="ghost" size="sm" onClick={() => setSel(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selItems.map((it) => {
              const lc = detailLine(sel, it);
              return (
                <div key={it.id} className="flex justify-between border-b pb-1">
                  <span>{it.tag_number} · net {it.net_weight}g · @ {money(detailRate(sel, n(it.karat)))}/g{sel.is_fix_rate ? " (locked)" : ""}</span>
                  <span className="font-medium" data-testid="ord-detail-estimate">{money(lc.lineSubtotal)}</span>
                </div>
              );
            })}
            <div className="flex justify-between font-semibold"><span>Net / Balance</span><span>{money(Number(sel.net_amount))} / {money(Number(sel.balance))}</span></div>

            {/* Status pipeline */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <div className="flex flex-wrap gap-1">
                {ORDER_STATUSES.map((s) => (
                  <Button key={s} size="sm" variant={sel.status === s ? "default" : "outline"} onClick={() => advanceStatus(sel, s)} data-testid={`ord-status-${s}`}
                    style={sel.status === s ? { backgroundColor: GOLD, color: "#000" } : undefined}>{s}</Button>
                ))}
              </div>
              <div className="mt-2 flex items-start gap-2 rounded bg-muted/50 p-2 text-xs" data-testid="ord-notify-msg">
                <Bell className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GOLD }} />
                <span><strong>Customer message (prepared, not sent — Phase 13):</strong> {orderStatusMessage(sel.status || "booked")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finalize (deliver & invoice) dialog */}
      <Dialog open={finOpen} onOpenChange={setFinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deliver &amp; Invoice — {sel?.order_no}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {selItems.map((it, i) => (
              <div key={it.id} className="grid grid-cols-2 gap-2 items-end">
                <span className="text-sm">{it.tag_number} · {it.karat}K <span className="text-muted-foreground">(est {it.net_weight}g)</span></span>
                <div className="grid gap-1"><Label className="text-xs">Actual net (g)</Label><Input type="number" value={finW[it.id] ?? ""} onChange={(e) => setFinW({ ...finW, [it.id]: e.target.value })} data-testid={`ord-fin-weight-${i}`} /></div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1"><Label className="text-xs">Balance cash</Label><Input type="number" value={finT.cash} onChange={(e) => setFinT({ ...finT, cash: e.target.value })} data-testid="ord-fin-cash" /></div>
              <div className="grid gap-1"><Label className="text-xs">card</Label><Input type="number" value={finT.card} onChange={(e) => setFinT({ ...finT, card: e.target.value })} /></div>
              <div className="grid gap-1"><Label className="text-xs">cheque</Label><Input type="number" value={finT.cheque} onChange={(e) => setFinT({ ...finT, cheque: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Advance {money(n(sel?.advance_amount))} is applied automatically (clears Customer Advances).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinOpen(false)}>Cancel</Button>
            <Button onClick={doFinalize} disabled={finalizeOrder.isPending} style={{ backgroundColor: GOLD }} className="text-black" data-testid="ord-fin-confirm">{finalizeOrder.isPending ? "Finalizing…" : "Confirm Delivery"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalized invoice */}
      {finInvoice && (
        <Card data-testid="ord-fin-invoice">
          <CardHeader><CardTitle>Invoice {finInvoice.sale_no} · Order {finInvoice.order_no}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {finInvoice.lines.map((l: any, i: number) => (<div key={i} className="flex justify-between border-b pb-1"><span>{l.tag} · {l.karat}K · net {l.net}g</span><span>{money(l.line_total)}</span></div>))}
            <div className="flex justify-between"><span>Subtotal</span><span>{money(finInvoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>− {money(finInvoice.discount)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Net Bill</span><span data-testid="ord-fin-netbill">{money(finInvoice.net_bill)}</span></div>
            <div className="flex justify-between"><span>Advance applied</span><span data-testid="ord-fin-advance">− {money(finInvoice.advance)}</span></div>
            <div className="flex justify-between"><span>Balance collected (cash {money(finInvoice.cash)} · card {money(finInvoice.card)} · cheque {money(finInvoice.cheque)})</span><span>{money(finInvoice.cash + finInvoice.card + finInvoice.cheque)}</span></div>
            <div className="flex justify-between font-semibold"><span>Change / balance</span><span data-testid="ord-fin-balance">{money(finInvoice.cash_balance)}</span></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
