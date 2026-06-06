#!/usr/bin/env python3
"""
BSH Hospital (420-native HOSPITAL vertical) — Phase 1 provisioning (tenant_config + owner login).

Hospital vertical P1. Provisions a NEW tenant `bsh-hospital` (industry `hospital`) — DISTINCT
from the live Bahmni-integration tenant `bsh-demo` (industry `healthcare_hospital`), which is
left untouched. This is the native-tables hospital demo tenant.

CLONED VERBATIM from the proven flow (provision-legacy-jewellers.py, itself cloned from the
Smart Ledger Day-4 auth flow): read_env_key, gen_password, preflight (T20), admin_api_request,
auth_create_user, relink_user_to_tenant, cleanup_orphans_for_auth, the 8 V-gates, and the
combined-run BIND-window guarantee (createUser < 300s after the tenant_config INSERT -> the live
handle_new_user() BIND path fires -> owner linked directly, NO phantom). Only the tenant constants
+ output paths changed.

--dry-run makes ZERO writes (read-only conn): preconditions + plan + gate predictions. Safe to
repeat. --commit executes (tenant_config INSERT on writable 5432 + createUser), with per-failure
auto-rollback (never leaves a half-provisioned tenant).

Usage:
    python provision-bsh-hospital.py --dry-run     # no writes; preview + predictions
    python provision-bsh-hospital.py --commit      # execute
    python provision-bsh-hospital.py --commit --control-tenant cosmique

Outputs:
    - REDACTED result JSON (committable):  <this dir>/provision-result.json
    - SECRET credentials (gitignored, OUTSIDE repo):
        D:/420-system/tenants/bsh-hospital/.credentials/bsh-hospital-credentials.txt
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import socket
import string
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

import psycopg2

# ---------------- Tenant config (BSH Hospital — native `hospital` vertical) ----------------
TENANT_SLUG       = "bsh-hospital"
COMPANY_NAME      = "Bangladesh Specialized Hospital (Native)"
INDUSTRY          = "hospital"            # NEW native vertical (distinct from healthcare_hospital/Bahmni)
CURRENCY          = "BDT"
TIMEZONE          = "Asia/Dhaka"
COUNTRY           = "BD"
CITY              = "Dhaka"
PRIMARY_LANGUAGE  = "en"
SUBSCRIPTION_STATUS = "active"
SUBSCRIPTION_TIER = "free"
# Branding = PLACEHOLDER (cosmetic; medical teal/navy; easily UPDATEd later)
PRIMARY_COLOR     = "#0E7C7B"
SECONDARY_COLOR   = "#14213D"
# features: enable the horizontal modules. No hospital vertical flag (gating is industry-based;
# vertical UI is P4). Additive/minimal.
FEATURES_JSON     = '{"hr": true, "sales": true, "voice": true, "marketing": true}'

OWNER = {"email": "bsh-hospital@zatesystems.com", "role": "admin",
         "display_name": "BSH Hospital"}

LOGIN_URL = "https://ai.zatesystems.com"

# ---------------- Infra (per CLAUDE.md §18 + the proven flow) ----------------
SUPABASE_URL  = "https://fncfbywkemsxwuiowxxe.supabase.co"
ENV_PATH      = r"D:\420-system\.env"
POOLER_HOST   = "aws-1-ap-southeast-1.pooler.supabase.com"
POOLER_PORT   = 6543
POOLER_USER   = "postgres.fncfbywkemsxwuiowxxe"
POOLER_DBNAME = "postgres"
# Direct primary (writable) — proven path for DDL/DML from the Windows host. Used for WRITES to
# avoid T18: pooler 6543 can route to a read replica (default_transaction_read_only=on).
DIRECT_HOST   = "db.fncfbywkemsxwuiowxxe.supabase.co"
DIRECT_PORT   = 5432
DIRECT_USER   = "postgres"

THIS_DIR    = Path(__file__).resolve().parent
RESULT_FILE = THIS_DIR / "provision-result.json"                 # REDACTED, committable
CREDS_DIR   = Path(r"D:\420-system\tenants\bsh-hospital\.credentials")   # OUTSIDE repo
CREDS_FILE  = CREDS_DIR / "bsh-hospital-credentials.txt"

PHANTOM_LIKE = "%-%"   # legacy-path phantom slug would be '<localpart>-<first8 of auth uuid>'


# ---------------- Helpers (cloned verbatim) ----------------
def read_env_key(name: str) -> str:
    if not os.path.exists(ENV_PATH):
        return ""
    with open(ENV_PATH, "rb") as f:
        text = f.read().decode("utf-8", errors="replace")
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip("'\"")
    return ""


def gen_password(n: int = 16) -> str:
    upper, lower, digit, symbol = string.ascii_uppercase, string.ascii_lowercase, string.digits, "!@#$%^&*?_-"
    pools = [upper, lower, digit, symbol]
    pwd = [secrets.choice(p) for p in pools]
    pool = upper + lower + digit + symbol
    pwd += [secrets.choice(pool) for _ in range(n - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


def health_probe(key: str) -> dict:
    url = SUPABASE_URL + f"/rest/v1/tenant_config?tenant_id=eq.{TENANT_SLUG}&select=tenant_id"
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"})
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return {"status": resp.getcode(), "latency_s": time.monotonic() - started, "ok": True}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "latency_s": time.monotonic() - started, "ok": False, "error": f"http_{e.code}"}
    except (urllib.error.URLError, socket.timeout, TimeoutError) as e:
        return {"status": 0, "latency_s": time.monotonic() - started, "ok": False, "error": f"{type(e).__name__}"}


def preflight(key: str, threshold_s: float = 2.5) -> bool:
    print(f"Pre-flight (T20): 3 Supabase REST probes, all must be HTTP 200 < {threshold_s}s")
    ok = 0
    for i in range(3):
        r = health_probe(key)
        print(f"  probe {i+1}: http={r.get('status')} latency={r['latency_s']:.3f}s ok={r['ok']}")
        if r["ok"] and r["status"] == 200 and r["latency_s"] < threshold_s:
            ok += 1
        time.sleep(1)
    return ok == 3


def db_connect(db_pass: str, readonly: bool):
    conn = psycopg2.connect(host=POOLER_HOST, port=POOLER_PORT, user=POOLER_USER,
                            password=db_pass, dbname=POOLER_DBNAME, sslmode="require", connect_timeout=10)
    if readonly:
        conn.set_session(readonly=True, autocommit=True)
    return conn


def db_connect_writable(db_pass: str):
    """Return a WRITABLE connection. Prefer direct 5432 (primary). Fall back to pooler 6543 with
    a read-only-replica retry loop (T18 self-heals 1-5 min)."""
    try:
        conn = psycopg2.connect(host=DIRECT_HOST, port=DIRECT_PORT, user=DIRECT_USER,
                                password=db_pass, dbname=POOLER_DBNAME, sslmode="require", connect_timeout=15)
        with conn.cursor() as cur:
            cur.execute("SHOW transaction_read_only")
            ro = cur.fetchone()[0]
        conn.rollback()
        if ro == "off":
            print("  [db] writable connection: direct 5432 (primary)")
            return conn
        conn.close()
        print("  [db] direct 5432 unexpectedly read-only; trying pooler 6543")
    except Exception as e:
        print(f"  [db] direct 5432 unavailable ({type(e).__name__}); falling back to pooler 6543")
    for attempt in range(1, 7):
        try:
            conn = psycopg2.connect(host=POOLER_HOST, port=POOLER_PORT, user=POOLER_USER,
                                    password=db_pass, dbname=POOLER_DBNAME, sslmode="require", connect_timeout=15)
            with conn.cursor() as cur:
                cur.execute("SHOW transaction_read_only")
                ro = cur.fetchone()[0]
            conn.rollback()
            if ro == "off":
                print(f"  [db] writable connection: pooler 6543 (attempt {attempt})")
                return conn
            conn.close()
            print(f"  [db] pooler 6543 read-only (attempt {attempt}/6); waiting 20s for T18 self-heal...")
            time.sleep(20)
        except Exception as e:
            print(f"  [db] pooler 6543 attempt {attempt}/6 error: {type(e).__name__}; retrying in 20s")
            time.sleep(20)
    raise RuntimeError("No writable DB connection (direct 5432 failed AND pooler 6543 stuck read-only).")


def admin_api_request(path: str, method: str, key: str, body: dict | None = None):
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"error": e.reason}


def auth_lookup_user(key: str, email: str):
    s, b = admin_api_request("/auth/v1/admin/users?per_page=200", "GET", key)
    if s == 200 and isinstance(b, dict):
        for u in b.get("users", []):
            if (u.get("email") or "").lower() == email.lower():
                return u
    return None


def auth_create_user(key: str, email: str, password: str, display_name: str):
    """Returns (success, auth_id, status_msg)."""
    status, body = admin_api_request("/auth/v1/admin/users", "POST", key, {
        "email": email, "password": password, "email_confirm": True,
        "user_metadata": {"display_name": display_name, "tenant_id": TENANT_SLUG}})
    if status in (200, 201):
        return True, body["id"], "created"
    if status == 422 and "already" in str(body).lower():
        u = auth_lookup_user(key, email)
        if u:
            return True, u["id"], "linked-existing"
        return False, None, f"exists-but-cannot-locate: {body}"
    return False, None, f"http {status}: {body}"


def auth_delete_user(key: str, auth_id: str) -> None:
    admin_api_request(f"/auth/v1/admin/users/{auth_id}", "DELETE", key)


def relink_user_to_tenant(conn, auth_id: str, email: str, full_name: str, role: str):
    """Repoint trigger-created rows to the slug. Returns (users_id, phantom_tenant)."""
    with conn.cursor() as cur:
        cur.execute("SELECT id, tenant_id FROM public.users WHERE auth_id = %s", (auth_id,))
        row = cur.fetchone()
        if not row:
            raise RuntimeError(f"trigger did not create public.users row for auth_id={auth_id}")
        users_id, phantom_tenant = str(row[0]), row[1]
        cur.execute("""UPDATE public.users
                       SET tenant_id=%s, full_name=%s, email=%s, role=%s, is_active=%s, updated_at=NOW()
                       WHERE id=%s""", (TENANT_SLUG, full_name, email, role, True, users_id))
        cur.execute("UPDATE public.user_roles SET tenant_id=%s, role=%s WHERE user_id=%s",
                    (TENANT_SLUG, role, users_id))
        if phantom_tenant and phantom_tenant != TENANT_SLUG:
            cur.execute("DELETE FROM public.tenant_config WHERE tenant_id=%s", (phantom_tenant,))
    conn.commit()
    return users_id, phantom_tenant


def cleanup_orphans_for_auth(conn, auth_id: str) -> None:
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, tenant_id FROM public.users WHERE auth_id=%s", (auth_id,))
            row = cur.fetchone()
            if not row:
                return
            users_id, phantom_tenant = row[0], row[1]
            cur.execute("DELETE FROM public.user_roles WHERE user_id=%s", (users_id,))
            cur.execute("DELETE FROM public.users WHERE id=%s", (users_id,))
            if phantom_tenant and phantom_tenant != TENANT_SLUG:
                cur.execute("DELETE FROM public.tenant_config WHERE tenant_id=%s", (phantom_tenant,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"  [cleanup warn] {e}", flush=True)


# ---------------- tenant_config INSERT (cloned) ----------------
TENANT_CONFIG_INSERT = """
INSERT INTO tenant_config (
  id, tenant_id, company_name, industry, subscription_status, subscription_tier,
  country, city, timezone, currency, primary_language, ai_agent_mode, audit_enabled,
  engagement_responder_enabled, features, primary_color, secondary_color,
  onboarding_completed, created_at, updated_at)
