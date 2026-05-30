# BSH-HMS — VAPI Voice Assistant Configuration

> **Status:** configuration spec for the BSH inbound voice receptionist. The **handler and
> personas already exist and are verified** (`services/bsh-vapi-handler/`); this doc specifies the
> **VAPI assistant** that sits in front of them and the acceptance tests. Nothing here touches a
> live VAPI assistant — creating/editing the assistant is an AMD-day action (and is **blocked for
> non-zate tenants by ticket T36** until the webhook tenant-resolution is hardened; see §7).
>
> Labels: `[VERIFIED-CODE]` = read from the shipped handler/prompts this session;
> `[DESIGN]` = proposed VAPI dashboard config; `[estimate]` = not measured.

---

## 1. What already exists `[VERIFIED-CODE]`

`services/bsh-vapi-handler/` (FastAPI, v0.1.0):
- `POST /vapi/inbound` — the webhook target. Pydantic `VAPIInbound` body:
  `{ tenant_id, call_id, caller_phone, transcript, language? }` where `language ∈ {bn,en,auto}`
  (default `auto`). **`tenant_id` is REQUIRED — there is no silent fallback** (this is exactly the
  drift T36 warns about, and the handler is safe by construction).
- `GET /health` → `{status: healthy}`.
- **Language auto-detect:** Bengali if the transcript contains U+0980–U+09FF, else English.
- **Industry gate at entry:** if `tenant_config.industry != healthcare_hospital`, returns a polite
  bilingual reject (`_polite_reject`) — it does **not** raise, so VAPI speaks the rejection to the
  caller and ends cleanly with no Bahmni side effects.
- **Routing:** builds a language-specific OMEGA prompt and POSTs to OMEGA
  (`http://420-langgraph-brain:8123/omega`) with `channel="voice"`, `user_identifier=caller_phone`,
  `metadata={call_id, language}`, 120s timeout. Tools the prompt drives: `bahmni_search_patients`,
  `bahmni_get_appointments`, `bahmni_create_appointment`, (+ `bahmni_get_doctor_availability`,
  `bahmni_update_appointment_status` per the sample dialogues), and `send_message` for SMS confirm
  via Comm v3.8 (`http://n8n:5678/webhook/universal-outbound`).

Personas (`prompts/`):
- `opd_reception_en.txt` / `opd_reception_bn.txt` — polite receptionist; identifies caller by **HN
  number or phone**; handles **4 intents (book / reschedule / cancel / report-status)**; **no
  medical advice** (transfer to human); **discloses "I am an AI assistant"** on request; **transfers
  to a human after 120 seconds**.
- `sample_dialogues.md` — 5 reference dialogues (formalized as acceptance tests in §6).

There is also an alternate n8n path — webhook **`/webhook/bsh/vapi-opd`** (workflow
`L44uqPiR3kTxgjaD`, INACTIVE) → tenant gate → OMEGA. It lacks the handler's language detection +
SMS confirmation, so **the handler is the primary target; the n8n webhook is a fallback** (§7).

---

## 2. Recommended VAPI assistant config `[DESIGN]`

Create one assistant **per hospital tenant** (start: `bsh-demo`). Suggested name:
`BSH-HMS OPD Reception (bsh-demo)`.

| Setting | Value | Notes |
|---|---|---|
| **Server URL** | `https://bsh-vapi.zatesystems.com/vapi/inbound` | The handler, via the Cloudflare hostname (see `BSH_CLOUDFLARE_TUNNEL_SETUP.md`). |
| **Server URL secret** | `X-Vapi-Secret: <random>` | Handler should verify this header (see §5 hardening note). |
| **Request body** | must include `tenant_id: "bsh-demo"` | Stamp via assistant `metadata.tenant_id` and map it into the server message body. **This is mandatory** — the handler rejects a missing tenant_id. |
| **First message** | bn: "আসসালামু আলাইকুম, বাংলাদেশ স্পেশালাইজড হাসপাতাল। আমি একজন AI সহকারী। কীভাবে সাহায্য করতে পারি?" / en: greeting | Bengali-first; the assistant should open in Bengali and switch on detected language. |
| **System prompt** | contents of `opd_reception_{bn,en}.txt` | Paste both; instruct the model to answer in the caller's language. Keep the 4 rules verbatim. |
| **Model** | the model behind OMEGA owns reasoning | The VAPI assistant is mostly a transport+voice layer; intent→tools happens in OMEGA via the handler. Keep the VAPI model lightweight (e.g. GPT-4o-mini-class) for ASR-glue/turn-taking only. |
| **Max call duration** | 150s hard cap | Persona transfers to human at 120s; give 30s headroom. |
| **End-call / transfer** | `transferCall` → hospital reception desk number | Used for the 120s rule + out-of-scope medical escalation. |

### Voice & transcriber `[DESIGN — verify Bengali support per provider before demo]`
- **TTS:** a **Bengali-capable** voice is mandatory. Candidates: Azure `bn-BD-NabanitaNeural`
  (female) / `bn-BD-PradeepNeural` (male), or ElevenLabs multilingual v2. **Verify the chosen
  provider actually renders Bangla intelligibly** — this is the #1 demo risk.
- **Transcriber (ASR):** must support Bengali (`bn`). Verify Deepgram/your provider's `bn` model
  quality on Bangladeshi accents before the demo; fall back to a bn-specific model if needed.
