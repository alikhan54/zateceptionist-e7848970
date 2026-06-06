-- ============================================================================
-- Phase 1A - White-label branding columns (ADDITIVE)
-- 5 net-new columns on tenant_config + backfill white_label_tenant_cap=10 for enterprise.
-- ADD COLUMN IF NOT EXISTS only -> no existing column modified, no data deleted. Idempotent.
-- Existing brand fields are REUSED (primary_color/secondary_color/website_chat_widget_color/
-- logo_url/brand_voice/smtp_from_name) and are NOT recreated here.
-- ============================================================================
BEGIN;

ALTER TABLE public.tenant_config ADD COLUMN IF NOT EXISTS brand_name              text;
ALTER TABLE public.tenant_config ADD COLUMN IF NOT EXISTS brand_favicon_url       text;
ALTER TABLE public.tenant_config ADD COLUMN IF NOT EXISTS white_label_tenant_cap  integer;
ALTER TABLE public.tenant_config ADD COLUMN IF NOT EXISTS parent_agency_tenant_id text;
ALTER TABLE public.tenant_config ADD COLUMN IF NOT EXISTS custom_domain           text;

COMMENT ON COLUMN public.tenant_config.brand_name              IS 'White-label display name; UI falls back to company_name when NULL';
COMMENT ON COLUMN public.tenant_config.brand_favicon_url       IS 'White-label favicon URL';
COMMENT ON COLUMN public.tenant_config.white_label_tenant_cap  IS 'Max white-label sub-tenants (10 for enterprise; NULL = not WL-eligible). 11+ = contact sales.';
COMMENT ON COLUMN public.tenant_config.parent_agency_tenant_id IS 'Parent agency tenant_id for a sub-tenant (NULL for top-level tenants)';
COMMENT ON COLUMN public.tenant_config.custom_domain           IS 'White-label custom hosting domain (Phase 5 wiring)';

-- Backfill cap=10 for enterprise tenants (decision 3a), only where still unset.
UPDATE public.tenant_config
   SET white_label_tenant_cap = 10
 WHERE subscription_plan = 'enterprise'
   AND white_label_tenant_cap IS NULL;

-- Post-assertions: all 5 columns exist AND no enterprise tenant is left without a cap.
-- (Robust to future custom caps: asserts NOT NULL, not literal 10.) Raises -> rolls back.
DO $$
DECLARE col_count int; ent_uncapped int;
BEGIN
  SELECT count(*) INTO col_count
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='tenant_config'
     AND column_name IN ('brand_name','brand_favicon_url','white_label_tenant_cap','parent_agency_tenant_id','custom_domain');
  IF col_count <> 5 THEN
    RAISE EXCEPTION 'Phase 1A migration: expected 5 net-new columns, found %', col_count;
  END IF;

  SELECT count(*) INTO ent_uncapped
    FROM public.tenant_config
   WHERE subscription_plan='enterprise' AND white_label_tenant_cap IS NULL;
  IF ent_uncapped <> 0 THEN
    RAISE EXCEPTION 'Phase 1A migration: % enterprise tenant(s) still have NULL white_label_tenant_cap', ent_uncapped;
  END IF;

  RAISE NOTICE 'Phase 1A OK: 5 columns present; all enterprise tenants have a white_label_tenant_cap.';
END $$;

COMMIT;
