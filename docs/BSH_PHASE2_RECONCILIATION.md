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

## 4. What THIS branch adds (`feature/bsh-hms-phase2-gaps`)

15 commits atop `0c657b8` (phase2 base). The first 5 were the original gap-fill; Sections
1–10 of the **"finish-everything-no-push"** mission added the rest.

| Commit | Section | Adds / does |
|---|---|---|
| `386ca8f` | gap | demo materials (DEMO_SCRIPT, LOOM_SCRIPT, FOLLOWUP_EMAILS, PITCH_TALKING_POINTS) |
| `01556b6` | gap | `BSH_INTELLIGENCE_LAYER_DESIGN.md` |
| `9664a12` | gap | `generate-bsh-fixtures.py` + 6 JSON fixtures |
| `e4232cc` | gap | `supabase/migrations/39-bsh-clinical-log.sql` |
| `91602ae` | gap | this reconciliation doc + first self-check |
| `05deca0` | **S1** | **applied migrations 37/38/39 to LIVE Supabase**; inserted `bsh-demo` tenant_config; baseline + applied docs |
| `6082f01` | **S2** | **verified + tagged 12 BSH n8n workflows** `bsh-hms` (already existed — not duplicated); baseline JSON + doc |
| `c6586c2` | S3 | `BSH_PHASE3_FRONTEND_ARCHITECTURE.md` |
| `745a992` | S4 | `BSH_VAPI_ASSISTANT_CONFIG.md` |
| `ff76910` | S5 | `BSH_CLOUDFLARE_TUNNEL_SETUP.md` |
| `b22aa45` | S6 | `BSH_BAHMNI_HARDENING.md` |
| `6e90308` | S7 | `BSH_AMD_DEPLOY_DAY_PLAN.md` |
| `1b3ae52` | S8 | `BSH_DEMO_REHEARSAL_CHECKLIST.md` |
| `0f3dc30` | S9 | expand self-check 24→37 checks (run PASS) |
| (this) | S10 | update this reconciliation doc |

**Two state changes that are LIVE (not just files):**
- **Supabase:** migrations 37/38/39 applied; `bsh-demo` tenant row exists
  (industry=`healthcare_hospital`, subscription_status=**inactive**, bahmni_base_url=NULL). `[VERIFIED-DB]`
- **n8n:** the 12 BSH workflows carry the `bsh-hms` tag and remain **INACTIVE**; instance steady at
  250 workflows (0 duplicates); sacred workflows drift=0. `[VERIFIED-API]`

**NOT recreated / NOT modified:** `services/`, OWA, `bahmni-config/`, migrations 37/38 files,
deploy/seed/smoke scripts, `doctors.json`, sacred workflows, sacred frontend files, and all
Cosmique/`healthcare_clinic` data. The only existing file modified was the fixtures README (stale
"TO BE GENERATED" markers). No existing work duplicated.

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
Checks (37): branch; the 4 gap-fill commit hashes; the 11 base commits (resolved via
local-or-origin refs, so it passes both pre-push and post-clone); the 14 gap-fill files on
disk; 7 fixture record counts; and the 10 Section 1–8 deliverables on disk. Live origin push
status is reported separately (informational, not counted). Exit 0 = local ground truth OK.

