"""
Cleanup script for HR Round 3 interactive test data.

Reads tests/hr-e2e-round3-cleanup.json + nukes anything matching the
PLAYWRIGHT-TEST patterns it lists. Idempotent.

Auth: SUPABASE_SERVICE_KEY from D:/420-system/.env

Usage:  python tests/cleanup-playwright-test-data.py
"""
import json
import os
import urllib.parse
import urllib.request
import urllib.error
import sys
from pathlib import Path

ENV = Path("D:/420-system/.env").read_text(encoding="utf-8")
SUPA_URL = "https://fncfbywkemsxwuiowxxe.supabase.co"
SVC_KEY = next(
    (line.split("=", 1)[1].strip() for line in ENV.splitlines() if line.startswith("SUPABASE_SERVICE_KEY=")),
    None,
)
if not SVC_KEY:
    print("SUPABASE_SERVICE_KEY missing"); sys.exit(1)

TENANT_UUID = "ac308ab6-f381-4eef-88ec-4d5c7a860ff9"
TENANT_SLUG = "zateceptionist"

cleanup_path = Path("D:/420-system/frontend/tests/hr-e2e-round3-cleanup.json")
if not cleanup_path.exists():
    print(f"No cleanup file at {cleanup_path}; nothing to do.")
    sys.exit(0)

manifest = json.loads(cleanup_path.read_text(encoding="utf-8"))

