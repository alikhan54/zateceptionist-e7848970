import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useRestaurantMenu, type MenuItem } from "@/hooks/useRestaurantMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, Utensils, ShoppingBag, Bike, Send, Loader2,
  Banknote, CreditCard, Printer, CheckCircle2, ChefHat, Boxes, Award, ArrowRight,
} from "lucide-react";

type OrderType = "dine_in" | "takeaway" | "delivery";
interface CartLine { item_id: string; name: string; price: number; quantity: number; }
interface PlacedOrder {
  order_id: string; order_number: number; total: number; currency: string;
  items: { name: string; quantity: number; unit_price: number; subtotal: number }[];
  ingredients_consumed: { ingredient: string; qty: number; unit: string }[];
  subtotal: number; tax: number;
}

const GST = 0.13;

export default function POS() {
  const { tenantId, tenantConfig } = useTenant();
  const { formatPrice } = useCurrency();
  const { categories, items, getItemsByCategory, isLoading } = useRestaurantMenu();

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [table, setTable] = useState("");
  const [address, setAddress] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [stage, setStage] = useState<"cart" | "payment" | "receipt">("cart");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "card">("cash");
  const [tendered, setTendered] = useState("");

  const cat = activeCat || categories[0]?.id || null;
  const gridItems = useMemo(() => {
    const list = cat ? getItemsByCategory(cat) : items;
    return list.filter((i) => i.is_available !== false);
  }, [cat, items, getItemsByCategory]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.quantity, 0), [cart]);
  const tax = Math.round(subtotal * GST);
  const total = subtotal + tax;

  const add = (it: MenuItem) => {
    setCart((c) => {
      const ex = c.find((l) => l.item_id === it.id);
      if (ex) return c.map((l) => (l.item_id === it.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { item_id: it.id, name: it.name, price: it.price, quantity: 1 }];
    });
  };
  const setQty = (id: string, d: number) =>
    setCart((c) => c.map((l) => (l.item_id === id ? { ...l, quantity: Math.max(0, l.quantity + d) } : l)).filter((l) => l.quantity > 0));
  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.item_id !== id));
  const resetAll = () => {
    setCart([]); setTable(""); setAddress(""); setCustName(""); setCustPhone("");
    setOrderType("dine_in"); setStage("cart"); setPlaced(null); setTendered(""); setPayMethod("cash");
  };

  async function sendToKitchen() {
    if (!cart.length || !tenantId) { toast.error("Cart is empty"); return; }
    if (orderType === "delivery" && !address.trim()) { toast.error("Delivery needs an address"); return; }
    setBusy(true);
    const payload: any = {
      tenant_id: tenantId,
      items: cart.map((l) => ({ item_id: l.item_id, quantity: l.quantity })),
      order_type: orderType,
      customer_name: custName.trim() || (orderType === "dine_in" ? `Table ${table || "-"}` : "Walk-in"),
      customer_phone: custPhone.trim() || null,
      source: "pos",
      payment_method: payMethod,
      idempotency_key: crypto.randomUUID(),
      notes: orderType === "dine_in" && table ? `Table ${table}` : orderType === "delivery" ? address.trim() : null,
    };
    // SAME RPC as voice + app (place_bbq_order): order + KDS card + inventory decrement + loyalty award
    const { data, error } = await supabase.rpc("place_bbq_order", { p_payload: payload });
    if (error || !data) { setBusy(false); toast.error("Could not send to kitchen — try again"); return; }
    const res = data as any;
    // delivery address (RPC doesn't take it) — store so it flows to the Dispatch board too
    if (orderType === "delivery" && address.trim() && res.order_id) {
      await supabase.from("restaurant_orders").update({ delivery_address: { address: address.trim() } }).eq("id", res.order_id).eq("tenant_id", tenantId);
    }
    if (table && orderType === "dine_in" && res.order_id) {
      await supabase.from("restaurant_orders").update({ table_number: Number(table) || null }).eq("id", res.order_id).eq("tenant_id", tenantId);
    }
    setPlaced({
      order_id: res.order_id, order_number: res.order_number, total: Number(res.total),
      currency: res.currency || "PKR", items: res.items || [], ingredients_consumed: res.ingredients_consumed || [],
      subtotal, tax,
    });
    setBusy(false);
    setStage("payment");
    toast.success(`Order #${res.order_number} sent to the kitchen`);
  }

  async function markPaid() {
    if (!placed || !tenantId) return;
    setBusy(true);
    const { error } = await supabase.from("restaurant_orders")
      .update({ payment_status: "paid", payment_method: payMethod })
      .eq("id", placed.order_id).eq("tenant_id", tenantId);
    setBusy(false);
    if (error) { toast.error("Failed to mark paid"); return; }
    toast.success("Payment recorded");
    setStage("receipt");
  }

  const change = payMethod === "cash" && tendered ? Math.max(0, Number(tendered) - (placed?.total || 0)) : 0;

  return (
    <div className="p-4 space-y-3">
      {/* print isolation: only the receipt prints */}
      <style>{`@media print { body * { visibility: hidden !important; } #pos-receipt-print, #pos-receipt-print * { visibility: visible !important; } #pos-receipt-print { position: absolute; left: 0; top: 0; width: 320px; } }`}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-orange-500" /> Point of Sale</h1>
          <p className="text-muted-foreground text-sm">Build an order at the counter — same kitchen, stock &amp; loyalty as phone &amp; app</p>
        </div>
        {stage !== "cart" && <Button variant="outline" onClick={resetAll} data-testid="pos-new-order">New Order</Button>}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* LEFT — menu grid */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" data-testid="pos-categories">
            {categories.map((c) => (
              <Button key={c.id} size="sm" variant={cat === c.id ? "default" : "outline"}
                onClick={() => setActiveCat(c.id)} data-testid={`pos-cat-${c.id}`}>{c.name}</Button>
            ))}
          </div>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12">Loading menu…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5" data-testid="pos-menu-grid">
              {gridItems.map((it) => (
                <button key={it.id} data-testid={`pos-item-${it.id}`} onClick={() => add(it)}
                  className="text-left rounded-xl border bg-card hover:border-orange-400 hover:shadow-md transition p-3 active:scale-[0.98]">
                  <div className="font-semibold text-sm leading-tight line-clamp-2">{it.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-orange-600">{formatPrice(it.price)}</span>
                    <span className="h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center"><Plus className="h-4 w-4" /></span>
                  </div>
                </button>
              ))}
              {gridItems.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No items in this category</p>}
            </div>
          )}
        </div>

        {/* RIGHT — cart / payment / receipt */}
        <Card className="self-start sticky top-4">
          <CardContent className="p-4 space-y-3">
            {stage === "cart" && (
              <>
                {/* order type */}
                <div className="grid grid-cols-3 gap-1.5" data-testid="pos-ordertypes">
                  {([["dine_in", "Dine-in", Utensils], ["takeaway", "Takeaway", ShoppingBag], ["delivery", "Delivery", Bike]] as const).map(([v, label, Icon]) => (
                    <button key={v} data-testid={`pos-ordertype-${v}`} onClick={() => setOrderType(v)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium ${orderType === v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
                {orderType === "dine_in" && (
                  <Input placeholder="Table number" value={table} onChange={(e) => setTable(e.target.value)} data-testid="pos-table-input" />
                )}
                {orderType === "delivery" && (
                  <Input placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} data-testid="pos-address-input" />
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  <Input placeholder="Customer name (optional)" value={custName} onChange={(e) => setCustName(e.target.value)} data-testid="pos-name-input" />
                  <Input placeholder="Phone (loyalty)" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} data-testid="pos-phone-input" />
                </div>

                {/* cart */}
                <div className="border-t pt-2">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-6">Tap menu items to add</p>
                  ) : (
                    <div className="space-y-2 max-h-[34vh] overflow-auto" data-testid="pos-cart">
                      {cart.map((l) => (
                        <div key={l.item_id} className="flex items-center gap-2" data-testid={`pos-cart-line-${l.item_id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{l.name}</div>
                            <div className="text-xs text-muted-foreground">{formatPrice(l.price)}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.item_id, -1)} data-testid={`pos-qty-dec-${l.item_id}`}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center text-sm font-bold tabular-nums" data-testid={`pos-qty-${l.item_id}`}>{l.quantity}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.item_id, 1)} data-testid={`pos-qty-inc-${l.item_id}`}><Plus className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.item_id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* totals */}
                <div className="border-t pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>GST (13%)</span><span>{formatPrice(tax)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span data-testid="pos-total">{formatPrice(total)}</span></div>
                </div>

                <Button className="w-full h-12 text-base" disabled={!cart.length || busy} onClick={sendToKitchen} data-testid="pos-send-to-kitchen">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />} Send to Kitchen
                </Button>
              </>
            )}

            {stage === "payment" && placed && (
              <>
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1" data-testid="pos-placed-banner">
                  <div className="flex items-center gap-2 font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" /> Order <span data-testid="pos-order-number">#{placed.order_number}</span> sent</div>
                  <div className="text-xs text-green-800 space-y-0.5">
                    <div className="flex items-center gap-1"><ChefHat className="h-3 w-3" /> On the Kitchen Display now (same screen as phone &amp; app)</div>
                    <div className="flex items-center gap-1"><Boxes className="h-3 w-3" /> Stock decremented: {placed.ingredients_consumed.length} ingredient{placed.ingredients_consumed.length === 1 ? "" : "s"}</div>
                    <div className="flex items-center gap-1"><Award className="h-3 w-3" /> {custPhone.trim() ? "Loyalty points awarded to this customer" : "Add a phone next time to award loyalty"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPayMethod("cash")} data-testid="pos-pay-cash" className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-medium ${payMethod === "cash" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}><Banknote className="h-4 w-4" /> Cash</button>
                  <button onClick={() => setPayMethod("card")} data-testid="pos-pay-card" className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-medium ${payMethod === "card" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}><CreditCard className="h-4 w-4" /> Card</button>
                </div>

                <div className="flex justify-between font-bold text-lg"><span>Amount due</span><span>{formatPrice(placed.total)}</span></div>
                {payMethod === "cash" && (
                  <>
                    <Input type="number" placeholder="Cash tendered" value={tendered} onChange={(e) => setTendered(e.target.value)} data-testid="pos-tendered" />
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Change</span><span className="font-bold" data-testid="pos-change">{formatPrice(change)}</span></div>
                  </>
                )}
                <Button className="w-full h-12 text-base" disabled={busy} onClick={markPaid} data-testid="pos-mark-paid">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />} Mark Paid
                </Button>
              </>
            )}

            {stage === "receipt" && placed && (
              <>
                <div id="pos-receipt-print" className="rounded-lg border p-4 font-mono text-xs space-y-1" data-testid="pos-receipt">
                  <div className="text-center font-bold text-sm">{tenantConfig?.company_name || "Bar.B.Q Tonight"}</div>
                  <div className="text-center text-[10px] text-muted-foreground">Counter Order (POS)</div>
                  <div className="flex justify-between border-t border-dashed mt-1 pt-1"><span>Order</span><span>#{placed.order_number}</span></div>
                  <div className="flex justify-between"><span>Type</span><span>{orderType === "dine_in" ? `Dine-in${table ? ` T${table}` : ""}` : orderType === "takeaway" ? "Takeaway" : "Delivery"}</span></div>
                  <div className="border-t border-dashed mt-1 pt-1 space-y-0.5">
                    {placed.items.map((it, i) => (
                      <div key={i} className="flex justify-between"><span>{it.quantity}× {it.name}</span><span>{formatPrice(it.subtotal)}</span></div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-dashed mt-1 pt-1"><span>Subtotal</span><span>{formatPrice(placed.subtotal)}</span></div>
                  <div className="flex justify-between"><span>GST 13%</span><span>{formatPrice(placed.tax)}</span></div>
                  <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatPrice(placed.total)}</span></div>
                  <div className="flex justify-between"><span>Paid ({payMethod})</span><span>{formatPrice(placed.total)}</span></div>
                  {payMethod === "cash" && Number(tendered) > 0 && <div className="flex justify-between"><span>Change</span><span>{formatPrice(change)}</span></div>}
                  <div className="text-center text-[10px] pt-2">Shukria — thank you!</div>
                </div>
                <Button className="w-full" onClick={() => window.print()} data-testid="pos-print"><Printer className="h-4 w-4 mr-2" /> Print Receipt</Button>
                <Button variant="outline" className="w-full" onClick={resetAll}><ArrowRight className="h-4 w-4 mr-2" /> Next Order</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
