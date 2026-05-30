-- BSH-HMS Phase 2A — tenant_config extension for healthcare_hospital industry
-- Idempotent + additive + non-destructive.
-- DO NOT auto-apply; user applies via Supabase Studio → SQL Editor → Run.
-- After apply: re-run the verification block at the bottom and confirm 0 rows
-- of existing tenants regressed.

BEGIN;

-- 1. Update the canonical comment so `\d+ tenant_config` shows the new industry
COMMENT ON COLUMN tenant_config.industry IS
  'Industry vertical. Recognized values: restaurant, banking_collections, '
  'healthcare_clinic, healthcare_hospital, construction, technology, '
  'real_estate_dubai, accounting_practice_uk, forex_trading, youtube_agency.';

-- 2. Add Bahmni connection metadata (additive; preserves NULL for all existing rows)
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS bahmni_base_url   TEXT,
  ADD COLUMN IF NOT EXISTS bahmni_admin_user TEXT;

-- bahmni admin password / token is NOT stored as plaintext column.
-- Convention: tenant_config.features->>'bahmni_secret_ref' holds a vault path
-- like 'vault:bsh-demo' which the service resolves at runtime.

-- 3. Convenience view: which tenants are hospital-industry?
CREATE OR REPLACE VIEW hospital_tenants AS
SELECT id, tenant_id, industry, bahmni_base_url, bahmni_admin_user,
       features->>'bahmni_secret_ref' AS bahmni_secret_ref,
       created_at, updated_at
FROM tenant_config
WHERE industry = 'healthcare_hospital';

COMMENT ON VIEW hospital_tenants IS
  'BSH-HMS Phase 2: filtered view of tenant_config for healthcare_hospital '
  'industry — used by services + agent tools to enforce industry gating.';

-- 4. RLS unchanged on tenant_config; the hospital_tenants view inherits the
--    underlying table's policies. Service-role reads still work; tenant-scoped
--    reads still scope to own tenant_id.

COMMIT;

-- ====================================================================
-- VERIFICATION QUERIES (run after apply, expect specific results)
-- ====================================================================

-- 4a. Confirm columns added (expect 2 rows):
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='tenant_config'
--      AND column_name IN ('bahmni_base_url','bahmni_admin_user');
--    EXPECT: 2 rows

-- 4b. Confirm NO existing tenant has bahmni_base_url populated (we haven't
--     inserted BSH yet — that's Section H step 6):
--    SELECT COUNT(*) FROM tenant_config WHERE bahmni_base_url IS NOT NULL;
--    EXPECT: 0

-- 4c. Confirm view created:
--    SELECT COUNT(*) FROM hospital_tenants;
--    EXPECT: 0 (no hospital tenant exists yet)

-- 4d. Confirm Cosmique untouched:
--    SELECT tenant_id, industry FROM tenant_config WHERE tenant_id='cosmique';
--    EXPECT: 1 row, industry='healthcare_clinic'

-- 4e. Confirm Zate untouched:
--    SELECT tenant_id, industry FROM tenant_config WHERE tenant_id='zateceptionist';
--    EXPECT: 1 row, industry='technology'

-- ====================================================================
-- ROLLBACK (if needed — safe because additive)
-- ====================================================================
--    BEGIN;
--    DROP VIEW IF EXISTS hospital_tenants;
--    ALTER TABLE tenant_config DROP COLUMN IF EXISTS bahmni_admin_user;
--    ALTER TABLE tenant_config DROP COLUMN IF EXISTS bahmni_base_url;
--    COMMIT;
