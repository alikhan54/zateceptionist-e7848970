# Cosmique Aesthetics — Status Summary

**Last verified:** 2026-05-19

> Password rotated at 2026-05-19T12:48:37Z — Phase 5d post-build re-verify.
**Tenant slug:** `cosmique`
**Tenant UUID:** `933967dd-1f90-4676-96c1-42a01b6d9835`
**Company:** Cosmique Aesthetics (Dubai med spa, healthcare_clinic)
**Country / Currency / TZ:** UAE / AED / Asia/Dubai
**Subscription:** active, free plan
**Duplicate tenant in DB:** `cosmique-df4dd00d` (UUID `eb22ebbc-…`) — LEAVE ALONE

---

## What's seeded

| Table | Rows | Source |
|---|---:|---|
| `tenant_config` | 1 | Onboarding v5 |
| `business_profiles` | 1 | Onboarding v5 |
| `clinic_patients` | 3 | Onboarding v5 |
| `clinic_products` | 3 | Onboarding v5 |
| `clinic_treatments` | 14 (4 legacy + 10 Phase 2 seed + 1 Phase 2.10 description-append on Botox) | Onboarding v5 + Phase 2 + Phase 2.10 |
| `auto_lead_gen_settings` | 1 (Dubai Aesthetics Daily, `quick_search`, daily 09:00, `auto_sequence=false`) | Phase 2 |
| `marketing_campaigns` | 2 (Welcome Series + HydraFacial Spotlight, both `status=draft`) | Phase 2 |
| `competitor_tracking` | 3 (Kaya, Euromed, Biolite) | Phase 2 |
| `audience_segments` | 3 (All Inquiries, Hot Leads, Past Patients) | Phase 2 |
| `blog_posts` | 1 published (5 Things Before First Botox) | Phase 2 |
| `sequences` | 3 (`420 Hot/Warm/Cold Lead Sequence` — generic sales, not aesthetic-specific) | Onboarding v5 |
| `social_post_queue` | 32, all `status='queued'`, all `error_message IS NULL` | pre-existing (blocked by T16) |
| `lead_signals` | 142 (76 hiring + 66 funding — B2B, not aesthetic-relevant) | pre-existing, out of scope |
| `sales_leads` | not verified this session (recommended: 0 — see below) | — |
| `clinic_medical_reports` | **0** | never used |
| `clinic_video_scripts` | **0** | never used |
| `clinic_medical_review_queue` | **0** | never used |
| `clinic_health_analyses` | **0** | never used |

---

## What's wired in tenant_config

- `industry`: `healthcare_clinic`
- `features`: `{"hr": false, "sales": true, "voice": true, "marketing": true}` — **no `clinic` / `medical` / `healthcare` flag**
- `ai_agent_mode`: `standard` (not omega/hybrid)
- `default_video_voice`: `en-US-ChristopherNeural`
- `default_video_music`: `corporate`
- `video_monthly_budget`: NULL
- SMTP, Google Custom Search, VAPI clone, WhatsApp, Meta tokens: NOT verified this session — assume NOT wired

---

## Phase history

