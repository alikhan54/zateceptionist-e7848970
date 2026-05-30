-- BSH-HMS Phase 2D — bsh_multibranch_metrics table + RLS + industry trigger
-- Idempotent + additive. DO NOT auto-apply; user via Supabase Studio.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bsh_multibranch_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  branch_id     TEXT,
  metric_name   TEXT NOT NULL,
  metric_value  JSONB NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bsh_metrics_tenant_metric_period
  ON public.bsh_multibranch_metrics (tenant_id, metric_name, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_bsh_metrics_computed_at
  ON public.bsh_multibranch_metrics (computed_at DESC);

ALTER TABLE public.bsh_multibranch_metrics ENABLE ROW LEVEL SECURITY;

-- Tenant isolation via JWT (existing 420 RLS pattern)
DROP POLICY IF EXISTS bsh_metrics_tenant_isolation ON public.bsh_multibranch_metrics;
CREATE POLICY bsh_metrics_tenant_isolation ON public.bsh_multibranch_metrics
  FOR ALL
  USING (
    tenant_id = COALESCE(
      ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id'),
      current_setting('request.jwt.claim.tenant_id', true)
    )
  );

-- service_role bypass (for the aggregator service writing on behalf of tenants)
DROP POLICY IF EXISTS bsh_metrics_service_role_all ON public.bsh_multibranch_metrics;
CREATE POLICY bsh_metrics_service_role_all ON public.bsh_multibranch_metrics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Industry gate at DB level (belt + suspenders alongside service + RLS)
CREATE OR REPLACE FUNCTION public.enforce_hospital_only_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_config
    WHERE tenant_id = NEW.tenant_id
      AND industry = 'healthcare_hospital'
  ) THEN
    RAISE EXCEPTION
      'bsh_multibranch_metrics is restricted to healthcare_hospital tenants. '
      'tenant_id=% has industry=%',
      NEW.tenant_id,
      (SELECT industry FROM public.tenant_config WHERE tenant_id = NEW.tenant_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bsh_metrics_industry_check ON public.bsh_multibranch_metrics;
CREATE TRIGGER bsh_metrics_industry_check
  BEFORE INSERT OR UPDATE ON public.bsh_multibranch_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_hospital_only_metrics();

COMMIT;

-- VERIFICATION (run after apply):
-- 1. INSERT for cosmique (industry=healthcare_clinic) should ERROR:
--      INSERT INTO bsh_multibranch_metrics (tenant_id, metric_name, metric_value,
--          period_start, period_end)
--      VALUES ('cosmique', 'opd_volume', '{"v":1}'::jsonb, now(), now());
--      EXPECT: ERROR "restricted to healthcare_hospital tenants"
-- 2. Once BSH tenant exists (after migration 38 + tenant insert):
--      INSERT for bsh-demo should succeed.
-- 3. Existing 17 tenants: zero rows in bsh_multibranch_metrics; no schema change to any other table.
