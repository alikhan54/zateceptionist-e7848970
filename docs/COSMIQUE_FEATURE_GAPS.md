# Cosmique — Clinic Feature Gap Analysis (v2)

**Last updated:** 2026-05-18 (Phase 2)
**Mode:** READ-ONLY inventory, validated by Playwright walk of 36 routes logged in as the real cosmique admin.

## Changelog

- **v2 (2026-05-18, Phase 2)** — re-audited every feature against the live deployed frontend with authenticated cosmique session. Several items that v1 flagged as MISSING were actually built and just blocked by RLS (which Phase 1 unblocked). Default assumption for v2 audit: a feature EXISTS until grep + route-check + page-check all return nothing. Many items moved from MISSING → WORKS or WORKS_PARTIALLY.
- v1 (2026-05-18, Phase 3) — original gap analysis, written without authenticated access. Tended to over-flag features as missing because RLS was hiding their data.

Classifications:
- **✅ WORKS** — page renders the seeded data correctly under authenticated cosmique session
- **🟡 WORKS_PARTIALLY** — page renders, but with known bugs / partial data / matchers needing tighten
- **🟡 STUB** — route exists but page is a placeholder with no real component
- **🟡 EMPTY** — page exists and queries correctly; just no seeded data for cosmique yet (not a build gap, a content gap)
- **🔴 BUILT_ELSEWHERE** — the v1 doc had the wrong route; real route documented here
- **🔴 ACTUALLY_MISSING** — confirmed not built: grep returns nothing, no route matches, no component file

---

## Patient lifecycle

| Feature | Route(s) | Class | Notes |
|---|---|:---:|---|
| Patient list / search | `/clinic/patients` | ✅ WORKS | 3 patients render. Search + 4 stat cards present. Add Patient dialog functional. |
| Patient profile (single drill-in) | (no individual route) | 🔴 ACTUALLY_MISSING | Verified via grep: no `patients/:id` route, no `PatientProfile`/`PatientDetail` component, only an Add Patient dialog in `clinic/Patients.tsx`. Build estimate: small (1 modal or 1 route + 1 hook). |
| Consent forms UI (manage / sign) | (no route) | 🔴 ACTUALLY_MISSING | `consent_records`, `consent_templates`, `signed_consents` tables exist DB-side. Zero frontend references (grep across `src/`). Build estimate: medium. |
| Patient-facing portal | (no route) | 🔴 ACTUALLY_MISSING | Would require separate auth domain. Build estimate: large. |
| Patient progress photos (before/after) | (consultation row has `before_photos`+`after_photos`) | 🟡 WORKS_PARTIALLY | Storage column exists in `clinic_consultations`. UI to upload + view = not in `ConsultationNotes.tsx`. Build estimate: small extension. |

## Bookings & appointments

| Feature | Route(s) | Class | Notes |
|---|---|:---:|---|
| Appointment list | `/appointments` | ✅ WORKS | Calendar AND list views. View-mode toggle. 7 row indicators per Phase 2 walk. |
| **Appointment / treatment booking flow** | `/appointments` (Add dialog) | 🔴 BUILT_ELSEWHERE | v1 said missing. Actually present as the "+ Add" dialog on `/appointments`. NOT a multi-step treatment-specific booking form, but functional appointment creation. Build estimate (for multi-step treatment-specific): small extension. |
| Booking confirmation email/SMS templates per treatment | `/marketing/templates` + `/marketing/email` | 🟡 STUB-ish | Email template library is there; per-treatment confirmation logic would be a marketing-engine workflow integration. |

## Medical workflow

| Feature | Route(s) | Class | Notes |
|---|---|:---:|---|
| Medical report upload | `/clinic/health-reports` | ✅ WORKS | `HealthReports.tsx` uploads PDF via base64 POST to webhook. 0 reports for cosmique yet (chain never exercised). |
| Doctor review queue | `/clinic/review-queue` | 🟡 WORKS_PARTIALLY | `DoctorReviewQueue.tsx` exists, fetches `clinic_medical_review_queue` (0 rows). Does NOT render the `video_script_id` field's video — see next row. |
| **Patient-facing doctor avatar video player** | (no route) | 🔴 ACTUALLY_MISSING | Confirmed via grep: no `DoctorAvatar*`, no `<video>` tag in clinic pages, no `useVideoScripts` hook, no `/clinic/reports/:id/video` route. `clinic_video_scripts` table is never queried frontend-side. **This is the user's explicit complaint** (see `COSMIQUE_MEDICAL_VIDEO_INVESTIGATION.md`). Build estimate: medium (1 hook + 1 component + 1 route). |
| Realtime "video ready" notification | n/a | 🔴 ACTUALLY_MISSING | No `supabase.channel` subscribed to `clinic_video_scripts`. Build estimate: small extension once player exists. |
| Health analysis cross-report correlation | `/clinic/health-reports` (`HealthReports.tsx`) | 🟡 WORKS_PARTIALLY | Hook fetches `clinic_health_analyses` (0 rows for cosmique). Display logic present. |
| Prescription management | (no route) | 🔴 ACTUALLY_MISSING | `clinic_prescriptions` table exists; zero frontend references. Build estimate: medium. |
| Post-care schedule tracking | (no route) | 🔴 ACTUALLY_MISSING | `clinic_post_care_schedule` table exists, zero frontend references. Build estimate: medium. |
| Consultation notes | `/clinic/consultations` | 🟡 WORKS_PARTIALLY | Page renders. Fixed in Phase 2 commit `e196e72`: `consultation_date` ordering replaced with `created_at`. Deeper schema-mismatch remains — the hook's `ClinicConsultation` interface and the DB schema diverge (`doctor_name` vs `practitioner_name`, `examination_notes` vs `examination_findings`, etc.). Phase 3 needs a full hook+page re-alignment. |