Manual spot-checks:
```bash
git log feature/bsh-hms-phase2..HEAD --oneline        # all 15 gap+section commits (after S10)
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

---

## 8. Mission ledger — "finish everything (no push)" (Sections 1–10)

This branch went beyond the original gap-fill: Sections 1–10 of the *finish-everything-no-push*
mission applied the two safe LIVE state changes and authored six deploy/demo specs. Below is the
honest delta, the premise corrections found along the way, and the exact AMD-day action list.

### 8.1 State delta

| Dimension | Before | After | Label |
|---|---|---|---|
| Supabase migrations *applied* | 37/38 existed as files on `phase2`; not applied by us | 37 + 38 + 39 applied to LIVE Supabase (39 is new on this branch) | `[VERIFIED-DB]` |
| `tenant_config` | existing rows | **+1**: `bsh-demo` (industry=`healthcare_hospital`, subscription_status=**inactive**, `bahmni_base_url`=NULL); **no existing row modified** | `[VERIFIED-DB]` |
| n8n workflows tagged `bsh-hms` | 0 tagged | 12 tagged (they **already existed** — tagged, not created/duplicated); all **INACTIVE** | `[VERIFIED-API]` |
| n8n total workflows | 250 | 250 (**0 duplicated**) | `[VERIFIED-API]` |
| Sacred-workflow drift | 0 | 0 (sacred set untouched) | `[VERIFIED-API]` |
| BSH spec docs | the 4 gap docs | **+6**: Phase-3 FE arch, VAPI config, Cloudflare tunnel, Bahmni hardening, AMD deploy-day plan, demo rehearsal checklist | `[VERIFIED-CODE]` (on disk) |
| Self-check coverage | 24 checks | **37 checks** (+ Section deliverables; ref resolution fixed for pre-push) — runs PASS 37/0 | `[VERIFIED-CODE]` |
| Branch commits atop `0c657b8` | 5 (gap-fill) | **15** (5 gap + S1–S10) | `[VERIFIED-CODE]` |

### 8.2 Premise corrections logged this mission (honesty trail)

Each doc records the ground-truth correction it found, rather than inheriting a stale assumption:
1. **Founding correction (§1–2):** the "everything was hallucinated / only 40 tools survived" premise
   was **wrong** — the 11-commit Phase-2 backend is real on GitHub; the 40 tools correctly live on the
   AMD brain, not in the frontend repo.
2. **Cloudflare ports:** not "8200–8203". Real = Bahmni **8080** + three services **9101/9102/9103**;
   only **3** services exist (the 4th hostname is Bahmni itself). *(BSH_CLOUDFLARE_TUNNEL_SETUP.md)*
3. **Deploy script name:** it is `deploy-bahmni-cloud.sh`, not `deploy-bahmni-amd.sh`.
4. **Stale deploy step:** that script's printed "apply 37+38 via Studio" Next-step is **stale** — S1
   already applied 37/38/39 via the Management API. *(BSH_AMD_DEPLOY_DAY_PLAN.md)*
5. **Bahmni overlay is partial:** `bahmni-config/` on disk has only `registration/app.json`,
   `translations/bn.json`, and a README — **not** the rich clinical/reports/openelis/odoo/theme tree the
   README advertises. *(BSH_BAHMNI_HARDENING.md)*
6. **Plaintext service-role key:** `deploy-bahmni-cloud.sh` writes the full Supabase service-role key in
   **plaintext** to `.env` (chmod 600) — flagged as a hardening item, not silently accepted.

Still **open verification items** flagged for demo day (not yet resolved):
- `hospital_tenants` view/table existence — the demo script's Act 0 `SELECT * FROM hospital_tenants`
  may need to fall back to `tenant_config`. `[CHECK]`
- `BSH-DEMO-001` literal HN vs the generator's `BSH-{year}-{seq}` format — confirm the HN exists or
  adjust the smoke/demo. `[CHECK]`

### 8.3 Token spend `[estimate]`

**Not metered — I have no access to a real token meter, so this is a rough estimate, not a measured
figure.** Across the full multi-section mission (many file reads incl. several large docs + CLAUDE.md,
the Supabase/n8n API calls in S1–S2, ~1,000+ lines of authored docs, the self-check expansion, and at
least one context compaction), cumulative spend is **on the order of low-hundreds-of-thousands of
tokens**. Treat the magnitude, not any digit, as the signal.

### 8.4 AMD-day action list (ordered; full detail in `BSH_AMD_DEPLOY_DAY_PLAN.md`)

The single blocker is the GitHub token. Everything below is gated on steps 1–3.
1. Regenerate a GitHub token with write/`repo` scope for `alikhan54/zateceptionist-e7848970`.
2. Point origin at it: `git remote set-url origin https://x-access-token:<NEW_TOKEN>@github.com/alikhan54/zateceptionist-e7848970` (or push interactively).
3. `git push origin feature/bsh-hms-phase2-gaps` — **note** `-gaps` is stacked on `feature/bsh-hms-phase2`
   (not on `main`), so push/ensure that base branch too.
4. Re-run `bsh-reconciliation-selfcheck.sh`; §6 push-status flips to `[PUSHED]`.
5. Deploy Bahmni on the AMD box: `bash scripts/deploy-bahmni-cloud.sh` (clones bahmni-docker lite,
   overlays config, writes `.env`, waits for FHIR at `:8080`).
6. Seed demo data **before** any credential rotation: `python scripts/seed-bahmni-demo-data.py`
   (idempotent; uses Admin123 — rotate only after seeding).
7. Start the 3 FastAPI services (9101/9102/9103); confirm each `/health` is 200.
8. Flip `bsh-demo` to `subscription_status=active` + set `bahmni_base_url`; create the `hospital_tenants`
   view (or update the demo script to read `tenant_config`).
9. Activate the 12 BSH workflows (`activate-bsh-workflows.sh`), then re-toggle crons (T19) and confirm
   `active=true` persisted.
10. Add the Cloudflare ingress block + DNS CNAMEs (`BSH_CLOUDFLARE_TUNNEL_SETUP.md`); create the VAPI
    assistant (`BSH_VAPI_ASSISTANT_CONFIG.md`); apply hardening — rotate Admin123, enable encrypted
    off-box backups (`BSH_BAHMNI_HARDENING.md`).
11. Run `bsh-e2e-smoke.sh` (Flows A–E + the Cosmique regression baseline); rehearse the 4 acts and warm
    the models (`BSH_DEMO_REHEARSAL_CHECKLIST.md` → `pre-demo-warmup.ps1`).

**Honesty close:** this branch is **committed locally only** — no successful push is claimed (§5).
Sections 1–4 of this doc are `[VERIFIED]`; the Section 1–10 work is `[COMMITTED-LOCAL, PUSH-BLOCKED]`.
