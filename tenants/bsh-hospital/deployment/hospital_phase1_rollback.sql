-- ============================================================================
-- hospital_phase1_rollback.sql  —  reversal of hospital_phase1_schema.sql
-- ----------------------------------------------------------------------------
-- Drops ONLY the two new tables. Their RLS policies, indexes, and FK constraints
-- drop with them (CASCADE not needed — nothing references these tables). Touches
-- NO existing table, no clinic_* data, no other tenant. Apply on DIRECT 5432.
--
-- Order matters: hospital_orders first (it FKs -> hospital_departments).
-- ============================================================================

DROP TABLE IF EXISTS public.hospital_orders;        -- child first (FK -> hospital_departments)
DROP TABLE IF EXISTS public.hospital_departments;
