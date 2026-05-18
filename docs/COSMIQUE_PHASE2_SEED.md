# Cosmique — Phase 2 Seed Log

**Date:** 2026-05-13 (executed against Supabase TX pooler 6543)
**Tenant:** cosmique (UUID `933967dd-1f90-4676-96c1-42a01b6d9835`)
**Industry:** healthcare_clinic
**Currency:** AED · **Timezone:** Asia/Dubai · **Country:** UAE
**Mandate:** Additive-only. Zero UPDATE, zero DELETE, zero DDL. Six batches, each in its own transaction with verify-then-commit-or-rollback.

---

## What was seeded

| Table | Rows added | Verification count | tenant_id used |
| --- | ---: | ---: | --- |
| `auto_lead_gen_settings`     | 1                                  | 1 / 1 OK   | UUID (column is TEXT but stores UUIDs for 5 of 6 existing rows) |
| `marketing_campaigns`        | 2 (draft)                          | 2 / 2 OK   | UUID |
| `competitor_tracking`        | 3                                  | 3 / 3 OK   | UUID |
| `audience_segments`          | 3                                  | 3 / 3 OK   | UUID (FK → tenant_config.id) |
| `blog_posts`                 | 1 (published)                      | 1 / 1 OK   | UUID |
| `clinic_treatments`          | 10 (skipped 2 dupes: Chemical Peel exact, HydraFacial case-insensitive of existing Hydrafacial) | 14 / 14 OK (4 existing + 10 new) | SLUG `cosmique` |

### Per-row detail

**Batch 1 — auto_lead_gen_settings (1 row):**
- name: `Cosmique — Dubai Aesthetics Daily`
- is_active: true · generation_type: `quick_search` · cost_tier: `free`
- industry: `aesthetics` · location: `Dubai, UAE` · country: `UAE` · timezone: `Asia/Dubai`
- keywords: `botox dubai, dermal filler dubai, hydrafacial dubai, aesthetic clinic dubai, med spa dubai, laser treatment dubai`
- schedule: daily at 09:00 · max_leads_per_run: 10
- auto_enrich: true · auto_score: true · auto_sequence: **false** (flip when integrations wired)
- sequence_id: NULL (existing Cosmique sequences are generic Hot/Warm/Cold sales templates, not aesthetic-specific — leave unlinked)

**Batch 2 — marketing_campaigns (2 rows, status=draft):**
- `Welcome Series — New Inquiries` · type=email · audience_type=all_leads
- `Treatment Spotlight — HydraFacial` · type=email · audience_type=all_leads
- All counters zero, scheduled_at NULL. Nothing sends until user activates AND SMTP is wired.

**Batch 3 — competitor_tracking (3 rows):**
- Kaya Skin Clinic Dubai (kayaclinic.com) · priority_level=7
- Euromed Clinic Dubai (euromedclinic.com) · priority_level=6
- Biolite Skin Clinic Dubai (biolite.ae) · priority_level=5
- All: industry=aesthetics, is_active=true, is_direct_competitor=true, discovery_source=manual

**Batch 4 — audience_segments (3 rows):**
- `All Inquiries` — filter `{"status":"any"}`
- `Hot Leads` — filter `{"min_score":70}`
- `Past Patients` — filter `{"has_treatment":true}`
- All: contact_count=0, is_dynamic=true (frontend will compute counts on read)

**Batch 5 — blog_posts (1 row, status=published):**
- title: `5 Things To Know Before Your First Botox Appointment`
- slug: `5-things-before-first-botox` · author: `Cosmique AI` · category: `Treatments`
- tags: `[botox, first-time, dubai, aesthetic]`
- ~120 words, 2-min read, published_at=NOW(), views=0

**Batch 6 — clinic_treatments (10 added; 4 existing untouched):**
| Name | Category | Price (AED) | Duration |
| --- | --- | ---: | --- |
| Botox per area                       | aesthetics    |   399 | 20 min |
| Botox — 3 areas                      | aesthetics    |   999 | 30 min |
| Dermal Filler 1 syringe              | aesthetics    |   599 | 45 min |
| Dermal Filler 3 syringes             | aesthetics    | 1,499 | 60 min |
| HydraFacial Package (4 sessions)     | skincare      | 1,299 | 45 min |
| Consultation                         | consultation  |   100 | 30 min |
| Laser Hair Removal                   | laser         |   299 | 45 min |
| Microneedling                        | skincare      |   449 | 60 min |
| Skin Booster                         | skincare      |   549 | 30 min |
| PRP / Vampire Facial                 | skincare      |   699 | 60 min |

