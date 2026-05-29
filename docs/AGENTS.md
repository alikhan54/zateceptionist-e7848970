# CC Session Bootstrap — READ ME FIRST

This file is the entry point for every Claude Code session on the 420 System.
Always read this BEFORE starting any work. It is institutional memory — treat it as load-bearing.

> HR workflow registry (§7) was re-verified against the live n8n API on **2026-05-29**
> (267 active workflows scanned). `hr_*` table count (48) verified by live SQL the same day.

## 1. System State

**Scale:** 267 active n8n workflows, 12 LangGraph agents, 41+ VAPI tools, 17+ active tenants, 48 `hr_*` tables.

**Tenants:**
- Zateceptionist: `ac308ab6-f381-4eef-88ec-4d5c7a860ff9` (premium, SLUG `zateceptionist`)
- Cosmique Aesthetics: `933967dd-1f90-4676-96c1-42a01b6d9835` (premium, healthcare_clinic)
- ACSFX: `8899f7c1-43c7-4bf1-9742-7fc721a3422c` (forex)
- BBQ Tonight: `619be238-80e6-4048-8ac2-b13d0d704463` (restaurant)
- ~37 other free-tier tenants

**Premium tier:** Claude (paid Anthropic), Apify (paid), HeyGen (paid), VAPI (paid).
**Free tier:** Gemini 2.5 Flash (4-key rotation), Google CSE, Ollama hermes3:8b, free Apify.

## 2. Active Sessions (CHECK BEFORE TOUCHING FILES)

Read `D:/420-system/frontend/docs/CC_SESSION_COORDINATION.md` for live ownership.

Common parallel sessions:
- **HR V4** — owns `pages/hr/*`, `pages/my/*`, `hooks/useHR.ts`, `hooks/useRecruitment.ts`, `hooks/useAutoMode.ts`, `hr_*` tables, HR workflows
- **BSH-HMS** — owns `docs/BSH_*.md` ONLY, Bahmni HMS research (no src/ edits). NOTE: this session repeatedly checks out the HR branch as a working location — always verify branch before editing.
- **Smart Ledger** — owns Smart Ledger workflows + tests
- **Video V4** — owns `VideoStudio.tsx`, video workflows, ComfyUI
- **Cosmique V3, Sales V3, Mark V3, Comms V3, ACSFX V3, ONB V3, Ops V3** — modular by name

## 3. CRITICAL DO-NOT-DO List

- ❌ NEVER push to `main` without confirming ALL other sessions are done
- ❌ NEVER use `git add -A` / `git add .` blindly — picks up other sessions' WIP
- ❌ NEVER modify `Layout.tsx`, `OmegaFloatingChat.tsx`, `NavigationSidebar.tsx`, `supabase.ts`, `hooks/`, `contexts/` without coordination
- ❌ NEVER drop stashes without creating a backup branch first
- ❌ NEVER use the direct DB host (IPv6 only on Windows Docker → fails)
- ❌ NEVER use the session pooler on port 5432 (`MaxClientsInSessionMode`)
- ❌ NEVER claim "PASS" via curl alone — UI must be exercised via Playwright with screenshot
- ❌ NEVER modify sacred/high-blast-radius workflows (Marketing 552-node, Sales 407-node, Comm) via API PUT — UI only

## 4. Bootstrap Commands (Run At Session Start)

```bash
cd D:/420-system/frontend

# Verify state
git status
git branch --show-current
git log origin/main..HEAD --oneline

# Check other sessions
git log --all --oneline -20
ls -la docs/.session-state-* 2>/dev/null

# Read coord doc
cat docs/CC_SESSION_COORDINATION.md 2>/dev/null
```

**Environment note (verified 2026-05-29):** `psql` is NOT on PATH and `$DB_PASS` / `$N8N_API_KEY` are NOT exported in the Git-Bash shell. Use Python 3.14 (`/c/Python314/python`) with `psycopg2` (installed) reading creds from `D:/420-system/.env`, and pass the n8n API key explicitly (it lives in `CLAUDE.md`, header `X-N8N-API-KEY`). The n8n public list endpoint returns `nodes` inline, so all active workflows can be scanned in a few paginated GETs.

## 5. Known Gotchas (DON'T REPEAT)

### Schema
- `hr_employees` uses `user_id`, NOT `auth_user_id`
- `hr_employees.emergency_contact_relationship` (not `_relation`)
- `hr_attendance` uses `check_in_time` / `check_out_time` (TIMESTAMPTZ)
- "Working now" = `check_out_time IS NULL AND work_date = CURRENT_DATE`
- `review_type` CHECK enum: 'self' | 'manager' (rater type, NOT period name)
- `hr_candidates.source` CHECK enum has 17 valid values (linkedin_apify, linkedin_google, indeed, etc.)
- Phase 4 candidate insert: DON'T set `full_name` (generated column); normalize `match_score` to 0–9.99 (numeric(5,4) overflows)
- **Policy editing writes to `hr_documents`, NOT `hr_policies`** (versioned via `parent_document_id` / `is_current_version`). `hr_policies` is a separate, near-empty table referenced only by the policy-sync workflows.
- tenant_id format varies by table:
  - `sales_leads`, `sequences` enrollment → SLUG text
  - `lead_gen_history`, `tenant_config.id` → UUID
  - `tenant_config` has BOTH: `id`=UUID, `tenant_id`=SLUG

