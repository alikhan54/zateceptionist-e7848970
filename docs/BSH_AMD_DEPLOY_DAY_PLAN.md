# BSH-HMS — AMD Deploy-Day Plan

> **Status:** minute-by-minute runbook to take BSH-HMS from "all-local, no-push" to **LIVE** on the
> AMD server. Everything below is an **AMD-day action** — nothing here has been executed. The whole
> sequence is gated on **one user action: regenerate the GitHub token** (see §0.5).
>
> Labels: `[VERIFIED]` = state confirmed this session (DB/API/code); `[SCRIPT]` = runs an existing
> repo script read this session; `[USER]` = needs a human; `[estimate]` = unmeasured timing.

---

## 0. What is ALREADY done (so we don't redo it) `[VERIFIED]`

On branch `feature/bsh-hms-phase2-gaps` (local, 11 commits ahead of its fork point `0c657b8`):

| Done this session | Where | Implication for deploy day |
|---|---|---|
| **Migrations 37 + 38 + 39 applied to LIVE Supabase** | Section 1 (`BSH_PHASE2_MIGRATIONS_APPLIED.md`) | **SKIP** the deploy script's Next-step "apply 37+38 via Studio" — it is **STALE**. `bsh_*` tables + `enforce_hospital_only_*` triggers + `bsh_clinical_log` are already live. |
| **`bsh-demo` tenant_config row inserted** | Section 1 | industry=`healthcare_hospital`, **subscription_status=`inactive`**, **bahmni_base_url=NULL**. Deploy day flips these. |
| **12 BSH n8n workflows tagged `bsh-hms`, all INACTIVE** | Section 2 (`BSH_PHASE2_N8N_BASELINE.json`) | Activate via `activate-bsh-workflows.sh` (exact 12 IDs hardcoded). |
| **Demo fixtures fully populated** | `scripts/bsh-demo-data/*.json` | patients(1002 rows)/appointments/lab_orders/etc. ready for the seeder. Synthetic, deterministic (`random.seed(420)`). |
| **Deploy/seed/activate/smoke scripts present** | `scripts/` | `deploy-bahmni-cloud.sh`, `seed-bahmni-demo-data.py`, `activate-bsh-workflows.sh`, `bsh-e2e-smoke.sh`. |

### What is NOT done — do not overpromise on deploy day
- **The frontend hospital UI does NOT exist.** `BSH_PHASE3_FRONTEND_ARCHITECTURE.md` is **design-only**
  (`/hospital/*` routes, sidebar section, OWA iframe = a **4–7 day** build, not on this branch).
  **Deploy-day demo surface = Bahmni's own UI (`hms-bsh`/OWA) + voice (`bsh-vapi`) + OMEGA chat**,
  *not* new React pages. Set stakeholder expectations accordingly.
- **Bahmni is not deployed** (no `/opt/bahmni-stack` yet).
- **VAPI assistant is not created** (`BSH_VAPI_ASSISTANT_CONFIG.md` is the spec; AMD-day build).
- **Cloudflare ingress/DNS not changed** (`BSH_CLOUDFLARE_TUNNEL_SETUP.md` is the spec).

---

## 0.5. THE BLOCKER — GitHub token (T0:00) `[USER]`

The mission was deliberately "finish everything that **doesn't** require a push." Deploy day starts
by removing that constraint:

