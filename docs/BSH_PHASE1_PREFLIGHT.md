# BSH Phase 1 — Pre-flight Summary

**Session:** BSH-PHASE1-BACKEND
**Date:** 2026-05-29
**Feature branch:** `feature/bsh-hms-phase1`
**Starting commit:** `ae3a13c [WARRIOR] Merge: format-variant chips + Copy Embed`
**Status:** Pre-flight complete — proceeding to Sub-phase 1A

---

## One-paragraph understanding

The 420 System is a multi-tenant AI automation platform serving 17+ tenants
with a React/Lovable frontend at `ai.zatesystems.com`, a LangGraph brain at
`localhost:8123` with 12 agents (NEXUS supervisor, OMEGA 81-tool, MEDICA
11-tool healthcare specialist, plus 10 others), n8n workflows at `localhost:5678`
(64+ workflows including ~10 sacred ones), and Supabase at
`fncfbywkemsxwuiowxxe.supabase.co` (80+ tables, SLUG vs UUID tenant-id split
documented in CLAUDE.md § 2). Cosmique is the only "clinical" tenant today,
shipping a single-clinic aesthetic-medicine schema across 12 tables
(`clinic_patients`, `clinic_treatments`, etc.). Phase 0 of BSH-HMS recommended
deploying **Bahmni** (OpenMRS Core + OpenELIS + Odoo) as the clinical scaffolding
for a Bangladesh Specialized Hospital demo — same platform as the 100 public
hospitals already running OpenMRS+/Bahmni nationally under DGHS — with the 420
LangGraph agents layering AI augmentation on top via additive read-only tools.
Phase 1 (this session) builds the backend: deploy Bahmni locally on this AMD
server in `D:/bsh-hms/bahmni-stack/`, seed demo data via Bahmni's REST API,
write 15 new read-only `bahmni_tools.py` tools, create 4 new n8n bridge
workflows (inactive), document the auth-bridge plan, surgically wire tools
into OMEGA/MEDICA in `graph.py`, smoke test, and document — all on a feature
branch, ZERO pushes to main, ZERO touching of sacred files or other tenants'
data. Concurrent sessions (HR-V3, Smart Ledger c3, Settings audit, Video V2,
Cosmique A — all parked or in-flight) must not be disrupted.

---

## Current state of 420 system (verified 2026-05-29)

| Layer | State | Verified |
|---|---|---|
| Frontend | Lovable build on `ai.zatesystems.com`, tip `ae3a13c` | git log |
| Docker services running | 7 containers (n8n, 420-langgraph-brain, 420-tts-service, 420-video-service-ai, 420-remotion-service, 420-musetalk-service, 420-image-composer) | `docker ps` |
| Ports in use | 5678 (n8n), 8123 (langgraph), 8124 (tts), 8125 (video), 8126 (musetalk), 8127 (remotion), 8128 (image-composer) | `docker ps` |
| n8n active workflows | ~226 baseline + recent HR additions ≈ 240-250 | per CLAUDE.md + HR session notes |
| Supabase | online, schema = 80+ tables | per CLAUDE.md |
| LangGraph brain | up 36h, healthy, 12 agents, OMEGA = 81 tools | per CLAUDE.md + definitions.py |
| MEDICA tools | 11 (per `agents/definitions.py:421-426`) | Phase 0 verification |
| Cosmique clinical tables | 12 (`clinic_*`) + 4 new (Phase 12.B SQL applied) | per COSMIQUE_PHASE12_REPORT.md |

