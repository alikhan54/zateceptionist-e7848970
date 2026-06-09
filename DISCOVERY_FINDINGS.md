# DISCOVERY_FINDINGS — Gold/Jewelry Vertical (Project JX)

> **Phase 0, read-only discovery. Zero production changes.** Branch `feat/jx-p0` in the `repo/` clone (on `main`, production-accurate).
> Target tenant: **Legacy Jewellers** (PKR ledger). Consolidates the disconnected session's `.tmp_jx` introspection + this resume.
> Every claim below is backed by either a live read-only DB introspection (psycopg2 via pooler 6543) or a file in this repo. Inferences are explicitly labelled **[INFERENCE]**. Items I could not fully confirm in a read-only session are flagged **[PARTIAL]**.

Evidence sources (all read-only):
- DB introspection scripts/outputs (throwaway, **outside** the repo): `D:/420-system/.tmp_jx/introspect{1..7}.py` → `out{1..7}.txt`.
- Provisioning reference: `D:/420-system/tenants/smart-ledger/deployment/{01-tenant-config-insert.sql,21-day4-auth-users.py}` + `tenants/smart-ledger/CLAUDE.md`.
- RLS canonical: `repo/docs/.rls-remediation/MASTER_RESTORE_v3.sql`.
- Gating: `repo/src/contexts/TenantContext.tsx`, `repo/src/components/NavigationSidebar.tsx`.

---

## 0. Carry-forward facts (locked / verified)

### 0.1 Core tenant tables
- **`tenant_config`** — `id` UUID PK (`gen_random_uuid()`), `tenant_id` TEXT (the **SLUG**, NOT NULL, unique), `industry` TEXT default `'general'`, `currency` TEXT default `'AED'`, `country` default `'UAE'`, `timezone` default `'Asia/Dubai'`, `features` JSONB, `ai_modules_enabled` JSONB, `subscription_status` default `'active'`. **430 columns total** (kitchen-sink; full dump in `out1.txt`). No jewelry-specific column exists.
- **`public.users`** — `id` UUID PK, `tenant_id` TEXT (slug), `auth_id` UUID (→ `auth.users.id`), `email`, `full_name`, `role` TEXT default `'staff'`, `is_active` default true.
- **`public.user_roles`** — `id` UUID PK, `user_id` UUID NOT NULL, `role` TEXT NOT NULL, `tenant_id` TEXT, `created_at`. **No CHECK constraint on `role`** (free text; provisioning uses `'admin'`/`'staff'`).
- **`public.profiles`** — `id`, `user_id`, `name`, `email`, `role` default `'user'`. (Supabase-style; not on the tenant-provisioning critical path.)
- **`public.organizations`** — EXISTS but is a **separate legacy table** (own schema: `slug`, `plan_id`, `settings` JSONB, `brand_colors`). `handle_new_user()` does **NOT** write to it. **Treat as legacy — do not touch.** [verified: `out1.txt`, and the live trigger body in §1.1 writes only to tenant_config/users/user_roles]

### 0.2 SLUG ↔ UUID (verified)
- `tenant_config.id` = UUID, `tenant_config.tenant_id` = SLUG.
- RPCs exist: **`get_tenant_uuid(tenant_slug text) → uuid`** and **`get_tenant_slug(tenant_uuid uuid) → text`** (both `SECURITY DEFINER`, simple `SELECT` on `tenant_config`). Also `get_user_tenant_uuid()` (wraps `get_user_tenant_id()` → resolves slug→uuid). [verified: `out6.txt`]
- No existing jewelry tenant or industry: probe for `industry ILIKE '%jewel%' / '%gold%'`, `tenant_id/company_name ILIKE '%legacy%'/'%jewel%'` → **0 rows**. [verified: `out5.txt`]

