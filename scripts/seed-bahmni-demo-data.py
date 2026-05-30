#!/usr/bin/env python3
"""BSH-HMS — Bahmni demo data seeder (industry-gated, idempotent, transform-at-load).

The fixtures in scripts/bsh-demo-data/*.json are an abstract, human-readable demo
schema (instance-independent). They are NOT raw OpenMRS REST payloads. This seeder
TRANSFORMS them at load time: it resolves instance metadata (patient identifier type,
location, person attribute types) by display name from the live instance, creates
Persons->Providers and Patients with proper identifiers[], and records a
business-ID -> OpenMRS-UUID map in seed_state.json so later tiers (lab orders,
appointments) and fresh sessions can reference real UUIDs.

Tiers:
  A (providers, patients) -- implemented
  C (lab_orders)          -- TODO (depends on Tier A UUID map + lab concepts)
  B (appointments)        -- TODO (depends on Tier A UUID map + appointment services)
Fixtures not supported by bahmni-lite (corporate_clients/packages/bed_assignments)
are reported as DEFERRED, never silently "seeded".

Usage:
    BAHMNI_URL=https://localhost:8443 BAHMNI_TLS_VERIFY=false SUPABASE_SERVICE_KEY=... \\
        python scripts/seed-bahmni-demo-data.py --tenant bsh-demo --dir scripts/bsh-demo-data

Refuses to seed if tenant_config.industry != 'healthcare_hospital'.
"""
import argparse, base64, json, os, sys
from pathlib import Path
import httpx

