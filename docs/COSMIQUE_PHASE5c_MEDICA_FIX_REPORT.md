# Cosmique — Phase 5c: MEDICA tool-call fix + Ollama model upgrade

**Date:** 2026-05-19
**Tenant:** cosmique
**Scope:** Two LangGraph-side changes baked into `langgraph-agents-langgraph-agents:latest` and deployed via `docker compose up --build -d`.
**Files touched:** `tools/healthcare_tools.py` (one-function patch), `agents/graph.py` (model-priority change).
**Sacred workflows / tenant_config / RLS:** untouched.

---

## Part A — MEDICA tool-call fix (one-line schema bug)

### Root cause

`patient_analytics` in `tools/healthcare_tools.py` selected `is_active` on `clinic_patients`. That column doesn't exist on the table (only on `clinic_treatments`). PostgREST returned `400 Bad Request`, `httpx` raised, the tool caught the exception and returned `{"error": "Client error '400 Bad Request' for url '...clinic_patients?...&select=id,is_active'"}`.

The model (hermes3:8b at the time) saw the literal substring `"url"` in the error JSON and hallucinated a prose response about a "URL format issue" — Phase 4b + Phase 5b's recurring `"I'm encountering an issue with the URL again"` complaint traced exactly to this single SELECT.

This is the **same** schema bug we fixed for the frontend in Phase 1 commit `86849bf` (`useClinicPatients.ts` removed the same phantom `is_active` filter). The LangGraph tool had its own independent copy.

### Reproduction

```
$ docker exec 420-langgraph-brain python -c "
import asyncio
from tools.healthcare_tools import patient_analytics
async def t(): print(await patient_analytics.ainvoke({'tenant_id': 'cosmique'}))
asyncio.run(t())
"
{"error": "Client error '400 Bad Request' for url
  'https://fncfbywkemsxwuiowxxe.supabase.co/rest/v1/clinic_patients
   ?tenant_id=eq.cosmique&select=id%2Cis_active' ..."}
```

### Fix

`tools/healthcare_tools.py:355–362` — removed `is_active` from the select; treat every row as active (the table has no inactive-patient concept). Inline comment documents why so future hands don't re-add it.

### Verification

```
$ docker exec 420-langgraph-brain python -c "... patient_analytics ..."
{"patients": {"total": 3, "active": 3},
 "medical_reports": {"total": 0, "by_status": {}},
 "health_analyses": {"total": 0, "avg_health_score": 0},
 "review_queue": {"total": 0, "by_status": {}}}
```

3 patients = the seeded Fatima/Omar/Rania count. Phase 5b's "URL format" hallucination is gone.

---

## Part B — Ollama model upgrade

### Decision: qwen2.5:7b, not 14b (VRAM-bound)

The handover specified `qwen2.5:14b`. On inspection the AMD server's RTX 4060 has **8 GB VRAM total**, of which ~5 GB was already resident in the hermes3:8b model — leaving ~3 GB free. `qwen2.5:14b` at the default Q4_K_M quant is ~9 GB; loading it would force most weights to CPU offload and produce **multi-minute** response times.

`qwen2.5:7b` was already pulled on the server (4.7 GB, present in `ollama list` from 8 weeks ago, unused until now). It fits in VRAM, is a clear quality upgrade over hermes3:8b per public benchmarks, and required zero download.

Going forward: a single env var (`OLLAMA_PRIMARY_MODEL=qwen2.5:14b`) flips to 14b without a code change — for when the GPU is replaced or a Tesla-class card is added.

### Implementation

`agents/graph.py` `get_llm()`:
- Reads `OLLAMA_PRIMARY_MODEL` (default `qwen2.5:7b`) and `OLLAMA_FALLBACK_MODEL` (default `hermes3:8b`).
- Probes Ollama `/api/tags`, picks `primary` if loaded, falls back to `hermes3:8b` if not.
- num_ctx (24576), temperature, base_url all unchanged.
- Anthropic + OpenAI fallback chain untouched.

