# Sub-phase 2E — VAPI Voice OPD Handler (Bengali + English)

**Status:** ✅ COMPLETE (scaffold ready; live deploy [DEFERRED-AMD])
**Date:** 2026-05-29
**Branch:** `feature/bsh-hms-phase2`

---

## What shipped

`services/bsh-vapi-handler/`:
- `main.py` — FastAPI handler with industry-gated VAPI inbound endpoint + auto language detection (Bengali Unicode range U+0980..U+09FF)
- `Dockerfile` — Python 3.11 slim, non-root, healthchecked
- `requirements.txt` — pinned (fastapi, uvicorn, httpx, pydantic)
- `prompts/opd_reception_bn.txt` — Bengali receptionist system prompt
- `prompts/opd_reception_en.txt` — English receptionist system prompt
- `prompts/sample_dialogues.md` — 5 dialogue scenarios (booking BN, reschedule EN, industry-reject, escalation, identity inquiry)

---

## Industry gate behavior

| Caller's tenant | Service response |
|---|---|
| `healthcare_hospital` (BSH) | Full routing → OMEGA → Bahmni tools → SMS confirmation |
| Any other industry | Polite reject in detected language; no Bahmni call; no OMEGA invocation |

Polite-reject messages are bilingual and surfaced to the caller as a graceful end-of-call, NOT an HTTP error (VAPI returns the text directly to the phone line).

---

## Bengali language notes

- **Auto-detection regex**: `[ঀ-৿]` covers all Bengali Unicode characters
- **System prompt explicitly states bilingual etiquette** — Bengali honorifics ("সাহেব", "মাদাম") and English politeness
- **Tools invoked by language**:
  - `bahmni_search_patients`, `bahmni_create_appointment`, `bahmni_get_appointments`, `bahmni_update_appointment_status`, `bahmni_get_doctor_availability` (Phase 2)
  - `send_message` (existing OMEGA tool, routes to Comm v3.8 SMS channel)
- **Escalation triggers**: medical symptom questions ("chest pain", "বুকে ব্যথা"), payment questions, or 120s call duration → transfer to human receptionist

---

## Connection to n8n BSH-11 workflow

BSH-11 (`L44uqPiR3kTxgjaD`) is the n8n webhook at `POST /webhook/bsh/vapi-opd`. VAPI inbound calls hit:

1. **VAPI assistant** with BSH-specific prompt (Phase 2 deploy task — VAPI assistant config)
2. → POSTs transcript to BSH-11 n8n webhook (Phase 2D-E bridge)
3. → BSH-11 industry-gates via Node 2 + 3
4. → BSH-11 calls this VAPI handler service OR OMEGA directly (configurable)
5. → Bahmni tool invocation
6. → SMS confirmation via Comm v3.8

The two paths (n8n BSH-11 vs direct VAPI → bsh-vapi-handler) are functionally equivalent; the handler service is preferred for richer error handling and language detection.

---

## Verification

| Check | Verdict | Evidence |
|---|---|---|
| Python syntax | [VERIFIED-CODE] | (commit syntax check passed in build) |
| Bengali Unicode detection | [VERIFIED-CODE] | Regex `[ঀ-৿]` covers U+0980..U+09FF |
| Industry-gate semantics | [VERIFIED-CODE] | `_get_tenant_cfg` + industry check before any tool routing |
| Live VAPI inbound round-trip | [DEFERRED-AMD] | Requires deployed VAPI assistant + Bahmni live |
| Bengali prompt fluency review | [DEFERRED] | Native-speaker review recommended before BSH demo |