### n8n
- Auto-migrates DDL to the `n8n` schema if no explicit `public.` prefix — always qualify `public.`
- PostgREST cache stale after schema changes → `NOTIFY pgrst, 'reload schema'`
- Webhook nodes require an explicit `webhookId` field (UI auto-generates it; REST POST does not)
- HTTP nodes need `predefinedCredentialType` and `nodeCredentialType` for `$credentials.X.Y` to resolve
- `Respond to Webhook` must be IN SERIES, not "Immediately" mode (n8n 2.1.2)
- `$('nodeName').first()` inside splitInBatches loops causes cross-tenant contamination — use `$getWorkflowStaticData('node')`
- Large workflows (>380 nodes): GET a fresh copy immediately before modifying
- When PUT doesn't propagate to workflow_history: POST a new workflow instead

### Frontend / Deploy
- Active layout: `Layout.tsx` → `NavigationSidebar.tsx` (NOT `AppSidebar.tsx`) — grep `Layout.tsx` to confirm the import before editing any nav/sidebar file
- Lovable build queue lags 25–40 min often — verify bundle hash before claiming a UI deploy
- `null` from Supabase = query failed; `0` = real empty data
- `Promise.allSettled` prevents cascade failures in data hooks
- TypeScript must pass with zero errors before any frontend push
- `npm run preview` (production build) required before push — Vite dev-server masks CSS bugs; preview can serve stale dist, so kill all previews and rebuild before testing
- Never use the Lovable editor to write code — it overwrites Claude Code changes

### RLS
- Policies using `auth.jwt()->>'user_metadata'->>'tenant_id'` may not work
- Prefer the `get_user_tenant_uuid()` pattern used by working HR tables
- UUID cast required for UUID columns: `tenant_id::text = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')`
- `PATCH` requests fail silently when the body contains a non-existent column (PGRST204)
- PostgREST scalar TEXT responses are incompatible with the n8n JSON parser — return `json_build_object(...)`

### Multi-Session
- BSH-HMS keeps checking out the HR branch as a working location — verify branch before any edit
- `git add -A` accidentally bundles other sessions' WIP (e.g. `docs/BSH_PHASE2_GAP_AUDIT.md` is a BSH file)
- Always create a backup branch before destructive ops: `git branch backup/<name>-$(date +%Y%m%d-%H%M)`
- Stash with a clear label: `git stash push -m "DESCRIPTIVE-LABEL"`

## 6. Multi-Session Workflow

1. Before any edit: `git status && git branch --show-current` — confirm the right branch
2. Investigate first: `cat` / `grep` for existing patterns — additive only
3. Backup before risky moves: `git branch backup/<name>-$(date +%Y%m%d-%H%M)`
4. Stage specific files: `git add specific/path.tsx` — never `git add -A`
5. Commit with clear scope: `feat(hr):` / `fix(sales):` — module prefix
6. Verify before claim: Playwright + screenshot for UI, SQL snapshot for DB writes
7. Save state on exit: update or create `docs/.session-state-<module>-<date>.md`

## 7. Workflow IDs Registry

