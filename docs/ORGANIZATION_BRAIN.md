# Organization Brain — Phase F (shipped 2026-06-11, branch `feat/org-brain`)

Full-screen 3D force-directed map of the platform: OMEGA at the core, 8 departments,
the real agent registry, the voice-tool surface, and the n8n automation fabric
(sanitized) blooming outward. Additive new route — the sphere stays the Home; the
Brain is OMEGA's mind, opened.

## What was built

| Piece | File |
|---|---|
| Page shell (fixed inset-0 z-[9999] overlay, topbar, 10-row legend, hint pill, Esc/X → `navigate(-1)`, `body.omega-fullscreen`) | `src/pages/OrganizationBrain.tsx` |
| 3D graph (react-force-graph-3d, orbit controls, auto-rotate w/ interaction pause, bloom, SpriteText labels, fly-to, tooltips, mobile quality scaler) | `src/components/brain/BrainGraph.tsx` |
| Static topology manifest (sanitized) | `src/components/brain/brainManifest.ts` |
| Per-tenant live counts hook (read-only) | `src/components/brain/useBrainData.ts` |
| Door 1 — `/brain` lazy route (after `/dashboard`) | `src/App.tsx` |
| Door 2 — 3rd rail icon (Network, between Home and All-apps; `shortcut` made optional, kbd renders conditionally — no fake ⌘ hint) | `src/components/omega/v3/nav/NavRail.tsx` |
| Door 3 — 13th Pulse card (3rd intelligence-layer card) + Spotlight row | `src/components/omega/v3/nav/sectionsRegistry.ts` |

Pre-edit backups: `src/App.tsx.backup-pre-brain`,
`src/components/omega/v3/nav/NavRail.tsx.backup-pre-brain`,
`src/components/omega/v3/nav/sectionsRegistry.ts.backup-pre-brain`.

## Topology decision (approved)

**The Brain shows the PLATFORM's full automation fabric to every tenant — it IS the
product.** Deliberate product choice; the sanitization below makes it safe. The only
tenant-scoped data are the 4 live entity counts (leads / customers / conversations /
appointments) + the tenant name in the topbar. A per-tenant *filtered* Brain is a
documented future enhancement, not built now.

## Node arithmetic (HARD RULE: no node cutting)

| Tier | Count | val | Notes |
|---|---|---|---|
| Core (OMEGA) | 1 | 70 | absorbs the registry's CORTEX "OMEGA" entry |
| Departments | 8 | 20 | Pulse palette colors |
| Agents | 67 | 7 | 70 registry entries − OMEGA (core) − PRISM/BEACON dupes (each listed in 2 registry sections; rendered once in their specialist dept, "last wins") |
| Voice tools | 41 | 1.8 | teal #14B8A6, attached to Communications agents |
| Workflows | 246 | 1.4 | sanitized (see below) |
| Live entities | 4 | 6 | counts from useBrainData |
| **Total nodes** | **367** | | links: **378** (8 core→dept + 67 dept→agent + 41 agent→tool + 246 dept→wf + 12 cross + 4 live) |

The Pulse card metrics (367 / 378 / 8 / live) are SYSTEM CONSTANTS hardcoded in
`sectionsRegistry.ts` so the manifest stays out of the main bundle. If the manifest
changes, update those two literals (the topbar reads the exported
`BRAIN_NODE_COUNT` / `BRAIN_LINK_COUNT` and is always exact).

## Data sources

