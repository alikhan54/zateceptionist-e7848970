# Cosmique — Phase 2.9 Trigger Log (Observation, Read-Only)

**Date:** 2026-05-18
**Tenant:** cosmique (UUID `933967dd-1f90-4676-96c1-42a01b6d9835`)
**Mode:** Observation only. Zero workflow modifications. Zero manual triggers.
**n8n base:** `http://localhost:5678`
**Status:** n8n container HEALTHY (`/healthz` → `{"status":"ok"}`)

---

## Mandate recap
Phase 2.9 Part A: confirm the seeded Cosmique inputs (auto_lead_gen_settings, marketing_campaigns, competitor_tracking, audience_segments, clinic_treatments) are being picked up by the autonomous cron workflows. NO manual triggers — only inspect last 20 executions per workflow and look for Cosmique presence.

## Verdict
**FAIL — Cosmique not appearing in any autonomous workflow execution data within the last 24 hours.**

The seeded Phase 2 rows are sitting in the database but no cron loop has touched them in the observation window.

---

## Per-workflow observation

| Workflow | ID | Schedule | Recent execs | Finished | Errors | Cosmique present? |
|---|---|---|---:|---:|---:|:---:|
| Sales Part 1 v5.8 (Part 21 Enrichment) | `aTGIlVgvf6lUWHlW` | 15min cron | 20 | 14 | 6 | **No** |
| OMEGA Lead Gen Async | `5ZRNaT9BMmbSRj5v` | — | 0 | — | — | **No (idle)** |
| Marketing mega v2.6 | `E8HZhv4y4MRb6n9F` | various | 20 | 0 | 0 | **No** (all stub/webhook errors) |
| Doctor Avatar v1.0 | `lhdU0HUxmdgSSDpD` | webhook | 0 | — | — | **No (never fired)** |
| Video Intelligence Orchestrator v1.0 | `fvXs1Z94tvje0QfY` | webhook | 0 | — | — | **No (never fired)** |
| Clinic v1.0 | `pATH22OccRa9pjlR` | webhook | 0 | — | — | **No (never fired)** |
| Clinic Post-Care v1.0 | `y3ZDr2y1o2bseqmG` | 15min | 5 queued (`new`) | 0 | 0 | (status=new, not started) |
| Video AI AIDA Intelligence Loop | `Pp2n1pkrop0Oj3J5` | 30min | 5 queued (`new`) | 0 | 0 | (status=new, not started) |

(Search method: `GET /api/v1/executions?workflowId=<id>&limit=20`, then grep response JSON for `cosmique` or `933967dd`.)

---

## Why Cosmique isn't being picked up

### 1. Sales Part 1 — Part 21 Enrichment (15min cron)
Cron is firing (20 executions in window, 14 finished). Cosmique not present in any payload. Likely cause: the multi-tenant loop pattern (T1: `SELECT * FROM tenant_config WHERE subscription_status='active'`) IS selecting cosmique, but Part 21's enrichment branch needs at least one lead with `enrichment_status` IN ('pending','failed','new') for that tenant. **Cosmique has no `sales_leads` rows yet** — there's nothing to enrich.

Recommended diagnostic (out of scope here):
```sql
SELECT count(*) FROM sales_leads WHERE tenant_id='cosmique';
SELECT count(*) FROM sales_leads WHERE tenant_id='cosmique' AND enrichment_status IN ('pending','failed','new');
```