VALUES (
  gen_random_uuid(), %s, %s, %s, %s, %s,
  %s, %s, %s, %s, %s, 'standard', false,
  false, %s::jsonb, %s, %s,
  false, now(), now())
RETURNING id, tenant_id, created_at;
"""
TENANT_CONFIG_ARGS = (TENANT_SLUG, COMPANY_NAME, INDUSTRY, SUBSCRIPTION_STATUS, SUBSCRIPTION_TIER,
                      COUNTRY, CITY, TIMEZONE, CURRENCY, PRIMARY_LANGUAGE,
                      FEATURES_JSON, PRIMARY_COLOR, SECONDARY_COLOR)


def insert_tenant_config(conn) -> str:
    with conn.cursor() as cur:
        cur.execute(TENANT_CONFIG_INSERT, TENANT_CONFIG_ARGS)
        new_id = str(cur.fetchone()[0])
    conn.commit()
    return new_id


def delete_tenant_config(conn, slug: str) -> None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM public.tenant_config WHERE tenant_id=%s", (slug,))
    conn.commit()


# ---------------- snapshots / checks ----------------
def control_row_hash(conn, control_slug: str):
    with conn.cursor() as cur:
        cur.execute("SELECT row_to_json(tc)::text FROM public.tenant_config tc WHERE tenant_id=%s", (control_slug,))
        r = cur.fetchone()
        if not r:
            return None, None
        txt = r[0]
        return hashlib.md5(txt.encode()).hexdigest(), txt


def snapshot(conn, control_slug: str) -> dict:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM public.tenant_config")
        tc_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.users WHERE tenant_id<>%s", (TENANT_SLUG,))
        other_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.tenant_config WHERE tenant_id=%s", (TENANT_SLUG,))
        slug_exists = cur.fetchone()[0]
    ch_md5, _ = control_row_hash(conn, control_slug)
    return {"tenant_config_count": tc_count, "other_tenant_users": other_users,
            "slug_rows": slug_exists, "control_md5": ch_md5}


def preconditions(conn, key: str, control_slug: str) -> list[str]:
    problems = []
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM public.tenant_config WHERE tenant_id=%s", (TENANT_SLUG,))
        if cur.fetchone()[0] != 0:
            problems.append(f"slug '{TENANT_SLUG}' already exists in tenant_config")
        cur.execute("SELECT COUNT(*) FROM public.users WHERE email=%s", (OWNER["email"],))
        if cur.fetchone()[0] != 0:
            problems.append(f"public.users already has email {OWNER['email']}")
    if auth_lookup_user(key, OWNER["email"]):
        problems.append(f"auth.users already has {OWNER['email']} (would link-existing, not create)")
    ch_md5, _ = control_row_hash(conn, control_slug)
    if ch_md5 is None:
        problems.append(f"control tenant '{control_slug}' not found")
    return problems


def verify(conn, key: str, pre: dict, control_slug: str, new_uuid: str) -> dict:
    out: dict = {}
    with conn.cursor() as cur:
        u = auth_lookup_user(key, OWNER["email"])
        out["V1_auth_user_present"] = "PASS" if u else "FAIL"
        auth_id = u["id"] if u else None
        cur.execute("SELECT id, tenant_id, role, auth_id FROM public.users WHERE email=%s", (OWNER["email"],))
        pu = cur.fetchone()
        out["V2_public_users_slug"] = "PASS" if (pu and pu[1] == TENANT_SLUG) else f"FAIL ({pu})"
        if pu:
            cur.execute("SELECT tenant_id, role FROM public.user_roles WHERE user_id=%s", (pu[0],))
            ur = cur.fetchone()
            out["V3_user_roles_slug"] = "PASS" if (ur and ur[0] == TENANT_SLUG) else f"FAIL ({ur})"
        else:
            out["V3_user_roles_slug"] = "FAIL (no users row)"
        out["V4_fk_integrity"] = "PASS" if (pu and auth_id and str(pu[3]) == str(auth_id)) else "FAIL"
        cur.execute("SELECT COUNT(*) FROM public.tenant_config")
        post_tc = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.tenant_config WHERE tenant_id LIKE %s AND tenant_id <> %s", (PHANTOM_LIKE, TENANT_SLUG))
        phantom_ct_candidates = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.tenant_config WHERE id=%s", (new_uuid,))
        slug_present = cur.fetchone()[0]
        # phantom check is specific: a phantom would be a NEW row (post == pre+2 then -1). We assert
        # net +1 and the intended uuid present; explicit phantom-by-localpart is checked in relink.
        if post_tc == pre["tenant_config_count"] + 1 and slug_present == 1:
            out["V5_no_phantom_count_ok"] = f"PASS (tc pre={pre['tenant_config_count']} post={post_tc}; intended uuid present)"
        else:
            out["V5_no_phantom_count_ok"] = f"FAIL (tc pre={pre['tenant_config_count']} post={post_tc}; slug_present={slug_present})"
        cur.execute("SELECT COUNT(*) FROM public.users WHERE tenant_id<>%s", (TENANT_SLUG,))
        post_other = cur.fetchone()[0]
        post_ctrl_md5, _ = control_row_hash(conn, control_slug)
        iso_users = (post_other == pre["other_tenant_users"])
        iso_ctrl = (post_ctrl_md5 == pre["control_md5"])
        out["V6_isolation"] = ("PASS" if (iso_users and iso_ctrl)
                               else f"FAIL (users pre={pre['other_tenant_users']} post={post_other}; "
                                    f"control_md5 {'same' if iso_ctrl else 'CHANGED'})")
        cur.execute("""SELECT industry, currency, timezone, company_name, country, subscription_status
                       FROM public.tenant_config WHERE id=%s""", (new_uuid,))
        f = cur.fetchone()
        ok7 = f and f[0] == INDUSTRY and f[1] == CURRENCY and f[2] == TIMEZONE and f[3] == COMPANY_NAME
        out["V7_tenant_fields"] = "PASS" if ok7 else f"FAIL ({f})"
        out["V8_role_admin"] = "PASS" if (pu and pu[2] == OWNER["role"]) else f"FAIL ({pu[2] if pu else None})"
    return out


def write_credentials(record: dict) -> None:
    CREDS_DIR.mkdir(parents=True, exist_ok=True)
    new = not CREDS_FILE.exists()
    with CREDS_FILE.open("a", encoding="utf-8") as fh:
        if new:
            fh.write(f"# BSH Hospital (native) credentials — provisioned {datetime.now(timezone.utc).isoformat()}\n")
            fh.write(f"# Tenant slug: {TENANT_SLUG}\n# DO NOT COMMIT THIS FILE.\n")
            fh.write("# Reset on first login.\n\n")
        fh.write(f"{record['timestamp']} | tenant={TENANT_SLUG} | uuid={record['tenant_uuid']} | "
                 f"email={record['email']} | role={record['role']} | auth_id={record['auth_id']} | "
                 f"users_id={record['users_id']} | password={record['password']} | "
                 f"login_url={LOGIN_URL} | trigger_path={record['trigger_path']}\n")


# ---------------- main ----------------
def main():
    ap = argparse.ArgumentParser(description="Provision bsh-hospital tenant + owner login (Hospital vertical P1)")
    ap.add_argument("--commit", action="store_true", help="Execute (writes tenant_config + auth user)")
    ap.add_argument("--dry-run", action="store_true", help="ZERO writes: preconditions + plan + gate predictions")
    ap.add_argument("--control-tenant", default="cosmique", help="Isolation control tenant slug")
    ap.add_argument("--skip-preflight", action="store_true", help="DANGEROUS: skip T20 probes")
    args = ap.parse_args()

    if not args.commit and not args.dry_run:
        print("Either --commit or --dry-run required.", file=sys.stderr); return 2

    key = read_env_key("SUPABASE_SERVICE_KEY")
    db_pass = read_env_key("DB_POSTGRESDB_PASSWORD")
    if not key:
        print("FATAL: SUPABASE_SERVICE_KEY missing from .env", file=sys.stderr); return 2
    if not db_pass:
        print("FATAL: DB_POSTGRESDB_PASSWORD missing from .env", file=sys.stderr); return 2

    if not args.skip_preflight and not preflight(key):
        print("PRE-FLIGHT FAILED — refusing to proceed (T20 Scenario D).", file=sys.stderr); return 3

    mode = "commit" if args.commit else "dry-run"
    print(f"\n{'='*72}\nBSH Hospital (native) provisioning — MODE={mode.upper()}\n{'='*72}")
    print(f"  slug={TENANT_SLUG}  industry={INDUSTRY}  currency={CURRENCY}  tz={TIMEZONE}  country={COUNTRY}")
    print(f"  company={COMPANY_NAME!r}  owner={OWNER['email']} ({OWNER['role']})  login_url={LOGIN_URL}")
    print(f"  control_tenant={args.control_tenant}")

    if args.dry_run:
        conn = db_connect(db_pass, readonly=True)
        try:
            pre = snapshot(conn, args.control_tenant)
            problems = preconditions(conn, key, args.control_tenant)
        finally:
            conn.close()
        print(f"\nPre-snapshot: {json.dumps(pre)}")
        print("\nPRECONDITIONS:")
        if problems:
            for p in problems:
                print(f"  X {p}")
            print("\nDRY-RUN result: BLOCKED — fix preconditions before --commit.")
            return 1
        print("  OK slug not taken; owner email not in auth/public.users; control tenant present.")
        print("\nPLANNED ACTIONS (no writes performed):")
        print(f"  1. INSERT tenant_config (slug={TENANT_SLUG}, industry={INDUSTRY}, currency={CURRENCY}, "
              f"tz={TIMEZONE}, company={COMPANY_NAME!r}) RETURNING id; COMMIT.")
        print(f"  2. POST /auth/v1/admin/users {{email={OWNER['email']}, email_confirm=true, "
              f"user_metadata.tenant_id={TENANT_SLUG}}} (within 300s of step 1).")
        print(f"  3. Trigger PREDICTION: handle_new_user BIND path -> users + user_roles linked to "
              f"'{TENANT_SLUG}' as admin; NO phantom.")
        print(f"  4. relink_user_to_tenant: UPDATE users/user_roles -> '{TENANT_SLUG}' (idempotent); "
              f"DELETE phantom only if phantom != '{TENANT_SLUG}' (predicted: skipped, BIND path).")
        print("\nGATE PREDICTIONS (expected after --commit):")
        for g in ["V1_auth_user_present", "V2_public_users_slug", "V3_user_roles_slug", "V4_fk_integrity",
                  f"V5_no_phantom_count_ok (tc {pre['tenant_config_count']}->{pre['tenant_config_count']+1})",
                  f"V6_isolation (other-users {pre['other_tenant_users']} unchanged, control {args.control_tenant} md5 unchanged)",
                  "V7_tenant_fields", "V8_role_admin"]:
            print(f"  - {g}: PASS (predicted)")
        print("\nDRY-RUN complete. ZERO writes made. Re-run with --commit to execute.")
        return 0

    conn = db_connect_writable(db_pass)
    record = {"timestamp": datetime.now(timezone.utc).isoformat(), "email": OWNER["email"],
              "role": OWNER["role"], "tenant_uuid": "", "auth_id": "", "users_id": "",
              "password": "", "trigger_path": "", "error": None}
    verifs: dict = {}
    new_uuid = None
    pre = None
    try:
        pre = snapshot(conn, args.control_tenant)
        print(f"\nPre-snapshot: {json.dumps(pre)}")
        problems = preconditions(conn, key, args.control_tenant)
        if problems:
            for p in problems:
                print(f"  X precondition: {p}")
            print("ABORT — preconditions not met. No writes made.")
            return 1

        new_uuid = insert_tenant_config(conn)
        record["tenant_uuid"] = new_uuid
        t0 = time.monotonic()
        print(f"  [db] INSERTed tenant_config id={new_uuid}  (BIND window open, 300s)")

        password = gen_password(16)
        ok, auth_id, status_msg = auth_create_user(key, OWNER["email"], password, OWNER["display_name"])
        elapsed = time.monotonic() - t0
        if not ok:
            record["error"] = f"auth: {status_msg}"
            print(f"  [auth] FAIL: {status_msg} — rolling back tenant_config")
            delete_tenant_config(conn, TENANT_SLUG)
            return 1
        record["auth_id"] = auth_id
        record["password"] = password
        print(f"  [auth] {status_msg}: {auth_id} (createUser fired {elapsed:.1f}s after INSERT — BIND window {'OK' if elapsed < 300 else 'MISSED'})")

        try:
            users_id, phantom_tenant = relink_user_to_tenant(conn, auth_id, OWNER["email"], OWNER["display_name"], OWNER["role"])
            record["users_id"] = users_id
            record["trigger_path"] = "BIND (no phantom)" if phantom_tenant == TENANT_SLUG else f"LEGACY (phantom '{phantom_tenant}' deleted)"
            print(f"  [db] users.id={users_id}  trigger_path={record['trigger_path']}")
        except Exception as e:
            record["error"] = f"db: {type(e).__name__}: {e}"
            print(f"  [db] FAIL: {e} — rolling back (delete auth user + tenant_config + orphans)")
            if status_msg == "created":
                cleanup_orphans_for_auth(conn, auth_id)
                auth_delete_user(key, auth_id)
            delete_tenant_config(conn, TENANT_SLUG)
            return 1

        print(f"\n{'='*72}\nVERIFICATIONS\n{'='*72}")
        verifs = verify(conn, key, pre, args.control_tenant, new_uuid)
        for k, v in verifs.items():
            print(f"  {k}: {v}")

        if any(str(v).startswith("FAIL") for v in verifs.values()):
            print("\nX A GATE FAILED — ROLLING BACK (delete auth user + tenant_config + orphans).")
            cleanup_orphans_for_auth(conn, auth_id)
            auth_delete_user(key, auth_id)
            delete_tenant_config(conn, TENANT_SLUG)
            record["error"] = "gate_failure_rolled_back"
            print("Rollback complete. No tenant left half-provisioned.")
            return 1

        write_credentials(record)
        print(f"\nOK Credentials written (gitignored): {CREDS_FILE}")

    finally:
        conn.close()
        redacted = dict(record); redacted["password"] = "REDACTED"
        with RESULT_FILE.open("w", encoding="utf-8") as fh:
            json.dump({"timestamp_utc": datetime.now(timezone.utc).isoformat(),
                       "tenant_id": TENANT_SLUG, "mode": mode, "record": redacted,
                       "verifications": verifs, "pre_snapshot": pre}, fh, indent=2, default=str)
        print(f"Result JSON (REDACTED, committable): {RESULT_FILE}")

    print("\n" + "#" * 72)
    print("# OPERATOR HANDOVER — deliver to the client (once), then it resets on first login")
    print("#" * 72)
    print(f"  Login URL : {LOGIN_URL}")
    print(f"  Email     : {record['email']}")
    print(f"  Password  : {record['password']}")
    print(f"  Tenant    : {COMPANY_NAME} (slug {TENANT_SLUG}, uuid {record['tenant_uuid']})")
    print(f"  Note      : Reset on first login (Settings -> Security).")
    print("#" * 72)
    return 0


if __name__ == "__main__":
    sys.exit(main())
