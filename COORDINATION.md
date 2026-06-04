# COORDINATION — Gold/Jewelry Vertical (Project JX)

> Cross-session coordination log for the Gold/Jewelry industry vertical build.
> Every Claude Code session working on JX must read this file first, then append a log line.
> If another session is mid-change in an area you intend to touch, note the collision and avoid it.

## Active sessions

| Timestamp (UTC) | Session ID | Phase / Activity | Areas touched | Status |
|---|---|---|---|---|
| 2026-06-04 | jx-p0-discovery | Phase 0 discovery — read-only | none (docs only: COORDINATION.md, STATE_JEWELRY.md, DISCOVERY_FINDINGS.md on branch `feat/jx-p0`) | in progress |
| 2026-06-04T16:09:21Z | jx-p0-discovery (resume) | Phase 0 RESUME — read-only | none (docs only; recovered prior `.tmp_jx` introspection, finishing auth/templates/RLS/risk on branch `feat/jx-p0`) | ✅ complete — DISCOVERY_FINDINGS.md written; Phase 0 closed |
| 2026-06-04T17:05:40Z | jx-p1-provision | Phase 1 — provision Legacy Jewellers tenant_config row + 1 auth login (FIRST production change) | `tenant_config` (INSERT 1 row, slug `legacy-jewellers`); `auth.users`+`public.users`+`public.user_roles` (INSERT/relink 1 owner); new files `repo/tenants/legacy-jewellers/deployment/*` on branch `feat/jx-p1` | ✅ complete 2026-06-04T19:25Z — tenant `f1abef0c-…` LIVE + login verified (V1-V8, Playwright, isolation); **released LOCK: TENANT-PROVISION** |
| 2026-06-04T19:37:27Z | jx-p2-calc | Phase 2 — pure jewelry calc engine + unit tests (NO production change) | new files only: `repo/src/lib/jewelry/calc.ts` + `calc.test.ts` on branch `feat/jx-p2`. No shared files; no DB/n8n/auth. Tested via Node native runner (no package.json change → no FE-PACKAGE lock). | ✅ complete — 15/15 tests pass; zero production changes |
| 2026-06-04T20:07:45Z | jx-p3-schema | Phase 3 — create 15 `jx_*` tables + RLS + seed Legacy (PRODUCTION DDL, additive) | NEW tables only via `repo/supabase/migrations/jx-001-schema.sql` + `jx-002-seed-legacy.sql` (rollback: `jx-001-rollback.sql`); applied via direct 5432. No existing table altered. Branch `feat/jx-p3`. | ✅ complete 2026-06-04T20:20Z — 15 tables + RLS live, seed in, 20/20 checks incl. bidirectional RLS isolation; **released LOCK: DB-SCHEMA-JX** |
| 2026-06-04T20:38:57Z | jx-p4-frontend | Phase 4 — mount Jewelry vertical in FE (sidebar + Command Center + Gold Rate), gated isJewellery. LOCAL preview only, NO deploy. | edits in `repo/` on `feat/jx-p4`: `src/contexts/TenantContext.tsx` (+isJewellery), `src/components/NavigationSidebar.tsx` (+Jewelry section), `src/App.tsx` (+2 routes); new files `src/pages/jewelry/*`, `src/hooks/useJewelry.ts`. Additive only. NOT merged/published. | ✅ complete 2026-06-04T21:00Z — built+tested on local preview; UI isolation both directions + manual-rate-save proven; live DB restored; **released FE-TENANTCTX, FE-SIDEBAR, FE-APP-ROUTES**. NOT deployed. |
| 2026-06-04T21:15:49Z | jx-p5-inventory | Phase 5 — Inventory/Stock page (item entry + live calc valuation + stone sub-grid + tag + list/search/edit → jx_item/jx_stone). FE + DB writes, no DDL/n8n. LOCAL preview only, NO deploy. | `feat/jx-p5`: +1 nav item in EXISTING Jewelry section (`NavigationSidebar.tsx`), +1 route (`App.tsx`); new `src/pages/jewelry/Inventory.tsx` + `src/hooks/useJewelryInventory.ts`. Additive. | ✅ complete 2026-06-04T21:40Z — local-preview verified: live calc==calc.ts (pure 9.1667 / val 260,600), DB rows correct, edit persists, isolation both ways; test data cleaned up; **released FE-SIDEBAR, FE-APP-ROUTES**. NOT deployed. |
| 2026-06-04T21:42:14Z | jx-p6-pos | Phase 6 — Point of Sale: atomic sale via RPC `jx_create_sale` (jx_sale+items+old_gold+gold_ledger+mark sold). FE + 1 additive RPC. LOCAL only, NO deploy. | `feat/jx-p6`: RPC `jx_create_sale` (DDL, direct 5432); +"Point of Sale" nav item (`NavigationSidebar.tsx`) + route (`App.tsx`); new `src/pages/jewelry/PointOfSale.tsx` + `src/hooks/useJewelrySales.ts`. | ✅ complete 2026-06-04T22:05Z — exact-arithmetic verified (Sale1 net 260,600/bal 0; Sale2 net 102,573.33/bal 7,426.67 NO double-count), gold-ledger OUT+IN signed, atomic RPC, isolation both ways; test data cleaned; **released DB-SCHEMA-JX, FE-SIDEBAR, FE-APP-ROUTES**. RPC live in DB; FE NOT deployed. |
| 2026-06-04T22:09:55Z | jx-p7-orders | Phase 7 — Orders/Custom: bespoke spec + FIX-RATE lock + advance + status pipeline via RPC `jx_create_order` (jx_order+jx_order_item only — NO sale/gold/GL). FE + 1 additive RPC. LOCAL only, NO deploy. | `feat/jx-p7`: RPC `jx_create_order` (DDL, direct 5432); +"Orders" nav item (`NavigationSidebar.tsx`) + route (`App.tsx`); new `src/pages/jewelry/Orders.tsx` + `src/hooks/useJewelryOrders.ts`. | ✅ complete 2026-06-04T22:30Z — FIX-RATE LOCK proven (order held 22,000/260,600 after live→24,000), balance 210,600 exact, status pipeline + prepared notifications, isolation both ways; test data cleaned (rates→placeholder); **released DB-SCHEMA-JX, FE-SIDEBAR, FE-APP-ROUTES**. RPC live; FE NOT deployed. |

