# STATE_JEWELRY — Gold/Jewelry Vertical Build State

> Living state tracker for the Gold/Jewelry industry vertical (tenant: Legacy Jewellers).
> Phase-by-phase progress, decisions, and open questions. Updated at the end of each session.

## Tenant target
- **Name:** Legacy Jewellers
- **Slug (recommended):** `legacy-jewellers`
- **Industry key (recommended):** `jewellery` — convention VERIFIED lowercase/snake_case; no existing jewelry tenant/template (free choice, use consistently everywhere). [DISCOVERY_FINDINGS §0.5]
- **Module flag:** ~~`jewelry_module`~~ **DROPPED for vertical gating** — gating is by `industry === 'jewellery'` boolean (naturally OFF for all existing tenants); a `features` flag is redundant. Reserve one only for a fail-closed *sub-feature* (accounting precedent). [DISCOVERY_FINDINGS §0.3]
- **Currency:** PKR (Pakistani Rupee), TZ `Asia/Karachi` — ledger built FRESH (no `accounting_*` reuse). [DISCOVERY_FINDINGS §0.4]

## Phase status

> Phase numbering follows the operator's sequencing: P0 discovery → **P1 provision tenant+login** → (later) schema/RLS, gating, PKR ledger; the **jewellery vertical UI is P4**.

