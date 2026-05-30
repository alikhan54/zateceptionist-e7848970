# Sub-phase 2B — 8 Industry-Gated n8n Workflows

**Status:** ✅ COMPLETE (all 8 INACTIVE, industry-gated)
**Date:** 2026-05-29
**Branch:** `feature/bsh-hms-phase2`

---

## Workflows

| Slot | Name | n8n ID | Trigger | Nodes | Active |
|--:|---|---|---|--:|---|
| BSH-5 | Drug Interaction Alert v1.0 | `fyn6oq1JPk2lYxLo` | Webhook `POST /webhook/bsh/prescription-created` | 5 | INACTIVE |
| BSH-6 | No-Show Prediction Sweep v1.0 | `0PlMzB0ypYCNXILi` | Cron `0 6 * * *` (daily 06:00 UTC) | 4 | INACTIVE |
| BSH-7 | Bed Occupancy Forecast v1.0 | `KdOewMAeqwGI7ucr` | Cron `0 */4 * * *` (every 4h) | 4 | INACTIVE |
| BSH-8 | Readmission Risk Daily v1.0 | `Fikr4yhlkcaRkXbn` | Cron `0 7 * * *` (daily 07:00 UTC) | 4 | INACTIVE |
| BSH-9 | Multi-Branch Hourly Aggregator v1.0 | `sbAdElYSUloQaocX` | Cron `0 * * * *` (hourly) | 4 | INACTIVE |
| BSH-10 | Corporate Invoice Batch v1.0 | `T3vemVGW5sTVQOyQ` | Cron `0 23 * * *` (daily 23:00 UTC) | 4 | INACTIVE |
| BSH-11 | Voice OPD Reception v1.0 | `L44uqPiR3kTxgjaD` | Webhook `POST /webhook/bsh/vapi-opd` | 5 | INACTIVE |
| BSH-12 | Lab Critical-Mass Alert v1.0 | `8okfEV1oaNHz9TJA` | Cron `*/15 * * * *` (every 15min) | 4 | INACTIVE |

---

## Industry-gate pattern (every workflow)

```
[Trigger]
    ↓
[Node 2: Fetch tenant_config]   ← GET /rest/v1/tenant_config?tenant_id=eq.X&select=industry,bahmni_base_url
    ↓
[Node 3: Is healthcare_hospital?]   ← IF $json[0].industry == 'healthcare_hospital'
    ↓ TRUE                            ↓ FALSE
[Action]                          [STOP — Respond/exit silently]
    ↓
[Respond / end]
```

**Multi-tenant safety**: Even if a workflow is triggered with `tenant_id` of a non-hospital tenant, Node 3 short-circuits — Action never runs, no Bahmni call, no side effects.

---

## Verification

| Check | Method | Verdict | Evidence |
|---|---|---|---|
| 8/8 created | n8n POST /workflows × 8 | ✅ [VERIFIED-API] | All 8 returned 201 with new IDs |
| All INACTIVE | GET /workflows?name=BSH-HMS filter | ✅ [VERIFIED-API] | All show `active=false` |
| Industry-gate node present | Node count audit | ✅ [VERIFIED-API] | Cron workflows: 4 nodes (trigger + 2-node gate + action); Webhook: 5 nodes (trigger + 2-node gate + action + respond) |
| Sacred workflows untouched | Inspection of POST responses | ✅ [VERIFIED-API] | Only NEW workflow IDs returned; no sacred IDs (`E8HZhv4y4MRb6n9F`, `TXeVEskxcLuLwplr`, `lhdU0HUxmdgSSDpD`, etc.) modified |
| End-to-end cron → MEDICA → Bahmni round-trip | — | 🟡 [DEFERRED-AMD] | Requires Bahmni live (Phase 1A still blocked) |

---

## Activation (when ready)

```bash
KEY="<CLAUDE.md n8n key>"
for id in fyn6oq1JPk2lYxLo 0PlMzB0ypYCNXILi KdOewMAeqwGI7ucr Fikr4yhlkcaRkXbn sbAdElYSUloQaocX T3vemVGW5sTVQOyQ L44uqPiR3kTxgjaD 8okfEV1oaNHz9TJA; do
  curl -X POST -H "X-N8N-API-KEY: $KEY" "http://localhost:5678/api/v1/workflows/$id/activate"
done
```

Activation requires `bsh-demo` tenant_config row with `industry='healthcare_hospital'` and a valid `bahmni_base_url`. Otherwise the industry gate at Node 3 will STOP every cron firing silently.