### 0.3 Gating model — LOCKED (re-confirmed against production-accurate `repo/`)
- `repo/src/contexts/TenantContext.tsx:662-674` defines one boolean per vertical: `const isRealEstate = industry === "real_estate";` … `const isAccountingPracticeUK = industry === "accounting_practice_uk";`. Naturally mutually exclusive (a tenant has exactly one `industry`).
- `repo/src/components/NavigationSidebar.tsx:159` destructures those booleans from `useTenant()`; lines `:1037 (isConstructionEstimation)`, `:1047 (isAccountingPracticeUK)`, `:1057 (isRealEstate)` render each vertical's sidebar section gated **purely on the industry boolean** (`{isX && canAccessSection(...) && (...)}`).
- **Exception:** accounting also requires a feature flag — `:786 isAccountingPracticeUK && isFeatureEnabled("accountant_dept") && !isMasterAdmin`. That is a *fail-closed sub-department* gate specific to Smart Ledger, **not** the vertical gate. `useFeatureFlags.isEnabled` defaults TRUE and is **not** the vertical mechanism.
- **Decision for jewelry:** add `const isJewellery = industry === "jewellery";` and gate the sidebar/routes on it exactly like real_estate/clinic/construction. **NO new feature flag** for vertical gating. The `jewelry_module` flag proposed in `STATE_JEWELRY.md` is **redundant** (no existing tenant has `industry='jewellery'`, so the vertical is already OFF for everyone) — reserve a `features` flag only if you later need a fail-closed *sub-feature* toggle (the accounting precedent).

### 0.4 Smart Ledger reuse — LOCKED (evidence confirms DO NOT REUSE)
- `accounting_*` is a **UK accounting-PRACTICE** toolset: `accounting_clients` (Companies House `company_no`, `hmrc_utr`, `sic_codes`, `confirmation_statement_*`), `accounting_invoices`/`accounting_payments`/`accounting_transactions` all default `currency = 'GBP'`, TrueLayer (`accounting_truelayer_connections`). [verified: `out4.txt`, `out5.txt`]
- **There is NO double-entry core**: searched all `public` tables for `%ledger%/%journal%/%chart_of%/%double_entry%/%general_ledger%/%account%` → only `accounting_*` (practice) + unrelated `*_accounts` tables (`account_heat_map`, `ad_accounts`, `blog_accounts`, `collections_accounts`, `sending_accounts`, `social_accounts`, `target_accounts`). **No `chart_of_accounts`, no `journals`, no `general_ledger`.** [verified: `out5.txt`]
- → **The PKR jewelry ledger (`jx_*`) is built fresh.** Do not reuse `accounting_*`.

### 0.5 Industry-key naming convention
- Existing `industry_templates.industry_code` set (20 rows): `automotive, banking_collections, construction_estimation, digital_signage, ecommerce, education, fitness, general, healthcare, healthcare_clinic, healthcare_staffing, home_services, insurance, legal, real_estate, restaurant, roofing, salon, technology, telehealth`. [verified: `out7.txt`]
- `tenant_config.industry` distinct values include extras with **no** template row: `accounting_practice_uk, forex_trading, healthcare_hospital, laboratory_instruments, youtube_agency` → newer verticals were added **without** an `industry_templates` row (they fall back to `'general'`). [verified: `out1.txt` vs `out7.txt`]
- Convention = lowercase, snake_case, single concept. **`jewellery`** (British spelling, as proposed) fits. **[DECISION NEEDED — minor]** `jewellery` vs `jewelry`: free choice (no precedent), but it **MUST be used identically** in `tenant_config.industry`, `TenantContext` boolean, sidebar, routes, RLS industry-gate triggers, and any `industry_templates` row. Recommend `jewellery`.

---

## 1. AUTH LOGIN PATH — verified end-to-end recipe ⭐ (TOP PRIORITY)

