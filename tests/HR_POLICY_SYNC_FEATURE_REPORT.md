# Policy Enforcement — Documents Train AI Agents (2026-05-25)

```
╔══════════════════════════════════════════════════════════════════╗
║  POLICY ENFORCEMENT — Documents Auto-Train AI Agents             ║
╠══════════════════════════════════════════════════════════════════╣

✅ SCHEMA          5 new columns on hr_documents:
                    document_content TEXT
                    extracted_rules JSONB
                    sync_status TEXT DEFAULT 'pending'
                      CHECK (pending|syncing|synced|failed|skipped)
                    synced_at TIMESTAMPTZ
                    sync_error TEXT

✅ WORKFLOW        420 HR Policy Sync v1.0 (id 31qSIf2I6VAF2loU)
                    PS.1 Webhook (path: hr/document/sync-to-agents)
                    PS.2 Process Document (Gemini 2.5 Flash + agent update)
                    PS.3 Respond
                    active: True, 3 nodes
                    Gemini key pool: 4 working keys (one was reported
                      leaked — removed; matches existing JC.5/JC.6
                      AI Parse rotation)

✅ FRONTEND        src/pages/hr/Documents.tsx
                    - Adds Content textarea (visible for syncable types only)
                    - Adds 5 syncable categories (handbook, code_of_conduct,
                      sop, guidelines on top of policy/contract)
                    - Fires WEBHOOKS.HR_DOCUMENT_SYNC after insert
                      (fire-and-forget — never blocks upload)
                    - Toast: "AI agents are being trained on this document…"
                   src/pages/hr/AIAgentProfile.tsx
                    - New "Policies Enforced" card (Shield icon, blue accent)
                      listing every policy with name, type, rule count, date
                    - Only renders when agent has ≥1 policy
                   src/lib/api/webhooks.ts
                    - Adds HR_DOCUMENT_SYNC = "/hr/document/sync-to-agents"

✅ TEST            tests/hr-data-integrity.spec.ts — strict INPUT vs DB
  D1 Employee data integrity:          PASS
  D2 Job posting persistence:          PASS
  D3 Document upload:                  PASS
  D4 Policy → AI agent sync (NEW):     PASS
       sync_returned_success:   ✅ success:true from webhook
       doc.sync_status:         ✅ "synced"
       rules_extracted:         ✅ 6 rules from leave policy
       all_agents_updated:      ✅ 2/2 Zate agents got the policy
                                 in knowledge_base.policies

✅ DEPLOY          frontend pushed to main (commit 31b7698)
                   Lovable build live: index-BAgQ2mw2.js
                   n8n workflow already live before push (backend ready
                     when frontend deploys)

✅ TYPESCRIPT      clean on all changed files
✅ BUILD           vite ✓ built in 25.08s

CLEANUP            All PWVERIFY/BUGREPRO/Test Policy artifacts deleted.
                   Smoke-test policy entries removed from agents'
                   knowledge_base (test docs removed too).
                   Baselines restored:
                     hr_employees:        21
                     hr_documents:         9
                     hr_job_requisitions: 11
                     ai_agents:            2 (Sofia + Elena, template hires)

╚══════════════════════════════════════════════════════════════════╝
```

## End-to-end proof

### Smoke test (before formal Playwright run)

`POST /webhook/hr/document/sync-to-agents` with a real leave-policy document:
```json
{
  "success": true,
  "document_id": "89d61526-dac2-4987-b428-13ff343eb41b",
  "document_type": "policy",
  "document_name": "PWVERIFY Company Leave Policy",
  "rules_extracted": 6,
  "agents_total": 2,
  "agents_updated": 2,
  "errors": [],
  "summary": "PWVERIFY's Company Leave Policy outlines entitlements for full-time
              employees, including 30 days of annual leave, specific request
              procedures, sick leave requirements, and limits on unplanned
              personal leave. It also addresses leave accrual for probationary
              employees and the non-rollover of unused annual leave."
}
```

### Database verification

