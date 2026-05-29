# BSH-HMS Phase 2 — Migrations Applied (Supabase)

> **Status:** migrations 37, 38, 39 are **applied and live** on the production Supabase
> project (`fncfbywkemsxwuiowxxe`), plus the `bsh-demo` tenant_config row. Every claim below
> is labelled by verification status. Machine-readable companion: `BSH_PHASE2_MIGRATION_BASELINE.json`.
>
> **This is a DB-side change, not a code push.** The migration *files* already lived on the
> branch; this session **executed** them against the database. No `git push` involved.

---

## 1. What was applied

| Migration | File | Adds | Live? |
|---|---|---|---|
| 37 | `supabase/migrations/37-bsh-multibranch-metrics.sql` | `bsh_multibranch_metrics` table + 2 indexes + RLS (2 policies) + industry-gate fn/trigger | ✅ VERIFIED-DB |
| 38 | `supabase/migrations/38-bsh-tenant-config-extension.sql` | `tenant_config.bahmni_base_url`, `.bahmni_admin_user`; `hospital_tenants` view | ✅ VERIFIED-DB |
| 39 | `supabase/migrations/39-bsh-clinical-log.sql` | `bsh_clinical_log` table + 3 indexes + RLS (2 policies) + industry-gate fn/trigger | ✅ VERIFIED-DB |
| — | (data) `bsh-demo` tenant_config row | industry=`healthcare_hospital`, status=`inactive`, `features.bahmni_secret_ref=vault:bsh-demo` | ✅ VERIFIED-DB |

Applied in order **38 → 37 → 39** (38 first so the `tenant_config` columns / `hospital_tenants`
view exist; 37 and 39 are independent of each other). All statements idempotent — safe to re-run.

---

## 2. How they were applied (mechanism correction)

**The task said:** apply via "Supabase REST exec_sql / POST sql endpoint."
**Ground truth:** that mechanism does not exist here.

- `POST /rest/v1/rpc/exec_sql` → **HTTP 404** (no such RPC).
- PostgREST cannot run DDL at all — it only proxies row CRUD.

**Mechanism actually used — the authorized arbitrary-SQL channel:**

```
POST https://api.supabase.com/v1/projects/fncfbywkemsxwuiowxxe/database/query
Authorization: Bearer <SUPABASE_ACCESS_TOKEN from .env>
Content-Type: application/json; charset=utf-8
body: { "query": "<one SQL statement>" }
```

### Quirks discovered (and how each was handled)

