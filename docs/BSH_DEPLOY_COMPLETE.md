# BSH-HMS — DEPLOY COMPLETE ✅

**Date:** 2026-05-30
**Tenant:** `bsh-demo` (`healthcare_hospital`)
**Status:** Backend live, merged to `origin/main`, multi-tenant safety verified.

The BSH-HMS healthcare_hospital vertical is fully deployed and verified on the live AMD
server. The pitch centerpiece — *MEDICA reads a chart and cites real abnormal lab values* —
holds post-merge, with cross-tenant leak-safety and a clean multi-tenant regression.

---

## 1. Git / merge state (origin/main)

| Commit | Meaning |
|---|---|
| `8fd7a6b` | **origin/main HEAD** — merge: BSH labs seed overlay + centerpiece proof doc |
| `3a6452f` | TSH seed overlay + `BSH_LABS_CENTERPIECE_PROVEN.md` |
| `c9e209a` | **Big merge** — BSH-HMS vertical (3 services, OWA, 12 workflows, migrations, demo materials) |

- Merge was **100% additive**: 75+ files, **0 `src/` changes, 0 build-config, 0 sacred files**.
- **Lovable build is byte-identical** to prior production (Vite never sees `services/`,
  `scripts/`, `docs/`, `supabase/migrations/`, `bahmni-config/`, `bsh-intelligence-owa/`).
- Merge safety method: throwaway-merge audit → zero-`src/`-diff proof → `--no-ff` merge with
  conflict guard → push only if `src/` clean. Both merges (c9e209a, 8fd7a6b) had **zero conflicts**.

## 2. Brain (LangGraph) — `420-langgraph-brain` @ localhost:8123

- Rebuilt + recreated this session (`docker compose up -d --build`), **12 agents healthy**.
- Code is **image-baked** (not git-tracked); changes recorded in `BSH_LABS_CENTERPIECE_PROVEN.md`:
  leak-safe `_get_bahmni_config`, 3 fixed lab tools, `healthcare_hospital` MEDICA gate, NEXUS
  routing prompt.
- Bahmni env in `langgraph-agents/.env`: `BAHMNI_API_TOKEN` (env-sourced, not in DB),
  `BAHMNI_TLS_VERIFY=false`; `BAHMNI_BASE_URL` deliberately unset (per-tenant routing, leak-safe).

## 3. Tenant config (live)

| tenant_id | industry | bahmni_base_url | subscription_status |
|---|---|---|---|
| `bsh-demo` | `healthcare_hospital` | `https://host.docker.internal:8443` | **active** |
| `cosmique` | `healthcare_clinic` | `null` (dormant) | (unchanged) |

## 4. n8n workflows — 12 BSH ACTIVE (12/12)

| ID | Workflow |
|---|---|
| `2TGvy6ct5i1yRaDy` | Bahmni Lab Critical Alert v1.0 |
| `j0a1gkfhtffO4NGO` | Bahmni Patient Education Video v1.0 |
| `bWJdVOhrEkrXa7Ec` | Bahmni Appointment Reminder v1.0 |
| `TQinOm0rIW3dDbg0` | Bahmni Daily Briefing v1.0 |
| `fyn6oq1JPk2lYxLo` | Drug Interaction Alert v1.0 |
| `0PlMzB0ypYCNXILi` | No-Show Prediction Sweep v1.0 |
| `KdOewMAeqwGI7ucr` | Bed Occupancy Forecast v1.0 |
| `Fikr4yhlkcaRkXbn` | Readmission Risk Daily v1.0 |
| `sbAdElYSUloQaocX` | Multi-Branch Hourly Aggregator v1.0 |
| `T3vemVGW5sTVQOyQ` | Corporate Invoice Batch v1.0 |
| `L44uqPiR3kTxgjaD` | Voice OPD Reception v1.0 |
| `8okfEV1oaNHz9TJA` | Lab Critical-Mass Alert v1.0 |

> Note (T19): cron triggers can be lost across n8n container restarts. If BSH crons stop
> firing after a restart, re-run `scripts/activate-bsh-workflows.sh` (or re-toggle) and verify
> `active=true`.

## 5. Sacred workflows — 9/9 UNTOUCHED

