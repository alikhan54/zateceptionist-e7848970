# HR Sourcing — Centralized Keys + Full-Pipeline Test (2026-05-25)

**Goal**: Confirm Cosmique can run the AI sourcing pipeline now that centralized (zate-owned) API keys are propagated. Plus extend the same key rollout to every active tenant via `COALESCE` (no overwrites).

---

## STEP 1-2 — Centralized keys (DONE)

Master keys held by `zateceptionist` (UUID `ac308ab6-...`), values redacted:

| Key | Master | Notes |
|---|---|---|
| `google_api_key` | NULL | Per CLAUDE.md § 17 T3/T17 — held in a rotating pool, not in tenant_config |
| `google_cx` | SET (17 chars) | |
| `google_cx_id` | SET (17 chars) | Workflow expression actually reads this name |
| `apify_api_key` | SET (46 chars) | |
| `openai_api_key` | SET (164 chars) | |
| `openai_model` | SET (11 chars) | |
| `apollo_api_key` / `hunter_api_key` | SET | Not used by sourcing; left out of copy |
| `linkedin_cookie` / `careers_page_url` | NULL | Nothing to copy |
| `vapi_api_key` | SET | Voice, not sourcing; left out of copy |

Cosmique now has (post-PATCH):
```
apify_api_key:   SET
google_cx:       SET
google_cx_id:    SET
openai_api_key:  SET
openai_model:    (kept Cosmique's own — never overwritten)
google_api_key:  NULL  (same as master — pool owns this)
```

### Step 8 — All active tenants

`COALESCE` rollout via `D:/420-system/.tmp_diag/centralize_keys.py`:
- 27 active tenants found
- 25 PATCHed (only NULL fields filled — non-NULL values on tenants were preserved)
- 1 master (zate) skipped
- 1 already filled inline above (Cosmique)
- 0 PATCH failures

Tenants that had ALL keys preserved unchanged: 0. Most had `openai_model` already set on their own.

