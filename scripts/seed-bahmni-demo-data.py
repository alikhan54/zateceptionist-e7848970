#!/usr/bin/env python3
"""BSH-HMS Phase 2G — Bahmni demo data seeder (industry-gated, idempotent).

Reads JSON fixtures from scripts/bsh-demo-data/, POSTs to Bahmni REST,
tracks progress in seed_progress.json (resumable).

Usage:
    SUPABASE_SERVICE_KEY=... BAHMNI_URL=... BAHMNI_USER=... BAHMNI_PASS=... \\
        python scripts/seed-bahmni-demo-data.py --tenant bsh-demo --dir scripts/bsh-demo-data

Refuses to seed if tenant_config.industry != 'healthcare_hospital'.
"""
import argparse, base64, json, os, sys, time
from pathlib import Path
import httpx

HOSPITAL = "healthcare_hospital"
SUPABASE = os.getenv("SUPABASE_URL", "https://fncfbywkemsxwuiowxxe.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def get_tenant_industry(tenant_id: str) -> str:
    r = httpx.get(f"{SUPABASE}/rest/v1/tenant_config",
                   headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                   params={"tenant_id": f"eq.{tenant_id}", "select": "industry,bahmni_base_url"},
                   timeout=10.0)
    return (r.json()[0] if r.json() else {}).get("industry", "unknown") if r.status_code == 200 else "error"


def auth_header():
    user = os.getenv("BAHMNI_USER", "admin")
    pwd = os.getenv("BAHMNI_PASS", "Admin123")
    return {"Authorization": "Basic " + base64.b64encode(f"{user}:{pwd}".encode()).decode()}


def post(bahmni_url, path, body):
    return httpx.post(f"{bahmni_url.rstrip('/')}{path}",
                       headers={**auth_header(), "Content-Type": "application/json", "Accept": "application/json"},
                       json=body, timeout=30.0)


def seed(tenant_id, data_dir, progress_path):
    industry = get_tenant_industry(tenant_id)
    if industry != HOSPITAL:
        print(f"REFUSING: tenant {tenant_id} has industry={industry}, expected {HOSPITAL}", file=sys.stderr)
        sys.exit(2)

    bahmni_url = os.getenv("BAHMNI_URL", "http://localhost:8080")
    print(f"Bahmni base URL: {bahmni_url}")

    progress = json.loads(Path(progress_path).read_text()) if Path(progress_path).exists() else {}
    fixtures = [
        ("doctors", "/openmrs/ws/rest/v1/provider"),
        ("patients", "/openmrs/ws/rest/v1/patient"),
        ("appointments", "/openmrs/ws/rest/v1/appointment"),
        ("lab_orders", "/openmrs/ws/rest/v1/order"),
        ("corporate_clients", "/odoo-bridge/partner"),
        ("packages", "/openmrs/ws/rest/v1/package"),
        ("bed_assignments", "/openmrs/ws/rest/v1/bedmanagement/admit"),
    ]
    for name, path in fixtures:
        fixture_file = Path(data_dir) / f"{name}.json"
        if not fixture_file.exists():
            print(f"  SKIP {name} (no fixture file)")
            continue
        rows = json.loads(fixture_file.read_text())
        already_done = set(progress.get(name, []))
        for i, row in enumerate(rows):
            row_id = row.get("uuid") or row.get("id") or f"{name}-{i}"
            if row_id in already_done:
                continue
            r = post(bahmni_url, path, row)
            if r.status_code in (200, 201):
                already_done.add(row_id)
                print(f"  OK  {name}[{i}] → {r.json().get('uuid','?')}")
            else:
                print(f"  ERR {name}[{i}] → {r.status_code} {r.text[:120]}")
        progress[name] = list(already_done)
        Path(progress_path).write_text(json.dumps(progress, indent=2))

    print("Done.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant", required=True)
    ap.add_argument("--dir", default="scripts/bsh-demo-data")
    ap.add_argument("--progress", default="scripts/bsh-demo-data/seed_progress.json")
    args = ap.parse_args()
    seed(args.tenant, args.dir, args.progress)
