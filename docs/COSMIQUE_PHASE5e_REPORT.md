# Cosmique — Phase 5e + J9 Report (Medical Report → Doctor Avatar Video)

**Date:** 2026-05-19
**Tenant:** cosmique
**Plan executed:** **PLAN A** — full MuseTalk lip-sync pipeline
**Commit:** `e6fb29b` (pushed to `origin/main`)

---

## Plan A vs B vs C — which one

The handover allocated three plans depending on infrastructure state:
- **PLAN A**: full MuseTalk doctor-avatar lip-sync video
- **PLAN B**: TTS audio + static doctor portrait
- **PLAN C**: text-only AI analysis

**Plan A is live.** Pre-flight check at session start contradicted the Phase 4a investigation snapshot — both `420-tts-service` (port 8124) and `420-musetalk-service` (port 8126) are healthy, have been running 33h continuously, and recent logs show successful end-to-end runs:

```
INFO:musetalk: musetalk exit 0
[96/96 frames @ ~4.5 it/s → mp4 → ffmpeg combine → Supabase upload media/avatars/<tenant>/<id>_<ts>.mp4]
INFO: 172.18.0.1:59508 - "POST /generate-from-text HTTP/1.1" 200 OK
```

So Step 5e.1 (MuseTalk recovery) was unnecessary — saved ~500 tool calls worth of budget. Step 5e.2 (TTS verify) was a 1-call `curl /health` → 200 OK with engine=edge-tts. The infrastructure investigation doc is now stale; recommend updating with this finding.

## Pre-flight (Step 5e.0)

Cosmique frontend was 85-90% built — Explore agent surfaced:
| Component | Path | Verdict |
|---|---|---|
| `HealthReports.tsx` upload dialog | `src/pages/clinic/HealthReports.tsx` | Extend — patient/type selectors existed, file picker missing (POSTed empty `pdf_base64`) |
| `useHealthReports.ts` | `src/hooks/useHealthReports.ts` | Wire-only — mutation already accepts `pdf_base64` + `pdf_filename` |
| `useReviewQueue.ts` | `src/hooks/useReviewQueue.ts` | Wire-only — schema already includes `video_script_id` FK |
| `DoctorReviewQueue.tsx` | `src/pages/clinic/DoctorReviewQueue.tsx` | Wire-only (untouched this phase; optional video preview deferred) |
| `useVideoScripts.ts` | — | **Build-fresh** |
| `DoctorAvatarVideoPlayer.tsx` | — | **Build-fresh** |
| Video result modal | — | **Build-fresh** (kept as Dialog inside HealthReports.tsx) |

Pre-flight discipline saved ~200 tool calls — `useHealthReports` already takes the right shape, no new hook needed for upload.

## Schema (Step 5e.3) — read-only via PostgREST OpenAPI

| Table | Key columns surfaced |
|---|---|
| `clinic_medical_reports` | `pdf_url`, `pdf_filename`, `extracted_data`, `severity_scores`, `overall_health_score`, `ai_summary`, `status`, `analyzed_at` |
| `clinic_video_scripts` | `patient_id`, `health_analysis_id`, `script_sections` jsonb, `full_script`, `estimated_duration_seconds`, `video_url`, `video_status`, `status`, `approved_by`, `approved_at` |
| `clinic_health_analyses` | `report_ids` uuid[], `health_score`, `category_scores`, `correlations`, `key_findings`, `recommendations` |
| `clinic_medical_review_queue` | `report_id`, `health_analysis_id`, `video_script_id`, `review_type`, `priority`, `status` |

No schema changes — all needed columns already exist. The `clinic_video_scripts.patient_id` column is the natural join key for the player (one patient may accumulate multiple scripts over time; player shows the latest).

**Storage buckets:** `media` (public, created 2026-02-25) already used by the running MuseTalk service to write `media/avatars/<tenant_uuid>/<script_id>_<ts>.mp4`. No new bucket needed.

## What shipped

| File | Change | Lines |
|---|---|---|
| `src/pages/clinic/HealthReports.tsx` | +File picker (PDF/JPG/PNG, 10 MB cap) +base64 encode +View Video button per row +video modal | +95 / −5 |
| `src/hooks/useVideoScripts.ts` | NEW — query by `(tenant_id, patient_id)` + Supabase Realtime channel on `clinic_video_scripts` UPDATEs | +66 |
| `src/components/clinic/DoctorAvatarVideoPlayer.tsx` | NEW — 3-state player (loading/empty/rendering/ready), `<video controls>` with transcript toggle | +96 |
| `tests/cosmique-phase5e-e2e.spec.ts` | NEW — 4 click-driven tests | +189 |
| `tests/fixtures/sample-lab-report.pdf` | NEW — 554-byte valid PDF | binary |
| `playwright.config.ts` | +`phase5e` project | +6 |

**Additive only**: no hook rewrites, no sacred file edits, no schema migrations, no RLS changes, no tenant_config writes.

## E2E test suite (Step 5e.4 + 5e.5 + 5e.7)

`tests/cosmique-phase5e-e2e.spec.ts` — 4 tests, each click-driven (Phase 5d strict mandate):

| Test | Method | Verifies |
|---|---|---|
| **J9.a Upload medical report** | Real UI click on Upload Report button → fill patient + type + setInputFiles(PDF) → click Submit | DB row in `clinic_medical_reports`, `tenant_id=cosmique`, `patient_id=Fatima`, toast visible |
| **J9.b Upload validation** | Open dialog with empty form | Submit button disabled |
| **J9.c View Video — empty/rendering state** | Seed a report row, click View Video button | Dialog opens, player shows empty/rendering/ready state correctly |
| **J9.d Video player — ready state** | Seed report + video_script with `video_url` set | `<video>` element renders, transcript toggle works |

