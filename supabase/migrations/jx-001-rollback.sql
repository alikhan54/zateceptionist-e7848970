-- ============================================================================
-- jx-001-rollback.sql — reverse jx-001-schema.sql + jx-002-seed-legacy.sql.
-- Drops ONLY the 15 jx_* tables (CASCADE also removes their policies, indexes,
-- FKs, and seed rows). Touches NO existing table. Run via DIRECT 5432.
-- Order: children first is unnecessary with CASCADE, but listed leaf→root anyway.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.jx_gold_ledger CASCADE;
DROP TABLE IF EXISTS public.jx_repair      CASCADE;
DROP TABLE IF EXISTS public.jx_worker_txn  CASCADE;
DROP TABLE IF EXISTS public.jx_old_gold    CASCADE;
DROP TABLE IF EXISTS public.jx_order_item  CASCADE;
DROP TABLE IF EXISTS public.jx_order       CASCADE;
DROP TABLE IF EXISTS public.jx_sale_item   CASCADE;
DROP TABLE IF EXISTS public.jx_sale        CASCADE;
DROP TABLE IF EXISTS public.jx_stone       CASCADE;
DROP TABLE IF EXISTS public.jx_item        CASCADE;
DROP TABLE IF EXISTS public.jx_tax_rule    CASCADE;
DROP TABLE IF EXISTS public.jx_worker      CASCADE;
DROP TABLE IF EXISTS public.jx_customer    CASCADE;
DROP TABLE IF EXISTS public.jx_gold_rate   CASCADE;
DROP TABLE IF EXISTS public.jx_setting     CASCADE;

COMMIT;

NOTIFY pgrst, 'reload schema';
