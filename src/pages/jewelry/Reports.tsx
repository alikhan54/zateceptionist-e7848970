/**
 * Jewelry Reports (Project JX, Phase 8a). Gold Position (grams, from jx_gold_ledger) +
 * Trial Balance + Daily Cash Book (from the PKR double-entry GL). Read-only, RLS/slug.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, BookOpen, Banknote } from "lucide-react";
import { useGoldPosition, useJewelrySetting, JX_KARATS } from "@/hooks/useJewelry";
import { useCashBook, useTrialBalance } from "@/hooks/useJewelryLedger";

const GOLD = "#C9A227";

export default function Reports() {
  const { currency } = useJewelrySetting();
  const { byKarat, totalFine, hasRows, isLoading: gpLoading } = useGoldPosition();
  const { entries, balance, isLoading: cbLoading } = useCashBook();
  const { rows, totalDr, totalCr, balanced, isLoading: tbLoading } = useTrialBalance();
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
    </div>
  );
}
