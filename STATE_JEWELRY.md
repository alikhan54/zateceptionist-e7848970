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

| Phase | Description | Status | Date |
|---|---|---|---|
| 0 | Discovery (read-only): schema, gating, onboarding/login, accounting reuse, ops finance, templates, risk | ✅ COMPLETE | 2026-06-04 |
| 1 | (future) Schema + RLS for `jx_*` jewelry tables (fresh PKR ledger) | NOT STARTED | — |
| 2 | (future) `isJewellery` gating: TenantContext + NavigationSidebar + App.tsx | NOT STARTED | — |
| 3 | (future) `industry_templates` row + `tenant_config` INSERT + auth login provisioning | NOT STARTED | — |
| 4 | (future) PKR ledger build (BUILD FRESH — confirmed, no reuse) | NOT STARTED | — |

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