---

## Plan-vs-schema corrections applied (pre-flight findings)

The plan's prescribed column names did not match the live schema in several places. All fixes were name-remaps only — no DDL, no semantic changes.

| Table | Plan said | Actual column | Action |
| --- | --- | --- | --- |
| `auto_lead_gen_settings` | `enabled`           | `is_active`           | remapped |
| `auto_lead_gen_settings` | `source`            | `generation_type`     | remapped (valid values: `quick_search`, `google_places`, `instagram_scrape`, `b2b`, `review_hunters` — used `quick_search`) |
| `auto_lead_gen_settings` | `frequency`         | `schedule_type`       | remapped |
| `auto_lead_gen_settings` | `time`              | `schedule_time`       | remapped |
| `auto_lead_gen_settings` | (missing)           | `name` NOT NULL       | added |
| `competitor_tracking`    | `competitor_website`| `website_url`         | remapped |
| `competitor_tracking`    | `threat_level`      | `priority_level`      | remapped |
| `competitor_tracking`    | `monitoring_enabled`| `is_active`           | remapped |
| `competitor_tracking`    | `country`           | **does not exist**    | **dropped** (no FK to country; geographic context lives in competitor_name and website TLD) |
| `blog_posts`             | `content`           | `content_html`        | remapped (also: `content_markdown` left NULL) |
| `blog_posts`             | `view_count`        | `views`               | remapped |
| `clinic_treatments`      | `price_aed`         | `price` + `currency` (defaults to AED) | remapped |

### tenant_id format conventions (verified empirically — not from CLAUDE.md)
The plan stated `auto_lead_gen_settings.tenant_id` is UUID. The column type is actually TEXT but stores UUIDs for 5 of 6 existing rows (one zateceptionist row uses slug). Used UUID for consistency with the majority pattern. `clinic_treatments.tenant_id` is TEXT/slug as expected.

---

## What was NOT touched (intentionally)

- **`sequences`** — 3 active rows present (Hot/Warm/Cold sales templates from Onboarding v5). Generic sales sequences; no aesthetic-specific sequence added. Names: `420 Hot Lead Sequence`, `420 Warm Lead Sequence`, `420 Cold Lead Sequence`. The new `auto_lead_gen_settings` row has `sequence_id=NULL` rather than linking to a misaligned generic sequence.
- **`social_post_queue`** — 32 rows for Cosmique, ALL `status='queued'`, zero rows have `error_message` populated. Confirms upstream blocker (missing meta_page_token / IG/FB publisher integration), not API failures. No new queue rows added.
- **`lead_signals`** — 142 unconverted rows for Cosmique (76 hiring + 66 funding, all from `google_search` source). Promotion to leads is out of scope for Phase 2 (Option E Hybrid territory).
- **`tenant_config`** — zero UPDATEs. Integrations wiring (SMTP, Google Custom Search API, VAPI clone, WhatsApp, Meta) is user-action.
- **`business_profiles`** — already populated (Onboarding v5 seed).
- **`clinic_patients`** (3 rows) and **`clinic_products`** (3 rows) — already populated; no additions.
- **No files touched** other than this seed log. Zero changes to any BBQ Ops session files (NavigationSidebar.tsx, AgentNetwork.tsx, Budgets.tsx, PurchaseOrders.tsx, Shipments.tsx, OpsCommandCenter.tsx, formatCurrency.ts).
- **No n8n workflow changes. No VAPI changes. No LangGraph changes.**

---

## Multi-tenant isolation verification

For each of the 6 seeded tables, every non-Cosmique tenant's row count is byte-identical before vs after. Only Cosmique counts changed, by the exact expected delta.

