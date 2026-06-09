/**
 * Jewelry Reports (Project JX, Phase 8a). Gold Position (grams, from jx_gold_ledger) +
 * Trial Balance + Daily Cash Book (from the PKR double-entry GL). Read-only, RLS/slug.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, BookOpen, Banknote, Boxes, TrendingUp, Hammer, Users, ClipboardList, Snail } from "lucide-react";
import { useGoldPosition, useJewelrySetting, JX_KARATS } from "@/hooks/useJewelry";
import { useCashBook, useTrialBalance } from "@/hooks/useJewelryLedger";
import { useStockValuation, useSalesRegister, useOrderPipeline, useProfitSummary, useSlowMovers, useCustomerDues } from "@/hooks/useJewelryReports";
import { useJewelryWorkshop } from "@/hooks/useJewelryWorkshop";

const GOLD = "#C9A227";

export default function Reports() {
  const { currency } = useJewelrySetting();
  const { byKarat, totalFine, hasRows, isLoading: gpLoading } = useGoldPosition();
  const { entries, balance, isLoading: cbLoading } = useCashBook();
  const { rows, totalDr, totalCr, balanced, isLoading: tbLoading } = useTrialBalance();
  const stock = useStockValuation();
  const sales = useSalesRegister(25);
  const pipeline = useOrderPipeline();
  const profit = useProfitSummary();
  const slow = useSlowMovers(60);
  const dues = useCustomerDues();
  const { stats: karigars } = useJewelryWorkshop();
  const money = (v: number) => `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const g = (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 3 })} g`;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><BookOpen className="h-7 w-7" style={{ color: GOLD }} /> Reports</h1>
        <p className="text-muted-foreground">Gold position, trial balance, and daily cash book — Legacy Jewellers</p>
      </div>

      {/* Gold Position */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" style={{ color: GOLD }} /> Gold Position (fine grams)</CardTitle></CardHeader>
        <CardContent>
          {gpLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !hasRows ? <p className="text-sm text-muted-foreground">No gold movements yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-5">
              {JX_KARATS.map((k) => (
                <div key={k} className="rounded-lg border p-3" style={{ borderColor: "rgba(201,160,39,0.35)" }}>
                  <p className="text-xs text-muted-foreground">{k}K net</p>
                  <p className="text-lg font-bold" data-testid={`rpt-gold-${k}`}>{g((byKarat[k] || 0))}</p>
                </div>
              ))}
              <div className="rounded-lg border p-3" style={{ background: "rgba(201,160,39,0.08)", borderColor: GOLD }}>
                <p className="text-xs text-muted-foreground">Total fine</p>
                <p className="text-lg font-bold" style={{ color: GOLD }} data-testid="rpt-gold-total">{g(totalFine)}</p>
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">Signed: sales reduce (−), old-gold/purchases add (+). Net = SUM(fine_grams).</p>
        </CardContent>
      </Card>

      {/* Trial Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Trial Balance</CardTitle>
          <Badge variant="outline" data-testid="rpt-tb-balanced" style={balanced ? { borderColor: "#16a34a", color: "#16a34a" } : { borderColor: "#dc2626", color: "#dc2626" }}>
            {balanced ? "Balanced" : "OUT OF BALANCE"}
          </Badge>
        </CardHeader>
        <CardContent>
          {tbLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No postings yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.code}><TableCell className="font-mono">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                    <TableCell className="text-right">{r.debit ? money(r.debit) : "—"}</TableCell><TableCell className="text-right">{r.credit ? money(r.credit) : "—"}</TableCell></TableRow>
                ))}
                <TableRow className="font-bold border-t-2"><TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right" data-testid="rpt-tb-dr">{money(totalDr)}</TableCell><TableCell className="text-right" data-testid="rpt-tb-cr">{money(totalCr)}</TableCell></TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Daily Cash Book */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4 text-green-600" /> Daily Cash Book (1000 Cash in Hand)</CardTitle>
          <span className="text-sm">Balance: <span className="font-bold" data-testid="rpt-cash-balance">{money(balance)}</span></span>
        </CardHeader>
        <CardContent data-testid="rpt-cashbook">
          {cbLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : entries.length === 0 ? <p className="text-sm text-muted-foreground">No cash movements yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Narration</TableHead><TableHead className="text-right">In (Dr)</TableHead><TableHead className="text-right">Out (Cr)</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {entries.map((e, i) => (
                  <TableRow key={i}><TableCell>{e.date ? new Date(e.date).toLocaleDateString() : "—"}</TableCell><TableCell>{e.narration || e.ref_table || "—"}</TableCell>
                    <TableCell className="text-right">{e.debit ? money(e.debit) : "—"}</TableCell><TableCell className="text-right">{e.credit ? money(e.credit) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{money(e.running)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock Valuation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4" style={{ color: GOLD }} /> Stock Valuation (in-stock)</CardTitle>
          <span className="text-sm">At live rate: <span className="font-bold" style={{ color: GOLD }} data-testid="rpt-stock-atrate">{money(stock.atRateValue)}</span> · Cost: <span className="font-medium" data-testid="rpt-stock-cost">{money(stock.costValue)}</span></span>
        </CardHeader>
        <CardContent data-testid="rpt-stock">
          {stock.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : stock.count === 0 ? <p className="text-sm text-muted-foreground">No in-stock items.</p> : (
            <>
              <p className="text-sm text-muted-foreground mb-2">{stock.count} item(s) · metal {money(stock.metalValue)} + making {money(stock.makingValue)} (stones valued in POS). Metal valued only where a real rate is set.</p>
              <div className="grid gap-3 sm:grid-cols-4">
                {Object.entries(stock.byKarat).map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3" style={{ borderColor: "rgba(201,160,39,0.35)" }}>
                    <p className="text-xs text-muted-foreground">{k}K · {v.count} pc · {g(v.fine)}</p>
                    <p className="text-lg font-bold">{money(v.value)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profit / value-add */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Profit (value-add on sales)</CardTitle></CardHeader>
        <CardContent>
          {profit.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : profit.itemsSold === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Value-add (margin)" v={money(profit.valueAdd)} hi testid="rpt-profit-valueadd" />
              <Stat label="Making" v={money(profit.making)} />
              <Stat label="Stone margin" v={money(profit.stone)} />
              <Stat label="Metal pass-through" v={money(profit.metalPassThrough)} />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">Value-add = making + polish + stone over sold items (the shop's margin over spot metal). Wastage {g(profit.wastageGrams)} on sold pieces.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order / delivery pipeline */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" style={{ color: GOLD }} /> Order / Delivery Pipeline</CardTitle></CardHeader>
          <CardContent data-testid="rpt-pipeline">
            {pipeline.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : pipeline.total === 0 ? <p className="text-sm text-muted-foreground">No orders.</p> : (
              <Table><TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>{pipeline.rows.map((r) => (<TableRow key={r.status}><TableCell><Badge variant="outline">{r.status}</Badge></TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{money(r.net)}</TableCell><TableCell className="text-right">{money(r.balance)}</TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Customer dues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" style={{ color: GOLD }} /> Customer Dues</CardTitle>
            <span className="text-sm">Total: <span className="font-bold" data-testid="rpt-dues-total">{money(dues.totalDue)}</span></span>
          </CardHeader>
          <CardContent>
            {dues.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : dues.rows.length === 0 ? <p className="text-sm text-muted-foreground">No outstanding dues.</p> : (
              <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>{dues.rows.map((r, i) => (<TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="text-right">{r.orders}</TableCell><TableCell className="text-right font-medium">{money(r.balance)}</TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Karigar ledger */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Hammer className="h-4 w-4" style={{ color: GOLD }} /> Karigar Ledger</CardTitle></CardHeader>
          <CardContent data-testid="rpt-karigar">
            {!karigars || karigars.length === 0 ? <p className="text-sm text-muted-foreground">No karigars yet.</p> : (
              <Table><TableHeader><TableRow><TableHead>Karigar</TableHead><TableHead className="text-right">Gold out (fine)</TableHead><TableHead className="text-right">Making payable</TableHead><TableHead className="text-right">Wastage</TableHead></TableRow></TableHeader>
                <TableBody>{karigars.map((s) => (<TableRow key={s.worker.id}><TableCell>{s.worker.name}</TableCell><TableCell className="text-right">{g(s.goldBalance)}</TableCell><TableCell className="text-right">{money(s.makingPayable)}</TableCell><TableCell className="text-right">{s.anomaly ? <Badge variant="destructive">{s.wastagePct}%</Badge> : `${s.wastagePct}%`}</TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Slow movers */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Snail className="h-4 w-4 text-muted-foreground" /> Slow Movers (60d+)</CardTitle></CardHeader>
          <CardContent>
            {slow.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : slow.rows.length === 0 ? <p className="text-sm text-muted-foreground">No slow-moving stock.</p> : (
              <Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>K</TableHead><TableHead>Collection</TableHead><TableHead className="text-right">Age (d)</TableHead></TableRow></TableHeader>
                <TableBody>{slow.rows.map((r, i) => (<TableRow key={i}><TableCell className="font-medium">{r.tag}</TableCell><TableCell>{r.karat}K</TableCell><TableCell>{r.collection || "—"}</TableCell><TableCell className="text-right">{r.age_days}</TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales register */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" style={{ color: GOLD }} /> Sales Register</CardTitle>
          <span className="text-sm">Net (recent): <span className="font-bold" data-testid="rpt-sales-total">{money(sales.totalNet)}</span></span>
        </CardHeader>
        <CardContent data-testid="rpt-sales">
          {sales.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : sales.count === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
            <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Net Bill</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>{sales.rows.map((r, i) => (<TableRow key={i}><TableCell className="font-mono">{r.sale_no}</TableCell><TableCell>{r.date ? new Date(r.date).toLocaleDateString() : "—"}</TableCell><TableCell className="text-right">{money(r.net_bill)}</TableCell><TableCell className="text-right">{money(r.received)}</TableCell><TableCell className="text-right">{money(r.balance)}</TableCell></TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, v, hi, testid }: { label: string; v: string; hi?: boolean; testid?: string }) {
  return (
    <div className="rounded-lg border p-3" style={hi ? { background: "rgba(201,160,39,0.08)", borderColor: GOLD } : { borderColor: "rgba(201,160,39,0.35)" }}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold" style={hi ? { color: GOLD } : {}} data-testid={testid}>{v}</p>
    </div>
  );
}