## Locks (claim before editing a shared file in a later phase)

> Phase 0 is read-only and claims NO locks. The table below is the registry future build phases must use.

| Shared resource | Held by | Since | Notes |
|---|---|---|---|
| ~~TENANT-PROVISION~~ | ~~`jx-p1-provision`~~ | — | ✅ **RELEASED 2026-06-04T19:25Z**. Phase 1 done: `legacy-jewellers` (`f1abef0c-…`) + owner login provisioned & verified; zero cross-tenant impact (control byte-identical). |
| ~~DB-SCHEMA-JX~~ | ~~`jx-p3-schema`~~ | — | ✅ **RELEASED 2026-06-04T20:20Z**. Phase 3 done: 15 `jx_*` tables + canonical RLS + Legacy seed live; bidirectional RLS isolation proven (20/20); no existing table touched. Future `jx_*` DDL (ledger phase) should re-claim this lock. |
| ~~DB-SCHEMA-JX~~ | ~~`jx-p6-pos`~~ | — | ✅ **RELEASED 2026-06-04T22:05Z**. Additive RPC `jx_create_sale` (SECURITY INVOKER) live in DB; no table changes. Reversible via DROP FUNCTION. |
| ~~DB-SCHEMA-JX~~ | ~~`jx-p7-orders`~~ | — | ✅ **RELEASED 2026-06-04T22:30Z**. Additive RPC `jx_create_order` live; no table changes. Reversible via DROP FUNCTION. |
| ~~FE-SIDEBAR~~ | ~~`jx-p7-orders`~~ | — | ✅ **RELEASED 2026-06-04T22:30Z**. +"Orders" in Jewelry section on `feat/jx-p7`. Not deployed. |
| ~~FE-APP-ROUTES~~ | ~~`jx-p7-orders`~~ | — | ✅ **RELEASED 2026-06-04T22:30Z**. +`/jewelry/orders` route on `feat/jx-p7`. Not deployed. |
| ~~FE-SIDEBAR~~ | ~~`jx-p6-pos`~~ | — | ✅ **RELEASED 2026-06-04T22:05Z**. +"Point of Sale" in Jewelry section on `feat/jx-p6`. Not deployed. |
| ~~FE-APP-ROUTES~~ | ~~`jx-p6-pos`~~ | — | ✅ **RELEASED 2026-06-04T22:05Z**. +`/jewelry/pos` route on `feat/jx-p6`. Not deployed. |
| ~~FE-SIDEBAR~~ | ~~`jx-p5-inventory`~~ | — | ✅ **RELEASED 2026-06-04T21:40Z**. Added "Inventory" to the Jewelry section on `feat/jx-p5`. Not deployed. |
| ~~FE-APP-ROUTES~~ | ~~`jx-p5-inventory`~~ | — | ✅ **RELEASED 2026-06-04T21:40Z**. Added `/jewelry/inventory` route on `feat/jx-p5`. Not deployed. |
| ~~FE-TENANTCTX~~ | ~~`jx-p4-frontend`~~ | — | ✅ **RELEASED 2026-06-04T21:00Z**. Added `isJewellery` to `src/contexts/TenantContext.tsx` (3 additive lines) on `feat/jx-p4`. Not deployed. |
| ~~FE-SIDEBAR~~ | ~~`jx-p4-frontend`~~ | — | ✅ **RELEASED 2026-06-04T21:00Z**. Added Jewelry vertical section to `src/components/NavigationSidebar.tsx` on `feat/jx-p4`. Not deployed. |
| ~~FE-APP-ROUTES~~ | ~~`jx-p4-frontend`~~ | — | ✅ **RELEASED 2026-06-04T21:00Z**. Added 2 jewelry routes to `src/App.tsx` on `feat/jx-p4`. Not deployed. |

## Collision notes

- 2026-06-04 — `repo/` clone is on `main` and clean. `frontend/` clone is on `fix/hr-recruitment-sourcing-chain` with ~63 untracked probe files (a different, unrelated session's working tree). JX docs live in the `repo/` clone on branch `feat/jx-p0` to avoid that dirty tree. No overlap.