```python
primary = os.getenv("OLLAMA_PRIMARY_MODEL", "qwen2.5:7b")
fallback = os.getenv("OLLAMA_FALLBACK_MODEL", "hermes3:8b")
# probe /api/tags → pick primary if available, else fallback
```

### Rebuild + restart

```
docker compose build langgraph-agents
docker compose up -d                    # recreates container with new image
docker exec 420-langgraph-brain python -c "from agents.graph import get_llm; print(get_llm().model)"
→ qwen2.5:7b
```

---

## Re-verification: before vs after (verbatim)

All responses against `POST /omega/channel` with `tenant_id=cosmique` after both fixes were live.

### "What does this company do?"

| Stage | Response |
|---|---|
| Phase 5b (hermes3:8b, no context) | `"Cosmique specializes in providing comprehensive business solutions. As of May 19, 2026, they have a total of 3 leads with an average score of 40.3... it is recommended to create a lead-generation campaign via OMEGA to start building the sales pipeline."` |
| **Phase 5c (qwen2.5:7b, full context)** | **`"COSMIQUE is a premier healthcare clinic specializing in advanced skincare and aesthetic treatments. Here's what we offer: 1. M-ounjaro Weight Loss... 2. HIFU Non-Surgical Facelift... 3. MNRF Collagen Treatment... 4. HydraFacial MD... 5. Laser Treatments..."`** |

### "What services do you offer?"

| Stage | Response |
|---|---|
| Phase 5b | `"Sales Automation... Marketing Solutions... Communication Management... HR Support... Business Insights..."` (generic 420-system SaaS pitch) |
| **Phase 5c** | **`"COSMIQUE offers a range of advanced skincare and aesthetic treatments: M-ounjaro Weight Loss, HIFU Non-Surgical Facelift, MNRF Collagen Treatment, HydraFacial MD, Laser Treatments (Fotona SP Dynamis)..."`** |

### "How many patients do I have?"

| Stage | Response |
|---|---|
| Phase 5b | `"I'm encountering an issue with the URL again. Let me recheck and provide you with the correct number of patients..."` |
| **Phase 5c** | `"3 leads, all of which are new and sourced from Google..."` (routed to CORTEX, not MEDICA — answers but uses "leads" not "patients"; see Open Issues) |

### "Do you have HydraFacial?"

| Stage | Response |
|---|---|
| Phase 5b | `"I apologize for the confusion earlier. It seems there might be an issue with the URL provided..."` |
| **Phase 5c** | **`"Certainly! COSMIQUE offers the HydraFacial MD treatment. This advanced facial treatment uses patented technology to cleanse, extract, and hydrate your skin. It's suitable for all skin types..."`** |

### "What are my treatments and prices?"

| Stage | Response |
|---|---|
| Phase 5b | `"There are currently no pending items in the medical review queue for your clinic..."` (wrong tool, irrelevant) |
| **Phase 5c** | **`"COSMIQUE offers a variety of advanced skincare and body sculpting treatments... 1. M-ounjaro Weight Loss... 2. HIFU Non-Surgical Facelift... 3. MNRF Collagen Treatment... 4. HydraFacial MD..."`** |

Response times: 22–37s (similar to hermes3:8b — no slowdown despite the bigger reasoning).

---

## Cross-tenant regression — PASS

Asked "what does this company do?" as each non-cosmique tenant, scanning the response for cosmique-specific markers (`Cosmique`, `COSMIQUE`, `HydraFacial`, `HIFU`, `M-ounjaro`, `aesthetic clinic`, `Jumeirah`):

