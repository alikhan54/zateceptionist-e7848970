# BSH-HMS — Bahmni Stack Hardening

> **Status:** security/ops hardening spec for the AMD-local Bahmni stack + the 3 BSH FastAPI
> services. **Nothing here is applied** — Bahmni is not yet deployed (it's an AMD-day action via
> `scripts/deploy-bahmni-cloud.sh`). This doc is the checklist to run *after* the stack is up.
>
> Labels: `[VERIFIED-CODE]` = read from the deploy script / compose / config overlay this session;
> `[INFERRED]` = from Bahmni's documented architecture (stack not cloned yet, so engine/port
> details are not first-hand verified); `[DESIGN]` = proposed hardening; `[estimate]` = not measured.

---

## 0. Grounding & two honest corrections `[VERIFIED-CODE]`

What is actually in the repo (read this session), vs. what the scaffold *claims*:

1. **The `bahmni-config/` overlay is mostly aspirational.** Its `README.md` lists a rich layout
   (`openmrs/apps/{registration,clinical,reports}`, `openmrs/concepts`, `openelis/`, `odoo/`,
   `theme/`, `translations/{bn,en}.json`). **On disk only three files exist:**
   `openmrs/apps/registration/app.json`, `translations/bn.json`, `README.md`. The README also
   says "each file is a 1-line placeholder" — but the two real files contain **actual config**
   (`app.json` defines the HN format `BSH-{year}-{seq:5}` + patient attributes; `bn.json` has 14
   real Bengali clinical strings). So: the overlay is **partially populated, not a pure scaffold,
   and missing most of the directories the README advertises.** Anything depending on
   `clinical/`, `reports/`, `concepts/`, `openelis/`, `odoo/`, or `theme/` will **silently get
   Bahmni defaults** until those files are authored (Phase 1A, per the README).

