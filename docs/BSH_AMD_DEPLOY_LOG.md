# BSH-HMS — AMD Deploy-Day Execution Log

> Progressive **actuals** record for the deployment defined in `BSH_AMD_DEPLOY_DAY_PLAN.md`.
> The plan is intent; this is what actually happened on the AMD server, including findings that
> deviate from the plan. The final summary is `BSH_AMD_DEPLOY_COMPLETE.md` (written at Phase 7).
>
> Labels: `[VERIFIED-API]` = confirmed by HTTP/DB probe this session; `[VERIFIED-DB]` = confirmed by
> SQL; `[FINDING]` = non-obvious discovery; `[DEFERRED]` = intentionally postponed.
>
> Date: 2026-05-29 (AMD server, `desktop-i5ff809`).

---

## Phase 1 — GitHub push `[VERIFIED-API]`
15 gap-fill commits pushed; Bug #129 (read-only token) RESOLVED. Branch
`feature/bsh-hms-phase2-gaps`, origin HEAD `c17a917`, 26 commits ahead of `origin/main`.

---

## Phase 2 — Bahmni Lite deployed locally `[VERIFIED-API]`

**Method:** native Windows (Docker Desktop / WSL2 backend). Clone at
`D:/420-system/bsh-hms/bahmni-stack` (the official `Bahmni/bahmni-docker`, `bahmni-lite` flavor).
Launched with `docker compose --profile bahmni-lite up -d`. Deploy artifacts live **outside** the
420 repo — the secret-bearing `.env` is never committed.

**Config changes applied to the clone (not committed — recorded here):**
1. `docker-compose.yml` proxy service ports remapped: `80:80 → 8080:80` and `443:443 → 8443:443`
   (host 80/443 left free for other use; 8443 is the canonical local HTTPS entry).
2. `.env`: `COMPOSE_PROFILES=bahmni-lite` (was `emr`); `TZ=Asia/Dhaka` (was `UTC`).
3. `.env` ACL-restricted to owner-only via `icacls` (replicates `chmod 600` on Windows).
   DB/admin passwords left at stock Bahmni defaults — **admin password rotation deferred to Phase 4**.

**Pull recovery `[FINDING]`:** first `up` aborted on a transient network EOF mid-pull
(`short read: expected 155571859 bytes but got 60866208`). Not a config/auth/disk error. Recovered
by splitting `pull` from `up` and serializing image pulls (`COMPOSE_PARALLEL_LIMIT=1`) to avoid
re-saturating the link. All ~16 images cached; second `up` clean.

**Result:** 17/17 `bahmni-lite` containers up (openmrs, openmrsdb, proxy, bahmni-web, bahmni-apps-
frontend, bahmni-config, bahmni-lab, appointments, implementer-interface, patient-documents,
reports, reportsdb, crater-php, crater-nginx, craterdb, crater-atomfeed, crater-atomfeed-db).

**FHIR verified `[VERIFIED-API]`:** `GET https://localhost:8443/openmrs/ws/fhir2/R4/metadata` →
**HTTP 200**, `Content-Type: application/fhir+json`, real `CapabilityStatement` (HAPI FHIR 5.4.0,
`status: active`). Response timestamp `…+06:00` confirms `TZ=Asia/Dhaka` took effect.

### `[FINDING]` — proxy force-redirects HTTP→HTTPS, preserving the port
The Bahmni httpd proxy rewrites all plaintext requests to HTTPS using the incoming `Host` (port and
all): `http://localhost:8080/...` → `302 → https://localhost:8080/...`. Because 8080 is the HTTP
listener (HTTPS is on 8443), the HTTP path dead-ends, and `302` converts `POST→GET`. Consequences:
- **Canonical local endpoint is `https://localhost:8443`** (self-signed cert).
- The HTTP `:8080` mapping only ever issues redirects — harmless, left in place.
- Drove the Phase 3 Cloudflare correction (below) and the Phase 4 seeder URL (`https://localhost:8443`
  + TLS-verify disabled).

### Multi-tenant safety `[VERIFIED-API]`
Bahmni boot did not perturb the 420 stack: `n8n` `RestartCount=38` (unchanged from pre-Bahmni
baseline), `420-langgraph-brain` healthy, 5 other 420 services running at `RestartCount=0`. Phase 2
performed **zero Supabase writes**, so Cosmique/Zate tenant data is structurally untouched (data-level
baseline snapshot deferred to Phase 4, before the first DB write).

---

## Phase 3 — Cloudflare tunnel route (additive) `[VERIFIED-API]`

Added one ingress rule to the locally-managed `~/.cloudflared/config.yml` (tunnel
`b6db9c00-2608-4d21-91bd-69a41f163509`), placed **before** the `http_status:404` catch-all; the two
existing routes (`webhooks→:5678`, `lg→:8123`) left byte-identical. Backup saved as
`config.yml.bak-pre-bsh-20260529`.

```yaml
  - hostname: hms-bsh.zatesystems.com
    service: https://localhost:8443
    originRequest:
      noTLSVerify: true
      httpHostHeader: hms-bsh.zatesystems.com
```

### `[FINDING]` — corrected origin from `http://localhost:8080` to `https://localhost:8443`
The plan/CNAME targeted `http://localhost:8080`. Empirically that produces an **infinite Cloudflare
redirect loop**: tunnel→`http://:8080` with the public Host returns `302 → https://hms-bsh.zatesystems.com`,
which routes back through the tunnel forever. Pointing the tunnel at the HTTPS origin
(`https://localhost:8443`) returns `200` directly — no redirect. This makes `noTLSVerify: true`
**load-bearing** (self-signed origin cert), and `httpHostHeader` ensures OpenMRS builds absolute URLs
against the public hostname rather than leaking `localhost`.

### Verification `[VERIFIED-API]`
- `cloudflared tunnel ingress validate` → OK; service restarted (elevated).
- `https://hms-bsh.zatesystems.com/openmrs/ws/fhir2/R4/metadata` → **200** `application/fhir+json`.
- `https://webhooks.zatesystems.com/` → **200** (intact); `https://lg.zatesystems.com/` → **401**
  (intact auth challenge). No cross-route regression.

---

## Phase 4 — prep notes (not yet executed)
- Seeder (`scripts/seed-bahmni-demo-data.py`) must target `BAHMNI_URL=https://localhost:8443` with
  TLS verification disabled (self-signed) — **not** `:8080` (redirect loop, and `POST` would be
  downgraded to `GET`).
- bahmni-lite lacks Odoo / package / bed-management endpoints; only `doctors`, `patients`,
  `lab_orders`, `appointments` are viable. Report per-fixture actuals; do not claim "all 50 seeded".
- UPDATE (not insert) `bsh-demo`: `bahmni_base_url` + flip `subscription_status=active`; verify no
  cross-tenant impact. Rotate the stock admin password **after** seeding.
