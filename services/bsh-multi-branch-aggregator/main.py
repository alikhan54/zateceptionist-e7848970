"""BSH-HMS Phase 2D — Multi-Branch Aggregator service.

Pulls metrics from each hospital tenant's Bahmni instance, aggregates,
persists to bsh_multibranch_metrics, serves Pulse dashboards.

Endpoints:
    GET  /metrics/aggregate?tenant_id&metric&period
    GET  /metrics/compare?tenant_id&metric&period
    POST /metrics/refresh-now {tenant_id, metric}
    GET  /metrics/health   (always 200 — used by n8n BSH-9)

Industry-gated: every read/write checks tenant_config.industry == 'healthcare_hospital'.
"""
import os, time, json
from typing import Optional, List
import httpx
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

HOSPITAL = "healthcare_hospital"
SUPABASE = os.getenv("SUPABASE_URL", "https://fncfbywkemsxwuiowxxe.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

app = FastAPI(title="BSH Multi-Branch Aggregator", version="0.1.0")


class RefreshRequest(BaseModel):
    tenant_id: str
    metric: str
    branches: Optional[List[str]] = None


def _sb_headers():
    return {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}


async def _get_tenant_cfg(tenant_id: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE}/rest/v1/tenant_config", headers=_sb_headers(),
                          params={"tenant_id": f"eq.{tenant_id}",
                                   "select": "industry,bahmni_base_url",
                                   "limit": "1"}, timeout=5.0)
        if r.status_code == 200 and r.json():
            return r.json()[0]
    return {}


def _gate(cfg: dict, tenant_id: str):
    if cfg.get("industry") != HOSPITAL:
        raise HTTPException(403,
            f"Aggregator restricted to healthcare_hospital; "
            f"tenant {tenant_id} has industry={cfg.get('industry') or 'unknown'}")


async def _compute_metric_from_bahmni(cfg: dict, metric: str) -> dict:
    """Live aggregation from Bahmni FHIR — Phase 2 placeholder for the
    metrics we support today. Production will route by metric_name to the
    correct FHIR query."""
    base = (cfg.get("bahmni_base_url") or "").rstrip("/")
    if not base:
        return {"value": None, "note": "bahmni_not_configured"}
    if metric == "opd_volume":
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{base}/openmrs/ws/fhir2/R4/Encounter",
                              params={"_count": 1, "type": "OPD"},
                              timeout=10.0)
            return {"value": r.json().get("total", 0) if r.status_code == 200 else 0,
                     "source": "bahmni_fhir_R4"}
    return {"value": None, "metric": metric, "note": "metric not yet implemented"}


@app.get("/metrics/health")
async def health():
    return {"status": "healthy", "service": "bsh-multi-branch-aggregator"}


@app.get("/metrics/aggregate")
async def aggregate(tenant_id: str, metric: str,
                     period: str = "today",
                     branches: Optional[str] = Query(None)):
    """Read latest aggregated metric from cache; if missing, fall back to live."""
    cfg = await _get_tenant_cfg(tenant_id)
    _gate(cfg, tenant_id)
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE}/rest/v1/bsh_multibranch_metrics",
                          headers=_sb_headers(),
                          params={"tenant_id": f"eq.{tenant_id}",
                                   "metric_name": f"eq.{metric}",
                                   "select": "*",
                                   "order": "computed_at.desc", "limit": "1"},
                          timeout=5.0)
        cached = r.json() if r.status_code == 200 else []
    if cached:
        return {"source": "cache", "data": cached[0]}
    live = await _compute_metric_from_bahmni(cfg, metric)
    return {"source": "live", "tenant_id": tenant_id, "metric": metric,
             "period": period, "result": live}


@app.get("/metrics/compare")
async def compare(tenant_id: str, metric: str, period: str = "today"):
    """Compare metric across all branches of a tenant (today: single-site)."""
    cfg = await _get_tenant_cfg(tenant_id)
    _gate(cfg, tenant_id)
    return {"tenant_id": tenant_id, "metric": metric, "period": period,
             "branches": [], "ranked": [],
             "note": "Multi-branch ranking ready for Phase 4 expansion."}


@app.post("/metrics/refresh-now")
async def refresh_now(req: RefreshRequest):
    """Force-compute and persist a metric now."""
    cfg = await _get_tenant_cfg(req.tenant_id)
    _gate(cfg, req.tenant_id)
    live = await _compute_metric_from_bahmni(cfg, req.metric)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    row = {"tenant_id": req.tenant_id, "metric_name": req.metric,
            "metric_value": live, "period_start": now_iso, "period_end": now_iso}
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{SUPABASE}/rest/v1/bsh_multibranch_metrics",
                           headers={**_sb_headers(), "Content-Type": "application/json",
                                     "Prefer": "return=representation"},
                           json=row, timeout=10.0)
        if r.status_code not in (200, 201):
            # DB-level industry trigger may reject — surface honestly
            raise HTTPException(502, f"Persist failed: {r.text[:200]}")
        return {"persisted": r.json()[0] if isinstance(r.json(), list) else r.json()}
