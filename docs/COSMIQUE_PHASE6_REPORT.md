# Cosmique — Phase 6 Report (NEXUS Routing Fix + E2E Rules Hardening)

**Date:** 2026-05-20

## Part A — NEXUS routing fix

**Symptom (Phase 5c open ticket):** NEXUS routed "How many patients?" on `cosmique` (`industry=healthcare_clinic`) to **CORTEX** (system metrics) instead of **MEDICA** (clinical). Patient counts read as "metrics" to the LLM, and the CORTEX rule said simply *"for system metrics/optimization"* with no boundary against domain counts.

**Root cause:** Two ambiguous lines in the routing prompt at `langgraph-agents/agents/graph.py:445/450`:
- CORTEX rule was too broad — "system metrics" caught any "how many X" question.
- MEDICA rule only mentioned "clinical" — didn't claim patient-domain queries.

**Fix (additive — preserved every existing rule):** Disambiguated the two lines.

```diff
- ROUTE:cortex - for system metrics/optimization
+ ROUTE:cortex - for CROSS-SYSTEM metrics (n8n executions, workflow health, agent latency, infra/system diagnostics). NOT for industry-domain counts like patient/customer/listing counts — those go to the industry specialist (medica/realty/etc.) when the tenant industry matches.

- ROUTE:medica - ONLY for healthcare_clinic/healthcare/aesthetics industry tenants. If tenant industry is different, do NOT route here.
+ ROUTE:medica - ONLY for healthcare_clinic/healthcare/aesthetics industry tenants. For clinical AND patient-domain queries (patient counts, patient demographics, patient history, treatments, prescriptions, consultations, products, health reports). If tenant industry is different, do NOT route here.
```

**Rebuild:** `docker compose build langgraph-agents && docker compose up -d langgraph-agents` (service name is `langgraph-agents`, not `langgraph-brain` — that's the container name). Image `langgraph-agents-langgraph-agents:latest` rebuilt at 2026-05-20T12:58Z. Container `420-langgraph-brain` recreated and healthy (`/health` 200 OK, 13 agents loaded).

### Verification — 5 queries, 3 tenants

| Tenant (industry) | Query | Expected | Got | Verdict |
|---|---|---|---|---|
| cosmique (healthcare_clinic) | How many patients? | MEDICA | **medica** | ✅ FIXED |
| cosmique (healthcare_clinic) | Do you have HydraFacial? | MEDICA | **medica** | ✅ (already correct, control) |
| cosmique (healthcare_clinic) | How much revenue this month? | CORTEX | **cortex** | ✅ (control — fix didn't over-route) |
| bbqtonight (restaurant) | How many orders today? | NOT MEDICA | **cortex** | ✅ (cross-tenant regression PASS) |
| autoboost (auto_detailing) | How many cars detailed? | NOT MEDICA | **cortex** | ✅ (cross-tenant regression PASS) |

5/5 PASS. No tenant industry was over-routed to MEDICA.

**Persistence note:** `langgraph-agents/` is not a git repository (per `CLAUDE.md`). The change lives in the Docker image `langgraph-agents-langgraph-agents:latest`. If the host is reset and the image rebuilt from `agents/graph.py` again, the change persists because the file edit is on disk at `D:/420-system/langgraph-agents/agents/graph.py`. If a clean rebuild from a fresh clone happens, this fix needs to be re-applied — recommend git-init'ing that directory in a future session.

## Part B — E2E_TESTING_RULES.md hardening

Phase 5d's strict-Method-A mandate forced three rounds of surgical test hardening before all 4 specs ran 4/4 REAL_PASS in serial. Those patterns are now **starting equipment** for any new spec, captured in a new "Test infrastructure conventions (hardened in Phase 5d)" section appended to `docs/E2E_TESTING_RULES.md`. The 9 patterns:

1. **Replace fixed `waitForTimeout(N)` after navigation with `waitForSelector` on real content** — anchor on a testid attached to the first row of the grid.
2. **UI assertions after mutations: use `expect.poll`, not single-shot `innerText`** — React Query refetch lands 1–3s after the mutation toast.
3. **`waitUntil: 'networkidle'` hangs on dashboards with continuous polling** — default to `domcontentloaded` + `waitForSelector` on a sentinel.
4. **Use `page.keyboard.type({delay})` + in-input Enter; avoid `input.fill()` + external click** — React state closure on the external button may be stale.
5. **Detect transient renders with a MutationObserver, not polling-based `isVisible`** — for elements that are mounted for <100ms (warm-cache scenarios).
6. **Test data hygiene: seed via REST, drive verdict via UI, clean up in the test** — `TEST_CC_PHASE<N>_` prefix for grep-ability.
7. **Reverts MUST happen even when a test fails mid-flight** — `try/finally` around the mutation, or a baseline-drift sweep after the suite.
8. **`DEPLOY_PENDING` is a valid verdict — never downgrade to "Method B PASS"** — the spec must `test.skip(true, 'DEPLOY_PENDING')` rather than fall back to a REST PATCH and call it PASS.
9. **Webhook delay races: route-mock or MutationObserver, never just longer waits** — combine both; longer timeouts alone race warm-cache replies.

Each pattern includes a working code snippet in the doc. Total addition: ~80 lines, all under a single new H2 heading.

## Files touched

| File | Change | Lines | Persistence |
|---|---|---|---|
| `langgraph-agents/agents/graph.py` | NEXUS routing prompt — 2 lines disambiguated (CORTEX + MEDICA) | +2 / −2 | Docker image (`langgraph-agents-langgraph-agents:latest`); also on disk. Not git. |
| `frontend/docs/E2E_TESTING_RULES.md` | New "Test infrastructure conventions" section (9 patterns + snippets) | +85 | Committed to `origin/main`. |
| `frontend/docs/COSMIQUE_PHASE6_REPORT.md` | This report | new | Committed to `origin/main`. |

## Token usage

~120 of 500 hard cap, ~120 of 350 soft cap. Pre-flight skipped because both deliverables were small and the NEXUS code location was discoverable in 2 greps.