| Tenant | Industry | Leak detected | Response excerpt |
|---|---|:---:|---|
| `bbqtonight-547b8e1b` | restaurant | **No** | `"It seems there was an issue with triggering the lead generation... Our current operations show that we currently don't have any active marketing campaigns..."` (no agent_contexts row → falls back to generic OMEGA prompt) |
| `zateceptionist` | technology | **No** | `"Zate Systems specializes in AI-powered business automation. We help businesses automate customer communication, booking, and support through intelligent AI agents that work 24/7 across WhatsApp, phone, Facebook, Instagram..."` (has agent_contexts → tenant-specific) |
| `autoboost` | automotive | **No** | `"AutoBoost is a premium car protection and detailing service based in DHA Karachi. We specialize in applying Paint Protection Film (PPF) to protect your vehicle's paint from scratches..."` (has agent_contexts → tenant-specific) |

Zero cosmique content leaked. Multi-tenant isolation held under qwen2.5:7b.

---

## Files changed (langgraph-agents — not a git repo, but persisted in image)

| File | Lines | Description |
|---|---|---|
| `tools/healthcare_tools.py` | 355–362 (replaced 7 lines with 8 lines) | Drop `is_active` from `clinic_patients` SELECT; treat all rows as active. Inline comment documents the fix. |
| `agents/graph.py` | 334–360 (replaced 17 lines with 26 lines) | `get_llm()` now reads OLLAMA_PRIMARY_MODEL (default `qwen2.5:7b`) and OLLAMA_FALLBACK_MODEL (default `hermes3:8b`); probes `/api/tags` and falls back gracefully if primary not loaded. |

`docker compose build langgraph-agents && docker compose up -d` rebuilt + redeployed. Container `420-langgraph-brain` healthy. Model load verified via `get_llm().model == 'qwen2.5:7b'`.

---

## Open issues / queued for later

1. **NEXUS routes "patients" questions to CORTEX, not MEDICA.** "How many patients do I have?" landed on CORTEX which reads `sales_leads` instead of `clinic_patients`. NEXUS's routing prompt explicitly says `medica - ONLY for healthcare_clinic/healthcare/aesthetics industry tenants` but qwen2.5:7b sometimes picks CORTEX for headcount-style questions. Either:
   - Strengthen NEXUS routing prompt to bind any patient/clinic question to MEDICA when industry=healthcare_clinic, OR
   - Add a tool router that vetoes CORTEX for non-tech queries on clinic tenants.
   Not in scope for Phase 5c.

2. **"M-ounjaro" typo in the COSMIQUE OMEGA prompt** (carried over from Onboarding v5 via the Phase 5b copy). The hyphen is an OCR/typo artifact — should be `Mounjaro`. Cosmetic; one UPDATE on `agent_contexts.system_prompt`. Deferred.

3. **qwen2.5:14b upgrade** when VRAM allows (T29). Flip via env var; no code change.

4. **Restore Anthropic/OpenAI API credits** (T27). When restored, `get_llm()` automatically picks them up as priority 2/3 fallback if Ollama goes down.

---

## Phase 5c summary

| Outcome | Before | After |
|---|---|---|
| MEDICA "How many patients?" | hallucinated URL error | `{"patients": {"total": 3, "active": 3}, ...}` (tool); chat: depends on routing |
| OMEGA "What does this company do?" | "comprehensive business solutions / lead-generation campaign" | "premier healthcare clinic specializing in advanced skincare and aesthetic treatments" |
| OMEGA "What services?" | "Sales Automation / Marketing Solutions / HR Support" | "M-ounjaro, HIFU, MNRF, HydraFacial MD, Laser..." |
| MEDICA "Do you have HydraFacial?" | URL hallucination | "Certainly! COSMIQUE offers the HydraFacial MD treatment..." |
| Cross-tenant safety | n/a | bbqtonight + zate + autoboost: **zero cosmique leak** |
| LLM | hermes3:8b (struggles with prompt grounding) | qwen2.5:7b (grounds in prompt + tools) |

Both fixes are now permanent in `langgraph-agents-langgraph-agents:latest`. Restart-safe.
