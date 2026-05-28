# BSH Multi-Branch Aggregator — Phase 2D

Reads metrics from each hospital tenant's Bahmni, persists to
`bsh_multibranch_metrics`, serves the Pulse / dashboards.

## Endpoints

| Method | Path | Purpose | Industry gate |
|---|---|---|---|
| GET | `/metrics/aggregate?tenant_id&metric&period` | Read latest cached or live | YES |
| GET | `/metrics/compare?tenant_id&metric&period` | Cross-branch ranking | YES |
| POST | `/metrics/refresh-now` | Force compute + persist | YES |
| GET | `/metrics/health` | Liveness probe (n8n BSH-9) | NO |

## Triple gate (defense in depth)

1. **Service-level**: `_gate()` raises HTTP 403 unless `industry == 'healthcare_hospital'`
2. **DB RLS**: tenant_id isolation via `auth.jwt()` user_metadata
3. **DB trigger**: `enforce_hospital_only_metrics()` raises EXCEPTION on INSERT/UPDATE for any non-hospital tenant

Migration `supabase/migrations/37-bsh-multibranch-metrics.sql` applies the DDL (table + indexes + RLS + trigger).

## Deploy
```bash
docker build -t bsh-multibranch-aggregator:phase2d services/bsh-multi-branch-aggregator
docker run -d --name bsh-multibranch-aggregator -p 9102:9102 \
  -e SUPABASE_SERVICE_KEY=... \
  --network langgraph-agents_langgraph-net \
  bsh-multibranch-aggregator:phase2d
```

## Verification

| Check | Verdict |
|---|---|
| Python syntax | [VERIFIED-CODE] ast.parse() clean |
| Industry-gate on every endpoint | [VERIFIED-CODE] code-reviewed |
| DB trigger SQL | [VERIFIED-CODE] migration 37 written; [DEFERRED-AMD] apply via Studio |
| Cosmique INSERT → trigger ERROR | [DEFERRED-AMD] (post-migration-apply) |
| BSH INSERT round-trip | [DEFERRED-AMD] requires Bahmni + tenant row |
