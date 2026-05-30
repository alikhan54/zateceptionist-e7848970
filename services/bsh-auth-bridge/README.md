# BSH Auth Bridge — Phase 2C

FastAPI service that exchanges a 420 Supabase JWT for a Bahmni session,
**industry-gated** to `healthcare_hospital` tenants only.

## Endpoints

| Method | Path | Purpose | Industry gate |
|---|---|---|---|
| POST | `/auth/420-to-bahmni` | Exchange 420 JWT → Bahmni session | YES |
| GET | `/auth/verify` | Validate a bridged token | YES (re-checked) |
| POST | `/auth/refresh` | Refresh expiring bridged token | YES (re-checked) |
| GET | `/health` | Liveness probe | NO |

## Multi-tenant safety

Every endpoint that issues or validates a bridged token calls
`_industry_gate()` which raises **HTTP 403** if `tenant_config.industry`
is anything other than `healthcare_hospital`. This means:

- Cosmique (`healthcare_clinic`) requests → 403
- Zate (`technology`) requests → 403
- BSH (`healthcare_hospital`) requests → flow through

The industry check is re-run on `/auth/verify` and `/auth/refresh` so
that a tenant whose industry changes after token issue is gated out
on the next call.

## Configuration (env vars)

| Var | Purpose | Default |
|---|---|---|
| `SUPABASE_URL` | tenant_config lookup | `https://fncfbywkemsxwuiowxxe.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | (required) |
| `SUPABASE_JWT_SECRET` | for HS256 JWT verification | (required for prod; dev decodes without verify) |
| `BSH_BRIDGE_SIGNING_KEY` | bridged-token signing key | `dev-only-rotate-me` (ROTATE) |
| `BSH_BRIDGE_TTL` | bridged-token TTL seconds | `1800` (30min) |
| `BSH_BAHMNI_FALLBACK_TOKEN` | dev-only Bahmni admin Basic | (none) |

## Deploy (AMD-local Docker)

```bash
docker build -t bsh-auth-bridge:phase2c services/bsh-auth-bridge
docker run -d --name bsh-auth-bridge \
  -p 9101:9101 \
  -e SUPABASE_SERVICE_KEY=... \
  -e SUPABASE_JWT_SECRET=... \
  -e BSH_BRIDGE_SIGNING_KEY=$(openssl rand -hex 32) \
  --network langgraph-agents_langgraph-net \
  bsh-auth-bridge:phase2c
```

## Verification status

| Check | Verdict |
|---|---|
| Python syntax | [VERIFIED-CODE] `ast.parse()` clean |
| FastAPI app loads | [DEFERRED-AMD] requires `pip install` not permitted in CC RC |
| Industry-gate semantic correctness | [VERIFIED-CODE] code review — calls `_industry_gate()` on every protected endpoint |
| Bahmni round-trip | [DEFERRED-AMD] requires Bahmni live (Phase 1A blocked) |
| Supabase JWKS validation | [DEFERRED-AMD] requires deployed Supabase JWT secret rotation runbook |
