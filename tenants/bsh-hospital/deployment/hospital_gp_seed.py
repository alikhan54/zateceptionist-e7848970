#!/usr/bin/env python3
"""
Hospital vertical P5 — golden cardio-patient seed + HR departments/staff (bsh-hospital ONLY).

Additive, tenant-scoped, IDEMPOTENT, fully TEARDOWNABLE. Direct 5432 (6543 may be read-only).
Builds on P4's enabler (golden patient Aisha Rahman + her flagged-vitals visit + the 5 base
departments). Does NOT touch the brain, n8n, the FE, or any other tenant.

  python hospital_gp_seed.py --seed       # idempotent: re-run = same state, no dupes
  python hospital_gp_seed.py --verify      # counts + the walk surfaces + isolation snapshot
  python hospital_gp_seed.py --teardown    # removes EXACTLY the P5 seed, leaves P4 baseline + schema

What --seed adds (all tenant-scoped to bsh-hospital):
  - clinic_consultations: one cardio consult for Aisha (chief complaint + note), tagged [gp-seed]
  - hospital_orders: the 7-item cardio order set (imaging/lab/medication), tagged details.seed='gp-cardio'
  - hospital_departments: the full set (+6 beyond P4's 5), idempotent on UNIQUE(tenant_id,name)
  - hr_employees: ~14 staff (BSH-* employee_ids) incl. the 5 key roles — DATA ONLY (no auth logins)

Teardown removes: the tagged orders, the tagged consult, BSH-* staff, and the 6 P5-added
departments — leaving Aisha + her visit + the 5 P4 departments + tenant + schema intact.
"""
from __future__ import annotations
import argparse, hashlib, json, sys, time
import psycopg2
from psycopg2.extras import Json

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ENV = r"D:\420-system\.env"
SLUG = "bsh-hospital"
TENANT_UUID = "58b1e299-d7f2-4db7-b24f-3cd2fb5322a6"   # hr_employees.tenant_id is UUID
DIRECT_HOST, DIRECT_PORT, DIRECT_USER = "db.fncfbywkemsxwuiowxxe.supabase.co", 5432, "postgres"
POOLER_HOST, POOLER_PORT, POOLER_USER = "aws-1-ap-southeast-1.pooler.supabase.com", 6543, "postgres.fncfbywkemsxwuiowxxe"

DEPTS_P4 = [("Cardiology", "clinical"), ("Internal Medicine", "clinical"), ("Pharmacy", "pharmacy"),
            ("Laboratory", "lab"), ("Radiology", "radiology")]
DEPTS_P5_EXTRA = [("Emergency", "clinical"), ("Intensive Care Unit", "clinical"), ("Cardiac Surgery", "clinical"),
                  ("Outpatient Clinic", "clinical"), ("Nursing", "admin"), ("Administration", "admin")]
P5_EXTRA_NAMES = [d[0] for d in DEPTS_P5_EXTRA]

# (item, order_type, dept_name, status, note)
ORDER_SET = [
    ("ECG (12-lead)",        "imaging",    "Radiology",  "resulted",  "ST depression V4-V6"),
    ("Echocardiogram",       "imaging",    "Radiology",  "routed",    "Assess LV function / wall motion"),
    ("Chest X-ray (PA)",     "imaging",    "Radiology",  "routed",    "Rule out pulmonary oedema"),
    ("Troponin I",           "lab",        "Laboratory", "resulted",  "0.9 ng/mL - ELEVATED"),
    ("CK-MB",                "lab",        "Laboratory", "routed",    "Serial cardiac enzymes"),
    ("Aspirin 300mg (STAT)", "medication", "Pharmacy",   "dispensed", "Loading dose given"),
    ("GTN 0.5mg SL PRN",     "medication", "Pharmacy",   "routed",    "For chest pain"),
]

