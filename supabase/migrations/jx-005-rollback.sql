-- Reverse jx-005-ledger.sql — drop the 3 GL tables (CASCADE removes policies/indexes/lines).
-- Also reverts jx_create_sale to its prior (Phase 6) definition — see jx-006 header for the
-- saved backup. Run via DIRECT 5432.
BEGIN;
DROP TABLE IF EXISTS public.jx_voucher_line CASCADE;
DROP TABLE IF EXISTS public.jx_voucher      CASCADE;
DROP TABLE IF EXISTS public.jx_account      CASCADE;
COMMIT;
NOTIFY pgrst, 'reload schema';
