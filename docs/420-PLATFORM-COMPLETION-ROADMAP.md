# 420 Platform Completion Roadmap

**Read this before starting any phase.** Status as of 2026-06-05 (post Phase-0 discovery + auth-fix).
Companion: the "Phase 0 Foundation" section of `CC_SESSION_COORDINATION.md` (discoveries + sacred zones).

## The vision, in one line
Turn 420 from a single-operator tool into a **white-label agency platform** Adeel runs top-down: see
every tenant and dollar, let enterprise clients rebrand and resell, nurture every customer
automatically, and listen to what they want next.

## What we're building (4 features) — the per-page wins

### 1. Master Admin Dashboard — Adeel's god-view
- **/admin** — all 43 tenants at a glance: live MRR (~$9,992/mo today), plan mix (8 paid / 34
  free-trial / 1 inactive), active users, real activity feed — replacing today's hardcoded
  "$48.5K / 156 tenants" placeholders.
- **/admin/tenants/:id** (NEW) — one tenant end-to-end: created → first-purchase → last-active,
  plan/MRR, users, onboarding %, billing.
- **/admin/time-to-purchase** (NEW) — signup→first-payment histogram + cohort filter.
- *Reality:* the admin shell already exists and is master_admin-gated; the gap is cross-tenant data
  (RLS blocks it in the browser today) + the two new pages.

### 2. White-Label / Agency Mode — enterprise clients rebrand + resell
- **Onboarding** — a new **enterprise-only** "Brand Your Platform" step (logo, colors, name) that slots
  into today's AI onboarding **without disrupting non-enterprise signup**.
- **Settings → Branding** — the same controls for tenants who skipped it.
- **The win:** the whole app re-skins per tenant — their logo in the sidebar, their colors, their AI's
  name/voice — and an `agency_admin` spins up + manages up to 10 sub-tenants (11+ = contact sales).
- *Reality:* 6 brand columns + the `features.white_label` flag + 27 AI-personality fields already exist
  and are populated for the 4 enterprise tenants; only ~5 net-new columns + the UI remain.

### 3. Lifecycle Messaging — every customer nurtured automatically
- **The win:** the right message at the right moment — welcome on signup, a nudge when they go quiet,
  win-back before churn, milestone celebrations — each message AI-crafted in the tenant's brand voice.
- *Reality:* 9 sequences across 6 industries already exist + an AI Sequence Generator workflow already
  exists. Triggers are **derived** from existing data (signup / onboarding / last-login / subscription),
  not a new event firehose. A reconciliation pass (Phase 3.0) picks the canonical sequence home first.

### 4. Feedback Board — listen to what they want next
- **/feedback** — tenants post requests, upvote others, watch status (planned / building / shipped).
- **/admin/feedback** — Adeel triages + moves cards. Closes the loop between users and the roadmap.

## How we build it (6 phases — worktree-isolated, gated, additive)
| Phase | Worktree | The win it ships |
|---|---|---|
| 1A Branding | `frontend-branding` | per-tenant logo/colors/name live; enterprise onboarding step |
| 1B Lifecycle signals | `frontend-events` | derived signup / active / silent / purchase / churn signals (read-only) |
| 2 Master Admin | `frontend-admin` | god-view goes real (all 43 tenants, MRR, time-to-purchase, drill-down) |
| 3 Lifecycle Messaging | `frontend-lifecycle` | sequences fire + AI-craft per message (after 3.0 reconciliation) |
| 4 Feedback Board | `frontend-feedback` | tenant feedback + upvotes + moderation |
| 5 Polish / Hardening | TBD | AI insights, logo color-extraction, impersonation audit, load test |

Order: **1A ∥ 1B → 2 needs 1B → 3 needs 1B + 3.0 → 4 independent → 5 last.**
Each phase: own worktree off latest `main`, push its own branch, merge to `main` via an End-of-Phase
auditor (dry-run clean, no force), additive only, sacred zones untouched.

## Locked decisions
- **Pricing:** $1,999/mo Enterprise = up to **10** white-label sub-tenants; **11+ = contact sales** (custom).
- **Roles:** `master_admin` (Adeel) > `agency_admin` (NEW) > `admin` > `manager` > `staff`.

## Post-discovery reality (so no one re-investigates)
- master_admin = `zatesystems7@gmail.com` only (axeclaim demoted). `auth_id` is the canonical join key.
- A **phantom-user bug** (duplicate `public.users` rows) affects a few accounts → dedicated cleanup
  session pending, incl. **root cause** (is signup still minting phantoms?).
- Full Phase-0 discovery detail: `CC_SESSION_COORDINATION.md` → "Phase 0 Foundation".

## Sacred zones (additive touches only, approved per phase)
n8n's 9 sacred workflows · LangGraph `agents/*.py` · `Layout.tsx` / `OmegaFloatingChat.tsx` /
`NavigationSidebar.tsx` / `supabase.ts`. No DDL except gated, additive migrations per phase.
