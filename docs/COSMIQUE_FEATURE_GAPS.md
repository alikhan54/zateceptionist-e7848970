# Cosmique — Clinic Feature Gap Analysis

**Date:** 2026-05-18
**Mode:** READ-ONLY inventory. Nothing built this session. Recommendations only — user picks scope.

Classifications:
- **(a) Live** — route exists, page renders, has real components reading real data
- **(b) Stub** — route exists but page is placeholder / no data binding
- **(c) Missing** — route doesn't exist at all

Build estimates (rough): **small** = 1 hook + 1 page, ~half-day · **medium** = 2-3 hooks + 1-2 pages + 1 modal/form, ~1-3 days · **large** = new workflow integration + multiple new tables + complex UI, ~1+ week.

---

## Patient lifecycle

| Feature | Route | Backing table | Class | Build | Use beyond cosmique? | Priority for cosmique launch |
|---|---|---|:---:|:---:|---|:---:|
| Patient list / search | `/clinic/patients` | `clinic_patients` (3 rows) | **a** | n/a | all clinics | already there |
| Patient profile (single) | (no individual route) | `clinic_patients` | **c** | small | all clinics | must-have |
| Patient consent forms (manage / sign) | (no route) | `consent_records`, `consent_templates`, `signed_consents` (exist DB-side) | **c** | medium | all clinics | must-have (regulatory) |
| Patient-facing portal (login + view own data) | (no route) | new — `clinic_portal_users` would be needed | **c** | large | all clinics | nice-to-have |
| Patient progress photos (before/after) | (no route) | new — `clinic_patient_photos` would be needed | **c** | medium | all clinics | nice-to-have for aesthetics |

## Bookings & appointments

| Feature | Route | Backing table | Class | Build | Use beyond cosmique? | Priority |
|---|---|---|:---:|:---:|---|:---:|
| Appointment list | `/appointments` | `appointments` (0 rows for cosmique) | **a** | n/a | all tenants | already there |
| Treatment booking calendar (multi-step form, treatment picker, slot picker) | (no route) | `appointments` + new constraints | **c** | medium | all clinics, salons | must-have |
| Booking confirmation email/SMS template per treatment | (no route) | `email_template_library` | **c** | small | all tenants | nice-to-have |

## Medical workflow

| Feature | Route | Backing table | Class | Build | Use beyond cosmique? | Priority |
|---|---|---|:---:|:---:|---|:---:|
| Medical report upload | `/clinic/health-reports` | `clinic_medical_reports`, `clinic_health_analyses` | **a** | n/a | all clinics | already there |
| Doctor review queue | `/clinic/review-queue` | `clinic_medical_review_queue` | **a** (partial) | small enhancement | all clinics | must-have |
| Patient-facing AI report explainer + doctor avatar video player | (no route) | `clinic_video_scripts` (0 rows for cosmique, table never been queried frontend-side) | **c** | medium | all clinics with doctor-avatar | **must-have** (this is the explicit user complaint) |
| Realtime "your video is ready" notification | n/a | Supabase Realtime on `clinic_video_scripts` | **c** | small | all clinics with doctor-avatar | must-have |
| Health analysis viewing (lab results, cross-report correlation) | (in HealthReports page, partial) | `clinic_health_analyses` | **b** | small enhancement | all clinics | nice-to-have |
| Prescription management (issue / refill / dispense log) | (no route) | `clinic_prescriptions` (table exists, empty for cosmique) | **c** | medium | all clinics | nice-to-have (compliance) |
| Post-care schedule tracking + check-ins | (no route) | `clinic_post_care_schedule` (table exists) | **c** | medium | all clinics | nice-to-have |
| Consultation notes | `/clinic/consultations` | `clinic_consultations` (0 rows for cosmique) | **a** | n/a | all clinics | already there |

## Catalog / commerce

| Feature | Route | Backing table | Class | Build | Use beyond cosmique? | Priority |
|---|---|---|:---:|:---:|---|:---:|
| Treatment catalog | `/clinic/treatments` | `clinic_treatments` (14 rows, currently blocked by RLS — see UI audit) | **a** | n/a | all clinics | unblock RLS first |
| Product catalog | `/clinic/products` | `clinic_products` (3 rows) | **a** | n/a | all clinics | unblock RLS first |
| Pricing / quote calculator (mix treatments → estimate) | (no route) | new — derived from `clinic_treatments` | **c** | small | aesthetic clinics specifically | nice-to-have |
| Treatment package builder (multi-session bundles) | (no route) | new — `clinic_treatment_packages` | **c** | medium | aesthetics, dental | nice-to-have |

## Brand / patient acquisition

