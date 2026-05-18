# Cosmique — Doctor Avatar / Medical Video Investigation

**Date:** 2026-05-18
**Tenant:** cosmique (UUID `933967dd-1f90-4676-96c1-42a01b6d9835`)
**Reported issue:** "I can't see the doctor's avatar and doctor explaining the diagnosis to patients when the report is uploaded."
**Mode:** READ-ONLY investigation. Zero modifications. Fix recommendations are advisory only — user will review and approve before any change is implemented.

---

## Bottom line

The chain is broken in **THREE independent places**, any one of which alone would prevent the user from seeing a doctor avatar video. They're stacked, so even if one is fixed the user still won't see anything.

1. **Frontend has no player.** The React app has an upload page and a doctor-review queue page, but it has **no patient-facing video result component**. There is no hook that queries `clinic_video_scripts`, no `<video>` element in the clinic module, and no route that renders the generated avatar video. The `video_script_id` field exists in `clinic_medical_review_queue` but the UI ignores it.
2. **Backend MuseTalk service is crashing.** `420-musetalk-service` (port 8126) has a hard dependency conflict (`huggingface-hub==1.13.0` installed, but `>=0.19.3,<1.0` required) plus missing model files (`dw-ll_ucoco_384.pth`, `musetalk/config.json`) and a missing `mmpose` module. The lipsync step of the pipeline cannot run.
3. **Nothing has ever exercised this chain for Cosmique anyway.** All four medical tables (`clinic_medical_reports`, `clinic_video_scripts`, `clinic_medical_review_queue`, `clinic_health_analyses`) have **0 rows for cosmique**. The Doctor Avatar n8n workflow (`lhdU0HUxmdgSSDpD`) has **zero executions in its lifetime**. The user's report implies they expected to see something, but no upload has actually completed through the pipeline — most likely the upload fails silently or never reaches the backend, and even if it did, items 1 & 2 above would block display.

---

## The expected chain (from CLAUDE.md + code)

```
1. Patient or staff uploads PDF report via /clinic/health-reports page
        ↓
2. Frontend POSTs base64 PDF to webhook https://webhooks.zatesystems.com/webhook/doctor-avatar-upload
        ↓
3. n8n workflow "420 Doctor Avatar v1.0" (lhdU0HUxmdgSSDpD, 6 nodes)
        ↓ parses report (Gemini Vision?) and INSERTs clinic_medical_reports
        ↓ creates clinic_video_scripts row with script_text
        ↓ enqueues clinic_medical_review_queue with video_script_id
        ↓ forwards request to 420-video-service-ai /generate-avatar (port 8125)
        ↓
4. video-service calls 420-musetalk-service /generate-from-text (port 8126)
        ↓ TTS (via 420-tts-service port 8124, Edge TTS, voice=en-US-ChristopherNeural)
        ↓ MuseTalk lipsync against doctor avatar PNG
        ↓ FFmpeg compose
        ↓ upload result to Supabase Storage
        ↓ PATCH clinic_video_scripts.video_url
        ↓
5. Frontend subscribes to realtime updates, displays <video> to patient
```

---

## What we found, per layer

### Layer 1 — Frontend (React, Vite, Supabase JS)

| What should exist | Status | File |
|---|:---:|---|
| Medical report upload UI | EXISTS | `D:/420-system/frontend/src/pages/clinic/HealthReports.tsx` (route `/clinic/health-reports`) |
| `useHealthReports` hook (queries `clinic_medical_reports` + `clinic_health_analyses`) | EXISTS | `D:/420-system/frontend/src/hooks/useHealthReports.ts` |
| Doctor review queue UI | EXISTS | `D:/420-system/frontend/src/pages/clinic/DoctorReviewQueue.tsx` (route `/clinic/review-queue`) |
| `useReviewQueue` hook (queries `clinic_medical_review_queue`) | EXISTS | `D:/420-system/frontend/src/hooks/useReviewQueue.ts` (line 12 includes `video_script_id` in ReviewQueueItem type) |
| Hook to fetch `clinic_video_scripts` | **MISSING** | — |
| `<video>` player component (patient-facing) | **MISSING** | — |
| Route to display generated doctor video | **MISSING** | — |
| Realtime subscription for video-ready notification | **MISSING** | No `supabase.channel(`/`postgres_changes` in any clinic file |
| Doctor-review-queue video preview | **MISSING** | `DoctorReviewQueue.tsx` does not render anything when `video_script_id` is populated |