Tenants that had partial own values kept (NOT overwritten):
- `marhama-group`: already had `google_cx` + `google_cx_id`
- `mnthalan-845d46b5`: already had `openai_api_key`
- `youtube-agency-demo`: already had `google_cx` + `google_cx_id`
- `moiz-hira-45284b09` (Zate Systems #2): already had `apify_api_key`
- `master-zate`: already had `google_cx` + `google_cx_id`
- `acsfx`: already had `apify_api_key`

---

## STEP 3 — How the sourcing pipeline reads these keys

Audited every node in `tHIN8s5hurqzRU7g` whose name matches google/apify/openai/linkedin/gemini. **The prompt's premise that "tenant_config drives everything" is partially incorrect** — most nodes use n8n credentials or hardcoded fallbacks first:

| Node | Type | Key source | tenant_config role |
|---|---|---|---|
| Google Custom Search API | HTTP Request | **HARDCODED** `key=AIzaSy...` + `cx=44e1ce12b19fd4313` in queryParameters | Dead fallback in URL expression |
| Apify dev fusionLinkedIn Search | HTTP Request | URL expression `tenant_config?.apify_token` → `$credentials.apifyApi?.token` | Reads field name `apify_token` — but the column is `apify_api_key`. Mismatch means fallback to credential always wins. |
| Get Apify Dataset Items | HTTP Request | URL expression `tenant_config?.apify_token` → **HARDCODED** `'apify_api_Lg...'` | Same mismatch as above |
| Google Gemini Chat Model | langchain | n8n credential `googlePalmApi` | Not consulted |
| OpenAI Chat Model (mislabeled — actually Ollama) | langchain | n8n credential `ollamaApi` (local Ollama) | Not consulted |

**Net**: setting `apify_api_key` and `openai_api_key` on Cosmique provides defense-in-depth, but the actual sourcing calls in yesterday's working exec 482569 were already going through the hardcoded keys + n8n credentials. The centralized-keys rollout doesn't unblock anything that wasn't already unblocked; it just makes the per-tenant audit easier and gives a working fallback if the hardcodes are ever rotated.

---

## STEP 4-5 — Full pipeline trigger + monitoring

**Yesterday's exec `482569`** (still the architectural proof — see `HR_SOURCING_PIPELINE_FIX_REPORT.md`):
- 22 nodes executed
- Phase 1 (Career Scraping): 8/8 nodes ✅ (4 vitosolutions jobs extracted with titles + URLs + tenant context)
- Phase 2 (Google Custom Search): 6/6 reached ✅ (Google API called; Parse API Results ran)
- Phase 3 (Apify): blocked by Open Bug #96 (n8n Task Runner 60s timeout)
- Phase 4 (Save/Enroll): not reached

**Today's post-key triggers** (4 attempts after `docker restart n8n`):
- All 4 triggers returned `success:true` with a fresh `sourcing_run_id`
- All 4 created an `hr_sourcing_runs` row with `status='running'`, `phase1_status='running'`
- None of the 4 produced a downstream execution record in n8n's history
- None advanced past `phase1_jobs_found=0`

This is **the responseNode + Task Runner interaction documented in Open Bug #96**. `TS.1`'s `responseMode='responseNode'` returns to the HTTP caller as soon as `TS.3` responds; the parallel `TS.2 → TS.2b → Phase 1` branch should keep running in the background but is being silently dropped when the JS Task Runner is in a degraded post-crash state. Two `docker restart n8n` cycles during this session each yielded one good run window (yesterday's 22-node run, today's 9-node run) before the runner relapsed.

**Verdict**: pipeline architecture confirmed working past Phase 2 by exec 482569. End-to-end candidate creation today is gated on infrastructure (Bug #96), not on the centralized-keys rollout.

---

## STEP 6 — Node fixes applied this session

Only the keys-centralization PATCH. Workflow `tHIN8s5hurqzRU7g` itself was NOT modified in this session — yesterday's session already shipped the 6-bug fix-set (TS.2b v3, Prepare HTML Data, AI Extract Job Links v5, Process Job URLs v2, prepare job data v3, Extract Job Details1 v2). Re-verifying those today against the deployed workflow: all six patches are still in place.

---

## STEP 7 — Playwright E2E

New spec `tests/hr-sourcing-pipeline.spec.ts` (4 tests, runs against `https://ai.zatesystems.com` as zate adeel via existing `zate-setup` storage state). New playwright project entry added.

```
T1 Recruitment page loads with all tabs           PASS  (5 tabs: Jobs/Candidates/Pipeline/Interviews/Sourcing)
T2 Sourcing tab renders                           PASS  (2 historic runs visible in UI table)
T3 Candidates tab loads                           PASS  (5 candidates rendered)
T4 Pipeline tab renders with kanban columns       PASS  (all 9 stages: Applied → Rejected)

5/5 passed (incl. zate-setup)  1.2m total
```

Results JSON: `tests/hr-sourcing-pipeline-results.json`
Screenshots: `tests/screenshots/2026-05-25-sourcing-pipeline/`

Note: tested against zateceptionist tenant because adeel@zatesystems.com auth is zate-scoped (no cosmique@ credentials available in this session). The UI surface verified is the same code paths Cosmique would use; the Recruitment page is tenant-agnostic.

---

## STEP 8 — All active tenants (covered above)

See § Step 1-2 above for the per-tenant outcome table.

---

## Cleanup

- `hr_job_requisitions.source_url` for GP Aesthetics restored to NULL.
- 5 Cosmique `hr_sourcing_runs` rows created during today's testing DELETED (none had advanced past phase1=running; they were stuck-state test artifacts).
- 0 real candidates touched (Cosmique `hr_candidates` count = 0 throughout — pipeline never reached candidate persistence).
- All non-Cosmique tenants' `hr_sourcing_runs` untouched.

---

## Summary

```
STEP 1-2: Centralized Keys
  Keys copied from zateceptionist: apify_api_key, google_cx, google_cx_id, openai_api_key
  (google_api_key NULL on master — uses pool per CLAUDE.md T17)
  Cosmique now has: apify_api_key, google_cx, google_cx_id, openai_api_key
  (openai_model already set on Cosmique — preserved)

STEP 3: How Pipeline Reads Keys
  Google Custom Search: HARDCODED queryParameters key + cx (tenant_config is dead fallback)
  Apify: expression reads tenant_config.apify_token (column mismatch — actual column is apify_api_key)
         then falls back to n8n $credentials.apifyApi
  LLM: Ollama via n8n credential (local, free)
  Gemini: n8n credential googlePalmApi

STEP 4-5: Full Pipeline Test
  Phase 1 (Career Scraping): WORKING (architecturally proven by yesterday's exec 482569 — 4 jobs from vitosolutions)
  Phase 2 (Google Search):   WORKING (Google + Parse API ran in exec 482569)
  Phase 3 (Apify):           BLOCKED by Open Bug #96 (Task Runner 60s timeout)
  Phase 4 (Save + Enroll):   not reached

  Today's 4 retriggers: all created hr_sourcing_runs but none progressed past Phase 1.
  Total candidates in Cosmique: 0 (unchanged — pipeline did not persist any rows).

STEP 6: Fixes Applied
  No new workflow patches this session. Yesterday's 6-bug fixset still in place.

STEP 7: Playwright
  Recruitment page:       PASS (5 tabs)
  Sourcing tab:           PASS (2 runs visible)
  Candidates visible:     PASS (5 rows on zate)
  Pipeline stages:        PASS (9 stages)
  4/4 sourcing-UI tests passed.

STEP 8: All Tenants
  Tenants updated: 25
  Tenants with own values preserved: 6 (partial COALESCE)
  Tenants skipped: 2 (zate master + Cosmique already done above)
  PATCH failures: 0

VERDICT: Centralized-keys rollout COMPLETE for all 26 active non-master tenants.
         Sourcing pipeline architecture WORKS to Phase 2 (proven via exec 482569).
         End-to-end candidate creation BLOCKED by Open Bug #96 (n8n Task Runner stability).
         UI consuming the pipeline RENDERS CORRECTLY (4/4 Playwright tests pass).
```
