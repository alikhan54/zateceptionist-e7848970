# Smart Ledger Wave 1 — Shipped Progress Report

**Date shipped (B/C/E/F):** 2026-06-02
**origin/main tip:** `e1c9545` (plain FF push, no force)
**Live bundle:** `index-B6Klg84b.js`
**Branch:** `smart-ledger-wave1` (4 commits ahead of origin/main when pushed, all 4 now on origin/main)

## What shipped this wave

Re-read of the 7 points Adil flagged in the demo brief, mapped to what is now live for `tenant_id='smart-ledger'`:

| # | Point | Status | Where |
|---|---|---|---|
| 1 | Live CH sync on Add Client | **HELD (Phase D)** — needs n8n CH workflow edit; Video active | n8n `RCLewTLovTg1GxV4` + `AddClientForm.tsx` |
| 2 | Auto-dates on job-type select | **SHIPPED (C)** | `Jobs.tsx` + new `src/lib/job-date-engine.ts` |
| 3 | Auto reminder cadence | **SHIPPED (F)** | `Jobs.tsx` + new `src/lib/reminder-cadence.ts` + `src/hooks/useScheduleJobReminders.ts` |
| 4 | Config-driven job types (extensibility) | **SHIPPED (B)** | New table `accounting_job_types` + `src/hooks/useAccountingJobTypes.ts` |
| 5 | Staff notes on job + Client Type auto-fill | **SHIPPED (C)** | `Jobs.tsx` + `useAccountingClientsList` extension |
| 6 | Job → auto draft invoice on assign | **SHIPPED (E)** | `Jobs.tsx` after createJob, idempotent via partial UNIQUE |
| 7 | PSC Update → Company Secretarial Services rename | **SHIPPED (B)** | `uk-filing-categories.ts:51` (label) + seed code `company_secretarial` in `accounting_job_types` |

**6 of 7 live in production right now.** Point 1 (Phase D) is the final demo-wow item, held to keep this ship n8n-clean while Video is still active.

## Commits on origin/main (this ship)

| SHA | Phase | Files | Lines (+/−) |
|---|---|---|---|
| `483f129` | **B** — job_types foundation + DB-driven picker | 6 | +215/−8 |
| `2eb2628` | **C** — auto-fill dates + staff notes + Client Type | 4 | +296/−2 |
| `b7ee5c6` | **E** — auto-draft invoice on assign | 2 | +72/−2 |
| `e1c9545` | **F** — auto-enrol reminder cadence | 3 | +256/−0 |

Total surface: 11 source files (4 modified, 7 new), 1 migration SQL, 1 Playwright spec, 1 Playwright project entry. No sacred-file touches.

## Database changes (live, applied via migration 38)

```sql
-- Applied 2026-06-01 via apply_migration.py (TX-managed, pre-commit gates green):
CREATE TABLE accounting_job_types (20 cols, UNIQUE(tenant_id,code));
CREATE INDEX idx_acc_jt_tenant_active_sort;
ALTER TABLE accounting_job_types ENABLE RLS;
-- 5 policies: rls_master_admin_all + rls_tenant_read/write/update/delete
ALTER TABLE accounting_jobs DROP CONSTRAINT acc_jobs_category_check;
ALTER TABLE accounting_jobs ADD COLUMN job_type_id uuid;
ALTER TABLE accounting_jobs ADD COLUMN period_end  date;
ALTER TABLE accounting_jobs ADD COLUMN staff_notes text;
ALTER TABLE accounting_invoices ADD COLUMN job_id uuid;
CREATE UNIQUE INDEX uq_acc_inv_tenant_job ON accounting_invoices (tenant_id, job_id)
  WHERE job_id IS NOT NULL;
-- Seed 14 accounting_job_types rows for tenant_id='smart-ledger' only:
--   annual_accounts, corporation_tax, confirmation_statement, paye_monthly,
--   self_assessment, vat_quarterly, vat_registration, company_restoration,
--   vat_mtd, year_end_micro, partnership_sa, p11d, cis_monthly,
--   company_secretarial. All default_fee=NULL — Adil sets per type post-demo.
```

Migration file lives at `tenants/smart-ledger/deployment/38-wave1-job-types-and-job-fields.sql` (sha256[:12] = `b8d918ea8225`).

## Cross-tenant safety (verified pre- and post-ship)

| Table | Pre (rows) | Post (rows) | Delta |
|---|---|---|---|
| `accounting_clients` | `{smart-ledger:445}` | `{smart-ledger:445}` | **0** |
| `accounting_jobs` | `{smart-ledger:5}` | `{smart-ledger:5}` | **0** |
| `accounting_invoices` | `{smart-ledger:5}` | `{smart-ledger:5}` | **0** |
| `accounting_reminders` | `{smart-ledger:1}` | `{smart-ledger:1}` | **0** |
| `accounting_payments`/`_transactions`/`_truelayer_connections` | empty | empty | **0** |
| `accounting_companies_house_cache` | 445 | 445 | **0** |
| `accounting_job_types` | (did not exist) | `{smart-ledger:14}` | **+14 (smart-ledger only)** |

