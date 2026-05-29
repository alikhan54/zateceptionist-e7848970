# Cosmique — Phase 7 Post-Deploy Verification + Phase 8 Item #1

**Date:** 2026-05-22
**Mission:** Verify Phase 7's 2 DEPLOY_PENDING UI features (C.1 photos + D.1 AI Rx) now that Lovable published `7328f28`, and resolve Phase 8 backlog item #1 (MEDICA tool-routing tweak).

---

## TL;DR

| Item | Verdict | Evidence |
|---|---|---|
| Deploy of `7328f28` | ✅ **LANDED** | Bundle `index-DDbb-T9D.js` → `index-DiZwGbQD.js`; testids present in `PatientProfile-BpnOhTh2.js` |
| **7.C.1 Patient photos** | ✅ **REAL_PASS** | consultation row `07f755ac…` created with 1 before + 1 after photo; UI grid rendered the pair; cleanup deleted row + storage objects |
| **7.D.1 MEDICA AI-suggested Rx** | ✅ **REAL_PASS** | Diagnosis "acne vulgaris" → MEDICA suggested **"Clindamycin Topical Solution"** (clinically appropriate); AI badge visible; first medicine name populated |
| 7.B.1 OMEGA Q&A | 🟡 **PARTIAL** — passed by spec assertion (2 of 3 topic hits + all distinct), but Q1 returned `"OMEGA is temporarily unavailable."` (real failure) and Q2 said `"4 active patients (leads from Google, avg score 48.2)"` — reproducing the Phase 7 channel-mode/sender_type drift |
| Phase 8 item #1 (MEDICA tool-routing) | ❌ **INVALID** — closed; no code change | Investigation in § 3 below |
| Multi-tenant cleanup | ✅ **CLEAN** | 0 leaked rows; 2 leaked PNGs in media bucket removed post-run |

5/5 Playwright tests passed in 6.8 min (cold cache).

---

## 1. Deploy verification: ✅ LANDED

| | Before | Now |
|---|---|---|
| Bundle hash | `index-DDbb-T9D.js` (Phase 5e era) | **`index-DiZwGbQD.js`** |
| Phase 7 chunk | n/a | `PatientProfile-BpnOhTh2.js` (34.5 KB) |

Probed strings in `PatientProfile-BpnOhTh2.js` (curl from ai.zatesystems.com, no auth):

```
add-photos-button     ✓ present
rx-ai-suggest         ✓ present
MEDICA-suggested      ✓ present
Suggest with AI       ✓ present
Add Photos            ✓ present
before_photos         ✓ present
after_photos          ✓ present
agent_hint            ✓ present
```

Phase 7 commit `7328f28` is live on `https://ai.zatesystems.com`. C.1 + D.1 exercisable via real UI clicks.

---

## 2. E2E results — `cosmique-phase7-e2e.spec.ts`

Run command (with `.env.local` sourced):

```
cd D:/420-system/frontend
set -a; source .env.local; source D:/420-system/.env; set +a
npx playwright test --project=phase7 --reporter=line
```

Output: `5 passed (6.8m)` — `tests/phase7-results.json` written.

### 7.C.1 — Patient progress photos: REAL_PASS

8-step gate:

| Step | Result |
|---|---|
| 1. Navigate `/clinic/patients/178729e2-bc49-45f8-bb89-c0c8962e2594` (Fatima) | OK |
| 2. Click Photos tab | OK |
| 3. Click `add-photos-button` | dialog opened |
| 4. Fill before + after via `setInputFiles`; caption `TEST_CC_PHASE7_follow-up`; click `photo-save-submit` | OK |
| 5. Storage upload + Supabase INSERT | 2xx (otherwise step 6 would have failed) |
| 6. **DB assertion**: `clinic_consultations` row exists with `chief_complaint=TEST_CC_PHASE7_follow-up`, `before_photos.length>=1`, `after_photos.length>=1` | ✅ row id `07f755ac-503a-4f56-a9a2-81c9cade68b3`, before=1, after=1 |
| 7. **UI assertion**: `[data-testid^="photo-pair-"]` count >= 1 (polled) | ✅ |
| 8. Error path | not exercised this run (spec covers DEPLOY_PENDING branch only) |

Screenshot: `tests/screenshots/phase7-c1-photos.png`.