# (employee_id, first, last, position, department, job_title)
STAFF = [
    ("BSH-001", "Imran",    "Hossain",  "Cardiologist",        "Cardiology",        "Consultant Cardiologist"),
    ("BSH-002", "Farzana",  "Akter",    "Registered Nurse",    "Cardiology",        "Senior Cardiac Nurse"),
    ("BSH-003", "Rafiq",    "Uddin",    "Pharmacist",          "Pharmacy",          "Chief Pharmacist"),
    ("BSH-004", "Nasrin",   "Sultana",  "Lab Technician",      "Laboratory",        "Senior Lab Technologist"),
    ("BSH-005", "Kamal",    "Ahmed",    "Administrator",       "Administration",    "Hospital Administrator"),
    ("BSH-006", "Shahidul", "Islam",    "Physician",           "Internal Medicine", "Consultant Physician"),
    ("BSH-007", "Tahmina",  "Begum",    "Radiologist",         "Radiology",         "Consultant Radiologist"),
    ("BSH-008", "Jahid",    "Hasan",    "Radiographer",        "Radiology",         "Senior Radiographer"),
    ("BSH-009", "Mohammad", "Ali",      "Emergency Physician", "Emergency",         "ER Consultant"),
    ("BSH-010", "Rumana",   "Khatun",   "Registered Nurse",    "Emergency",         "ER Charge Nurse"),
    ("BSH-011", "Sabbir",   "Rahman",   "Pharmacy Technician", "Pharmacy",          "Pharmacy Technician"),
    ("BSH-012", "Ayesha",   "Siddiqua", "Pathologist",         "Laboratory",        "Consultant Pathologist"),
    ("BSH-013", "Nazmul",   "Huda",     "Cardiac Surgeon",     "Cardiac Surgery",   "Consultant Cardiac Surgeon"),
    ("BSH-014", "Sharmin",  "Akhter",   "Head Nurse",          "Nursing",           "Director of Nursing"),
]
KEY_ROLES = ["Cardiologist", "Registered Nurse", "Pharmacist", "Lab Technician", "Administrator"]

CONSULT = dict(
    practitioner_name="Dr. Imran Hossain",
    chief_complaint="Chest pain on exertion",
    history_of_present=("58-year-old female with central chest pain on exertion for 3 days, radiating to the "
                        "left arm, associated with shortness of breath and diaphoresis. Known hypertension. "
                        "Penicillin allergy."),
    examination_findings=("Tachycardic (HR 112), hypertensive (BP 158/96), SpO2 89% on room air, RR 18, afebrile. "
                          "Mild respiratory distress; heart sounds normal, no murmurs; chest clear."),
    diagnosis="Acute coronary syndrome - rule out NSTEMI",
    treatment_plan={"immediate": ["12-lead ECG", "Troponin + CK-MB", "Aspirin 300mg STAT", "GTN PRN",
                                  "Supplemental oxygen", "Cardiology / CCU admission"],
                    "monitoring": "Continuous cardiac monitoring", "disposition": "Admit to Cardiology / CCU"},
    notes="Golden cardio demo patient. [gp-seed]",
)


def db():
    pw = next(l.split("=", 1)[1].strip() for l in open(ENV, encoding="utf-8", errors="replace")
              if l.startswith("DB_POSTGRESDB_PASSWORD="))
    try:
        c = psycopg2.connect(host=DIRECT_HOST, port=DIRECT_PORT, user=DIRECT_USER, password=pw,
                             dbname="postgres", sslmode="require", connect_timeout=15)
        c.autocommit = True
        with c.cursor() as cur:
            cur.execute("SHOW transaction_read_only")
            if cur.fetchone()[0] == "off":
                print("  [db] writable: direct 5432"); return c
        c.close()
    except Exception as e:
        print(f"  [db] direct 5432 unavailable ({type(e).__name__})")
    c = psycopg2.connect(host=POOLER_HOST, port=POOLER_PORT, user=POOLER_USER, password=pw,
                         dbname="postgres", sslmode="require", connect_timeout=15)
    c.autocommit = True
    with c.cursor() as cur:
        cur.execute("SHOW transaction_read_only")
        assert cur.fetchone()[0] == "off", "pooler 6543 read-only — abort"
    print("  [db] writable: pooler 6543"); return c


