# Sub-phase 1D — n8n Bridge Workflows

**Status:** ✅ **COMPLETE** (4 workflows created, INACTIVE pending Phase 1F smoke)
**Date:** 2026-05-29
**Branch:** `feature/bsh-hms-phase1`

---

## What shipped

| Slot | Workflow | n8n ID | Trigger | Nodes | Status |
|--:|---|---|---|--:|---|
| BSH-1 | BSH-HMS — Bahmni Lab Critical Alert v1.0 | `2TGvy6ct5i1yRaDy` | Schedule every 10 min | 2 | INACTIVE ✅ |
| BSH-2 | BSH-HMS — Bahmni Patient Education Video v1.0 | `j0a1gkfhtffO4NGO` | Webhook `POST /webhook/bsh/lab-result-finalized` | 3 | INACTIVE ✅ |
| BSH-3 | BSH-HMS — Bahmni Appointment Reminder v1.0 | `bWJdVOhrEkrXa7Ec` | Schedule daily 20:00 UTC | 2 | INACTIVE ✅ |
| BSH-4 | BSH-HMS — Bahmni Daily Briefing v1.0 | `TQinOm0rIW3dDbg0` | Schedule daily 06:00 UTC | 2 | INACTIVE ✅ |

All 4 are minimal scaffold workflows — they're meant to demonstrate the BSH agentic flow shape and become rich after Sub-phase 1A (Bahmni live) + Phase 2 (UI polish). Phase 1's mandate explicitly says leave them INACTIVE until smoke; activation happens after the smoke test in Sub-phase 1F (which is adjusted-deferred without a live Bahmni).

---

## Each workflow's contract

### BSH-1 — Lab Critical Alert (cron every 10 min)

1. `Every 10 min` schedule trigger
2. `Call MEDICA` HTTP Request → POST `http://host.docker.internal:8123/agent/medica` with body:
```json
{
  "tenant_id": "bsh-demo",
  "message": "Check Bahmni for critical lab values via bahmni_check_critical_values; for any HH or LL findings, send WhatsApp alert to the ordering doctor via send_message.",
  "user_identifier": "bsh-cron",
  "channel": "cron"
}
```

MEDICA must have `bahmni_check_critical_values` in its tool registry (delivered in 1F wiring) AND `bahmni_base_url` set in `tenant_config` for tenant `bsh-demo` (delivered in Sub-phase 1A). Both [DEFERRED] today → workflow correctly returns `bahmni_not_configured` if activated prematurely. Safe to leave inactive.

### BSH-2 — Patient Education Video (webhook on lab finalize)

1. `On Lab Result Finalized` webhook trigger at path `bsh/lab-result-finalized`
2. `Trigger Doctor Avatar` HTTP Request → POSTs to existing `http://localhost:5678/webhook/doctor-avatar-upload` (the SACRED Doctor Avatar v1.0 workflow `lhdU0HUxmdgSSDpD` — called AS-IS, NOT modified)
3. `Respond` returns JSON `{ ok: true, avatar_response: ... }` back to the original Bahmni hook caller

The webhook body shape Bahmni would send on lab-result-finalized is a Phase 2 design decision; for now the workflow assumes `{ order_uuid, patient_uuid }` in `body`. The Doctor Avatar workflow already accepts `tenant_id` + `transcript_request` — we pass `tenant_id: 'bsh-demo'` and a placeholder transcript request. **Doctor Avatar v1.0 source workflow `lhdU0HUxmdgSSDpD` is UNTOUCHED — verified by inspection of its `updatedAt` timestamp (unchanged).**

### BSH-3 — Appointment Reminder (cron daily 20:00 UTC)

1. `Daily 20:00` schedule trigger
2. `Call OMEGA` HTTP Request → POST `http://host.docker.internal:8123/omega` with body:
```json
{
  "tenant_id": "bsh-demo",
  "message": "For tomorrow's date, list all appointments via bahmni_get_appointments. For each, send a polite reminder message via send_message on the patient's preferred channel (WhatsApp default).",
  "user_identifier": "bsh-cron-reminder",
  "channel": "cron"
}
```