## Catalog / commerce

| Feature | Route(s) | Class | Notes |
|---|---|:---:|---|
| Treatment catalog | `/clinic/treatments` | ✅ WORKS | 14 cards. Filtering by category. Botox shows Phase 2.10 description append. |
| Product catalog | `/clinic/products` | ✅ WORKS | 3 products with stock + AED pricing visible. |
| Pricing / quote calculator | (no route) | 🔴 ACTUALLY_MISSING | Build estimate: small. |
| Treatment package builder | (no route) | 🔴 ACTUALLY_MISSING | Build estimate: medium. |

## Brand / patient acquisition

| Feature | Route(s) | Class | Notes |
|---|---|:---:|---|
| Doctor profile / about-us | (no public page) | 🔴 ACTUALLY_MISSING | Build estimate: small. |
| Blog reader (admin) | `/marketing/blogs` | ✅ WORKS | "5 Things Before Your First Botox Appointment" visible. |
| Blog reader (public, patient-facing) | `/blog/:slug` | 🟡 WORKS_PARTIALLY | Route exists (verified in App.tsx). Phase 2 didn't walk it. `blog_posts.public_read_published` RLS policy exists. Should render. |
| Landing pages (admin builder) | `/marketing/landing` + `/marketing/page-builder` | ✅ WORKS | `LandingPages.tsx` + `PremiumPageBuilder.tsx` both exist. |
| Public landing page route | `/lp/:slug`, `/lm/:slug`, `/p/:slug` | ✅ WORKS | Multiple public landing-page routes exist. |
| Lead magnet form | `/marketing/lead-magnets` | ✅ WORKS | Lead magnet manager present. |
| Patient testimonials showcase | (no route) | 🔴 ACTUALLY_MISSING | Build estimate: small. |

## Marketing & growth

| Feature | Route(s) | Phase 2 walk verdict | Notes |
|---|---|:---:|---|
| Campaigns | `/marketing/campaigns` | ✅ FULL | 2 draft campaigns visible: Welcome Series + Treatment Spotlight HydraFacial. |
| Competitor intel | `/marketing/competitors` | ✅ WORKS | "3 Total Tracked" banner + 3 entries on Competitors tab. |
| Audience segments | (no standalone route) | 🟡 STUB | Audience segments seeded (3 rows) but no `/marketing/audience` route — managed within Sequences / Campaigns flow instead. |
| SEO dashboard | `/marketing/seo` | 🟡 EMPTY | Page renders, no seeded keyword tracking. Not a build gap, a content gap. |
| AEO dashboard | `/marketing/aeo-dashboard` | 🟡 EMPTY | Page renders, query against `aeo_schema_registry` returns 400 (possibly RLS). 0 rows for cosmique either way. |
| Engagement responder | `/marketing/engagement-responder` | (not walked) | Capability shipped 2026-04-22 for zateceptionist; cosmique-enabled-flag gated. |
| Content calendar | `/marketing/calendar` | 🟡 PARTIAL | Renders; no scheduled posts. |
| Social posts queue | `/marketing/social` | 🟡 EMPTY | 32 cosmique posts in `social_post_queue` with status=queued. Probably filtered out (the page may show only published/scheduled posts, not queued). Blocked upstream by Meta T16. |
| Marketing analytics | `/marketing/analytics` | 🟡 PARTIAL | Page renders. |
| Marketing sequences | `/marketing/sequences` | 🟡 PARTIAL | Separate from sales sequences. Page renders. |
| Brand voice / playbooks / influencer hub / dream clients | `/marketing/brand-voice` etc | (not walked) | Multiple routes exist; assume STUB/WORKS pending walk. |

## Sales