| Phase | Description | Status | Date |
|---|---|---|---|
| 0 | Discovery (read-only): schema, gating, onboarding/login, accounting reuse, ops finance, templates, risk | ✅ COMPLETE | 2026-06-04 |
| 1 | **Provision Legacy Jewellers `tenant_config` row + owner auth login** (FIRST production change) | ✅ VERIFIED | 2026-06-04 |
| 2 | **Jewelry calculation engine** — pure TS `src/lib/jewelry/calc.ts` + unit tests (NO production change) | ✅ VERIFIED | 2026-06-04 |
| 3 | **`jx_*` schema (15 tables) + RLS + Legacy seed** (production DDL — additive, reversible) | ✅ VERIFIED | 2026-06-04 |
| 4 | **Jewelry vertical FE** — `isJewellery` gating + Jewelry sidebar + Command Center + Gold Rate (built + tested on LOCAL preview; **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-04 |
| 5 | **Inventory/Stock page** — item entry + live calc valuation + stone sub-grid + tag/barcode + list/search/edit → `jx_item`/`jx_stone` (LOCAL; **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-04 |
| 6 | **Point of Sale** — atomic sale via `jx_create_sale` RPC + live calc + old-gold (no double-count) + mixed tender + itemized invoice → `jx_sale`/`jx_sale_item`/`jx_old_gold`/`jx_gold_ledger` + mark sold (RPC LIVE in DB; FE LOCAL, **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-04 |
| 7 | **Orders/Custom** — bespoke spec + FIX-RATE lock + advance + status pipeline via `jx_create_order` RPC → `jx_order`/`jx_order_item` (RPC LIVE in DB; FE LOCAL, **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-04 |
| 8a | **PKR double-entry GL** — `jx_account`/`jx_voucher`/`jx_voucher_line` + COA + `jx_create_sale` posts a BALANCED voucher atomically + Gold Position/Trial Balance/Cash Book reports (GL tables + v2 RPC LIVE in DB; FE LOCAL, **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-05 |
| 8b | **Orders→GL** — advance voucher at booking (`jx_create_order` replace) + `jx_finalize_order` (order→sale, clears advance, `jx_create_sale` reused unchanged) + `jx_order.finalized_sale_id` (DDL+RPC LIVE in DB; FE LOCAL, **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-05 |
| 9 | **Workshop/Karigar + Repairs + Loose Stones** — `jx_record_worker_txn` RPC (issue/receive/making-payment, cash-basis) + karigar gold balance + wastage anomaly flag + balanced making-payment voucher; lighter Repairs (status pipeline) + Loose Stones CRUD (RPC LIVE in DB; FE LOCAL, **NOT deployed**) | ✅ VERIFIED (local) | 2026-06-05 |
| 10 | **Agent context + jewellery template** — add `industry_templates['jewellery']` row + populate Legacy's business_profile/personas/services/ai_model_configs/onboarding via `initialize_new_tenant` + direct seed of verified site data; onboarding_completed=true. **REAL CONFIG — KEPT.** n8n OB scrape investigated + intentionally SKIPPED (direct seed). Optional FE: jewellery added to onboarding `constants.ts`. **NOT deployed.** | ✅ VERIFIED | 2026-06-05 |
| (later) | Order-cancel refund voucher (Dr Advances/Cr Cash — **stubbed/not built**, small follow-up); perpetual COGS/inventory valuation (deferred); Karigar Payable 2200 accrual (deferred — cash-basis shipped); remaining pages (Customers); **deploy P4–P10** | NOT STARTED | — |

## Phase 1 — provisioning (VERIFIED 2026-06-04)
**New tenant (LIVE in production):**
- `tenant_config.id` (UUID) = **`f1abef0c-43e1-4589-8746-9a890f7718fd`**
- slug `legacy-jewellers` · industry **`jewellery`** · currency **PKR** · tz `Asia/Karachi` · country `PK` · `subscription_status=active` · `primary_language=en` · `onboarding_completed=false` (as-provisioned) · features `{hr,sales,voice,marketing}` · branding **placeholder** gold `#C9A227` / charcoal `#2B2B2B` (no packet; cosmetic, easily UPDATEd)
- Owner auth user: `auth.users.id` = **`43878ac8-9877-4e89-8d0d-86e4d1e13283`**, email `info@thelegacyjewellers.com`, `email_confirm=true`, `user_metadata.tenant_id=legacy-jewellers`
- `public.users.id` = `97635d3a-2d88-4e92-9fb3-a5033af1fbcd`, tenant `legacy-jewellers`, role **admin**, active; `user_roles` → `legacy-jewellers`/admin
- **Trigger path = BIND** (createUser fired 0.4s after tenant_config INSERT) → **no phantom**

**How (replicated SL's proven flow):** `repo/tenants/legacy-jewellers/deployment/provision-legacy-jewellers.py` (clone of SL `01-tenant-config-insert.sql` + `21-day4-auth-users.py`, combined so the <300s BIND window fires). Writes via **direct 5432 (primary)** — T18 had pooler 6543 routed read-only at commit time. Result JSON (redacted): `deployment/provision-result.json`. Secret temp password: gitignored `D:/420-system/tenants/legacy-jewellers/.credentials/` (outside repo).

**Evidence (all PASS):**
- Script gates **V1–V8 PASS**; independent DB re-read (primary) confirmed every field.
- `tenant_config` 43→**44**; phantom (`info-%`)=**0**; legacy users=**1**.
- **Isolation:** other-tenant users **46 unchanged**; control `zateceptionist` row **md5 byte-identical** (`5e5aa84195787fc12d435a88cbcbb11f`) before/after (incl. across a temporary onboarding-flag flip).
- **Playwright login (production):** `info@thelegacyjewellers.com` authenticates → lands on `/dashboard`; fresh tenant correctly shows the onboarding wizard. With onboarding temporarily completed, the sidebar shows **all horizontals** (Dashboard/Inbox/Appointments/Customers/Tasks + Sales AI/Marketing AI/HR AI/Operations/Communications + AI Command/OMEGA/Analytics/Settings) and **NO industry vertical** (cf. bbqtonight which shows a RESTAURANT section). Flag reverted to false after capture. Control `bbqtonight` login unaffected.
- **Note:** `onboarding_completed` was toggled true→(capture)→false on the legacy row only (control md5 unchanged throughout); left **false** so the client gets the standard onboarding first-run. Operator may set it true if a direct-to-app handover is preferred.

## Phase 2 — calculation engine (VERIFIED 2026-06-04)
Pure, side-effect-free TypeScript module — proves the math BEFORE anything prices money. **No production changes** (new namespaced files only).

- **Module:** `src/lib/jewelry/calc.ts` — `pureWeight`, `gramsToTola`/`tolaToGrams`, `saleLineTotal`, `applyTax`, `oldGoldCredit`, `saleTotal`, `goldLedgerFineGrams`, `karatFactor`, `round`/`round2`/`round3`; constants `KARAT_FACTOR` (exact karat/24), `TOLA_GRAMS=11.6638`.
- **Tests:** `src/lib/jewelry/calc.test.ts` — run with Node's native runner (`node --test src/lib/jewelry/calc.test.ts`); Node v24.14 strips TS types + `node:test`/`node:assert` are built in. **No test runner added** → package.json/lockfile untouched, no FE-PACKAGE lock needed.
- **Result: 15/15 pass, 0 fail.** Pinned proofs: A line subtotal **260600** (wastage 0.8, metal 237600, making 8000, stone 15000) & pureWeight(10,22)≈**9.1667**; B fixed-making subtotal **95000**; C old-gold credit **157666.67** → saleTotal netBill **102573.33** / cashBalance **7426.67**; D tola round-trip; E making-tax **240**. Extras: generic karat/24, qty×rate stones, polish+other, value/fixed_per_gram tax, deduction old-gold, signed ledger grams, float-drift rounding.
- **Key correctness decision:** `KARAT_FACTOR[22] = 22/24` (exact, displays ≈0.916667) — using the rounded 0.916667 would yield old-gold credit 157666.72, not the spec's 157666.67. Rounding applied only at boundaries (money 2dp, weights 3dp); intermediates keep full precision. Tax always derived from the passed `TaxRule` (never hard-coded).
- **Flexibility for later tuning (no rewrite):** optional `makingBasis`/`polishBasis` ('net'|'gross'), configurable `tola` param, `wastePct`/`deductionPct` defaults. `saleLineTotal` additionally returns `fineGrams` (pure content) to feed the gold ledger + fixed_per_gram tax.

## Phase 3 — schema + RLS + seed (VERIFIED 2026-06-04)
Production DDL — **15 NEW `jx_*` tables only**, additive & reversible. No existing table touched (preview proved every op targets `public.jx_*`). Applied via **direct 5432 (primary)** — pooler 6543 is T18-prone.

- **Migrations (committed):** `repo/supabase/migrations/jx-001-schema.sql` (15 tables + indexes + RLS), `jx-002-seed-legacy.sql` (Legacy seed), `jx-001-rollback.sql` (DROP all 15, CASCADE).
- **15 tables:** `jx_setting, jx_gold_rate, jx_customer, jx_worker, jx_tax_rule, jx_item, jx_stone, jx_sale, jx_sale_item, jx_order, jx_order_item, jx_old_gold, jx_worker_txn, jx_repair, jx_gold_ledger`. Common: `id` uuid PK, `tenant_id` TEXT NOT NULL, `created_at`/`updated_at`. Columns aligned with `calc.ts` (e.g. `net_weight`, `waste_pct`, `line_total`, `net_bill`, `cash_balance`, `old_gold_credit`, `paid_used_gold_value`, `fine_grams`, `zero_deduction`). `jx_item` UNIQUE(tenant_id, tag_number); CHECKs on `jx_tax_rule.basis` + `jx_gold_ledger.direction`; FKs within `jx_*`. Ledger posting tables deferred to the ledger phase (per plan).
- **RLS:** every table has the canonical accounting_invoices **5-policy block** (`rls_master_admin_all` + `rls_tenant_read`/`write`/`update`/`delete`, `tenant_id = get_user_tenant_id()`, slug-keyed, `TO public`). Verified exactly 5 policies/table.
- **Seed (Legacy only):** `jx_setting` 1 row (PKR, tola 11.6638, PSQCA, WhatsApp +923402786222, 10 collections); `jx_gold_rate` 4 rows (24/22/21/18) `source='placeholder'`, `rate_per_gram=1` — **NOT real rates** (shop sets real rates in P4).
- **PROOF — 20/20 checks (executed):**
  - Structural (14/14): 15 tables exist, RLS enabled on all 15, exactly the 5 canonical policies each, seed 1+4.
  - **RLS isolation BOTH directions, real auth path** — DB-level (`SET ROLE authenticated` + real `sub`) AND REST (password-grant JWT via PostgREST), 6/6 REST:
    - Legacy (`get_user_tenant_id='legacy-jewellers'`): SELECT sees its seed (1 setting, 4 rates); INSERT own row allowed (rolled back / deleted — no trace).
    - Control bbqtonight (`bbqtonight-547b8e1b`): SELECT `jx_*` → **0 rows**; cross-tenant INSERT → **DENIED** `42501 "new row violates row-level security policy"`.
  - Final state clean: `jx_customer=0` (no test rows persisted), `jx_setting=1`, `jx_gold_rate=4`.
- **Rollback path proven-by-construction:** `jx-001-rollback.sql` drops only the 15 `jx_*` tables (not needed — all gates passed).

## Phase 4 — jewelry vertical frontend (VERIFIED on LOCAL preview 2026-06-04 — NOT DEPLOYED)
First frontend change. Built + tested on a **local Vite preview** (`npm run dev`, localhost:8081, live Supabase). **Not merged to main, not published in Lovable** — production is unaffected. Mirrors the clinic vertical (shadcn/Card + Tailwind, native look).

- **New files:** `src/pages/jewelry/Dashboard.tsx` (Command Center), `src/pages/jewelry/GoldRate.tsx`, `src/hooks/useJewelry.ts`.
- **Surgical edits (additive):** `src/contexts/TenantContext.tsx` (+`isJewellery = industry==='jewellery'`: interface, const, value — 3 lines), `src/components/NavigationSidebar.tsx` (+`isJewellery` destructure, +`jewellerySection` {Command Center, Gold Rate}, +render block gated `isJewellery`, between HR AI and the other verticals), `src/App.tsx` (+2 lazy routes `/jewelry/dashboard` + `/jewelry/gold-rate` + redirect). **No existing section/route/file removed or restructured.** No feature flag. No package.json/lockfile change.
- **Hook correctness:** `useJewelry` filters jx_* by `tenantId` (the SLUG from `useTenant()`), relies on RLS, sets `tenant_id=slug` on insert — NOT `tenantConfig.id` (the known zero-rows UUID bug). Reuses `calc.ts` for tola math (per-tola = per-gram × grams/tola via `tolaToGrams`).
- **Command Center cards:** Gold Position (fine g by karat from `jx_gold_ledger`; empty→0g "No gold movements yet"), Today's Gold Rate (latest per karat; placeholder→amber "not real yet" banner+badge prompting to set it), Cash Today (`jx_sale` today; empty→PKR 0), Orders Due (`jx_order` pending; empty→0), Agent Feed (placeholder). Each card has a substantive value line. Graceful empty states (fresh tenant) — no crash, no console errors.
- **PROOF (executed, local preview):**
  - **Manual rate save:** filled 24/22/21/18 per-gram (24750 for 22K) → Save → DB `jx_gold_rate` rows flipped to **`source='manual'`** with correct per-tola (24750×11.6638=288679.05) → reload Command Center shows **PKR 24,750/g 22K "Manual rate set"**, placeholder banner gone.
  - **UI isolation BOTH directions (Playwright, screenshots):** Legacy → sees **Jewelry** section + all horizontals (Sales/Marketing/HR/Operations/Communications), **0 other verticals**; control bbqtonight → **NO Jewelry** section, RESTAURANT + horizontals intact (no regression), and hitting `/jewelry/dashboard` directly leaks **0** of Legacy's data (RLS). No console errors.
  - Screenshots: `.tmp_jx/shots/p4-legacy-command-center-after-save.png`, `p4-control-bbqtonight.png`, `p4-legacy-gold-rate-*.png` (local, not committed).
- **State restored after test:** Legacy `onboarding_completed` reverted true→false; `jx_gold_rate` restored to placeholder (test rates were fabricated — the shop sets its own real rates). Live DB back to as-provisioned; only the FE branch carries changes.
- **Deploy = a later step** (merge `feat/jx-p4`→main / Lovable publish). Note: the welcome-tutorial modal + onboarding gate are existing platform behaviors; a fresh jewellery tenant sees onboarding first (expected).

## Phase 5 — Inventory/Stock page (VERIFIED on LOCAL preview 2026-06-04 — NOT DEPLOYED)
Item entry with **live calc.ts valuation** + stone sub-grid + tag/barcode + list/search/edit, writing `jx_item`/`jx_stone`. Frontend + DB writes only (no DDL/n8n). Mirrors clinic CRUD; shadcn/Tailwind, native. Tested on local Vite preview (localhost:8081, live Supabase). **Not merged/published.**

- **New files:** `src/pages/jewelry/Inventory.tsx`, `src/hooks/useJewelryInventory.ts`.
- **Surgical edits (additive):** `NavigationSidebar.tsx` (+"Inventory" item in the EXISTING Jewelry section, icon `Package`), `App.tsx` (+lazy route `/jewelry/inventory`). No other section/route touched. No package.json/lockfile change.
- **Hook (`useJewelryInventory`):** jx_item/jx_stone CRUD filtered by `tenantId` (slug), RLS-reliant, `tenant_id=slug` on insert (never `tenantConfig.id`). `createItem`/`updateItem` (update replaces linked stones)/`deleteItem` (deletes stones then item)/`fetchStones`. Photo upload reuses the shared **`media`** storage bucket → `jx_item.photo_urls` (clean reusable pattern existed; implemented, not exercised by the automated test).
- **Live valuation reuses calc.ts** (`pureWeight`, `saleLineTotal`) — no re-implemented math. Form shows pure weight, valuation-at-current-rate (with metal/making/polish/stones breakdown), summed stone weight, and item_cost (when purchase_rate set). `qty>1` creates N rows with suffixed tags (jx_item is per-piece — no qty column).
- **PROOF (executed, local preview — calc test A inputs @ 22K rate 22000):**
  - Live calc matched calc.ts EXACTLY: **Pure 9.1667 g** (`pureWeight(10,22)`), **Valuation PKR 260,600** (breakdown metal 237,600 · making 8,000 · polish 0 · stones 15,000 = `saleLineTotal` A). 
  - **DB rows correct:** `jx_item` (Gold/22K, net 10, **pure_weight 9.167**, stone_weight 0.5, status `in_stock`) + linked `jx_stone` (price 15000, weight 0.5).
  - **Edit persists:** changed size→`RING-7` via row-click edit → DB confirmed.
  - **Isolation both directions:** control bbqtonight sidebar has **no Inventory/Jewelry** (Restaurant intact), `/jewelry/inventory` leaks **no** Legacy tag, and a DB `SET ROLE authenticated` as bbq sees **0** legacy `jx_item`. No console errors.
  - Screenshots: `.tmp_jx/shots/p5-legacy-item-form.png` (live calc panel), `p5-legacy-list.png`, `p5-control-bbq.png` (not committed).
- **Cleanup confirmed:** test item+stone deleted (legacy jx_item=0, jx_stone=0); 22K rate restored to placeholder; `onboarding_completed` reverted to false. Live DB back to as-provisioned.
- **Photo-pattern note:** uses the existing `media` bucket (same as clinic photos) — no new storage setup; photo upload wired but optional (test created an item without a photo).

## Phase 6 — Point of Sale (VERIFIED on LOCAL preview 2026-06-04 — RPC live in DB; FE NOT deployed)
Direct sale: pick in-stock items → live calc.ts pricing (editable rate/waste/making) → old-gold credit → tax+discount → mixed tender → **atomic save** via the `jx_create_sale` RPC → itemized printable invoice. PKR double-entry GL is **Phase 8** (not built here).

- **RPC (additive DDL, LIVE in prod DB via direct 5432):** `public.jx_create_sale(p_payload jsonb)` — `SECURITY INVOKER` (RLS applies), one transaction: generate per-tenant `sale_no` (INV-NNNNN), INSERT `jx_sale` + `jx_sale_item[]` + `jx_old_gold?` + `jx_gold_ledger` (one OUT/sold line `reason='sale'`, one IN/old-gold `reason='old_gold_in'`, signed `fine_grams`), UPDATE `jx_item.status='sold'`. `tenant_id=get_user_tenant_id()` everywhere. File: `repo/supabase/migrations/jx-003-create-sale-rpc.sql` (rollback: `DROP FUNCTION public.jx_create_sale(jsonb)`).
- **New FE files:** `src/pages/jewelry/PointOfSale.tsx`, `src/hooks/useJewelrySales.ts`. **Edits:** `NavigationSidebar.tsx` (+"Point of Sale" in Jewelry section), `App.tsx` (+`/jewelry/pos` route). No package.json/lockfile change.
- **Old-gold model (no double-count):** calc.ts `saleTotal` subtracts the old-gold credit from `net_bill`; tender = cash/card/cheque only (`usedGoldValue=0`); `cash_balance=(cash+card+cheque)−net_bill`. Old gold shown as a CREDIT line, never a tender. All money via calc.ts; RPC only persists.
- **PROOF (executed, local preview — EXACT to the rupee):**
  - **Sale 1 (no old gold):** line **260,600** (= calc.ts `saleLineTotal` A @22000), net_bill **260,600**, cash 260,600 → **balance 0**. DB: `jx_sale` INV-00001 (net_bill 260600, paid_used_gold_value 0), `jx_sale_item` present, `jx_gold_ledger` OUT `reason='sale'` **−9.167**, `jx_item` P6-ITEM-1 **status='sold'**. Invoice rendered.
  - **Sale 2 (zero-deduction old gold = calc test C):** old-gold credit **157,666.67**; tax-on-making 3% → 240; discount 600; **net_bill 102,573.33** AND **cash_balance 7,426.67** (cash 110,000) — **proves NO double-count** (`paid_used_gold_value=0`). DB: `jx_old_gold` (8g 22K, credit 157666.67, zero_deduction=true), `jx_gold_ledger` BOTH OUT **−9.167** (sale) AND IN **+7.333** (old_gold_in); SUM(fine_grams) net position = −11.001.
  - **Isolation both directions:** control bbqtonight has **no Point of Sale / no Jewelry** section; SET-ROLE-authenticated as bbq sees **0** legacy `jx_sale`/`jx_gold_ledger` and a direct INSERT of a legacy `jx_sale` is **DENIED by RLS** (so the SECURITY-INVOKER RPC cannot write Legacy rows when called by another tenant). No console errors.
  - Screenshots: `.tmp_jx/shots/p6-sale1-invoice.png`, `p6-sale2-invoice.png`, `p6-control-bbq.png` (not committed).
- **Cleanup confirmed:** all test sales/items/old_gold/ledger/stones deleted (legacy jx_sale=0, jx_gold_ledger=0, jx_item=0); 22K rate restored to placeholder; `onboarding_completed`→false. The `jx_create_sale` function remains live (additive, reversible, no prod caller until P4–P6 deploy).

## Phase 7 — Orders/Custom (VERIFIED on LOCAL preview 2026-06-04 — RPC live in DB; FE NOT deployed)
Bespoke orders: spec lines → calc.ts estimate at **fixed_rate** (when locked) else live rate → advance + delivery date → **status pipeline** (booked → in_workshop → ready → delivered/cancelled). Records `jx_order`/`jx_order_item` via `jx_create_order`. **SCOPE: no final sale, no gold ledger, no vouchers** (order→sale finalization + GL = Phase 8). Notifications **prepared/displayed only** (Phase 13 sends).

- **RPC (additive, LIVE in DB via direct 5432):** `public.jx_create_order(p_payload jsonb)` — `SECURITY INVOKER`, one txn: per-tenant `order_no` (ORD-NNNNN) + `jx_order` + `jx_order_item[]`; `tenant_id=get_user_tenant_id()`. File `repo/supabase/migrations/jx-004-create-order-rpc.sql` (rollback `DROP FUNCTION public.jx_create_order(jsonb)`).
- **New FE files:** `src/pages/jewelry/Orders.tsx`, `src/hooks/useJewelryOrders.ts`. **Edits:** `NavigationSidebar.tsx` (+"Orders" in Jewelry section), `App.tsx` (+`/jewelry/orders`). No package.json/lockfile change.
- **FIX-RATE model:** toggling fix-rate snapshots the current live `jx_gold_rate` for the line's karat into `jx_order.fixed_rate`; estimates use `fixed_rate` when `is_fix_rate` else live. Detail view recomputes line via calc.ts `saleLineTotal` (stored making/polish/stone as fixed charges) at the effective rate.
- **PROOF (executed, local preview):**
  - **Booking:** 22K/net 10/waste 8/making 800/stone 15000, fix-rate ON → note "Rate locked at PKR 22,000/g"; line est **260,600** (calc.ts A @22000); net_amount **260,600**; advance 50,000 → **balance 210,600**. DB: `jx_order` ORD-00001 `is_fix_rate=true`, `fixed_rate=22000`, advance 50000, net 260600, balance 210600; `jx_order_item` line_total 260600.
  - **FIX-RATE LOCK (the USP):** changed live 22K → 24,000 via the Gold Rate page, reopened the order → estimate **STILL 260,600** (locked @22000), **NOT 282,200** (what 24,000 would give). Live-rate badge on a fresh line showed 24,000 while the order held 22,000 — visible side-by-side.
  - **Status pipeline:** booked→in_workshop→ready→delivered each persisted (`jx_order.status`); the would-be customer message displayed per status (NOT sent).
  - **Isolation both ways:** control bbqtonight has no Orders/Jewelry; SET-ROLE-authenticated as bbq sees **0** legacy `jx_order` and a direct legacy INSERT is **DENIED by RLS**. No console errors.
  - Screenshots: `.tmp_jx/shots/p7-order-booked.png`, `p7-fixrate-lock.png`, `p7-pipeline.png`, `p7-control-bbq.png` (not committed).
- **Cleanup confirmed:** test order+items deleted (legacy jx_order=0, jx_order_item=0); **all 4 gold rates restored to placeholder** (the Gold Rate UI save upserts every karat, so 24/21/18 had flipped to manual@1 — all reset to placeholder@1); `onboarding_completed`→false. `jx_create_order` remains live (additive, no prod caller until deploy).

## Phase 8a — PKR double-entry GL (VERIFIED on LOCAL preview 2026-06-05 — GL+RPC live in DB; FE NOT deployed)
Fresh double-entry General Ledger; `jx_create_sale` extended to post a **balanced voucher in the same transaction** as the sale; Gold Position + Trial Balance + Cash Book reports. MVP = cash/revenue/tax flows + grams ledger (jx_gold_ledger). **No perpetual COGS/inventory valuation yet** (deferred).

- **DDL (LIVE in DB via direct 5432):** `jx-005-ledger.sql` — `jx_account` (code/name/type/parent), `jx_voucher` (type/date/narration/ref), `jx_voucher_line` (debit/credit) + RLS 5-policy each + **Legacy COA seed (16 accounts — REAL config, kept)**. Rollback `jx-005-rollback.sql`.
- **RPC replace:** `jx-006-create-sale-rpc-v2.sql` — `jx_create_sale(p_payload jsonb, p_prepaid_from_advance numeric DEFAULT 0)`. All Phase-6 steps UNCHANGED; ADDS jx_voucher + balanced jx_voucher_line with **Σdr=Σcr enforced (RAISE EXCEPTION → whole sale rolls back)**. Prior def backed up `.tmp_jx/jx_create_sale_p6.bak.sql`; rollback = drop 2-arg + recreate 1-arg. Voucher rule: Dr Cash (= net_bill − card − cheque − prepaid; underpay → Dr Receivables) + Bank + Advances + Old-Gold-Inventory + Discounts; Cr Gold Sales (Σmetal) + Making + Polish + Stone + Tax.
- **New FE:** `src/pages/jewelry/Reports.tsx`, `src/hooks/useJewelryLedger.ts`. **Edits:** `NavigationSidebar.tsx` (+Reports), `App.tsx` (+`/jewelry/reports`), `Dashboard.tsx` (+Reports link). No package.json/lockfile change.
- **PROOF (executed, local preview + DB) — vouchers BALANCE with exact lines:**
  - **Sale 1** net_bill **260,600**, balance **0** (UNCHANGED from P6). Voucher INV-00001: **Dr Cash 260,600 = Cr Gold Sales 237,600 + Making 8,000 + Stone 15,000** (Σdr=Σcr=260,600).
  - **Sale 2** (cash 110k, old gold 8g 22K zero-ded @21,500, tax-making 3%, discount 600) net_bill **102,573.33**, balance **7,426.67** (UNCHANGED). Voucher INV-00002: **Dr Cash 102,573.33 + Old-Gold-Inv 157,666.67 + Discounts 600 = 260,840 = Cr Gold Sales 237,600 + Making 8,000 + Stone 15,000 + Tax 240** (Σdr=Σcr).
  - **Reports reconcile:** Gold Position 22K net **−11.001 g** (2 sale-OUT −9.167 + 1 old-gold-IN +7.333); **Trial Balance Balanced — Total Dr 521,440 = Cr 521,440**; Cash Book entries 260,600 + 102,573.33 → running **363,173.33**.
  - **Isolation both ways:** control bbqtonight has no Reports/Jewelry; SET-ROLE-authenticated as bbq sees **0** legacy `jx_account`/`jx_voucher`/`jx_voucher_line` and a direct legacy `jx_voucher` INSERT is **DENIED by RLS** (so the SECURITY-INVOKER RPC can't post cross-tenant). No console errors.
  - Screenshot `.tmp_jx/shots/p8-reports.png` (not committed).
- **Cleanup confirmed:** all test sales/items/gold_ledger/vouchers/voucher_lines deleted (legacy jx_sale=0, jx_voucher=0, jx_gold_ledger=0); **COA kept (jx_account=16)**; rates→placeholder; onboarding→false. GL tables + v2 RPC remain live (additive; no prod caller until deploy).

## Phase 8b — Orders wired into the GL (VERIFIED on LOCAL preview 2026-06-05 — DDL+RPC live; FE NOT deployed)
Advance receipt posts a voucher at booking; finalizing a delivered order creates real `jx_item`(s), reuses the **unchanged** `jx_create_sale` (with the advance as prepaid) to post the balance + clear the advance, and links the sale. **`jx_create_sale` NOT modified.**

- **DDL (LIVE in DB via direct 5432):** `jx-007-order-finalize.sql` — `ALTER jx_order ADD finalized_sale_id` (additive, FK→jx_sale, SET NULL); REPLACE `jx_create_order` (Phase-7 behavior UNCHANGED + advance voucher when advance>0); new `jx_finalize_order(p_order_id uuid, p_payload jsonb)` (SECURITY INVOKER, one txn). Prior `jx_create_order` backed up `.tmp_jx/jx_create_order_p7.bak.sql`. Rollback: DROP `jx_finalize_order` + restore `jx_create_order`; column may stay.
- **FE edits (jewelry-owned, no shared files):** `src/pages/jewelry/Orders.tsx` (+"Deliver & Invoice" action + finalize dialog + finalized invoice) and `src/hooks/useJewelryOrders.ts` (+finalize). **NavigationSidebar/App.tsx untouched**; no package.json/lockfile change.
- **Voucher rules:** booking advance → Dr Cash + Dr Bank = Cr Customer Advances (2000). Finalization (via `jx_create_sale`, prepaid=advance) → Dr Cash (balance) + Dr Customer Advances (2000) = Cr Gold Sales + Making + Polish + Stone (+Tax). Each enforced Σdr=Σcr.
- **PROOF (executed, local preview + DB — Customer Advances NETS TO ZERO):**
  - Booking (fix-rate @22,000, advance 50,000 cash): net_amount **260,600**, balance **210,600** (Phase-7 UNCHANGED). Advance voucher **Dr Cash 50,000 = Cr Customer Advances 50,000** (balanced).
  - Finalize (actual 10g, balance 210,600 cash): final invoice net **260,600**, **advance applied −50,000**, change **0**. Finalization voucher **Dr Cash 210,600 + Dr Customer Advances 50,000 = Cr Gold Sales 237,600 + Making 8,000 + Stone 15,000** (Σdr=Σcr=260,600).
  - **Customer Advances (2000) account NET = 0** (50,000 Cr at booking − 50,000 Dr at finalization). Trial balance balanced (310,600=310,600). `jx_item` ORD-00001-1 created → **sold**; gold-OUT **−9.167**; order **delivered** + `finalized_sale_id` set. `jx_create_sale` md5 UNCHANGED before/after.
  - **Isolation:** control bbqtonight sees **0** legacy `jx_order`/`jx_voucher`; `jx_finalize_order`/advance voucher can't touch Legacy when called as another tenant (RLS, SECURITY INVOKER). No console errors.
  - Screenshot `.tmp_jx/shots/p8b-finalized.png` (not committed).
- **Cleanup confirmed:** all test order/items/sale/vouchers/voucher_lines/gold_ledger + finalize-created `jx_item` deleted (legacy jx_order=0, jx_sale=0, jx_voucher=0, jx_gold_ledger=0, jx_item=0); **COA kept (16)**; rates→placeholder; onboarding→false.
- **Deferred:** order-cancel refund voucher (Dr Customer Advances / Cr Cash) is NOT built — small follow-up; the 'cancelled' status button currently only sets status (no refund posting).

## Phase 9 — Workshop/Karigar + Repairs + Loose Stones (VERIFIED on LOCAL preview 2026-06-05 — RPC live in DB; FE NOT deployed)
Karigar (workshop) gold issue/receive with per-karigar **gold balance** + **wastage anomaly flag**, a balanced **making-payment voucher**; plus lighter **Repairs** (status pipeline) and **Loose Stones** CRUD. **Karigar accounting is CASH-BASIS** (locked decision): issue/receive move only physical gold (jx_gold_ledger); making is recorded as *owed* on receive and **expensed only when paid** (Dr Making Paid 5100 = Cr Cash 1000). `jx_create_sale`/`jx_create_order`/`jx_finalize_order` were **NOT modified**.

- **RPC (additive, LIVE in DB via direct 5432):** `public.jx_record_worker_txn(p_payload jsonb)` — `SECURITY INVOKER`, one txn, `tenant_id=get_user_tenant_id()`. 3 types:
  - `issue_gold` → `jx_worker_txn(type='issue')` + `jx_gold_ledger` OUT `reason='issue_karigar'` (no PKR voucher).
  - `receive_item` → `jx_worker_txn(type='receive', making_amount=owed)` + `jx_gold_ledger` IN `reason='receive_karigar'` (no PKR voucher).
  - `making_payment` → `jx_worker_txn(type='payment')` + `jx_voucher(type='making_payment')` with **Dr 5100 Making Paid = Cr 1000 Cash**, Σdr=Σcr enforced by summing the actually-inserted lines (missing COA code → unbalanced → RAISE → rollback). Defensive `fine_grams` fallback = `round(net*karat/24,3)` (matches calc.ts). File `repo/supabase/migrations/jx-008-worker-txn.sql` (rollback `DROP FUNCTION public.jx_record_worker_txn(jsonb)`).
- **New FE files:** `src/pages/jewelry/Karigars.tsx` (Workshop), `src/pages/jewelry/Repairs.tsx`, `src/pages/jewelry/LooseStones.tsx`; hooks `src/hooks/{useJewelryWorkshop,useJewelryRepairs,useJewelryLooseStones}.ts`. **Edits:** `NavigationSidebar.tsx` (+Workshop/Repairs/Loose Stones in Jewelry section; +`Hammer`,`Gem` icon imports), `App.tsx` (+`/jewelry/workshop`, `/jewelry/repairs`, `/jewelry/loose-stones`). No package.json/lockfile change.
- **Computed-not-stored (in `useJewelryWorkshop`, reusing calc.ts `pureWeight`):** gold balance = Σ issued fine − Σ received fine; making payable = Σ receive making − Σ payments; wastage% = (Σ issued net − Σ received net)/Σ issued net; **anomaly when wastage% > `WASTAGE_ANOMALY_PCT` (default 3%)**.
- **PROOF — (1) DB smoke test rolled-back, then (2) full UI on local preview, then (3) authoritative DB assertions:**
  - **Issue 100g 22K** → `jx_worker_txn(issue)` + ledger OUT `issue_karigar` **fine 91.667**; balance **91.667 g** out.
  - **Receive 95g 22K making 76,000** → `jx_worker_txn(receive)` + ledger IN `receive_karigar` **fine 87.083**; balance **4.584 g** (UI shows 4.583 from calc.ts pure, DB ledger sums 4.584 — both ≈4.58, consistent); making payable **PKR 76,000**.
  - **Wastage (100−95)/100 = 5% > 3%** → **ANOMALY BADGE fired** ("Wastage anomaly: 5% > 3%").
  - **Pay making 76,000** → `jx_worker_txn(payment)` + voucher **Dr Making Paid 5100 = Cr Cash 1000 = 76,000** (Σdr=Σcr); payable → **PKR 0**.
  - **Repairs:** booked (charge 2,000, promised date) → advance booked→in_progress→**ready**; status persisted; per-status customer notification **displayed only** (Phase-13 sends).
  - **Loose Stones:** added Diamond "Round Brilliant" 0.5ct qty 1 → row `is_loose=true`, `item_id` NULL.
  - **Isolation both ways:** control bbqtonight sidebar has **no Workshop/Repairs/Loose Stones/Jewelry**; bbq cannot see "Test Karigar" (RLS, 0 rows in jx_worker/jx_worker_txn/jx_repair/loose stones); and **`jx_record_worker_txn` called as bbq (even fed a Legacy worker_id) cannot create a Legacy-tenant row** (RPC stamps `get_user_tenant_id()`=bbqtonight). No console errors.
  - Negative guards proven: unknown type + missing worker_id → RAISE. Screenshots `.tmp_jx/shots/p9-karigar-anomaly.png`, `p9-karigar-paid.png`, `p9-repairs.png`, `p9-loose-stones.png`, `p9-bbq-isolation.png` (not committed).
- **Cleanup confirmed:** all test worker/txns/gold_ledger(issue_karigar+receive_karigar)/making_payment vouchers+lines/repair/loose stone deleted (legacy counts all 0); **COA kept (jx_account=16)**; `onboarding_completed`→false. RPC remains live (additive; no prod caller until deploy).
- **Deferred:** accrual via **Karigar Payable 2200** (cash-basis shipped instead — making expensed on payment); per-karigar statement currently lists txns (running-balance column is a small follow-up).

## Phase 10 — agent context + jewellery template (VERIFIED 2026-06-05 — REAL CONFIG, KEPT; NOT deployed)
Gave Legacy's agents real context using the platform's existing onboarding structures: a new `industry_templates['jewellery']` row + `initialize_new_tenant` + a direct seed of the verified site data. **This output is REAL CONFIG and is intentionally KEPT (not cleaned up).**

- **OB-scrape decision (investigated, then SKIPPED):** the wizard's website scrape is the n8n webhook `POST /webhook/onboarding/analyze-company` (+ `/analyze-social`, `/analyze-document`, `/train-agents`), part of the shared onboarding pipeline (sacred Communication v3.8 territory). Running it = nondeterministic LLM extraction (likely to miss nuanced USPs like zero-deduction + rate-protection) + shared/sacred side effects + can't confirm n8n idle for another session. Verified data was already in-hand → **direct seed is safer + more accurate.** n8n left untouched; **N8N-WORKFLOWS not claimed.**
- **DDL/seed (additive, LIVE via direct 5432; committed):**
  - `jx-009-jewellery-template.sql` — one new `industry_templates` row (`industry_code='jewellery'`, `ON CONFLICT (industry_code) DO NOTHING`; alters no other industry's row). Content: vocabulary (Client/Order/Inquiry…), 6 deal_stages (inquiry → consultation → order_booked → in_workshop → ready → delivered), 14 `common_services` (10 collections + Custom Order + Repair + Zero-Deduction Exchange + Rate Protection), `persona_templates` (Legacy Concierge AI persona first, then Bridal/Investor/Gifting), `onboarding_questions`, `ai_context_template` (concierge KB + tone + escalation), brand_voice + ai_name suggestions, is_active.
  - `jx-010-seed-legacy-context.sql` — guarded `initialize_new_tenant('legacy-jewellers','jewellery','Legacy Jewellers')` (creates onboarding_sessions + business_profiles stub + 6 ai_model_configs from the jewellery template), then enriches: `business_profiles` (F-7 Islamabad HQ jsonb, founded 2015, UVP, mission, socials, secondary_contacts incl. per-day hours, colors, data_sources, extraction_confidence 1.0), `tenant_config` (services_description, target_audience, value_proposition, opening/closing_time, ai_name `Legacy Concierge`, ai_role, city), `onboarding_sessions` (input_type=website, scraped_data = verified payload, extraction_status=completed, 100%), `ai_model_configs` (industry_knowledge_pack + response_style on all 6; escalation_triggers + topics_to_avoid on the 4 customer-facing — "don't quote final custom prices / negotiate / give binding valuations").
- **Keying note (corrects CLAUDE.md):** `business_profiles`/`ai_model_configs`/`onboarding_sessions` are **SLUG-keyed** in live data (e.g. `aamerah-c802fcee`, `zateceptionist`) and `initialize_new_tenant` writes `p_tenant_id` verbatim → seed with the SLUG `legacy-jewellers`. `business_services`/`customer_personas` tables **do not exist** — personas/services live in the template (`persona_templates`/`common_services`) consumed via `ai_model_configs.include_services/include_personas`. (FE note: `AIConfigs.tsx` queries `ai_model_configs` by UUID — a pre-existing latent bug, NOT fixed here; agents + `CompanyInfo.tsx` read by slug.)
- **Optional FE (additive, committed):** `src/pages/onboarding/constants.ts` — added `jewellery` to `INDUSTRIES`, `AI_NAME_SUGGESTIONS`, and `INDUSTRY_ALIASES` (jewelry/jeweller/goldsmith/"gold jewelry"→jewellery) so the scrape-driven onboarding (`normalizeIndustry`) auto-classifies future jewellery tenants. **No wizard component / TenantContext / CompanyInfo touched** (active wizard `CompanySetup.tsx` is scrape-driven, no manual dropdown; `IndustryType` union deliberately not extended to avoid shared-file churn).
- **PROOF — DB (apply+verify+isolation) + UI login, all PASS:**
  - Template: jewellery row active; vocab/6-stages/14-services/concierge-persona-first/ai_context (zero-deduction + rate protection + PSQCA + escalate) all present.
  - Legacy reflects real data: business_profiles industry=jewellery, founded 2015, HQ city Islamabad, UVP has ZERO-DEDUCTION + rate, phone +92 340 2786222, instagram legacyjewellers786; tenant_config services/value_prop/ai_name `Legacy Concierge`/city; onboarding_sessions completed @100 with 10 collections + 8 USPs; 6 ai_model_configs (all include_business_profile + knowledge pack; 4 customer-facing carry escalation incl. "valuation disputes").
  - **Isolation:** industry_templates 20→21 with **0 pre-existing rows altered** (per-row md5 identical); control tenant `aamerah-c802fcee` business_profile + ai_model_configs md5 **unchanged**; exactly **one** tenant has a jewellery business_profile (Legacy).
  - **Login (Playwright):** Legacy → lands on **`/dashboard` (NOT the onboarding wizard)**, Jewelry section present; Settings → Company Info shows populated AI name (Legacy Concierge), services description, PSQCA value proposition, website + instagram; **no console errors**. Control bbqtonight → own dashboard, no Jewelry. Screenshots `.tmp_jx/shots/p10-legacy-dashboard.png`, `p10-legacy-company-info.png`, `p10-bbq-control.png`.
- **KEPT (not cleaned up):** the jewellery template row, Legacy's business_profile/onboarding/ai_model_configs/tenant_config enrichment, and `onboarding_completed=true` — all REAL config. **Rollback (only if needed):** DELETE jewellery `industry_templates` row + Legacy rows in onboarding_sessions/business_profiles/ai_model_configs/onboarding_checklists, revert tenant_config fields + `onboarding_completed=false`.

## Phase 0 discovery checklist (VERIFIED vs OPEN)
| Item | Status | Where |
|---|---|---|
| `tenant_config`/`users`/`user_roles`/`profiles` schema; `organizations` is legacy | ✅ VERIFIED | FINDINGS §0.1 |
| SLUG↔UUID (cols + `get_tenant_uuid`/`get_tenant_slug` RPCs); no existing jewelry tenant | ✅ VERIFIED | §0.2 |
| Gating model = `industry===` boolean (TenantContext L662-674, Sidebar L1037/47/57); no new flag | ✅ VERIFIED | §0.3 |
| Smart Ledger = UK practice toolset, no double-entry core → DO NOT REUSE | ✅ VERIFIED | §0.4 |
| Industry-key naming convention (lowercase; `jewellery`) | ✅ VERIFIED | §0.5 |
| **Auth: live `handle_new_user()` (BIND + LEGACY paths), trigger, end-to-end recipe** | ✅ VERIFIED | §1 |
| Provisioning script (`21-day4-auth-users.py`) + `.env` keys present | ✅ VERIFIED | §1.2 |
| Industry templates: `industry_templates` table + `initialize_new_tenant()` RPC | ✅ VERIFIED | §2 |
| `get_user_tenant_id()` verbatim + canonical RLS policy block (slug + uuid variants) | ✅ VERIFIED | §3 |
| Ops finance tables (`ops_*`, slug-keyed) | ✅ VERIFIED | §4 |
| Risk register (R1-R12 + locks) | ✅ VERIFIED | §5 |
| Recipe re-execution (read-only session) | ⚠ NOT RUN (by design) | §1.4 |
| Exact n8n OB.* node that calls `initialize_new_tenant` | ⚠ OPEN (sacred wf, not opened) | §2, §6 |

## Key decisions (filled by Phase 0 — evidence in DISCOVERY_FINDINGS.md)
- **Gating:** add `isJewellery = industry === "jewellery"`; gate sidebar/routes on it; NO feature flag. [§0.3]
- **Smart Ledger reuse:** NONE — `jx_*` PKR ledger built fresh. [§0.4]
- **Auth login creation point:** `auth.admin.createUser` (service-role) → `on_auth_user_created`/`handle_new_user()` trigger → relink to slug. Use cloned `21-day4-auth-users.py`. [§1]
- **Templates:** add an `industry_templates['jewellery']` row (optional); applied via `initialize_new_tenant('legacy-jewellers','jewellery',...)`. [§2]
- **RLS:** copy `accounting_invoices` 5-policy block (`tenant_id = get_user_tenant_id()`, slug-keyed) + add `rls_service_all`. [§3]

## Open questions (carried to Phase 1)
- `jewellery` vs `jewelry` final spelling (recommend `jewellery`; minor). [§0.5/§6]
- `jx_*` PKR ledger schema design (fresh). [§6]
- FE clone strategy (`repo/` branch off main vs the dirty `frontend/` clone). [§6]
- n8n OB.* node wiring for industry-template apply (DB contract known; node not opened). [§6]