```
auto_lead_gen_settings  (expected cosmique delta: +1)
  219915b8-...   1 → 1  (+0)
  2b3e2b3b-...   2 → 2  (+0)
  8181748a-...   2 → 2  (+0)
  933967dd-...   0 → 1  (+1)  <- cosmique OK
  ac308ab6-...   1 → 1  (+0)
  cce8462b-...   1 → 1  (+0)
  zateceptionist 1 → 1  (+0)

marketing_campaigns  (expected cosmique delta: +2)
  933967dd-...   0 → 2  (+2)  <- cosmique OK
  97803e78-...   4 → 4  (+0)
  ac308ab6-...   9 → 9  (+0)
  eb22ebbc-...   4 → 4  (+0)

competitor_tracking  (expected cosmique delta: +3)
  933967dd-...   0 → 3  (+3)  <- cosmique OK
  ac308ab6-...   2 → 2  (+0)

audience_segments  (expected cosmique delta: +3)
  933967dd-...   0 → 3  (+3)  <- cosmique OK
  ac308ab6-...   5 → 5  (+0)

blog_posts  (expected cosmique delta: +1)
  933967dd-...   0 → 1  (+1)  <- cosmique OK
  ac308ab6-...  12 → 12 (+0)
  c221e764-...   5 → 5  (+0)
  cce8462b-...  10 → 10 (+0)

clinic_treatments  (expected cosmique delta: +10)
  cosmique         4 → 14 (+10)  <- cosmique OK
  zateceptionist   6 → 6  (+0)

OVERALL: PASS
```

---

## Flags / things the user should know

1. **Clinic_treatments price-scale inconsistency.** Existing `Botox` = AED 1800 (30 min), but new `Botox per area` = AED 399 (20 min). Existing `Hydrafacial` = AED 900 (60 min), but new `HydraFacial Package (4 sessions)` = AED 1299. The plan's prices come in much lower than Onboarding v5's existing prices. Coexisting rows have different names but conflicting pricing semantics. Resolution is a business decision — either (a) update the existing 4 rows to match the new pricing scale, or (b) leave both and treat the existing 4 as legacy. Not actioned here (additive-only mandate).

2. **`auto_lead_gen_settings.auto_sequence=false`** for Cosmique's new row. The plan explicitly directed this ("flip to true once integrations wired") because there's no aesthetic-specific sequence yet to enroll leads into. Flipping it true without an aesthetic sequence would enroll into a generic sales sequence designed for tech leads — bad fit.

3. **`marketing_campaigns.status='draft'`** for both new campaigns. Plan-directed. Even if user flips to `active`, the campaigns won't send while Cosmique has no SMTP configured in `tenant_config`. This is a safe default.

4. **`social_post_queue` 32-row backlog** is a known pre-existing condition. Not addressed in Phase 2. Will need separate investigation — likely upstream IG/FB Page tokens for Cosmique are missing in `tenant_config`. The 32 rows have NULL `error_message` because they never reached the publisher; they were queued but the publisher fetcher must be filtering by tenant integrations status.

5. **The 1-Botox-blog references AED 399/999 pricing** that matches the new clinic_treatments rows but contradicts the existing legacy Botox row at AED 1800. Tied to flag #1 above.

---

## Next steps (user action required)

Phase 2 seeds are inputs — they don't fire engines without integrations wired in `tenant_config`:

- [ ] **SMTP credentials** in `tenant_config` (smtp_host, smtp_port, smtp_user, smtp_pass) — unlocks marketing_campaigns email send + lead nurture
- [ ] **Google Custom Search API + CX** — unlocks Part 21 (Enrichment) and Part 35 (AutoLeadGen) for Cosmique. Required for auto_lead_gen_settings to actually produce leads.
- [ ] **VAPI assistant clone** for Cosmique (clinic vertical) — unlocks voice AI for inbound aesthetic inquiries. See open ticket T36 in CLAUDE.md (VAPI webhook tenant-resolution must be patched before clinic-tenant clones are safe to deploy)
- [ ] **WhatsApp Business API** — blocked on Meta App Review for Cosmique's WABA
- [ ] **Meta Page + Instagram** — blocked on Meta App Review; this is also what causes the 32 stuck `social_post_queue` rows
- [ ] **Reconcile clinic_treatments pricing** — decide whether to update the 4 legacy rows (Botox 1800, Hydrafacial 900, Lip Filler 2500, Chemical Peel 1200) to the new pricing scale, or leave both

Until SMTP at minimum, the seeded `auto_lead_gen_settings` will discover leads but the seeded `marketing_campaigns` produce no email output.

---

## Phase 2.9 (optional, gated on user say-so)

Not executed. When user is ready:
- Trigger one cycle of Part 21 (`Enrichment+Scoring`, workflow `aTGIlVgvf6lUWHlW`) and confirm Cosmique's enrichment branch fires.
- Trigger Part 35 (`AutoLeadGen`) and confirm it picks up Cosmique's new `auto_lead_gen_settings` row.
- Trigger Marketing mega `E8HZhv4y4MRb6n9F` and confirm it sees the 2 draft campaigns (and skips send because status=draft, not because of integrations).

Report n8n execution IDs + success/error per Cosmique branch.
