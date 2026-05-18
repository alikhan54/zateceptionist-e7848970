# Cosmique Aesthetics — Status Summary

**Last verified:** 2026-05-18
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

---

## Pending — user action

- [ ] **SMTP credentials** in `tenant_config` — unlocks marketing email send + lead nurture (gated by T20 Scenario D risk: never write secrets during sustained pooler latency)
- [ ] **Google Custom Search API + CX** — unlocks Part 21 (Enrichment) + Part 35 (AutoLeadGen). Open ticket T17 (pool keys 1-5 missing this API)
- [ ] **VAPI assistant clone** for Cosmique (clinic vertical) — gated on open ticket T36 (VAPI webhook tenant-resolution drift must be fixed first; webhooks 71.2 + VOB.2 + 71R.2 still have hardcoded fallbacks)
- [ ] **WhatsApp Business API** — gated on Meta App Review for Cosmique's WABA
- [ ] **Meta Page + Instagram tokens** — gated on Meta App Review. This is also what causes the 32 stuck `social_post_queue` rows.
- [ ] **Reconcile clinic_treatments pricing** — legacy 4 rows (Botox 1800, Hydrafacial 900, Lip Filler 2500, Chemical Peel 1200) coexist with Phase 2 lower-tier rows (Botox per area 399, Botox 3-area 999, HydraFacial Package 1299). Phase 2.10 added a premium-tier note to the legacy Botox row to disambiguate; pricing strategy decision still open.
- [ ] **Upload PNG doctor avatar** to Supabase Storage at `media/avatars/cosmique/doctor.png` (or similar) so MuseTalk has a per-tenant source image

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
- `D:/420-system/CLAUDE.md` — full system architecture, tenant ID rules, sacred workflows, open tickets
- `D:/420-system/CLAUDE_RESOLVED.md` — resolved tickets archive (full pooler recipe, engagement responder details, T34/T35 history)
- `D:/420-system/frontend/docs/PULSE_REGISTRY_HISTORY.md` — NOT FOUND at session start (was referenced in handover but does not exist on disk; Phase 1 + 1.6 history captured in this status doc instead)
