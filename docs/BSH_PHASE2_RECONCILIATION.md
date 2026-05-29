# BSH-HMS Phase 2 — Reconciliation & Ground Truth

> **Purpose:** the single document that tells you what is *actually* true about BSH-HMS,
> verifiable at AMD with one command. Written after a forensic pre-flight that **disproved**
> the "everything was hallucinated" premise.
> **Self-check:** `cd D:/420-system/repo && bash scripts/bsh-reconciliation-selfcheck.sh`

---

## 1. TL;DR — the correction

The recovery session was launched on the belief that prior CC sessions **hallucinated** the
BSH backend and "only 40 LangGraph tools survived." **That belief was wrong.** Forensic
verification (clone + `git log` against the GitHub remote) shows the Phase 2 work is **real,
committed, and intact** on `origin/feature/bsh-hms-phase2` — **11 commits ahead of `main`**.

**Why the earlier "gap audit" was wrong:** it inspected the local `D:\420-system` working
folder, which is **NOT a git checkout of the frontend repo** (`alikhan54/zateceptionist-e7848970`).
That folder has no `services/` tree, so the audit concluded the services were missing. In
reality they live on the GitHub branch, which the audit never fetched. The audit even hedged
that the files "live somewhere outside this repo" — they do: on the remote branch.

**Net:** nothing needed recovery. The genuine gaps were a handful of *never-created* demo
and seed artifacts, which this branch (`feature/bsh-hms-phase2-gaps`) now adds.

---

## 2. Where everything actually lives (the root-cause map)

| Artifact | Location | In GitHub frontend repo? | Status |
|---|---|---|---|
| 3 FastAPI services (auth-bridge, aggregator, vapi-handler) | `services/` on `feature/bsh-hms-phase2` | YES | REAL |
| OWA operations app | `bsh-intelligence-owa/` | YES | REAL |
| Bahmni config | `bahmni-config/` | YES | REAL |
| Migrations 37, 38 | `supabase/migrations/` | YES | REAL |
| Deploy/seed/smoke scripts | `scripts/` | YES | REAL |
| Phase 1 + Phase 2 docs | `docs/BSH_PHASE*.md` | YES | REAL |
| **40 bahmni agent tools** | `langgraph-agents/tools/bahmni_tools{,_phase2}.py` | **NO** | REAL — **local AMD only** |
| `langgraph-agents/` brain | local AMD disk | NO (never tracked here) | REAL — local AMD only |

**Key fact:** the GitHub repo is the **frontend** repo. It tracks `services/`, `supabase/`,
`bahmni-config/`, `bsh-intelligence-owa/`, `scripts/`, `docs/` — but **not** `langgraph-agents/`.
The 40 tools were never *supposed* to be in this repo; they correctly live on the AMD brain.
So "only 40 tools survived" conflated "the only BSH code on the AMD *local folder*" with "the
only BSH code that exists." Both the frontend branch (GitHub) and the brain tools (AMD) exist.

---

## 3. The 11 real Phase-2 commits (origin/feature/bsh-hms-phase2)

```
24d5fed PF       09a8af5 1C(15 tools)  83e7919 1D/1E/1F/1G  5496040 resume
f9cb445 2A(25 tools+DDL38)  01197c4 2B(8 workflows)  5df8aa8 2C(auth-bridge)
82cf4c3 2D(aggregator+DDL37)  d0aafaf 2E(vapi-handler)  4a271e0 2F(OWA)
0c657b8 2G+2H(scripts+handoff)
```
Verify: `git log origin/feature/bsh-hms-phase2 ^origin/main --oneline` → 11 lines.

Verified capability claims (from `docs/BSH_PHASE2_COMPLETE.md`, spot-checked against code):
- 13 agents registered; OMEGA tool count 81→96→121, MEDICA 11→19→34.
- 25/25 hospital tools reject non-hospital tenants with the structured industry error.
- Existing-tenant regression unchanged (Cosmique 3 patients, Zate 613 leads).

---

## 4. What THIS branch adds (the genuine gaps) — `feature/bsh-hms-phase2-gaps`

4 commits, 13 files added + 1 modified, all atop `0c657b8`:

