/**
 * Loose Stones (Project JX, Phase 9). Standalone loose-stone inventory — jx_stone rows
 * with item_id NULL and is_loose=true. Light CRUD (SLUG-keyed / RLS). Value per stone is
 * the explicit price, or qty × rate when price is blank.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Gem, Plus, Trash2, X, Save } from "lucide-react";
import { useJewelryLooseStones, type JxLooseStone } from "@/hooks/useJewelryLooseStones";
import { useJewelrySetting } from "@/hooks/useJewelry";
import { round2 } from "@/lib/jewelry/calc";

const GOLD = "#C9A227";
const n = (v: string | number | null | undefined): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };
const empty = { type: "Diamond", name: "", weight: "", unit: "ct", qty: "1", rate: "", price: "", color: "", cut: "", clarity: "" };

export default function LooseStones() {
  const { toast } = useToast();
  const { stones, isLoading, createStone, updateStone, deleteStone } = useJewelryLooseStones();
  const { currency } = useJewelrySetting();
  const money = (v: number) => `${currency} ${(Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const [form, setForm] = useState({ ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm({ ...empty }); setEditingId(null); };

  const stoneValue = useMemo(() => round2(form.price !== "" ? n(form.price) : n(form.qty) * n(form.rate)), [form.price, form.qty, form.rate]);
  const valueOf = (s: JxLooseStone) => round2(s.price != null ? n(s.price) : n(s.qty) * n(s.rate));

  const buildPayload = (): JxLooseStone => ({
    id: editingId || "",
    type: form.type || null, name: form.name || null,
    weight: form.weight ? n(form.weight) : null, unit: form.unit || null,
    qty: form.qty ? n(form.qty) : null, rate: form.rate ? n(form.rate) : null, price: form.price ? n(form.price) : null,
    color: form.color || null, cut: form.cut || null, clarity: form.clarity || null, is_loose: true,
  });

  const save = async () => {
    if (!form.name.trim() && !form.type.trim()) { toast({ title: "Type or name required", variant: "destructive" }); return; }
    try {
      if (editingId) { await updateStone.mutateAsync({ id: editingId, stone: buildPayload() }); toast({ title: "Stone updated", description: form.name || form.type }); }
      else { await createStone.mutateAsync(buildPayload()); toast({ title: "Loose stone added", description: `${form.type} ${form.name}`.trim() }); }
      reset();
    } catch (e: any) { toast({ title: "Save failed", description: e?.message, variant: "destructive" }); }
  };

  const loadForEdit = (s: JxLooseStone) => {
    setEditingId(s.id);
    setForm({
      type: s.type ?? "", name: s.name ?? "", weight: s.weight != null ? String(s.weight) : "", unit: s.unit ?? "ct",
      qty: s.qty != null ? String(s.qty) : "", rate: s.rate != null ? String(s.rate) : "", price: s.price != null ? String(s.price) : "",
      color: s.color ?? "", cut: s.cut ?? "", clarity: s.clarity ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Gem className="h-7 w-7" style={{ color: GOLD }} /> Loose Stones</h1>
        <p className="text-muted-foreground">Standalone diamond &amp; gemstone inventory (not yet set into a piece)</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{editingId ? "Edit stone" : "Add loose stone"}</CardTitle>
          {editingId && <Button variant="ghost" size="sm" onClick={reset}><X className="h-4 w-4 mr-1" /> Cancel edit</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            <F label="Type"><Input value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="Diamond" data-testid="ls-type" /></F>
            <F label="Name / shape"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Round brilliant" data-testid="ls-name" /></F>
            <F label="Weight"><Input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} data-testid="ls-weight" /></F>
            <F label="Unit"><Input value={form.unit} onChange={(e) => set("unit", e.target.value)} data-testid="ls-unit" /></F>
            <F label="Qty"><Input type="number" value={form.qty} onChange={(e) => set("qty", e.target.value)} data-testid="ls-qty" /></F>
            <F label="Rate (per unit)"><Input type="number" value={form.rate} onChange={(e) => set("rate", e.target.value)} data-testid="ls-rate" /></F>
            <F label="Price (overrides qty×rate)"><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} data-testid="ls-price" /></F>
            <F label="Color"><Input value={form.color} onChange={(e) => set("color", e.target.value)} data-testid="ls-color" /></F>
            <F label="Cut"><Input value={form.cut} onChange={(e) => set("cut", e.target.value)} data-testid="ls-cut" /></F>
            <F label="Clarity"><Input value={form.clarity} onChange={(e) => set("clarity", e.target.value)} data-testid="ls-clarity" /></F>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={createStone.isPending || updateStone.isPending} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90" data-testid="ls-save">
              <Save className="h-4 w-4 mr-1" /> {editingId ? "Update" : "Add stone"}
            </Button>
            <span className="text-sm text-muted-foreground">Value: <span className="font-semibold" data-testid="ls-value">{money(stoneValue)}</span></span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Loose stone inventory (<span data-testid="ls-count">{stones.length}</span>)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : stones.length === 0 ? <p className="text-sm text-muted-foreground">No loose stones yet. Add one above.</p>
            : (
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Wt</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>4C</TableHead><TableHead className="text-right">Value</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {stones.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => loadForEdit(s)} data-testid={`ls-row-${s.name || s.type}`}>
                      <TableCell className="font-medium">{s.type}</TableCell>
                      <TableCell>{s.name || "—"}</TableCell>
                      <TableCell className="text-right">{s.weight != null ? `${s.weight}${s.unit || ""}` : "—"}</TableCell>
                      <TableCell className="text-right">{s.qty ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{[s.color, s.cut, s.clarity].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell className="text-right">{money(valueOf(s))}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteStone.mutate(s.id); }} data-testid={`ls-delete-${s.name || s.type}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
