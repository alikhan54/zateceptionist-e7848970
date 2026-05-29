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