| Commit | Adds |
|---|---|
| `386ca8f` | `docs/BSH_DEMO_SCRIPT.md`, `BSH_LOOM_SCRIPT.md`, `BSH_FOLLOWUP_EMAILS.md`, `BSH_PITCH_TALKING_POINTS.md` |
| `01556b6` | `docs/BSH_INTELLIGENCE_LAYER_DESIGN.md` (5 planes, 38-module map, R1–R11, Phase 3) |
| `9664a12` | `scripts/generate-bsh-fixtures.py` + 6 JSON fixtures; modifies `scripts/bsh-demo-data/README.md` |
| `e4232cc` | `supabase/migrations/39-bsh-clinical-log.sql` |
| (this doc) | `docs/BSH_PHASE2_RECONCILIATION.md` + `scripts/bsh-reconciliation-selfcheck.sh` |

**NOT recreated (already existed — verified, skipped):** all of `services/`, OWA,
`bahmni-config/`, migrations 37/38, deploy/seed/smoke scripts, all Phase 1/2 docs,
`doctors.json`. No existing work was duplicated or modified except the README (stale
"TO BE GENERATED" markers updated to reflect the now-generated fixtures).

---

## 5. ⚠ HONEST STATUS: pushes are BLOCKED (local commits only)

**These gap-fill commits are committed to the LOCAL AMD clone at `D:\420-system\repo`
but are NOT on GitHub origin yet.** The embedded GitHub token
(`ghp_1qQq…`, in `CLAUDE.md` and the remote URL) is **read-only**: `git ls-remote`
(read) succeeds, but `git push` is rejected with
`Invalid username or token. Password authentication is not supported`.
This matches the known "GitHub token regen needed" tickets.

Because this clone IS on the AMD machine, **the commits are still AMD-verifiable today**
(`git log` in `D:\420-system\repo`) — only the GitHub mirror is pending.

**To publish (one user action):**
1. Generate a GitHub token **with write/`repo` scope** for `alikhan54/zateceptionist-e7848970`.
2. Point the remote at it (or use it interactively):
   `git remote set-url origin https://x-access-token:<NEW_TOKEN>@github.com/alikhan54/zateceptionist-e7848970`
3. `git push origin feature/bsh-hms-phase2-gaps`
4. Re-run the self-check; section 6 will flip to `[PUSHED]`.

**Honesty labels:** Sections 1–4 = `[VERIFIED]` (read-confirmed against origin / on-disk).
Section 4 commits = `[COMMITTED-LOCAL, PUSH-BLOCKED]`. No claim of a successful push is made.

---

## 6. Verify it yourself (at AMD)

```bash
cd D:/420-system/repo
bash scripts/bsh-reconciliation-selfcheck.sh
```
Checks: branch, the 4 gap-fill commit hashes, the 11 base commits, all 14 expected files
on disk, fixture record counts, and live origin push status. Exit 0 = local ground truth OK.

Manual spot-checks:
```bash
git log feature/bsh-hms-phase2..HEAD --oneline        # the 4 gap commits
git log origin/feature/bsh-hms-phase2 ^origin/main --oneline | wc -l   # => 11
python scripts/generate-bsh-fixtures.py               # regenerate fixtures (deterministic)
```

---

## 7. What is true vs. not (no over-claim)

**TRUE / BUILT:** 11-commit Phase-2 backend on GitHub (services, OWA, config, migrations
37/38, scripts, docs); 40 bahmni tools on AMD brain; 6-layer industry gate; multi-branch
metrics; bilingual intake handlers. Plus this branch's demo materials, design doc, seed
fixtures, and migration 39 — committed locally.

**NOT DONE:** Phase-3 hospital-facing UI; live production Bahmni integration (built/tested
against demo data + contracts only); the 4 custom modules (#13/#23/#32/#36) coded;
corporate split-billing wiring. And: **this branch is not yet pushed to GitHub** (§5).

**NOT OURS (USE, open-source):** the entire clinical records core — Bahmni / OpenMRS /
OpenELIS / Odoo. We integrate via REST/FHIR; we did not fork it.
