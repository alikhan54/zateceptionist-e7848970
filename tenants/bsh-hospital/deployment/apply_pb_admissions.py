"""Apply (or verify) the hospital_admissions migration. Additive + idempotent.
Reuses the hospital_gp_seed.py writable-connection pattern: direct 5432 primary
(check default_transaction_read_only=off), else pooler 6543 fallback.
Usage: apply_pb_admissions.py [--verify-only] [path-to-sql]"""
import os, sys, psycopg2
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DIRECT_HOST, DIRECT_PORT, DIRECT_USER = "db.fncfbywkemsxwuiowxxe.supabase.co", 5432, "postgres"
POOLER_HOST, POOLER_PORT, POOLER_USER = "aws-1-ap-southeast-1.pooler.supabase.com", 6543, "postgres.fncfbywkemsxwuiowxxe"

def _pw():
    for ln in open(r"D:\420-system\.env", encoding="utf-8"):
        if ln.startswith("DB_POSTGRESDB_PASSWORD="):
            return ln.split("=", 1)[1].strip()
    raise SystemExit("no DB password")

def get_writable():
    pw = _pw()
    try:
        c = psycopg2.connect(host=DIRECT_HOST, port=DIRECT_PORT, user=DIRECT_USER, password=pw,
                             dbname="postgres", sslmode="require", connect_timeout=15)
        with c.cursor() as cur:
            cur.execute("SHOW default_transaction_read_only")
            if cur.fetchone()[0] == "off":
                print("  [db] writable: direct 5432"); return c
        c.close()
    except Exception as e:
        print(f"  [db] direct 5432 unavailable ({type(e).__name__})")
    c = psycopg2.connect(host=POOLER_HOST, port=POOLER_PORT, user=POOLER_USER, password=pw,
                         dbname="postgres", sslmode="require", connect_timeout=15)
    with c.cursor() as cur:
        cur.execute("SHOW default_transaction_read_only")
        assert cur.fetchone()[0] == "off", "pooler 6543 read-only — abort (retry later)"
    print("  [db] writable: pooler 6543"); return c

verify_only = "--verify-only" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
sql_path = args[0] if args else r"D:\420-system\frontend\tenants\bsh-hospital\deployment\hospital_pb_admissions.sql"

conn = get_writable()
conn.rollback()  # end the implicit txn from the writable-check SHOW
conn.autocommit = True
with conn.cursor() as cur:
    if not verify_only:
        with open(sql_path, encoding="utf-8") as f:
            cur.execute(f.read())
        print(f"  [apply] executed {os.path.basename(sql_path)}")
    # verify
    cur.execute("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='hospital_admissions'")
    ncols = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='hospital_admissions'")
    npol = cur.fetchone()[0]
    cur.execute("SELECT relrowsecurity FROM pg_class WHERE oid='public.hospital_admissions'::regclass")
    rls = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM public.hospital_admissions")
    nrows = cur.fetchone()[0]
    print(f"  [verify] hospital_admissions: cols={ncols} policies={npol} rls_enabled={rls} rows={nrows}")
conn.close()
print("  [done]")
