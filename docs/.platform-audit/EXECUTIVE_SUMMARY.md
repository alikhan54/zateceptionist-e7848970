# Platform Audit — Executive Summary

**Date:** 2026-05-29 · **Mode:** read-only (DB introspection + `frontend/src` grep + n8n REST scan) · **Scope:** all 625 tables in Supabase `public`.
**Nothing was written to the database.** Companion detail: [`PLATFORM_AUDIT_REPORT.md`](PLATFORM_AUDIT_REPORT.md) + 6 raw data files in this folder.

---

## TL;DR

1. **The F5b cross-tenant leak is not isolated — it is the platform's default state.** **246 of 625 tables** (39%) carry a broad-role `USING(true)` RLS policy that lets *any logged-in user read any tenant's rows*; **236 tables** are writable the same way. This is a systemic multi-tenant data-isolation failure at the database boundary, reachable today by any authenticated user issuing a direct `supabase-js` query (the UI's tenant filter does **not** protect the data — RLS does, and here it doesn't).
2. **Several leaking tables hold secrets or regulated data:** `api_key_pool`, `tenant_config`, `tenant_oauth_grants` (credentials/OAuth), the entire `clinic_*` medical surface (PHI), and `accounting_*` financials.
3. **133 "hidden" features** exist — backend tables with real data and/or active workflows but **no front-end** — including some very large ones (`lead_interactions` ~1.0M rows, `sla_breaches` ~274K rows).
4. **51 tables are both leaky and hidden** — the highest-priority cluster (exposed at the DB layer *and* invisible to the app, so nothing governs them).

---

## Part D — Security findings

### Baseline (good)
- **All 625 public tables have RLS enabled** (0 disabled).
- **19 tables are RLS-on with 0 policies** = deny-all / locked — safe (front-end shows honest empty state).
- **273 `service_role`-only `USING(true)` policies were correctly EXCLUDED** from leak counts. `service_role` bypasses RLS by design; this is the normal n8n/backend access pattern and is **not** a leak. (Role-awareness is the whole game here — a naive scan would have falsely flagged ~520 policies.)

### The leak (critical)
| Class | Policies | Tables | Severity |
|---|---:|---:|---|
| Cross-tenant **READ** (broad role + `USING(true)` + has `tenant_id`) | 274 | **246** | CRITICAL |
| Cross-tenant **WRITE** (broad role + `CHECK(true)` + has `tenant_id`) | 243 | **236** | CRITICAL |
| Broad-role `true` on table **without** `tenant_id` (global/shared/config) | 95 | — | REVIEW |
| Suspicious (non-`true` policy, no recognizable scoping token) | 63 | — | REVIEW |
| `anon` INSERT-only capture endpoints | 2 | — | OK (intentional) |

**Mechanism (the trap):** Postgres permissive policies combine with **OR**. A table can have a *correct* `tenant_id = get_user_tenant_id()` policy and still leak, because a co-existing broad-role policy with body `true` wins for every row. The "good" policy provides false comfort. Hand-verified on three representative tables (USING/CHECK pulled live):

- **`accounting_clients`** — has correct `rls_tenant_read/update/delete`, **but** `rls_service_all` is `USING(true)` granted to **PUBLIC**. Allow-all wins. (Name says "service"; grant says PUBLIC.)
- **`clinic_consultations`** — its policy is literally **named** `clinic_consultations_tenant_isolation`, but the body is `USING(true) / CHECK(true)`. **Misnamed; zero isolation.** This is why a by-name policy review would miss it.
- **`hr_goals`** — correct `Tenant isolation` policy defeated by a co-existing `Authenticated access` `USING(true)`.

**Confidence:** the 246/236 figures are *rule-classified* (broad role + literal `true` + `tenant_id` column present), not hand-verified one-by-one. Confidence is high because the same rule correctly **excludes** the five tables we hardened in the prior HR session (`hr_leave_types`, `hr_public_holidays`, `hr_shifts`, `hr_employee_shifts`, `hr_notifications`) and the known-good `hr_employees`, while correctly **including** their un-hardened siblings (`hr_goals`, `hr_attendance`, …). Three independent live spot-checks all confirmed the mechanism.

### Blast radius — leaks touch every vertical
hr (27 tables), ops (25), core CRM/`(root)` (16 incl. `contacts`, `leads`, `messages`, `conversations`, `calls`, `users`, `user_roles`), ai (10), sales (10), estimation (9), accounting (7), **clinic (7 — medical/PHI)**, customer (7), lead (7), marketing (7), + ~110 more. Full module breakdown in the report.

### Named high-severity items (look at these first)
- **`api_key_pool`** — API-key pool table, `USING(true)` to PUBLIC, referenced by 6 workflows. Cross-tenant key exposure.
- **`tenant_config`** and **`tenant_oauth_grants`** — per-tenant secrets / OAuth grants, cross-tenant readable.
- **`clinic_consultations / _health_analyses / _medical_reports / _prescriptions / _medical_review_queue`** — patient medical data, cross-tenant readable (regulatory exposure).
- **`accounting_clients / _invoices / _payments / _transactions`**, **`sales_deals`**, **`credit_transactions`** — financial data.

---

## Part G — Hidden-feature inventory

| Category | Meaning | Count |
|---|---|---:|
| **A** | UI + data (working surface) | 241 |
| **B** | UI built, no data (shipped but empty/unused) | 83 |
| **C** | **HIDDEN** — data and/or active workflow, **no UI** | **133** |
| **D** | placeholder — no UI, no data, no workflow | 168 |

