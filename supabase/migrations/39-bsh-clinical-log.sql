-- BSH-HMS Phase 2 gap-fill — bsh_clinical_log table + RLS + industry trigger
-- Per-action audit trail for the clinical AI augmentation layer (modules #12 abnormal-flag,
-- #15 auto-impression, #28 discharge-draft, plus encounter summaries).
-- Complements 37-bsh-multibranch-metrics (aggregate metrics) with per-event clinical audit.
-- Idempotent + additive + non-destructive. DO NOT auto-apply; user via Supabase Studio.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bsh_clinical_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          TEXT NOT NULL,
  branch_id          TEXT,
  patient_ref        TEXT,                       -- Bahmni patient identifier (e.g. BSH-PT-0001), NOT PHI
  encounter_ref      TEXT,                       -- Bahmni encounter/visit uuid
  action_type        TEXT NOT NULL,              -- abnormal_flag | impression_draft | summary | discharge_draft
  agent              TEXT NOT NULL DEFAULT 'medica',  -- medica | omega | beacon
  model              TEXT,                       -- model that produced the output
  input_ref          JSONB,                      -- pointers to source data (lab ids, encounter uuid) — not raw PHI
  output             JSONB NOT NULL,             -- the AI-produced artifact (flag/impression/summary)
  confidence         NUMERIC,                    -- 0..1 if the agent reported one
  clinician_reviewed BOOLEAN NOT NULL DEFAULT false,  -- human-in-the-loop gate (R-augment)
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bsh_clinical_log_tenant_action_created
  ON public.bsh_clinical_log (tenant_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bsh_clinical_log_patient
  ON public.bsh_clinical_log (tenant_id, patient_ref);

CREATE INDEX IF NOT EXISTS idx_bsh_clinical_log_unreviewed
  ON public.bsh_clinical_log (tenant_id, created_at DESC)
  WHERE clinician_reviewed = false;

ALTER TABLE public.bsh_clinical_log ENABLE ROW LEVEL SECURITY;

-- Tenant isolation via JWT (existing 420 RLS pattern — mirrors 37-bsh-multibranch-metrics)
DROP POLICY IF EXISTS bsh_clinical_log_tenant_isolation ON public.bsh_clinical_log;
CREATE POLICY bsh_clinical_log_tenant_isolation ON public.bsh_clinical_log
  FOR ALL
  USING (
    tenant_id = COALESCE(
      ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id'),
      current_setting('request.jwt.claim.tenant_id', true)
    )
  );

-- service_role bypass (for the clinical agent writing on behalf of tenants)
DROP POLICY IF EXISTS bsh_clinical_log_service_role_all ON public.bsh_clinical_log;
CREATE POLICY bsh_clinical_log_service_role_all ON public.bsh_clinical_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Industry gate at DB level (belt + suspenders alongside service + RLS — layer 5 of 6)
CREATE OR REPLACE FUNCTION public.enforce_hospital_only_clinical_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_config
    WHERE tenant_id = NEW.tenant_id
      AND industry = 'healthcare_hospital'
  ) THEN
    RAISE EXCEPTION
      'bsh_clinical_log is restricted to healthcare_hospital tenants. '
      'tenant_id=% has industry=%',
      NEW.tenant_id,
      (SELECT industry FROM public.tenant_config WHERE tenant_id = NEW.tenant_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bsh_clinical_log_industry_check ON public.bsh_clinical_log;
CREATE TRIGGER bsh_clinical_log_industry_check
  BEFORE INSERT OR UPDATE ON public.bsh_clinical_log
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_hospital_only_clinical_log();

COMMIT;

-- ====================================================================
-- VERIFICATION (run after apply):
-- ====================================================================
-- 1. Table + 3 indexes exist:
--      SELECT indexname FROM pg_indexes WHERE tablename='bsh_clinical_log';
--      EXPECT: idx_bsh_clinical_log_tenant_action_created, _patient, _unreviewed (+ pkey)
-- 2. INSERT for cosmique (industry=healthcare_clinic) should ERROR:
--      INSERT INTO bsh_clinical_log (tenant_id, action_type, output)
--      VALUES ('cosmique','abnormal_flag','{"test":"x"}'::jsonb);
--      EXPECT: ERROR "restricted to healthcare_hospital tenants"
-- 3. Once bsh-demo exists (industry=healthcare_hospital):
--      INSERT for bsh-demo should succeed; clinician_reviewed defaults false.
-- 4. Existing tenants: zero rows; no schema change to any other table.

-- ====================================================================
-- ROLLBACK (safe — additive):
-- ====================================================================
--    BEGIN;
--    DROP TRIGGER IF EXISTS bsh_clinical_log_industry_check ON public.bsh_clinical_log;
--    DROP FUNCTION IF EXISTS public.enforce_hospital_only_clinical_log();
--    DROP TABLE IF EXISTS public.bsh_clinical_log;
--    COMMIT;