The upload happens to `https://webhooks.zatesystems.com/webhook/doctor-avatar-upload` (see `useHealthReports.ts:95`). PDF is base64-encoded into the JSON body, not uploaded to a Supabase Storage bucket directly. This is a server-mediated upload pattern.

### Layer 2 — n8n workflows

n8n is HEALTHY (`/healthz` returns 200). All three target workflows are `active=true`:

| Workflow | ID | Nodes | Lifetime executions |
|---|---|---:|---:|
| Doctor Avatar v1.0 | `lhdU0HUxmdgSSDpD` | 6 | **0** |
| Video Intelligence Orchestrator v1.0 | `fvXs1Z94tvje0QfY` | 16 | **0** |
| Clinic v1.0 | `pATH22OccRa9pjlR` | 3 | **0** |

Zero executions in lifetime. Either:
- The webhook URL the frontend posts to (`webhooks.zatesystems.com/webhook/doctor-avatar-upload`) doesn't reach this workflow (DNS / ingress / Cloudflare misroute), OR
- No human has clicked the upload button in production, OR
- Uploads are failing on the frontend before they reach the network.

### Layer 3 — Backend services (Docker containers)

| Container | Port | Status |
|---|:---:|---|
| `420-langgraph-brain` (MEDICA agent) | 8123 | ✓ Healthy |
| `420-tts-service` (Edge TTS) | 8124 | ✓ Healthy |
| `420-video-service-ai` (orchestrator) | 8125 | ✓ Healthy (but ComfyUI dep is down) |
| **`420-musetalk-service`** | **8126** | **✗ Crashing** — `huggingface-hub` version conflict (`1.13.0` installed, `<1.0` required); missing `dwpose/dw-ll_ucoco_384.pth`; missing `musetalk/config.json`; missing `mmpose` module |
| `420-remotion-service` | 8127 | ✓ Healthy |
| `420-image-composer` | 8128 | ✓ Healthy |
| ComfyUI on Windows host | 8188 | ✗ Not listening — `curl localhost:8188/system_stats` fails. Image-gen falls back to Pexels/Pollinations. |

The MEDICA agent in LangGraph is reachable but its tools are not currently exercised by the chain — the n8n Doctor Avatar workflow uses Gemini/HTTP nodes for parsing, not LangGraph (per the 6-node count).

### Layer 4 — Database state (Cosmique)

| Table | Rows |
|---|---:|
| `clinic_medical_reports` | 0 |
| `clinic_video_scripts` | 0 |
| `clinic_medical_review_queue` | 0 |
| `clinic_health_analyses` | 0 |
| `clinic_patients` | 3 (Onboarding v5 seed) |
| `clinic_treatments` | 14 (post-Phase 2) |

### Layer 5 — Avatar provider integrations

- **No external avatar API keys** in `D:/420-system/.env`. No `HEYGEN_API_KEY`, `DID_API_KEY`, `TAVUS_API_KEY`, `SYNTHESIA_API_KEY`, `HEDRA_API_KEY`. MuseTalk (self-hosted, GPU) is the only avatar engine wired.
- MuseTalk tries to download avatar PNG from `https://fncfbywkemsxwuiowxxe.supabase.co/storage/v1/object/public/media/avatars/zateceptionist/adeel.png` (hardcoded default in `D:/420-system/video-service/server.py:35-37`). No cosmique-specific avatar image was found.

### Layer 6 — tenant_config for Cosmique

| Field | Value |
|---|---|
| `features` | `{"hr": false, "sales": true, "voice": true, "marketing": true}` — **no `clinic`/`medical`/`healthcare` flag** |
| `ai_agent_mode` | `standard` |
| `default_video_voice` | `en-US-ChristopherNeural` (set; not aesthetic-clinic-flavoured) |
| `default_video_music` | `corporate` |
| `video_monthly_budget` | NULL |

The `features` object does not enable a `clinic` capability flag. If any gate in n8n or LangGraph checks `tenant_config.features.clinic === true`, cosmique would be gated out. **This needs verification** — search `n8n` workflow JSON + LangGraph code for `features.clinic` reads before assuming this is the gate.

---

## Where exactly is the chain broken?

The user said "I can't see the doctor's avatar". For that to be true, the chain has to start AND fail at display. Investigation suggests it's failing earlier:

