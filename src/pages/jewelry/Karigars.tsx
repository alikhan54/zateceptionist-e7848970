/**
 * Workshop / Karigar (Project JX, Phase 9).
 * Issue gold to a karigar, receive the finished item back (recording making owed), and
 * pay making. Per-karigar GOLD BALANCE (fine g still out), MAKING PAYABLE and WASTAGE%
 * (with an anomaly badge when wastage exceeds the threshold) are computed live from
 * jx_worker_txn. Each action is one atomic jx_record_worker_txn RPC call (cash-basis):
 * issue/receive post to the physical gold ledger; paying making posts a balanced PKR
 * voucher (Dr Making Paid 5100 = Cr Cash 1000). All gram math reuses calc.ts.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Hammer, Plus, ArrowUpRight, ArrowDownLeft, Wallet, AlertTriangle, UserPlus } from "lucide-react";
import { useJewelryWorkshop, WASTAGE_ANOMALY_PCT, type JxWorkerStat } from "@/hooks/useJewelryWorkshop";
import { useJewelrySetting } from "@/hooks/useJewelry";

const GOLD = "#C9A227";
const n = (v: string | number | null | undefined): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };

type DlgKind = "issue" | "receive" | "pay" | null;

export default function Karigars() {
  const { toast } = useToast();
  const { workers, stats, quickAddWorker, recordTxn, fineGrams, isLoading } = useJewelryWorkshop();
  const { currency } = useJewelrySetting();
  const money = (v: number) => `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const grams = (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 3 })} g`;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && workers.length) setSelectedId(workers[0].id);
    if (selectedId && !workers.some((w) => w.id === selectedId)) setSelectedId(workers[0]?.id ?? null);
  }, [workers, selectedId]);

  const selected: JxWorkerStat | undefined = useMemo(() => stats.find((s) => s.worker.id === selectedId), [stats, selectedId]);

  // quick-add worker
  const [qName, setQName] = useState(""); const [qPhone, setQPhone] = useState(""); const [qRate, setQRate] = useState("");
  const addWorker = async () => {
    if (!qName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      const w = await quickAddWorker.mutateAsync({ name: qName.trim(), phone: qPhone.trim() || undefined, default_making_rate: qRate ? n(qRate) : undefined });
      setSelectedId(w.id); setQName(""); setQPhone(""); setQRate("");
      toast({ title: "Karigar added", description: w.name ?? "" });
    } catch (e: any) { toast({ title: "Add failed", description: e?.message, variant: "destructive" }); }
  };

  // transaction dialogs
  const [dlg, setDlg] = useState<DlgKind>(null);
  const [net, setNet] = useState(""); const [karat, setKarat] = useState("22"); const [making, setMaking] = useState(""); const [amount, setAmount] = useState("");
  const openDlg = (k: DlgKind) => {
    setNet(""); setKarat("22"); setMaking("");
    setAmount(k === "pay" ? String(selected?.makingPayable ?? "") : "");
    setDlg(k);
  };
  const liveFine = net ? fineGrams(n(net), n(karat)) : 0;

  const submit = async () => {
    if (!selectedId) return;
    try {
      if (dlg === "issue") {
        if (n(net) <= 0) { toast({ title: "Enter net grams", variant: "destructive" }); return; }
        await recordTxn.mutateAsync({ type: "issue_gold", worker_id: selectedId, net_grams: n(net), karat: n(karat), fine_grams: fineGrams(n(net), n(karat)) });
        toast({ title: "Gold issued", description: `${grams(n(net))} @ ${karat}K → ${grams(liveFine)} fine to karigar` });
      } else if (dlg === "receive") {
        if (n(net) <= 0) { toast({ title: "Enter net grams", variant: "destructive" }); return; }
        await recordTxn.mutateAsync({ type: "receive_item", worker_id: selectedId, net_grams: n(net), karat: n(karat), fine_grams: fineGrams(n(net), n(karat)), making_amount: n(making) });
        toast({ title: "Item received", description: `${grams(n(net))} back · making ${money(n(making))} owed` });
      } else if (dlg === "pay") {
        if (n(amount) <= 0) { toast({ title: "Enter an amount", variant: "destructive" }); return; }
        await recordTxn.mutateAsync({ type: "making_payment", worker_id: selectedId, amount: n(amount) });
        toast({ title: "Making paid", description: `${money(n(amount))} — voucher posted (Dr Making Paid = Cr Cash)` });
      }
      setDlg(null);
    } catch (e: any) { toast({ title: "Failed", description: e?.message || "Unknown error", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Hammer className="h-7 w-7" style={{ color: GOLD }} /> Workshop / Karigar</h1>
        <p className="text-muted-foreground">Issue &amp; receive gold, track each karigar's balance and wastage, pay making</p>
      </div>

      {/* quick-add */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Karigar</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-1.5"><Label className="text-xs">Name *</Label><Input value={qName} onChange={(e) => setQName(e.target.value)} placeholder="Karigar name" data-testid="kar-add-name" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Phone</Label><Input value={qPhone} onChange={(e) => setQPhone(e.target.value)} placeholder="(optional)" data-testid="kar-add-phone" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Default making rate</Label><Input type="number" value={qRate} onChange={(e) => setQRate(e.target.value)} placeholder="(optional)" data-testid="kar-add-rate" /></div>
          <div className="flex items-end"><Button onClick={addWorker} disabled={quickAddWorker.isPending} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90 w-full" data-testid="kar-add-save"><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* worker list */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Karigars ({workers.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
              : workers.length === 0 ? <p className="text-sm text-muted-foreground">No karigars yet. Add one above.</p>
              : stats.map((s) => (
                <button key={s.worker.id} type="button" onClick={() => setSelectedId(s.worker.id)}
                  className={`w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-accent ${selectedId === s.worker.id ? "border-2" : ""}`}
                  style={selectedId === s.worker.id ? { borderColor: GOLD } : {}}
                  data-testid={`kar-select-${s.worker.name}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.worker.name}</span>
                    {s.anomaly && <Badge variant="destructive" className="text-[10px]" data-testid={`kar-list-anomaly-${s.worker.name}`}>wastage {s.wastagePct}%</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">balance {grams(s.goldBalance)} · payable {money(s.makingPayable)}</div>
                </button>
              ))}
          </CardContent>
        </Card>

        {/* selected worker detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Select a karigar to view their statement.</CardContent></Card>
          ) : (
            <>
              <Card style={{ borderColor: GOLD }}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{selected.worker.name} {selected.worker.phone ? <span className="text-xs text-muted-foreground font-normal">· {selected.worker.phone}</span> : null}</CardTitle>
                  {selected.anomaly && (
                    <Badge variant="destructive" className="flex items-center gap-1" data-testid="kar-detail-anomaly">
                      <AlertTriangle className="h-3 w-3" /> Wastage anomaly: {selected.wastagePct}% &gt; {WASTAGE_ANOMALY_PCT}%
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Gold balance (fine, still out)" value={grams(selected.goldBalance)} hi testid="kar-detail-balance" />
                  <Stat label="Making payable" value={money(selected.makingPayable)} testid="kar-detail-payable" />
                  <Stat label="Wastage" value={`${selected.wastagePct}%`} sub={`${grams(selected.wastageGrams)} of ${grams(selected.issuedNet)}`} testid="kar-detail-wastage" danger={selected.anomaly} />
                  <Stat label="Issued / Received (fine)" value={`${grams(selected.issuedFine)}`} sub={`recv ${grams(selected.receivedFine)}`} testid="kar-detail-issued" />
                </CardContent>
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  <Button onClick={() => openDlg("issue")} variant="outline" data-testid="kar-issue-open"><ArrowUpRight className="h-4 w-4 mr-1" /> Issue Gold</Button>
                  <Button onClick={() => openDlg("receive")} variant="outline" data-testid="kar-receive-open"><ArrowDownLeft className="h-4 w-4 mr-1" /> Receive Item</Button>
                  <Button onClick={() => openDlg("pay")} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90" data-testid="kar-pay-open"><Wallet className="h-4 w-4 mr-1" /> Pay Making</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Statement</CardTitle></CardHeader>
                <CardContent>
                  <WorkerStatement workerId={selected.worker.id} currency={currency} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── dialogs ── */}
      <Dialog open={dlg === "issue"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Gold to {selected?.worker.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Net weight (g) *</Label><Input type="number" value={net} onChange={(e) => setNet(e.target.value)} data-testid="kar-issue-net" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Karat</Label><Input type="number" value={karat} onChange={(e) => setKarat(e.target.value)} data-testid="kar-issue-karat" /></div>
            <p className="text-sm text-muted-foreground">Fine gold issued: <span className="font-semibold" data-testid="kar-issue-fine">{grams(liveFine)}</span></p>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button onClick={submit} disabled={recordTxn.isPending} style={{ backgroundColor: GOLD }} className="text-black" data-testid="kar-issue-confirm">Issue</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === "receive"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive Item from {selected?.worker.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Net weight returned (g) *</Label><Input type="number" value={net} onChange={(e) => setNet(e.target.value)} data-testid="kar-recv-net" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Karat</Label><Input type="number" value={karat} onChange={(e) => setKarat(e.target.value)} data-testid="kar-recv-karat" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Making amount owed</Label><Input type="number" value={making} onChange={(e) => setMaking(e.target.value)} data-testid="kar-recv-making" /></div>
            <p className="text-sm text-muted-foreground">Fine gold returned: <span className="font-semibold" data-testid="kar-recv-fine">{grams(liveFine)}</span></p>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button onClick={submit} disabled={recordTxn.isPending} style={{ backgroundColor: GOLD }} className="text-black" data-testid="kar-recv-confirm">Receive</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === "pay"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay Making — {selected?.worker.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">Outstanding making payable: <span className="font-semibold">{money(selected?.makingPayable ?? 0)}</span></p>
            <div className="grid gap-1.5"><Label className="text-xs">Payment amount *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="kar-pay-amount" /></div>
            <p className="text-[11px] text-muted-foreground">Posts a balanced voucher: Dr Making Paid (5100) = Cr Cash (1000).</p>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button onClick={submit} disabled={recordTxn.isPending} style={{ backgroundColor: GOLD }} className="text-black" data-testid="kar-pay-confirm">Pay</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, sub, hi, danger, testid }: { label: string; value: string; sub?: string; hi?: boolean; danger?: boolean; testid?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold" style={hi ? { color: GOLD } : danger ? { color: "#dc2626" } : {}} data-testid={testid}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function WorkerStatement({ workerId, currency }: { workerId: string; currency: string }) {
  const { fetchWorkerTxns } = useJewelryWorkshop();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { let on = true; fetchWorkerTxns(workerId).then((r) => on && setRows(r)).catch(() => on && setRows([])); return () => { on = false; }; }, [workerId]);
  const money = (v: number) => `${currency} ${(Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const label = (t: string | null) => t === "issue" ? "Issued gold" : t === "receive" ? "Received item" : t === "payment" ? "Making payment" : (t || "");
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No transactions yet. Issue gold to get started.</p>;
  return (
    <Table data-testid="kar-statement">
      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Net (g)</TableHead><TableHead className="text-right">Karat</TableHead><TableHead className="text-right">Making</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} data-testid={`kar-txn-${r.type}`}>
            <TableCell className="text-xs">{r.txn_date || r.created_at ? new Date(r.txn_date || r.created_at).toLocaleString() : "—"}</TableCell>
            <TableCell>{label(r.type)}</TableCell>
            <TableCell className="text-right">{r.net_grams ?? "—"}</TableCell>
            <TableCell className="text-right">{r.karat ?? "—"}</TableCell>
            <TableCell className="text-right">{r.making_amount != null ? money(r.making_amount) : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