```
=== document state ===
sync_status: synced
synced_at: 2026-05-25T14:38:51.121+00:00
sync_error: null

=== rules extracted (6 distinct rules) ===
 - All full-time employees are entitled to 30 days of annual leave per calendar year, accrued at 2.5 days per month
 - Annual leave requests must be submitted at least 7 working days in advance and approved by the direct manager
 - Sick leave requires a medical certificate after 2 consecutive days
 - Maximum 5 days of unplanned personal leave per quarter
 - Unused annual leave does not carry over beyond December 31
 - Probation period employees accrue half-rate leave until confirmation

=== key terms extracted (17) ===
full-time employees, annual leave, calendar year, accrued, working days,
direct manager, sick leave, medical certificate, consecutive days,
unplanned personal leave, quarter, unused annual leave, carry over,
December 31, probation period employees, half-rate leave, confirmation

=== agents after sync ===
Sofia    knowledge_base.policies includes PWVERIFY Company Leave Policy (6 rules)
Elena    knowledge_base.policies includes PWVERIFY Company Leave Policy (6 rules)
```

## Safety properties verified

| Property | How verified |
|---|---|
| Fire-and-forget — document upload not blocked | Documents.tsx wraps webhook call in `.catch()` — upload mutation completes whether webhook succeeds or fails |
| Multi-tenant safe | PS.2 verifies `doc.tenant_id === body.tenant_id` AND filters agents by `tenant_id=eq.X` |
| Idempotent sync (re-upload same doc) | `kb.policies` upserts by `document_id`; system_prompt block delimited by `--- COMPANY X: name ---` / `--- END X ---` markers — replaced on re-sync |
| Existing-prompt preservation | Only the doc-specific block is replaced; rest of system_prompt untouched |
| Non-syncable types ignored | Document.types NOT in {policy, contract, handbook, code_of_conduct, sop, guidelines} short-circuit with `sync_status='skipped'` |
| Gemini failure → tracked, not silent | Failure path patches `sync_status='failed'` + `sync_error=<message>` on the doc |
| Sacred workflows untouched | New standalone workflow `31qSIf2I6VAF2loU`; existing OB.2, HR Part 2, etc. unchanged |
| BOLT event fires | `system_events` insert with `event_type='document.synced_to_agents'`, `event_data` (correct column name — initial draft used `payload` and failed silently; patched) |

## What "Policy Enforcement" actually means at runtime

After upload:
1. Every active/draft/paused agent for the tenant has the policy in BOTH:
   - `knowledge_base.policies[]` — structured rules + metadata for UI rendering
   - `system_prompt` — appended block so the agent receives it on EVERY conversation turn
2. UI surface: `AIAgentProfile` now shows "Policies Enforced" card listing each policy
3. New conversations will receive the enforcement block as part of the system context, so when a user asks "Can I take 35 days annual leave?", the agent has the 30-day rule loaded.

End-state of test agent `Sofia`:
```
system_prompt length: 4366 chars (before: ~3950)
knowledge_base.policies: 5 entries (4 pre-existing template strings + 1 new structured policy)
```

## File manifest (committed in `31b7698` on main)

```
M  src/lib/api/webhooks.ts            +1 line  (HR_DOCUMENT_SYNC constant)
M  src/pages/hr/Documents.tsx         +44 -3   (content textarea + sync trigger + 3 new categories)
M  src/pages/hr/AIAgentProfile.tsx    +38 -1   (Policies Enforced card)
M  tests/hr-data-integrity.spec.ts    +97      (D4 strict input-vs-DB test)
```

n8n workflow JSON: not in git (lives in n8n DB). Reproducible from
`D:/420-system/.tmp_diag/create_policy_sync_workflow.py`.

## Outstanding (per user, deferred-by-design)

- Contract compliance monitoring (daily cron comparing employee data to
  contract terms + alerts) — high-level plan documented in prompt; not
  implemented this session. The schema + workflow built here are the
  foundation: extracted contract rules already land in `extracted_rules`
  JSONB, ready for a future Cron workflow to consume.
- File-upload UI (PDF parsing) — current implementation accepts plain
  text via textarea. Adding a PDF parser is a separate task (likely
  pdfjs-extract or Gemini multi-modal).
