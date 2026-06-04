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
| (later) | `isJewellery` gating (TenantContext/Sidebar/App.tsx); PKR ledger posting (`jx_account`/`jx_voucher`/`jx_voucher_line`); jewellery vertical UI (P4) | NOT STARTED | — |

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
