"""
420 System — MEDICA Hospital Lab-Report Document Intelligence (P6a).

inspect_lab_report(tenant_id, report_id): READ a resulted lab report stored PRIVATELY in
the clinic-phi bucket, extract structured findings, and return them for MEDICA to summarize
and FLAG (never diagnose/prescribe/decide). `tenant_id` is the FIRST param, so the existing
M2 firewall (_firewall_wrap_tools) injects the trusted tenant on every call — the model
cannot override it. Industry-gated to `hospital` → inert for cosmique/bbqtonight/bsh-demo.

PHI GATE (the fix for the hole): is_phi_onbox(tenant_id, industry) — the SAME helper get_llm
uses (imported lazily to avoid a circular import).
  PHI tenant  → LOCAL-only extraction (PyMuPDF on-box); a scanned PDF (no text layer) →
                FAIL CLOSED (no cloud vision, ever).
  non-PHI     → CLOUD extraction delegated to the inspect-lab-report Edge Function (the
                Gemini key stays a Supabase secret, never in the brain).
Real PHI never touches a third-party model/vision or a public bucket. The audit columns
extracted_via / model_used record exactly how each report was processed.

BOUNDARY: READ-only decision support (writes ONLY this report's own extraction provenance).
Returns flagged findings; MEDICA composes the clinical takeaway. Never diagnoses/prescribes.
"""
import os
import json
import re
import httpx
from datetime import datetime, timezone
from langchain_core.tools import tool

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fncfbywkemsxwuiowxxe.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
PHI_LOCAL_MODEL = "ollama:qwen2.5"
PHI_BUCKET = "clinic-phi"


def _headers(json_ct: bool = True) -> dict:
    h = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    if json_ct:
        h["Content-Type"] = "application/json"
    return h


async def _get(table: str, params: dict) -> list:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE_URL}/rest/v1/{table}", headers=_headers(), params=params, timeout=15)
        r.raise_for_status()
        return r.json()


async def _patch(table: str, params: dict, body: dict) -> None:
    async with httpx.AsyncClient() as c:
        r = await c.patch(f"{SUPABASE_URL}/rest/v1/{table}",
                          headers={**_headers(), "Prefer": "return=minimal"}, params=params, json=body, timeout=15)
        r.raise_for_status()


async def _tenant_industry(tenant_id: str) -> str:
    try:
        rows = await _get("tenant_config", {"tenant_id": f"eq.{tenant_id}", "select": "industry", "limit": 1})
        return (rows[0].get("industry") or "") if rows else ""
    except Exception:
        return ""


async def _download_private(storage_path: str) -> bytes:
    """Fetch a PRIVATE object's bytes from clinic-phi via the service role (RLS-bypass)."""
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE_URL}/storage/v1/object/{PHI_BUCKET}/{storage_path}",
                        headers=_headers(json_ct=False), timeout=30)
        r.raise_for_status()
        return r.content


def _parse_findings_from_text(text: str) -> list:
    """Light regex parse of 'Analyte  value unit  (ref range)  H/L' lines from a digital PDF's text."""
    findings = []
    for line in text.splitlines():
        m = re.match(
            r"\s*([A-Za-z][A-Za-z0-9 /().\-]{2,40}?)\s+([0-9]+\.?[0-9]*)\s*([A-Za-z/%µ]+)?\s*"
            r"(?:\(?\s*(?:ref[:.]?\s*)?([0-9][0-9.\s<>\-]*[0-9])\s*\)?)?\s*(H|L|HIGH|LOW|CRIT|CRITICAL|ABN|\*)?\s*$",
            line, re.I)
        if m and m.group(2):
            findings.append({"test": m.group(1).strip(), "value": m.group(2), "unit": (m.group(3) or "").strip(),
                             "ref_range": (m.group(4) or "").strip(), "flag": (m.group(5) or "").upper()})
    return findings[:40]


def _extract_local_pymupdf(pdf_bytes: bytes):
    """On-box digital-PDF text extraction (PyMuPDF). NO network. Raises ValueError('scanned_no_text_layer')
    when the PDF has no usable text layer → caller fail-closes (no on-box OCR available)."""
    import fitz  # PyMuPDF — on-box, no third party
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        text = "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()
    if len(text.strip()) < 20:
        raise ValueError("scanned_no_text_layer")
    return _parse_findings_from_text(text), text