- **Most likely**: the user uploaded a report (or expected to be able to upload), but the request never reached the backend webhook (zero n8n executions = zero entries in `clinic_medical_reports`). This could be a network/CORS/auth failure on the upload POST itself.
- **Even if the upload worked**: MuseTalk's broken state means no video would ever be rendered.
- **Even if MuseTalk worked**: the frontend has no component to display the result. So the user would never see anything regardless.

This is a "Swiss cheese" failure — all holes lined up.

---

## Recommended additive fix path (USER REVIEW BEFORE IMPLEMENTATION)

Listed in dependency order — fixing later items without earlier ones gives no user-visible result.

### Step 1 — Verify the upload actually reaches the backend
- Open browser devtools on `/clinic/health-reports`, click upload, observe the POST to `https://webhooks.zatesystems.com/webhook/doctor-avatar-upload`. Check network tab for status code + response. If 404/CORS/timeout: ingress/Cloudflare/n8n webhook registration issue.
- Confirm webhook is registered in n8n: `curl -H "X-N8N-API-KEY: …" http://localhost:5678/api/v1/workflows/lhdU0HUxmdgSSDpD` and check the webhook node's `webhookId` field is present (per CLAUDE.md convention from Feb/March/May 2026 defects, API-created webhooks need explicit `webhookId`).
- If upload fails: fix ingress / fix n8n webhook registration. Without this, nothing else matters.

### Step 2 — Fix MuseTalk service (port 8126)
- Pin `huggingface-hub<1.0` in MuseTalk's requirements/Dockerfile. Rebuild container.
- Restore the missing model files: `dwpose/dw-ll_ucoco_384.pth` and `musetalk/config.json`. Likely the model-download step in the build was skipped or the volume mount is wrong.
- Install `mmpose` in the container.
- Smoke-test: `curl -X POST http://localhost:8126/generate-from-text -d '{"text":"hello","tenant_id":"cosmique"}'`.

### Step 3 — Add cosmique-specific doctor avatar image
- Upload a doctor-portrait PNG to Supabase Storage at `media/avatars/cosmique/doctor.png`.
- Either: (a) extend `tenant_config` with a column like `default_doctor_avatar_url`, OR (b) store the path in `tenant_config.features.doctor_avatar_url` (matches existing convention from CLAUDE.md § 6 "Brand colors with no schema column → store in `tenant_config.features` as …").
- Update `D:/420-system/video-service/server.py:35-37` to read per-tenant avatar URL instead of the hardcoded `zateceptionist/adeel.png` default.

### Step 4 — Build the missing frontend video player
- New hook: `D:/420-system/frontend/src/hooks/useVideoScripts.ts` — queries `clinic_video_scripts` by `report_id` or `id`, with `tenant_id=eq.<current>` guard.
- New component: `D:/420-system/frontend/src/components/clinic/DoctorAvatarVideoPlayer.tsx` — renders `<video src={videoUrl} controls>` plus a transcript panel showing `script_text`.
- Mount: add a "View Video" action on each row in `HealthReports.tsx`'s expanded view OR a new route `/clinic/reports/:reportId/video`.
- Enhance `DoctorReviewQueue.tsx` to render a small video preview when `video_script_id` is populated.

### Step 5 — Add realtime notification
- Add a Supabase channel subscription on `clinic_video_scripts` filtered by `tenant_id` so the page auto-updates when the video URL appears (currently the patient would need to refresh).

### Step 6 — (optional) feature flag
- If the platform uses `tenant_config.features.clinic` as a gate anywhere, set it true for cosmique. Verify first — don't add untested feature flags.

---

## What we did NOT do (mandate compliance)

- Zero file edits outside this doc + the trigger log + status doc.
- Zero n8n workflow modifications.
- Zero database writes other than the already-approved Phase 2.10 Botox description APPEND on `clinic_treatments` (single row, primary-key WHERE, multi-tenant isolation verified PASS, only cosmique touched).
- Zero container restarts.
- Zero ComfyUI / TTS / MEDICA tool invocations.
- Zero changes to sacred workflows.
- Zero changes to BBQ Ops session files (NavigationSidebar, AgentNetwork, Budgets, PurchaseOrders, Shipments, OpsCommandCenter, formatCurrency).
- Zero changes to `frontend/src/components/omega/v3/nav/usePulseData.ts` or `sectionsRegistry.ts`.

---

## STOP — awaiting user review

Per the handover instruction: "STOP AFTER THIS REPORT. Do not implement fixes yet — user will review." Investigation is complete. The recommended fix path above is sequenced for dependency order and additive-only. User decides which steps to authorize and in what order.
