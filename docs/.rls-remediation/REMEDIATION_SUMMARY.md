# Platform RLS Leak Remediation — Summary

**Date:** 2026-05-30 · **DB:** Supabase `public` (production) · **Branch:** `feature/hr-v3-improvements-safe-DO-NOT-PUSH` (local only, NOT pushed).
**Follows the audit** (`docs/.platform-audit/`, commit `2a3b1bc`) that found the F5b `USING(true)` cross-tenant leak was systemic.

This remediation **modified the live database** — closing leaks — via per-table verified transactions with auto-rollback. Recovery is one command away (see below).

---

## Result

| | Tables | Notes |
|---|---:|---|
| Leaky tables found | **341** | broad-role (`public`/`authenticated`) policy with `USING/CHECK(true)` |
| **FIXED + verified + committed** | **117** | leak closed; every non-secret one shows *exactly* own-tenant rows |
| Flagged for manual review (not forced) | **224** | leak remains; see breakdown |

**Fixed breakdown (117):**
- **2 secrets locked** — `api_key_pool` (now deny-all to browser; service_role still works), `tenant_oauth_grants` (browser-locked, service policy retained).
- **26 drop-leak-only** — already had a broad tenant-isolation policy that the leak was OR-defeating; dropped the leak.
- **29 + 59 add-isolation** — added the correct `tenant_id` isolation policy (UUID vs SLUG chosen from the column type + sampled data), then dropped the leak.
- **1 `tenant_config`** — own-row isolation (`id = get_user_tenant_uuid()`); previously **42 tenant configs (all tenants' API keys/secrets) were readable by any logged-in user**.

**Flagged breakdown (224) — deliberately NOT auto-fixed:**
- **127 empty tables, no existing isolation** — format can't be inferred with no data; **0 current cross-tenant exposure** (empty). Will leak once populated → fix when intended format is known.
- **93 tables with no `tenant_id` column** — many are genuinely global reference data (`countries`, `roles`, `permissions`, `subscription_plans`, `industry_templates`…) where broad read may be intentional; the rest may scope by a different key. Review individually.
- **4 mixed-format** (`contacts`, `hr_leave_balances`, `ops_agent_memory`, `ops_agent_tasks`) — contain both UUID and SLUG `tenant_id` values; need data normalization before a single isolation policy is safe.

---

## Why this was safe

1. **Workflows are immune.** Every n8n workflow connects as `service_role`, which bypasses RLS. No policy change here can affect any workflow. Blast radius = browser (`authenticated`/`anon`) access only.
2. **No table went dark unintentionally.** For tables lacking isolation, the correct policy was **added before** the leak was dropped, in the same transaction.
3. **Every fix self-verified, or it self-reverted.** Each table was fixed in its own transaction with structural + behavioral checks; any failure rolled back and flagged the table. **117/117 attempted passed; 0 rolled back.**
4. **The verifier was calibrated.** Before trusting it, the JWT-simulated authenticated session was checked against `hr_employees` (already correctly isolated, live): it reproduced the known-good result exactly (zate sees its 21 rows, 0 cross-tenant). Cross-tenant closure was then proven live — e.g. `ai_decisions`: zate owns 83/sees 83 AND aamerah owns 15/sees 15 on the same table.

**Behavioral invariant enforced per table:** under each test user, post-fix `count(*) == that tenant's own row count` — i.e. they see *exactly* their own rows, neither all (leak) nor none (broken isolation).

**Post-remediation re-audit:** 0 leaks remain on any fixed table; all remaining broad-true policies are on the 224 flagged tables only; deny-all tables 19 → 20 (the +1 is the intended `api_key_pool` lock); hardened HR tables untouched.

---

## Recovery

Two reversible paths (the connecting pooler role has `bypassrls`, so DDL applies):

- **Surgical undo of just this remediation:** `psql … -f docs/.rls-remediation/ROLLBACK.sql` — drops the added isolation policies and recreates exactly the dropped leak policies.
- **Full restore of every policy to its pre-remediation state:** `psql … -f docs/.rls-remediation/MASTER_RESTORE.sql` — recreates all 1,505 original policies.

---

## Honest limitations

- **Behavioral proof depends on having a test user in the affected tenant.** Two validated users exist (zate + `aamerah-c802fcee`). For tables owned only by other tenants (e.g. `clinic_*`, smart-ledger `accounting_*`), own-tenant access was verified **structurally + by data-format match**, not behaviorally — the isolation function matches the sampled data format and no broad-true remains, but a live "user sees their rows" check wasn't possible.
- **224 tables still carry the leak** (by design — flagged, not forced). Of these only the non-empty no-tenant-col / mixed tables carry *current* exposure; the 127 empty ones do not until populated.
- **Empty tables routed to BUCKET1 (drop-only)** trust their pre-existing isolation policy's format; if that policy's format is wrong, browser access would be denied (not leaked) once data arrives — reversible.
- This summary reflects the state at remediation time; re-run the audit to re-verify.

## Artifacts (this folder)
`MASTER_RESTORE.sql` (all 1,505 original policies) · `FIX.sql` (applied statements) · `ROLLBACK.sql` (surgical undo) · `classification.json` (per-table routing) · `apply_results.json` (per-table verdict + behavioral counts) · `all_policies.json` · `test_users.json` · `step0_summary.json`.

---

# Phase 2 — empty-table isolation (2026-05-30)

Closed the latent leak on the **127 empty tables** Phase 1 had flagged, *before* any tenant goes live with real data.

**Result:** **127/127 isolated, 0 skipped.** PHI first (7 `clinic_*` tables), then financial (5: `credit_transactions`, `sales_deals`, `revenue_attribution`, `revenue_forecasts`, `lead_gen_credit_logs`), then the rest.

**Method — column-type-aware, format-agnostic:**
- `uuid`-typed `tenant_id` → `((service_role) OR (tenant_id = get_user_tenant_uuid()))`.
- `text`-typed `tenant_id` → **dual-format**: `((service_role) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()))`. Provably isolated *and* future-proof — a user only ever matches their own tenant's uuid-string **or** slug, so whichever representation data lands in, it's correctly scoped and never cross-tenant. No format guess required.
- Empty → verification is **structural** (no broad-`true` remains; a broad `get_user_tenant` policy exists). A behavioral `own==sees` check runs only if a table unexpectedly already had rows (none did).

**Verified (re-audit):** 127/127 now carry a broad tenant-isolation policy; platform-wide broad-`true` leaks fell **224 → 97** (exactly the still-flagged 93 no-tenant-column + 4 mixed-format; **0** outside that set); deny-all unchanged at **20** (no over-restriction). All `clinic_*` PHI tables now isolated.

**Still open (future phases / manual):**
- **93 no-tenant-column tables** — includes **`patient_visits` + `patient_vitals`** (PHI, but currently **empty** → no exposure today; they have *no* tenant/clinic/patient scope column, so they need a **manually designed FK-based policy** before receiving data). Most others are global reference data (`countries`, `roles`, `permissions`, …) where broad read may be intentional — triage individually.
- **4 mixed-format tables** (`contacts`, `hr_leave_balances`, `ops_agent_memory`, `ops_agent_tasks`) — normalize `tenant_id` representation, then isolate.

**Phase 2 artifacts:** `MASTER_RESTORE_v2.sql` (fresh post-Phase-1 net, 1,465 policies) · `FIX_empty.sql` · `ROLLBACK_empty.sql` · `apply_results_empty.json`.
**Recovery:** surgical `psql … -f ROLLBACK_empty.sql`; full `psql … -f MASTER_RESTORE_v2.sql`.

---

# Phase 3 — FK-based PHI investigation + no-tenant-column triage (2026-05-30)

**Phase 3 made NO database changes.** It investigated the last 2 PHI tables and produced an action plan for the 93 no-tenant-column tables.

## Part A — the 2 PHI tables (`patient_visits`, `patient_vitals`) — FLAGGED, not applied
Both are **empty (0 rows → no current exposure)**, carry `'Allow authenticated' USING(true)`, and have **no declared foreign key**. Their `customer_id` (uuid) plausibly references **`clinic_patients.id`** *or* **`customers.id`** — both exist and are tenant-isolated (slug), so the target is genuinely **ambiguous**. Per the rule "ambiguous FK chain → flag, don't guess," they were **not auto-fixed** (a wrong single-parent guess risks deny-all).

A **ready-to-apply, provably leak-free** recommendation is in **`PHI_RECOMMENDED.sql`**: a dual-parent `EXISTS` (visible only if `customer_id` belongs to the current tenant in *either* parent). The app team should confirm the real parent when the patient-visit feature is built, then run it (and may tighten to the single parent). **Honest status: these 2 PHI tables still carry the leak, but hold no data today and the fix is one reviewed command away.**

## Part B — 93 no-tenant-column tables — triage plan (read-only) → `NOCOL_TRIAGE.md`
| Category | Count | Action |
|---|---:|---|
| **GLOBAL_leave_open** | 26 | Shared reference data (`countries`, `roles`, `permissions`, `subscription_plans/tiers`, `industry_templates`, `marketing_playbooks`, `voice_prompt_templates`…). Broad SELECT is **correct** — not real leaks. Only hardening: restrict WRITE to `service_role`. |
| **USER_scopable** | 2 | `client_packages`, `profiles` — scope by `user_id`/`created_by = auth.uid()`. |
| **FK_scopable** | 7 | Have a FK to a tenant-scoped parent — scope via `EXISTS`. **Directional**: several FKs are audit columns to `users` (`granted_by`, `deactivated_by`…), a weak scope signal needing human judgment. |
| **AMBIGUOUS_flag** | 58 | No detectable scope key — human design needed. Includes the 2 PHI tables; most others are empty or likely-global/infra (`accounting_companies_house_cache` = shared UK-registry cache, `n8n_chat_histories` = n8n-internal). |

**Net security read:** of the 97 still-flagged tables, **~26 are global-by-design** (broad read intentional), the **9 user/FK-scopable** have a clear path, and the **58 ambiguous** are mostly empty or shared/infra. The genuinely-concerning case — *populated, tenant-specific business data with no tenant key* — is rare and surfaced for manual review rather than guessed.

## Cumulative (Phases 1–3)
Of the original 341 leaky tables: **244 isolated/locked** (117 + 127), **97 flagged with a now-actionable plan** (26 global / 2 PHI ready-to-fix / 9 scopable / 58 ambiguous). All **populated** PHI/financial/secret tables are isolated or locked; the only remaining PHI tables are empty with a ready fix.

**Phase 3 artifacts:** `MASTER_RESTORE_v3.sql` (current-state net, 1,451 policies) · `PHI_RECOMMENDED.sql` (ready, not applied) · `apply_results_phi.json` · `NOCOL_TRIAGE.md` · `nocol_triage.json`.