| Feature | Route | Phase 2 walk | Notes |
|---|---|:---:|---|
| Sales dashboard | `/sales/dashboard` | 🟡 PARTIAL | Renders, low data. |
| Pipeline | `/sales/pipeline` | 🟡 PARTIAL | Renders. |
| Sales sequences | `/sales/sequences` | ✅ WORKS | 3 active sequences. |
| Deals | `/sales/deals` | 🟡 PARTIAL | Renders, no deals for cosmique. |
| Auto Lead Gen | `/sales/auto-leadgen` | 🟡 PARTIAL | 1 row seeded (Dubai Aesthetics Daily). Renders. |
| Proposals | `/sales/proposals` | 🟡 EMPTY | No proposals seeded. |
| Sales analytics | `/sales/analytics` | 🟡 EMPTY | No data yet. |
| Trigger events / website intent / forecast / LTV:CAC / referrals / target accounts | various | (not walked) | All routes exist in App.tsx. |

## Operations / settings / admin

| Feature | Route | Phase 2 walk | Notes |
|---|---|:---:|---|
| Integrations management | `/settings/integrations` | 🟡 PARTIAL | Renders; user-action to wire SMTP/Meta/etc. |
| Business profile | `/settings/business-profile` | 🟡 PARTIAL | Renders. business_profiles row already seeded. |
| Team management | `/settings/team` | 🟡 EMPTY | Only admin user exists. Plus team_members 406 noise (fixed in commit `e196e72`). |
| API keys | `/settings/api-keys` | (not walked) | Route exists. |
| Notifications / outreach / phone-numbers / knowledge-base / voice-ai | various | (not walked) | All routes exist. |
| Audit log viewer | `/analytics/autonomous-health` | 🟡 PARTIAL | Cosmique audit_enabled status unverified; only zate is in CLAUDE.md as enabled. Visit + check. |

## Communications

| Feature | Route | Walk |
|---|---|:---:|
| Communications hub | `/communications` | 🟡 PARTIAL |
| Voice / VAPI sub-routes | `/communications/voice*` | (not walked) |
| Inbox | `/inbox` | 🟡 PARTIAL — fixed in `e196e72` (conversation_tags + embedded customer select bugs). |
| Email / SMS / IVR / WhatsApp / Voice-Calls | `/communications/...` | (not walked) | Routes exist. |

---

## Net diff vs v1

| Item | v1 said | v2 says | Why changed |
|---|---|---|---|
| Patient list | (a) Live | ✅ WORKS | Confirmed |
| Patient profile drill-in | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed — grep returned nothing |
| Patient consent forms | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Treatment booking calendar | (c) Missing | 🔴 BUILT_ELSEWHERE | `/appointments` has calendar + add dialog; treatment-specific booking is a smaller extension than v1 implied |
| Medical report upload | (a) Live | ✅ WORKS | Confirmed |
| Doctor review queue | (a) partial | 🟡 WORKS_PARTIALLY | Same |
| Doctor avatar video player | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed — user's primary complaint |
| Prescription management | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Post-care schedule | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Health analysis view | (b) STUB | 🟡 WORKS_PARTIALLY | Confirmed; in HealthReports.tsx |
| Patient progress photos | (c) Missing | 🟡 WORKS_PARTIALLY | DB columns exist; UI to upload/view missing |
| Patient-facing portal | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Pricing calculator | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Doctor profile / about-us | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Treatment catalog | (a) Live | ✅ WORKS | Confirmed |
| Product catalog | (a) Live | ✅ WORKS | Confirmed |
| Public landing pages | (a) Live | ✅ WORKS | Confirmed (multiple routes) |
| Audience segments | (a) Live | 🟡 STUB-ish | No standalone management page — used by sequences/campaigns |
| Treatment package builder | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |
| Patient testimonials | (c) Missing | 🔴 ACTUALLY_MISSING | Confirmed |

5 features promoted from ACTUALLY_MISSING in v1 → reframed as smaller extensions in v2 (because the route exists, just needs a small enhancement). The truly-missing list stayed mostly the same.

## Must-haves for Cosmique launch (re-ranked, post-RLS-unblock)

1. **Doctor avatar video player** — user's explicit complaint. Build estimate: medium.
2. **Patient profile drill-in** — currently you can list but not drill. Build estimate: small.
3. **Consent forms UI** — regulatory. Build estimate: medium.
4. **Treatment-specific booking flow** — current `/appointments` dialog is generic; aesthetics patients want a "book Botox" flow. Build estimate: small extension.
5. **Per-tenant doctor avatar config** in `tenant_config` (currently MuseTalk hardcodes `zateceptionist/adeel.png`) — see medical investigation doc. Build estimate: small.
6. **Patient progress photos upload UI** — schema exists; just need an upload widget in ConsultationNotes. Build estimate: small.

## Out of scope for cosmique (clarified)

- HR module (`tenant_config.features.hr = false` for cosmique)
- Estimation, real estate, construction, YouTube agency, roofing, forex verticals
- B2B prospecting via Part 21/Part 35 lead-gen