**Cleanup**: spec DELETEd consultation row + unlinked fixture files. Manual sweep deleted 2 leaked PNGs from `media` bucket at `patients/933967dd-…/178729e2-…/` (storage cleanup missing from spec — noted as hardening pattern #11 below).

### 7.D.1 — MEDICA-suggested Rx: REAL_PASS

8-step gate (Steps 6+8 are about the AI-suggest button, NOT a Rx save — the test verifies the AI populates the form; user reviews + saves):

| Step | Result |
|---|---|
| 1. Navigate `/clinic/patients/178729e2-…` | OK |
| 2. Click Care tab → `add-prescription-button` | dialog opened |
| 3. Fill `rx-diagnosis-input` with `acne vulgaris` | OK |
| 4. Click `rx-ai-suggest` (POSTs to `/webhook/omega-chat` with `agent_hint:"medica"`) | OK |
| 5. Webhook returned within 150s timeout | OK (badge visible) |
| 6. **UI assertion**: `rx-ai-badge-0` visible; `rx-med-name-0` populated | ✅ **first medicine = "Clindamycin Topical Solution"** (clinically appropriate first-line topical for inflammatory acne) |
| 7. User-controlled review preserved (no auto-submit) | ✅ (no Rx row created) |
| 8. Error path | not exercised this run |

Screenshot: `tests/screenshots/phase7-d1-ai-suggest.png`.

**Cleanup**: no Rx row created (form not submitted). Clean.

### 7.B.1 — OMEGA Q&A: PARTIAL (passed by spec but real Q1 failure + Q2 drift)

Captured verbatim from DOM (Playwright `transcript.innerText`):

**Q1 — "what services do you offer?"** (33 chars)
```
OMEGA is temporarily unavailable.
```
**Real failure.** Likely VRAM cold-load timeout on the first qwen2.5:7b call after idle period (T29 plus 8 GB VRAM eviction documented in CLAUDE.md). Spec keyword check returned `false` but the test as a whole passed because Q2+Q3 hit their topics.

**Q2 — "how many patients do I have?"** (248 chars)
```
**[MEDICA Healthcare Intelligence Agent]** Hello! Based on the information
available in our system, you currently have 4 active patients. These are
leads from Google with an average score of 48.2. Would you like more
detailed information about thes[…]
```
**Same drift as Phase 7** — MEDICA prefix preserved (correct routing) but content blends `clinic_patients` count ("4 active patients") with CRM lead language ("leads from Google", "average score 48.2"). Direct admin endpoint with `sender_type:"admin"` returned "3 active patients" (verified in § 3). This is the channel-mode tool-call suppression issue, NOT a MEDICA tool bug — see § 3.

**Q3 — "Do you have HydraFacial?"** (275 chars)
```
**[MEDICA Healthcare Intelligence Agent]** Yes, we offer the HydraFacial MD
treatment. It is an advanced facial that cleanses, extracts, and hydrates
your skin using patented technology. It provides immediate visible results
with no downtime and is suitable for all skin type[…]
```
Correct, routed to MEDICA, topic keyword hit.

Spec verdict was PASS (2 of 3 topic hits + all 3 distinct), but the action-level audit flags Q1 as a real failure and Q2 as confirmed drift. Both will be properly resolved by the new Phase 8 backlog item #2 (n8n omega-chat proxy `sender_type` forwarding).

---

## 3. Phase 8 Item #1: MEDICA "tool-routing tweak"

**Outcome: ❌ INVALID TICKET — no code change required.** Closed.

### Investigation findings

`tools/healthcare_tools.py:350` — `patient_analytics()` already queries `clinic_patients` correctly (Phase 5c fix). MEDICA's 11-tool registry (`agents/definitions.py:421-426`) does NOT include any `customers` or `sales_leads` query — those are NOVA's tools. No shared/inherited tool lets MEDICA pull from CRM tables.

Live probes (each fired today):

| Call | Result |
|---|---|
| `POST /omega/channel` with `sender_type:"admin"` for cosmique → "how many patients" | `agent_used:"medica"` → **"you currently have 3 active patients"** ✓ |
| `POST /omega` (admin path) for cosmique → same question | `agent_used:"omega"` → **"3 active patients at COSMIQUE"** ✓ |
| `POST /omega/channel` with NO `sender_type` (defaults `unknown`) → same question | MEDICA prefix preserved but soft reply ("1200+ happy clients") — by design, channel-mode prompt says "NEVER expose internal system details to customers/leads/unknown senders" |
| Browser cathedral → `/webhook/omega-chat` → "how many patients" | **"4 active patients (leads from Google, avg score 48.2)"** — drift, reproduced |

**Cross-tenant regression** (all with `sender_type:"admin"`):

| Tenant | Industry | Question | Agent | Reply head |
|---|---|---|---|---|
| `cosmique` | healthcare_clinic | how many patients | medica | "you currently have 3 active patients" ✓ |
| `bbqtonight` | restaurant | how many customers | nova | "you currently have no customers in your system" ✓ |
| `zateceptionist` | technology | how many customers | nova | "you currently have a total of 559 leads…" ✓ |

Routing + tool selection are industry-correct.

### Real root cause

The Phase 7 capture came via cathedral → `/webhook/omega-chat` (n8n proxy) → `/omega/channel`. The drift only occurs when `sender_type` is missing or `"unknown"`. Channel-mode then suppresses MEDICA's `patient_analytics` tool call per the prompt rule, and the LLM (qwen2.5:7b under T29) blends `clinic_patients` info with CRM-flavored context.

`frontend/src/components/omega/v3/ParticleSphereShell.tsx` already sends `sender_type: isAdmin ? "admin" : "team_member"` and `sender_identifier: user?.email`, so the field is leaving the browser. The most likely culprit is the n8n `/webhook/omega-chat` proxy not forwarding `sender_type` (and possibly `sender_identifier`) to `http://host.docker.internal:8123/omega/channel`.

### Decision

Per mission guardrail "If the fix isn't a clean one-liner, STOP — surface root cause + queue for its own session" — **not editing** `healthcare_tools.py`. MEDICA's tools are correct; touching them would mask the real proxy/forwarding question.

---

## 4. Multi-tenant cleanup verification

| Check | Result |
|---|---|
| `clinic_consultations` row `07f755ac…` deleted | ✅ 0 rows returned |
| Any `chief_complaint LIKE 'TEST_CC_PHASE7%'` rows remaining | ✅ 0 rows |
| Storage objects at `media/patients/933967dd-…/178729e2-…/` | ❌ 2 leaked PNGs (`1779398414982_before.png`, `1779398415840_after.png`, 68 B each) — **manually deleted post-run**; bucket re-listed empty |
| TEST_CC_PHASE7_ rows in any cosmique table | ✅ 0 |

---

## 5. New E2E hardening pattern (proposed: #11)

Add a hardening rule to `E2E_TESTING_RULES.md`:

> **11. When a test uploads to Supabase Storage, the test MUST clean the storage object(s) in the same try/finally — not just the DB row.** The Phase 7 C.1 spec (`cosmique-phase7-e2e.spec.ts:184`) deletes the `clinic_consultations` row but the underlying PNG/JPG/WebP objects persist in the bucket. Multi-tenant gate counts only DB rows, so storage leaks go unnoticed by the existing gate. Fix: capture the storage paths returned by the upload, then `DELETE /storage/v1/object/{bucket}/{path}` for each in the finally block.

Not applied this session (would require editing the spec; mission was verification, not spec hardening). Logged for next phase.

---

## 6. Updated Phase 8 backlog

1. ~~MEDICA tool-routing tweak~~ — **CLOSED 2026-05-22 as INVALID**. MEDICA tools query `clinic_patients` correctly; cross-tenant verified. See § 3.
2. **NEW (high-priority): Verify `/webhook/omega-chat` n8n proxy forwards `sender_type` + `sender_identifier`** through to `/omega/channel`. Reproduce by hitting the proxy without the fields and comparing replies. Likely a single Code-node patch. ~30 min.
3. **NEW: VRAM cold-load timeout — Q1 "OMEGA is temporarily unavailable"** — qwen2.5:7b first-call timeout after idle eviction (T29 / 8 GB VRAM). Possible mitigations: scheduled warmup ping every 5-10 min when VRAM has room (already exists for hermes3 + qwen2.5 per CLAUDE.md but may not be firing); or extend Listen timeout in the cathedral to 60s before showing the unavailable message.
4. **NEW: E2E hardening pattern #11** — storage cleanup in test finally blocks (see § 5).
5. Marketing edit flows (B.2) — full click-walk of `/marketing/campaigns`, `/marketing/competitors`, `/marketing/blog` edit paths.
6. Multi-tenant UI swap — provide bbqtonight credentials in `.env.local` and verify cross-tenant isolation at browser level.
7. Consent forms — needs new DB tables (`clinic_consent_templates`, `clinic_consent_signatures`). Schema-add session required.
8. Per-tenant doctor avatar source image — MuseTalk service hardcodes `media/avatars/zateceptionist/adeel.png`. Needs `tenant_config.features.doctor_avatar_url` lookup.
9. DA.2 verdict in n8n executions API — workflow runs successfully but `/api/v1/executions` returns count=0. Non-blocking, monitoring noise.

---

## 7. Outstanding user actions

1. None for re-running C.1 + D.1 — both now REAL_PASS.
2. (Optional, queued) Share bbqtonight + autoboost passwords in `.env.local` for Phase 8 item #6 (multi-tenant UI swap).

---

## 8. Files touched / not touched

**Created:**
- `D:/420-system/frontend/.env.local` — `COSMIQUE_EMAIL` + `COSMIQUE_PASSWORD` (gitignored; provided by user; canonical location going forward)

**Edited:**
- `D:/420-system/frontend/docs/COSMIQUE_PHASE7_POSTDEPLOY.md` — this file
- `D:/420-system/frontend/docs/COSMIQUE_STATUS.md` — Phase 18 row + outstanding actions + reference docs

**Not touched (intentional):**
- `langgraph-agents/tools/healthcare_tools.py` — MEDICA tools are correct
- Any n8n workflow — out-of-scope this session
- Any frontend component — verification phase, not build

## Commits

None expected this session (verification + report-only; `.env.local` is gitignored).