def patient_and_visit(cur):
    cur.execute("SELECT id FROM clinic_patients WHERE tenant_id=%s AND full_name='Aisha Rahman'", (SLUG,))
    r = cur.fetchone()
    if not r:
        sys.exit("ABORT: golden patient 'Aisha Rahman' not found for bsh-hospital (run P4 enabler first).")
    pid = r[0]
    cur.execute("SELECT id FROM clinic_visits WHERE tenant_id=%s AND patient_id=%s ORDER BY visit_date DESC LIMIT 1", (SLUG, pid))
    v = cur.fetchone()
    return pid, (v[0] if v else None)


def hr_columns(cur):
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_employees'")
    return {r[0] for r in cur.fetchall()}


def seed(cur):
    pid, vid = patient_and_visit(cur)
    # 1. departments (idempotent)
    for name, kind in DEPTS_P4 + DEPTS_P5_EXTRA:
        cur.execute("INSERT INTO hospital_departments(tenant_id,name,kind) VALUES(%s,%s,%s) ON CONFLICT (tenant_id,name) DO NOTHING", (SLUG, name, kind))
    cur.execute("SELECT name,id FROM hospital_departments WHERE tenant_id=%s", (SLUG,))
    deptmap = {n: i for n, i in cur.fetchall()}

    # 2. consult (clear prior seed consult for this patient, insert one tagged)
    cur.execute("DELETE FROM clinic_consultations WHERE tenant_id=%s AND patient_id=%s AND notes LIKE '%%[gp-seed]%%'", (SLUG, pid))
    cur.execute("""INSERT INTO clinic_consultations
        (tenant_id,patient_id,visit_id,practitioner_name,chief_complaint,history_of_present,
         examination_findings,diagnosis,treatment_plan,notes,doctor_approved,report_status,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,true,'approved',now(),now())""",
        (SLUG, pid, vid, CONSULT["practitioner_name"], CONSULT["chief_complaint"], CONSULT["history_of_present"],
         CONSULT["examination_findings"], CONSULT["diagnosis"], Json(CONSULT["treatment_plan"]), CONSULT["notes"]))

    # 3. order set (bsh-hospital orders are seed-owned: clear all, insert the tagged 7)
    cur.execute("DELETE FROM hospital_orders WHERE tenant_id=%s", (SLUG,))
    for item, otype, dept, status, note in ORDER_SET:
        cur.execute("""INSERT INTO hospital_orders(tenant_id,patient_id,visit_id,order_type,department_id,status,details,created_at)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,now())""",
                    (SLUG, pid, vid, otype, deptmap.get(dept), status, Json({"item": item, "note": note, "seed": "gp-cardio"})))

    # 4. hr staff (idempotent: clear BSH-*, insert; dynamic columns)
    have = hr_columns(cur)
    cur.execute("DELETE FROM hr_employees WHERE tenant_id=%s AND employee_id LIKE 'BSH-%%'", (TENANT_UUID,))
    for emp_id, first, last, position, dept, title in STAFF:
        row = {"tenant_id": TENANT_UUID, "employee_id": emp_id, "first_name": first, "last_name": last,
               "position": position, "date_of_joining": "2023-02-01", "department": dept, "job_title": title,
               "work_email": f"{first}.{last}@bsh-hospital.example".lower(), "employment_type": "full_time",
               "status": "active", "employment_status": "active", "work_location": "BSH Main Campus"}
        cols = [k for k in row if k in have]
        cur.execute(f"INSERT INTO hr_employees({','.join(cols)}) VALUES({','.join(['%s']*len(cols))})", [row[k] for k in cols])
    print(f"  seeded: {len(DEPTS_P4)+len(DEPTS_P5_EXTRA)} depts (idempotent), 1 consult, {len(ORDER_SET)} orders, {len(STAFF)} staff")


def teardown(cur):
    pid, _ = patient_and_visit(cur)
    cur.execute("DELETE FROM hospital_orders WHERE tenant_id=%s AND details->>'seed'='gp-cardio'", (SLUG,))
    o = cur.rowcount
    cur.execute("DELETE FROM clinic_consultations WHERE tenant_id=%s AND patient_id=%s AND notes LIKE '%%[gp-seed]%%'", (SLUG, pid))
    co = cur.rowcount
    cur.execute("DELETE FROM hr_employees WHERE tenant_id=%s AND employee_id LIKE 'BSH-%%'", (TENANT_UUID,))
    s = cur.rowcount
    cur.execute("DELETE FROM hospital_departments WHERE tenant_id=%s AND name = ANY(%s)", (SLUG, P5_EXTRA_NAMES))
    d = cur.rowcount
    print(f"  teardown removed: {o} orders, {co} consult, {s} staff, {d} P5-extra depts (Aisha + visit + 5 base depts LEFT)")