### 2. OMEGA Lead Gen Async — idle
Zero executions. This is a webhook-fired workflow (`POST /webhook/omega-lead-gen-async`), not a pure cron. It's not idle because of cosmique; it's idle because nothing has called the webhook. The schedule-style cron-fired AutoLeadGen is Part 35 (`Sales Part 1`'s separate branch), not this workflow. Not a cosmique-specific failure.

### 3. Marketing mega — all error/stub
20 executions, 0 finished, 0 explicit `status=error`. These are likely webhook handler stubs that returned non-2xx (legacy T7 supplyData LangChain blog-gen errors, see CLAUDE.md). Cosmique's 2 draft campaigns (`marketing_campaigns.status='draft'`) wouldn't be picked anyway — the activation gate filters them out. Status=draft is the safe default per Phase 2 seed log.

### 4. Doctor Avatar / Video / Clinic webhooks — zero executions
These are inbound webhooks (`/doctor-avatar-upload`, `/doctor-avatar-approval`, `/vapi-clinic-tools`). Zero executions means **no patient has ever uploaded a medical report for Cosmique**. The chain hasn't been exercised end-to-end yet. See companion doc `COSMIQUE_MEDICAL_VIDEO_INVESTIGATION.md` for why.

### 5. Post-Care + AIDA loops — queued `new`, not running
5 executions each stuck in `status='new'`. Could indicate: queue backlog, worker concurrency limit, or these executions waiting on a scheduled-trigger condition (next cron tick). Not currently progressing to `running` or `success`. Worth monitoring separately — not a cosmique-only issue.

---

## Database state for Cosmique medical flow (corroborating evidence)

Direct SQL via Supabase REST (read-only):

| Table | Cosmique row count |
|---|---:|
| `clinic_medical_reports` | **0** |
| `clinic_video_scripts` | **0** |
| `clinic_medical_review_queue` | **0** |
| `clinic_health_analyses` | **0** |
| `clinic_treatments` | 14 (4 pre-existing + 10 Phase 2 seed + 1 Phase 2.10 description append on Botox) |
| `clinic_patients` | 3 (Onboarding v5 seed) |
| `clinic_products` | 3 (Onboarding v5 seed) |

The medical-video pipeline tables are empty — confirming no report has ever been uploaded for Cosmique.

---

## What this means

- **Phase 2 seeds remain inert.** They are data inputs, not engine triggers. Without `sales_leads` rows for cosmique, Part 21 has nothing to enrich. Without uploaded medical reports, the doctor-avatar chain doesn't start.
- **Cron is healthy.** The autonomous engines are firing on schedule for other tenants; they're skipping cosmique because cosmique's queues are empty, not because the cron is broken.
- **The seeded `auto_lead_gen_settings` row exists** (`Cosmique — Dubai Aesthetics Daily`, 09:00 daily, `quick_search`) but its `next_run_at` may not have arrived in the observation window. Verify with:
  ```sql
  SELECT name, schedule_type, schedule_time, last_run_at, next_run_at, is_active
  FROM auto_lead_gen_settings WHERE tenant_id LIKE '933967dd%';
  ```
  Even when next_run_at arrives, Part 35 needs Google Custom Search API enabled on a working key (open ticket T17) — cosmique's pool will run dry without that.

---

## Sentinel sanity checks (TZ.5 / Sacred Sentinel)

- **TZ.5** (`KcriPQwcm7ljDn4Z`, 0 8,14,20 * * * Asia/Karachi): only runs per-tenant audits where `tenant_config.audit_enabled=true`. Cosmique's audit_enabled value not checked here, but CLAUDE.md notes only `zateceptionist` is currently enabled — so TZ.5 should not be processing Cosmique. Not a defect.
- **Sacred Sentinel Hot Path** (`QO3eVBr8La6hkLTC`, 5min): platform-wide drift+inactive check, not tenant-scoped.
- **Alert Dispatcher** (`w6Yoz22MUyQZM66m`, 2min): drains `omega_alerts` and `tenant_audit_log`, no cosmique-specific behavior.

---

## Recommendations (NOT executed — observation phase)

1. Promote 1–2 of the 142 `lead_signals` rows for cosmique into `sales_leads` (where source signal is aesthetic-relevant — most are B2B hiring/funding, but a subset may be salvageable). This gives Part 21 something to chew on next 15-min tick.
2. Hold off on flipping `auto_lead_gen_settings.auto_sequence=true` until SMTP is wired AND an aesthetic-specific sequence exists.
3. Investigate why Clinic Post-Care + AIDA AIDA Intelligence Loop executions are stuck in `new`. Run `docker logs n8n | grep -iE "queue|worker|concurrency"` and check `EXECUTIONS_MODE` env.
4. Defer Part 21 / Part 35 Cosmique-specific verification until cosmique has lead inventory. Until then, this loop's observation window will keep returning "Cosmique not present" — which is correct behavior, not a bug.

---

## Reference data (raw counts from API at 2026-05-18T05:34Z)

`auto_lead_gen_settings` for cosmique: 1 row (Phase 2 seed).
`marketing_campaigns` for cosmique: 2 rows, both `status=draft` (Phase 2 seed).
`competitor_tracking` for cosmique: 3 rows (Phase 2 seed: Kaya, Euromed, Biolite).
`audience_segments` for cosmique: 3 rows (Phase 2 seed: All Inquiries, Hot Leads, Past Patients).
`clinic_treatments` for cosmique: 14 rows (4 legacy + 10 Phase 2 + 1 Phase 2.10 description-append on Botox).
`sales_leads` for cosmique: **(not queried in this session — see recommendation #1)**.
`social_post_queue` for cosmique: 32 rows, all `status='queued'`, all `error_message IS NULL` (pre-existing T16 blocker).
`lead_signals` for cosmique: 142 rows, mostly B2B hiring/funding (out of scope).