2. **The deploy script writes the Supabase *service-role* key in plaintext to disk.**
   `deploy-bahmni-cloud.sh:38-44` writes `$BAHMNI_DIR/$BAHMNI_FLAVOR/.env` containing
   `SUPABASE_SERVICE_KEY=...` then `chmod 600`. `chmod 600` is good hygiene but the **full
   service-role key (god-mode over every tenant's data) sits in cleartext on the AMD box.** This
   is the single highest-value secret in the deployment and §2 treats it as priority-1.

Deployment facts used below `[VERIFIED-CODE]`:
- Flavor `bahmni-lite` (vs `bahmni-standard` for IPD/PACS), dir `/opt/bahmni-stack`, repo
  `github.com/Bahmni/bahmni-docker.git`, `TIMEZONE=Asia/Dhaka`, FHIR healthcheck at
  `http://localhost:8080/openmrs/ws/fhir2/R4/metadata`.
- 3 FastAPI services: `bsh-auth-bridge` (9101, `BSH_BRIDGE_SIGNING_KEY`, `BSH_BRIDGE_TTL=1800`),
  `bsh-multi-branch-aggregator` (9102), `bsh-vapi-handler` (9103).
- Audit table `bsh_clinical_log` (migration 39) + `enforce_hospital_only_*` triggers (37/38)
  already live in Supabase (Section 1).

---

## 1. What we're protecting (threat model) `[DESIGN]`

| Asset | Where it lives | Worst case |
|---|---|---|
| **PHI** (patient demographics, diagnoses, labs, prescriptions) | Bahmni's own DBs (OpenMRS) on the AMD box | mass PHI exfiltration / Bangladesh privacy breach |
| **Supabase service-role key** | `/opt/bahmni-stack/bahmni-lite/.env`, the 3 services' env | full cross-tenant DB compromise |
| **OpenMRS admin session** | Bahmni auth | clinical-record tampering |
| **Bridge signing key** | `bsh-auth-bridge` env | forged scoped Bahmni sessions |
| **Tunnel credentials** | `C:\Users\aumbr\.cloudflared\` (host) | public hijack of `*.zatesystems.com` BSH hosts |

**Design principle (already true in code):** PHI stays **inside Bahmni**. The FastAPI services and
Supabase hold *operational metadata* (appointments, aggregated metrics, audit rows), **not raw
clinical records.** Hardening must keep it that way — see §6.

---

## 2. Secrets & credential rotation `[DESIGN]`

Priority order (highest blast radius first):

| # | Secret | Rotation cadence | How |
|---|---|---|---|
| 1 | **Supabase service-role key** | on any suspected leak; review quarterly | Regenerate in Supabase dashboard → update `.env`, the 3 services' env, n8n credential `gQE27pII1aZEzHbn`, and `scripts/*` env. **Scope-down option:** mint a dedicated DB role limited to `bsh_*` tables + `tenant_config` SELECT and use *that* for the Bahmni box instead of the god-key. |
| 2 | **OpenMRS admin password** | rotate from the Bahmni default **immediately** post-deploy; 90-day thereafter | Bahmni ships a well-known default admin/`Admin123`-class credential — change before the box is tunnel-exposed. |
| 3 | **`BSH_BRIDGE_SIGNING_KEY`** | 90-day; immediately on staff offboarding | Rotate env + restart `bsh-auth-bridge`. TTL is already short (`1800`s/30 min) so blast radius of a leaked *token* is bounded; the *signing key* is the real secret. |
| 4 | **DB passwords inside Bahmni** (OpenMRS↔its DB) | rotate from compose defaults post-deploy | Set strong values in the `bahmni-lite/.env` (not the committed defaults) before first `up`. |
| 5 | **Cloudflare tunnel token** | per Cloudflare guidance | host-side `.cloudflared`; see `BSH_CLOUDFLARE_TUNNEL_SETUP.md`. |

**Rules:**
- **Never commit any of these.** The repo is push-bound to a public-ish GitHub; `.env` files under
  `/opt/bahmni-stack` are outside the repo by design — keep it that way.
- **Heed T20 (Supabase Scenario D):** *never write credentials/secrets to Supabase-trigger-backed
  tables during a latency-degradation window* — a mid-trigger client timeout can persist plaintext.
  Rotate when Supabase REST is healthy (<1.5s probes).

---

## 3. Backups `[DESIGN]`

Two distinct data stores, two strategies:

### 3a. Bahmni's own DBs (PHI — the critical ones) `[INFERRED engine]`
OpenMRS is backed by MySQL/MariaDB; OpenELIS/Odoo (if later promoted to `bahmni-standard`) add
PostgreSQL. `bahmni-lite` is OpenMRS-centric. **Verify the actual engines/containers after the
first `docker compose up` (`docker compose ps`) before scripting dumps** — do not assume.

- **Nightly logical dump**, e.g. `docker exec <db> mysqldump --single-transaction ...` (MySQL) /
  `pg_dump -Fc` (PG), written to **D: drive** (C: has ~16 GB free — never back up to C:).
- **Encrypt at rest:** pipe dumps through `age`/`gpg`; the dumps **are PHI**.
- **Retention:** 7 daily + 4 weekly + 12 monthly `[DESIGN]`; prune on a cron.
- **Off-box copy:** the AMD server is a **single point of failure** (one box, one NVMe). Push an
  encrypted weekly dump to an off-site target (Backblaze/S3/another Tailscale node). Without this,
  a disk failure = total PHI loss.
- **Restore drill:** quarterly — restore the latest dump into a throwaway container and confirm a
  known patient/HN reads back. *An untested backup is not a backup.*

### 3b. Supabase (operational metadata) `[VERIFIED-DB exists]`
`bsh_*` tables + `tenant_config` + `bsh_clinical_log` live in managed Supabase, which has its own
PITR/managed backups. **Action:** confirm the project's backup tier covers the demo window; no
custom dump needed unless BSH requires an independent copy.

---

## 4. Logging, audit & retention `[DESIGN]`

- **Clinical AI audit already exists:** `bsh_clinical_log` (migration 39) captures per-action
  clinical-AI events. Confirm every BSH service/workflow that touches clinical data **writes a row**
  (actor, action, tenant, timestamp, ref) — this is the tamper-evidence trail for a hospital.
- **PHI must not leak into application logs.** The 3 FastAPI services and OMEGA log request
  metadata; ensure transcripts/patient names/HNs are **redacted or omitted** from stdout that ends
  up in `docker logs`/files. (The vapi-handler already routes PHI through Bahmni, not logs — keep it.)
- **Log rotation:** set Docker `json-file` `max-size`/`max-file` (e.g. `10m`×`5`) on Bahmni + the 3
  services so logs don't fill the D: NVMe.
- **Retention:** clinical audit (`bsh_clinical_log`) — keep per BD medical-record norms (long;
  see §6); app/access logs — 30–90 days `[DESIGN]`.
- **Tie into existing alerting:** the platform already has `omega_alerts` + the **Alert Dispatcher**
  (`w6Yoz22MUyQZM66m`, every 2 min) and **Sacred Sentinel Hot-Path** (`QO3eVBr8La6hkLTC`). Route
  Bahmni-down / critical-lab events through the same SMTP dispatcher rather than a new channel.

---

## 5. RBAC & access control `[DESIGN]`

- **OpenMRS privilege model:** create least-privilege roles (Registration clerk, Nurse, Doctor,
  Lab tech, Admin) — do **not** hand staff the admin account. Map BSH's actual org chart.
- **Cloudflare Access in front of the UI:** per `BSH_CLOUDFLARE_TUNNEL_SETUP.md` §5, gate
  `hms-bsh` (Bahmni UI/OWA) and `bsh-aggregator` behind Access (staff email/OTP/IdP). The hospital
  UI must **not** be open to the public internet. `bsh-vapi` stays public (VAPI must POST) but is
  secret-header + rate-limited; `bsh-auth` is public-but-throttled.
- **Service least-privilege:** the 3 FastAPI services should authenticate to Supabase with the
  **narrowest** key that works (see §2 #1 scope-down). The `bsh-auth-bridge` already mints
  **scoped, 30-min** Bahmni sessions — good; ensure downstream services consume *those*, not raw
  admin creds.
- **Network:** keep the services on the `langgraph-agents_langgraph-net` bridge; only Bahmni `:8080`
  and the 3 service ports need to be reachable by cloudflared. Don't publish the Bahmni DB ports to
  the host.

---

## 6. PHI & Bangladesh data-protection `[DESIGN — confirm with counsel]`

**Honest legal caveat:** Bangladesh does **not** (as of this writing, 2026-05) have a single
enacted, comprehensive data-protection statute equivalent to GDPR; a **Personal Data Protection
Act has been in draft/bill stage** and a Cyber Security Act (2023, successor to the Digital
Security Act 2018) governs adjacent cyber offences. **Do not treat any specific clause here as a
verified legal citation** — BSH's legal counsel must confirm current obligations and any
data-localization requirement before go-live. The safe engineering posture, pending that:

- **Data residency:** keep PHI **on the AMD box in-country** (it already is — Bahmni is local).
  Several draft BD provisions and sector norms favor local storage of citizen/health data; the
  current design (PHI never leaves Bahmni; Supabase holds only operational metadata) is the
  conservative choice. **If any draft localization rule is enacted, the design already complies.**
- **Data minimization:** the FastAPI/Supabase layer must persist **no raw clinical PHI** — only
  IDs/metadata. Audit this explicitly (grep the services + `bsh_*` schema for name/diagnosis
  columns). This is both privacy-sound and reduces breach blast-radius.
- **In transit:** all public hops are HTTPS (Cloudflare edge + tunnel); the cloudflared↔origin hop
  is loopback. **Set zone SSL=Full, never Flexible** (per tunnel doc §4).
- **Consent & disclosure:** the VAPI assistant **discloses it is an AI** and takes **no PHI action
  without HN confirmation** (persona rule #1) — keep these enforced.
- **Right-to-erasure / access requests:** OpenMRS supports patient record voiding/retirement;
  document the operational procedure for a patient data request as part of the BSH runbook.

---

## 7. Disaster recovery `[DESIGN]`

- **Acknowledge the SPOF honestly:** one AMD box runs Bahmni **plus** n8n, langgraph-brain, TTS,
  Ollama, ComfyUI. A hardware/disk failure takes down the entire hospital system *and* the rest of
  the 420 platform. For a production hospital this is **not acceptable long-term** — flag to BSH
  that HA/redundancy is a post-demo requirement.
- **RPO target:** ≤24 h (nightly encrypted dump, §3) — tighten to ≤1 h with binlog/WAL shipping if
  BSH requires it `[DESIGN]`.
- **RTO target:** restore-to-running on a replacement box `[estimate ~2–4 h]` *if* an off-site
  encrypted dump + the deploy script + this doc are available. Without the off-site copy, RTO is
  unbounded (data lost).
- **DR runbook (write before go-live):** (1) provision box, (2) install Docker + Tailscale,
  (3) `git clone` repo, (4) run `deploy-bahmni-cloud.sh`, (5) restore latest dump into the Bahmni
  DB container, (6) re-point `tenant_config.bahmni_base_url`, (7) `activate-bsh-workflows.sh`,
  (8) `bsh-e2e-smoke.sh`.

---

## 8. Performance tuning `[DESIGN]`

Server: **AMD Ryzen 5 3600 (6c/12t), 32 GB RAM, RTX 4060 8 GB, single NVMe** (per CLAUDE.md).

- **RAM is the contended resource, not GPU.** Bahmni is JVM-heavy (OpenMRS/Tomcat) + a SQL DB.
  Adding it to a 32 GB box already running n8n + langgraph + TTS + Ollama + ComfyUI risks swap.
  **Action:** measure free RAM before deploy; cap the OpenMRS JVM heap (`-Xmx`) and the DB buffer
  pool to fit; don't let Bahmni and a warmed Ollama model both balloon.
- **GPU is unaffected** — Bahmni doesn't use CUDA. (Ollama/ComfyUI keep the 4060; T27's 8 GB VRAM
  one-model-at-a-time limit is unchanged by Bahmni.)
- **DB tuning:** set the buffer pool / shared_buffers to a fixed modest value (not the default that
  assumes a dedicated box). Put the DB data dir on **D:** (NVMe), never C:.
- **Healthcheck timeout:** the deploy script waits up to 10 min for FHIR — on a contended box first
  boot can be slow; that headroom is appropriate, don't shorten it.
- **TZ:** `Asia/Dhaka` is already set — verify appointment timestamps render correctly (no UTC drift
  in the OPD booking flow) during rehearsal.

---

## 9. Monitoring `[DESIGN]`

- **Liveness:** poll `http://localhost:8080/openmrs/ws/fhir2/R4/metadata` + `/health` on
  9101/9102/9103. Reuse the existing cron-probe + Alert Dispatcher pattern (§4).
- **The aggregator (`bsh-multi-branch-aggregator`, 9102)** is the natural place to surface
  multi-branch operational metrics; ensure its health is itself monitored.
- **Disk:** alert when D: free space drops below a threshold (dumps + logs + Bahmni data grow).
- **Cert/tunnel:** Cloudflare-side analytics for the 4 BSH hostnames; alert on origin-down (530s).
- **Apply T32 discipline:** any new monitoring workflow needs **one real-execution pass + a 1-hour
  zero-false-positive observation window** before it's trusted (the Sentinel false-positive lesson).

---

## 10. Hardening checklist (AMD-day, after `deploy-bahmni-cloud.sh`) `[DESIGN]`

- [ ] Change OpenMRS admin password off the Bahmni default **before** tunnel exposure.
- [ ] Set strong Bahmni DB passwords in `bahmni-lite/.env` (not committed defaults).
- [ ] Scope-down or vault the Supabase key used on the box (§2 #1).
- [ ] `docker compose ps` → record actual DB engines/containers; wire nightly encrypted dumps to D:.
- [ ] Configure one **off-site** encrypted weekly dump (kills the SPOF data-loss risk).
- [ ] Set Docker log rotation (`max-size`/`max-file`) on Bahmni + 3 services.
- [ ] Create least-privilege OpenMRS roles; gate UI + aggregator behind Cloudflare Access.
- [ ] Audit the 3 services + `bsh_*` schema: confirm **no raw PHI persisted** outside Bahmni.
- [ ] Confirm `bsh_clinical_log` receives rows on clinical-AI actions.
- [ ] Verify `Asia/Dhaka` timestamps in the OPD flow.
- [ ] Cap OpenMRS JVM heap + DB buffer pool to fit the 32 GB shared box; check no swap.
- [ ] Wire Bahmni/service health into the existing Alert Dispatcher.
- [ ] Have BSH counsel confirm current Bangladesh data-protection obligations (§6).
- [ ] Run one DR restore drill into a throwaway container.

**Estimate `[estimate]`:** core hardening (passwords, dumps, log rotation, Access, RAM caps)
~2–3 h once Bahmni is up; off-site backup + DR drill + legal review are follow-ups, not blockers
for the demo.