async def _extract_cloud_via_edge(tenant_id: str, report_id: str) -> dict:
    """Delegate CLOUD extraction to the inspect-lab-report Edge Function (Gemini key = Supabase secret).
    Called server-to-server with the service-role key; the Edge Function trusts the body tenant_id and
    writes findings + audit to the row."""
    async with httpx.AsyncClient() as c:
        r = await c.post(f"{SUPABASE_URL}/functions/v1/inspect-lab-report",
                         headers=_headers(), json={"report_id": report_id, "tenant_id": tenant_id}, timeout=90)
        if r.status_code != 200:
            raise RuntimeError(f"cloud extraction failed ({r.status_code}): {r.text[:200]}")
        return r.json()


@tool
async def inspect_lab_report(tenant_id: str, report_id: str) -> str:
    """Inspect a resulted lab report (PDF) stored privately for THIS hospital and return structured,
    flagged findings for the clinician. READ-only decision support: SUMMARIZE and FLAG abnormal/critical
    values; NEVER diagnose, prescribe, or decide treatment. Hospital vertical only.
    Args: report_id = a hospital_lab_reports row id. (tenant_id is injected by the firewall — never guess it.)"""
    industry = await _tenant_industry(tenant_id)
    if industry != "hospital":
        return json.dumps({"available": False, "reason": "not_hospital", "tenant_industry": industry})

    rows = await _get("hospital_lab_reports", {"tenant_id": f"eq.{tenant_id}", "id": f"eq.{report_id}",
                                               "select": "*", "limit": 1})
    if not rows:
        return json.dumps({"error": f"lab report not found for this hospital: {report_id}"})
    rep = rows[0]

    # idempotent: return cached findings if already extracted
    if rep.get("findings") and rep.get("extracted_via"):
        return json.dumps({"report_id": report_id, "extracted_via": rep["extracted_via"],
                           "model_used": rep.get("model_used"), "findings": rep["findings"], "cached": True,
                           "note": "READ-only: SUMMARIZE & FLAG for the clinician; do not diagnose/prescribe."})

    # ---- THE PHI GATE (same logic get_llm uses) ----
    from agents.graph import is_phi_onbox  # lazy import — avoids a circular import at load
    phi = is_phi_onbox(tenant_id, industry)

    try:
        if phi:
            pdf = await _download_private(rep["storage_path"])
            findings, _text = _extract_local_pymupdf(pdf)   # raises on scanned → fail-closed
            extracted_via, model_used = "local_pymupdf", PHI_LOCAL_MODEL
            await _patch("hospital_lab_reports", {"tenant_id": f"eq.{tenant_id}", "id": f"eq.{report_id}"},
                         {"findings": findings, "extracted_via": extracted_via, "model_used": model_used,
                          "status": "inspected", "inspected_at": datetime.now(timezone.utc).isoformat()})
        else:
            res = await _extract_cloud_via_edge(tenant_id, report_id)  # Edge Function extracts + writes the row
            findings = res.get("findings", [])
            extracted_via = res.get("extracted_via", "gemini-2.5-flash")
            model_used = res.get("model_used", "gemini-2.5-flash")
    except ValueError as e:
        if str(e) == "scanned_no_text_layer":
            await _patch("hospital_lab_reports", {"tenant_id": f"eq.{tenant_id}", "id": f"eq.{report_id}"},
                         {"status": "failed", "extracted_via": "local_pymupdf", "model_used": PHI_LOCAL_MODEL})
            return json.dumps({"available": True, "extracted": False,
                               "reason": "scanned_pdf_no_text_layer_fail_closed",
                               "note": ("This tenant is PHI on-box: only local digital-PDF extraction is permitted, "
                                        "and this report appears scanned (no text layer). On-box OCR is not available "
                                        "— please enter the values manually. Cloud vision was NOT used.")})
        raise

    flagged = [f for f in findings if str(f.get("flag", "")).upper() in ("H", "L", "HIGH", "LOW", "CRIT", "CRITICAL", "ABN", "*")]
    return json.dumps({"report_id": report_id, "extracted_via": extracted_via, "model_used": model_used,
                       "findings": findings, "flagged_count": len(flagged),
                       "note": ("READ-only decision support: SUMMARIZE & FLAG abnormal/critical values for the "
                                "clinician. Do NOT diagnose, prescribe, or decide treatment.")})


HOSPITAL_LAB_TOOLS = [inspect_lab_report]
