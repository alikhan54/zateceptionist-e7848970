/**
 * Point of Sale / Direct Sale (Project JX, Phase 6).
 * Pick in-stock items → price each line via calc.ts at the live rate (editable, since
 * jewelry pricing is negotiated) → old-gold credit → tax + discount → mixed tender →
 * cash balance. Save ATOMICALLY via the jx_create_sale RPC, then render an itemized
 * invoice (printable). ALL money math = calc.ts; the RPC only persists.
 *
 * OLD-GOLD MODEL (no double-count): calc.ts saleTotal SUBTRACTS the old-gold credit from
 * net_bill; tender is cash/card/cheque ONLY (usedGoldValue=0). Old gold shows as a CREDIT
 * line, never also as a tender. PKR double-entry vouchers are Phase 8 — not here.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, ShoppingCart, Printer, Receipt } from "lucide-react";
import { useJewelryItems, type JxItem, type JxStone } from "@/hooks/useJewelryInventory";
import { useGoldRates, useJewelrySetting, JX_KARATS } from "@/hooks/useJewelry";
import { useJewelryCustomers, useJewelryTaxRules, useJewelrySales } from "@/hooks/useJewelrySales";
import { saleLineTotal, saleTotal, pureWeight, goldLedgerFineGrams, round2, round3, type TaxBasis } from "@/lib/jewelry/calc";

const GOLD = "#C9A227";
const n = (v: string | number | null | undefined): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };

interface CartLine {
  item: JxItem;
  rate: string; waste: string; makingType: string; makingValue: string;
  stoneValue: number; stones: JxStone[];
}

export default function PointOfSale() {
  const { toast } = useToast();
  const { items, fetchStones } = useJewelryItems("");
  const { latestByKarat } = useGoldRates();
  const { currency } = useJewelrySetting();
  const { customers, createCustomer } = useJewelryCustomers();
  const { taxRules } = useJewelryTaxRules();
  const { createSale } = useJewelrySales();

  const inStock = useMemo(() => items.filter((i) => i.status === "in_stock"), [items]);
  const [pick, setPick] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [quickName, setQuickName] = useState(""); const [quickPhone, setQuickPhone] = useState("");

  const defRule = taxRules[0];
  const [taxBasis, setTaxBasis] = useState<TaxBasis | "none">((defRule?.basis as TaxBasis) || "none");
  const [taxRate, setTaxRate] = useState(defRule ? String(defRule.rate) : "");
  const [discount, setDiscount] = useState("");
  const [og, setOg] = useState({ on: false, net: "", karat: "22", rate: "", zero: true });
  const [cash, setCash] = useState(""); const [card, setCard] = useState(""); const [cheque, setCheque] = useState("");
  const [invoice, setInvoice] = useState<any>(null);

  const money = (v: number) => `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const addItem = async (it: JxItem) => {
    if (cart.some((c) => c.item.id === it.id)) return;
    let stones: JxStone[] = [];
    try { stones = await fetchStones(it.id); } catch { stones = []; }
    const stoneValue = round2(stones.reduce((s, st) => s + (st.price != null ? n(st.price) : n(st.qty) * n(st.rate)), 0));
    setCart((c) => [...c, {
      item: it, rate: String(latestByKarat[Number(it.karat)]?.rate_per_gram ?? ""), waste: it.waste_pct != null ? String(it.waste_pct) : "0",
      makingType: it.making_type || "per_gram", makingValue: it.making_value != null ? String(it.making_value) : "0", stoneValue, stones,
    }]);
    setPick("");
  };
  const setLine = (i: number, k: keyof CartLine, v: string) => setCart((c) => c.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const removeLine = (i: number) => setCart((c) => c.filter((_, idx) => idx !== i));

  // ── calc.ts pricing ──
  const lineCalc = (l: CartLine) => saleLineTotal({
    netGrams: n(l.item.net_weight), karat: n(l.item.karat), wastePct: n(l.waste), ratePerGram: n(l.rate),
    making: { type: (l.makingType as "per_gram" | "fixed"), value: n(l.makingValue) },
    polish: { type: (l.item.lacquer_type as "per_gram" | "fixed") || "fixed", value: n(l.item.lacquer_value) },
    stones: [{ price: l.stoneValue }],
  });
  const lineResults = cart.map(lineCalc);
  const oldGoldInput = og.on ? { netGrams: n(og.net), karat: n(og.karat), rateBuy: n(og.rate), zeroDeduction: og.zero, deductionPct: 0 } : undefined;
  const taxRule = { basis: (taxBasis === "none" ? "value" : taxBasis) as TaxBasis, rate: taxBasis === "none" ? 0 : n(taxRate) };
  const totals = saleTotal({
    lines: lineResults, taxRule, discount: n(discount), oldGold: oldGoldInput,
    tender: { cash: n(cash), card: n(card), cheque: n(cheque), usedGoldValue: 0 },
  });

  const save = async () => {
    if (cart.length === 0) { toast({ title: "No items", description: "Add at least one item to the sale.", variant: "destructive" }); return; }
    try {
      let custId = customerId;
      if (!custId && quickName.trim()) {
        const c = await createCustomer.mutateAsync({ name: quickName.trim(), phone: quickPhone.trim() || undefined });
        custId = c.id;
      }
      const lines = cart.map((l, i) => {
        const lc = lineResults[i];
        return {
          item_id: l.item.id, tag_number: l.item.tag_number, karat: n(l.item.karat), net_weight: n(l.item.net_weight),
          waste_pct: n(l.waste), total_weight: round3(n(l.item.net_weight) + lc.wastageGrams), making: lc.making,
          polish: lc.polish, stone_value: lc.stoneValue, line_total: lc.lineSubtotal,
          fine_grams: goldLedgerFineGrams(n(l.item.net_weight), n(l.item.karat), "out"),
        };
      });
      const old_gold = og.on ? {
        net_weight: n(og.net), karat: n(og.karat), purity: round3(pureWeight(n(og.net), n(og.karat))), rate: n(og.rate),
        credit_value: totals.oldGoldCredit, zero_deduction: og.zero, fine_grams: goldLedgerFineGrams(n(og.net), n(og.karat), "in"),
      } : null;
      const snapshot: Record<number, number> = {};
      JX_KARATS.forEach((k) => { if (latestByKarat[k]?.rate_per_gram != null) snapshot[k] = Number(latestByKarat[k].rate_per_gram); });
      const sale = {
        customer_id: custId || null, sale_date: new Date().toISOString(), gold_rate_snapshot: snapshot,
        subtotal: totals.subtotal, discount: n(discount), tax: totals.tax, old_gold_credit: totals.oldGoldCredit,
        net_bill: totals.netBill, paid_cash: n(cash), paid_card: n(card), paid_cheque: n(cheque), paid_used_gold_value: 0,
        cash_balance: totals.cashBalance, status: "completed",
      };
      const res = await createSale.mutateAsync({ sale, lines, old_gold });
      setInvoice({
        sale_no: (res as any).sale_no, when: new Date(), customer: customers.find((c) => c.id === custId)?.name || quickName || "Walk-in",
        lines: cart.map((l, i) => ({ tag: l.item.tag_number, metal: l.item.metal, karat: l.item.karat, net: l.item.net_weight, ...lineResults[i] })),
        ...totals, og: og.on ? { ...og, credit: totals.oldGoldCredit } : null, cash: n(cash), card: n(card), cheque: n(cheque), discount: n(discount),
      });
      toast({ title: `Sale ${(res as any).sale_no} saved`, description: `Net bill ${money(totals.netBill)}, balance ${money(totals.cashBalance)}` });
      // reset cart for next sale
      setCart([]); setOg({ on: false, net: "", karat: "22", rate: "", zero: true }); setCash(""); setCard(""); setCheque(""); setDiscount(""); setTaxBasis(defRule?.basis as TaxBasis || "none"); setTaxRate(defRule ? String(defRule.rate) : ""); setCustomerId(""); setQuickName(""); setQuickPhone("");
    } catch (e: any) {
      toast({ title: "Sale failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  const matches = pick.trim() ? inStock.filter((i) => `${i.tag_number} ${i.design_no} ${i.group_item}`.toLowerCase().includes(pick.toLowerCase())).slice(0, 8) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShoppingCart className="h-7 w-7" style={{ color: GOLD }} /> Point of Sale</h1>
        <p className="text-muted-foreground">Direct sale — live pricing, old-gold trade-in, mixed tender</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: customer + cart */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Existing</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="pos-customer"><SelectValue placeholder="Walk-in" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Quick-add name</Label><Input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="(optional)" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Quick-add phone</Label><Input value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} placeholder="(optional)" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-10" placeholder="Scan/search tag, design, collection… (in-stock)" value={pick} onChange={(e) => setPick(e.target.value)} data-testid="pos-item-search" />
                {matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow">
                    {matches.map((it) => (
                      <button key={it.id} type="button" className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent" onClick={() => addItem(it)} data-testid={`pos-result-${it.tag_number}`}>
                        <span>{it.tag_number} · {it.metal} {it.karat}K · {it.net_weight}g</span><Plus className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet. Search a tag to add.</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((l, i) => {
                    const lc = lineResults[i];
                    return (
                      <div key={l.item.id} className="rounded-lg border p-3" data-testid={`pos-line-${l.item.tag_number}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{l.item.tag_number} · {l.item.metal} {l.item.karat}K · {l.item.net_weight}g</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" style={{ color: GOLD }} data-testid={`pos-linetotal-${l.item.tag_number}`}>{money(lc.lineSubtotal)}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <LBL t={`Rate/g (${currency})`}><Input className="h-8" type="number" value={l.rate} onChange={(e) => setLine(i, "rate", e.target.value)} /></LBL>
                          <LBL t="Waste %"><Input className="h-8" type="number" value={l.waste} onChange={(e) => setLine(i, "waste", e.target.value)} /></LBL>
                          <LBL t="Making"><Input className="h-8" type="number" value={l.makingValue} onChange={(e) => setLine(i, "makingValue", e.target.value)} /></LBL>
                          <div className="text-[11px] text-muted-foreground self-end pb-1">metal {money(lc.metalValue)} · mk {money(lc.making)} · stn {money(lc.stoneValue)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Old Gold (trade-in)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={og.on} onCheckedChange={(v) => setOg({ ...og, on: !!v })} data-testid="pos-og-toggle" /> Customer is trading in old gold</label>
              {og.on && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <LBL t="Net weight (g)"><Input className="h-8" type="number" value={og.net} onChange={(e) => setOg({ ...og, net: e.target.value })} data-testid="pos-og-net" /></LBL>
                  <LBL t="Karat"><Input className="h-8" type="number" value={og.karat} onChange={(e) => setOg({ ...og, karat: e.target.value })} data-testid="pos-og-karat" /></LBL>
                  <LBL t="Buy rate /g"><Input className="h-8" type="number" value={og.rate} onChange={(e) => setOg({ ...og, rate: e.target.value })} data-testid="pos-og-rate" /></LBL>
                  <label className="flex items-center gap-2 text-xs self-end pb-2"><Checkbox checked={og.zero} onCheckedChange={(v) => setOg({ ...og, zero: !!v })} data-testid="pos-og-zero" /> Zero deduction (22K USP)</label>
                  <div className="col-span-full text-sm">Credit: <span className="font-semibold" data-testid="pos-og-credit">{money(totals.oldGoldCredit)}</span> <span className="text-xs text-muted-foreground">(subtracted from bill — not a tender)</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: totals + tender */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Tax & Discount</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <LBL t="Tax basis">
                <Select value={taxBasis} onValueChange={(v) => setTaxBasis(v as any)}>
                  <SelectTrigger data-testid="pos-tax-basis"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem><SelectItem value="value">On value</SelectItem>
                    <SelectItem value="making">On making</SelectItem><SelectItem value="fixed_per_gram">Fixed / fine g</SelectItem>
                  </SelectContent>
                </Select>
              </LBL>
              {taxBasis !== "none" && <LBL t="Tax rate (e.g. 0.03 = 3%)"><Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} data-testid="pos-tax-rate" /></LBL>}
              <LBL t="Discount"><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} data-testid="pos-discount" /></LBL>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tender</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <LBL t="Cash"><Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} data-testid="pos-cash" /></LBL>
              <LBL t="Card"><Input type="number" value={card} onChange={(e) => setCard(e.target.value)} data-testid="pos-card" /></LBL>
              <LBL t="Cheque"><Input type="number" value={cheque} onChange={(e) => setCheque(e.target.value)} data-testid="pos-cheque" /></LBL>
            </CardContent>
          </Card>

          <Card style={{ borderColor: GOLD }}>
            <CardContent className="pt-5 space-y-1.5 text-sm">
              <Row k="Subtotal" v={money(totals.subtotal)} />
              <Row k="Tax" v={money(totals.tax)} />
              <Row k="Discount" v={`− ${money(n(discount))}`} />
              {og.on && <Row k="Old-gold credit" v={`− ${money(totals.oldGoldCredit)}`} />}
              <div className="border-t my-1" />
              <Row k="NET BILL" v={money(totals.netBill)} bold testid="pos-net-bill" />
              <Row k="Received" v={money(totals.totalReceived)} />
              <Row k={totals.cashBalance >= 0 ? "Change / balance" : "Still owed"} v={money(totals.cashBalance)} bold testid="pos-cash-balance" />
              <Button onClick={save} disabled={createSale.isPending} className="w-full mt-3 text-black hover:opacity-90" style={{ backgroundColor: GOLD }} data-testid="pos-save">
                <Receipt className="h-4 w-4 mr-2" /> {createSale.isPending ? "Saving…" : "Complete Sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* INVOICE */}
      {invoice && (
        <Card id="pos-invoice" data-testid="pos-invoice" className="print-area">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Invoice {invoice.sale_no}</CardTitle>
              <p className="text-xs text-muted-foreground">{invoice.customer} · {new Date(invoice.when).toLocaleString()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print"><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoice.lines.map((l: any, i: number) => (
              <div key={i} className="flex justify-between border-b pb-1">
                <span>{l.tag} · {l.metal} {l.karat}K · net {l.net}g · making {money(l.making)} · stones {money(l.stoneValue)}</span>
                <span className="font-medium">{money(l.lineSubtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between"><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{money(invoice.tax)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>− {money(invoice.discount)}</span></div>
            {invoice.og && <div className="flex justify-between"><span>Old-gold credit ({invoice.og.net}g {invoice.og.karat}K{invoice.og.zero ? ", zero-deduction" : ""})</span><span>− {money(invoice.og.credit)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Net Bill</span><span>{money(invoice.netBill)}</span></div>
            <div className="flex justify-between"><span>Tender (cash {money(invoice.cash)} · card {money(invoice.card)} · cheque {money(invoice.cheque)})</span><span>{money(invoice.totalReceived)}</span></div>
            <div className="flex justify-between font-semibold"><span>{invoice.cashBalance >= 0 ? "Change / balance" : "Still owed"}</span><span>{money(invoice.cashBalance)}</span></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LBL({ t, children }: { t: string; children: React.ReactNode }) {
  return <div className="grid gap-1"><Label className="text-xs text-muted-foreground">{t}</Label>{children}</div>;
}
function Row({ k, v, bold, testid }: { k: string; v: string; bold?: boolean; testid?: string }) {
  return <div className={`flex justify-between ${bold ? "font-bold text-base" : ""}`}><span>{k}</span><span data-testid={testid}>{v}</span></div>;
}
