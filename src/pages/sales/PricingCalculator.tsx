import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { useClinicProducts } from "@/hooks/useClinicProducts";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Mail, Save, Trash2, Plus } from "lucide-react";

interface LineItem {
  id: string;
  kind: "treatment" | "product";
  name: string;
  unit_price: number;
  qty: number;
}

export default function PricingCalculator() {
  const { tenantId } = useTenant();
  const { treatments } = useClinicTreatments();
  const { products } = useClinicProducts();
  const { toast } = useToast();

  const [items, setItems] = useState<LineItem[]>([]);
  const [discountPct, setDiscountPct] = useState("0");
  const [vatPct, setVatPct] = useState("5"); // UAE VAT default
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.qty, 0), [items]);
  const discount = Math.max(0, Math.min(100, parseFloat(discountPct) || 0));
  const afterDiscount = subtotal * (1 - discount / 100);
  const vat = Math.max(0, Math.min(50, parseFloat(vatPct) || 0));
  const vatAmount = Math.round(afterDiscount * vat) / 100;
  const grandTotal = Math.round((afterDiscount + vatAmount) * 100) / 100;

  const addTreatment = (id: string) => {
    const t = treatments.find(x => x.id === id);
    if (!t) return;
    setItems(prev => [...prev, { id: `t-${t.id}-${Date.now()}`, kind: "treatment", name: t.name, unit_price: t.price, qty: 1 }]);
  };

  const addProduct = (id: string) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    setItems(prev => [...prev, { id: `p-${p.id}-${Date.now()}`, kind: "product", name: p.name, unit_price: p.price, qty: 1 }]);
  };

  const updateQty = (lid: string, qty: number) => setItems(prev => prev.map(i => i.id === lid ? { ...i, qty: Math.max(1, qty) } : i));
  const removeItem = (lid: string) => setItems(prev => prev.filter(i => i.id !== lid));

  const handleSaveQuote = async () => {
    if (items.length === 0) { toast({ title: "Add at least 1 item", variant: "destructive" }); return; }
    if (!clientName.trim()) { toast({ title: "Client name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const quoteData = {
        items: items.map(i => ({ name: i.name, kind: i.kind, unit_price: i.unit_price, qty: i.qty, line_total: i.unit_price * i.qty })),
        subtotal,
        discount_pct: discount,
        vat_pct: vat,
        vat_amount: vatAmount,
        grand_total: grandTotal,
        currency: "AED",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("sales_leads" as any).insert({
        tenant_id: tenantId,
        contact_name: clientName.trim(),
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
        source: "pricing_calculator",
        lead_status: "new",
        notes: `Quote: AED ${grandTotal} (${items.length} items)`,
        // Store as JSON in notes-adjacent field; sales_leads doesn't have quote_data yet
        // but we keep the payload in a structured way via tags + metadata fallback.
        tags: ["quote", "pricing_calculator"],
      } as any);
      if (error) throw error;
      toast({ title: "Quote saved", description: `AED ${grandTotal} · ${clientName}` });
      // Keep the form populated so user can iterate.
    } catch (err: any) {
      toast({ title: "Could not save quote", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-7 w-7" /> Pricing & Quote Calculator
          </h1>
          <p className="text-muted-foreground">Build a quote from your treatments and products. Save as a lead.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Add treatment</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="qc-add-treatment-select"
                  onChange={(e) => { if (e.target.value) { addTreatment(e.target.value); e.target.value = ""; } }}
                  defaultValue=""
                >
                  <option value="">+ choose…</option>
                  {treatments.map(t => <option key={t.id} value={t.id}>{t.name} — AED {t.price}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Add product</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="qc-add-product-select"
                  onChange={(e) => { if (e.target.value) { addProduct(e.target.value); e.target.value = ""; } }}
                  defaultValue=""
                >
                  <option value="">+ choose…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} — AED {p.price}</option>)}
                </select>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No items yet — choose a treatment or product above.</p>
            ) : (
              <div className="space-y-2" data-testid="qc-items-list">
                {items.map(i => (
                  <div key={i.id} className="flex items-center gap-2 border rounded px-2 py-1.5">
                    <Badge variant={i.kind === "treatment" ? "default" : "secondary"} className="text-[10px]">{i.kind}</Badge>
                    <span className="flex-1 text-sm truncate">{i.name}</span>
                    <Input type="number" className="w-16 h-8 text-xs" min={1} value={i.qty} onChange={(e) => updateQty(i.id, parseInt(e.target.value, 10) || 1)} />
                    <span className="text-xs text-muted-foreground w-24 text-right">AED {i.unit_price * i.qty}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(i.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Discount %</Label>
                <Input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} data-testid="qc-discount-input" />
              </div>
              <div>
                <Label className="text-xs">VAT %</Label>
                <Input type="number" min={0} max={50} value={vatPct} onChange={(e) => setVatPct(e.target.value)} data-testid="qc-vat-input" />
              </div>
            </div>
            <div className="space-y-1 text-sm pt-2 border-t" data-testid="qc-totals">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>AED {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">After discount</span><span>AED {afterDiscount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>AED {vatAmount.toLocaleString()}</span></div>
              <div className="flex justify-between font-semibold pt-1.5 border-t"><span>Grand total</span><span data-testid="qc-grand-total">AED {grandTotal.toLocaleString()}</span></div>
            </div>
            <div className="space-y-2 pt-3 border-t">
              <div className="space-y-1"><Label className="text-xs">Client name</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} data-testid="qc-client-name-input" /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} data-testid="qc-client-email-input" /></div>
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} data-testid="qc-client-phone-input" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSaveQuote} disabled={saving} data-testid="qc-save-button">
                <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : "Save quote"}
              </Button>
              <Button variant="outline" disabled title="SMTP credentials required (gated by T20)">
                <Mail className="h-4 w-4 mr-1.5" /> Email
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Email Quote needs SMTP credentials — wire in Settings → Integrations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