### HR Module (verified active via n8n API 2026-05-29)
- `U9Yb2JSa46NlOKXC` 420 HR part1 v1.1 — employee/leave/attendance/payroll monolith (touches 27 hr_ tables)
- `tHIN8s5hurqzRU7g` 420 HR Part 2 v1.9.3 — recruitment monolith (touches 34 hr_ tables)
- `GoLKFQ3raVFyDg40` HR Auto-Pipeline v1.0 (15-min cron, 7-stage rules)
- `K46ve7frdaHYBpn2` HR Generate Job Questions v1.0 (Claude+Ollama routing)
- `hDmRNaIrs1qJHuYq` HR Job Q-Gen Auto-Fill v1.0 (5-min cron)
- `VDDy59DDJsihAUAX` HR AI Screening v1.0 (Claude/Gemini)
- `MatQ3J4HYAgKiJ6A` HR AI Interview Question Gen v1.0
- `bcaK7Lxd0HgtVfqW` HR AI Interview Call v1.0 (VAPI)
- `0VEBSpO63nEiR1xh` HR AI Interview Receiver v1.0 (VAPI webhook → Claude scoring)
- `A0M2juuizluBwASl` HR Auto-Review v1.0 (Claude performance reviews)
- `HTuKFLf8uiDnzPJA` HR Training Generator v1.0 (Claude)
- `4u2H6AwbDnYcGQW5` HR Training Avatar Video v1.0 (HeyGen)
- `bLXL1ujHv9wD7RX1` HR AI → OMEGA Bridge v1.0 (tool-aware DB tools)
- `31qSIf2I6VAF2loU` HR Policy Sync v1.0 (extracts rules → 5 AI agents; reads `hr_documents`)
- `i39PJEW8Z7IkFkUY` HR Onboarding v2.0
- `Tu7QL8CZdiyQCYGG` HR Leave Request v2.0
- `5WLVNYiiAHJYKuFW` HR Auto Punch-Out Cron v1.0 (30-min)
- `YsOhnEct1zWljE3L` HR Sourcing v2 — TS Trigger (entry) — **NOTE: the previously-documented `jX8xqW5EZGar3GWn` is NOT in the active set; `YsOhnEct1zWljE3L` is the live entry as of 2026-05-29**
- `l1RMxMScCbvXOqmm` HR Sourcing v2 — Phase 1 Career Scraping (optional)
- `XjSilVmjJeRIwNMF` HR Sourcing v2 — Phase 2 Google Search (Apify + CSE + past applicants)
- `PWb5cPBpK4FTgwwW` HR Sourcing v2 — Phase 3 Enrichment (Apify Profile Scraper)
- `0Z1A7e5Cp8LraOnL` HR Sourcing v2 — Phase 4 Save & Enroll (save + application link)

Adjacent (non-HR-named) workflows that also touch hr_ tables: `rG1G3WHbqUHB295n` Intelligence Hub v2.3, `E8HZhv4y4MRb6n9F` Marketing v2.6, `mlsC24hFDv6O7GyG` AI Agent Activator v1.0.

### Sacred / High Blast Radius (UI only, no API PUT)
- `E8HZhv4y4MRb6n9F` Marketing v2.6 (552 nodes)
- `aTGIlVgvf6lUWHlW` Sales Part 1 (407 nodes)
- `TXeVEskxcLuLwplr` Comm v3.8 (378 nodes)
- `fvXs1Z94tvje0QfY` Video Intelligence Orchestrator v1.0
- `dEgqwQ7YDm4i7706` 420 main multi-tenant v2.1 (514 nodes)
- `Gnk01auPc9WLYIJU` Estimation v1.0

## 8. Connection Strings

- Supabase project: `fncfbywkemsxwuiowxxe`
- Transaction pooler (queries): `aws-1-ap-southeast-1.pooler.supabase.com:6543`, user `postgres.fncfbywkemsxwuiowxxe`, db `postgres`
- DDL (apply_migration): port 5432 direct, never the pooler
- n8n API: `http://localhost:5678/api/v1` (header `X-N8N-API-KEY`)
- Webhook base: `https://webhooks.zatesystems.com/webhook`
- LangGraph brain: `http://localhost:8123` (container `420-langgraph-brain`)
- Frontend live: `https://ai.zatesystems.com`
- Frontend local preview: `http://localhost:4173` (or 4274/4280/4285 on conflict — kill all and restart)
- GitHub: `alikhan54/zateceptionist-e7848970`
- Creds: DB password + service key in `D:/420-system/.env`; n8n key in `CLAUDE.md`

## 9. Test Credentials (Playwright only)

- `adeel@zatesystems.com` (zate admin) / `Zate2024!-!`  (note the `-!` suffix — easy to drop)
- Per-tenant industry users live in `.credentials/` (gitignored) and in `CLAUDE.md §21`. Request fresh access per session; read `frontend_admin_credential.md` on need.

## 10. AI Provider Routing (Per Tenant)

```
if (tenant.api_tier === 'premium' && tenant.anthropic_api_key) {
  // Cosmique + Zate
  use Claude 3.5 Sonnet
} else if (gemini_keys_available && quota_ok) {
  use Gemini 2.5 Flash (4-key rotation)
} else {
  use Ollama hermes3:8b (local, free, slower)
}
```

## 11. HR Feature Map (snapshot 2026-05-29)

Full breakdown: `docs/.hr-feature-gap-audit.md`. Of 48 `hr_*` tables:
- **20 working** (UI + data), **7 built-but-empty** (UI, no rows yet), **14 hidden** (backend/data, no UI), **7 placeholders**.
- Top hidden features to surface next: `hr_leave_types` (7 rows + 4 wf, no admin UI), `hr_pipeline_summary` (8-row funnel view), `hr_public_holidays`, `hr_notifications`, `hr_shifts`/`hr_employee_shifts`.

## 12. After Every Session — UPDATE THIS FILE

Discoveries to add:
- New gotcha → §5
- New / corrected workflow ID → §7
- New active-session ownership → §2
- Schema/column correction → §5

This file is institutional memory. Keep it accurate; correct stale IDs rather than copying them forward.