Verified by `updatedAt` timestamp + `active` state, identical before/after BSH activation:
`E8HZhv4y4MRb6n9F`, `TXeVEskxcLuLwplr`, `fvXs1Z94tvje0QfY`, `Gnk01auPc9WLYIJU`,
`dEgqwQ7YDm4i7706`, `aTGIlVgvf6lUWHlW`, `0CgtzVNs8zBWEFjg`, `cLTvu6oghz9B5p0z`, `5ZRNaT9BMmbSRj5v`.

## 6. Verification (all [VERIFIED], live, post-merge)

| # | Check | Result |
|---|---|---|
| Centerpiece | `/agent/medica` bsh-demo | **8 abnormal values cited** — K⁺ 6.8 [3.5–5.6], SGPT 180 [0–35] ×4, cholesterol 7.8 [<5.17] ×3 |
| NEXUS path | `/run` bsh-demo | `agent_used=medica`, same values + clinical recs |
| Leak-safety | `/agent/medica` cosmique | "not configured for our COSMIQUE tenant" — **zero** bsh-demo data leaked |
| Regression | cosmique patients | MEDICA **3** == DB **3** (routed to MEDICA) |
| Regression | zate leads | NOVA **613** == DB **613** (routed to NOVA) |
| Sacred | 9 workflows | identical `updatedAt`, still active |
| bsh-demo | subscription | `active` persisted in Supabase |

**Conclusion:** BSH changes are additive and isolated — no other tenant impacted, routing
intact, no cross-tenant Bahmni leak.

## 7. Lovable / frontend

The BSH merge has **zero `src/` changes** → Lovable Publish is a frontend **no-op**
(byte-identical build). Publishing only re-syncs Lovable's tracked HEAD to the new `main`;
**not blocking, zero risk**. Publish when convenient to keep main ↔ production in sync.

## 8. Pre-demo checklist (before EXTERNAL BSH demo)

- [ ] **Rotate Bahmni `admin` password** (currently stock `Admin123`, internal-only) → update
      `BAHMNI_API_TOKEN` in `langgraph-agents/.env` (`base64("admin:<NEW>")`) → `docker compose up -d`.
- [ ] Confirm Bahmni reachable from brain; one live MEDICA lab call.
- [ ] **Tier B appointments** — DEFERRED; clean follow-up session.

## 9. What's NOT done (intentional)

- Bahmni admin password rotation (deferred to pre-demo, internal-only for now).
- Tier B appointment flows (deferred).
- Lovable Publish (no-op, user runs when convenient).

## 10. Final handoff (2026-05-30)

### External demo access — [VERIFIED]
- `https://hms-bsh.zatesystems.com/openmrs` → **200** via Cloudflare tunnel; login page 200.
- `admin` logs in (REST session `authenticated=true`). **50 patients**, **32 lab observations**
  externally queryable. Local access note + login live in `D:/420-system/bsh-hms/DEMO_ACCESS.txt`
  (gitignored, never committed). AMD box must be ON (tunnel runs from it).

### Daily Bahmni backup — [VERIFIED, scheduled]
- Windows task **`BSH-Bahmni-Daily-Backup`** runs `D:\420-system\bsh-hms\backup-bahmni.cmd`
  daily at 03:00; 14-day retention; first dump = 135 MB (`openmrs_YYYYMMDD.sql`).
- Exact dump command (password lives ONLY in the container env, never on disk):
  ```
  docker exec bahmni-lite-openmrsdb-1 sh -c "mysqldump -u root -p\"$MYSQL_ROOT_PASSWORD\" --single-transaction --no-tablespaces openmrs" > D:\420-system\bsh-hms\backups\openmrs_<date>.sql
  ```

### Security posture (pre-production items — flagged, intentionally deferred)
- **Bahmni admin password NOT rotated** — kept stock `admin:Admin123` per user decision
  (shared with partner + client for the pilot). **Rotate before production.**
- `langgraph-agents/.env` is readable by local `Users`/`Authenticated Users` (inherited ACL);
  acceptable on this single-operator box, **tighten before production** (`icacls /inheritance:r`).
- No secrets tracked in git (verified: 0 `.env`/`.pem`/credential files in `git ls-files`).

### Deferred (out of scope, future sessions)
- **Tier B appointments**, **whitelabel branding**, **Phase 3 frontend** (embed the MEDICA
  lab-reading centerpiece inside the Bahmni/420 UI — currently demoed live via API).
