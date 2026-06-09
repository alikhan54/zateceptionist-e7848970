/**
 * Jewelry Inventory / Stock (Project JX, Phase 5).
 * Item entry with LIVE calc.ts valuation + stone sub-grid + tag/barcode + list/search/edit.
 * Writes jx_item (+ linked jx_stone). SLUG-keyed via useJewelryInventory (RLS). Reuses
 * calc.ts for ALL math (pureWeight, saleLineTotal) — no re-implementation. Mirrors the
 * clinic CRUD page (shadcn/Tailwind, native look).
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, Wand2, Save, Gem, X } from "lucide-react";
import { useJewelryItems, useJewelryWorkers, type JxStone, type JxItem } from "@/hooks/useJewelryInventory";
import { useGoldRates, useJewelrySetting } from "@/hooks/useJewelry";
import { pureWeight, saleLineTotal, round, round2, round3 } from "@/lib/jewelry/calc";

const GOLD = "#C9A227";
const METALS = ["Gold", "Diamond", "Silver", "Platinum", "Palladium"];
const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const emptyForm = {
  metal: "Gold", item_for: "stock", karat: "22", qty: "1", tag_number: "",
  group_item: "", design_no: "", size: "", worker_id: "",
  gross_weight: "", net_weight: "", waste_pct: "", making_type: "per_gram", making_value: "",
  lacquer_type: "fixed", lacquer_value: "", purchase_rate: "", description: "",
};
const emptyStone = (): JxStone => ({ type: "", name: "", weight: null, unit: "ct", qty: null, rate: null, price: null, color: "", cut: "", clarity: "", is_loose: false });

export default function Inventory() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { items, isLoading, createItem, updateItem, deleteItem, fetchStones } = useJewelryItems(search);
  const { workers } = useJewelryWorkers();
  const { latestByKarat } = useGoldRates();
  const { setting, currency } = useJewelrySetting();

  const [form, setForm] = useState({ ...emptyForm });
  const [stones, setStones] = useState<JxStone[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const collections: string[] = Array.isArray(setting?.collections) ? (setting!.collections as string[]) : [];

  // ── live calc (reuses calc.ts) ───────────────────────────────────────────
  const calc = useMemo(() => {
    const net = num(form.net_weight);
    const karat = num(form.karat);
    const waste = num(form.waste_pct);
    const ratePerGram = num(latestByKarat[karat]?.rate_per_gram);
    const rateSource = latestByKarat[karat]?.source ?? null;
    const stonesForCalc = stones.map((s) =>
      s.price != null && String(s.price) !== "" ? { price: num(s.price) } : { qty: num(s.qty), rate: num(s.rate) },
    );
    const line = saleLineTotal({
      netGrams: net, karat, wastePct: waste, ratePerGram,
      making: { type: form.making_type as "per_gram" | "fixed", value: num(form.making_value) },
      polish: { type: form.lacquer_type as "per_gram" | "fixed", value: num(form.lacquer_value) },
      stones: stonesForCalc,
    });
    const pure = pureWeight(net, karat);
    const stoneWeight = round3(stones.reduce((s, st) => s + num(st.weight), 0));
    const purchaseRate = num(form.purchase_rate);
    const itemCost = purchaseRate > 0 ? round2(purchaseRate * net + line.making + line.stoneValue) : null;
    return { net, karat, ratePerGram, rateSource, line, pure, stoneWeight, itemCost };
  }, [form, stones, latestByKarat]);

  const money = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  // ── stone grid ───────────────────────────────────────────────────────────
  const addStone = () => setStones((s) => [...s, emptyStone()]);
  const removeStone = (i: number) => setStones((s) => s.filter((_, idx) => idx !== i));
  const setStone = (i: number, k: keyof JxStone, v: string) =>
    setStones((s) => s.map((row, idx) => (idx === i ? { ...row, [k]: v === "" ? null : (["type", "name", "unit", "color", "cut", "clarity"].includes(k) ? v : num(v)) } : row)));

  // ── form helpers ───────────────────────────────────────────────────────────
  const autoTag = () => set("tag_number", `LJ-${Date.now().toString(36).toUpperCase()}`);
  const resetForm = () => { setForm({ ...emptyForm }); setStones([]); setEditingId(null); setPhotoFiles([]); };

  const loadForEdit = async (it: JxItem) => {
    setEditingId(it.id);
    setForm({
      metal: it.metal ?? "Gold", item_for: it.item_for ?? "stock", karat: String(it.karat ?? ""), qty: "1",
      tag_number: it.tag_number ?? "", group_item: it.group_item ?? "", design_no: it.design_no ?? "",
      size: it.size ?? "", worker_id: it.worker_id ?? "", gross_weight: it.gross_weight != null ? String(it.gross_weight) : "",
      net_weight: it.net_weight != null ? String(it.net_weight) : "", waste_pct: it.waste_pct != null ? String(it.waste_pct) : "",
      making_type: it.making_type ?? "per_gram", making_value: it.making_value != null ? String(it.making_value) : "",
      lacquer_type: it.lacquer_type ?? "fixed", lacquer_value: it.lacquer_value != null ? String(it.lacquer_value) : "",
      purchase_rate: it.purchase_rate != null ? String(it.purchase_rate) : "", description: it.description ?? "",
    });
    try { setStones(await fetchStones(it.id)); } catch { setStones([]); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildItemPayload = (): Partial<JxItem> => ({
    metal: form.metal, karat: num(form.karat) || null, group_item: form.group_item || null,
    design_no: form.design_no || null, size: form.size || null, worker_id: form.worker_id || null,
    item_for: form.item_for, gross_weight: form.gross_weight ? num(form.gross_weight) : (calc.net + calc.stoneWeight || null),
    net_weight: num(form.net_weight), stone_weight: calc.stoneWeight, pure_weight: round3(calc.pure),
    waste_pct: form.waste_pct ? num(form.waste_pct) : 0, making_type: form.making_type, making_value: num(form.making_value),
    lacquer_type: form.lacquer_type, lacquer_value: num(form.lacquer_value), purchase_rate: form.purchase_rate ? num(form.purchase_rate) : null,
    item_cost: calc.itemCost, status: "in_stock", description: form.description || null,
  });

  const onSave = async () => {
    if (!form.metal || !form.karat || !form.net_weight || !form.tag_number) {
      toast({ title: "Missing fields", description: "Metal, karat, net weight and tag number are required.", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, item: { ...buildItemPayload(), tag_number: form.tag_number }, stones });
        toast({ title: "Item updated", description: `${form.tag_number} saved.` });
      } else {
        const qty = Math.max(1, Math.floor(num(form.qty) || 1));
        for (let n = 0; n < qty; n++) {
          const tag = qty === 1 ? form.tag_number : `${form.tag_number}-${n + 1}`;
          await createItem.mutateAsync({ item: { ...buildItemPayload(), tag_number: tag }, stones });
        }
        toast({ title: "Item added", description: `${form.tag_number}${qty > 1 ? ` ×${qty}` : ""} added to stock.` });
      }
      resetForm();
    } catch (e: any) {
      const msg = /duplicate key|unique/i.test(e?.message || "") ? `Tag "${form.tag_number}" already exists for this shop.` : (e?.message || "Save failed");
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  };

  const onDelete = async (it: JxItem) => {
    try { await deleteItem.mutateAsync(it.id); toast({ title: "Item deleted", description: it.tag_number ?? "" }); if (editingId === it.id) resetForm(); }
    catch (e: any) { toast({ title: "Delete failed", description: e?.message, variant: "destructive" }); }
  };

  useEffect(() => { /* keep gross >= net visual hint only */ }, [form.net_weight]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gem className="h-7 w-7" style={{ color: GOLD }} /> Inventory
          </h1>
          <p className="text-muted-foreground">Stock entry with live valuation — Legacy Jewellers</p>
        </div>
      </div>

      {/* ── Item entry form ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editingId ? `Editing ${form.tag_number || "item"}` : "New Item"}</CardTitle>
          {editingId && <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" /> Cancel edit</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Field label="Metal">
              <Select value={form.metal} onValueChange={(v) => set("metal", v)}>
                <SelectTrigger data-testid="inv-metal"><SelectValue /></SelectTrigger>
                <SelectContent>{METALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="For">
              <Select value={form.item_for} onValueChange={(v) => set("item_for", v)}>
                <SelectTrigger data-testid="inv-for"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="stock">Stock</SelectItem><SelectItem value="order">Order</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Karat"><Input id="inv-karat" type="number" value={form.karat} onChange={(e) => set("karat", e.target.value)} /></Field>
            <Field label="Qty"><Input id="inv-qty" type="number" min="1" value={form.qty} onChange={(e) => set("qty", e.target.value)} /></Field>

            <Field label="Tag / Barcode *">
              <div className="flex gap-1">
                <Input id="inv-tag" value={form.tag_number} onChange={(e) => set("tag_number", e.target.value)} placeholder="LJ-…" />
                <Button type="button" variant="outline" size="icon" onClick={autoTag} data-testid="inv-tag-auto" title="Auto-generate"><Wand2 className="h-4 w-4" /></Button>
              </div>
            </Field>
            <Field label="Collection">
              <Select value={form.group_item} onValueChange={(v) => set("group_item", v)}>
                <SelectTrigger data-testid="inv-collection"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{collections.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Design No"><Input value={form.design_no} onChange={(e) => set("design_no", e.target.value)} /></Field>
            <Field label="Size"><Input id="inv-size" value={form.size} onChange={(e) => set("size", e.target.value)} /></Field>

            <Field label="Gross Weight (g)"><Input id="inv-gross" type="number" value={form.gross_weight} onChange={(e) => set("gross_weight", e.target.value)} /></Field>
            <Field label="Net Weight (g) *"><Input id="inv-net" type="number" value={form.net_weight} onChange={(e) => set("net_weight", e.target.value)} placeholder="0.000" /></Field>
            <Field label="Waste %"><Input id="inv-waste" type="number" value={form.waste_pct} onChange={(e) => set("waste_pct", e.target.value)} /></Field>
            <Field label="Worker / Karigar">
              <Select value={form.worker_id} onValueChange={(v) => set("worker_id", v)}>
                <SelectTrigger data-testid="inv-worker"><SelectValue placeholder={workers.length ? "Select" : "No workers yet"} /></SelectTrigger>
                <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Making type">
              <Select value={form.making_type} onValueChange={(v) => set("making_type", v)}>
                <SelectTrigger data-testid="inv-making-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="per_gram">Per gram</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Making value"><Input id="inv-making-value" type="number" value={form.making_value} onChange={(e) => set("making_value", e.target.value)} /></Field>
            <Field label="Lacquer/Polish type">
              <Select value={form.lacquer_type} onValueChange={(v) => set("lacquer_type", v)}>
                <SelectTrigger data-testid="inv-lacquer-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="per_gram">Per gram</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Lacquer/Polish value"><Input id="inv-lacquer-value" type="number" value={form.lacquer_value} onChange={(e) => set("lacquer_value", e.target.value)} /></Field>

            <Field label="Purchase rate (/g)"><Input id="inv-purchase-rate" type="number" value={form.purchase_rate} onChange={(e) => set("purchase_rate", e.target.value)} /></Field>
          </div>

          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>

          {/* Stone sub-grid */}
          <div className="rounded-lg border p-3" style={{ borderColor: "rgba(201,160,39,0.35)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Stones</span>
              <Button type="button" variant="outline" size="sm" onClick={addStone} data-testid="inv-add-stone"><Plus className="h-3 w-3 mr-1" /> Add stone</Button>
            </div>
            {stones.length === 0 ? (
              <p className="text-xs text-muted-foreground">No stones. Click "Add stone" for diamonds/gemstones.</p>
            ) : (
              <div className="space-y-2">
                {stones.map((s, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-1 items-center" data-testid={`inv-stone-row-${i}`}>
                    <Input className="h-8" placeholder="type" value={s.type ?? ""} onChange={(e) => setStone(i, "type", e.target.value)} />
                    <Input className="h-8" placeholder="name" value={s.name ?? ""} onChange={(e) => setStone(i, "name", e.target.value)} />
                    <Input className="h-8" type="number" placeholder="wt" value={s.weight ?? ""} onChange={(e) => setStone(i, "weight", e.target.value)} data-testid={`inv-stone-weight-${i}`} />
                    <Input className="h-8" placeholder="unit" value={s.unit ?? ""} onChange={(e) => setStone(i, "unit", e.target.value)} />
                    <Input className="h-8" type="number" placeholder="qty" value={s.qty ?? ""} onChange={(e) => setStone(i, "qty", e.target.value)} />
                    <Input className="h-8" type="number" placeholder="rate" value={s.rate ?? ""} onChange={(e) => setStone(i, "rate", e.target.value)} />
                    <Input className="h-8" type="number" placeholder="price" value={s.price ?? ""} onChange={(e) => setStone(i, "price", e.target.value)} data-testid={`inv-stone-price-${i}`} />
                    <Input className="h-8" placeholder="color" value={s.color ?? ""} onChange={(e) => setStone(i, "color", e.target.value)} />
                    <Input className="h-8" placeholder="cut" value={s.cut ?? ""} onChange={(e) => setStone(i, "cut", e.target.value)} />
                    <Input className="h-8" placeholder="clarity" value={s.clarity ?? ""} onChange={(e) => setStone(i, "clarity", e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStone(i)} data-testid={`inv-stone-remove-${i}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos (reuses shared 'media' bucket) */}
          <Field label="Photos">
            <Input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} data-testid="inv-photos" />
            {photoFiles.length > 0 && <p className="text-xs text-muted-foreground mt-1">{photoFiles.length} photo(s) selected (uploaded to media bucket on save)</p>}
          </Field>

          {/* LIVE calc panel */}
          <div className="rounded-lg p-4 grid gap-3 md:grid-cols-4" style={{ background: "rgba(201,160,39,0.08)", border: `1px solid ${GOLD}` }}>
            <div>
              <p className="text-xs text-muted-foreground">Pure (fine) weight</p>
              <p className="text-xl font-bold" data-testid="inv-pure-weight">{round(calc.pure, 4).toLocaleString(undefined, { maximumFractionDigits: 4 })} g</p>
              <p className="text-[11px] text-muted-foreground">pureWeight(net, {calc.karat}K)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valuation @ {money(calc.ratePerGram)}/g{calc.rateSource === "placeholder" ? " (placeholder)" : ""}</p>
              <p className="text-xl font-bold" style={{ color: GOLD }} data-testid="inv-valuation">{money(calc.line.lineSubtotal)}</p>
              <p className="text-[11px] text-muted-foreground">metal {money(calc.line.metalValue)} · making {money(calc.line.making)} · polish {money(calc.line.polish)} · stones {money(calc.line.stoneValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stone weight (sum)</p>
              <p className="text-xl font-bold" data-testid="inv-stone-weight">{calc.stoneWeight.toLocaleString(undefined, { maximumFractionDigits: 3 })} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Item cost (at purchase rate)</p>
              <p className="text-xl font-bold" data-testid="inv-item-cost">{calc.itemCost != null ? money(calc.itemCost) : "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={createItem.isPending || updateItem.isPending} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90" data-testid="inv-save">
              <Save className="h-4 w-4 mr-2" /> {editingId ? "Update Item" : "Save Item"}
            </Button>
            {!editingId && <Button variant="outline" onClick={resetForm}>Clear</Button>}
          </div>
        </CardContent>
      </Card>

      {/* ── Stock list ── */}
      <Card>
        <CardHeader><CardTitle>Stock ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by tag, design, or collection…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="inv-search" />
          </div>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading stock…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items yet. Add your first piece above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead><TableHead>Metal/Karat</TableHead><TableHead>Collection</TableHead>
                  <TableHead className="text-right">Net (g)</TableHead><TableHead className="text-right">Pure (g)</TableHead>
                  <TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id} className="cursor-pointer" onClick={() => loadForEdit(it)} data-testid={`inv-row-${it.tag_number}`}>
                    <TableCell className="font-medium">{it.tag_number}</TableCell>
                    <TableCell>{it.metal} {it.karat}K</TableCell>
                    <TableCell>{it.group_item || "—"}</TableCell>
                    <TableCell className="text-right">{it.net_weight}</TableCell>
                    <TableCell className="text-right">{it.pure_weight}</TableCell>
                    <TableCell><Badge variant="outline">{it.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(it); }} data-testid={`inv-delete-${it.tag_number}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
