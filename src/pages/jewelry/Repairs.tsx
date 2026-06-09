/**
 * Repairs (Project JX, Phase 9). Light intake + status pipeline for repair jobs
 * (booked → in_progress → ready → delivered). Writes jx_repair (SLUG-keyed / RLS).
 * The customer-facing status message is DISPLAYED only — the Phase-13 lifecycle agent
 * does the actual sending; nothing is dispatched here.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Plus, ChevronRight, Trash2, Bell } from "lucide-react";
import { useJewelryRepairs, repairStatusMessage, nextRepairStatus, type JxRepair } from "@/hooks/useJewelryRepairs";
import { useJewelryCustomers } from "@/hooks/useJewelrySales";
import { useJewelrySetting } from "@/hooks/useJewelry";

const GOLD = "#C9A227";
const n = (v: string | number | null | undefined): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };
const statusColor: Record<string, string> = { booked: "secondary", in_progress: "default", ready: "outline", delivered: "outline" };

export default function Repairs() {
  const { toast } = useToast();
  const { repairs, isLoading, createRepair, updateStatus, deleteRepair } = useJewelryRepairs();
  const { customers, createCustomer } = useJewelryCustomers();
  const { currency } = useJewelrySetting();
  const money = (v: number) => `${currency} ${(Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const [customerId, setCustomerId] = useState(""); const [quickName, setQuickName] = useState("");
  const [desc, setDesc] = useState(""); const [charge, setCharge] = useState(""); const [promised, setPromised] = useState("");

  const latest: JxRepair | undefined = useMemo(() => repairs[0], [repairs]);

  const save = async () => {
    if (!desc.trim()) { toast({ title: "Describe the item/repair", variant: "destructive" }); return; }
    try {
      let custId = customerId;
      if (!custId && quickName.trim()) { const c = await createCustomer.mutateAsync({ name: quickName.trim() }); custId = c.id; }
      await createRepair.mutateAsync({
        customer_id: custId || null, item_desc: desc.trim(), charge: charge ? n(charge) : undefined,
        promised_date: promised ? new Date(promised).toISOString() : null,
      });
      toast({ title: "Repair booked", description: desc.trim() });
      setDesc(""); setCharge(""); setPromised(""); setQuickName(""); setCustomerId("");
    } catch (e: any) { toast({ title: "Save failed", description: e?.message, variant: "destructive" }); }
  };

  const advance = async (r: JxRepair) => {
    const nxt = nextRepairStatus(r.status);
    if (!nxt) return;
    try { await updateStatus.mutateAsync({ id: r.id, status: nxt }); toast({ title: `Repair → ${nxt}`, description: repairStatusMessage(nxt) }); }
    catch (e: any) { toast({ title: "Update failed", description: e?.message, variant: "destructive" }); }
  };

  const custName = (id: string | null) => customers.find((c) => c.id === id)?.name || "Walk-in";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Wrench className="h-7 w-7" style={{ color: GOLD }} /> Repairs</h1>
        <p className="text-muted-foreground">Intake repair jobs and move them through the workshop pipeline</p>
      </div>

      {/* intake */}
      <Card>
        <CardHeader><CardTitle className="text-base">New Repair</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="grid gap-1.5">
            <Label className="text-xs">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger data-testid="rep-customer"><SelectValue placeholder="Walk-in" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">…or quick name</Label><Input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="(optional)" data-testid="rep-quick-name" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Item / repair *</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Gold ring — resize" data-testid="rep-desc" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Charge</Label><Input type="number" value={charge} onChange={(e) => setCharge(e.target.value)} data-testid="rep-charge" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Promised date</Label><Input type="date" value={promised} onChange={(e) => setPromised(e.target.value)} data-testid="rep-promised" /></div>
          <div className="lg:col-span-5"><Button onClick={save} disabled={createRepair.isPending} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90" data-testid="rep-save"><Plus className="h-4 w-4 mr-1" /> Book Repair</Button></div>
        </CardContent>
      </Card>

      {/* most recent repair (status + the message that WILL be sent) */}
      {latest && (
        <Card style={{ borderColor: GOLD }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base" data-testid="rep-latest-desc">{latest.item_desc}</CardTitle>
            <Badge variant={(statusColor[latest.status || "booked"] as any)} data-testid="rep-latest-status">{latest.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="text-muted-foreground">{custName(latest.customer_id)} · charge {money(n(latest.charge))}{latest.promised_date ? ` · promised ${new Date(latest.promised_date).toLocaleDateString()}` : ""}</div>
            <div className="rounded-md border p-3 flex items-start gap-2" style={{ background: "rgba(201,160,39,0.06)" }}>
              <Bell className="h-4 w-4 mt-0.5" style={{ color: GOLD }} />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Customer notification (sent by lifecycle agent — Phase 13)</p>
                <p data-testid="rep-latest-note">{repairStatusMessage(latest.status || "booked")}</p>
              </div>
            </div>
            {nextRepairStatus(latest.status) && (
              <Button size="sm" variant="outline" onClick={() => advance(latest)} disabled={updateStatus.isPending} data-testid="rep-latest-advance">
                Advance to "{nextRepairStatus(latest.status)}" <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* all repairs */}
      <Card>
        <CardHeader><CardTitle className="text-base">All Repairs ({repairs.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : repairs.length === 0 ? <p className="text-sm text-muted-foreground">No repairs yet.</p>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Charge</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {repairs.map((r) => (
                    <TableRow key={r.id} data-testid={`rep-row-${r.item_desc}`}>
                      <TableCell className="font-medium">{r.item_desc}</TableCell>
                      <TableCell>{custName(r.customer_id)}</TableCell>
                      <TableCell className="text-right">{money(n(r.charge))}</TableCell>
                      <TableCell><Badge variant={(statusColor[r.status || "booked"] as any)}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {nextRepairStatus(r.status) && <Button size="sm" variant="ghost" onClick={() => advance(r)}>→ {nextRepairStatus(r.status)}</Button>}
                        <Button size="icon" variant="ghost" onClick={() => deleteRepair.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
