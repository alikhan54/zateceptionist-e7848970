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
| (later) | **PKR double-entry GL posting** (`jx_account`/`jx_voucher`/`jx_voucher_line`) = Phase 8; remaining pages (Orders/Customers/Workers/Repairs); **deploy P4–P6** (merge→main / Lovable publish) | NOT STARTED | — |

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