### Top hidden features (Category C, by activity) — candidates to surface or formally retire
| Table | Rows | Workflows | Also leaking? |
|---|---:|---:|---|
| `lead_interactions` | ~1,037,375 | 1 | — |
| `sla_breaches` | ~274,364 | 2 | **yes** |
| `lead_engagement_events` | 3,892 | 2 | — |
| `account_heat_map` | 1,405 | 2 | — |
| `buying_committees` | 953 | 1 | **yes** |
| `market_signals` | 674 | 1 | — |
| `company_research` | 632 | 1 | — |
| `email_verification` | 314 | 4 | **yes** |
| `api_key_pool` | 14 | 6 | **yes** |
| `tenant_icp_config`, `message_queue` | 25 / 2 | 4 / 4 | — |

These represent real backend capability (sales-intelligence logging, SLA tracking, ICP config, lead enrichment) with no operator-facing screen. They are either (a) features worth exposing, or (b) dead weight worth deleting — a product call, not a bug.

### Category B (83) — UI shipped but the table is empty
Worth a glance: these screens exist but have never received data (e.g. `restaurant_*`, several `clinic_*`, `ad_*`, `influencer_*`). Could be unfinished features, mis-wired tenant filters, or simply unused tenants.

---

## Part D×G — highest-priority cross-cut: leaky **and** hidden (51 tables)

Cross-tenant exposed at the DB layer **and** invisible in the app (no UI = no app-layer guardrail, easy to forget). Heaviest concentration: **ops (12)**, **estimation (5)**, **sales (5)**. Includes the 274K-row `sla_breaches`, the 953-row `buying_committees`, and `api_key_pool`. Full list in the report's "Part D×G" section.

---

## Recommended actions (tiered)

- **Tier 0 — secrets/PHI/financial, this week.** Drop the broad-role `true` policies on `api_key_pool`, `tenant_config`, `tenant_oauth_grants`, all `clinic_*`, all `accounting_*`, `sales_deals`, `credit_transactions`. Replace with the verified tenant-isolation pattern already proven on `hr_employees` / used in the F5b activation SQL: `FOR ALL USING (auth.role()='service_role' OR tenant_id = get_user_tenant_id())`.
- **Tier 1 — the 51 leaky+hidden tables.** Same fix, scripted. No UI depends on them, so regression risk is low; do these as one batched migration.
- **Tier 2 — remaining ~195 leaky tables.** Systematic sweep: for each, `DROP` the broad-role allow-all policy and confirm a tenant-scoped policy exists (many already have one that's currently being OR-defeated). This is mechanical and templatable — same shape as the F5b fix, ×195.
- **Tier 3 — review, not urgent.** The 95 no-`tenant_id` global `true` policies (confirm they're genuinely shared/config), the 63 "suspicious" non-`true` policies, and a product decision on the 133 Category-C hidden features (surface vs. delete) and 168 Category-D placeholders (cleanup).

> **Important:** every fix is a policy `DROP`/`CREATE` — pure DDL, reversible, and identical in shape to the activation SQL already validated in the HR session. This audit did **not** apply any of them.

---

## Honest methodology & limitations

- **Role-aware classification** is the key correction: an initial naive pass flagged ~648 "leaks"; filtering out `service_role`-only true-quals (normal) and `anon` INSERT-only capture endpoints (intentional) cut it to the real **246 read / 236 write** cross-tenant set. Restrictive (`AS RESTRICTIVE`) policies were also excluded since they AND-in.
- **Leak counts are rule-classified, not 246-times hand-verified.** Mechanism confirmed on 3 tables + validated against 6 known-state tables (see Confidence note above). A small number of edge cases could differ; the per-policy USING/CHECK for all 1,505 policies is preserved in `rls_leaks.txt` for verification.
- **UI detection = table-name word-boundary match in `frontend/src/**`.** Short/common names (`messages`, `calls`, `leads`) may match unrelated code → some tables marked "has UI" might not really have a screen (Category A/B slightly over-counted, Category C slightly under-counted). A table reached only via an RPC or view alias would be missed the other way.
- **Workflow coverage is partial: 176/268 active workflows scanned (92 fetch-failed — n8n was recovering from a 503 mid-scan).** Workflow refs are an **undercount**; an empty table referenced only by an unscanned workflow may sit in D instead of C. Row-presence (the primary hidden-feature signal) is complete and unaffected. A re-scan attempt was made but n8n flapped again; rather than fake completeness, the partial coverage is reported as-is.
- **Row counts are point-in-time.** An empty table today may be a live feature awaiting its first row.
- This audit is **observation only** — zero database writes, no push, no deploy.

---

## Deliverables (this folder)
| File | Contents |
|---|---|
| `EXECUTIVE_SUMMARY.md` | this document |
| `PLATFORM_AUDIT_REPORT.md` | full per-module leak lists + Category C/B tables + cross-cut |
| `rls_inventory.txt` | all 625 tables: RLS state, policy count, columns, rows, size (D1) |
| `rls_leaks.txt` | role-aware leak classification + **full 1,505-policy dump w/ USING/CHECK** (D2) |
| `missing_tenant_iso.txt` | 236 tenant tables w/ weak/missing isolation, split NO_TENANT_CHECK vs NO_POLICIES (D3) |
| `tables_by_module.txt` | 625 tables grouped by 156 module prefixes (G1) |
| `tables_ui_refs.csv` | per-table row count, UI-file refs, workflow refs (G2 + G3 merged) |
| `workflows_to_tables.txt` | active-workflow → table cross-reference (G3, 66% coverage) |