### 1.1 The live trigger — `on_auth_user_created` → `public.handle_new_user()`
- **Trigger** (verified `out5.txt`): `on_auth_user_created` — **AFTER INSERT** on `auth.users`, FOR EACH ROW, enabled, calls `public.handle_new_user`. It is the **only** non-internal trigger on `auth.users`.
- **The live function was AMENDED 2026-05-14** ("aladeeb provisioning drift discovery"). It has **two paths** (full body dumped in `out5.txt`; note this DIFFERS from the stale `D:/420-system/.backup_handle_new_user_BEFORE_FIX.sql`, which is the *pre-fix* single-path version):

  **(A) BIND PATH (clean — no phantom):** if `raw_user_meta_data.tenant_id` is a well-formed slug (`^[a-z0-9][a-z0-9-]{1,62}$`) **AND** a `tenant_config` row with that slug exists **AND** was created within the last **300 seconds** **AND** has **zero** linked `public.users` → it links the new auth user directly: `INSERT public.users (... tenant_id=<slug>, role='admin')` + `INSERT public.user_roles (... role='admin')`, then `RETURN`. **No new tenant_config, no phantom.**

  **(B) LEGACY PATH (fallback):** otherwise it builds a phantom slug `lower(emailprefix)-<first8 of auth uuid>` and creates a **fresh** `tenant_config` (`subscription_status='trial'`, `subscription_tier='free'`) + `public.users` (role `'admin'`) + `public.user_roles` (role `'admin'`).

