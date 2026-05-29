# BSH-HMS — Async Loom Script (5 min, send-ahead)

> Use when BSH can't get the full panel on a live call. A tight 5-minute recorded
> walkthrough that earns the 30-minute live demo. Talking-head + screen-share.
> Keep it to ONE take where possible — energy beats polish.

---

## 0:00–0:30 — Hook
"Hi — quick 5 minutes on what we've built for BSH. You already run an 18-department
hospital on MySoft. I'm not here to rip that out on day one. I'm here to show an AI
layer that sits on top of an open-source clinical core, speaks Bangla to your patients,
and reads your charts — and I'll prove it's locked to hospitals only, not hand-wave it."

## 0:30–1:30 — "It's your hospital, configured"
- Screen: 420 dashboard as a BSH user.
- "These are your departments, your consultants, your corporate accounts — icddr,b,
  Grameenphone. The vocabulary is patient, OPD, consultant — because the engine knows
  this tenant is a hospital, not a generic CRM."

## 1:30–3:00 — The two things MySoft can't do
1. **Bilingual AI intake (0:90 of this segment).** Show the voice/WhatsApp agent taking
   a Bangla appointment request and writing it to the real schedule. "No invented slots,
   no parallel spreadsheet — it books into the same calendar your reception sees."
2. **Clinical reading (the other 0:60).** Show MEDICA summarising a Bahmni visit and
   flagging an abnormal lab value, citing the real number. "It reads the chart, not just
   the calendar."

## 3:00–4:00 — Multi-branch intelligence
- Ask OMEGA a cross-branch question and show the answer from `bsh_multibranch_metrics`.
- "One question, every branch, one answer — without you exporting anything."

## 4:00–4:40 — The trust proof
- Terminal: run a hospital tool as a non-hospital tenant → show the hard rejection
  `{"error":"Tool only available for healthcare_hospital",...}`.
- "Six independent layers enforce that. I'd rather show you than tell you."

## 4:40–5:00 — Call to action
"That's the backend and the AI layer — built and running. The hospital-facing screens
are the next phase, and I'd want to scope those WITH your team so they fit how BSH
actually works. Reply with a 30-minute window and I'll demo it live against your
questions."

---

### Recording notes
- Don't claim Phase 3 UI exists. Frame it explicitly as "next phase, scoped with you."
- Demo data is synthetic — never imply these are real BSH patients.
- If a live trigger is flaky, pre-record the voice clip and narrate over it; do not fake
  a result that didn't happen.
- Caption the gating-proof terminal so it reads even on a phone screen.