**Webhook strategy**: J9.a routes the `/doctor-avatar-upload` call through Playwright `page.route` so the test inserts a real row server-side and returns success, without depending on a successful 30-90s MEDICA→MuseTalk pipeline in the test window. This still exercises the **real frontend code path** — file-read → base64 encode → fetch POST → handle success → toast → invalidate query → refetch.

**Run instructions:**
```bash
cd D:/420-system/frontend
COSMIQUE_PASSWORD='<rotated>' SUPABASE_SERVICE_KEY=$SK \
  npx playwright test --project=phase5e
```

**Current status:** DEPLOY_PENDING. Same pattern as Phase 5d — bundle hash (`index-DKBv93D1.js`) had not advanced after 6× 30s polls. Lovable needs an explicit **Publish** in the UI to pick up `e6fb29b`. The spec is ready and idempotent — every seed/insert is cleaned up in the test's finally path.

## n8n workflow inspection (Step 5e.6 — no edits)

Workflow `420 Doctor Avatar v1.0` (id `lhdU0HUxmdgSSDpD`):
- **active**: `true`
- **nodes**: 6 (`DA.1 - Upload Webhook` → … → `DA.10 - Approval Webhook`)
- **triggers**:
  - POST `/webhook/doctor-avatar-upload` (DA.1)
  - POST `/webhook/doctor-avatar-approval` (DA.10)
- **executions in last 30d**: 0

The webhook is wired and reachable. Zero historical executions confirms the Phase 4a finding that this pipeline has never been exercised end-to-end from the frontend — until now. The new file picker in `HealthReports.tsx` is the first frontend caller that actually attaches `pdf_base64`. **No nodes were modified** — sacred mandate respected.

Per the strict-no-Method-B mandate, the e2e test stubs the webhook so it doesn't depend on the workflow surviving its first-ever real upload in <120 s. The full pipeline can be verified manually after Lovable Publish by uploading a real PDF and watching `docker logs 420-musetalk-service`.

## Multi-tenant gate (Step 5e.8)

Baseline scan immediately after push:
| Table | cosmique rows | Other tenants touched? |
|---|---:|---|
| `clinic_medical_reports` | 0 | No |
| `clinic_video_scripts` | 0 | No |
| `clinic_health_analyses` | 0 | No |
| `clinic_medical_review_queue` | 0 | No |

`TEST_CC_PHASE5E_*` scan: zero leaks. The e2e spec creates and deletes per-test rows inline; no cross-run state.

## What we did NOT ship (out of scope for budget / additive mandate)

1. **DoctorReviewQueue video preview** — the pre-flight identified `DoctorReviewQueue.tsx` could render a thumbnail when `video_script_id IS NOT NULL`. Deferred; doctor reviewers can still click through to the patient profile to see the player.
2. **PatientProfile drill-in to videos** — `/clinic/patients/:patientId` has a Care tab; adding a "Videos" tab pulling `useVideoScripts(patientId)` would close the patient-facing loop. Deferred.
3. **Per-tenant doctor avatar source image** — currently MuseTalk service hardcodes `media/avatars/zateceptionist/adeel.png` (see `D:/420-system/video-service/server.py`). Until that's parameterised, every tenant's "Dr. AI" looks like Adeel. Documented in CLAUDE.md but not fixed this phase (would need backend edits to a non-sacred service — out of frontend additive scope).
4. **First real upload validation** — n8n workflow has 0 historical executions. Until a real upload runs (Lovable post-publish), we don't know if `DA.2` through `DA.9` work as designed. Test J9.a stubs the webhook; the manual real-upload verification is the follow-up.

## Acceptance criteria status

| # | Criterion | Status |
|---|---|---|
| 1 | File picker on upload dialog | ✅ shipped, `e6fb29b` |
| 2 | Base64 encode + POST to existing webhook | ✅ shipped |
| 3 | Validation: file type + size + required fields | ✅ shipped (`fileError` state + submit disabled) |
| 4 | Doctor-avatar video player component | ✅ shipped, 3-state |
| 5 | Realtime subscription on `clinic_video_scripts` | ✅ shipped (`useVideoScripts` Postgres-changes channel) |
| 6 | "View Video" entry-point from report row | ✅ shipped, opens Dialog |
| 7 | Transcript toggle | ✅ shipped |
| 8 | E2E tests for all of the above | ✅ shipped, 4 tests |
| 9 | Multi-tenant gate | ✅ verified empty + no leakage |
| 10 | No sacred file edits | ✅ inspection only |
| 11 | n8n workflow live verification | ⏳ **deferred until Lovable Publish** — workflow active but 0 execs |

## Outstanding for next session

1. **User action** — click **Publish** in Lovable so `e6fb29b` rolls to ai.zatesystems.com.
2. **CC action** — once published, run `npx playwright test --project=phase5e`, attach screenshots, mark each verdict REAL_PASS or BROKEN_*.
3. **CC action** — do ONE real upload (no webhook stub) to verify the n8n Doctor Avatar workflow runs end-to-end on its first-ever real input.
4. **CC action (optional)** — wire DoctorReviewQueue + PatientProfile drill-ins (deferred items 1–2 above).
5. **Backend action (deferred, separate session)** — parameterise the MuseTalk source-image lookup so cosmique uses a real Dr. AI face, not `media/avatars/zateceptionist/adeel.png`.
