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
| (later) | Schema + RLS for `jx_*` tables; `isJewellery` gating (TenantContext/Sidebar/App.tsx); PKR ledger; jewellery vertical UI (P4) | NOT STARTED | — |

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
