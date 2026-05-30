# BSH-HMS — Pitch Talking Points (one page)

> Carry this into the room. The one-liner, the three differentiators, and honest answers
> to the 10 questions BSH leadership will actually ask. Do NOT over-claim.

## The one-liner
"An AI layer on an open-source hospital core — bilingual patient intake, clinical reading
of your records, and multi-branch intelligence — provably isolated to your hospital."

## Three differentiators (lead with these)
1. **Bangla-first AI intake** across voice + WhatsApp that books into the real schedule.
2. **Clinical reading**: MEDICA reasons over Bahmni encounters/labs, not just calendars.
3. **Provable isolation**: hospital tools fail-closed for non-hospital tenants, six layers.

---

## Top 10 questions — and honest answers

**Q1. Is this built on Bahmni / open source? Are you reselling someone else's software?**
Yes — the clinical records core is Bahmni (OpenMRS + OpenELIS + Odoo), the same
open-source stack the Bangladesh DGHS has run in ~100 public hospitals since 2016. We do
NOT fork or hide that. Our value is the AI layer on top — agents, bilingual intake,
multi-branch intelligence — plus integration, configuration, and support. You are never
locked in at the records layer; that's open standards (FHIR R4 + REST).

**Q2. So what exactly did YOU build vs. what's off-the-shelf?**
We built: 40 hospital AI tools (clinical + operational), the auth bridge from your 420
login to Bahmni, the Bangla voice/WhatsApp intake, the multi-branch metrics layer, and
the industry-isolation enforcement. Off-the-shelf: the clinical records engine (Bahmni).
Not yet built: the hospital-facing UI screens — that's Phase 3, scoped with you.

**Q3. Will this replace MySoft on day one?**
No, and we wouldn't recommend it. Start with a narrow pilot (one branch, two departments,
OPD intake) running alongside MySoft. Expand only when it earns it. Zero day-one
operational risk.

**Q4. How do you keep our patient data isolated from your other clients?**
Six independent fail-closed layers (tool, workflow, API, database row-level security,
database trigger, browser). I'll demonstrate a hospital tool rejecting a non-hospital
tenant live. A single misconfiguration cannot open a leak because every layer must agree.

**Q5. Does it actually work in Bangla, or just translate?**
Native Bangla intake on voice (VAPI) and WhatsApp — patients speak/type Bangla and get a
real booking, not a translated dead-end. Staff UI is bilingual (bn/en).

**Q6. Where does it run? Cloud? On our premises?**
The clinical Bahmni stack can run on-prem or in-country for data-residency comfort. The
AI brain runs on dedicated hardware. We'll architect placement around BSH's compliance
needs — this is a scoping conversation, not a fixed answer.

**Q7. What about our 18 departments and multiple branches?**
Multi-branch is first-class: cross-branch metrics answer in one query
(`bsh_multibranch_metrics`). Departments map to your real structure; we seeded
Cardiology, Internal Medicine, Pediatrics, Surgery, Pathology as the starting set.

**Q8. Corporate clients and health packages — icddr,b, Grameenphone, executive checkups?**
Modeled in the data design: corporate accounts and packages (Executive, Pre-Marital,
Cardiac, Diabetic, Pre-Medical). These are in the demo fixtures today; production wiring
is part of Phase 3 scoping.

**Q9. How long to a real pilot, and what do you need from us?**
A single-department OPD-intake pilot is the fastest path. We need: a Bahmni environment
(we can stand one up), a sample of your department/consultant list, and one IT contact.
Realistic, we scope the screen list with you before committing a date — I won't quote a
timeline I can't defend.

**Q10. What's NOT done yet — be straight with me.**
The hospital-facing UI (Phase 3) is not built. Production integration to your live Bahmni
instance is not done (we've built and tested against demo data and the integration
contracts). Everything I demo today is real backend + agent capability on synthetic data;
I will not show you a screen that doesn't exist.

---

### The transparency play (say this if trust is the blocker)
"I could pretend this is all our proprietary code. It isn't — the clinical core is
open-source Bahmni, and I think that's a feature for you, not a weakness: no vendor
lock-in at your records layer, a stack your own Ministry already trusts, and our work is
the AI and integration on top. I'd rather you trust what I show than oversell what I
haven't built."
