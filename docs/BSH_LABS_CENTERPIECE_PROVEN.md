# BSH-HMS — Labs Centerpiece PROVEN (live brain)

**Date:** 2026-05-30
**Tenant:** `bsh-demo` (industry `healthcare_hospital`)
**Brain:** `420-langgraph-brain` @ `localhost:8123` (recreated `docker compose up -d --build`, 12 agents healthy)
**Bahmni:** live FHIR R4 at `https://host.docker.internal:8443` (self-signed TLS)

The non-negotiable pitch centerpiece — *"MEDICA reads a chart and cites real abnormal
lab values"* — is verified end-to-end on the **live HTTP brain**, via both the direct
agent path and the NEXUS auto-route path, with cross-tenant leak-safety confirmed.

---

## 1. What changed in the live brain

> ⚠️ The brain code (`D:\420-system\langgraph-agents\`) is **NOT git-tracked** — it is
> versioned via `.bak` backups + the baked Docker image (project convention). This doc is
> the durable record of those changes. Only the seed script (`scripts/`) lives in this repo
> and is committed alongside this doc.

### 1.1 `tools/bahmni_tools.py` — leak-safe per-tenant config
`_get_bahmni_config(tenant_id)` was rewritten to be **leak-safe**:
- Per-tenant routing key is **`tenant_config.bahmni_base_url` ONLY** (selected alone — the
  table has no `bahmni_api_token` column, which previously caused an HTTP 400 → silent env
  fallback → cross-tenant leak risk).
- The shared admin token comes from the **`BAHMNI_API_TOKEN` env**, never from the DB
  (keeps the credential out of data-at-rest).
- **No global `base_url` fallback for a named tenant**: a tenant without its own
  `bahmni_base_url` is treated as *not configured* and **never inherits another tenant's
  Bahmni instance**. This is the core leak-prevention invariant.

```python
async def _get_bahmni_config(tenant_id: str) -> dict:
    if not tenant_id:
        return {"base_url": _GLOBAL_BAHMNI_BASE, "token": _GLOBAL_BAHMNI_TOKEN}
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/tenant_config",
                headers=_supabase_headers(),
                params={"tenant_id": f"eq.{tenant_id}", "select": "bahmni_base_url", "limit": "1"},
                timeout=_HTTP_TIMEOUT,
            )
            if r.status_code == 200 and r.json():
                base = (r.json()[0].get("bahmni_base_url") or "").rstrip("/")
                return {"base_url": base, "token": _GLOBAL_BAHMNI_TOKEN if base else ""}
    except Exception:
        pass
    return {"base_url": "", "token": ""}   # named tenant, not configured -> no leak
```

Every Bahmni tool guards on this: `cfg = await _get_bahmni_config(tenant_id);
if not cfg["base_url"]: return _not_configured(tenant_id, "<tool>")`.

### 1.2 `tools/bahmni_tools.py` — 3 fixed lab tools
Query shapes + FHIR `referenceRange` abnormal-flagging fixed for:
- `bahmni_get_lab_orders` — ServiceRequest lab orders
- `bahmni_get_lab_result` — Observation results
- `bahmni_check_critical_values` — scans Observations, flags abnormal/critical

Helpers: `_num` (numeric coercion), `_extract_range` (reads FHIR `referenceRange`
low/high + the meaning map: hi/lowNormal→normal, hi/lowCritical→treatment, absolute),
`_flag_abnormal` (compares value vs range → normal/abnormal/critical).

### 1.3 `agents/graph.py` — MEDICA industry gate + NEXUS routing
- **Line 61** — gate now admits the hospital vertical:
  `"medica": ["healthcare_clinic", "healthcare", "aesthetics", "healthcare_hospital"]`
  (bsh-demo was previously *blocked* from MEDICA).
- **Line 451** — NEXUS routing prompt updated: route to MEDICA for
  `healthcare_clinic/healthcare/aesthetics/healthcare_hospital` on clinical **and**
  patient-domain queries (incl. lab orders, lab results, abnormal/critical lab values).

### 1.4 `langgraph-agents/.env` — Bahmni env (brain)
```
BAHMNI_API_TOKEN=YWRtaW46QWRtaW4xMjM=   # base64("admin:Admin123") — stock, internal-only
BAHMNI_TLS_VERIFY=false                  # self-signed cert on host Bahmni
# BAHMNI_BASE_URL deliberately NOT set globally (would leak bsh Bahmni to other tenants)
```

### 1.5 `scripts/seed-bahmni-demo-data.py` — TSH concept-range overlay (committed here)
Added `tsh` to `CONCEPT_RANGE_OVERLAY` (+ `ANALYTES`, + `TEST_MAP` "Thyroid Panel") so all
6 seeded abnormal analytes self-describe via FHIR `referenceRange`. Overlay applied to live
Bahmni (idempotent, 0 errors).

```python
CONCEPT_RANGE_OVERLAY = {
    "creatinine": {"lowNormal": 0.7, "hiNormal": 1.3, "lowCritical": 0.2, "hiCritical": 4.0},
    "hba1c":      {"lowNormal": 4.0, "hiNormal": 5.7, "hiCritical": 10.0},
    "troponin":   {"lowNormal": 0.0, "hiNormal": 0.04, "hiCritical": 0.5},
    "tsh":        {"lowNormal": 0.4, "hiNormal": 4.0, "hiCritical": 10.0},
}
```

---

## 2. Live config state (verified)

| tenant_id | industry | bahmni_base_url |
|---|---|---|
| `bsh-demo` | `healthcare_hospital` | `https://host.docker.internal:8443` |
| `cosmique` | `healthcare_clinic` | `null` (dormant — proves leak-safety) |