def iso_snapshot(cur):
    out = {}
    for t in ("cosmique", "bbqtonight-547b8e1b", "bsh-demo"):
        cur.execute("SELECT row_to_json(tc)::text FROM tenant_config tc WHERE tenant_id=%s", (t,))
        r = cur.fetchone()
        md5 = hashlib.md5(r[0].encode()).hexdigest() if r else None
        counts = {}
        for tbl in ("clinic_patients", "clinic_visits", "clinic_consultations", "hospital_orders", "hospital_departments"):
            cur.execute(f"SELECT count(*) FROM {tbl} WHERE tenant_id=%s", (t,)); counts[tbl] = cur.fetchone()[0]
        out[t] = {"tcfg_md5": md5, "counts": counts}
    # hr_employees is UUID-keyed
    for t, u in (("cosmique", None),):
        pass
    cur.execute("SELECT count(*) FROM hr_employees WHERE tenant_id<>%s", (TENANT_UUID,)); out["_hr_other_total"] = cur.fetchone()[0]
    return out


def verify(cur):
    pid, vid = patient_and_visit(cur)
    print("=== WALK SURFACES ===")
    cur.execute("SELECT chief_complaint,diagnosis FROM clinic_consultations WHERE tenant_id=%s AND patient_id=%s AND notes LIKE '%%[gp-seed]%%'", (SLUG, pid))
    print("  consult:", cur.fetchone())
    cur.execute("SELECT temperature,heart_rate,blood_pressure_systolic,blood_pressure_diastolic,spo2 FROM clinic_visits WHERE id=%s", (vid,))
    print("  flagged vitals (T,HR,SBP,DBP,SpO2):", cur.fetchone())
    cur.execute("SELECT order_type, count(*) FROM hospital_orders WHERE tenant_id=%s AND details->>'seed'='gp-cardio' GROUP BY order_type ORDER BY 1", (SLUG,))
    print("  order set by queue:", cur.fetchall(), "(expect imaging=3, lab=2, medication=2)")
    cur.execute("SELECT order_type, status, details->>'item' FROM hospital_orders WHERE tenant_id=%s AND details->>'seed'='gp-cardio' ORDER BY order_type,status", (SLUG,))
    for r in cur.fetchall(): print("     ", r)
    print("=== HR DEPARTMENTS + STAFF ===")
    cur.execute("SELECT count(*) FROM hospital_departments WHERE tenant_id=%s", (SLUG,)); print("  departments:", cur.fetchone()[0], "(expect 11)")
    cur.execute("SELECT count(*) FROM hr_employees WHERE tenant_id=%s AND employee_id LIKE 'BSH-%%'", (TENANT_UUID,)); print("  staff:", cur.fetchone()[0], "(expect 14)")
    cur.execute("SELECT position FROM hr_employees WHERE tenant_id=%s AND employee_id LIKE 'BSH-%%'", (TENANT_UUID,))
    positions = {r[0] for r in cur.fetchall()}
    print("  5 key roles present:", all(k in positions for k in KEY_ROLES), "->", [k for k in KEY_ROLES if k in positions])
    cur.execute("SELECT department, count(*) FROM hr_employees WHERE tenant_id=%s AND employee_id LIKE 'BSH-%%' GROUP BY department ORDER BY 1", (TENANT_UUID,))
    print("  staff by department:", cur.fetchall())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", action="store_true"); ap.add_argument("--teardown", action="store_true")
    ap.add_argument("--verify", action="store_true"); ap.add_argument("--iso", action="store_true")
    a = ap.parse_args()
    c = db(); cur = c.cursor()
    try:
        if a.iso:
            print(json.dumps(iso_snapshot(cur), indent=1)); return
        if a.teardown:
            teardown(cur)
        if a.seed:
            seed(cur)
        if a.verify or a.seed:
            verify(cur)
    finally:
        c.close()


if __name__ == "__main__":
    main()
