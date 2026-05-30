"""BSH-HMS Phase 2C — Auth Bridge FastAPI service.

Bridges 420 Supabase JWT → Bahmni session cookie. Industry-gated:
every endpoint validates tenant_config.industry == 'healthcare_hospital'
before issuing or refreshing a Bahmni session.

Run:
    uvicorn services.bsh-auth-bridge.main:app --host 0.0.0.0 --port 9101
Or via docker compose (see docker-compose.yml + Dockerfile in this dir).

Endpoints:
    POST /auth/420-to-bahmni   — exchange 420 JWT for Bahmni session
    GET  /auth/verify          — validate a bridged token
    POST /auth/refresh         — refresh an expiring bridged token
    GET  /health               — liveness probe (always 200 unless dead)
"""
import os, time, json
from typing import Optional
import httpx
import jwt as pyjwt
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel

HOSPITAL = "healthcare_hospital"
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fncfbywkemsxwuiowxxe.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")  # for HS256 JWT decode
BRIDGE_SIGNING_KEY = os.getenv("BSH_BRIDGE_SIGNING_KEY", "dev-only-rotate-me")
BRIDGE_TTL_SECONDS = int(os.getenv("BSH_BRIDGE_TTL", "1800"))  # 30 min default

app = FastAPI(title="BSH Auth Bridge", version="0.1.0")


class BridgeRequest(BaseModel):
    tenant_id: str
    user_id: Optional[str] = None


class BridgeResponse(BaseModel):
    bahmni_session: str
    bridged_token: str
    expires_at: int
    tenant_id: str
    industry: str


async def _get_tenant_config(tenant_id: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{SUPABASE_URL}/rest/v1/tenant_config",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            params={"tenant_id": f"eq.{tenant_id}",
                     "select": "industry,bahmni_base_url,bahmni_admin_user,features",
                     "limit": "1"},
            timeout=5.0,
        )
        if r.status_code == 200 and r.json():
            return r.json()[0]
    return {}


def _verify_supabase_jwt(auth_header: Optional[str]) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = auth_header.removeprefix("Bearer ").strip()
    if not SUPABASE_JWT_SECRET:
        # Dev mode — decode without verify, just for shape
        try:
            return pyjwt.decode(token, options={"verify_signature": False})
        except Exception:
            raise HTTPException(401, "Invalid JWT (dev decode failed)")
    try:
        return pyjwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"],
                              audience="authenticated")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, "JWT expired")
    except Exception as e:
        raise HTTPException(401, f"JWT invalid: {e}")


def _industry_gate(cfg: dict, tenant_id: str):
    actual = cfg.get("industry")
    if actual != HOSPITAL:
        raise HTTPException(
            403,
            f"BSH auth bridge is only available for healthcare_hospital tenants. "
            f"Tenant {tenant_id} has industry={actual or 'unknown'}.",
        )


def _resolve_bahmni_secret(cfg: dict) -> Optional[str]:
    """Pulls the Bahmni admin password from features.bahmni_secret_ref.
    For Phase 2 we accept a literal token in features.bahmni_admin_token
    as a dev fallback. Production should use a vault."""
    features = cfg.get("features") or {}
    return features.get("bahmni_admin_token") or os.getenv("BSH_BAHMNI_FALLBACK_TOKEN")


async def _bahmni_login(base_url: str, user: str, token: str) -> str:
    """POST OpenMRS REST session, return Bahmni session ID."""
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{base_url.rstrip('/')}/openmrs/ws/rest/v1/session",
            headers={"Authorization": f"Basic {token}", "Accept": "application/json"},
            timeout=10.0,
        )
        r.raise_for_status()
        body = r.json()
        sid = body.get("sessionId") or r.cookies.get("JSESSIONID", "")
        if not sid:
            raise HTTPException(502, "Bahmni did not return a session ID")
        return sid


def _issue_bridged_token(tenant_id: str, user_id: Optional[str],
                           bahmni_session: str) -> tuple[str, int]:
    exp = int(time.time()) + BRIDGE_TTL_SECONDS
    payload = {
        "iss": "bsh-auth-bridge",
        "tenant_id": tenant_id,
        "user_id": user_id,
        "bahmni_session": bahmni_session,
        "industry": HOSPITAL,
        "exp": exp,
    }
    return pyjwt.encode(payload, BRIDGE_SIGNING_KEY, algorithm="HS256"), exp


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "bsh-auth-bridge", "hospital_industry": HOSPITAL}


@app.post("/auth/420-to-bahmni", response_model=BridgeResponse)
async def bridge_420_to_bahmni(
    req: BridgeRequest,
    authorization: Optional[str] = Header(None),
):
    """Exchange a valid 420 Supabase JWT for a Bahmni session cookie."""
    claims = _verify_supabase_jwt(authorization)
    cfg = await _get_tenant_config(req.tenant_id)
    _industry_gate(cfg, req.tenant_id)
    if not cfg.get("bahmni_base_url"):
        raise HTTPException(503, "Bahmni not configured for this tenant (deferred)")
    bahmni_token = _resolve_bahmni_secret(cfg)
    if not bahmni_token:
        raise HTTPException(500, "Bahmni admin secret not resolvable (vault ref empty)")
    sid = await _bahmni_login(cfg["bahmni_base_url"],
                                 cfg.get("bahmni_admin_user") or "admin",
                                 bahmni_token)
    bridged, exp = _issue_bridged_token(req.tenant_id,
                                          req.user_id or claims.get("sub"),
                                          sid)
    return BridgeResponse(bahmni_session=sid, bridged_token=bridged,
                           expires_at=exp, tenant_id=req.tenant_id,
                           industry=HOSPITAL)


@app.get("/auth/verify")
async def verify(authorization: Optional[str] = Header(None)):
    """Validate a bridged token signature + industry."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = pyjwt.decode(token, BRIDGE_SIGNING_KEY, algorithms=["HS256"])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, "Bridged token expired")
    except Exception as e:
        raise HTTPException(401, f"Bridged token invalid: {e}")
    if payload.get("industry") != HOSPITAL:
        raise HTTPException(403, "Token is not for a hospital tenant")
    cfg = await _get_tenant_config(payload["tenant_id"])
    _industry_gate(cfg, payload["tenant_id"])  # re-check (tenant could have changed)
    return {"valid": True, "tenant_id": payload["tenant_id"],
             "user_id": payload.get("user_id"), "expires_at": payload["exp"],
             "industry": HOSPITAL}


@app.post("/auth/refresh", response_model=BridgeResponse)
async def refresh(authorization: Optional[str] = Header(None)):
    """Refresh an expiring bridged token. Re-validates industry on every call."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = pyjwt.decode(token, BRIDGE_SIGNING_KEY, algorithms=["HS256"],
                                 options={"verify_exp": False})  # allow expired for refresh
    except Exception as e:
        raise HTTPException(401, f"Bridged token invalid: {e}")
    cfg = await _get_tenant_config(payload["tenant_id"])
    _industry_gate(cfg, payload["tenant_id"])
    new_token, exp = _issue_bridged_token(payload["tenant_id"],
                                            payload.get("user_id"),
                                            payload.get("bahmni_session", ""))
    return BridgeResponse(bahmni_session=payload.get("bahmni_session", ""),
                           bridged_token=new_token, expires_at=exp,
                           tenant_id=payload["tenant_id"], industry=HOSPITAL)
