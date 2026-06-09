/**
 * Public consumer ordering storefront — route /order/:slug.
 *
 * Mobile-first, no auth, brand-themed per tenant. Reads tenant + menu via the
 * SECURITY-DEFINER RPC `get_public_storefront` (anon-grant). Submits orders via
 * the EXISTING `place_bbq_order` RPC (anon-granted, idempotency-keyed).
 *
 * Three phases inside one component:
 *  - "menu"      → category tabs + items + sticky cart bar
 *  - "checkout"  → name/phone/order_type + (delivery: address) form
 *  - "confirmed" → order number + total + ingredients consumed (the hero loop proof)
 *
 * Touches NO other tenant. No staff routes. No n8n. No service worker logic here
 * (that's in the manifest + main.tsx scope guard).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, ShoppingBag, ArrowLeft, MapPin, Phone, User, Loader2, CheckCircle2, Utensils } from "lucide-react";

// -------------------- types --------------------
interface MenuItem {
  id: string;
  name: string;
  price: number;
  currency?: string;
  category_id?: string;
  description?: string;
  is_available?: boolean;
  popular?: boolean;
  spice_level?: number;
  prep_time_min?: number;
  station?: string;
  serves?: string;
}
interface MenuCategory { id: string; name: string; sort?: number }
interface Storefront {
  found: boolean;
  slug?: string;
  company?: string;
  industry?: string;
  currency?: string;
  country?: string;
  menu?: { items: MenuItem[]; categories: MenuCategory[]; name?: string };
  branding?: {
    company_name?: string;
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    short_description?: string;
    founded_year?: number;
    service_areas?: Array<{ name: string; city?: string; area?: string }>;
  };
}
interface CartLine { id: string; quantity: number }

// -------------------- helpers --------------------
const CURRENCY_LABEL: Record<string, string> = { PKR: "Rs.", AED: "AED", USD: "$", GBP: "GBP", INR: "Rs", SAR: "SAR" };
const fmtPrice = (n: number, cur?: string) => {
  const sym = cur ? (CURRENCY_LABEL[cur] || cur) : "";
  const rounded = Math.round(n).toLocaleString("en-IN");
  return sym ? `${sym} ${rounded}` : rounded;
};

const STORAGE_KEY = (slug: string) => `bbq-cart:${slug}`;

// -------------------- main component --------------------
export default function OrderStorefront() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [data, setData] = useState<Storefront | null>(null);
  const [loadErr, setLoadErr] = useState<string>("");
  const [phase, setPhase] = useState<"menu" | "checkout" | "confirmed">("menu");
  const [activeCat, setActiveCat] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY(slug)) || "[]"); } catch { return []; }
  });
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [confirmed, setConfirmed] = useState<{ order_number?: number; total?: number; ingredients_consumed?: Array<{ ingredient: string; qty: number; unit: string }>; items?: any[] } | null>(null);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", order_type: "delivery", address: "" });
  const [submitErrText, setSubmitErrText] = useState("");

  // Load the storefront ----------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!slug) return;
      const { data, error } = await supabase.rpc("get_public_storefront", { p_slug: slug });
      if (!alive) return;
      if (error) { setLoadErr(error.message); return; }
      const sf = data as Storefront;
      if (!sf?.found) { setLoadErr("Sorry, this storefront is not available."); return; }
      setData(sf);
      const cats = sf.menu?.categories || [];
      if (cats.length) setActiveCat(cats[0].id);
      // PWA manifest + theme color injection ---------------------------------
      const company = sf.branding?.company_name || sf.company || slug;
      document.title = `Order — ${company}`;
      const primary = sf.branding?.primary_color || "#0a0a0f";
      let themeMeta = document.querySelector('meta[name="theme-color"][data-storefront]') as HTMLMetaElement | null;
      if (!themeMeta) {
        themeMeta = document.createElement("meta");
        themeMeta.name = "theme-color";
        themeMeta.setAttribute("data-storefront", "1");
        document.head.appendChild(themeMeta);
      }
      themeMeta.content = primary;
      // Manifest link (per-tenant via query string; manifest file resolves slug)
      let manifestLink = document.querySelector('link[rel="manifest"][data-storefront]') as HTMLLinkElement | null;
      if (!manifestLink) {
        manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        manifestLink.setAttribute("data-storefront", "1");
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = `/order-manifest.webmanifest?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(company)}&color=${encodeURIComponent(primary)}`;
      // Register the storefront service worker scoped to /order/ -------------
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/order-sw.js", { scope: "/order/" }).catch(() => {
          /* best-effort; storefront still works without SW */
        });
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  // Persist cart
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY(slug), JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart, slug]);

  // Cart ops --------------------------------------------------------------
  const items = data?.menu?.items || [];
  const cats = data?.menu?.categories || [];
  const itemById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const filteredItems = useMemo(
    () => (activeCat ? items.filter((i) => i.category_id === activeCat) : items).filter((i) => i.is_available !== false),
    [items, activeCat],
  );
  const addItem = useCallback((id: string) => {
    setCart((c) => {
      const ex = c.find((l) => l.id === id);
      if (ex) return c.map((l) => (l.id === id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { id, quantity: 1 }];
    });
  }, []);
  const removeItem = useCallback((id: string) => {
    setCart((c) => c.flatMap((l) => (l.id === id ? (l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : []) : [l])));
  }, []);
  const qtyOf = (id: string) => cart.find((l) => l.id === id)?.quantity || 0;
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartSubtotal = cart.reduce((s, l) => s + l.quantity * (itemById[l.id]?.price || 0), 0);
  const tax = Math.round(cartSubtotal * 0.13 * 100) / 100;     // 13% GST shown to user; server is authoritative
  const total = cartSubtotal + tax;
  const cur = data?.currency || "";

  // Submit ---------------------------------------------------------------
  const handleSubmit = async () => {
    if (!data || !cart.length) return;
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setSubmitErrText("Please enter your name and phone."); return;
    }
    if (form.order_type === "delivery" && !form.address.trim()) {
      setSubmitErrText("Please enter a delivery address."); return;
    }
    setSubmitErrText("");
    setSubmitState("submitting");
    try {
      const idemKey = `pwa-${slug}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const payload = {
        p_payload: {
          tenant_id: slug,
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          order_type: form.order_type,
          source: "pwa",
          notes: form.order_type === "delivery" ? `Address: ${form.address.trim()}` : null,
          idempotency_key: idemKey,
          items: cart.map((l) => ({ item_id: l.id, quantity: l.quantity })),
        },
      };
      const { data: rpcData, error } = await supabase.rpc("place_bbq_order", payload);
      if (error) throw error;
      setConfirmed(rpcData as any);
      setCart([]);
      try { localStorage.removeItem(STORAGE_KEY(slug)); } catch { /* ignore */ }
      setPhase("confirmed");
      setSubmitState("idle");
    } catch (e: any) {
      setSubmitErrText(e?.message || "Could not place the order. Please try again.");
      setSubmitState("error");
    }
  };

  // -------------------- render --------------------
  if (loadErr) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Storefront unavailable</h1>
        <p style={{ color: "#666" }}>{loadErr}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#666" }}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span style={{ marginLeft: 8 }}>Loading menu…</span>
      </div>
    );
  }
  const primary = data.branding?.primary_color || "#7c2d12";
  const company = data.branding?.company_name || data.company || slug;

  if (phase === "confirmed" && confirmed) {
    return (
      <div data-testid="storefront-confirmed" style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 0" }}>
            <CheckCircle2 className="h-16 w-16" style={{ color: "#16a34a" }} />
            <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 12 }}>Order placed!</h1>
            <p style={{ color: "#666", marginTop: 4 }}>
              Order #<strong>{confirmed.order_number}</strong> · {fmtPrice(confirmed.total || 0, cur)}
            </p>
            <p style={{ color: "#666", fontSize: 14, marginTop: 12 }}>
              Your order is with the kitchen at {company}. We'll be in touch shortly on the number you provided.
            </p>
            {confirmed.ingredients_consumed && confirmed.ingredients_consumed.length > 0 && (
              <details style={{ marginTop: 24, fontSize: 12, color: "#888", textAlign: "left", width: "100%" }}>
                <summary style={{ cursor: "pointer" }}>Kitchen ingredient consumption (demo proof)</summary>
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  {confirmed.ingredients_consumed.map((c, i) => (
                    <li key={i}>{c.qty} {c.unit} · {c.ingredient}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <button
            data-testid="storefront-confirmed-new"
            onClick={() => { setPhase("menu"); setConfirmed(null); setForm({ customer_name: "", customer_phone: "", order_type: "delivery", address: "" }); }}
            style={{ width: "100%", marginTop: 16, padding: "14px 16px", background: primary, color: "white", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" }}
          >
            Order again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header ---------------------------------------------------------- */}
      <header style={{ background: primary, color: "white", padding: "18px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        {phase === "checkout" && (
          <button data-testid="storefront-back" onClick={() => setPhase("menu")} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: 4 }} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{phase === "checkout" ? "Checkout" : company}</h1>
          {phase === "menu" && data.branding?.short_description && (
            <p style={{ fontSize: 12, opacity: 0.85, margin: "2px 0 0" }}>
              {(data.branding.short_description || "").slice(0, 60)}…
            </p>
          )}
        </div>
        <Utensils className="h-5 w-5" />
      </header>

      {/* MENU phase ----------------------------------------------------- */}
      {phase === "menu" && (
        <>
          {/* category tabs */}
          <nav data-testid="storefront-categories" style={{ display: "flex", gap: 8, overflowX: "auto", padding: 12, background: "white", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 56, zIndex: 9 }}>
            {cats.map((c) => (
              <button
                key={c.id}
                data-testid={`storefront-cat-${c.id}`}
                onClick={() => setActiveCat(c.id)}
                style={{
                  padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: activeCat === c.id ? primary : "#f3f4f6",
                  color: activeCat === c.id ? "white" : "#111",
                  fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {c.name}
              </button>
            ))}
          </nav>

          {/* item list */}
          <ul data-testid="storefront-items" style={{ listStyle: "none", padding: 12, margin: 0, paddingBottom: cartCount > 0 ? 96 : 24 }}>
            {filteredItems.map((it) => {
              const q = qtyOf(it.id);
              return (
                <li key={it.id} data-testid={`storefront-item-${it.id}`} style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{it.name}</h3>
                      {it.popular && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>POPULAR</span>}
                    </div>
                    {it.description && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666", lineHeight: 1.4 }}>{it.description}</p>}
                    <p style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 700, color: primary }}>{fmtPrice(it.price, cur)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "center" }}>
                    {q > 0 ? (
                      <>
                        <button data-testid={`storefront-minus-${it.id}`} onClick={() => removeItem(it.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${primary}`, background: "white", color: primary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Remove one">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span data-testid={`storefront-qty-${it.id}`} style={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{q}</span>
                        <button data-testid={`storefront-plus-${it.id}`} onClick={() => addItem(it.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${primary}`, background: primary, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Add one more">
                          <Plus className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button data-testid={`storefront-add-${it.id}`} onClick={() => addItem(it.id)} style={{ padding: "8px 14px", borderRadius: 8, background: primary, color: "white", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Add
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
            {filteredItems.length === 0 && (
              <li style={{ padding: 24, textAlign: "center", color: "#888" }}>No items in this category.</li>
            )}
          </ul>

          {/* sticky cart bar */}
          {cartCount > 0 && (
            <div data-testid="storefront-cart-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: primary, color: "white", padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 -4px 12px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShoppingBag className="h-5 w-5" />
                <span style={{ fontWeight: 600 }}>{cartCount} item{cartCount > 1 ? "s" : ""}</span>
                <span style={{ opacity: 0.8 }}>· {fmtPrice(cartSubtotal, cur)}</span>
              </div>
              <button data-testid="storefront-go-checkout" onClick={() => setPhase("checkout")} style={{ background: "white", color: primary, border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Checkout →
              </button>
            </div>
          )}
        </>
      )}

      {/* CHECKOUT phase -------------------------------------------------- */}
      {phase === "checkout" && (
        <div style={{ padding: 16, paddingBottom: 120 }}>
          <section data-testid="storefront-checkout" style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Your details</h2>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#444", marginBottom: 4 }}><User className="h-3 w-3" /> Name</span>
              <input data-testid="storefront-input-name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Your name" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }} />
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#444", marginBottom: 4 }}><Phone className="h-3 w-3" /> Phone</span>
              <input data-testid="storefront-input-phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="+92 300 1234567" type="tel" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15 }} />
            </label>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#444", marginBottom: 4, display: "block" }}>Order type</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["delivery", "pickup", "dine_in"] as const).map((t) => (
                  <button
                    key={t}
                    data-testid={`storefront-type-${t}`}
                    onClick={() => setForm({ ...form, order_type: t })}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: 8, border: `1px solid ${form.order_type === t ? primary : "#d1d5db"}`,
                      background: form.order_type === t ? primary : "white",
                      color: form.order_type === t ? "white" : "#111",
                      cursor: "pointer", fontWeight: 600, fontSize: 13, textTransform: "capitalize",
                    }}
                  >
                    {t.replace("_", "-")}
                  </button>
                ))}
              </div>
            </div>
            {form.order_type === "delivery" && (
              <label style={{ display: "block", marginBottom: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#444", marginBottom: 4 }}><MapPin className="h-3 w-3" /> Delivery address</span>
                <textarea data-testid="storefront-input-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House #, Street, Area, City" rows={2} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical" }} />
              </label>
            )}
          </section>

          {/* Cart summary */}
          <section data-testid="storefront-summary" style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Your order</h2>
            {cart.map((l) => {
              const it = itemById[l.id]; if (!it) return null;
              return (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 14 }}>
                  <span>{l.quantity} × {it.name}</span>
                  <span style={{ fontWeight: 600 }}>{fmtPrice(it.price * l.quantity, cur)}</span>
                </div>
              );
            })}
            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666", marginBottom: 4 }}>
              <span>Subtotal</span><span>{fmtPrice(cartSubtotal, cur)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666", marginBottom: 8 }}>
              <span>Tax (13% GST)</span><span>{fmtPrice(tax, cur)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700 }}>
              <span>Total</span><span data-testid="storefront-total">{fmtPrice(total, cur)}</span>
            </div>
          </section>

          {/* Payment notice */}
          <section style={{ background: "#fef3c7", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13, color: "#78350f" }}>
            <p style={{ margin: 0 }}><strong>Payment:</strong> Cash on delivery (default). Online payment coming soon.</p>
          </section>

          {submitErrText && (
            <div data-testid="storefront-err" style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{submitErrText}</div>
          )}

          {/* Sticky place order button */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", padding: 14, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
            <button
              data-testid="storefront-place-order"
              disabled={submitState === "submitting" || cart.length === 0}
              onClick={handleSubmit}
              style={{ width: "100%", padding: 14, background: primary, color: "white", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: submitState === "submitting" ? "wait" : "pointer", opacity: cart.length === 0 ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {submitState === "submitting" ? <><Loader2 className="h-5 w-5 animate-spin" /> Placing order…</> : <>Place order · {fmtPrice(total, cur)}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