| Feature | Route | Backing table | Class | Build | Use beyond cosmique? | Priority |
|---|---|---|:---:|:---:|---|:---:|
| Doctor profile / about-us page | (public route only) | new — `clinic_practitioners` (referenced by post-care but no UI) | **c** | small | all clinics | nice-to-have |
| Blog reader (patient-facing) | `/marketing/blogs` (admin), no public reader | `blog_posts` (`public_read_published` policy already exists) | **b** | small | all tenants | nice-to-have |
| Treatment landing pages (one per treatment, SEO-optimized) | `/marketing/landing` (admin) | `landing_pages` | **a** for builder, **c** for per-treatment auto-generation | medium | all tenants | must-have for cosmique paid-ads ROI |
| Lead magnet (e.g. "Free Botox Consultation" form) | `/marketing/lead-magnets` | `lead_magnets` | **a** | n/a | all tenants | already there |
| Patient-facing testimonials / reviews showcase | (no route) | new | **c** | small | all clinics | nice-to-have |

## Marketing & growth

| Feature | Route | Backing table | Class | Notes |
|---|---|---|:---:|---|
| Campaigns | `/marketing/campaigns` | `marketing_campaigns` | **a** (RLS-blocked) | 2 seeded campaigns, both draft |
| Competitor intel | `/marketing/competitors` | `competitor_tracking` | **a** (RLS-blocked) | 3 seeded; tab structure exists |
| Audience segments | (segment hook exists; main page TBD) | `audience_segments` | **a** | 3 seeded |
| SEO dashboard | `/marketing/seo` | `seo_keyword_tracking`, `seo_content_scores` | **a** for page, **c** for cosmique data | no seed yet |
| AEO dashboard | `/marketing/aeo-dashboard` | new — AEO data layer | **b** likely | no seed yet, may be a placeholder |
| Engagement responder | `/marketing/engagement-responder` | `engagement_responses` | **a** | gated on Meta tokens (T16) |
| Content calendar | `/marketing/calendar` | `content_calendar` | **a** (cosmique not seeded) | seed if needed |
| Social posts queue | `/marketing/social` | `social_post_queue` (20 rows for cosmique, stuck) | **a** | blocked by T16 Meta scope |

## Operations / settings

| Feature | Route | Backing | Class | Notes |
|---|---|---|:---:|---|
| Integrations management (SMTP / Google / Meta / WhatsApp / VAPI) | `/settings` family | `tenant_config` | **a** | user-action pending for cosmique |
| Tenant switcher (`?tenant=` URL param) | (in localStorage) | n/a | **a** (cosmetic only — RLS doesn't respect it) | see UI audit |
| Business profile | (Settings) | `business_profiles` | **a** | already seeded |
| Audit log viewer | `/analytics/autonomous-health` | `tenant_audit_log` | **a** | currently only zateceptionist enabled |

---

## Must-haves for Cosmique launch readiness

Ranked by what unblocks the most user-visible value:

1. **Unblock RLS for cosmique** — see `COSMIQUE_UI_AUDIT.md` for the four paths (recommended: Path A, single SQL UPDATE). Until this is fixed, NO clinic data renders.
2. **Doctor avatar video player + realtime** — explicit user complaint. See `COSMIQUE_MEDICAL_VIDEO_INVESTIGATION.md` for 6-step fix path.
3. **Patient profile (single)** — currently you can list patients but can't drill into one. Half-day build.
4. **Treatment booking calendar** — without it, all the seeded treatments are catalog-only. Patients can read the menu but can't order. Medium build.
5. **Consent forms** — regulatory. Tables exist DB-side; no UI. Medium build.
6. **Per-tenant doctor avatar configuration** — currently MuseTalk pulls a hardcoded `zateceptionist/adeel.png`. One small `tenant_config` extension + one config UI panel.

## Nice-to-haves (post-launch)

- Patient-facing portal (separate auth domain for patients)
- Progress photos (before/after, with consent gating)
- Prescription management (compliance value, low patient demand)
- Per-treatment SEO landing pages (automated generation from `clinic_treatments` rows)
- Pricing calculator (lightweight; could be a single component)
- Testimonials showcase

## Not in scope for cosmique

- HR module: `tenant_config.features.hr = false` — user opted out.
- Estimation, Real Estate, Construction, YouTube Agency, Roofing, Forex — wrong vertical.
- B2B lead-gen pipelines (Part 21 / Part 35 Google Places scraping): the cosmique-specific use case is aesthetic patient acquisition, not B2B prospecting. The 142 stale `lead_signals` rows (B2B hiring/funding) should NOT be promoted into the cosmique `sales_leads` queue.
