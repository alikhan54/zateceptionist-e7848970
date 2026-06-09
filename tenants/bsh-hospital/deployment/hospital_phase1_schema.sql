-- ============================================================================
-- hospital_phase1_schema.sql  —  420-native HOSPITAL vertical, Phase 1 (P1)
-- ----------------------------------------------------------------------------
-- ADDITIVE / IDEMPOTENT / REVERSIBLE. Apply on DIRECT 5432 (6543 is read-only).
--
-- Creates TWO new tables for the `hospital` industry vertical:
--   public.hospital_departments  — org/dept seed + routing targets
--   public.hospital_orders       — doctor order-entry (lab | medication | imaging)
--
-- REUSES clinic_* (clinic_patients / clinic_visits) by FK — NO DDL on any existing
-- table. tenant_id is the SLUG (e.g. 'bsh-hospital'), matching clinic_* convention.
--
-- RLS = the clinic_* 5-policy standard, byte-for-byte:
--   rls_service_all (service_role FOR ALL USING true) + authenticated rows scoped to
--   tenant_id = get_user_tenant_id().
--
-- Pre-reqs already present: get_user_tenant_id(), gen_random_uuid(),
--   public.clinic_patients, public.clinic_visits.
-- Rollback: hospital_phase1_rollback.sql (DROPs both tables; policies/indexes/FKs
--   drop with them). Touches NO existing table or data.
-- ============================================================================

-- ---------- SECTION 1 — TABLES (additive; departments BEFORE orders for the FK) ----------

CREATE TABLE IF NOT EXISTS public.hospital_departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL,
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'clinical'
                CHECK (kind IN ('clinical','pharmacy','lab','radiology','admin')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_hospital_departments_tenant_name UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.hospital_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,
  patient_id    uuid NOT NULL REFERENCES public.clinic_patients(id) ON DELETE CASCADE,
  visit_id      uuid REFERENCES public.clinic_visits(id) ON DELETE SET NULL,
  order_type    text NOT NULL
                  CHECK (order_type IN ('lab','medication','imaging')),
  department_id uuid REFERENCES public.hospital_departments(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'ordered'
                  CHECK (status IN ('ordered','routed','in_progress','resulted','dispensed','reviewed','cancelled')),
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ordered_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- indexes (additive, idempotent) ----------
CREATE INDEX IF NOT EXISTS idx_hospital_departments_tenant ON public.hospital_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospital_orders_tenant      ON public.hospital_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospital_orders_patient     ON public.hospital_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_hospital_orders_department  ON public.hospital_orders(department_id);
CREATE INDEX IF NOT EXISTS idx_hospital_orders_status      ON public.hospital_orders(tenant_id, status);

-- ---------- SECTION 2 — RLS (clinic_* 5-policy standard, idempotent) ----------
DO $rls$
DECLARE t text;
  tbls text[] := ARRAY['hospital_departments','hospital_orders'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='rls_service_all') THEN
      EXECUTE format('CREATE POLICY rls_service_all ON public.%I FOR ALL TO service_role USING (true)', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='rls_tenant_read') THEN
      EXECUTE format('CREATE POLICY rls_tenant_read ON public.%I FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id())', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='rls_tenant_write') THEN
      EXECUTE format('CREATE POLICY rls_tenant_write ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id())', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='rls_tenant_update') THEN
      EXECUTE format('CREATE POLICY rls_tenant_update ON public.%I FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id())', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='rls_tenant_delete') THEN
      EXECUTE format('CREATE POLICY rls_tenant_delete ON public.%I FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id())', t);
    END IF;
  END LOOP;
END
$rls$;

-- ---------- SECTION 3 — GRANTs (explicit; idempotent; matches Supabase default privileges) ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_departments, public.hospital_orders TO authenticated;
GRANT ALL ON public.hospital_departments, public.hospital_orders TO service_role;
