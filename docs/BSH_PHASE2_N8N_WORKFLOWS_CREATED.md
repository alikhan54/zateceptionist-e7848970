# BSH-HMS Phase 2 — n8n Workflows (verified + tagged)

> **Filename note:** kept as `…_WORKFLOWS_CREATED.md` to match the mission spec and the
> self-check, but the honest finding is that the 12 workflows were **not created this
> session — they already existed** (prior sessions, `updatedAt` 2026-05-28). This session
> **verified** them and applied the `bsh-hms` tag. Machine-readable companion:
> `BSH_PHASE2_N8N_BASELINE.json`.

---

## 1. Premise correction (no duplication)

The task said to *find/execute creation scripts to create 12 BSH workflows*. Ground truth:

- All **12 BSH-HMS workflows already exist** in the live n8n instance (created in prior
  sessions). No creation script was found, and none was needed.
- Per the **no-duplicate guardrail**, I did **not** recreate them. Total workflow count is
  **250 before and after** — zero duplicates. `[VERIFIED-API]`

---

## 2. The 12 BSH-HMS workflows (all INACTIVE, all tagged `bsh-hms`)

| # | ID | Name | Nodes | Inline gate @ nodes 2–3 |
|---|---|---|---:|---|
| 1 | `sbAdElYSUloQaocX` | Multi-Branch Hourly Aggregator v1.0 | 4 | ✅ `Fetch tenant_config → Is healthcare_hospital?` |
| 2 | `fyn6oq1JPk2lYxLo` | Drug Interaction Alert v1.0 | 5 | ✅ |
| 3 | `Fikr4yhlkcaRkXbn` | Readmission Risk Daily v1.0 | 4 | ✅ |
| 4 | `8okfEV1oaNHz9TJA` | Lab Critical-Mass Alert v1.0 | 4 | ✅ |
| 5 | `T3vemVGW5sTVQOyQ` | Corporate Invoice Batch v1.0 | 4 | ✅ |
| 6 | `L44uqPiR3kTxgjaD` | Voice OPD Reception v1.0 | 5 | ✅ |
| 7 | `0PlMzB0ypYCNXILi` | No-Show Prediction Sweep v1.0 | 4 | ✅ |
| 8 | `KdOewMAeqwGI7ucr` | Bed Occupancy Forecast v1.0 | 4 | ✅ |
| 9 | `bWJdVOhrEkrXa7Ec` | Bahmni Appointment Reminder v1.0 | 2 | ⚠ delegator → OMEGA |
| 10 | `j0a1gkfhtffO4NGO` | Bahmni Patient Education Video v1.0 | 3 | ⚠ delegator → Doctor Avatar |
| 11 | `2TGvy6ct5i1yRaDy` | Bahmni Lab Critical Alert v1.0 | 2 | ⚠ delegator → MEDICA |
| 12 | `TQinOm0rIW3dDbg0` | Bahmni Daily Briefing v1.0 | 2 | ⚠ delegator → OMEGA |

**Verified:** `tagged_bsh-hms = 12/12`, `active=false = 12/12`. `[VERIFIED-API]`

---

## 3. Industry-gate finding (honest nuance)

- **8 of 12** carry the inline gate as nodes 2–3: a `Fetch tenant_config` HTTP node feeding an
  `Is healthcare_hospital?` IF node. Non-hospital tenants short-circuit. `[VERIFIED-API]`
- **4 of 12** are thin **delegators** (2–3 nodes) that hand off to OMEGA / MEDICA / Doctor-Avatar
  and reference the BSH tenant directly. They have **no inline gate**; their safety relies on:
  1. the called agent's **M2 firewall** industry gate (LangGraph layer), and
  2. the Supabase **`bsh_*` DB triggers** (`enforce_hospital_only_*`) verified in Section 1.

  **Recommendation:** before activating a delegator for *multi-tenant* use, add the inline gate
  to match the other 8. For the **single-tenant BSH demo** the delegators are acceptable because
  they target `bsh-demo` directly and the downstream layers fail closed.

This matches the documented **6-layer fail-closed gate** — no single workflow is the only line
of defense.

---

## 4. The `bsh-hms` tag

- Created this session: `name=bsh-hms`, `id=MQov3A1ClZWMuaUZ`. `[VERIFIED-API]`
- The instance had **zero tags** before — this is the first tag in the n8n install.
- Applied via `PUT /api/v1/workflows/{id}/tags` (additive; does not change the node graph or the
  `active` flag). Confirmed: tagging left all 12 **inactive**.

---

## 5. Sacred-workflow safety — drift = 0

Captured `updatedAt` for all 9 sacred workflows + Doctor Avatar **before** tagging, re-read
**after** tagging the 12 BSH workflows. **All identical — 0 drift caused by this session.**
`[VERIFIED-API]`

| Sacred | updatedAt (unchanged) |
|---|---|
| `E8HZhv4y4MRb6n9F` Marketing | 2026-05-22T11:15:36.771Z |
| `TXeVEskxcLuLwplr` communication | 2026-05-22T11:15:36.855Z |
| `fvXs1Z94tvje0QfY` Video Orchestrator | 2026-05-29T11:11:43.746Z ※ |
| `Gnk01auPc9WLYIJU` Estimation | 2026-03-28T07:09:18.980Z |
| `dEgqwQ7YDm4i7706` main v2.1 | 2026-05-19T05:52:32.282Z |
| `aTGIlVgvf6lUWHlW` sales part 1 | 2026-05-22T10:53:38.607Z |
| `0CgtzVNs8zBWEFjg` OMEGA Campaign Executor | 2026-04-16T15:17:47.158Z |
| `cLTvu6oghz9B5p0z` OMEGA Daily Briefing | 2026-04-22T17:53:39.765Z |
| `5ZRNaT9BMmbSRj5v` OMEGA Lead Gen Async | 2026-03-27T07:11:01.753Z |
| `lhdU0HUxmdgSSDpD` Doctor Avatar | 2026-05-20T11:21:49.671Z |

**※ Honesty flag:** `fvXs1Z94tvje0QfY` already showed `updatedAt=2026-05-29` (today) at the
moment I captured the baseline — it was touched by **concurrent activity (another session or a
cron) before this session began**. This session did **not** modify it; the timestamp is
identical before and after my tagging.

---

## 6. AMD activation note (NOT done here)

The 12 workflows are intentionally left **INACTIVE**. They should be activated **on AMD demo day**,
after the Bahmni backend is live and `bsh-demo.subscription_status` is flipped to `active`
(see Section 1 §6). Activation order and smoke tests are in `BSH_AMD_DEPLOY_DAY_PLAN.md`.
Per ticket **T19**, cron triggers can be lost across container restarts — re-run `toggle_crons.py`
and confirm `active=true` after activation.
