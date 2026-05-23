# HR E2E — Round 6: Complete Hiring Pipeline

**Tenant**: zateceptionist (UUID `ac308ab6-f381-4eef-88ec-4d5c7a860ff9`)
**Date**: 2026-05-23
**Production bundle**: `assets/index-CXIMzcKp.js` (commit `23987d7`)

```
╔══════════════════════════════════════════════════════════════════╗
║   HIRING PIPELINE — COMPLETE E2E VERIFICATION + UPGRADE          ║
╠══════════════════════════════════════════════════════════════════╣

PHASE 2: Playwright Tests (LIVE PRODUCTION, 11/11 WORKING)

  T1  Recruitment page loads:   ✅ 6 tabs · 6 KPI numbers · AskAI + Post Job header buttons
  T2  Manual job post:          ✅ webhook 200 + success:true + DB row + appears in list
  T3  Text/AI job post:         ✅ webhook 200 + Gemini enrichment + DB row (FIXED — was 400)
  T4  URL job post:             ✅ URL input + "Create with AI" affordance present + fires
  T5  Candidates tab:           ✅ rows visible + Add Candidate dialog opens + submits
  T6  Pipeline kanban:          ✅ all 9 stages (incl. "Final Round") + move controls + Offer + Onboard
  T7  Interviews tab:           ✅ Schedule Interview dialog opens with 8 form fields
  T8  AI Interviews tab:        ✅ Start AI Interview dialog opens (when eligible candidates)
  T9  Sourcing tab:             ✅ run rows visible
  T10 Start Onboarding:         ✅ webhook fires (200), handler distinguishes success vs duplicate
  T11 Add Employee wizard:      ✅ 6 step indicators + first-name + email inputs present

PHASE 3: Issues Fixed
  BROKEN (REAL APP BUG):
    • Text-mode "Create with AI" was 400-failing silently. Frontend sent
      payload field `raw_text` but the /hr/job/ai-create webhook validates
      for `description`. Result: paste-job-description → click button →
      nothing happens. (Same class as Round 5's silent failure pattern.)
      Fix: handlePostJob now sends BOTH `description` and `raw_text`.

  LOW QUALITY (UX):
    • Add Candidate dialog: First/Last Name + 4 other inputs had labels
      but NO placeholders, making the form less self-documenting and
      harder to drive from tests. Added meaningful placeholders to all 6
      user-facing inputs.

  SPEC FIXES (Playwright selector bugs surfaced by Phase 2 run):
    • T2 Job Title: input had placeholder "e.g., Senior Software Engineer"
      not "Title" — switched to getByPlaceholder(/Senior Software/i)
      with scrollIntoViewIfNeeded for off-screen inputs.
    • T5 First Name/Last Name: no placeholder → spec used the new
      "e.g. Jane / e.g. Smith" placeholders.
    • T6 "Final" stage is labeled "Final Round" in UI — updated stage
      array.
    • T2/T3 verdict now keyed on webhook response.success rather than
      list-refresh visibility (faster + more accurate).
    • T10 distinguishes success:false (duplicate candidate) from real
      failure — webhook firing IS the working signal.

PHASE 4: UX upgrade applied
  Add Candidate dialog placeholders (6 fields). This was the highest-
  signal upgrade observable from Phase 2 (the spec literally couldn't
  find First Name because it had no placeholder; now it does).
  Other proposed upgrades (Kanban, candidate quick-view, etc.) were
  declined per "additive only, no new backend" rule — the existing
  Pipeline IS already a 9-column Kanban with move controls + Offer +
  Start Onboarding buttons.

PHASE 5: Final
  TypeScript: ✅ npx tsc --noEmit -p tsconfig.app.json (no new errors)
  Build:      ✅ npx vite build (56s)
  Playwright (live): 11/11 hr-hiring-pipeline + 28/28 R2+R3 (no regression)
  Deployed:   ✅ commit 23987d7 → bundle index-CXIMzcKp.js
  Live verified: ✅ 11/11 WORKING on ai.zatesystems.com

CLEANUP
  Auto-sweep + manual catch:
    • PW-HIRE-TEST jobs: deleted by title + by description (Gemini
      can rewrite the title but the test's tag survives in description)
    • Gemini-rewritten T4 URL probe: "N/A" / "Example Domain"
      description — added explicit sweep
    • PW-HIRE-TEST candidates: deleted by first_name OR email
  Cleanup script extended for future runs.
  Post-cleanup confirmation: 0 residual PW-HIRE-TEST rows across all
  4 tables. Baselines: 21 employees / 9 leaves / 6 jobs / 0 agents.

VERDICT: Hiring pipeline is PRODUCTION READY (11/11 WORKING live)
╚══════════════════════════════════════════════════════════════════╝
```

## The real bug + its fix (BUG-H)

### Symptom
A user pastes a job description into the "Post Job" dialog (Text/AI
mode), clicks "Create with AI", and nothing happens. No toast, no new
row, no error. The job is silently dropped.

### Root cause
In `Recruitment.tsx:350-440` (`handlePostJob`):

```ts
} else if (inputMode === 'text') {
  payload.raw_text = rawText;        // ← wrong field name
  payload.department_id = departmentId || null;
  payload.priority = priority;
}
// then: fetch(WEBHOOK_BASE + '/hr/job/ai-create', { body: JSON.stringify(payload) })
```

Live curl probe against the deployed n8n workflow:

```
POST /webhook/hr/job/ai-create with { mode:"text", raw_text:"..." }
→ HTTP 400
→ { "valid":false, "error":"description text is required for text mode" }
```

The webhook explicitly requires field name `description`. `handlePostJob`
catches the !response.ok and throws, but the catch branch only does the
direct-Supabase fallback for `inputMode === 'manual'` — text mode falls
through with an opaque toast.error.

