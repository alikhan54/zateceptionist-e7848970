# BSH-HMS — Demo Rehearsal Checklist

> **Status:** the readiness checklist that gates the live demo. Rehearses **exactly** the 4 acts in
> `BSH_DEMO_SCRIPT.md`; answers come from `BSH_PITCH_TALKING_POINTS.md`; the system must already be at
> **P9/LIVE** per `BSH_AMD_DEPLOY_DAY_PLAN.md` before T-24h checks mean anything.
>
> Labels: `[VERIFIED]` = confirmed this session; `[CHECK]` = verify on the day; `[RISK]` = known
> failure mode to rehearse against; `[estimate]` = unmeasured.

---

## 0. Pre-verified this session (don't re-litigate, just confirm still true) `[VERIFIED]`

- **Seeded doctor names match the demo script.** `scripts/bsh-demo-data/doctors.json` →
  BSH-DR-001 **Md. Saiful Rahman / Cardiology**, BSH-DR-002 **Farzana Begum / Internal Medicine**,
  BSH-DR-003 Nazmul Hasan / Pediatrics, BSH-DR-004 Tahmina Akhter / General Surgery,
  BSH-DR-005 Rezaul Karim / Pathology. The Act 1 names the presenter says are **safe**.
- **Fixtures are deterministic** (`random.seed(420)`) → byte-stable; what you rehearse against is
  what the demo shows.
- **Migrations 37/38/39 live; `bsh-demo` row exists; 12 workflows tagged.** (Sections 1–2.)

---

## 1. T-24h — full dress rehearsal `[CHECK]`

Run the **entire** demo once, end to end, the day before. Catch breakage while there's time to fix.

### 1a. Backend / data is live
- [ ] `bsh-reconciliation-selfcheck.sh` → **PASS**.
- [ ] `tenant_config` `bsh-demo`: industry=`healthcare_hospital`, **subscription_status=`active`**,
      `bahmni_base_url` populated (loopback). The demo script's Act 0 `SELECT * FROM hospital_tenants`
      should return **1 row** — **`[CHECK]` confirm that view/table exists** (created by mig 37/38;
      if the query errors, use `tenant_config` directly and update the demo script).
- [ ] Bahmni FHIR 200 at `:8080`; patients + appointments visible in the Bahmni UI.
- [ ] 12 BSH workflows `active=true` (T19 — verify persisted, not just toggled).
- [ ] 3 services `/health` 200 (9101/9102/9103).

### 1b. Rehearse the 4 acts (from `BSH_DEMO_SCRIPT.md`)
- [ ] **Act 1** (your hospital): dashboard as BSH staff user; department list + 5 consultants +
      Bangladeshi patient list all render with the **seeded** data.
- [ ] **Act 2** (Bangla intake) `[RISK]`: a real inbound VAPI call books a cardiology appointment
      **and it lands in the schedule**; then the WhatsApp/Comm-v3.8 path books from
      "ডাক্তার দেখাতে চাই". **This is the wow — rehearse it twice.**
- [ ] **Act 3** (reads the chart): MEDICA summarises a patient with an **abnormal lab** and cites the
      actual values; OMEGA answers a cross-branch question from `bsh_multibranch_metrics`.
      **`[CHECK]` confirm the patient you'll pull up actually has an abnormal lab seeded**, and that
      `bsh_multibranch_metrics` has rows to answer from (else Act 3 falls flat).
- [ ] **Act 4** (provable isolation): hospital tool vs `cosmique` → hard reject
      (`Tool only available for healthcare_hospital`); `INSERT` into `bsh_multibranch_metrics` for a
      non-hospital tenant → trigger raises `restricted to healthcare_hospital tenants`. Both must fire
      **live** (this is the trust moment).

### 1c. The 5 VAPI acceptance tests (from `BSH_VAPI_ASSISTANT_CONFIG.md` §6)
- [ ] 1 Bengali booking happy-path → SMS confirm sent.
- [ ] 2 English reschedule → SMS confirm.
- [ ] 3 Industry-gate reject (non-hospital tenant_id) → polite reject, **no Bahmni side effects**.
- [ ] 4 Out-of-scope medical ("my chest hurts") → refuses advice, **transfers to human**.
- [ ] 5 Identity ("are you a real person?") → discloses **"I'm an AI assistant."**
- [ ] +120s auto-transfer; **+Bengali TTS intelligibility confirmed by a native listener** `[RISK]`.

### 1d. Smoke + regression
- [ ] `bsh-e2e-smoke.sh` Flows A–E all return expected data.
- [ ] **Cosmique baseline line unchanged** (no cross-tenant regression) — do **not** skip.
- [ ] **`[CHECK]`** smoke Flow C uses `BSH-DEMO-001`; confirm that literal HN exists in the seed (the
      generator uses the `BSH-{year}-{seq}` format) — if not, adjust the smoke/demo to a real HN.

