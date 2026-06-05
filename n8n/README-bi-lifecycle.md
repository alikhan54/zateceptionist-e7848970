# 420 Jewellery — Founder One-Page BI + Lifecycle/Dues agents (Project JX, Phase 13)

Two NEW jewellery-gated scheduled n8n workflows. **Additive; no existing/sacred workflow touched;
both created INACTIVE.** WhatsApp delivery is DEFERRED (Legacy has no connected channel) — every
payload is **built and wired, never sent** (gated `broadcast_enabled=false`).

Both follow the same shape: `Schedule` + `Webhook` (test trigger, `responseMode: lastNode`) →
`Get jewellery tenants` (`tenant_config WHERE industry='jewellery'` = the gate) → `Collect` →
`[HTTP read (tenant_id=in.(slugs)) → Collect-rows]*` → `Compute` (group by tenant, build payload) →
`Gate (IF broadcast_enabled)` → {`Send` (graph.facebook, never) | `Done` (returns result)}.
Supabase via HTTP Request + `supabaseApi` cred (`gQE27pII1aZEzHbn`) + retry; multi-tenant in one pass
via `tenant_id=in.(<slugs>)`; `alwaysOutputData` on reads so empty sets still produce a result.

## 1. Founder One-Page BI — `jx-founder-onepage.json` (schedule: daily)
Per jewellery tenant, computes the owner's daily snapshot:
- **Cash today** = Σ `jx_sale.paid_cash` for today
- **Gold position** = Σ `jx_gold_ledger.fine_grams` grouped by karat (signed)
- **Sales today** = count + Σ `net_bill`
- **Orders due** today/tomorrow = `jx_order` (status≠delivered, `delivery_date` ≤ tomorrow) with balances
- **Low metal stock** = karats whose fine position < `LOW_GRAMS` (configurable, default 100g)
- **Top sellers / slow movers** = `jx_sale_item` velocity vs unsold in-stock `jx_item`
- **Restock suggestion** (from low-stock + top seller)
→ builds the one-page owner WhatsApp message (to the tenant's number); **not sent**.

## 2. Lifecycle / Dues — `jx-lifecycle-dues.json` (schedule: every 6h)
Per jewellery tenant, builds reminder payloads (these give the Phase-7/9 *prepared* notifications a sender):
- **Outstanding balance** — `jx_order` (status≠delivered AND balance>0) → balance reminder (flags "due soon" when `delivery_date` ≤ tomorrow)
- **Repair ready** — `jx_repair` status='ready' → the Phase-9 "Good news — your repair is ready for pickup at Legacy Jewellers!" message
- Recipient resolved from `jx_customer` (phone) by `customer_id`
→ builds WhatsApp payloads; **not sent**.

## Proof (Phase 13)
Content was proven by seeding test data and running the agents' EXACT compute logic against the live
DB (direct 5432), because n8n's API was down during the session (sustained Supabase pooler
degradation / T20 — "Database connection timed out"). All PASS:
- Founder: gating→Legacy only; **cash_today=75000** (2 seeded sales); **gold position 22K=50 / 24K=20** (= ledger); **orders due lists ORD-P13DUE** (tomorrow, bal 50000); WhatsApp payload built, **not sent**.
- Lifecycle: **balance reminder for ORD-P13BAL (210,600)** + **repair-ready reminder** built; payloads carry WhatsApp messages, **not sent**; isolation (Legacy only).
- Seed cleaned up (verified 0 rows left).

The **prod POST** (create both INACTIVE) + the **webhook live-run** (`trigger → parse output → assert`)
+ the **no-existing-workflow-modified** check run automatically via `p13_post_test.py` the moment
n8n's API returns healthy (auto-retry watcher). The workflow IDs are recorded in STATE_JEWELRY.md once created.

## Deploy / dependencies
- **Deploy = activate each workflow** (registers schedule + webhook) + connect a WhatsApp channel + flip `broadcast_enabled=true` to actually send.
- WhatsApp delivery needs Legacy's connected Meta WhatsApp number (separate setup).

## Deferred to Phase 13b
- Photo-to-listing (image-AI + Instagram connection)
- Invoice-PDF generation + WhatsApp delivery agent

## Rollback
Delete the two new workflows (additive, inactive). No existing workflow touched.