Non-accounting tenants (cosmique=healthcare_clinic, zateceptionist=technology, aamerah=real_estate) confirmed unaffected — none have rows in any accounting_* table, and the frontend gate (`isAccountingPracticeUK`) keeps the entire accounting nav section hidden for them.

## Test coverage

| Suite | Type | Pass |
|---|---|---|
| `test_job_date_engine.mjs` | Node pure-fn (Phase C) | **14/14** |
| `test_reminder_cadence.mjs` | Node pure-fn (Phase F) | **19/19** |
| `phase_e_idempotency_test.py` | rolled-back DB probe (Phase E partial UNIQUE) | **3/3** |
| `phase_f_enrollment_test.py` | rolled-back DB probe (Phase F enrolment + engine query match) | **5/5** |
| `tests/wave1-phase-b-picker.spec.ts` | Playwright auth'd UI (Phase B picker) | **auth-blocked** — needs current `SMART_LEDGER_PASSWORD` env var; temp passwords in `.credentials/` are stale post-first-login-reset |
| `npm run build` (post-rebase, on the pushed SHA) | tsc + vite | **exit 0**, bundle `index-B6Klg84b.js` |

41 of 42 test gates green pre-push. The 42nd (auth'd UI) is the only one needing Adeel-supplied input.

## What's NOT in this ship (held / deferred)

- **Phase D** — extend CH workflow `RCLewTLovTg1GxV4` (write `name` + formatted `address` to `accounting_clients`) and wire Add Client form CH-lookup-on-CRN-blur. Requires n8n write. **Held until Video session is parked.**
- **`default_fee` values** — all 14 seeded `accounting_job_types` have `default_fee=NULL`. Adil sets a fee per type after the demo (this gates Phase E auto-invoice firing per decision #6).
- **Wave 2** — full migration of `accounting_jobs.category` text → `job_type_id` FK only (currently written side-by-side per decision #3); per-job-type custom reminder cadences; CH search-by-name on Add Client (decision #4 deferred Wave 2).

## Rebase narrative

When Wave 1 was committed (2026-06-02), `origin/main` was at `24eeeb0`. By push time, 3 HR commits had landed (`9dd12ea`, `b353837`, `47d1e65`). Single overlap was `playwright.config.ts` (both sides added project entries to different sections). `git rebase origin/main` resolved cleanly — git auto-merged the file, preserving HR's `hr-course-gen-verify` entry AND Wave 1's `wave1-phase-b-picker` entry. All 4 Wave 1 commits got new SHAs (`483f129` / `2eb2628` / `b7ee5c6` / `e1c9545`). Post-rebase build + 41-test re-run all green. FF-safe verified (`git merge-base --is-ancestor origin/main HEAD` → true). Plain `git push origin smart-ledger-wave1:main` succeeded `47d1e65..e1c9545`. No force, no force-with-lease.

## Infra blip during ship (NOT Wave-1 related)

At ship time (~12:24Z 2026-06-02), n8n's REST API began returning HTTP 503 for `/api/v1/workflows/*` GETs with container logs showing `Database connection timed out` / `Failed to hard-delete executions`. Container itself running OK (RestartCount=0). This is the documented T20 Supabase pooler degradation pattern — pre-existing infrastructure issue, NOT caused by Wave 1 (zero n8n writes this round). The Wave-1 sentinel's "sacred 9/9" gate is BLOCKED on inspection until the pooler self-recovers (T18 says 1-5 min normally, T20 sustained can be longer). DB reads via the direct pooler continue to work — Wave 1 DB layer is fully verified.

Recovery options if it persists: `docker restart n8n` is the proven fix (per CLAUDE.md 5/24 incident), 32-second outage, but bounces Video session's connections. **Held off this round because Video is reportedly still active — surfacing to Adeel for decision.**

## Rollback (if needed)

Wave 1 is additive end-to-end. Rollback path:
```bash
cd D:/420-system/frontend
git revert --no-edit e1c9545 b7ee5c6 2eb2628 483f129  # reverse order
git push origin main
```
Migration 38 can stay applied (additive columns, RLS, table — no behavioral risk if frontend stops using them). If full DB revert needed: drop `accounting_job_types`, drop the new columns, restore the CHECK constraint from `36-uk-filing-categories-migration.sql`. Sentinel pre-D snapshot at `D:/420-system/.tmp_wave1_audit/snapshot_pre_B.json` is the reference state.