- **Security model** (from the function's own comment): "first-claim-wins within a 5-minute fresh-provision window" — blocks slug-hijack by late signups while allowing operator-driven provisioning (script pre-creates `tenant_config`, then the invited owner/auth-user is created moments later).
- **Consequence:** the **first** user always lands as `role='admin'` regardless of path. Staff (`role='staff'`) is achieved by the provisioning script UPDATing afterwards (see §1.3).

### 1.2 The canonical provisioning script (battle-tested)
`D:/420-system/tenants/smart-ledger/deployment/21-day4-auth-users.py` is the **proven** D2-style script (provisioned all 5 Smart Ledger users **2026-05-18**, per `tenants/smart-ledger/CLAUDE.md`). It uses the **UPDATE-then-DELETE-phantom** pattern and is **robust to BOTH trigger paths**:

1. `preflight()` — **T20 guard**: 3 Supabase REST probes, all must be HTTP 200 < 2.5s, or it refuses to write.
2. `auth_create_user()` — `POST /auth/v1/admin/users` with `email`, `password`, `email_confirm: true`, and **`user_metadata: {display_name, tenant_id: <slug>}`** (service-role key). Idempotent: on 422 "already registered" it GETs and re-links the existing auth user.
3. `relink_user_to_tenant()` — reads the trigger-created `public.users` row by `auth_id`, then `UPDATE public.users SET tenant_id=<slug>, full_name, email, role, is_active=true`; `UPDATE public.user_roles SET tenant_id=<slug>, role`; and **`DELETE FROM public.tenant_config WHERE tenant_id=<phantom> only if phantom != <slug>`**. → If path (A) fired, `phantom == slug` so the DELETE is correctly skipped; if path (B) fired, the phantom tenant_config is removed. **Either way the result is correct.**
4. Per-user atomic rollback: on DB failure it cleans orphan `public.*` rows and `DELETE`s the auth user via admin API. Other users continue.
5. `verify_v1_to_v8()` — V1 auth users present, V2 `public.users` rows, V3 `user_roles` rows, V4 FK integrity, **V5 `tenant_config` count unchanged + target row intact**, **V6 no cross-tenant pollution** (`COUNT(*) WHERE tenant_id<>slug` unchanged), V7 target row has correct UUID + industry, V8 roles correct.
6. Sends temp-password welcome emails (Hostinger SMTP) to a single admin-notify inbox; appends to a **gitignored** `.credentials/` file; writes a **password-REDACTED** result JSON.

Prereqs confirmed present in `D:/420-system/.env` (names only, values not read): `SUPABASE_SERVICE_KEY`, `DB_POSTGRESDB_PASSWORD`, `HOSTINGER_SMTP_PASS`. [verified: grep count = 1 each]

### 1.3 ✅ VERIFIED RECIPE — provision Legacy Jewellers' login
Two interchangeable approaches; **Approach B is recommended** (timing-independent, already proven in production).

**Step 1 — create the tenant_config row** (clone `01-tenant-config-insert.sql`):
```sql
INSERT INTO tenant_config (id, tenant_id, company_name, industry,
  subscription_status, country, city, timezone, currency, primary_language,
  ai_agent_mode, audit_enabled, engagement_responder_enabled, features,
  primary_color, secondary_color, created_at, updated_at)
VALUES (gen_random_uuid(), 'legacy-jewellers', 'Legacy Jewellers', 'jewellery',
  'active', '<PK>', '<city>', 'Asia/Karachi', 'PKR', 'en',
  'standard', false, false, jsonb_build_object(/* jewelry sub-feature flags */),
  '<hex>', '<hex>', now(), now())
RETURNING id, tenant_id, created_at;   -- capture the UUID
```
Connection from the **Windows host**: pooler `6543` (sslmode=require, matches the script) **or** direct `5432` (matches `01-tenant-config-insert.sql`; host has IPv6 egress, Docker does not — §T18). Both proven.

**Step 2 — (optional, recommended) seed onboarding/template scaffolding:**
`SELECT initialize_new_tenant('legacy-jewellers', 'jewellery', 'Legacy Jewellers');`
Falls back to the `'general'` template **unless** a `'jewellery'` row is first added to `industry_templates` (see §2). This seeds `onboarding_sessions`, a `business_profiles` stub, the 19-item checklist, and 6 `ai_model_configs`. **Not required for login**, but gives the tenant correct vocabulary/deal-stages.

**Step 3 — provision the auth login(s)** — clone `21-day4-auth-users.py` into `tenants/legacy-jewellers/deployment/`, changing only:
- `TENANT_SLUG = "legacy-jewellers"`, `TENANT_UUID = "<from Step 1>"`.
- `USERS = [...]` (the owner as `role="admin"`, staff as `role="staff"`).
- V7's expected industry string `"accounting_practice_uk"` → `"jewellery"`.
- Branding/email copy (cosmetic).
Run: `python 21-...py --commit --admin-notify-email <owner_email>` (or `--skip-email`). The script createUser → trigger fires → relink → phantom-delete → V1-V8.

**Net effect (verified by construction + prior production success):** `auth.users` row(s) created; `public.users` + `public.user_roles` rows with `tenant_id='legacy-jewellers'`; owner `role='admin'`; **no phantom tenant_config**; `get_user_tenant_id()` (§3) then resolves the logged-in user to `'legacy-jewellers'` via the `public.users` lookup. The user logs in at the app with the temp password and resets on first login.

**Approach A (clean BIND path, no script needed for a single owner):** do Step 1, then **within 300s** call `POST /auth/v1/admin/users` with `user_metadata.tenant_id='legacy-jewellers'`. The trigger's BIND path links the owner directly with no phantom. Tighter timing; use the script (B) for multiple users or any retry.

### 1.4 Flags / caveats
- **[PARTIAL]** This session is read-only — the recipe was **not re-executed**. It is verified from (a) the live trigger body, (b) the proven script source, and (c) Smart Ledger's documented 5-user success on 2026-05-18. Re-run the script's own V1-V8 gates at execution time.
- **[PARTIAL]** The BIND-path 300s window and zero-users condition are read from the live function source, not from a live timing test.
- Other admin/code provisioning paths exist as references (`scripts/create_zk_tenant_rest.py`, `scripts/provision_mjndigital.py`, root `provision_bobadook_users.py`) and the FE admin hook `repo/src/hooks/useAdminData.ts`, but **`21-day4-auth-users.py` is the authoritative, safest template**. No code-level `supabase.auth.admin.createUser` tenant-create flow in the FE was found that supersedes it.
- **DO NOT modify `handle_new_user()`** — it is shared by every tenant signup platform-wide.

---

## 2. INDUSTRY TEMPLATES — where content lives + how it's applied

- **Content table: `public.industry_templates`** (keyed by `industry_code`). 35 columns incl. `industry_name`, `display_name`, `icon`, `vocabulary` (jsonb), `deal_stages` (jsonb array of `{id,name,color,probability}`), `nurture_sequences`, `scoring_weights`, `ai_context_template` (text), `brand_voice_suggestions`/`ai_name_suggestions` (arrays), `common_services`, `persona_templates`, `onboarding_questions`, `voice_prompts`, `email/whatsapp/sms_templates`, `automation_rules`, `kpi_definitions`, `custom_fields`, `required_tables`, `integrations`, `langchain_tools`, `ui_modules`, `is_active`. [verified: `out7.txt`]
- **Application mechanism: the RPC `public.initialize_new_tenant(p_tenant_id, p_industry, p_company_name)`** (full body in `out6.txt`):
  1. `SELECT * FROM industry_templates WHERE industry_code = p_industry` → **falls back to `'general'`** if not found.
  2. `INSERT onboarding_sessions (tenant_id, current_step=1, extraction_status='pending')`.
  3. `INSERT business_profiles (tenant_id, company_name, industry)` (`ON CONFLICT (tenant_id) DO NOTHING` — `business_profiles.tenant_id` is unique).
  4. `initialize_tenant_checklist(p_tenant_id)` → copies `default_checklist_items` (19 rows: setup/channels/automation/training) into `onboarding_checklists`.
  5. `INSERT ai_model_configs` for 6 model types (sales/marketing/communication/voice/hr/operations) using `v_template.ai_context_template`.
  6. Returns jsonb incl. `industry_template.{name,vocabulary,deal_stages}`.
- **The n8n OB.* onboarding pipeline** (Communication v3.8, sacred `TXeVEskxcLuLwplr`) consumes this same data path — the "apply industry template" step is `initialize_new_tenant` + reads of `industry_templates`. **[PARTIAL]** The exact OB node wiring was not opened (sacred workflow; read-only). The DB-side contract above is the authoritative, verified mechanism.
- **To add a `jewellery` template:** a single additive `INSERT INTO industry_templates (industry_code='jewellery', industry_name='Jewellery', vocabulary=..., deal_stages='[{...}]'::jsonb, ai_context_template=..., is_active=true, ...)`. Use the existing `real_estate`/`construction_estimation` rows as shape references (their `deal_stages` arrays are in `out7.txt`). Jewelry-appropriate stages, e.g.: `inquiry → consultation → design → quote → deposit → production → ready → delivered/paid`.
- **Important:** adding the template is **optional and independent of vertical gating** (§0.3). Newer verticals (accounting_practice_uk, youtube_agency, …) shipped with **no** template row and fall back to `'general'`. Add the row only for correct onboarding vocabulary/stages.

---

## 3. RLS — verbatim canonical pattern jx_* will copy

### 3.1 `get_user_tenant_id()` — VERBATIM (live DB, `out5.txt`)
```sql
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  -- Priority 1: JWT custom claims (future-proofing)
  IF current_setting('request.jwt.claims', true)::json->>'tenant_id' IS NOT NULL THEN
    RETURN current_setting('request.jwt.claims', true)::json->>'tenant_id';
  END IF;
  -- Priority 2: App setting
  IF current_setting('app.tenant_id', true) IS NOT NULL
     AND current_setting('app.tenant_id', true) != '' THEN
    RETURN current_setting('app.tenant_id', true);
  END IF;
  -- Priority 3: DB lookup from users table using auth.uid()
  RETURN (SELECT tenant_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1);
END;
$function$
```
Resolution order: JWT claim → app setting → **`public.users` lookup by `auth.uid()`** (Priority 3 is what makes the §1 provisioning work — linking the user row to the slug is what RLS reads).

### 3.2 Complete working RLS policy set — `accounting_invoices` (VERBATIM, `repo/docs/.rls-remediation/MASTER_RESTORE_v3.sql:82-96`)
This is the **most recent SLUG-based vertical** (direct analog for jewelry). `jx_*` tables (which are SLUG-keyed: `tenant_id TEXT`) copy this exactly, swapping the table name:
```sql
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_invoices;
CREATE POLICY "rls_master_admin_all" ON public.accounting_invoices AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_delete" ON public.accounting_invoices AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_read" ON public.accounting_invoices AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_update" ON public.accounting_invoices AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_write" ON public.accounting_invoices AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
```
(Plus `ALTER TABLE public.jx_<x> ENABLE ROW LEVEL SECURITY;` — RLS must be enabled before the table holds data.)

### 3.3 Pattern variants (verified) — pick the SLUG one for jx_*
- **SLUG-keyed tables** (`tenant_id` stores the slug — what jewelry uses): `USING (tenant_id = get_user_tenant_id())`. [accounting_*, abm_activities, account_heat_map, clinic_patients]
- **UUID-keyed tables** (`tenant_id` stores the UUID): `USING (tenant_id = (SELECT tc.id FROM tenant_config tc WHERE tc.tenant_id = get_user_tenant_id() LIMIT 1))`. [e.g. `ab_tests`, `MASTER_RESTORE_v3.sql:12-15`] — **not** used by jewelry.
- **Service-role bypass:** Supabase `service_role` has `BYPASSRLS`, so n8n/LangGraph service-role writes work without a policy. Older tables also add an explicit `rls_service_all ... FOR ALL TO service_role USING (true)` (e.g. clinic_patients, re_listings) as belt-and-suspenders. **Recommendation for jx_*:** copy the `accounting_invoices` block **and additionally add** `rls_service_all` so the jewelry n8n/LangGraph automations have an explicit allow. 
- **[NOTE]** `rls_master_admin_all` keys on `auth.jwt()->>'role' = 'master_admin'`, which is **dormant against standard Supabase JWTs** (documented open question in `tenants/smart-ledger/CLAUDE.md` Day-4 Q1). Effective isolation comes from the 4 `rls_tenant_*` policies + service-role bypass; keep `rls_master_admin_all` for parity but don't rely on it as the security boundary.
- **DB-level industry gate (optional belt+suspenders):** the BSH vertical added a `BEFORE INSERT/UPDATE` trigger raising an exception unless `tenant_config.industry = '<vertical>'` (`repo/supabase/migrations/37-bsh-multibranch-metrics.sql:43-65`). Note BSH used a *different, JWT-direct* RLS expression — **do not copy BSH's RLS**; copy the `get_user_tenant_id()` pattern above. The industry-gate trigger idea is reusable for `jx_*` if desired.

---

## 4. OPS FINANCE (low priority — jewelry ledger is fresh)
Real operations-finance tables, all **SLUG-keyed** (`tenant_id TEXT`), verified `out4.txt`/`out5.txt`:
- `ops_budgets` (`industry`, `period_year/month`, `category`, `budgeted_amount`, `spent_amount`, `currency` default `'AED'`).
- `ops_budget_actuals` (`budget_id`, `po_id`, `amount`, `category`).
- `ops_purchase_orders` (`po_number`, `vendor_id/name`, `industry`, `region`, `status`, `total_amount`, `currency` 'AED', `payment_terms`, approval/negotiation fields) + `ops_po_line_items` (`po_id`, `sku`, `quantity`, `unit_price`, `total_price`, `quantity_received`).
- Other `ops_*`: inventory (`ops_inventory_items/movements`), `ops_vendors/vendor_performance`, shipments, production, QC, `ops_industry_configs` (per-industry `config` jsonb), `ops_industry_benchmarks`.
- `public.hr_expense_claims` is the only "expense" backing table. There are **no** generic `public.invoices`/`expenses`/`budgets` tables (those names returned no rows).
- **Takeaway:** these are an *operations* module, not a transactional gold ledger. Jewelry's PKR ledger is built fresh (§0.4). Note `ops_*` only if a future jewelry ops/PO need arises.

---

## 5. RISK REGISTER — shared resources a build will touch + required lock

> Phase 0 holds **no** locks. The table below is the registry future phases must claim in `COORDINATION.md` before editing. Another session currently holds the `frontend/` clone dirty (BSH/HR work) — FE changes for JX must go through the clean `repo/` clone on a branch off `main`.

| # | Shared resource | Phase | Risk if uncoordinated | Lock to claim | Rule |
|---|---|---|---|---|---|
| R1 | `supabase` schema — new `jx_*` tables + RLS | 1 | broken RLS = cross-tenant leak; ALTERing existing tables = platform breakage | **DB-SCHEMA-JX** | Additive only (CREATE TABLE/INDEX/POLICY). Never ALTER/DROP existing. `ENABLE RLS` before data. Apply via Studio or direct 5432. |
| R2 | `industry_templates` — INSERT `jewellery` row | 3 | modifying existing rows breaks other verticals' onboarding | DB-SCHEMA-JX | Single INSERT; never UPDATE other rows. |
| R3 | `tenant_config` — INSERT `legacy-jewellers` | 3 | UPDATE/DELETE of other rows = data loss for live tenants | **TENANT-PROVISION** | INSERT only; the row's `industry='jewellery'`. |
| R4 | `auth.users` + `public.users` + `public.user_roles` | 3 | phantom rows / cross-tenant pollution (V6) | TENANT-PROVISION | Use the cloned `21-day4` script; run T20 preflight; verify V1-V8. |
| R5 | `public.handle_new_user()` trigger fn | — | shared by **every** tenant signup | **DO-NOT-TOUCH** | Read-only. Rely on its BIND/LEGACY behavior; never edit. |
| R6 | `repo/src/contexts/TenantContext.tsx` | 2 | merge conflict with FE sessions; mis-gate | **FE-TENANTCTX** | Add `isJewellery` (~L675) + export in context value. Append-only. |
| R7 | `repo/src/components/NavigationSidebar.tsx` (LIVE sidebar — **not** AppSidebar) | 2 | duplicate/sacred-section breakage | **FE-SIDEBAR** | Destructure `isJewellery` (L159); add `{isJewellery && canAccessSection(jewellerySection) && (...)}`. |
| R8 | `repo/src/App.tsx` (238 routes) | 2 | route-table conflicts | **FE-APP-ROUTES** | Add `/jewellery/*` protected routes; append-only. |
| R9 | LangGraph `agents/definitions.py` + `agents/graph.py` + `server.py` (only if a JEWELER agent is added) | 4+ | KeyError on missing hardcoded edge; OMEGA tool-count drift | **LG-AGENTS** | 4 coordinated edits (AGENTS dict + NEXUS prompt in definitions.py; ROUTE line + build_graph edge map in graph.py). Append-only; new tools in a new file. Rebuild + force-recreate. |
| R10 | n8n workflows — new jewelry workflows + OB.* template apply | 3-4 | editing any of the **9 sacred** workflows | **N8N-WORKFLOWS** (sacred = DO-NOT-TOUCH) | New workflows only. API-created webhooks **must** include the `webhookId` field (SLUG format). Idempotency + retry per ORCHESTRATION_STRATEGY. |
| R11 | `docker-compose.yml`, `.env` | — | shared infra/secrets | DO-NOT-TOUCH | Read-only; reuse existing creds (SUPABASE_SERVICE_KEY etc.). |
| R12 | Provisioning script clone | 3 | running against the wrong tenant | — (new files) | Clone into `tenants/legacy-jewellers/deployment/`; hard-code `TENANT_SLUG='legacy-jewellers'`; never point at another tenant. Credentials file gitignored. |

---

## 6. Open questions / decisions for Phase 1
- **[DECISION, minor]** Confirm `jewellery` (vs `jewelry`) as the industry key — must be consistent everywhere (§0.5).
- **[DECISION]** PKR ledger schema (`jx_*`) — design fresh in Phase 1 (no reuse). Define tables + the §3.2 RLS block + (optional) §3.3 industry-gate trigger.
- **[DECISION]** Whether to seed an `industry_templates['jewellery']` row in Phase 3 (recommended for onboarding UX; optional for function).
- **[OPEN]** FE clone strategy: make JX FE changes in `repo/` (main, auto-deploys via Lovable on push) on a branch; coordinate with the session holding `frontend/` dirty.
- **[PARTIAL]** Exact n8n OB.* node that calls `initialize_new_tenant` not opened (sacred, read-only). DB contract in §2 is authoritative.
