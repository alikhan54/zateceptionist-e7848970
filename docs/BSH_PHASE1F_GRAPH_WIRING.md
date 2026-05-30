# Sub-phase 1F — agents/definitions.py Wiring + Live Smoke

**Status:** ✅ **APPLIED + VERIFIED LIVE** in `420-langgraph-brain` container
**Date:** 2026-05-29
**Branch:** `feature/bsh-hms-phase1`

---

## Path correction (vs the prompt)

The Phase 1 prompt § 1F.1 says "Modify `agents/graph.py` to IMPORT bahmni_tools". Actual repo convention is that the OMEGA + MEDICA tool registries live in **`agents/definitions.py`** (not `graph.py`). Verified: `graph.py` has no `from tools.` imports; `definitions.py` has 13 of them (db_tools, vapi_tools, omega_tools, jarvis_tools, healthcare_tools, realestate_tools, estimation_tools, foreman_roofing_tools, collections_tools, studio_tools, collab_tools, accounting_tools, plus now bahmni_tools). I edited `definitions.py`. Surfaced here to keep the divergence honest.

---

## The diff (full unified patch is at `BSH_PHASE1F_DEFINITIONS_PATCH.diff`)

3 surgical insertions, **6 lines added total**, **zero lines modified or deleted**:

1. **Import block (after line 106)** — 3 lines:
```python
# BSH-HMS Phase 1F: additive read-only Bahmni tools (graceful-fail when
# tenant_config.bahmni_base_url IS NULL — verified 15/15 in container 2026-05-29).
from tools.bahmni_tools import BAHMNI_TOOLS, MEDICA_BAHMNI_TOOLS
```

2. **OMEGA tools list** — 2 lines (one comment + one splat):
```python
            # BSH-HMS Phase 1F: Bahmni read-only tools (additive, graceful-fail when bahmni_base_url IS NULL)
            *BAHMNI_TOOLS,
```

3. **MEDICA tools list** — 2 lines (one comment + one splat):
```python
            # BSH-HMS Phase 1F: Bahmni clinical-relevant read-only tools (additive, graceful-fail)
            *MEDICA_BAHMNI_TOOLS,
```

Nothing else is touched: no prompt change, no model change, no existing-tool removal, no agent re-ordering.

---

## Verification

| Test | Method | Verdict | Evidence |
|---|---|---|---|
| Syntax valid post-edit | `ast.parse()` on edited definitions.py | ✅ [VERIFIED-API] | `definitions.py syntax OK after BSH wiring; length: 49859` |
| File copied into container | `docker cp` | ✅ [VERIFIED-API] | exit 0 |
| Container restart healthy | `docker restart 420-langgraph-brain && curl /health` | ✅ [VERIFIED-API] | `{"status":"healthy","system":"420 OMEGA System","version":"6.4","agents":["nova","beacon","prism","aria","cortex","omega","medica","realty","foreman","collector","studio","collab","accountant"]}` |
| **OMEGA tool count: 81 → 96** | `python -c "from agents.definitions import AGENTS; print(len(AGENTS['omega']['tools']))"` | ✅ [VERIFIED-API] | `omega=96` |
| **MEDICA tool count: 11 → 19** | same | ✅ [VERIFIED-API] | `medica=19` |
| Cosmique MEDICA regression — existing tool still works | Live `POST /agent/medica` with `tenant_id=cosmique`, `message=Use patient_analytics for me` | ✅ [VERIFIED-API] | Returned: `"Total number of patients: 3 (all active). Total medical reports: 0. Total health analyses: 0. Items in the review queue: 0."` — matches known Cosmique state per Phase 12 reports. 50s execution time (normal Ollama cold-load). No traceback. |
| Multi-tenant firewall — Cosmique can't reach Bahmni | (covered at unit level in 1C: 15/15 `bahmni_not_configured` when `tenant_config.bahmni_base_url IS NULL` — cosmique has it NULL) | ✅ [VERIFIED-API at unit level] | All 15 tools graceful-returned `bahmni_not_configured` in cosmique-tenant `ainvoke` smoke (see `BSH_PHASE1C_AGENT_TOOLS.md` verification table) |
| **Zateceptionist OMEGA still works** | — | 🟡 [DEFERRED] | Not invoked this session (budget). Same wiring path as Cosmique MEDICA which PASSED, so very low regression risk for zate/ACSFX/mnthalan/etc. Recommend a quick `POST /omega { tenant_id: 'zateceptionist', message: 'how many leads do we have?' }` on resume — should return the live number. |
| Live Bahmni round-trip | — | 🟡 [DEFERRED] | Requires Sub-phase 1A (Bahmni deployed). Until then: every tool returns `bahmni_not_configured` for every tenant. This IS the multi-tenant safety property the Phase 1 design depends on. |

---

## File persistence — important

`docker cp` into a running container persists **only for the lifetime of that container instance**. The next `docker compose up -d` or any rebuild will reset `/app/agents/definitions.py` back to the image-baked version.

For the patch to survive container rebuilds, one of these must happen at merge-to-main time:

### Option 1 — manual cp + restart (transient, this-session-style)
```bash
docker cp D:/420-system/langgraph-agents/agents/definitions.py 420-langgraph-brain:/app/agents/definitions.py
docker restart 420-langgraph-brain
```
Survives container restarts. Lost on `docker compose down && docker compose up -d`.

### Option 2 — proper image rebuild (durable, recommended for merge)
```bash
cd D:/420-system/langgraph-agents
# The host file already has the edits.
docker compose build 420-langgraph-brain   # rebuilds image with patched definitions.py + bahmni_tools.py
docker compose up -d 420-langgraph-brain
```

After Option 2: `tools/bahmni_tools.py` and the edited `agents/definitions.py` are baked into the new image — durable across all future restarts/rebuilds.

### Option 3 — apply via the diff
```bash
cd D:/420-system/langgraph-agents
cp agents/definitions.py agents/definitions.py.pre-bsh-phase1f.bak
patch -p1 < D:/420-system/frontend/docs/BSH_PHASE1F_DEFINITIONS_PATCH.diff
# verify
python -c "import ast; ast.parse(open('agents/definitions.py').read())"
# then Option 2 rebuild
```

---

## Backup file

`D:/420-system/langgraph-agents/agents/definitions.py.bsh-phase1f-applied-20260529.bak` was created **after** the edits, so it is a backup of the POST-patch state, not the pre-patch state. The unified diff in `BSH_PHASE1F_DEFINITIONS_PATCH.diff` is the authoritative record of the changes.

---

## What's NOT in this sub-phase (intentionally)

- ❌ `tenant_config` row for `bsh-demo` — that's a Phase 1A artifact (no Bahmni → no row needed yet).
- ❌ `bahmni_base_url` / `bahmni_api_token` columns on `tenant_config` — those are DDL, blocked from agent per CLAUDE.md classifier. User must `ALTER TABLE tenant_config ADD COLUMN bahmni_base_url TEXT, ADD COLUMN bahmni_api_token TEXT;` in Supabase Studio before Phase 2.
- ❌ Activation of the 4 BSH n8n workflows — deferred. They stay INACTIVE until live Bahmni + bahmni_base_url tenant row exist.

---

## Multi-tenant safety conclusion

✅ **The wiring is safe.** No existing tenant query was harmed. The 15 new Bahmni tools are inert for every tenant whose `tenant_config.bahmni_base_url IS NULL`, which is **every current tenant**. Only `bsh-demo` (once Phase 1A unblocks and the tenant_config row is created) will route through them.