1. **Regenerate the GitHub PAT** (the one in CLAUDE.md is read-only / blocks push, same class of
   blocker as Bug #128 / T16 / T17). Scope: `repo`.
2. Update the local git remote credential.
3. **Branch topology check (do this before pushing):** `-gaps` is stacked on
   `feature/bsh-hms-phase2`, which is itself **not on `main`** (merge-base with main = `ae3a13c`).
   Decide the push/merge path: either merge `feature/bsh-hms-phase2` → `-gaps` → `main` in order, or
   open one PR from `-gaps` that carries the whole stack. **Confirm what lands on `main`** before
   Lovable auto-deploys it.

**Until step 1 is done, NOTHING else in this plan can run.** If the token can't be regenerated on
the day, the entire deploy is blocked — there is no workaround (do not attempt to bypass).

---

## 1. Timeline overview `[estimate]`

| Phase | Window | Gate to advance |
|---|---|---|
| **P0** Token + push | T0:00 → T0:20 | branch pushed; (optional) frontend deploy green |
| **P1** Bahmni up | T0:20 → T0:50 | FHIR metadata 200 at `:8080` |
| **P2** Harden (pre-exposure) | T0:50 → T1:10 | admin pwd rotated; DB pwds set |
| **P3** Seed demo data | T1:10 → T1:30 | seeder exits clean; patients visible in Bahmni |
| **P4** Wire tenant + services | T1:30 → T1:50 | `bahmni_base_url` set; 3 services healthy |
| **P5** Tunnel + DNS | T1:50 → T2:20 | 4 hostnames resolve; Access gating live |
| **P6** Activate workflows | T2:20 → T2:35 | 12 workflows `active=true` (T19-verified) |
| **P7** VAPI assistant | T2:35 → T3:20 | inbound test call reaches handler |
| **P8** Smoke + regression | T3:20 → T3:45 | `bsh-e2e-smoke.sh` all flows OK; Cosmique baseline intact |
| **P9** Flip LIVE | T3:45 → T4:00 | `subscription_status=active`; self-check PASS |

**Total `[estimate]` ~3.5–4 h** assuming no Bahmni first-boot surprises. Bahmni image pull on a cold
box can dominate P1 — pre-pull the night before if possible.

---

## 2. Phase detail

### P0 — Token + push `[USER]`/`[SCRIPT]`
```bash
# after regenerating the PAT and updating the remote:
git -C D:/420-system/repo push -u origin feature/bsh-hms-phase2 feature/bsh-hms-phase2-gaps
# then open the PR(s) per the topology decision in §0.5
```
- If `main` receives frontend changes, watch the **Lovable auto-deploy** go green before continuing.
  (This branch carries **no** frontend code, so unless the parent stack does, the FE is unaffected.)

### P1 — Bring Bahmni up `[SCRIPT]`
```bash
export SUPABASE_SERVICE_KEY=...   # service-role; see §hardening for scope-down
bash scripts/deploy-bahmni-cloud.sh
```
- The script **refuses** (exit 2) unless `bsh-demo` industry=`healthcare_hospital` — it is `[VERIFIED]`
  so it will pass. It clones `bahmni-docker` (`bahmni-lite`) to `/opt/bahmni-stack`, overlays
  `bahmni-config/`, writes `.env` (TZ=Asia/Dhaka), `docker compose up -d`, waits ≤10 min for FHIR.
- **IGNORE its printed Next-step #1** ("Apply migrations 37+38 via Studio") — already done (§0).
- **Gate:** `curl -fsS http://localhost:8080/openmrs/ws/fhir2/R4/metadata` → 200.
- **Note:** `docker compose ps` here to **record the real DB engine/container names** (hardening §3
  backups depend on this; don't assume MySQL vs PG).

### P2 — Harden BEFORE tunnel exposure `[USER]` (per `BSH_BAHMNI_HARDENING.md`)
**Ordering dependency (important):** the seeder (P3) defaults to `BAHMNI_USER=admin` /
`BAHMNI_PASS=Admin123`. Two safe orders:
- **(preferred)** rotate the OpenMRS admin password **now**, then pass the new password to the
  seeder via `BAHMNI_PASS=...` in P3; **or**
- seed first on localhost (still firewalled, pre-tunnel) with the default, then rotate before P5.

Either way, **the admin password MUST be off the Bahmni default before P5 (tunnel exposure).** Also
set strong Bahmni DB passwords now. Do **not** expose `:8080` publicly until this is done.

### P3 — Seed demo data `[SCRIPT]`
```bash
SUPABASE_SERVICE_KEY=... BAHMNI_URL=http://localhost:8080 \
  BAHMNI_USER=admin BAHMNI_PASS=<rotated-or-default> \
  python scripts/seed-bahmni-demo-data.py --tenant bsh-demo --dir scripts/bsh-demo-data
```
- Idempotent + resumable (tracks `seed_progress.json`); **refuses** if industry≠hospital.
- Seeds doctors → patients → appointments → lab_orders → corporate_clients → packages →
  bed_assignments against Bahmni REST.
- **Gate:** seeder prints `OK` rows (not `ERR`); spot-check a patient in the Bahmni registration UI.
- **Watch:** if many `ERR 401`, the admin creds passed don't match the rotated password (P2 order).

### P4 — Wire tenant + bring up the 3 services `[USER]`/`[SCRIPT]`
```bash
# point the tenant at the now-live Bahmni (do NOT use the public hostname here — keep loopback):
#   UPDATE tenant_config SET bahmni_base_url='http://localhost:8080' WHERE tenant_id='bsh-demo';
# (run via Supabase Management API — the only working DDL/DML path this session; see Section 1)
```
- Bring up `bsh-auth-bridge` (compose exists, 9101), and **`bsh-multi-branch-aggregator` (9102)** +
  **`bsh-vapi-handler` (9103)** — these two have Dockerfiles but **no compose yet** (`docker run`
  them on `langgraph-agents_langgraph-net`, or add to a compose). See tunnel doc §0.
- **Gate:** `/health` 200 on 9101, 9102, 9103.

### P5 — Cloudflare tunnel + DNS `[USER]` (per `BSH_CLOUDFLARE_TUNNEL_SETUP.md`)
- Append the 4 ingress rules **ABOVE** the catch-all `http_status:404` in the host-side
  `C:\Users\aumbr\.cloudflared\config.yml`; restart cloudflared.
- Create the 4 CNAMEs (or `cloudflared tunnel route dns`). Zone SSL=**Full**.
- Put `hms-bsh` + `bsh-aggregator` behind **Cloudflare Access**; rate-limit `bsh-vapi`/`bsh-auth`.
- **Gate:** all 4 hostnames resolve; `curl https://bsh-vapi.zatesystems.com/health` 200; the **other**
  `*.zatesystems.com` hosts still resolve (catch-all order preserved).

### P6 — Activate the 12 workflows `[SCRIPT]`
```bash
N8N_API_KEY=<from CLAUDE.md> bash scripts/activate-bsh-workflows.sh
```
- Activates exactly the 12 verified IDs (4 delegators + 8 inline-gated).
- **T19 caveat:** cron triggers can be lost across container restarts. **After activation, verify**
  `active=true` persisted and crons registered: `GET /api/v1/workflows/<id>` and check executions;
  re-run `toggle_crons.py` if any reverted.
- **Gate:** 12/12 `active=true`.

### P7 — Create the VAPI assistant `[USER]` (per `BSH_VAPI_ASSISTANT_CONFIG.md`)
- Create assistant `BSH-HMS OPD Reception (bsh-demo)`; Server URL =
  `https://bsh-vapi.zatesystems.com/vapi/inbound`; **stamp `metadata.tenant_id="bsh-demo"`**
  (mandatory — handler rejects missing tenant_id, which sidesteps **T36**). Paste bn/en personas.
  Set a **Bengali-capable** voice + ASR (the #1 demo risk — verify intelligibility). Add the
  `X-Vapi-Secret` header. Attach the phone number (Twilio fallback → reception desk).
- **Gate:** a real inbound test call hits the handler (`docker logs bsh-vapi-handler` shows the POST).

### P8 — Smoke + multi-tenant regression `[SCRIPT]`
```bash
bash scripts/bsh-e2e-smoke.sh
```
- Flows A–E (MEDICA patient search, lab critical, OMEGA chart summary, **Bengali voice via :9103**,
  aggregator refresh) + a **Cosmique baseline** call (must be unchanged — proves no cross-tenant
  regression).
- **Caveat to verify:** Flow C references patient `BSH-DEMO-001`; the seeded HNs use the
  `BSH-{year}-{seq}` format — confirm that literal ID exists or adjust the smoke query (track in the
  rehearsal checklist).
- **Gate:** every flow returns expected data; Cosmique line unchanged.

### P9 — Flip LIVE `[USER]`/`[SCRIPT]`
```bash
# UPDATE tenant_config SET subscription_status='active' WHERE tenant_id='bsh-demo';  (Mgmt API)
bash scripts/bsh-reconciliation-selfcheck.sh    # expect PASS
```
- **Gate:** self-check PASS; the multi-tenant loop (`subscription_status='active'`) now includes
  `bsh-demo`, so the activated workflows will pick it up on their next cron tick.

---

## 3. Rollback trees (per phase)

- **P1 Bahmni won't come up / FHIR never 200s:** `docker compose logs` in `/opt/bahmni-stack/bahmni-lite`;
  common causes = port 8080 already taken, RAM exhaustion (cap JVM heap — hardening §8), slow image
  pull. **Rollback:** `docker compose down`; demo can still show n8n workflows + specs; do NOT flip
  `subscription_status` to active (P9) if Bahmni is down.
- **P3 seeder ERR storm:** almost always 401 (creds) or industry gate. Fix creds / confirm tenant row;
  re-run (idempotent — resumes from `seed_progress.json`).
- **P4 service unhealthy:** check it's on `langgraph-agents_langgraph-net` and Supabase key is set.
  Bahmni can be demoed via its own UI even if a FastAPI service is down (degrade gracefully).
- **P5 tunnel breaks other hosts:** you almost certainly put a rule **below** the 404 catch-all or
  broke YAML. **Rollback:** restore the pre-edit `config.yml` (keep a copy), restart cloudflared.
- **P6 workflow won't activate / cron lost:** T19 — re-run `toggle_crons.py`; verify via executions API.
- **P9 self-check FAIL:** **do not go live.** Read the failing check, fix, re-run. The flip to
  `active` is the last, most reversible step — leave it `inactive` until everything else is green.

**Global rollback:** the safest single lever is `tenant_config.bsh-demo.subscription_status`. Leaving
it `inactive` means the scheduled BSH workflows skip the tenant (multi-tenant loop filters on
`active`), so the system is inert even if containers are up. Flip to `active` **only** at P9.

---

## 4. Go / No-Go gates (must ALL be green before P9 flip)
- [ ] GitHub token regenerated; branch pushed; (frontend deploy green if applicable).
- [ ] Bahmni FHIR 200 at `:8080`.
- [ ] OpenMRS admin password rotated off default; Bahmni DB passwords strong.
- [ ] Seeder clean; a patient + an appointment visible in Bahmni UI.
- [ ] `bahmni_base_url` set (loopback, not public host); 3 services `/health` 200.
- [ ] 4 BSH hostnames resolve; Access gating on UI/aggregator; other `*.zatesystems.com` intact.
- [ ] 12 workflows `active=true` (T19-verified persisted).
- [ ] VAPI inbound test call reaches the handler; Bengali voice intelligible.
- [ ] `bsh-e2e-smoke.sh` all flows OK; **Cosmique baseline unchanged**.
- [ ] `bsh-reconciliation-selfcheck.sh` PASS.

---

## 5. Post-live (same day)
- Run the **demo rehearsal checklist** (`BSH_DEMO_REHEARSAL_CHECKLIST.md`) end-to-end at least once.
- Start the **first nightly encrypted backup** (hardening §3) — don't let day-1 PHI sit unbacked.
- Note follow-ups that are explicitly **not** deploy-day: frontend `/hospital/*` build (4–7 d),
  off-site backup target, BSH's own Bangladesh DID for VAPI, legal sign-off on data-protection (§6
  of hardening), delegator-workflow inline gates before any *second* hospital tenant.

---

## 6. Honest risk summary
- **Single hard blocker:** the GitHub token (§0.5). Everything else is sequencing.
- **#1 demo risk:** Bengali TTS/ASR quality (verify before the call, not during).
- **#2 risk:** Bahmni first-boot on a contended 32 GB box (pre-pull + heap caps).
- **Cross-tenant safety is structurally covered** (6-layer gate + handler no-fallback sidesteps T36),
  but P8's Cosmique baseline is the live proof — do not skip it.
- The plan is **reversible up to P9**; the `subscription_status` flip is the point of no easy return,
  so it's deliberately last and gated on a green self-check.
