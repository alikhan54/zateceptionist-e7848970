# HR AI Sourcing Pipeline — Fix Report (2026-05-25)

**Workflow**: HR Part 2 v1.9.3 (`tHIN8s5hurqzRU7g`, 244 nodes)
**Tenant**: Cosmique (UUID `933967dd-1f90-4676-96c1-42a01b6d9835`)
**Test requisition**: GP Aesthetics (`7bfbbc35-78e6-427e-ac1f-c26038831971`), source_url `https://www.careers-page.com/vitosolutions`
**Final execution**: `482569` — **22 nodes executed** (was 3 nodes before this session)

---

## Before / after

| Metric | Before | After |
|---|---:|---:|
| Nodes that actually run for a sourcing trigger | 3 (TS.1 → TS.2 → TS.3) | **22** (TS.1 → ... → Parse API Results) |
| Phase 1 (Career Scraping) | 0/8 nodes | **8/8** |
| Phase 2 (Google Custom Search) | 0/6 nodes | **6/6** reached (results empty — see § Config Gaps) |
| Phase 3 (Apify) | 0 | 0 (blocked by Cosmique missing apify_api_key) |
| Phase 4 (Save / Enroll) | 0 | 0 (no candidate rows to write yet) |
| Jobs extracted from vitosolutions | 0 | **4** (ML/MLOps Engineer, Data Engineer, UNICORN CLUB, OTHER IT) |
| Tenant context flowing through pipeline | No | **Yes** — `tenant_id` / `sourcing_run_id` / `job_requisition_id` survives every node |

---

## Real bugs fixed (6 in total)

All 6 bugs are in the workflow's own pre-existing logic — not introduced by this session. They had been silently swallowing every sourcing run for 3+ days.

### BUG-S1 — TS.2 → Phase 1 disconnection (fixed earlier in this arc)
TS.2 (sourcing-run creation) had no edge to Phase 1's `Fetch Careers Page`. Workflow created the DB row, ran TS.3 (Respond), and stopped. Fix: added bridge node `TS.2b Prepare Sourcing Input` + two new connections.

### BUG-S2 — TS.2b couldn't derive `tenant_id`
TS.2 emits `{sourcing_run_id, job_requisition_id, job_title, status, trigger_type, message}` but NOT `tenant_id`. TS.2b's gate `if (!tenantUuid || !jobReqId) return skip` always triggered. Fix: TS.2b now fetches the `hr_job_requisitions` row first and recovers `tenant_id` from it; `tenant_id` from upstream payload is honored when present.

### BUG-S3 — Prepare HTML Data double-equal typo
Set-node value was `=={{ $json["body"] }}`. First `=` is the n8n expression marker, second is literal. Result: every HTML body was prefixed with a literal `=` character before passing downstream. Also `includeOtherFields` was not set, so the node stripped `tenant_id`/`sourcing_run_id`/`careers_url`/`tenant_config` from its output. Fix: `=={{ }}` → `={{ }}` and `includeOtherFields: true`. The field-strip from `Fetch Careers Page` (HTTP Request only emits `body`) is bypassed by reading tenant context from `$('TS.2b').first().json` downstream instead.

### BUG-S4 — AI Extract Job Links: 3 chained bugs
A single node held three independent failures:
1. **Frozen input** — `cheerio.load($input.first().json.data)` triggered n8n 2.12+'s "Cannot assign to read only property 'toString'" because input objects are frozen. Fix: `JSON.parse(JSON.stringify($input.first().json))` deep-clone before any mutation.
2. **Missing tenant context** — node read `input.tenant_id` / `input.careers_url` which were undefined because `Prepare HTML Data` and `Fetch Careers Page` strip everything except `html`/`body`. Result: `careersUrl=''` → `new URL(href, '')` threw → all relative hrefs failed `abs()` → Strategy 2 always returned 0 unique → Strategy 3 fallback fired with **boolean** `needs_ai_extraction: true` → downstream `If` node rejected (strict string comparison). Fix: read tenant context from `$('TS.2b Prepare Sourcing Input').first().json`; emit `needs_ai_extraction` as the string `"true"`/`"false"`.
3. **`new URL()` not in n8n vm sandbox** — even with a real base URL, `new URL("/vitosolutions/job/XYZ", "https://www.careers-page.com/vitosolutions")` threw silently (no `URL` global in the Code sandbox). Strategy 2's `abs()` returned `null` for every relative href, so unique count stayed 0. Fix: manual URL resolver covers protocol-relative `//host/...`, root-absolute `/path`, and relative paths without relying on the WHATWG URL constructor.

Final result: vitosolutions HTML → **4 unique job URLs with titles** in `pattern_match` source.

### BUG-S5 — Process Job URLs input-shape mismatch
Expected `inputData.jobLinks` + `inputData.jobTitles` arrays (a legacy format no upstream emits). New AI Extract emits **one item per job** with `{url, title, tenant_id, sourcing_run_id, job_requisition_id}`. Fix: support both shapes; iterate `$input.all()` and emit `{jobUrl, jobTitle, ...tenant_ctx}` per item.

### BUG-S6 — `prepare job data` + `Extract Job Details1` used `$input.first()` in per-item mode
Both nodes have `mode: runOnceForEachItem` which forbids `$input.first()` (n8n hard error: "Can't use .first() here"). Both also returned without the required `{ json: ... }` wrapper. Fix: read via `$input.item.json` / `$json`, recover tenant context by pairing items by `$itemIndex` against the upstream node's `.all()` array, and wrap returns properly.