| Symptom | Cause | Fix |
|---|---|---|
| **HTTP 413** on full files | Endpoint caps body ~2KB | Split each file into individual statements (dollar-quote-aware splitter that toggles on `$` and only breaks on `;` outside a dollar-quoted block — needed for the `plpgsql` function bodies) and sent one at a time |
| **HTTP 400** on `BEGIN`/`COMMIT` | Endpoint rejects explicit transaction control | Dropped the `BEGIN`/`COMMIT` lines. Safe because every statement is idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP ... IF EXISTS`) |
| **HTTP 400** on em-dash statements (38 `COMMENT ON VIEW`; 39 `CREATE TABLE` inline comments) | PowerShell 5.1 `Invoke-WebRequest` mangled non-ASCII bytes | Encoded the body as UTF-8 bytes: `[System.Text.Encoding]::UTF8.GetBytes($body)` + `ContentType 'application/json; charset=utf-8'`, then re-applied idempotently |
| `Range` header error on count probes | `Range` is a restricted .NET header in PS 5.1 | Used Management-API `count(*)` SQL instead of PostgREST `Content-Range` |

Because every statement is idempotent, the re-applies after the UTF-8 fix were no-ops where
they had already partially succeeded — no duplicate objects, no errors.

---

## 3. Verified end-state (re-queried live at session resume)

All numbers below are **VERIFIED-DB** — a single consolidated `json_build_object` probe run
live against the database, not recalled from notes.

### Migration 37 — `bsh_multibranch_metrics`
- table = **1**, indexes = **3**, RLS policies = **2** (`bsh_metrics_tenant_isolation`, `bsh_metrics_service_role_all`)
- function `enforce_hospital_only_metrics()` = **1**, trigger `bsh_metrics_industry_check` = **present**
- rows = **0** (no junk)

### Migration 38 — `tenant_config` extension
- `bahmni_base_url` + `bahmni_admin_user` columns = **2**
- `hospital_tenants` view = **1**; view contents = **["bsh-demo"]**

### Migration 39 — `bsh_clinical_log`
- table = **1**, indexes = **4** (3 custom + pkey), RLS policies = **2** (`bsh_clinical_log_tenant_isolation`, `bsh_clinical_log_service_role_all`)
- function `enforce_hospital_only_clinical_log()` = **1**, trigger `bsh_clinical_log_industry_check` = **present**
- rows = **0** (no junk)

### `bsh-demo` tenant
```
tenant_id            = bsh-demo
company_name         = Bangladesh Specialized Hospital (Demo)
industry             = healthcare_hospital
subscription_status  = inactive
bahmni_base_url      = NULL
ai_agent_mode        = standard
features.bahmni_secret_ref = vault:bsh-demo
```

---

## 4. Multi-tenant regression — PASS (VERIFIED-DB)

| Check | Before | After | Verdict |
|---|---:|---:|---|
| Cosmique `clinic_patients` | 3 | 3 | UNCHANGED |
| Zate `sales_leads` | 613 | 613 | UNCHANGED |
| Total tenants | 41 | 42 | +1 (bsh-demo only) |
| `bsh_*` junk rows | 0 | 0 | none left behind |

No existing-tenant data was read-modified-written. The only new row anywhere is `bsh-demo`.

---

## 5. Industry gate — proven both directions

**Negative (VERIFIED-DB — actual rejection observed):** attempting to INSERT a `cosmique`
(industry=`healthcare_clinic`) row into either BSH table is **rejected before insert**:

```
ERROR  P0001: bsh_clinical_log is restricted to healthcare_hospital tenants.
              tenant_id=cosmique has industry=healthcare_clinic
        (raised by enforce_hospital_only_clinical_log)
rows created: 0
```
The same gate fires for `bsh_multibranch_metrics` via `enforce_hospital_only_metrics()`.

**Positive (INFERRED):** `bsh-demo` (industry=`healthcare_hospital`) satisfies the trigger's
`NOT EXISTS(... industry='healthcare_hospital')` guard and appears in the `hospital_tenants`
view. The insert path was **not exercised** — that would leave a test row, and the no-DELETE
guardrail forbids cleaning it up. So positive direction is labelled INFERRED, not VERIFIED.

This is **layer 5 of the 6-layer fail-closed industry gate** (DB trigger). It complements,
and does not replace, the tool-body / n8n-node / FastAPI / RLS / OWA-guard layers.

---

## 6. Safety decision: `subscription_status='inactive'`

The task spec did not specify a `subscription_status`; the column default would have made
`bsh-demo` **active**. I deliberately set it to **`inactive`** because every scheduled
multi-tenant loop selects `WHERE subscription_status='active'` (§7 of CLAUDE.md). An active
`bsh-demo` would be swept into ~40 cron workflows immediately, generating spurious work and
alerts against a hospital tenant that has no live Bahmni backend yet.

The industry gate keys on `industry`, **not** `subscription_status`, so hospital-table access
is unaffected. **AMD demo-day action:** flip `bsh-demo.subscription_status` to `active` when
the Bahmni backend is live and `bahmni_base_url` is populated.

---

## 7. What is NOT done here (honest scope)

- **No `bahmni_base_url` value** — left NULL until the AMD Bahmni instance has a reachable URL.
- **Positive-insert gate test** — INFERRED only (see §5).
- **No application code touched** — this is purely DB DDL + one data row. Frontend/agents/n8n
  that *read* these tables are covered in later sections (Phase 3 frontend, n8n workflows).
- **Not pushed** — migration files were already committed on the branch; nothing to push for
  the DDL itself. This doc + the baseline JSON are the new artifacts, committed locally.
