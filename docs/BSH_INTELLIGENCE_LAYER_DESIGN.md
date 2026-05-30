# BSH-HMS — Intelligence Layer Design (master design doc)

> The architectural spine for BSH's hospital deployment: how the 420 AI layer sits on an
> open-source Bahmni clinical core, what we BUILD vs. USE vs. REPLACE across BSH's 38
> functional modules, the risk register, and the Phase 3 roadmap.
> Status legend used throughout: **[BUILT]** verified on `feature/bsh-hms-phase2`,
> **[DESIGNED]** specced not coded, **[PHASE 3]** UI/integration work not started.

---

## 1. The five planes

The system is layered so that the open-source records engine and the proprietary AI
layer stay cleanly separable (this is what lets us answer "is it Bahmni?" honestly and
avoid AGPL contamination — we integrate, we don't fork).

| # | Plane | What lives here | Build posture | Status |
|---|-------|-----------------|---------------|--------|
| P1 | **Records** | Bahmni = OpenMRS Core + OpenELIS + Odoo. Patients, encounters, labs, drugs, billing. | USE (black-box via REST/FHIR R4) | [BUILT] integration contracts; live instance is [PHASE 3] |
| P2 | **Integration** | `bsh-auth-bridge` (420 Supabase JWT → Bahmni session), REST/FHIR adapters, secret resolution via `tenant_config.features.bahmni_secret_ref`. | BUILD (thin, our code) | [BUILT] `services/bsh-auth-bridge/` |
| P3 | **Intelligence** | MEDICA (clinical) + OMEGA (cross-brain) agents, 40 bahmni `@tool` functions, multi-branch metrics. | BUILD (our differentiator) | [BUILT] 15 Phase-1 + 25 Phase-2 tools |
| P4 | **Engagement** | Bangla/English patient intake — VAPI voice + Communication v3.8 (WhatsApp/SMS), Doctor Avatar. | BUILD on existing 420 rails | [BUILT] handlers; tenant wiring [DESIGNED] |
| P5 | **Governance** | 6-layer fail-closed industry gating, Supabase RLS, `bsh_multibranch_metrics` trigger, audit. | BUILD (trust surface) | [BUILT] tool+API+RLS+trigger; browser guard [BUILT] OWA |

**Plane-separation invariant:** P1 (AGPL Bahmni) is only ever touched through P2 adapters.
No proprietary BSH logic is compiled into Bahmni; nothing we sell links the AGPL core.
This keeps licensing risk LOW (see R3) and keeps BSH free of vendor lock-in at records.

---

## 2. The six-layer gate (why isolation is provable)

Every hospital capability is gated independently. A request must pass ALL six to touch
hospital data; any single layer fails the whole thing closed.

1. **Tool body** — each `@tool` checks `tenant_config.industry == 'healthcare_hospital'`,
   else returns `{"error":"Tool only available for healthcare_hospital","tenant_industry":<actual>}`.
2. **n8n node** — workflow-level industry guard before any Bahmni call.
3. **FastAPI middleware** — `bsh-auth-bridge` rejects non-hospital tenants at the edge.
4. **Supabase RLS** — row-level policies scope every table to the tenant.
5. **Supabase trigger** — `enforce_hospital_only_metrics()` raises at INSERT/UPDATE on
   `bsh_multibranch_metrics` for non-hospital tenants.
6. **OWA browser guard** — the operations web app refuses to render hospital views for a
   non-hospital session.

Verified behaviour: 25/25 hospital tools reject `cosmique` (clinic) and `zate` (tech)
with the structured error; existing-tenant regression unchanged (Cosmique still reports
its 3 patients, Zate its 613 leads).

---

## 3. The 38-module map — BUILD / USE / REPLACE

BSH runs ~38 functional modules today (incumbent: MySoft). Disposition per module:

| # | Module | Disposition | Notes |
|---|--------|-------------|-------|
| 1 | Patient registration | USE (Bahmni) + augment | OMEGA lead→patient bridge [DESIGNED] |
| 2 | Appointment scheduling | USE + augment | BEACON voice intake [BUILT] |
| 3 | OPD management | USE | Bahmni clinical |
| 4 | IPD / ward management | USE | bed state → `bed_assignments` fixture |
| 5 | Emergency / casualty | USE | Bahmni |
| 6 | Operation theatre | USE | Bahmni |
| 7 | Pharmacy | USE (Odoo) | inventory + dispensing |
| 8 | Laboratory (path) | USE (OpenELIS) + augment | abnormal-flag #12 |
| 9 | Radiology / imaging | USE | report attach |
| 10 | Blood bank | USE | Bahmni module |
| 11 | Billing & cashier | USE (Odoo) | corporate split-billing [DESIGNED] |
| 12 | Lab abnormal-flagging | **AUGMENT** | MEDICA flags out-of-range values [BUILT tool] |
| 13 | Histopathology / cytology | **BUILD** | not in stock Bahmni; custom encounter type [DESIGNED] |
| 14 | Diet / nutrition | USE | Bahmni |
| 15 | Auto clinical impression | **AUGMENT** | MEDICA drafts impression from encounter [BUILT tool] |
| 16 | Patient communication | **AUGMENT** | Comm v3.8 bilingual delivery [BUILT] |
| 17 | Insurance / TPA | USE + config | corporate clients model |
| 18 | Inventory / stores | USE (Odoo) | |
| 19 | HR / payroll | USE or 420 HR | overlap with 420 HR module |
| 20 | Duty roster | USE | |
| 21 | Asset maintenance | partial → see #36 | |
| 22 | Feedback / complaints | USE + augment | engagement responder |
| 23 | OPD policy / corporate rules | **BUILD** | BSH-specific corporate package rules [DESIGNED] |
| 24 | MRD (medical records) | USE | Bahmni |
| 25 | Appointment reminders | **AUGMENT** | Comm v3.8 |
| 26 | Queue / token display | USE | |
| 27 | Referral management | USE | |
| 28 | Discharge summary | USE + augment | MEDICA draft |
| 29 | Death / birth register | USE | |
| 30 | Vaccination | USE | |
| 31 | Telemedicine | AUGMENT | VAPI + video |
| 32 | Cafeteria / canteen | **BUILD** | not clinical; light Odoo/custom [DESIGNED] |
| 33 | Visitor management | USE | |
| 34 | Ambulance dispatch | USE | |
| 35 | Document management | USE | |
| 36 | Fixed asset register | **BUILD** | gap in stock distro [DESIGNED] |
| 37 | Multi-branch consolidation | **BUILD** | `bsh_multibranch_metrics` [BUILT] |
| 38 | Executive dashboards | **BUILD** | Phase 3 UI [PHASE 3] |

**Summary:** ~28 USE (Bahmni/Odoo/OpenELIS off-the-shelf), 4 hard BUILD (#13, #23, #32,
#36), 5 AUGMENT (#1, #2/#12/#15/#16, #25/#28), remainder Phase-3 surfacing. The honest
pitch: most of the hospital runs on a proven open-source core; our money is in the
augment + multi-branch + engagement layers.

---

## 4. Risk register (R1–R11)

| Risk | Severity | Mitigation |
|------|----------|------------|
| R1 Bahmni learning curve for BSH staff | Med | Phase-3 UI wraps complex flows; pilot one dept first |
| R2 Bangla NLU accuracy on voice | Med | VAPI bn model + fallback to human handoff |
| R3 AGPL contamination | **Low (by design)** | Plane-separation invariant — never fork P1 |
| R4 Data residency / compliance | High | Bahmni on-prem/in-country; scope with BSH IT |
| R5 Cross-tenant data leak | High → mitigated | 6-layer fail-closed gate; proven 25/25 reject |
| R6 Migration from MySoft data | High | Phased; ETL scoped separately, not day-one |
| R7 Local model quality (hermes3:8b) | Med | T29 — upgrade to qwen2.5:14b/Claude before scale |
| R8 Multi-branch metric correctness | Med | trigger-enforced industry gate; verify per branch |
| R9 Synthetic demo ≠ production behaviour | Med | label clearly; pilot validates on real data |
| R10 Token/credential expiry (GitHub, API) | Low-Med | rotate; current GitHub token is read-only (push blocked) |
| R11 Phase-3 UI scope creep | Med | scope screen list WITH BSH before quoting timeline |

---

## 5. Phase 3 roadmap (UI + production integration — NOT started)

1. **Scope screen list with BSH** — registration, OPD, lab review, multi-branch exec
   dashboard, corporate-billing. Cut/reshape with their team (R11).
2. **Stand up a real Bahmni instance** (on-prem/in-country per R4) and wire `bsh-auth-bridge`
   to it (currently tested against demo data + contracts).
3. **Build the hospital-facing React surfaces** under the 420 frontend (the routes do not
   exist yet — Phase 3 deliverable).
4. **Pilot**: one branch, two departments, OPD intake — parallel to MySoft, zero day-one risk.
5. **Validate augmentations on real data** (#12 abnormal-flag, #15 impression) with a
   clinician in the loop before any autonomous behaviour.
6. **Model upgrade** (R7/T29) before scaling beyond pilot.

---

### What is true today (no over-claim)
- BUILT & verifiable: 40 bahmni tools, auth-bridge, multi-branch metrics + RLS + trigger,
  6-layer gate, OWA, bilingual intake handlers, DDL migrations 37/38, demo fixtures.
- NOT built: hospital-facing UI, live production Bahmni integration, the 4 custom modules
  (coded), corporate split-billing wiring.
- USE (not ours): the entire clinical records core (Bahmni/OpenMRS/OpenELIS/Odoo).