---

## Pipeline state after fixes (exec 482569, 22 nodes)

```
TS.1 Trigger Sourcing Webhook       ✅
TS.2 Create Sourcing Run            ✅  inserts hr_sourcing_runs row
TS.3 Sourcing Response              ✅  returns sourcing_run_id to caller

TS.2b Prepare Sourcing Input        ✅  fetches tenant_config + job
Fetch Careers Page                  ✅  GET careers-page.com/vitosolutions (22 KB)
Prepare HTML Data                   ✅  passes html + upstream fields
AI Extract Job Links                ✅  4 unique pattern_match jobs
If                                  ✅  routes to non-AI branch (needs_ai='false')
Process Job URLs                    ✅  4 items {jobUrl, jobTitle, tenant_ctx}
Scrape Individual Job               ✅  4 HTTP fetches
prepare job data                    ✅  4 items with html + url + title + tenant
Code (extractBetween)               ✅  4 items parsed (descriptions empty — see § Known limits)
Extract Job Details1                ✅  4 items, tenant_id forwarded
OpenAI Chat Model                   ✅
Basic LLM Chain                     ✅
Clean LLM Output2                   ✅
Loop Over Items                     ✅
Replace Me                          ✅
If2                                 ✅
Wait                                ✅
Google Custom Search API            ✅ (response degraded — see § Config gaps)
Parse API Results                   ✅

[blocked: Task request timed out after 60 seconds]
   ↓ (would continue to Apify, candidate dedup, Save Candidate, Enroll)
```

The 60-second timeout at the end is **Open Bug #96 (n8n Task Runner timeout on heavy chains)**, not a workflow bug. It is documented in `CLAUDE.md` § 12 as a pre-existing infrastructure issue. n8n container had to be restarted once during testing to clear an accumulated "Cannot find runner" task-broker state.

---

## Known limits surfaced (NOT in scope for this session)

- **Extracted job descriptions are empty.** The `Code` node uses old regex anchors (`Job Openings`, `EMPLOYMENT TYPE:`, etc.) that no longer match vitosolutions' current HTML structure. The job URL + title both flow through correctly, so an LLM-based extraction (already wired via Basic LLM Chain) takes over for the description. Improving extractBetween is a separate task.
- **Phase 2 returns 0 results** because Cosmique has no `google_api_key` / `google_cx` configured.
- **Phase 3 won't run** because Cosmique has no `apify_api_key` / `linkedin_cookie`.

These are **config gaps** (per-tenant API keys), not workflow bugs.

---

## Config gaps for AI sourcing (verified 2026-05-25)

Across all active tenants, the following keys are NULL on `tenant_config` for Cosmique:

| Key | Cosmique | Notes |
|---|---|---|
| `careers_page_url` | NULL | Per-tenant default careers URL (per-requisition `hr_job_requisitions.source_url` overrides it; set for this test, then restored) |
| `google_api_key` | NULL | Phase 2 (Google Custom Search) requires it |
| `google_cx` | NULL | Custom-Search engine id; Phase 2 requires it |
| `apify_api_key` | NULL | Phase 3 (Apify LinkedIn scrape) requires it |
| `linkedin_cookie` | NULL | Phase 3 (direct LinkedIn search) requires it |

For Cosmique to actually surface candidates from this pipeline end-to-end, one of those upstream channels must be funded.

---

## Files & nodes modified

All edits are in workflow `tHIN8s5hurqzRU7g`. No code outside n8n was touched. n8n credentials, frontend, and other workflows are untouched.

| Node | Type | Mode | Change |
|---|---|---|---|
| `TS.2b Prepare Sourcing Input` | code | default | NEW node (this arc) + v3 patch this session: derive tenant_id from `hr_job_requisitions` when missing |
| `Prepare HTML Data` | set | default | Removed double-`=` typo; enabled `includeOtherFields` |
| `AI Extract Job Links` | code | default | v5: deep-clone input, regex literals, manual URL resolver, tenant context from `$('TS.2b')` upstream, string-typed `needs_ai_extraction` |
| `Process Job URLs` | code | default | v2: accepts both `{jobLinks[], jobTitles[]}` (legacy) and per-item `{url, title}` (new); forwards tenant context |
| `prepare job data` | code | runOnceForEachItem | v3: `$input.item.json` instead of `$input.first()`; pair tenant context from `Process Job URLs` by `$itemIndex` |
| `Extract Job Details1` | code | runOnceForEachItem | v2: same per-item migration; return wrapped in `{ json: ... }`; skill detection logic preserved |

Connections added in this arc (still in place): `TS.2 → TS.2b`, `TS.2b → Fetch Careers Page`. No connections removed.

Workflow remained `active: true` throughout. n8n was restarted once (`docker restart n8n`, 25s downtime) to clear the Task Runner's accumulated "Cannot find runner" state from Open Bug #96 — same recovery pattern previously approved.

---

## Cleanup

- 15 `hr_sourcing_runs` rows in `status='running'` from today (test triggers) → marked `failed` with `completed_at=now`. None left in limbo.
- `hr_job_requisitions.source_url` for GP Aesthetics → restored to NULL.
- 0 PW-* test candidates across all tenants — pipeline never reached candidate persistence so nothing to sweep.

## Diagnostic artifacts (untracked)

`D:/420-system/.tmp_diag/` contains all execution dumps (`exec_*.json`) and patch scripts (`patch_*.py`) used during this session. Safe to delete; they regenerate on demand.
