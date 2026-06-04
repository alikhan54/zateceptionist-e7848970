# STATE_JEWELRY — Gold/Jewelry Vertical Build State

> Living state tracker for the Gold/Jewelry industry vertical (tenant: Legacy Jewellers).
> Phase-by-phase progress, decisions, and open questions. Updated at the end of each session.

## Tenant target
- **Name:** Legacy Jewellers
- **Industry key (proposed):** `jewellery` (confirm spelling convention against existing keys in Phase 1)
- **Module flag (proposed):** `jewelry_module` — MUST default OFF for all existing tenants
- **Currency:** PKR (Pakistani Rupee) ledger

## Phase status

| Phase | Description | Status | Date |
|---|---|---|---|
| 0 | Discovery (read-only): schema, gating, onboarding/login, accounting reuse, ops finance, templates, risk | IN PROGRESS | 2026-06-04 |
| 1 | (future) Schema + RLS for jewelry tables | NOT STARTED | — |
| 2 | (future) Feature flag + sidebar gating | NOT STARTED | — |
| 3 | (future) Onboarding template + tenant + auth login provisioning | NOT STARTED | — |
| 4 | (future) PKR ledger (reuse vs build — gated on Phase 0 §4) | NOT STARTED | — |

## Key decisions (filled by Phase 0)
- See `DISCOVERY_FINDINGS.md` for evidence behind each.
- slug↔UUID + RLS pattern: see DISCOVERY_FINDINGS §1
- Gating model decision: see DISCOVERY_FINDINGS §2
- Auth login creation point: see DISCOVERY_FINDINGS §3
- Smart Ledger reuse decision: see DISCOVERY_FINDINGS §4

## Open questions
- (to be populated during discovery)