- Set `language` hints to allow bn↔en code-switching (Bangladeshi callers mix English medical terms).

---

## 3. Tools

The VAPI assistant does **not** need per-tool function definitions in the VAPI dashboard — all
tool-calling is delegated to OMEGA through the single server webhook. The OMEGA hospital tool
surface (driven by the handler's prompt) is:

| Tool | Purpose |
|---|---|
| `bahmni_search_patients` | identify caller by HN/phone |
| `bahmni_get_appointments` | list caller's upcoming appointments (reschedule/cancel/status) |
| `bahmni_get_doctor_availability` | open slots by department/doctor |
| `bahmni_create_appointment` | book |
| `bahmni_update_appointment_status` | reschedule/cancel |
| `send_message` | SMS confirmation via Comm v3.8 |

(If a future design moves tool-calling into VAPI directly, define these as VAPI functions whose
URLs hit the same handler — but the current shipped design routes through OMEGA, so leave it.)

---

## 4. Call flow

```
Inbound PSTN call → VAPI number (Twilio-backed)
  → VAPI assistant (greeting in Bengali, ASR, TTS)
     → POST https://bsh-vapi.zatesystems.com/vapi/inbound
          { tenant_id:"bsh-demo", call_id, caller_phone, transcript, language:"auto" }
        → handler: detect lang → industry gate (healthcare_hospital?)
            ├─ NO  → polite bilingual reject, end call (no side effects)
            └─ YES → OMEGA /omega (voice) → bahmni_* tools → reply
                     → send_message SMS confirm (Comm v3.8)
  ← assistant speaks reply; transfers to human at 120s or on medical/out-of-scope
```

---

## 5. Security notes `[DESIGN]`

- **Verify the server secret.** Add a header check in the handler (`X-Vapi-Secret`) so only VAPI
  can invoke `/vapi/inbound`. (Currently the handler trusts the body — fine behind the tunnel, but
  add the check before exposing publicly.)
- **No PHI read without HN confirmation** — enforced by the persona rule #1; OMEGA must honor it.
- **tenant_id is server-stamped, never caller-supplied** — the assistant's fixed `metadata.tenant_id`
  is the only source; do not derive tenant from caller phone alone.
- The handler already **fails closed** for non-hospital tenants.

---

## 6. Acceptance tests (formalized from `sample_dialogues.md`) `[VERIFIED-CODE source]`

Run all 5 before the demo (rehearsal: `BSH_DEMO_REHEARSAL_CHECKLIST.md`).

| # | Scenario | Pass criteria |
|---|---|---|
| 1 | **Bengali booking (happy path)** | Asks for HN in Bengali → `bahmni_get_doctor_availability` → offers slot → `bahmni_create_appointment` → **SMS confirm sent**. All Bengali. |
| 2 | **English reschedule** | HN lookup → `bahmni_get_appointments` shows existing appt → `bahmni_update_appointment_status` → SMS confirm. All English. |
| 3 | **Industry-gate reject (non-hospital tenant)** | Call with `tenant_id` of a non-hospital tenant → handler returns `_polite_reject` → **no Bahmni call, no side effects**, call ends politely. |
| 4 | **Out-of-scope medical escalation** | "My chest hurts…" → assistant refuses advice, **transfers to emergency/human desk**. |
| 5 | **Identity inquiry** | "Are you a real person?" → discloses "I'm an AI assistant," offers human handoff. |

Plus two non-dialogue checks:
- **120s transfer:** a call crossing 120s auto-transfers to a human.
- **Bengali TTS intelligibility:** a native Bengali listener confirms the voice is natural.

---

## 7. T36 blocker & Twilio fallback `[VERIFIED from CLAUDE.md §17]`

- **T36 (BLOCKER for non-zate VAPI clones):** three n8n VAPI webhooks resolve tenant with
  **hardcoded fallbacks** (`/vapi-omega-bridge`→zate, `/vapi-clinic-tools`→zate,
  `/vapi-realestate-tools`→aamerah); only `/vapi-universal-tools` does correct 3-level resolution.
  **Implication for BSH:** if you route the BSH assistant through any of those n8n webhooks, an
  inbound call could mis-resolve to the wrong tenant. **Mitigation already in place:** the
  **`bsh-vapi-handler` requires an explicit `tenant_id` and has no fallback**, so routing the BSH
  assistant to the handler (§2) **avoids the T36 defect entirely**. If you instead use the n8n
  `bsh/vapi-opd` webhook, confirm it does explicit `bsh-demo` resolution (it fetches tenant_config
  and gates on industry — verify it doesn't inherit a hardcoded fallback) before go-live.
- **Twilio fallback path:** the VAPI number is Twilio-backed. Configure Twilio so that if VAPI is
  unreachable (server URL down / assistant error), the call **forwards to the hospital reception
  desk** (or voicemail → ticket). Zate's existing Twilio creds (SID `AC62e19f…`, +12187744268) are
  the *platform* account; **BSH needs its own Bangladesh DID** for production — flag as a user/AMD
  action. The fallback ensures a failed AI call never drops a patient silently.

---

## 8. Effort & AMD actions

- **AMD-day setup `[estimate ~45–60 min]`:** create the assistant, paste prompts, wire the server
  URL + secret, attach the Twilio number, set the Bengali voice, run the 6 acceptance checks.
- **Not done here (by design):** no live VAPI assistant created/modified; no Bahmni connection; no
  Bangladesh DID procured. All are AMD-day / user actions.