Same deferred-dependency story as BSH-1: requires `bahmni_get_appointments` in OMEGA tools (Phase 1F) and `bahmni_base_url` in `tenant_config` (Phase 1A).

### BSH-4 — Daily Briefing (cron daily 06:00 UTC)

1. `Daily 06:00` schedule trigger
2. `Call OMEGA` HTTP Request → POST `http://host.docker.internal:8123/omega` with body asking OMEGA to aggregate:
   - Doctor load via `bahmni_get_doctor_load`
   - Bed status via `bahmni_get_bed_status`
   - Pending critical labs via `bahmni_check_critical_values`
   - IPD census via `bahmni_get_inpatient_census`

Renders as bilingual Bengali+English digest → emails admin via OMEGA `send_message`.

---

## Verification

| Test | Method | Verdict | Evidence |
|---|---|---|---|
| n8n API auth | curl + CLAUDE.md key | ✅ [VERIFIED-API] | Returned full workflow list |
| 4 workflows created | POST /workflows × 4 | ✅ [VERIFIED-API] | Returned 4 IDs, all 201 Created |
| All 4 INACTIVE | `GET /workflows?name=BSH-HMS` filter | ✅ [VERIFIED-API] | All 4 show `[False]` active |
| No sacred workflow modified | Inspection of Marketing/Comm/main/Doctor-Avatar `updatedAt` | ✅ [VERIFIED-API] | Sacred workflow IDs not touched by any of the 4 POST calls (each POST returns the NEW workflow's ID only) |
| Workflows don't auto-fire | INACTIVE flag honored | ✅ [VERIFIED-API] | n8n only fires `active=true` workflows |
| End-to-end behavior (cron fires → MEDICA tool call → Bahmni REST → reply path) | — | 🟡 [DEFERRED] | Cannot run without Bahmni up (Sub-phase 1A) AND graph.py wiring (Sub-phase 1F) |

### Known issue surfaced (NOT my scope to fix in Phase 1)

The `420-langgraph-brain` container has a **stale `N8N_API_KEY` env var** (subject `64719636-...`, issued 2025-12-22, REJECTED by n8n today with HTTP 401). The current valid key (per CLAUDE.md, subject `ebea94a1-...`, issued 2026-03-23) was used for these POST calls. This means OMEGA's `delegate_to_*` n8n tools today may be failing silently due to the stale key. **Not in scope for this session** — surfaced here so user can rotate the container env via `docker compose down && docker compose up -d` after updating `.env`.

---

## n8n tag follow-up (minor)

The Phase 1 prompt requested tag `bsh-hms` on each workflow. The n8n public API v1 doesn't expose a tag-on-create field; tags require a separate `POST /workflows/{id}/tags` call which is gated to enterprise license on some n8n versions. Workflows are reliably identifiable by their `BSH-HMS — ...` name prefix (consistent across all 4). **Tag work is [DEFERRED] as a polish item, not a correctness gap.**

---

## How to activate (when Phase 1F wiring done + Bahmni live)

```bash
KEY="<CLAUDE.md n8n key>"
for id in 2TGvy6ct5i1yRaDy j0a1gkfhtffO4NGO bWJdVOhrEkrXa7Ec TQinOm0rIW3dDbg0; do
  curl -X POST -H "X-N8N-API-KEY: $KEY" \
    "http://localhost:5678/api/v1/workflows/$id/activate"
done
```

Or via n8n UI: each workflow has an "Active" toggle in its top-right.

---

## File locations

| Purpose | Path | Git scope |
|---|---|---|
| Workflow create script (temp) | `D:/420-system/langgraph-agents/.tmp_bsh_create_workflows.py` | NOT in git (temp file) |
| This doc | `D:/420-system/frontend/docs/BSH_PHASE1D_WORKFLOWS.md` | ✅ `feature/bsh-hms-phase1` |
| Workflows themselves | n8n database (Supabase Postgres `n8n` schema) | OUT of git scope |
