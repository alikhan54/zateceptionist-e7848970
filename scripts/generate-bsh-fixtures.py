#!/usr/bin/env python3
"""Deterministic BSH demo-data fixture generator (Phase 2G gap-fill).

Produces the seed JSON files declared-but-missing in scripts/bsh-demo-data/README.md:
patients.json, appointments.json, lab_orders.json, corporate_clients.json,
packages.json, bed_assignments.json — consistent with the 5 doctors already in
doctors.json (BSH-DR-001..005).

Synthetic data only. Seeded RNG => byte-stable output (safe to commit + re-run).
Run:  python scripts/generate-bsh-fixtures.py
"""
import json
import os
import random
from datetime import datetime, timedelta

random.seed(420)  # deterministic
HERE = os.path.join(os.path.dirname(__file__), "bsh-demo-data")
TODAY = datetime(2026, 5, 29)

DOCTORS = ["BSH-DR-001", "BSH-DR-002", "BSH-DR-003", "BSH-DR-004", "BSH-DR-005"]
DOCTOR_SPECIALTY = {
    "BSH-DR-001": "Cardiology", "BSH-DR-002": "Internal Medicine",
    "BSH-DR-003": "Pediatrics", "BSH-DR-004": "General Surgery",
    "BSH-DR-005": "Pathology",
}
BRANCHES = ["BSH-DHAKA-MAIN", "BSH-CTG", "BSH-SYLHET"]

MALE = ["Md. Abdullah", "Rakibul", "Tanvir", "Imran", "Shahriar", "Mahmudul",
        "Sabbir", "Jahangir", "Mizanur", "Aminul", "Faruk", "Habibur", "Kamrul",
        "Mahbub", "Rashed", "Tofazzal", "Anisur", "Bappi", "Shamim", "Robiul"]
FEMALE = ["Sumaiya", "Nusrat", "Tasnim", "Sharmin", "Mahmuda", "Rabeya", "Sadia",
          "Jannatul", "Israt", "Lamia", "Maliha", "Shahnaz", "Rumana", "Tahsin",
          "Afroza", "Nasrin", "Sabina", "Mou", "Priya", "Fahmida"]
SURNAMES = ["Rahman", "Islam", "Hossain", "Ahmed", "Akhtar", "Khan", "Chowdhury",
            "Begum", "Uddin", "Karim", "Sarkar", "Mollah", "Bhuiyan", "Sheikh",
            "Talukder", "Haque", "Mia", "Sultana", "Khatun", "Alam"]

APPT_STATUS = ["scheduled", "checked_in", "completed", "no_show", "cancelled"]
LAB_TESTS = ["CBC", "Lipid Profile", "HbA1c", "Troponin I", "LFT", "RFT",
             "Thyroid Panel", "Urine R/E", "Blood Culture", "CRP"]
LAB_STATES = ["ordered", "sample_collected", "in_progress", "resulted", "verified"]
WARDS = ["Cardiac ICU", "General Male", "General Female", "Pediatric",
         "Post-Surgical", "Cabin Block"]