| Phase | What it did | Outcome | Commit |
|---|---|---|---|
| Phase 1 — Pulse query bug fixes | 6 fixes in `usePulseData.ts` (sequences.status, ltv_cac.arr, campaigns table+UUID, competitor_tracking.last_analyzed_at, tenant_integrations.is_active, appointments.scheduled_at) + remove hardcoded hero fallback | shipped | `d9d78c4` |
| Phase 1.6 — Registry petrified-value hotfix | 29 edits in `sectionsRegistry.ts` (19 zate-bleed fallbacks → 0, 4 platform hardcodes corrected, 5 tenant-flavoured subtitles → capability descriptions, 1 interface field added) | shipped, multi-tenant verified zate/cosmique/bbqtonight/mnthalan | `def6ac0` |
| Phase 2 — Cosmique seed | 6 batches into 6 tables (see seed log). Additive-only, transactioned, multi-tenant verified PASS | shipped | (DB only) |
| Phase 2.9 (Part A) — workflow observation | Read-only n8n audit. Cosmique NOT yet present in Part 21 / OMEGA / Marketing executions. Doctor Avatar/Video/Clinic workflows have 0 lifetime executions. | observed, see `COSMIQUE_PHASE2.9_TRIGGER_LOG.md` | n/a |
| Phase 2.10 (Part B) — Botox description APPEND | UPDATE on `clinic_treatments` (1 row, primary-key WHERE) appending premium-tier note. updated_at bumped. Multi-tenant isolation verified PASS (only cosmique touched). | shipped | (DB only) |
| Medical Video investigation | Read-only audit of doctor-avatar / medical-video chain. Identified 3-layer failure (frontend has no player; MuseTalk service broken; chain never exercised). | investigation only, see `COSMIQUE_MEDICAL_VIDEO_INVESTIGATION.md` | n/a |
| Phase 3 — UI/DB alignment audit | Investigated why /clinic/treatments, /marketing/competitors show empty despite seeded data. ROOT CAUSE: RLS — no cosmique-mapped auth user, no master_admin RLS bypass. Frontend tenant-switcher is cosmetic; doesn't propagate to DB session. Also shipped 3 surgical hook fixes (customers table is UUID-keyed). Playwright E2E blocked until RLS unblocked. Feature gap analysis written. | shipped (3 fixes + 2 audit docs) | `f812438` |
| Phase 4 — Auth unlock + real E2E + clinic_patients fix | (1) Created auth user `admin@cosmique.zatesystems.com` via Supabase Admin API, mapped to `tenant_id='cosmique'` in `public.users` + `public.user_roles`. Multi-tenant isolation: PASS. (2) Verified RLS via JWT: 11/11 cosmique-protected tables return seeded rows. (3) Playwright E2E walked 9 routes on the live frontend — 7 PASS (treatments, products, competitors, campaigns, blogs, sequences, dashboard), 1 BUG (clinic/patients), 1 GAP (/pulse 404). (4) Fixed the patients bug: removed `.eq("is_active", true)` filter from `useClinicPatients` — column doesn't exist on the table, was causing silent 400 → empty render. | shipped (1 fix + e2e harness + report) | `86849bf`, `438ab80` |
| Phase 5 — Full route walk (36 routes) + 4 console-error fixes + feature gap v2 | Extended Playwright with `auth.setup.ts` + storageState. Walked 36 cosmique-relevant routes, captured every 4xx network error + console error. Found 6 unique error patterns; fixed 4 (consultations order column, conversation_tags is_active filter, conversations embedded customer select in two files, team_members .single→.maybeSingle). Rewrote COSMIQUE_FEATURE_GAPS.md v2 with corrected verdicts (5 features re-classified from MISSING → BUILT_ELSEWHERE or partial). Multi-tenant: every fix preserves tenant_id filter. | shipped (4 fixes + full audit + gaps v2) | `e196e72`, `1aba41b` |
| Phase 6 — 4 surgical fixes + Patient Profile drill-in + tightened E2E | A.1 SelectItem empty value on /clinic/consultations (Radix). A.2 clinic_consultations interface drift — 8 columns realigned to DB schema (practitioner_name, examination_findings, prescriptions jsonb, report_status, etc.) plus treatment_plan jsonb wrapping. A.3 system_events tenant_id type bug on /marketing/competitors (slug→UUID). A.4 aeo_schema_registry order column (created_at→generated_at; not RLS as originally suspected). NEW: PatientProfile page at /clinic/patients/:patientId with hero card, 5 stat blocks, 5 tabs (Timeline, Care, Photos, Files, Notes), gradient avatar fallback, allergy alert, RLS-safe data fanout. Patients.tsx cards become clickable with keyboard support. Phase 3 Playwright spec uses semantic selectors instead of generic role/row matchers. | shipped (4 fixes + 1 feature + e2e spec) | `d7e46c8`, `3cf483d`, `1ad4152`, `25ac3dc` |
| Phase 7 — 12-feature clinical+platform E2E verification | ⚠️ **RETRACTED in Phase 8** — the "10 of 12 PASS" verdicts were based on screenshot review without clicking Save / Submit. See Phase 8 row for the corrected verdicts. | partial (docs + spec shipped, verdicts wrong) | `f1764b0` |
| Phase 8 — Phase 4a-FIX (recovery): client-reported bugs + new testing methodology | The cosmique client reported "Cannot add department" + "OMEGA always shows same thing". Diagnosed root causes: (Bug #1) Add Department form sent `manager_id: ""` to a UUID column → 22P02; (Bug #2) OMEGA cathedral input was a hardcoded `runDemoCycle()` typing the same `DEMO_TRANSCRIPT` regardless of user input. Action-level re-audit of Phase 7's "10 PASS" found 3 MORE silent-failure bugs: (Bug #3) Add Appointment missing legacy NOT NULL columns `appointment_date` + `start_time` → 23502; (Bug #4) Phase 3 PatientProfile prescriptions interface referenced columns that don't exist (real schema uses `medicines` jsonb + `prescribed_by`). All 4 fixes round-tripped via REST INSERT against live Supabase with the cosmique admin JWT — 201 Created confirmed for each. Also shipped permanent `E2E_TESTING_RULES.md` — an 8-step PASS gate (navigate → click → fill → submit → assert 2xx → assert DB → assert UI → test error path) so this class of screenshot-only PASS verdict never happens again. | shipped (4 fixes + methodology + retraction) | `3aacd82`, `b0b34f1`, `26a84c6`, `93e0608` |
| Phase 9 — 20-workflow audit (8-step gate applied) | Ran the user's 20 cosmique workflows through the new E2E_TESTING_RULES gate against the live `1d90a123` build (which includes all Phase 3 + Phase 4a-FIX commits). Result: **16 REAL_PASS, 4 READ_PASS, 0 BROKEN**, with 2 workflows flagged INFRA_GATED (W1 WhatsApp inbound + W9 medical report upload — both n8n webhook paths reachable from real browsers; gated by Meta tokens / MuseTalk fix respectively). Confirmed all 4 Phase 4a-FIX bugs are live and working end-to-end: Add Department succeeds with manager blank, Add Appointment succeeds with all required cols, Add Prescription succeeds with correct schema, OMEGA returns DIFFERENT real responses to different questions (browser-UA spoof verified the wire). Multi-tenant cleanup verified — every INSERT test row deleted, every UPDATE restored. Zero new fixes needed this phase. | shipped (audit + verification report) | (docs only) |
| Phase 14 — Phase 5d Session B: 4 ops builds (Method A only mandate) — **4/4 REAL_PASS** | Shipped 4 additive builds for the Operations Sprint: **J12 Adjust pharmacy stock** (dialog with +/- increment + reason on Products.tsx — wired onto the existing `updateStock` mutation); **J13 Edit treatment pricing** (dialog on Treatments.tsx — wired onto `updateTreatment`); **J15 Export patient CSV** (Blob+anchor download next to Add Patient on Patients.tsx); **OMEGA progress hint** (animated dots in state pill + "consulting the brain — 30–90s" subtitle in ParticleSphereShell.tsx). All 4 are additive, TypeScript-clean. Pre-flight grep found J11b already shipped (Add Team Member wizard at Employees.tsx:132). Phase 5d e2e spec is strict Method A — every PASS verdict requires a real UI button click → REST DB readback → DOM update assertion → multi-tenant gate → screenshot. **Post-Lovable-Publish run on 2026-05-19: J12 REAL_PASS (stock 25→26→reverted 25, UI poll caught refetch), J13 REAL_PASS (Lip Filler 2500→2501→reverted 2500), J15 REAL_PASS (3 cosmique patients exported, all tenant_id verified), OMEGA progress REAL_PASS (MutationObserver caught the hint element render — the warm-cache thinking state was too brief for polling, but the hint DOM mutation is recorded). Spec hardening commit `799fa00` follows the 3-fix budget: waitForSelector for slow loads, expect.poll for React Query refetch lag, MutationObserver for transient render.** Cosmique stock leak (Vitamin C Serum 25→26 from a failed mid-iteration run) reverted. Multi-tenant gate PASS — all touched rows verified tenant_id=cosmique. 7 commits pushed to origin/main. | shipped + verified | `46d4c75, a011379, 6f0ba07, 93afd16, 241d8a7, e2d5f04, 799fa00` |
| Phase 13 — Phase 5c: MEDICA tool-call fix + Ollama model upgrade | Two LangGraph fixes baked into `langgraph-agents-langgraph-agents:latest` image. **(A) MEDICA fix:** `patient_analytics` in `tools/healthcare_tools.py` selected `is_active` on `clinic_patients` — that column doesn't exist (same schema bug we fixed for the frontend in Phase 1). PostgREST 400 → `{"error": "...url..."}` → model hallucinated "URL format issue" as text. Removed the column from the SELECT; tool now returns `{"patients": {"total": 3, "active": 3}}` for cosmique. **(B) Model upgrade:** `get_llm()` in `agents/graph.py` flipped Ollama priority from hermes3:8b to qwen2.5:7b (already pulled; fits in 8GB VRAM; 14b deferred — sets via `OLLAMA_PRIMARY_MODEL` env var when VRAM allows). Anthropic/OpenAI fallback untouched. **Result vs Phase 5b:** "What does this company do?" → "premier healthcare clinic specializing in advanced skincare" (was "comprehensive business solutions / lead-generation campaign"). "Do you have HydraFacial?" → real answer (was "URL format" hallucination). "What treatments?" → lists M-ounjaro/HIFU/MNRF/HydraFacial MD/Laser (was "no pending review queue"). **Cross-tenant regression PASS:** bbqtonight, zateceptionist, autoboost — zero cosmique leakage; each tenant gets their own industry context. Open issues queued: NEXUS occasionally routes patient-count questions to CORTEX instead of MEDICA; "M-ounjaro" typo in prompt; qwen2.5:14b when VRAM allows. | shipped (2 fixes + image rebuild) | (langgraph-agents not git; image: langgraph-agents-langgraph-agents:latest) |
| Phase 12 — Phase 5b: OMEGA agent context fix | User reported OMEGA gave a generic sales-flavored response to "what does this company do?" against cosmique. Root cause confirmed CAUSE_A: Onboarding v5 wrote all 21 rows of agent context (7 agent_contexts + 1 business_profiles + 13 knowledge_base) to the DUPLICATE tenant slug `cosmique-df4dd00d`, not the real `cosmique`. The real tenant had ZERO rows in those three tables. `get_agent_context('cosmique', 'OMEGA')` returned 0 rows → agent fell back to the generic hardcoded prompt in definitions.py. **Fix:** copied 21 rows (additive INSERT only) from duplicate to real cosmique slug — duplicate untouched, all other tenants untouched. Multi-tenant gate: PASS. Container restarted to clear `_KB_CACHE`. **Verification:** infrastructure correct (inside-container RPC returns the 3070-char COSMIQUE Aesthetics prompt); OMEGA response now mentions "Cosmique" by name + pulls real cosmique data, but framing still partly sales-flavored due to hermes3:8b model limit (CLAUDE.md T29 known). Cross-tenant regression on bbqtonight: PASS (no leak). Separate MEDICA tool-call bug surfaced and queued for Phase 5c. Zero code/workflow modifications. | shipped (DB-only additive fix + report) | (DB only) |
| Phase 11 — Phase 5a Session A: 6 patient-flow builds (8-step gate) | Shipped 6 builds closing Phase 4b's NEEDS_BUILD list: J8 Add Prescription UI (new component + new mutation on PatientProfile Care tab), J10 Mark Consultation Complete (wired the existing updateConsultation hook to a per-row button), J3 Reschedule Appointment (new dialog + multi-column PATCH matching Phase 4a-FIX 26a84c6 INSERT pattern), J4 per-row Cancel (already built — added stable testid; later extended to list-view dropdown), Department name required validation (client-side gate; surfaced after Phase 4b found 2 blank-name leaks), plus data-testid attributes on high-traffic surfaces. 9 commits, 842 lines added. **All 6 confirmed REAL_PASS end-to-end via Phase 5a Playwright spec against live `ad7f0b04` build (J3+J4 confirmed post-deploy after `60ed6b6` rolled).** Pre-flight grep saved real work — J4 was already shipped, J10 hook was 80% done. Empty-state CTA gap + list-view dropdown parity gap both surfaced by e2e and fixed inline. Multi-tenant gate PASS, cleanup verified (6 leak rows removed). Zero regressions in Phase 1–4a-FIX shipped files. | shipped (6 builds + spec + report) | `d5c78cc, c0c541b, 86e1556, f951f46, ac8c8f2, fc05143, f22d88d, 60ed6b6` |
| Phase 10 — Phase 4b: 20 user-journey real e2e (Method A + B) | Walked 20 user journeys with full Playwright UI click-+-fill flow + browser-direct fetch for OMEGA. Live `c1f84828` deployment. **Honest verdicts: 6 REAL_PASS + 1 REAL_PASS_BROWSER_DIRECT (J20 OMEGA — verified 200 OK browser fetch in 62s, real 510-char MEDICA response) + 2 READ_PASS + 2 BLOCKED_ON_INTEGRATION (J1 WhatsApp / J9 medical report) + 8 NEEDS_BUILD (J3 Reschedule, J4 Cancel, J8 Add Prescription, J10 Mark complete, J11b Add team member, J12 Adjust stock, J13 Update treatment price, J15 Export CSV) + 2 BROKEN_UI (J6 + J7 test-harness selector false positives).** All 4 Phase 4a-FIX bugs confirmed live in production (J11a Add Department with manager blank ✓; J20 OMEGA returns real different responses ✓). Multi-tenant cleanup: removed 3 leak rows (2 empty-name hr_departments from this phase + 1 W2 appointment Phase 9 leftover). Zero TEST_CC_PHASE4B_ rows remain. Zero code fixes applied this phase — cap-5 unused because the backlog is feature builds, not bug fixes. | shipped (audit + report + spec) | (docs only) |

---

## Pending — user action

- [ ] **SMTP credentials** in `tenant_config` — unlocks marketing email send + lead nurture (gated by T20 Scenario D risk: never write secrets during sustained pooler latency)
- [ ] **Google Custom Search API + CX** — unlocks Part 21 (Enrichment) + Part 35 (AutoLeadGen). Open ticket T17 (pool keys 1-5 missing this API)
- [ ] **VAPI assistant clone** for Cosmique (clinic vertical) — gated on open ticket T36 (VAPI webhook tenant-resolution drift must be fixed first; webhooks 71.2 + VOB.2 + 71R.2 still have hardcoded fallbacks)
- [ ] **WhatsApp Business API** — gated on Meta App Review for Cosmique's WABA
- [ ] **Meta Page + Instagram tokens** — gated on Meta App Review. This is also what causes the 32 stuck `social_post_queue` rows.
- [ ] **Reconcile clinic_treatments pricing** — legacy 4 rows (Botox 1800, Hydrafacial 900, Lip Filler 2500, Chemical Peel 1200) coexist with Phase 2 lower-tier rows (Botox per area 399, Botox 3-area 999, HydraFacial Package 1299). Phase 2.10 added a premium-tier note to the legacy Botox row to disambiguate; pricing strategy decision still open.
- [ ] **Upload PNG doctor avatar** to Supabase Storage at `media/avatars/cosmique/doctor.png` (or similar) so MuseTalk has a per-tenant source image
- [x] ~~Trigger Lovable Publish~~ — done 2026-05-19. Phase 5d builds verified 4/4 REAL_PASS post-publish.
- [x] ~~Rotate password for `admin@cosmique.zatesystems.com`~~ — rotated 2026-05-19T12:48:37Z; Phase 5d e2e now using new credential.

---

## Pending — engineering action

- [x] **🟢 RESOLVED: RLS unblocked for cosmique (Phase 4)** — new auth user `admin@cosmique.zatesystems.com` mapped to `tenant_id='cosmique'`. JWT-scoped reads now return all seeded rows (11/11 tables verified). Multi-tenant isolation PASS.
- [ ] **Build patient-facing video player** — new hook `useVideoScripts`, new component `DoctorAvatarVideoPlayer`, new route or expanded view in `HealthReports.tsx`. Currently NO frontend component renders the doctor avatar video result. See `COSMIQUE_MEDICAL_VIDEO_INVESTIGATION.md` Step 4.
- [ ] **Fix MuseTalk service** (port 8126) — `huggingface-hub` version pin, restore missing model files (`dwpose/dw-ll_ucoco_384.pth`, `musetalk/config.json`), install `mmpose`. Container currently crash-looping on imports.
- [ ] **Per-tenant doctor avatar** — `D:/420-system/video-service/server.py:35-37` hardcodes `zateceptionist/adeel.png`. Either add `tenant_config.features.doctor_avatar_url` or a dedicated column.
- [ ] **Realtime subscription** on `clinic_video_scripts` in the frontend so patient gets auto-notified when video ready
- [ ] **Verify upload reaches webhook** — Doctor Avatar n8n workflow `lhdU0HUxmdgSSDpD` has zero lifetime executions. Either webhook is unreachable, never clicked, or failing silently.
- [ ] **(optional) Promote aesthetic-relevant `lead_signals` → `sales_leads`** so Part 21 has cosmique inventory to process on next 15-min tick. Most of the 142 signals are B2B and unsuitable; would need filtering.
- [ ] **Build missing clinic features** — see `COSMIQUE_FEATURE_GAPS.md`. Top priorities: patient profile (drill-in), booking calendar, consent forms UI.

---

## DO NOT TOUCH (preserve)

**Sacred workflows** (do not modify nodes):
- `E8HZhv4y4MRb6n9F` (Marketing v2.6, 552 nodes)
- `aTGIlVgvf6lUWHlW` (Sales Part 1 v5.8, 407 nodes)
- `TXeVEskxcLuLwplr` (Communications v3.8, 378 nodes)
- `dEgqwQ7YDm4i7706` (Main v2.1, 514 nodes)
- `fvXs1Z94tvje0QfY` (Video Intelligence Orchestrator)
- `Gnk01auPc9WLYIJU` (Estimation v1.0)
- `0CgtzVNs8zBWEFjg` (OMEGA Campaign Executor)
- `cLTvu6oghz9B5p0z` (OMEGA Daily Briefing)
- `5ZRNaT9BMmbSRj5v` (OMEGA Lead Gen Async)

**Already shipped, do not touch:**
- `frontend/src/components/omega/v3/nav/usePulseData.ts`
- `frontend/src/components/omega/v3/nav/sectionsRegistry.ts`

**BBQ Ops session territory** (potentially unpushed commits):
- `frontend/src/components/NavigationSidebar.tsx`
- `frontend/src/pages/operations/{AgentNetwork,Budgets,PurchaseOrders,Shipments,OpsCommandCenter}.tsx`
- `frontend/src/lib/formatCurrency.ts`

**Onboarding v5 work** (do not regenerate):
- `tenant_config` row for cosmique
- `business_profiles` row for cosmique
- 3 sequences (Hot/Warm/Cold Lead Sequence)
- 3 clinic_patients, 3 clinic_products

**Duplicate tenant** `cosmique-df4dd00d` (UUID `eb22ebbc-…`): leave alone.

---

## Key open tickets affecting Cosmique

- **T17** (NEEDS-USER-ACTION) — 5 pool Google Custom Search keys missing Custom Search API. Cosmique's lead gen sits idle until enabled.
- **T16** (NEEDS-USER-ACTION) — Meta `pages_manage_posts` scope missing. 32 cosmique `social_post_queue` rows can never publish.
- **T20** (OPEN) — Supabase ap-southeast-1 sustained latency degradation (Scenario D). NEVER write secrets during this state. Checked at session start (latency 335ms — safe).
- **T36** (OPEN — BLOCKER for non-zate VAPI clones) — VAPI webhook tenant-resolution drift in clinic-tools, omega-bridge, realestate-tools. Must fix before deploying a VAPI clone for cosmique (clinic vertical). Currently inbound voice calls to cosmique would silently mis-route to zate.

---

## Reference docs

- `D:/420-system/frontend/docs/COSMIQUE_PHASE2_SEED.md` — Phase 2 batch-by-batch seed log
- `D:/420-system/frontend/docs/COSMIQUE_PHASE2.9_TRIGGER_LOG.md` — Phase 2.9 workflow observation
- `D:/420-system/frontend/docs/COSMIQUE_MEDICAL_VIDEO_INVESTIGATION.md` — doctor avatar / medical video chain failure analysis + recommended fix path
- `D:/420-system/frontend/docs/COSMIQUE_UI_AUDIT.md` — **Phase 3**: empty-data root cause (RLS), recommended remediation paths, why Playwright is blocked
- `D:/420-system/frontend/docs/COSMIQUE_FEATURE_GAPS.md` — **Phase 3**: what's live, what's stub, what's missing for clinic launch readiness
- `D:/420-system/frontend/docs/COSMIQUE_PHASE1_E2E_REPORT.md` — **Phase 4**: route-by-route Playwright verdicts + screenshots + the clinic_patients fix
- `D:/420-system/frontend/docs/COSMIQUE_PHASE2_REPORT.md` — **Phase 5**: 36-route walk + 6 console-error patterns classified + 4 fixes shipped + Phase 3 queue
- `D:/420-system/frontend/docs/COSMIQUE_PHASE3_REPORT.md` — **Phase 6**: 4 surgical fixes (consultations interface drift, system_events UUID, aeo order column, Select.Item) + Patient Profile drill-in feature build + Phase 3 e2e spec
- `D:/420-system/frontend/docs/COSMIQUE_PHASE4a_VERIFICATION.md` — **Phase 7** (retracted): 12-feature screenshot review; verdicts incorrect — see Phase 8 for action-level audit
- `D:/420-system/frontend/docs/COSMIQUE_PHASE4a_FIX_REPORT.md` — **Phase 8**: 4 client-reported / silent-failure bugs diagnosed + fixed (Add Department, OMEGA, Add Appointment, prescriptions schema). Retracts Phase 7 verdicts. Includes Phase 4b + Phase 5 queues
- `D:/420-system/frontend/docs/E2E_TESTING_RULES.md` — **Permanent**: 8-step PASS gate that all future E2E specs must follow. Established after Phase 4a's screenshot-only methodology produced 5 false PASS verdicts.
- `D:/420-system/frontend/docs/COSMIQUE_PHASE9_20WORKFLOWS_AUDIT.md` — **Phase 9**: 20-workflow audit under the 8-step gate. 16 REAL_PASS + 4 READ_PASS + 0 broken. All Phase 4a-FIX bugs confirmed live and working.
- `D:/420-system/frontend/docs/COSMIQUE_PHASE5c_MEDICA_FIX_REPORT.md` — **Phase 13**: MEDICA tool-call fix (clinic_patients.is_active phantom column) + Ollama model upgrade hermes3→qwen2.5:7b. Dramatic prompt-grounding improvement; cross-tenant isolation verified.
- `D:/420-system/frontend/docs/COSMIQUE_PHASE5b_OMEGA_FIX_REPORT.md` — **Phase 12**: OMEGA agent context fix. CAUSE_A: 21 rows of context were on the duplicate tenant slug. Additive INSERT copied to real cosmique slug. OMEGA now loads the COSMIQUE Aesthetics prompt; response quality bounded by hermes3:8b model (T29).
- `D:/420-system/frontend/docs/COSMIQUE_PHASE5a_SESSION_A_REPORT.md` — **Phase 11**: 6 patient-flow builds (J8 Add Prescription, J10 Mark complete, J3 Reschedule, J4 Cancel testid, dept name validation, testids). **All 6 confirmed REAL_PASS** end-to-end against deployed `ad7f0b04` build.
- `D:/420-system/frontend/docs/COSMIQUE_PHASE4b_REPORT.md` — **Phase 10**: 20 user journeys with Method A (Playwright UI flow) + Method B (REST). 6 REAL_PASS + 1 REAL_PASS_BROWSER_DIRECT (OMEGA) + 2 READ_PASS + 2 BLOCKED_ON_INTEGRATION + 8 NEEDS_BUILD + 2 BROKEN_UI (test-harness selector false positives). Phase 5 build backlog prioritized.
- `D:/420-system/CLAUDE.md` — full system architecture, tenant ID rules, sacred workflows, open tickets
- `D:/420-system/CLAUDE_RESOLVED.md` — resolved tickets archive (full pooler recipe, engagement responder details, T34/T35 history)
- `D:/420-system/frontend/docs/PULSE_REGISTRY_HISTORY.md` — NOT FOUND at session start (was referenced in handover but does not exist on disk; Phase 1 + 1.6 history captured in this status doc instead)