HEADERS = {
    "apikey": SVC_KEY,
    "Authorization": f"Bearer {SVC_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def req(method: str, url: str) -> tuple[int, str]:
    r = urllib.request.Request(url, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def delete_where(table: str, query: str, desc: str) -> int:
    """Delete rows matching the query string, return count deleted."""
    url = f"{SUPA_URL}/rest/v1/{table}?{query}"
    status, body = req("DELETE", url)
    if status == 404:
        # Table doesn't exist — silently ignore (some "child" tables are optional)
        return 0
    if status >= 400:
        print(f"  [{desc}] DELETE {table} -> {status}: {body[:200]}")
        return -1
    try:
        return len(json.loads(body))
    except Exception:
        return 0


total_deleted = 0

# Employees — match by email
for email in manifest.get("employee_emails", []):
    # First grab employee IDs for related-table cleanup
    q = f"select=id&tenant_id=eq.{TENANT_UUID}&company_email=eq.{urllib.parse.quote(email)}"
    status, body = req("GET", f"{SUPA_URL}/rest/v1/hr_employees?{q}")
    emp_ids = [r["id"] for r in json.loads(body)] if status < 400 else []
    if emp_ids:
        ids_csv = ",".join(emp_ids)
        # Delete dependent rows first
        for child in [
            "hr_leave_balances", "hr_leave_requests", "hr_attendance",
            "hr_performance_reviews", "hr_documents", "hr_payroll",
        ]:
            d = delete_where(child, f"employee_id=in.({ids_csv})&tenant_id=eq.{TENANT_UUID}", f"emp-child {child}")
            if d > 0: total_deleted += d
        # Finally the employee
        d = delete_where("hr_employees", f"id=in.({ids_csv})&tenant_id=eq.{TENANT_UUID}", "hr_employees")
        if d > 0: total_deleted += d
        print(f"  email={email}: removed {len(emp_ids)} employee(s) + dependents")
    else:
        # Try matching by personal_email or by name pattern (Playwright as first_name)
        d = delete_where(
            "hr_employees",
            f"first_name=eq.Playwright&tenant_id=eq.{TENANT_UUID}",
            "hr_employees-by-name",
        )
        if d > 0: total_deleted += d

# Leave requests — match by reason
for reason in manifest.get("leave_reasons", []):
    d = delete_where(
        "hr_leave_requests",
        f"reason=eq.{urllib.parse.quote(reason)}&tenant_id=eq.{TENANT_UUID}",
        "hr_leave_requests",
    )
    if d > 0: total_deleted += d

# Job requisitions — match by title
for title in manifest.get("job_titles", []):
    d = delete_where(
        "hr_job_requisitions",
        f"job_title=eq.{urllib.parse.quote(title)}&tenant_id=eq.{TENANT_UUID}",
        "hr_job_requisitions",
    )
    if d > 0: total_deleted += d

# AI Agents — preferred: explicit IDs captured during test
agent_ids = list(set(manifest.get("agent_ids", [])))
if agent_ids:
    ids_csv = ",".join(agent_ids)
    for child in ["hr_ai_agent_tasks", "hr_ai_agent_conversations", "ai_agent_tasks", "ai_agent_conversations"]:
        d = delete_where(child, f"agent_id=in.({ids_csv})", f"agent-child {child}")
        if d > 0: total_deleted += d
    d = delete_where("ai_agents", f"id=in.({ids_csv})&tenant_id=eq.{TENANT_UUID}", "ai_agents-by-id")
    if d > 0: total_deleted += d

# Also delete any agent created since test start that has PLAYWRIGHT in system_prompt
since = manifest.get("test_start_iso")
if since:
    q = f"select=id&tenant_id=eq.{TENANT_UUID}&created_at=gte.{urllib.parse.quote(since)}&system_prompt=ilike.{urllib.parse.quote('%PLAYWRIGHT-TEST%')}"
    status, body = req("GET", f"{SUPA_URL}/rest/v1/ai_agents?{q}")
    if status < 400:
        ids = [r["id"] for r in json.loads(body)]
        if ids:
            ids_csv = ",".join(ids)
            d = delete_where("ai_agents", f"id=in.({ids_csv})&tenant_id=eq.{TENANT_UUID}", "ai_agents-by-prompt")
            if d > 0: total_deleted += d

# Catch-all sweep for any leftover PLAYWRIGHT-TEST rows in commonly affected tables
for tbl, col in [
    ("hr_employees", "first_name"),
    ("hr_leave_requests", "reason"),
    ("hr_job_requisitions", "job_title"),
    ("ai_agents", "agent_name"),
]:
    d = delete_where(
        tbl,
        f"{col}=like.{urllib.parse.quote('%PLAYWRIGHT%')}&tenant_id=eq.{TENANT_UUID}",
        f"sweep {tbl}",
    )
    if d > 0:
        total_deleted += d
        print(f"  sweep removed {d} rows from {tbl}")

# Round 6 — sweep for PW-HIRE-TEST + PWHire patterns (hiring pipeline spec)
for tbl, col in [
    ("hr_employees", "first_name"),
    ("hr_job_requisitions", "job_title"),
    ("hr_candidates", "first_name"),
]:
    d = delete_where(
        tbl,
        f"{col}=like.{urllib.parse.quote('%PW-HIRE-TEST%')}&tenant_id=eq.{TENANT_UUID}",
        f"sweep {tbl}-PW",
    )
    if d > 0:
        total_deleted += d
        print(f"  sweep removed {d} rows from {tbl} (PW-HIRE-TEST)")
# Also sweep PWHireTest candidates (no dash variant we use in spec)
d = delete_where(
    "hr_candidates",
    f"first_name=eq.PWHireTest&tenant_id=eq.{TENANT_UUID}",
    "sweep candidates PWHireTest",
)
if d > 0: total_deleted += d
# And sweep by email patterns
for tbl, col in [("hr_candidates", "email"), ("hr_employees", "company_email")]:
    d = delete_where(
        tbl,
        f"{col}=like.{urllib.parse.quote('%pw-hire-test%')}&tenant_id=eq.{TENANT_UUID}",
        f"sweep {tbl}-email",
    )
    if d > 0:
        total_deleted += d
        print(f"  sweep removed {d} rows from {tbl} (email)")

# Round 6 — sweep any hr_job_requisitions row whose description contains
# PW-HIRE-TEST. Gemini extraction can rewrite the job_title (e.g. our
# "PW-HIRE-TEST Text DevOps" → "DevOps Engineer") so we also check the
# description field which preserves our tag.
d = delete_where(
    "hr_job_requisitions",
    f"job_description=ilike.{urllib.parse.quote('%PW-HIRE-TEST%')}&tenant_id=eq.{TENANT_UUID}",
    "sweep jobs-by-description",
)
if d > 0:
    total_deleted += d
    print(f"  sweep removed {d} rows from hr_job_requisitions (description)")

print(f"\nTotal rows deleted: {total_deleted}")

# Confirm baselines
def count(table: str, where: str = "") -> int:
    extra = f"&{where}" if where else ""
    url = f"{SUPA_URL}/rest/v1/{table}?select=id&tenant_id=eq.{TENANT_UUID}{extra}"
    s, b = req("GET", url)
    if s >= 400: return -1
    return len(json.loads(b))


print("\nBaselines after cleanup:")
print(f"  hr_employees:        {count('hr_employees')}")
print(f"  hr_leave_requests:   {count('hr_leave_requests')}")
print(f"  hr_job_requisitions: {count('hr_job_requisitions')}")
print(f"  ai_agents:        {count('ai_agents')}")
