# BSH-HMS — Live Demo Script (20 min, 4 acts)

> Audience: BSH leadership (MD/CEO, Head of IT, Chief Medical Officer) evaluating a
> replacement/augmentation for their incumbent MySoft HMS across an 18-department,
> multi-branch Bangladeshi hospital.
> Format: SAY (what you say) / DO (what you click or trigger) / WHY (the point landing).
> Pre-reqs: `bsh-demo` tenant seeded (industry=`healthcare_hospital`), Bahmni stack up,
> 420 brain reachable, demo data loaded (see `scripts/bsh-demo-data/`).

---

## Act 0 — Pre-flight (do this BEFORE they join, not on camera)
- Confirm `tenant_config` row: `tenant_id='bsh-demo'`, `industry='healthcare_hospital'`,
  `bahmni_base_url` populated. (`SELECT * FROM hospital_tenants;` returns 1 row.)
- Warm the local models: run `scripts/pre-demo-warmup.ps1` (hermes3:8b + qwen2.5:7b).
- Open three tabs: (1) 420 dashboard signed in as a BSH staff user, (2) Bahmni clinical
  UI, (3) a terminal for the gating proof.
- Have a fallback screen-recording ready in case the live brain is cold.

---

## Act 1 — "This is YOUR hospital, not a generic template" (4 min)

**SAY:** "Everything you're about to see is scoped to BSH. Your 18 departments, your
doctors, your corporate clients like icddr,b and Grameenphone, your bilingual front
desk. Nothing here is a demo skin — it's the same multi-tenant engine that runs our
other verticals, configured for a hospital."

**DO:**
- Open the 420 dashboard as the BSH staff user. Point at the department list and the
  5 seeded consultants (Dr. Md. Saiful Rahman — Cardiology, Dr. Farzana Begum — Internal
  Medicine, etc.).
- Show the patient list with Bangladeshi names and the age spread.

**WHY:** Establish that this is *their* data model, not a slideware mock. The vocabulary
already says "patient", "consultant", "OPD" — not "lead"/"customer".

---

## Act 2 — "The AI front desk speaks Bangla" (6 min)

**SAY:** "Your patients call in Bangla. Our voice agent answers in Bangla, books the
appointment into the same system your reception uses, and never invents a slot that
doesn't exist."

**DO:**
- Trigger an inbound VAPI voice call to the BSH assistant. Ask (in Bangla or English)
  for a cardiology appointment.
- Show the appointment landing in the schedule in real time.
- Then show the same thing over WhatsApp via Communication v3.8 — a patient messaging
  "ডাক্তার দেখাতে চাই" gets a real booking flow, not a canned reply.

**WHY:** Bilingual, omni-channel intake that writes to the real schedule is the single
biggest day-one pain MySoft doesn't solve. This is the "wow".

> If the live call is risky on bandwidth, fall back to the recorded clip from Act 0.

---

## Act 3 — "The AI reads the chart, not just the calendar" (6 min)

**SAY:** "Booking is table stakes. The difference is that our clinical agent, MEDICA,
can read a Bahmni encounter — labs, vitals, the doctor's note — and surface what matters.
Watch."

**DO:**
- Pull up a patient with a lab result in Bahmni (e.g. an abnormal cardiac panel).
- In the 420 chat, ask MEDICA to summarise the patient's recent visit and flag anything
  abnormal. Show it citing the actual lab values and the abnormal flag.
- Ask OMEGA a cross-branch question ("how many OPD visits across all branches this week?")
  and show it answering from `bsh_multibranch_metrics`.

**WHY:** This is the augmentation layer no incumbent HMS has — clinical reasoning and
multi-branch intelligence on top of the records, not a parallel silo.

---

## Act 4 — "It is locked to hospitals only — provably" (3 min)

**SAY:** "A fair question: if this is one engine across many businesses, how do you know
a hospital tool can't be invoked by a restaurant tenant, or vice versa? Let me prove the
isolation rather than assert it."

**DO:**
- In the terminal, run a hospital tool against a NON-hospital tenant (e.g. `cosmique`,
  a clinic). Show the hard rejection:
  `{"error":"Tool only available for healthcare_hospital","tenant_industry":"healthcare_clinic"}`
- Note that the same gate exists at six independent layers (tool, workflow, API, RLS, DB
  trigger, browser) — so a single misconfiguration can't open a leak.
- Show the DB-level proof: an `INSERT` into `bsh_multibranch_metrics` for a non-hospital
  tenant raises `restricted to healthcare_hospital tenants`.

**WHY:** Healthcare buyers care about data isolation above almost everything. Proving it
live — fail-closed, at multiple layers — converts skepticism into trust.

---

## Close (1 min)
**SAY:** "So: bilingual AI intake, clinical intelligence over your real Bahmni records,
multi-branch dashboards, and isolation we can prove on demand. Phase 2 (the backend +
agent layer) is built. Phase 3 is the hospital-facing UI, which we'd scope with your
team. What would you want to see running first at BSH?"

**DO:** Stop sharing. Hand to Q&A → use `BSH_PITCH_TALKING_POINTS.md`.

---

### Honesty notes for the presenter (do NOT say on camera)
- 40 bahmni agent tools are real and live on the AMD brain; the frontend hospital UI
  (Phase 3) is NOT built yet — do not imply screens that don't exist.
- The demo data is synthetic fixtures (`scripts/bsh-demo-data/`), not real patients.
- Bahmni is the open-source clinical core; we integrate via REST/FHIR, we did not fork it.
