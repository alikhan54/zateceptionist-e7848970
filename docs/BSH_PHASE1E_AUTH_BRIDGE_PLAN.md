# Sub-phase 1E — Auth Bridge Plan (deferred to Phase 3)

**Status:** ✅ **PLAN DOCUMENTED** (no implementation per D6 mandate)
**Date:** 2026-05-29
**Branch:** `feature/bsh-hms-phase1`

---

## Current auth surfaces

### Bahmni (the HMS side)

- **Session-based**: `POST {bahmni_base_url}/openmrs/ws/rest/v1/session` with `Authorization: Basic <base64(user:pass)>`, server sets a `JSESSIONID` cookie.
- **API token mode**: Bahmni exposes long-lived API tokens for service accounts via `openmrs-module-webservices` API key module (optional install).
- **No native OIDC / SAML out of the box** (Bahmni community modules exist but are not standard in bahmni-docker).
- **No JWT** — OpenMRS REST checks the session cookie or basic auth on every request.

### 420 System (this side)

- **Supabase Auth**: end users sign in at `https://ai.zatesystems.com/login` via Supabase email/password (or magic link). Returns a JWT with claims `sub`, `email`, `user_metadata.tenant_id`, `user_metadata.role`.
- **Backend services**: LangGraph brain + n8n receive `tenant_id` in the request body and trust the caller (no JWT validation on internal endpoints today — protected by Tailscale VPN boundary).
- **Per-tenant secrets**: stored in `tenant_config` rows (encrypted columns where applicable — SMTP, VAPI, Anthropic, Apify, etc.).

---

## Bridge strategy options

### Option A — Caddy reverse-proxy with header injection (RECOMMENDED for Phase 3)

```
Browser ── (Supabase JWT in Authorization header) ──> Caddy ──> Bahmni
                                                        |
                                                        ├── validate JWT signature against Supabase JWKS
                                                        ├── extract tenant_id + user_metadata.bahmni_user_id from JWT
                                                        ├── look up the Bahmni service-account credentials in tenant_config
                                                        └── replay request to Bahmni with `Authorization: Basic <user:pass>` + `JSESSIONID` (memoized)
```

- **Pros**: Bahmni is untouched (zero AGPL risk on any auth code we write). Caddy supports JWT validation + caching natively. Session cookies live in Caddy's memory, not exposed to browser. Per-tenant user mapping isolated in `tenant_config` JSONB.
- **Cons**: Caddy plugin or `caddy-security` module needed for JWT-from-Supabase-JWKS validation; rebuild required if not bundled. JSESSIONID expiry handling needs care (Caddy auth replay middleware).
- **Effort**: ~2 days (Caddyfile + Supabase JWKS poll + tenant lookup script + headed Playwright proof).

### Option B — FastAPI proxy with cookie translation

```
Browser ── (Supabase JWT) ──> FastAPI auth-bridge service ──> Bahmni
```

- **Pros**: Total control — Python code can validate Supabase JWT, look up the per-tenant Bahmni service account, login to Bahmni, propagate JSESSIONID via Set-Cookie back to browser. Tools in `bahmni_tools.py` can share the same login helper.
- **Cons**: We write more code (=more maintenance). Adds another container to the 420 stack (memory + container budget).
- **Effort**: ~3 days.

### Option C — Custom OpenMRS auth module (NOT RECOMMENDED)

Write a Bahmni-side auth module that consumes Supabase JWT directly.

- **Pros**: Single login flow, no separate proxy hop.
- **Cons**: **DIRECT AGPL CONTAMINATION RISK** — any modification to bahmni-core is subject to AGPL-3.0 source-disclosure obligation when the resulting Bahmni is served over a network (which it always is). Violates Phase 0 license posture (D3: "Treat as black-box service").
- **Effort**: ~5 days plus legal review. **NOT RECOMMENDED.**

### Option D — Iframe with separate logins (NO BRIDGE — Phase 1 default)

Demo path for Phase 1 / Phase 2: browser logs into 420, navigates to `/hospital/...`, iframe-embed of Bahmni Apps prompts a SECOND login with Bahmni service-account creds.

- **Pros**: Zero bridge code; ships immediately; clean rollback (remove iframe).
- **Cons**: Bad UX — user logs in twice. NOT viable for actual hospital staff. Fine for evaluator demo.
- **Effort**: 0 days (just an iframe + a notice).

---

## Recommendation

**Phase 1 / Phase 2 (demo to BSH evaluator)**: use **Option D** — iframe + double login. Clean, instant, zero risk.

**Phase 3 (BSH pilot)**: implement **Option A** — Caddy reverse-proxy with JWT + per-tenant Bahmni credential lookup.

**Phase 4 (multi-hospital production rollout, e.g. BSH + others)**: revisit. Caddy scales fine; if we hit pain we can graduate to Option B (FastAPI proxy) with no end-user impact.

---

## Risks

| Risk | Mitigation |
|---|---|
| AGPL contamination via Bahmni source mod | NEVER modify bahmni-core (Option C eliminated) |
| Per-tenant Bahmni cred leak in tenant_config | Use the same encrypted-column pattern as `smtp_pass` (`pgsodium` or service-side encryption); audit log on every read |
| JWT replay attack against bridge | Caddy bridges issue short-lived (5 min) JSESSIONID with origin pinning |
| Bahmni service-account password rotation | Document a rotation procedure that updates `tenant_config.bahmni_api_token` atomically (one row UPDATE) |
| Cross-tenant session mixing | Bridge MUST key its cookie cache by `tenant_id` + `user_id`, NEVER by URL alone. Phase 3 implementation includes a multi-tenant smoke test before merge. |

---

## Effort estimate for Phase 3 implementation

| Track | Days |
|---|---:|
| Caddy + JWKS validator + Caddyfile design | 0.5 |
| Per-tenant credential lookup script + `tenant_config.bahmni_api_token` column | 0.5 |
| Headed Playwright proof of single-sign-on flow on `/hospital/dashboard` | 0.5 |
| Multi-tenant cross-leak gate (cosmique can't reach bsh-demo's Bahmni) | 0.5 |
| Documentation + rotation runbook | 0.5 |
| **Total** | **~2.5 days** |

---

## D6 mandate respected

> D6: SSO deferred to Phase 3.

This document is the entirety of 1E's deliverable. No code written. No `tenant_config` schema change. No Caddyfile committed. Phase 3 starts from here.