D: drive: 122 GB free of 293 GB (plenty for Bahmni's ~15 GB image set).

---

## Active concurrent sessions (per `docs/CC_SESSION_COORDINATION.md`)

| Session | Status | Scope | Risk to BSH Phase 1 |
|---|---|---|---|
| Session A (Cosmique mobile) | PARKED 2026-05-26 | `index.css`, Layout, cosmique-phase13 tests | NONE — parked |
| Session B (Settings v3) | PARKED 2026-05-24 | settings pages, tests | NONE — parked |
| Session C (Smart Ledger / D7-B Finance) | ACTIVE | `src/pages/accounting/*`, smart-ledger-* tests | NONE — different directory tree |
| Session D (HR Round 1–6) | PARKED 2026-05-24 | hr pages, hr tests | NONE — parked |
| Session F (ACSFX) | PARKED 2026-05-24 | DB-only, no frontend | NONE — parked |
| Session HR-V3 (Decade-Ahead) | PARKED 2026-05-26 | hr_* tables, 17 HR workflows | NONE — parked, but `src/pages/my/MyHR.tsx` was modified locally → stashed by this session as `stash@{0}` for HR-V3 to restore on resume |
| Audit session | PRESUMED ACTIVE | docs/.audit-session-live.md updates | NONE — read-only audit |
| Other sessions referenced (Video V2, Settings) | UNCLEAR | varies | NONE expected — different surfaces |

**Stash created by this session:** `stash@{0}: BSH-PHASE1-PREFLIGHT: stash other-session MyHR.tsx`. HR-V3 must `git stash pop stash@{0}` (or apply manually) when they resume. Noted here so the work isn't lost.

---

## Sacred files (verbatim from CLAUDE.md + COSMIQUE_STATUS.md "DO NOT TOUCH")

**Frontend sacred (NEVER modify in Phase 1):**
- `frontend/src/components/NavigationSidebar.tsx`
- `frontend/src/components/ui/sidebar.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/omega/v3/nav/sectionsRegistry.ts`
- `frontend/src/integrations/supabase/client.ts`
- `frontend/src/index.css`
- `frontend/src/lib/formatCurrency.ts`
- Phase 1–13 shipped pages/hooks (unless owning session extends them)

**Backend sacred (NEVER modify in Phase 1):**
- n8n workflow `E8HZhv4y4MRb6n9F` — Marketing v2.6 (552 nodes)
- n8n workflow `TXeVEskxcLuLwplr` — Communication v3.8 (378 nodes)
- n8n workflow `dEgqwQ7YDm4i7706` — 420 main v2.1 (514 nodes)
- n8n workflow `aTGIlVgvf6lUWHlW` — Sales Part 1 v5.8 (407 nodes)
- n8n workflow `Gnk01auPc9WLYIJU` — Estimation v1.0 (3 nodes, sacred per § 16)
- n8n workflow `fvXs1Z94tvje0QfY` — Video Intelligence Orchestrator v1.0 (16 nodes)
- n8n workflow `lhdU0HUxmdgSSDpD` — Doctor Avatar v1.0 (referenced by Phase 1 BSH-2, but called AS-IS via webhook — NOT modified)
- n8n workflow `0CgtzVNs8zBWEFjg` — OMEGA Campaign Executor v1.0
- n8n workflow `cLTvu6oghz9B5p0z` — OMEGA Daily Briefing v1.0
- n8n workflow `5ZRNaT9BMmbSRj5v` — OMEGA Lead Gen Async v1.0

**LangGraph sacred (mostly NEVER modify):**
- `langgraph-agents/agents/graph.py` — **ONE surgical edit allowed in Sub-phase 1F only** (append to OMEGA + MEDICA tool lists; ZERO other lines touched)
- All other `langgraph-agents/agents/*.py` — read-only in Phase 1
- All existing `langgraph-agents/tools/*.py` — read-only in Phase 1
- `langgraph-agents/server.py` — read-only

**Supabase sacred:**
- No DDL of any kind in Phase 1
- No tenant data writes except a single `tenant_config` row for `bsh-demo` if needed (deferred until Phase 1B if used)
- All RLS policies untouched

---

## Phase 0 recommendation summary (acted on)

- **HMS chosen**: Bahmni (OpenMRS Core + OpenELIS + Odoo)
- **Why**: 100 Bangladesh public hospitals already run OpenMRS+/Bahmni; module breadth (28/38 native + 6 augmented = 34/38); FHIR R4 + REST surface for AI tools; battle-tested Bengali i18n
- **License**: AGPL-3.0 mixed — treat as black-box service (do NOT modify core)
- **Topology**: Phase 1 = local Docker on AMD server at `D:/bsh-hms/bahmni-stack/`. Phase 4 may move to Hetzner Singapore VM at `hms-bsh.zatesystems.com`.
- **Integration**: 15 additive read-only tools in NEW `bahmni_tools.py` → wired into OMEGA + MEDICA registries in Phase 1F only.

---

## User-approved decisions (PF.2 — confirmed for this session)

| Code | Decision | Acted on as |
|---|---|---|
| D1 | Docker Compose on dedicated VM | LOCAL Docker on this AMD server for Phase 1; cloud VM deferred to Phase 4 |
| D2 | Domain `hms-bsh.zatesystems.com` | Will be configured in Phase 4; Phase 1 = `http://localhost:8080` or similar |
| D3 | 50 patients / 5 doctors / 30 days appts / 100 labs / 20 corp / 5 pkgs | Acted on in 1B |
| D4 | Native Bahmni EN/BN, no custom localization | Bahmni i18n pack used as-is; no custom strings |
| D5 | Bahmni owns Postgres, 420 reads via FHIR API only | 420 → Bahmni FHIR R4 only; zero direct DB writes by 420 |
| D6 | SSO deferred to Phase 3 | Auth bridge = plan-only doc in 1E |
| D7 | 4 gap modules deferred to Phase 2 | Histo-Cyto Sticker, OPD Consultation Policy, Cafeteria, Fixed Asset = NOT built in Phase 1 |
| D8 | Agents READ-ONLY in Phase 1 | All 15 tools are GET/SEARCH only; ZERO mutations |
| D9 | Coord doc stays on feature branch | NO push of registration to main; lives on feature branch |

## Answered questions (PF.2 — confirmed)

| Code | Answer | Acted on as |
|---|---|---|
| Q1 | Kickoff prompt + BSH PDF is canonical | Working from kickoff 38-module list; PDF not in repo (open Q2) |
| Q2 | No COURIER agent — use OMEGA `send_message` + n8n Comm v3.8 | Phase 0 already flagged this; Phase 1 design uses OMEGA `send_message` |
| Q3 | Bahmni AGPL acceptable (SaaS hosting) | Treat as black-box, never modify core, no source distribution |
| Q4 | Other sessions don't need HMS-RESEARCH visibility yet | Coord-doc registration stays on feature branch (Phase 0 commit `0fc1e3d` lives only on `feature/hr-v3-improvements-safe-DO-NOT-PUSH` — not propagated) |
| Q5 | 12-16 day timeline confirmed | Phase 1 alone targets ~3-5 days of those |
| Q6 | 8,000 token budget for Phase 1 | Hard cap; soft caps per sub-phase enforced |

---

## Open risks surfaced before Sub-phase 1A

1. **AMD server RAM headroom for Bahmni**: 32GB total; 7 existing 420 containers + Bahmni's 12-container stack may approach 24–28GB. Will measure after 1A.3 and surface if over 80%.
2. **Bahmni first-pull time**: full image set ~12-15GB → 30-90 min of `docker compose up` time, mostly network-bound. Will run in background with notification, not poll.
3. **Bahmni default ports may collide** with langgraph (8123), tts (8124), video (8125), musetalk (8126), remotion (8127), image-composer (8128). Bahmni default is 8080 (OpenMRS) + 8052 (Bahmni UI) + 8088 (Bahmni Mart) + others. Will audit in 1A.2 before bring-up.
4. **Bahmni demo data**: out-of-the-box Bahmni needs concept dictionary, location hierarchy, providers, encounter types configured BEFORE patients can be POSTed. The official bahmni-docker stack typically ships with a "Bahmni Demo Data Loader" that handles this. Will use that loader rather than seed from scratch — much faster than 50 hand-crafted POSTs.
5. **No production Bahmni REST credentials yet**: bahmni-docker default admin = `superman`/`Admin123`. Will document in non-committed `.env`.
6. **MyHR.tsx in stash@{0}**: HR-V3 work parked accidentally by this session; documented above so they can recover.

---

## Pre-flight verdict

**No hard blockers.** Risks 1–4 are budgeted into Sub-phase 1A. Risk 5 is standard. Risk 6 is documented.

**Proceeding to Sub-phase 1A.**
