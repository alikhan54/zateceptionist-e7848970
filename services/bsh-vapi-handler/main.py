"""BSH-HMS Phase 2E — VAPI voice OPD handler (Bengali + English).

Receives VAPI webhooks for inbound hospital reception calls, routes through
OMEGA with hospital-only tools, books/queries appointments via Bahmni, sends
SMS confirmation via Comm v3.8.

Industry-gated at handler entry — non-hospital callers get a polite
"this service is not available for your account" message.
"""
import os, re, json
from typing import Optional, Literal
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

HOSPITAL = "healthcare_hospital"
SUPABASE = os.getenv("SUPABASE_URL", "https://fncfbywkemsxwuiowxxe.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
OMEGA = os.getenv("OMEGA_URL", "http://420-langgraph-brain:8123/omega")
COMM_V38_OUTBOUND = os.getenv("COMM_V38_OUTBOUND",
                                "http://n8n:5678/webhook/universal-outbound")

app = FastAPI(title="BSH VAPI Handler", version="0.1.0")


class VAPIInbound(BaseModel):
    tenant_id: str
    call_id: str
    caller_phone: str
    transcript: str
    language: Optional[Literal["bn", "en", "auto"]] = "auto"


def _detect_language(text: str) -> str:
    """Detect Bengali (Unicode range U+0980..U+09FF) vs English."""
    if re.search(r"[ঀ-৿]", text or ""):
        return "bn"
    return "en"


async def _get_tenant_cfg(tenant_id: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE}/rest/v1/tenant_config",
                          headers={"apikey": SUPABASE_KEY,
                                    "Authorization": f"Bearer {SUPABASE_KEY}"},
                          params={"tenant_id": f"eq.{tenant_id}",
                                   "select": "industry,bahmni_base_url",
                                   "limit": "1"}, timeout=5.0)
        if r.status_code == 200 and r.json():
            return r.json()[0]
    return {}


def _polite_reject(lang: str) -> dict:
    msgs = {
        "bn": "দুঃখিত, এই পরিষেবাটি আপনার অ্যাকাউন্টে উপলব্ধ নয়।",
        "en": "Sorry, this service is not available for your account.",
    }
    return {"reply": msgs.get(lang, msgs["en"]), "tools_called": []}


def _build_omega_prompt(lang: str, transcript: str, caller_phone: str) -> str:
    if lang == "bn":
        return (f"VAPI ইনবাউন্ড OPD কল। বাংলায় উত্তর দিন। কলারের ফোন: "
                f"{caller_phone}। ট্রান্সক্রিপ্ট: '{transcript}'। "
                f"bahmni_search_patients দিয়ে রোগী খুঁজুন; ইন্টেন্ট অনুযায়ী "
                f"bahmni_create_appointment বা bahmni_get_appointments কল করুন। "
                f"send_message ব্যবহার করে SMS দিয়ে নিশ্চিত করুন।")
    return (f"VAPI inbound OPD call. Respond in English. Caller phone: "
            f"{caller_phone}. Transcript: '{transcript}'. Use bahmni_search_patients "
            f"to identify caller; route to bahmni_create_appointment OR "
            f"bahmni_get_appointments based on intent. Confirm via send_message SMS.")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "bsh-vapi-handler"}


@app.post("/vapi/inbound")
async def vapi_inbound(req: VAPIInbound):
    lang = req.language if req.language != "auto" else _detect_language(req.transcript)
    cfg = await _get_tenant_cfg(req.tenant_id)
    if cfg.get("industry") != HOSPITAL:
        # Polite-reject (don't raise — VAPI returns the text to the caller)
        return _polite_reject(lang)
    prompt = _build_omega_prompt(lang, req.transcript, req.caller_phone)
    async with httpx.AsyncClient() as c:
        r = await c.post(OMEGA,
                          json={"tenant_id": req.tenant_id, "message": prompt,
                                 "user_identifier": req.caller_phone,
                                 "channel": "voice", "metadata": {"call_id": req.call_id,
                                                                     "language": lang}},
                          timeout=120.0)
        if r.status_code != 200:
            raise HTTPException(502, f"OMEGA error: {r.text[:200]}")
        body = r.json()
    return {"reply": body.get("response", ""), "language": lang,
             "tools_called": body.get("tools_called", []),
             "call_id": req.call_id}