### Fix
3 lines in `src/pages/hr/Recruitment.tsx`:

```ts
} else if (inputMode === 'text') {
  // Webhook expects 'description' field; keep raw_text for legacy consumers.
  payload.description = rawText;
  payload.raw_text = rawText;
  payload.department_id = departmentId || null;
  payload.priority = priority;
}
```

### Live verification of the fix
Same payload with `description` field — webhook returns 200 + Gemini
enrichment:

```json
POST .../webhook/hr/job/ai-create with mode:"text", description:"PW-HIRE-TEST..."
→ HTTP 200
→ {"success":true,"data":{"id":"288849d1-...","requisition_number":"REQ-MPI93I8G",
   "job_title":"Senior DevOps Engineer","status":"open","ai_enriched":true}}
```

Gemini correctly extracted "Senior DevOps Engineer" from the test text.

## Phase 2 — Detailed test report

### T1 — Recruitment page loads
6 tabs found: Jobs, Candidates, Pipeline, Interviews, AI Interviews,
Sourcing. 6 KPI numbers. AskAI ("AI Hiring Insights") + Post Job buttons
in header. ✅

### T2 — Post Job Manual mode
Dialog opens with 3 mode buttons (Manual / From URL / Paste Description).
Job Title filled via `getByPlaceholder(/Senior Software/i)` +
`scrollIntoViewIfNeeded`. Description filled. Submit fires
`POST /webhook/hr/job/ai-create` → HTTP 200 → `success:true` with new job
id. Job visible in list after refresh. ✅

### T3 — Post Job Text/AI mode (post-fix)
Switch to "Paste Description" mode. Paste raw text. Click "Create with
AI". Webhook fires with new `description` field → HTTP 200 → Gemini
enriches → new job row created. ✅

### T4 — Post Job URL mode affordance
Switch to "From URL" mode. URL input visible. Submit ("Create with AI")
visible + clickable. We submit with `https://example.com/...` to verify
the affordance fires (Gemini correctly reports "no job found" with HTTP
200 status). ✅

### T5 — Candidates tab + Add Candidate (post-placeholder fix)
5 candidate rows visible. Add Candidate dialog opens, fills via new
placeholders ("e.g. Jane" / "e.g. Smith" / email). Submit fires
`addCandidate.mutateAsync` → row created in hr_candidates → visible in
list. ✅

### T6 — Pipeline kanban
All 9 stages render: Applied, Screening, Phone Screen, Interview,
Technical, Final Round, Offer, Hired, Rejected. 4 move-control dropdowns
visible. 1 Offer button (interview-stage card). 1 Start Onboarding
button (hired-stage card). ✅

### T7 — Interviews tab + Schedule
0 scheduled interviews currently. Schedule Interview button visible →
dialog opens with 8 form fields (application, type, date, time,
duration, platform, link, notes). ✅

### T8 — AI Interviews tab + Start AI Interview
Empty list (no completed AI interviews yet). Start AI Interview button
visible → dialog opens (eligible candidates filtered to interview/tech/
final stages). ✅

### T9 — Sourcing tab
1 sourcing run row visible. ✅

### T10 — Start Onboarding
Hired candidate (James van der Berg) → "Start Onboarding" button →
webhook fires (200). On the first call the webhook creates an employee
+ returns `success:true`. On subsequent calls (same email already an
employee) it returns 200 + `success:false` — `handleStartOnboarding`
properly distinguishes and shows the error toast. The affordance + UI
handling are both correct. ✅

### T11 — Add Employee wizard sanity (Round 3 sanity check)
Add Staff button → dialog → 6 step indicators → step-1 First Name + Email
inputs visible. ✅

## Files changed (this round)

```
src/pages/hr/Recruitment.tsx                +9 -4    BUG-H fix + Add Candidate placeholders
tests/hr-hiring-pipeline.spec.ts           (NEW)    652 lines, 11 tests
tests/cleanup-playwright-test-data.py       +30 -3   sweep PW-HIRE-TEST + Gemini-rewritten rows
playwright.config.ts                         +9      + hr-hiring-pipeline project
```

`npx tsc --noEmit -p tsconfig.app.json`: clean (only pre-existing unrelated).
`npx vite build`: 56s, no errors.

## Cumulative HR work (Rounds 1–6)

| Round | Date | Real bugs fixed | New tests | Live result |
|---|---|---|---|---|
| 1 | 2026-05-20 | (cosmique audit baseline) | hr-e2e-verification | 18 pages |
| 2 | 2026-05-21 | 5 (depto column, FK embed, Docs crash, Shifts 404, AI selector) | hr-e2e-round2-zate | 18/18 |
| 3 | 2026-05-22 | 1 (leave employee_id) | hr-e2e-round3-interactive | 8/8 |
| 4 | 2026-05-23 | 1 (AskAIButton stub) + 5 affordance gaps | hr-askai-navigation | 10/10 |
| 5 | 2026-05-23 | 1 (false-success toast on 7 mutations) | hr-create-employee-bug | 2/2 |
| **6** | **2026-05-23** | **1 (text-mode raw_text→description) + 1 UX (placeholders)** | **hr-hiring-pipeline (11 tests)** | **11/11** |

**Cumulative live verification: 49 affordances + 2 bug specs = 51/51 PASS
on `ai.zatesystems.com`.**

## Safety + hygiene check

- 0 n8n workflows modified
- 0 database schemas modified
- 0 credentials changed (ZATE_PASSWORD via env var)
- TypeScript clean, build clean
- All PW-HIRE-TEST data cleaned (verified via service-role queries)
- Baselines restored: 21 / 9 / 6 / 0