### 1e. Fallbacks staged
- [ ] **Record a clean screen-capture of Act 2** (the live call) as the bandwidth/cold-brain fallback
      — the demo script explicitly calls for this. `BSH_LOOM_SCRIPT.md` is the recording guide.
- [ ] Confirm `BSH_FOLLOWUP_EMAILS.md` drafts are ready to send post-demo.

---

## 2. T-2h — final pre-flight `[CHECK]`

- [ ] **Warm the local models:** `scripts/pre-demo-warmup.ps1` (hermes3:8b + qwen2.5:7b). `[RISK]`
      cold load on the 8 GB GPU is the classic "timeout" (T27/T29) — warm + `keep_alive`.
- [ ] Re-run `bsh-e2e-smoke.sh` once more; re-confirm Cosmique baseline.
- [ ] Open the **three tabs** (420 dashboard as BSH staff / Bahmni clinical UI / terminal for gating
      proof) and the gating-proof command pre-typed but not run.
- [ ] One more **live Bangla test call** end-to-end (intelligibility + booking lands). `[RISK]`
- [ ] Network: confirm the 4 `*.zatesystems.com` BSH hostnames resolve; VAPI phone number rings.
- [ ] Fallback recording open in a hidden tab; know the keystroke to switch to it.
- [ ] Silence notifications; full-screen; check mic/audio for the voice demo.

---

## 3. During the demo — live watch + fallback triggers

| Act | Watch for | If it breaks |
|---|---|---|
| 1 | data renders; correct names | refresh once; else narrate from a screenshot |
| 2 `[RISK]` | call connects, Bangla is intelligible, booking **lands in schedule** | **switch to the recorded clip** — do not fight a cold brain on camera |
| 3 | MEDICA cites real lab values; OMEGA returns a cross-branch number | if the brain stalls, fall back to a pre-run transcript; keep moving |
| 4 | the reject + the trigger error both fire | if one fails, show the other — both prove the same point |

- **Golden rule:** the moment Act 2 looks shaky, cut to the recording. A smooth recording beats a
  stuttering live call. The point is the capability, not the bravado.
- **Pace:** ~20 min across 4 acts + 1 min close; leave room for Q&A (use the pitch points).

---

## 4. Post-demo (same session)

- [ ] Stop sharing; transition to Q&A with `BSH_PITCH_TALKING_POINTS.md` (the 10 honest answers).
- [ ] Capture every question asked — especially anything you couldn't answer.
- [ ] Send the follow-up email (`BSH_FOLLOWUP_EMAILS.md`) with the agreed next step (pilot scoping).
- [ ] Log the outcome + objections so the pilot scope reflects what they actually pushed on.
- [ ] **Ops:** confirm the first **nightly encrypted backup** ran (hardening §3) — day-1 PHI (even
      synthetic now, real in pilot) must not sit unbacked.

---

## 5. Honesty guardrails (do NOT cross these on camera) `[from demo script]`

- **Do not show a hospital-facing UI screen that doesn't exist.** Phase 3 frontend (`/hospital/*`) is
  **not built** — the demo surface is Bahmni's own UI + voice + OMEGA chat. Say "Phase 3 is the
  hospital-facing UI, which we'd scope with your team" — never imply finished screens.
- **The demo data is synthetic** (`scripts/bsh-demo-data/`), not real patients — say so if asked.
- **Bahmni is open-source; we integrate via REST/FHIR, we did not fork it.** This is the transparency
  play (pitch points), not a weakness to hide.
- **Don't quote a pilot timeline you can't defend** (pitch Q9/Q10).

---

## 6. Risk register for the demo `[RISK]`

| Risk | Likelihood | Mitigation (rehearsed) |
|---|---|---|
| Bengali TTS/ASR unintelligible | **high — #1 risk** | verify with native listener T-24h + T-2h; recorded fallback |
| Cold brain / model timeout | medium | `pre-demo-warmup.ps1`; `keep_alive`; recorded Act 2 |
| Bahmni slow/down (contended 32 GB box) | medium | rehearse on the real box; heap caps (hardening §8); screenshots |
| `bsh_multibranch_metrics` empty → Act 3/4 weak | medium | confirm rows seeded T-24h |
| `BSH-DEMO-001` / `hospital_tenants` mismatch | low–med | the two `[CHECK]`s in §1 catch these the day before |
| Live call drops bandwidth | medium | recorded clip is the explicit fallback |
| Cross-tenant regression doubt | low (structurally gated) | the live Cosmique baseline in smoke is the proof |

**Bottom line:** the only demo-day variables that aren't already structurally solved are **voice
quality** and **brain warmth** — both have a rehearsed fallback (the recording). Everything else is a
checklist item, not a gamble.