def w(name, data):
    path = os.path.join(HERE, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  wrote {name}: {len(data)} records")


def gen_patients(n=50):
    out = []
    for i in range(1, n + 1):
        gender = random.choice(["M", "F"])
        given = random.choice(MALE if gender == "M" else FEMALE)
        family = random.choice(SURNAMES)
        age = random.randint(5, 85)
        out.append({
            "identifier": f"BSH-PT-{i:04d}",
            "person": {
                "names": [{"givenName": given, "familyName": family}],
                "gender": gender,
                "birthdate": (TODAY - timedelta(days=age * 365)).strftime("%Y-%m-%d"),
                "age": age,
            },
            "attributes": {
                "phone": f"+8801{random.randint(3,9)}{random.randint(10**7,10**8-1)}",
                "language": "bn,en",
                "branch": random.choice(BRANCHES),
                "blood_group": random.choice(["A+", "B+", "O+", "AB+", "A-", "O-"]),
            },
        })
    return out


def gen_appointments(patients, days=30, per_day=25):
    out = []
    aid = 1
    for d in range(days):
        day = TODAY - timedelta(days=days - 1 - d)
        for _ in range(per_day + random.randint(-3, 3)):
            pt = random.choice(patients)
            doc = random.choice(DOCTORS)
            hour = random.randint(9, 17)
            out.append({
                "identifier": f"BSH-APPT-{aid:05d}",
                "patient": pt["identifier"],
                "doctor": doc,
                "specialty": DOCTOR_SPECIALTY[doc],
                "branch": pt["attributes"]["branch"],
                "datetime": day.replace(hour=hour, minute=random.choice([0, 15, 30, 45])).strftime("%Y-%m-%dT%H:%M:%S"),
                "type": random.choice(["OPD", "Follow-up", "Package", "Emergency"]),
                "status": random.choice(APPT_STATUS),
            })
            aid += 1
    return out


def gen_lab_orders(patients, n=100):
    out = []
    for i in range(1, n + 1):
        pt = random.choice(patients)
        test = random.choice(LAB_TESTS)
        state = random.choice(LAB_STATES)
        abnormal = random.random() < 0.3 if state in ("resulted", "verified") else None
        out.append({
            "identifier": f"BSH-LAB-{i:05d}",
            "patient": pt["identifier"],
            "ordering_doctor": random.choice(DOCTORS),
            "test": test,
            "branch": pt["attributes"]["branch"],
            "ordered_at": (TODAY - timedelta(days=random.randint(0, 14))).strftime("%Y-%m-%dT%H:%M:%S"),
            "status": state,
            "abnormal_flag": abnormal,
        })
    return out


def gen_corporate_clients(n=20):
    seeds = [
        ("icddr,b-DEMO", "research_institute"), ("Grameenphone", "telecom"),
        ("BRAC Bank", "bank"), ("City Bank", "bank"), ("DBBL", "bank"),
        ("Square Pharma", "pharma"), ("Beximco", "conglomerate"),
        ("Pran-RFL", "fmcg"), ("Robi Axiata", "telecom"),
        ("Ha-Meem Garments", "garments"), ("Beacon Garments", "garments"),
        ("DESCO", "utility"), ("MetLife BD", "insurance"),
        ("Green Delta Insurance", "insurance"), ("Pragati Insurance", "insurance"),
        ("Walton", "electronics"), ("Akij Group", "conglomerate"),
        ("Bashundhara Group", "conglomerate"), ("Unilever BD", "fmcg"),
        ("Standard Chartered BD", "bank"),
    ]
    out = []
    for i, (name, sector) in enumerate(seeds[:n], start=1):
        out.append({
            "identifier": f"BSH-CORP-{i:03d}",
            "name": name,
            "sector": sector,
            "billing_mode": random.choice(["credit", "prepaid", "split"]),
            "discount_pct": random.choice([5, 10, 12, 15, 20]),
            "covered_lives": random.randint(50, 5000),
            "active": True,
        })
    return out


def gen_packages():
    return [
        {"identifier": "BSH-PKG-001", "name": "Executive Health Check",
         "price_bdt": 12000, "tests": ["CBC", "Lipid Profile", "LFT", "RFT", "ECG", "Chest X-ray"],
         "target": "corporate executives"},
        {"identifier": "BSH-PKG-002", "name": "Pre-Marital Screening",
         "price_bdt": 6500, "tests": ["CBC", "Blood Group", "HBsAg", "VDRL", "Thalassemia"],
         "target": "couples"},
        {"identifier": "BSH-PKG-003", "name": "Cardiac Package",
         "price_bdt": 15000, "tests": ["ECG", "Echo", "Troponin I", "Lipid Profile", "Stress Test"],
         "target": "cardiac risk"},
        {"identifier": "BSH-PKG-004", "name": "Diabetic Package",
         "price_bdt": 4500, "tests": ["HbA1c", "Fasting Glucose", "RFT", "Urine R/E", "Lipid Profile"],
         "target": "diabetic monitoring"},
        {"identifier": "BSH-PKG-005", "name": "Pre-Medical (Overseas/Job)",
         "price_bdt": 3500, "tests": ["CBC", "Chest X-ray", "HBsAg", "Anti-HCV", "Blood Group"],
         "target": "overseas employment"},
    ]


def gen_bed_assignments(patients):
    out = []
    occupied = random.sample(patients, k=18)
    bid = 1
    for ward in WARDS:
        for bed in range(1, random.randint(4, 8)):
            assigned = occupied.pop() if occupied and random.random() < 0.7 else None
            out.append({
                "identifier": f"BSH-BED-{bid:03d}",
                "ward": ward,
                "bed_no": f"{ward[:3].upper()}-{bed:02d}",
                "branch": "BSH-DHAKA-MAIN",
                "status": "occupied" if assigned else "available",
                "patient": assigned["identifier"] if assigned else None,
            })
            bid += 1
    return out


def main():
    os.makedirs(HERE, exist_ok=True)
    print("Generating BSH demo fixtures (seed=420, deterministic)...")
    patients = gen_patients(50)
    w("patients.json", patients)
    w("appointments.json", gen_appointments(patients))
    w("lab_orders.json", gen_lab_orders(patients, 100))
    w("corporate_clients.json", gen_corporate_clients(20))
    w("packages.json", gen_packages())
    w("bed_assignments.json", gen_bed_assignments(patients))
    print("Done. All fixtures are synthetic; safe to commit.")


if __name__ == "__main__":
    main()