- **Agents**: imported live from `src/components/omega/agentRegistry.ts` (8 sections, 70 entries).
- **Workflows**: n8n inventory snapshot — on-disk export of the workflow table dated
  **2026-05-01** (`D:/420-system/tmp_workflows/all_workflows.json`, 239 active unique
  names) merged with the 10-name live sample captured 2026-06-11 → **246 rendered**.
  Live active count verified 2026-06-11 = **298** (read-only SELECT via the 6543 TX
  pooler; the n8n REST API was down — that evening's EMAXCONNSESSION incident). The
  ~52 missing names are workflows created after 2026-05-01. **Refresh path**: re-run
  the generator `D:/420-system/.tmp_brain/gen_workflows.py` against a fresh
  name+active export, re-inject the `WORKFLOWS` array, update the two Pulse literals.
- **Voice tools**: 41 curated capability names derived from the platform's real
  voice-tool taxonomy (universal assistant tool categories 28 + estimation 5 +
  collections 7 + the cross-brain bridge). The live VAPI registry (sampled 2026-06-11,
  10 configured tools) contains tenant-scoped names → generalized per the
  sanitization contract.
- **Live counts** (`useBrainData.ts`): mirrors `usePulseData.ts` exactly —
  `Promise.allSettled`, 5s race timeout, explicit `.eq('tenant_id', …)`, verified
  formats (sales_leads/customers/appointments = SLUG; conversations = UUID-preferred
  `conv_id`), null→omit, 0=real, one fetch per tenant.

## Sanitization contract

Rendered strings NEVER contain internal workflow IDs, internal codenames, or tenant
identities. Two layers:

1. **De-codename** — e.g. "420 main : multi tenant" → Core Operations Engine,
   "420 communication" → Omnichannel Orchestrator, "420 sales part 1" → Sales
   Automation Engine, "Sacred Sentinel - Hot Path" → Critical Path Sentinel.
2. **De-tenant** — tenant brands are replaced by their vertical (BBQ Tonight →
   Restaurant, Smart Ledger → Accounting, Cosmique → Clinic, Aamerah → Real Estate,
   MNT Halan → Collections, …). Leak check (tenant/jargon regex over all rendered
   names): CLEAN.

The full raw→display mapping table is at the bottom of this doc (kept here, out of
the bundle, per the approved contract). Generator: `.tmp_brain/gen_workflows.py`.

## Engine + dependency pins (DO NOT bump blindly)

`three` is pinned at **0.160.0** by the Phase 1 sphere — do not change it. The
force-graph ecosystem's current releases require three ≥0.168/≥0.179, so:

```jsonc
"dependencies": { "react-force-graph-3d": "1.24.0", "three-spritetext": "1.10.0" }
"overrides":    { "3d-force-graph": "1.73.0", "three-render-objects": "1.29.5" }
```

Every declared range in the resolved tree is satisfied (no `--legacy-peer-deps`):
react-force-graph-3d@1.24 declares `3d-force-graph ^1.73`; 1.73.0 declares
`three >=0.118 <1` and `three-render-objects ^1.29`; 1.29.5 peers `three *`
(1.30.0 already imports `three/webgpu`, which doesn't exist in three 0.160 — build
breaks; 1.31+ peer-requires ≥0.168). `npm ls three` → single deduped 0.160.0.
To upgrade the engine later, bump three first, then re-derive this matrix.

## Graph config (the contract)

controlType orbit · background #030509 · nodeVal core 70 / dept 20 / agent 7 /
wf 1.4 / tool 1.8 / live 6 · nodeOpacity 0.92 · nodeResolution 12 (mobile 8) ·
linkColor per source dept · linkOpacity 0.22 · linkWidth core 1.8 / cross 1.2 /
dept 1.0 / leaf 0.5 · particles core→dept 4, dept→agent 2, every 3rd wf link 1,
cross 2, live 2 · particle speed 0.0055 · particle width 1.7 (mobile 1.0) ·
SpriteText Georgia (core italic, heights 10/5/3.2; mobile: core+dept only) ·
charge −85 · link distance core 160 / dept 55 / else 24 · auto-rotate 0.55 with
pause-on-interaction + 6s resume · fly-to distance 110 / 1400ms · bloom
UnrealBloomPass 1.35/0.55/0.08 inside try/catch (enhancement, never crashes; the
import is `three/examples/jsm/...` — typed path for three 0.160).

## Bundle facts (build 2026-06-11)

- `OrganizationBrain-*.js` **238.44 kB (71.36 kB gzip)** — separate lazy chunk.
- Main bundle: 946.11 → 946.46 kB (+0.35 kB: route + registry entries only).
- Shared lazy `three.module-*.js` chunk grew 459.58 → 667.46 kB because
  three-render-objects statically imports examples/jsm controls + composer and
  rollup hoists them into the shared three chunk (vite.config is sacred — no
  manualChunks tuning). Lazy + cached; loaded by pages that already load three.

## Verification (2026-06-11, production preview + headed Playwright)

18/18 PASS — evidence in `tests/screenshots/brain/` (VERIFIED-UI) and the runner
`.brain_verify.mjs` (untracked; creds via env per §21). Topology 367/378 rendered
for both tenants; live chips tenant-scoped (VERIFIED-DB: zate Leads 627 /
Customers 19 / Conversations 19 / Appointments 18 vs cosmique 4 / 1 / 0 / 39);
rail 3 icons; Pulse card + Spotlight row open /brain; Esc returns; mobile 380px
renders; sphere/legacy/inbox regressions clean; `npm ls three` single 0.160.0;
tsc adds 0 new errors (34 pre-existing error lines on main, none in Phase F files).

**Pre-existing interference documented (NOT Phase F):** a Radix dialog sometimes
auto-mounts open over /dashboard, holds keyboard focus in its own input
(`document.activeElement` = a shadcn `h-11` input; 7 aria-hidden roots) and is the
source of the long-standing "DialogContent requires a DialogTitle" console warning.
It can swallow Spotlight typing for real users too. Out of Phase F scope (sacred
surfaces) — flagged separately.

## Rollback

1. Delete the route block + lazy import in `src/App.tsx` (or restore
   `src/App.tsx.backup-pre-brain`).
2. Restore `NavRail.tsx.backup-pre-brain` and `sectionsRegistry.ts.backup-pre-brain`.
3. Delete `src/pages/OrganizationBrain.tsx` + `src/components/brain/`.
4. Optionally remove the 2 deps + `overrides` from package.json and `npm install`.
The sphere, Pulse, Spotlight and all existing pages are untouched by rollback.

## Future enhancements (documented, not built)

- Individual entity nodes (each lead/customer as its own node) behind a
  per-department zoom threshold.
- Per-tenant filtered Brain (only the verticals/workflows a tenant has enabled).
- Sphere double-click easter egg (sphere → Brain morph transition).
- Bloom tuning per device class; selective bloom on the core only.
- Manifest auto-refresh from a nightly read-only inventory export (closes the
  246-vs-298 snapshot gap and keeps names current).

---

## Raw → display mapping (reference; rendered strings are the right column)

| Raw n8n workflow name | Rendered display name | Dept |
|---|---|---|
| 420 A/B Test Engine v1.0 | A/B Test Engine | marketing |
| 420 AB Test Evaluator v1.0 | AB Test Evaluator | marketing |
| 420 ABM Personalizer v1.0 | ABM Personalizer | marketing |
| 420 ABM Research v1.0 | ABM Research | sales |
| 420 AEO Competitor Tracker v1.0 | AEO Competitor Tracker | marketing |
| 420 AEO Content Optimizer v1.0 | AEO Content Optimizer | marketing |
| 420 AEO Intelligence Engine v1.0 | AEO Intelligence Engine | marketing |
| 420 AI Agent Activator v1.0 | AI Agent Activator | intelligence |
| 420 AI Agent Chat v1.0 | AI Agent Chat | intelligence |
| 420 AI Agent Creator v1.0 | AI Agent Creator | intelligence |
| 420 AI Agent Learning v1.0 | AI Agent Learning | intelligence |
| 420 AI Agent Metrics v1.0 | AI Agent Metrics | intelligence |
| 420 AI Lead Qualifier v1.0 | AI Lead Qualifier | sales |
| 420 AI Research Agent v1.0 | AI Research Agent | intelligence |
| 420 AI Sequence Generator v1.0 | AI Sequence Generator | sales |
| 420 AI Video Generator v1.0 | AI Video Generator | marketing |
| 420 Account Mapper v1.0 | Account Mapper | sales |
| 420 Adapter - FB Messenger Inbound | Adapter - FB Messenger Inbound | communications |
| 420 Adapter - IG Comment Inbound | Adapter - IG Comment Inbound | communications |
| 420 Adapter - IG DM Inbound | Adapter - IG DM Inbound | communications |
| 420 Alert Dispatcher v1.0 | Alert Dispatcher | intelligence |
| 420 Auto Counter Video v1.0 | Auto Counter Video | marketing |
| 420 Auto Publish Engine v2.0 | Auto Publish Engine | marketing |
| 420 Auto SEO Blog Analyzer v1.0 | Auto SEO Blog Analyzer | marketing |
| 420 Auto Social Trend Video v1.0 | Auto Social Trend Video | marketing |
| 420 Auto-Qualify Pipeline v1.0 | Auto-Qualify Pipeline | sales |
| 420 AutoLeadGen Scheduler v1.0 | AutoLeadGen Scheduler | sales |
| 420 Autonomous Marketing v1.0 | Autonomous Marketing | marketing |
| 420 Behavioral Scorer v1.0 | Behavioral Scorer | sales |
| 420 Blog Image Enricher v1.0 | Blog Image Enricher | marketing |
| 420 Blog→AEO Bridge v1.0 | Blog→AEO Bridge | marketing |
| 420 Blog→AEO Wrapper v1.0 | Blog→AEO Wrapper | marketing |
| 420 Bounce Processor v1.0 | Bounce Processor | operations |
| 420 Bounce Reader v1.0 | Bounce Reader | operations |
| 420 Bounce Webhook v1.0 | Bounce Webhook | operations |
| 420 Bulk Call Engine v1.0 | Bulk Call Engine | communications |
| 420 Buyer Intent Scorer v1.0 | Buyer Intent Scorer | sales |
| 420 COLLAB Outreach Sender v1.0 | COLLAB Outreach Sender | sales |
| 420 Clinic Post-Care v1.0 | Clinic Post-Care | industry |
| 420 Clinic v1.0 | Clinic | industry |
| 420 Collections Engine v1.0 | Collections Engine | collections |
| 420 Collections VAPI v1.0 | Collections VAPI | collections |
| 420 Comm - AI Suggested Responses v1.0 | Comm - AI Suggested Responses | communications |
| 420 Comm - Analytics Aggregator v1.0 | Comm - Analytics Aggregator | communications |
| 420 Comm - Channel Mapper v1.0 | Comm - Channel Mapper | communications |
| 420 Comm - Export Conversation v1.0 | Comm - Export Conversation | communications |
| 420 Comm - Merge Conversations v1.0 | Comm - Merge Conversations | communications |
| 420 Comm - Resolution Tracker v1.0 | Comm - Resolution Tracker | communications |
| 420 Comm - SLA Monitor v1.0 | Comm - SLA Monitor | communications |
| 420 Comm - Scheduled Message Sender v1.0 | Comm - Scheduled Message Sender | communications |
| 420 Comm - Sentiment Analyzer v1.0 | Comm - Sentiment Analyzer | communications |
| 420 Comm - Voice to Inbox Sync v1.0 | Comm - Voice to Inbox Sync | communications |
| 420 Company Intel Aggregator v1.0 | Company Intel Aggregator | intelligence |
| 420 Content Intelligence Engine v1.0 | Content Intelligence Engine | marketing |
| 420 Content Repurposer v1.0 | Content Repurposer | marketing |
| 420 DSN Bridge v1.0 (zateceptionist) | Delivery Intelligence v1.0 () | intelligence |
| 420 Data Decay Detector v1.0 | Data Decay Detector | operations |
| 420 Deliverability Monitor v1.0 | Deliverability Monitor | sales |
| 420 Doc Pixel Tracker v1.0 | Doc Pixel Tracker | sales |
| 420 Doctor Avatar v1.0 | Doctor Avatar | industry |
| 420 Document Tracker v1.0 | Document Tracker | sales |
| 420 Duplicate Merger v1.0 | Duplicate Merger | operations |
| 420 Email Fortress v2.0 | Email Fortress | communications |
| 420 Email Pattern Guesser v1.0 | Email Pattern Guesser | communications |
| 420 Email Upgrader v1.0 | Email Upgrader | communications |
| 420 Email Warmup Manager v1.0 | Email Warmup Manager | sales |
| 420 Engagement Optimizer v1.0 | Engagement Optimizer | marketing |
| 420 Engagement Responder v1.0 | Engagement Responder | marketing |
| 420 Enrichment Connector v1.0 | Enrichment Connector | sales |
| 420 Enrichment Fortress v3.0 | Enrichment Fortress | sales |
| 420 Error Handler v1.0 | Error Handler | intelligence |
| 420 Estimation AI v1.0 | Estimation Document AI | industry |
| 420 Estimation Accuracy Engine v1.0 | Estimation Accuracy Engine | industry |
| 420 Estimation Carpet Engine v1.0 | Estimation Carpet Engine | industry |
| 420 Estimation Cost Engine v1.0 | Estimation Cost Engine | industry |
| 420 Estimation Detail Engine v1.0 | Estimation Detail Engine | industry |
| 420 Estimation Export Engine v2.0 | Estimation Export Engine | industry |
| 420 Estimation File Manager v1.0 | Estimation File Manager | industry |
| 420 Estimation Learning Engine v1.0 | Estimation Learning Engine | industry |
| 420 Estimation PDF Dissector v2.0 | Plan Document Dissector | industry |
| 420 Estimation Paint Engine v1.0 | Estimation Paint Engine | industry |
| 420 Estimation Scope Engine v1.0 | Estimation Scope Engine | industry |
| 420 Estimation Spec Engine v1.0 | Estimation Spec Engine | industry |
| 420 Estimation Transition Engine v1.0 | Estimation Transition Engine | industry |
| 420 Estimation V2 Actions | Estimation Workspace Actions | industry |
| 420 Estimation VAPI v1.0 | Estimation Voice Tools | industry |
| 420 Estimation Vision Processor v1.0 | Estimation Vision Processor | industry |
| 420 Estimation Waste Recalculator v1.0 | Estimation Waste Recalculator | industry |
| 420 Estimation v1.0 | Estimation Action Engine | industry |
| 420 Forecast Pipeline v1.0 | Forecast Pipeline | sales |
| 420 Funding Alert Scanner v1.0 | Funding Alert Scanner | intelligence |
| 420 GDPR Consent Tracker v1.0 | GDPR Consent Tracker | communications |
| 420 Google Maps Discovery v1.0 | Google Maps Discovery | operations |
| 420 HR AI Interview Call v1.0 | HR AI Interview Call | hr |
| 420 HR Auto-Pipeline v1.0 | HR Auto-Pipeline | hr |
| 420 HR Leave Request v2.0 | HR Leave Request | hr |
| 420 HR Onboarding v2.0 | HR Onboarding | hr |
| 420 HR Part 2 - v1.9.3 | HR Part 2 | hr |
| 420 HR Recruitment Approve-Outreach v1.0 | HR Recruitment Approve-Outreach | hr |
| 420 HR Recruitment Outreach v1.0 | HR Recruitment Outreach | hr |
| 420 HR part1 - v1.1 | HR part1 | hr |
| 420 Hiring Signal Detector v1.0 | Hiring Signal Detector | sales |
| 420 Icebreaker Injector v1.0 | Icebreaker Injector | operations |
| 420 Inbox Rotator v1.0 | Inbox Rotator | sales |
| 420 Intelligence Hub v2.3 | Intelligence Hub | intelligence |
| 420 LTV:CAC Pipeline v1.0 | LTV:CAC Pipeline | sales |
| 420 LangGraph Bridge v1.1 CLEAN | LangGraph Bridge v1.1 CLEAN | operations |
| 420 Lead Magnet Handler v1.0 | Lead Magnet Handler | sales |
| 420 LinkedIn Discovery v1.0 | LinkedIn Discovery | operations |
| 420 LinkedIn Viewer v1.0 | LinkedIn Viewer | operations |
| 420 Manual Email Engine v1.0 | Manual Email Engine | communications |
| 420 Marketing Predictions v1.0 | Marketing Predictions | marketing |
| 420 Marketing Self-Learn v1.0 | Marketing Self-Learn | marketing |
| 420 Marketing v 2.6 | Marketing Autonomy Engine | marketing |
| 420 Meeting Scheduler v1.0 | Meeting Scheduler | sales |
| 420 OMEGA Alert Monitor v1.0 | OMEGA Alert Monitor | intelligence |
| 420 OMEGA Autonomous v1.0 | OMEGA Autonomous | intelligence |
| 420 OMEGA Campaign Executor v1.0 | OMEGA Campaign Executor | marketing |
| 420 OMEGA Daily Briefing v1.0 | OMEGA Daily Briefing | intelligence |
| 420 OMEGA Heartbeat Daily v1.0 | OMEGA Heartbeat Daily | intelligence |
| 420 OMEGA Lead Gen Async v1.0 | OMEGA Lead Gen Async | sales |
| 420 OMEGA TTS Proxy v1.0 | OMEGA TTS Proxy | intelligence |
| 420 Onboarding Monitor v1.0 | Onboarding Monitor | intelligence |
| 420 Onboarding Orchestrator v1.0 | Onboarding Orchestrator | intelligence |
| 420 Paddle Webhook v1.0 | Paddle Webhook | operations |
| 420 Part 39B - Social Content Publisher v1.0 | Part 39B - Social Content Publisher | marketing |
| 420 Personalized Image v1.0 | Personalized Image | marketing |
| 420 Phone Validator v1.0 | Phone Validator | operations |
| 420 Predictive Scoring v1.0 | Predictive Scoring | sales |
| 420 Provision Agents v1.0 | Provision Agents | operations |
| 420 Provision Comms v1.0 | Provision Comms | operations |
| 420 Provision HR v1.0 | Provision HR | operations |
| 420 Provision Marketing v1.0 | Provision Marketing | marketing |
| 420 Provision Ops v1.0 | Provision Ops | operations |
| 420 Provision Sales v1.0 | Provision Sales | sales |
| 420 Provision Voice v1.0 | Provision Voice | communications |
| 420 RE Auto-Matcher v1.0 | RE Auto-Matcher | operations |
| 420 RE Compliance Monitor v1.0 | RE Compliance Monitor | intelligence |
| 420 RE Deal Orchestrator Approve v1.0 | RE Deal Orchestrator Approve | sales |
| 420 RE Deal Orchestrator v1.0 | RE Deal Orchestrator | sales |
| 420 RE Developer API Gateway v1.0 | RE Developer API Gateway | operations |
| 420 RE Intelligence v1.0 | RE Intelligence | intelligence |
| 420 RE Investment Advisor v1.0 | RE Investment Advisor | operations |
| 420 RE Lead Scorer v1.0 | RE Lead Scorer | sales |
| 420 RE Market Forecaster v1.0 | RE Market Forecaster | sales |
| 420 RE Market Scraper v1.0 | RE Market Scraper | operations |
| 420 RE Mortgage Calculator v1.0 | RE Mortgage Calculator | operations |
| 420 RE Off-Plan Matcher v1.0 | RE Off-Plan Matcher | operations |
| 420 RE Portfolio Updater v1.0 | RE Portfolio Updater | operations |
| 420 RE Price Intelligence v1.0 | RE Price Intelligence | intelligence |
| 420 RE Proposal Generator v1.0 | RE Proposal Generator | sales |
| 420 RE WhatsApp Journey v1.0 | RE WhatsApp Journey | communications |
| 420 Real Estate Automations v1.0 | Real Estate Automations | industry |
| 420 Real Estate v1.0 | Real Estate | industry |
| 420 Referral Engine v1.0 | Referral Engine | sales |
| 420 Reply Processor v1.0 | Reply Processor | sales |
| 420 Reply Router v1.0 | Reply Router | sales |
| 420 SEO Analyzer v1.0 | SEO Analyzer | marketing |
| 420 SMS Outbound v1.0 | SMS Outbound | communications |
| 420 SMS Sender v1.0 | SMS Sender | communications |
| 420 SMTP Config Rotator v1.0 | SMTP Config Rotator | operations |
| 420 SMTP Test v1.0 | SMTP Test | operations |
| 420 Sacred Sentinel - Hot Path v1.0 | Critical Path Sentinel | intelligence |
| 420 Score Decay v1.0 | Score Decay | sales |
| 420 Signal Stacker v1.0 | Signal Stacker | sales |
| 420 Smart Send Pre-processor v1.0 | Smart Send Pre-processor | operations |
| 420 Smart Send Time v1.0 | Smart Send Time | operations |
| 420 Social Listener v1.0 | Social Listener | marketing |
| 420 Social Queue Publisher v2.0 | Social Queue Publisher | marketing |
| 420 Subsequence Manager v1.0 | Subsequence Manager | sales |
| 420 Super Enrichment v1.0 | Super Enrichment | sales |
| 420 Technographic Scanner v1.0 | Technographic Scanner | operations |
| 420 Template Enricher v1.0 | Template Enricher | sales |
| 420 Tenant Audit - Autonomous Health | Autonomous Health Audit | intelligence |
| 420 Tenant Provisioner v1.0 | Tenant Provisioner | operations |
| 420 Trigger Event Engine v1.0 | Trigger Event Engine | operations |
| 420 UK Reminders Engine v1.0 | Client Reminders Engine | industry |
| 420 Universal VAPI v1.0 | Universal VAPI | communications |
| 420 VAPI-OMEGA Bridge v1.0 | VAPI-OMEGA Bridge | communications |
| 420 Video AI — AIDA Intelligence Loop v1.0 | Video AI — AIDA Intelligence Loop | marketing |
| 420 Video AI — Autonomous Monitor v1.0 | Video AI — Autonomous Monitor | marketing |
| 420 Video AI — Sales Integration v1.0 | Video AI — Sales Integration | marketing |
| 420 Video Auto-Creator Bridge v1.0 | Video Auto-Creator Bridge | marketing |
| 420 Video Auto-Creator v1.0 | Video Auto-Creator | marketing |
| 420 Video Intelligence Orchestrator v1.0 | Video Intelligence Orchestrator | marketing |
| 420 Video Render Watchdog v1.0 | Video Render Watchdog | marketing |
| 420 Voice Marketing v1.0 | Voice Marketing | marketing |
| 420 Voice Outbound v1.0 | Voice Outbound | communications |
| 420 Warmup Enforcer v1.0 | Warmup Enforcer | sales |
| 420 Website Blog Subscribe v1.0 | Website Blog Subscribe | marketing |
| 420 Website CTA Click Tracker v1.0 | Website CTA Click Tracker | operations |
| 420 Website Exit Lead v1.0 | Website Exit Lead | sales |
| 420 Website Intent v1.0 | Website Intent | sales |
| 420 Website Visitor Tracker v1.0 | Website Visitor Tracker | sales |
| 420 WhatsApp Outbound v1.0 | WhatsApp Outbound | communications |
| 420 communication  v3.8 | Omnichannel Orchestrator | communications |
| 420 main : multi tenant v2.1 | Core Operations Engine | operations |
| 420 sales part 1 - multi tenant v5.8 | Sales Automation Engine | sales |
| 420 sales part 2 - multi tenant v5.7 | sales part 2 | sales |
| 420-api-pool-daily-reset | 420-api-pool-daily-reset | operations |
| 420-search-cascade-v1 | 420-search-cascade-v1 | operations |
| BBQ Tonight - Dispatch Auto-Assign v1.0 | Restaurant Dispatch Auto-Assign | industry |
| OPS - GUARDIAN Quality Monitor v1.0 | OPS - GUARDIAN Quality Monitor | intelligence |
| OPS — Agent Dispatcher | OPS — Agent Dispatcher | operations |
| OPS — Agent Performance Weekly Score | OPS — Agent Performance Weekly Score | sales |
| OPS — BUYER Delivery Tracker | OPS — BUYER Delivery Tracker | operations |
| OPS — BUYER Process Reorders | OPS — BUYER Process Reorders | operations |
| OPS — COURIER Process Returns | OPS — COURIER Process Returns | operations |
| OPS — COURIER Tracking Poller | OPS — COURIER Tracking Poller | operations |
| OPS — Currency Risk Monitor | OPS — Currency Risk Monitor | intelligence |
| OPS — DIPLOMAT Monthly Scoring | OPS — DIPLOMAT Monthly Scoring | sales |
| OPS — Emergency Stop | OPS — Emergency Stop | operations |
| OPS — FACTORY Daily Planning | OPS — FACTORY Daily Planning | operations |
| OPS — Full Autonomy Monitor | OPS — Full Autonomy Monitor | intelligence |
| OPS — GUARDIAN Monthly Compliance | OPS — GUARDIAN Monthly Compliance | operations |
| OPS — NEXUS Daily Briefing | OPS — NEXUS Daily Briefing | intelligence |
| OPS — Notification Router | OPS — Notification Router | communications |
| OPS — OPTIMIZER Weekly Report | OPS — OPTIMIZER Weekly Report | operations |
| OPS — ORACLE Daily Forecast | OPS — ORACLE Daily Forecast | sales |
| OPS — SENTINEL Anomaly Detection | OPS — SENTINEL Anomaly Detection | intelligence |
| OPS — SENTINEL QC Webhook | OPS — SENTINEL QC Webhook | intelligence |
| OPS — SLA Monitor | OPS — SLA Monitor | intelligence |
| OPS — STOCKMASTER Reorder Monitor | OPS — STOCKMASTER Reorder Monitor | intelligence |
| OPS — TREASURER Daily Budget Alert | OPS — TREASURER Daily Budget Alert | intelligence |
| R-ROOFING-01 Inspection Scheduler | R-ROOFING-01 Inspection Scheduler | industry |
| R-ROOFING-02 Insurance Claim Orchestrator | R-ROOFING-02 Insurance Claim Orchestrator | industry |
| R-ROOFING-03 Storm Event Trigger | R-ROOFING-03 Storm Event Trigger | industry |
| R-ROOFING-04 Warranty & Maintenance Recall | R-ROOFING-04 Warranty & Maintenance Recall | industry |
| TENDER — Payment Aging Clock | TENDER — Payment Aging Clock | industry |
| TENDER — Security Deposit Maturity | TENDER — Security Deposit Maturity | industry |
| TENDER — Stage Progression Webhook | TENDER — Stage Progression Webhook | industry |
| YT-AssetGen v1.0 | YT-AssetGen | industry |
| YT-Audit v1.0 | YT-Audit | industry |
| YT-CompetitorDiscover v1.0 | YT-CompetitorDiscover | industry |
| YT-CompetitorMonitor v1.0 | YT-CompetitorMonitor | industry |
| YT-DailyDiscovery-MultiTenant v1.0 | YT-DailyDiscovery | industry |
| YT-DailyFollowups-MultiTenant v1.0 | YT-DailyFollowups | industry |
| YT-DailyOutreach-MultiTenant v1.0 | YT-DailyOutreach | industry |
| YT-DailySummary-MultiTenant v1.0 | YT-DailySummary | industry |
| YT-EnrichEmails-MultiTenant v1.0 | YT-EnrichEmails | industry |
| YT-Outreach v1.0 | YT-Outreach | industry |
| YT-ReplyMonitor-MultiTenant v1.0 | YT-ReplyMonitor | industry |
| YT-ReportGen v1.0 | YT-ReportGen | industry |
| YT-SEO v1.0 | YT-SEO | industry |
| YT-ScriptWriter v1.0 | YT-ScriptWriter | industry |
| YT-TrendDetector v1.0 | YT-TrendDetector | industry |