---

## 3. PROOF — MEDICA cites real abnormal values (verbatim, live)

### 3.1 Direct path — `POST /agent/medica` (tenant_id=`bsh-demo`)
Prompt: *"List any critical or abnormal lab values currently flagged in the hospital. For
each, give the test name, the measured value, and the normal reference range."*
`execution_time_ms: 78412`. MEDICA returned **8 flagged values across 8 patients**:

| # | Patient (FHIR id) | Test | Value | Normal range |
|---|---|---|---|---|
| 1 | Patient/cde3d64d-ff7b-4725-b7fa-0a3086bebcd1 | Serum potassium | **6.8** mmol/L | 3.5–5.6 |
| 2 | Patient/db604899-be8e-4164-bc44-cd74645de3e7 | SGPT (glutamic-pyruvic transaminase) | **180** IU/L | 0–35 |
| 3 | Patient/b69903d7-3d52-4d33-8cb1-1033337f3359 | SGPT | **180** IU/L | 0–35 |
| 4 | Patient/f917e2fb-1efd-42df-96c5-2b32cc1f3589 | SGPT | **180** IU/L | 0–35 |
| 5 | Patient/0eaf46ec-03d0-4001-b1df-6fd36f29c145 | Total cholesterol | **7.8** mmol/L | < 5.17 |
| 6 | Patient/15ad4585-eeb0-4e06-b762-2810d3a2da6b | Total cholesterol | **7.8** mmol/L | < 5.17 |
| 7 | Patient/82338035-db7e-427f-9c4b-91628518a8e8 | Total cholesterol | **7.8** mmol/L | < 5.17 |
| 8 | Patient/f63cc2fd-769c-49d8-bcbe-86838a3b5093 | SGPT | **180** IU/L | 0–35 |

### 3.2 NEXUS auto-route — `POST /run` (tenant_id=`bsh-demo`)
Same prompt. Response: `"agent_used":"medica"`, `execution_time_ms: 50945`. NEXUS routed
correctly to MEDICA, which cited Serum potassium **6.8** [3.5–5.6], Total cholesterol
**7.8** [<5.17], and SGPT **180** [0–35], plus clinical recommendations. Confirms the
routing-prompt fix works end-to-end (no T29 misroute for this query).

---

## 4. PROOF — cross-tenant leak-safety (live)

`POST /agent/medica` (tenant_id=`cosmique`), same prompt, `execution_time_ms: 42888`.
MEDICA is **allowed** (cosmique is `healthcare_clinic`), but its Bahmni tools return
**not_configured** — cosmique has no `bahmni_base_url`. Verbatim:

> *"…it appears that the system is currently unable to check for critical or abnormal lab
> values as the necessary integration with Bahmni (the hospital's electronic health record
> system) has not been configured for our tenant."*

**Zero** bsh-demo values leaked. The leak-safe `_get_bahmni_config` (no global base_url
fallback for named tenants) holds in production.

---

## 5. Pre-demo checklist (before any EXTERNAL BSH demo)

- [ ] **Rotate Bahmni `admin` password** (currently stock `Admin123`, internal-only).
      Then update `BAHMNI_API_TOKEN` in `langgraph-agents/.env` to
      `base64("admin:<NEW_PASSWORD>")` and `docker compose up -d` to reload.
- [ ] Confirm Bahmni reachable from the brain (`/health` 12 agents, one MEDICA lab call).
- [ ] (Optional) Tier B appointments — deferred; clean follow-up session.

---

## 6. Deploy mechanics (reference)

- Brain code is **baked into the image** (no bind-mount) → deploy = `cd
  D:\420-system\langgraph-agents && docker compose up -d --build` (builds new image first;
  old container stays up if build fails).
- `.env` is the brain's `env_file`. The root `D:\420-system\.env` is n8n's — Bahmni vars
  belong in `langgraph-agents/.env` only.
- Backups (host): `tools/bahmni_tools.py.pre-labfix.*.bak`,
  `agents/graph.py` / `server.py` `.precontainerfix.*` (+ container copies).