HOSPITAL = "healthcare_hospital"
SUPABASE = os.getenv("SUPABASE_URL", "https://fncfbywkemsxwuiowxxe.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
# Bahmni origin is self-signed at :8443 -> allow TLS-verify opt-out for the Bahmni calls only.
VERIFY_TLS = os.getenv("BAHMNI_TLS_VERIFY", "true").lower() != "false"


def get_tenant_industry(tenant_id):
    r = httpx.get(f"{SUPABASE}/rest/v1/tenant_config",
                  headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                  params={"tenant_id": f"eq.{tenant_id}", "select": "industry,bahmni_base_url"},
                  timeout=10.0)
    return (r.json()[0] if r.json() else {}).get("industry", "unknown") if r.status_code == 200 else "error"


def auth_header():
    user = os.getenv("BAHMNI_USER", "admin")
    pwd = os.getenv("BAHMNI_PASS", "Admin123")
    return {"Authorization": "Basic " + base64.b64encode(f"{user}:{pwd}".encode()).decode()}


def bget(url, path, params=None):
    return httpx.get(f"{url.rstrip('/')}{path}",
                     headers={**auth_header(), "Accept": "application/json"},
                     params=params or {}, timeout=30.0, verify=VERIFY_TLS)


def bpost(url, path, body):
    return httpx.post(f"{url.rstrip('/')}{path}",
                      headers={**auth_header(), "Content-Type": "application/json", "Accept": "application/json"},
                      json=body, timeout=30.0, verify=VERIFY_TLS)


def resolve_metadata(url):
    """Resolve instance-specific UUIDs by display name (keeps fixtures instance-independent)."""
    def by_display(path, want, params=None):
        for r in bget(url, path, params).json().get("results", []):
            if r.get("display") == want:
                return r["uuid"]
        return None
    md = {
        "id_type": by_display("/openmrs/ws/rest/v1/patientidentifiertype", "Patient Identifier"),
        "location": by_display("/openmrs/ws/rest/v1/location", "Bahmni Clinic", {"limit": 50}),
        "phone_attr": by_display("/openmrs/ws/rest/v1/personattributetype", "phoneNumber", {"limit": 100}),
    }
    required = ["id_type", "location"]
    missing = [k for k in required if not md[k]]
    if missing:
        print(f"FATAL: could not resolve required metadata {missing} from {url}", file=sys.stderr)
        sys.exit(3)
    return md


def find_provider(url, identifier):
    for p in bget(url, "/openmrs/ws/rest/v1/provider", {"q": identifier, "v": "full"}).json().get("results", []):
        if p.get("identifier") == identifier:
            return p["uuid"]
    return None


def find_patient(url, identifier):
    for p in bget(url, "/openmrs/ws/rest/v1/patient", {"q": identifier, "v": "full"}).json().get("results", []):
        for idn in p.get("identifiers", []):
            if idn.get("identifier") == identifier:
                return p["uuid"]
    return None


def names_of(person):
    n = person["names"][0]
    return [{"givenName": n["givenName"], "familyName": n.get("familyName", "")}]


def seed_providers(url, rows, state):
    pmap = state.setdefault("providers", {})
    ok = exist = err = 0
    for row in rows:
        bid = row["identifier"]
        if bid in pmap:
            exist += 1
            continue
        found = find_provider(url, bid)
        if found:
            pmap[bid] = found
            exist += 1
            print(f"  EXIST provider {bid} -> {found}")
            continue
        pr = bpost(url, "/openmrs/ws/rest/v1/person",
                   {"names": names_of(row["person"]), "gender": row["person"].get("gender", "U")})
        if pr.status_code not in (200, 201):
            err += 1
            print(f"  ERR person for {bid}: {pr.status_code} {pr.text[:140]}")
            continue
        prov = bpost(url, "/openmrs/ws/rest/v1/provider",
                     {"person": pr.json()["uuid"], "identifier": bid})
        if prov.status_code in (200, 201):
            pmap[bid] = prov.json()["uuid"]
            ok += 1
            print(f"  OK provider {bid} -> {pmap[bid]}")
        else:
            err += 1
            print(f"  ERR provider {bid}: {prov.status_code} {prov.text[:160]}")
    print(f"providers: {ok} created, {exist} existing, {err} errors")
    return err


def seed_patients(url, rows, md, state):
    pmap = state.setdefault("patients", {})
    ok = exist = err = 0
    for row in rows:
        bid = row["identifier"]
        if bid in pmap:
            exist += 1
            continue
        found = find_patient(url, bid)
        if found:
            pmap[bid] = found
            exist += 1
            print(f"  EXIST patient {bid} -> {found}")
            continue
        p = row["person"]
        person = {"names": names_of(p), "gender": p.get("gender", "U")}
        if p.get("birthdate"):
            person["birthdate"] = p["birthdate"]
        attrs = row.get("attributes", {})
        if md.get("phone_attr") and attrs.get("phone"):
            person["attributes"] = [{"attributeType": md["phone_attr"], "value": attrs["phone"]}]
        body = {"person": person,
                "identifiers": [{"identifier": bid, "identifierType": md["id_type"],
                                 "location": md["location"], "preferred": True}]}
        r = bpost(url, "/openmrs/ws/rest/v1/patient", body)
        if r.status_code in (200, 201):
            pmap[bid] = r.json()["uuid"]
            ok += 1
            print(f"  OK patient {bid} -> {pmap[bid]}")
        else:
            err += 1
            print(f"  ERR patient {bid}: {r.status_code} {r.text[:160]}")
    print(f"patients: {ok} created, {exist} existing, {err} errors")
    return err


# ----------------------------------------------------------------------
# Tier C — lab orders + results (encounter -> testorder -> result observation)
# ----------------------------------------------------------------------
# Headline numeric analyte per fixture test name. Panels collapse to their most
# demo-relevant range-bearing analyte so MEDICA reads one flaggable value per order.
# Concept UUIDs are CIEL dictionary IDs verified present in this instance; if any is
# wrong the /order call 400s and is logged ERR (non-fatal, never silent).
ANALYTES = {
    "wbc":         {"concept": "678AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",   "abn": 18.5, "nor": 7.2},   # 10^3/uL  (4-11)
    "platelets":   {"concept": "729AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",   "abn": 38,   "nor": 245},   # 10^3/mL  (134-419)
    "sgpt":        {"concept": "654AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",    "abn": 180,  "nor": 24},    # IU/L     (0-35)
    "creatinine":  {"concept": "164364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",    "abn": 3.8,  "nor": 0.9},   # mg/dL
    "cholesterol": {"concept": "1006AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",    "abn": 7.8,  "nor": 4.1},   # mmol/L   (<5.17)
    "troponin":    {"concept": "159654AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",    "abn": 2.3,  "nor": 0.01},  # ng/ml
    "hba1c":       {"concept": "159644AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",    "abn": 9.2,  "nor": 5.4},   # %
    "potassium":   {"concept": "1133AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",    "abn": 6.8,  "nor": 4.2},   # mmol/L   (3.5-5.6)
    # tsh / crp resolved by display at load (added into this dict by resolve_lab_metadata)
}
TEST_MAP = {
    "CBC": "wbc", "LFT": "sgpt", "RFT": "creatinine", "Lipid Profile": "cholesterol",
    "HbA1c": "hba1c", "Troponin I": "troponin", "Thyroid Panel": "tsh", "CRP": "crp",
    "Urine R/E": None, "Blood Culture": None,  # non-numeric -> not result-seeded
}
# Lab-concept overlay: ensure a normal reference range exists on the demo
# concepts that ship WITHOUT hi/lowNormal on this CIEL build, so the FHIR
# Observation renders a 'normal' range and abnormal values are self-describing
# to MEDICA (no clinical thresholds baked into tool code). bsh-demo only.
CONCEPT_RANGE_OVERLAY = {
    "creatinine": {"lowNormal": 0.7, "hiNormal": 1.3, "lowCritical": 0.2, "hiCritical": 4.0},
    "hba1c":      {"lowNormal": 4.0, "hiNormal": 5.7, "hiCritical": 10.0},
    "troponin":   {"lowNormal": 0.0, "hiNormal": 0.04, "hiCritical": 0.5},
    "tsh":        {"lowNormal": 0.4, "hiNormal": 4.0, "hiCritical": 10.0},
}


def meta_by_display(url, path, want, params=None):
    for r in bget(url, path, params or {}).json().get("results", []):
        if r.get("display") == want:
            return r.get("uuid")
    return None


def _concept_numeric_uuid(url, candidates):
    for cand in candidates:
        for c in bget(url, "/openmrs/ws/rest/v1/concept", {"q": cand, "v": "full", "limit": 5}).json().get("results", []):
            if (c.get("datatype") or {}).get("display") == "Numeric":
                return c.get("uuid")
    return None


def resolve_lab_metadata(url):
    lab = {
        "enc_type":   meta_by_display(url, "/openmrs/ws/rest/v1/encountertype", "Consultation", {"limit": 50}),
        "visit_type": meta_by_display(url, "/openmrs/ws/rest/v1/visittype", "OPD", {"limit": 50}),
        "caresetting": meta_by_display(url, "/openmrs/ws/rest/v1/caresetting", "Outpatient"),
        "ordertype":  meta_by_display(url, "/openmrs/ws/rest/v1/ordertype", "Test Order"),
    }
    roles = bget(url, "/openmrs/ws/rest/v1/encounterrole", {"v": "default"}).json().get("results", [])
    lab["enc_role"] = roles[0]["uuid"] if roles else None
    tsh = _concept_numeric_uuid(url, ["Thyroid stimulating hormone", "Serum TSH", "TSH"])
    crp = _concept_numeric_uuid(url, ["C-reactive protein", "C reactive protein", "Serum CRP", "CRP"])
    if tsh:
        ANALYTES["tsh"] = {"concept": tsh, "abn": 8.5, "nor": 2.0}
    if crp:
        ANALYTES["crp"] = {"concept": crp, "abn": 85.0, "nor": 3.0}
    req = ["enc_type", "visit_type", "caresetting", "ordertype", "enc_role"]
    missing = [k for k in req if not lab.get(k)]
    if missing:
        print(f"FATAL: could not resolve lab metadata {missing} from {url}", file=sys.stderr)
        sys.exit(4)
    print(f"lab metadata: enc_type={lab['enc_type']} visit_type={lab['visit_type']} "
          f"ordertype={lab['ordertype']} caresetting={lab['caresetting']} "
          f"tsh={'Y' if tsh else 'N'} crp={'Y' if crp else 'N'}")
    return lab


def overlay_concept_ranges(url):
    """Ensure numeric reference ranges on demo lab concepts that ship without
    hi/lowNormal. Idempotent: skips a concept already matching. Returns errors."""
    set_n = skip_n = err_n = 0
    for an, ranges in CONCEPT_RANGE_OVERLAY.items():
        spec = ANALYTES.get(an)
        if not spec:
            continue
        cu = spec["concept"]
        cur = bget(url, f"/openmrs/ws/rest/v1/concept/{cu}", {"v": "full"}).json()
        if all(cur.get(k) == v for k, v in ranges.items()):
            skip_n += 1
            continue
        r = bpost(url, f"/openmrs/ws/rest/v1/concept/{cu}", ranges)
        if r.status_code in (200, 201):
            set_n += 1
            print(f"  overlay {an}: {ranges}")
        else:
            err_n += 1
            print(f"  ERR overlay {an}: {r.status_code} {r.text[:120]}")
    print(f"concept-range overlay: {set_n} set, {skip_n} already-correct, {err_n} errors")
    return err_n


def _ensure_visit_encounter(url, pt_uuid, md, start_iso, orderer):
    v = bpost(url, "/openmrs/ws/rest/v1/visit",
              {"patient": pt_uuid, "visitType": md["visit_type"], "location": md["location"],
               "startDatetime": start_iso})
    if v.status_code not in (200, 201):
        print(f"    ERR visit: {v.status_code} {v.text[:160]}")
        return None
    e = bpost(url, "/openmrs/ws/rest/v1/encounter",
              {"patient": pt_uuid, "encounterType": md["enc_type"], "location": md["location"],
               "encounterDatetime": start_iso, "visit": v.json()["uuid"],
               "encounterProviders": [{"provider": orderer, "encounterRole": md["enc_role"]}]})
    if e.status_code not in (200, 201):
        print(f"    ERR encounter: {e.status_code} {e.text[:160]}")
        return None
    return {"visit": v.json()["uuid"], "encounter": e.json()["uuid"]}


def seed_lab_orders(url, rows, md, state, state_path):
    lmap = state.setdefault("lab_orders", {})      # order business-id -> {order, obs, ...}
    venc = state.setdefault("lab_encounters", {})  # patient business-id -> {visit, encounter}
    pmap = state.get("patients", {})
    drmap = state.get("providers", {})
    any_dr = next(iter(drmap.values()), None)
    by_pt = {}
    for r in rows:
        by_pt.setdefault(r["patient"], []).append(r)
    ords = obs_n = abn_n = exist = skip = err = 0
    for pt_bid, prows in by_pt.items():
        pt_uuid = pmap.get(pt_bid)
        if not pt_uuid:
            skip += len(prows)
            print(f"  SKIP patient {pt_bid}: not in UUID map")
            continue
        orderer = drmap.get(prows[0].get("ordering_doctor")) or any_dr
        dates = sorted([x.get("ordered_at") for x in prows if x.get("ordered_at")])
        start_iso = dates[0] if dates else None
        ve = venc.get(pt_bid)
        if not ve:
            ve = _ensure_visit_encounter(url, pt_uuid, md, start_iso, orderer)
            if not ve:
                err += len(prows)
                continue
            venc[pt_bid] = ve
            save_state(state_path, state)
        enc_uuid = ve["encounter"]
        for r in prows:
            obid = r["identifier"]
            if obid in lmap:
                exist += 1
                continue
            spec = ANALYTES.get(TEST_MAP.get(r["test"]))
            if not spec:
                skip += 1   # non-numeric test (Urine R/E, Blood Culture) or unresolved TSH/CRP
                continue
            dr = drmap.get(r.get("ordering_doctor")) or orderer
            ob = bpost(url, "/openmrs/ws/rest/v1/order",
                       {"type": "testorder", "concept": spec["concept"], "patient": pt_uuid,
                        "encounter": enc_uuid, "orderer": dr, "action": "NEW",
                        "careSetting": md["caresetting"], "urgency": "ROUTINE",
                        "orderType": md["ordertype"]})
            if ob.status_code not in (200, 201):
                err += 1
                print(f"  ERR order {obid} ({r['test']}): {ob.status_code} {ob.text[:140]}")
                continue
            order_uuid = ob.json()["uuid"]
            ords += 1
            rec = {"order": order_uuid, "test": r["test"], "analyte": TEST_MAP[r["test"]]}
            if r.get("status") in ("verified", "resulted"):
                abnormal = bool(r.get("abnormal_flag"))
                val = spec["abn"] if abnormal else spec["nor"]
                obs = bpost(url, "/openmrs/ws/rest/v1/obs",
                            {"person": pt_uuid, "concept": spec["concept"],
                             "obsDatetime": r.get("ordered_at") or start_iso,
                             "encounter": enc_uuid, "order": order_uuid, "value": val})
                if obs.status_code in (200, 201):
                    obs_n += 1
                    abn_n += 1 if abnormal else 0
                    rec.update({"obs": obs.json()["uuid"], "value": val, "abnormal": abnormal})
                    print(f"  OK {obid} {pt_bid} {r['test']}->{rec['analyte']}={val} "
                          f"{'ABNORMAL' if abnormal else 'normal'}")
                else:
                    err += 1
                    print(f"  ERR obs {obid}: {obs.status_code} {obs.text[:140]}")
            else:
                print(f"  OK {obid} {pt_bid} {r['test']}->{rec['analyte']} order-only ({r.get('status')})")
            lmap[obid] = rec
        save_state(state_path, state)
    print(f"lab_orders: {ords} orders, {obs_n} results ({abn_n} abnormal), "
          f"{exist} existing, {skip} skipped (non-numeric/no-uuid), {err} errors")
    return err


def load_state(path):
    return json.loads(Path(path).read_text(encoding="utf-8")) if Path(path).exists() else {}


def save_state(path, state):
    Path(path).write_text(json.dumps(state, indent=2), encoding="utf-8")


def fixture(data_dir, name):
    f = Path(data_dir) / f"{name}.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None


def seed(tenant_id, data_dir, state_path, tiers):
    industry = get_tenant_industry(tenant_id)
    if industry != HOSPITAL:
        print(f"REFUSING: tenant {tenant_id} has industry={industry}, expected {HOSPITAL}", file=sys.stderr)
        sys.exit(2)

    url = os.getenv("BAHMNI_URL", "http://localhost:8080")
    print(f"Bahmni base URL: {url}  (TLS verify={VERIFY_TLS})")
    md = resolve_metadata(url)
    print(f"metadata: id_type={md['id_type']} location={md['location']} phone_attr={md['phone_attr']}")
    state = load_state(state_path)
    total_err = 0

    if "A" in tiers:
        print("\n== Tier A: providers (person -> provider) ==")
        rows = fixture(data_dir, "doctors")
        if rows:
            total_err += seed_providers(url, rows, state)
            save_state(state_path, state)
        print("\n== Tier A: patients (person + identifiers[]) ==")
        rows = fixture(data_dir, "patients")
        if rows:
            total_err += seed_patients(url, rows, md, state)
            save_state(state_path, state)

    if "C" in tiers:
        print("\n== Tier C: lab orders + results (encounter -> testorder -> obs) ==")
        rows = fixture(data_dir, "lab_orders")
        if rows:
            md.update(resolve_lab_metadata(url))
            total_err += overlay_concept_ranges(url)
            total_err += seed_lab_orders(url, rows, md, state, state_path)
            save_state(state_path, state)
        else:
            print("  no lab_orders fixture found — nothing to seed")

    if "B" in tiers:
        print("\n(Tier B appointments not yet implemented in this build.)")

    for unsupported in ("corporate_clients", "packages", "bed_assignments"):
        if fixture(data_dir, unsupported) is not None:
            print(f"  DEFERRED {unsupported}: not supported by bahmni-lite")

    print(f"\nDone. total errors={total_err}. state -> {state_path}")
    return total_err


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tenant", required=True)
    ap.add_argument("--dir", default="scripts/bsh-demo-data")
    ap.add_argument("--state", default="scripts/bsh-demo-data/seed_state.json")
    ap.add_argument("--tiers", default="A", help="comma list: A (providers+patients), C (labs), B (appointments)")
    args = ap.parse_args()
    rc = seed(args.tenant, args.dir, args.state, {t.strip().upper() for t in args.tiers.split(",")})
    sys.exit(1 if rc else 0)
