# 420 Jewellery — Live Gold-Rate Agent v1.0 (Project JX, Phase 11)

The **first jewellery agent**: a NEW scheduled n8n workflow that keeps each jewellery
tenant's gold rates current and prepares a WhatsApp rate broadcast. **Additive, gated to
`industry='jewellery'`, created INACTIVE — it does not run until activated at deploy.**

- Export: [`jx-gold-rate-agent.json`](./jx-gold-rate-agent.json) (POST this to create the workflow).
- Touches **no existing workflow**. New ID only. n8n MCP validation: **0 errors**.

## What it does (per run)
1. **GR.1 Schedule** (every 6h) — inactive until deploy.
2. **GR.2 Get Jewellery Tenants** — `tenant_config WHERE industry='jewellery'`. This is the
   gate: only jewellery tenants are ever processed; every other tenant is a no-op.
3. **GR.3 Loop Tenants** (batchSize 1) → **GR.4 Store Tenant** (workflow static data, safe loop).
4. **GR.5 Get Current 24K** — latest real `jx_gold_rate` (karat 24) for the tenant.
5. **GR.6 Compute Rates** — mirrors `src/lib/jewelry/calc.ts` EXACTLY:
   `KARAT_FACTOR = {24:1, 22:22/24, 21:21/24, 18:18/24}`, `TOLA_GRAMS = 11.6638`,
   `round2`. Base 24K precedence: external spot (optional, unwired) → per-run override →
   current real 24K → configurable `default_24k`. Produces 4 rows
   (`rate_per_gram`, `rate_per_tola = perGram × 11.6638`, `source='agent'`).
   Example base 24K=24000 → 22K=22000, 21K=21000, 18K=18000; per-tola 22K=256603.6.
6. **GR.7 Patch Rate** — PATCH `jx_gold_rate` per karat (slug-keyed, `source='agent'`,
   `effective_at=now`). Idempotent: the 4 placeholder rows seeded in Phase 3 are updated in place.
7. **GR.8 Collapse → GR.9 Get Opted-in Customers** — `jx_customer` with a phone (opt-in tag if present).
8. **GR.10 Build Broadcast Payload** — Meta WhatsApp Cloud-API message per customer. **Built, never sent.**
9. **GR.11 Broadcast Gate** (IF) — only forwards to send when `broadcast_enabled === true`
   AND the tenant has a connected WhatsApp `phone_number_id`. **Default OFF.**
10. **GR.12 Send WhatsApp** — `POST graph.facebook.com/v21.0/{phone_id}/messages`. Never
    reached in test/now (gate is off and Legacy has no connected number).

## Conventions
- Supabase ops via HTTP Request nodes with the **`supabaseApi`** credential
  (`{id: gQE27pII1aZEzHbn, name: ZATECEPTIONIST-V2}`) + `retryOnFail` (per ORCHESTRATION_STRATEGY).
- All money/gram math is client-side (calc.ts logic replicated in the Code node — n8n cannot import TS).
- Schedule workflow → **no `webhookId` needed**.

## Dependencies before activation (deploy)
- **WhatsApp delivery requires a connected Meta WhatsApp number for the tenant** (Legacy has
  none yet — a separate Meta setup). Until then GR.11 gate stays off and nothing sends.
- (Optional) wire a real spot-gold → PKR source into GR.6's base resolution; today it falls
  back to the tenant's current 24K or the configurable `default_24k`.
- (Optional, for true upsert on brand-new tenants) a UNIQUE index on
  `jx_gold_rate(tenant_id, metal, karat)`; Legacy already has its 4 rows so PATCH suffices.

## Create it (POST — leave INACTIVE)
```
# when n8n API is healthy (T18 read-only pooler must have cleared):
python D:/420-system/.tmp_jx/p11_post_verify.py   # POSTs (no active flag), confirms INACTIVE + isolation
```
Do **NOT** send `active:true`. Activation happens only at deploy.

## Proof (Phase 11)
Because n8n's public API has no manual-run endpoint and the workflow must stay INACTIVE, the
agent's exact node logic was executed against the live DB (direct 5432) as the execution proof:
jewellery-only selection (Legacy), calc.ts karat math, `jx_gold_rate` updated for **Legacy only**
(isolation), WhatsApp payload **built not sent**, then reverted to placeholder. See STATE_JEWELRY.md §Phase 11.
