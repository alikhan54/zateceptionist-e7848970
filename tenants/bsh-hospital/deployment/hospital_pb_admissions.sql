-- ============================================================================
-- hospital_pb_admissions.sql — Phase B clinical intake: the hospital admission record
-- ADDITIVE / IDEMPOTENT / REVERSIBLE. Apply on DIRECT 5432 (6543 may be read-only).
-- +1 table: public.hospital_admissions (SLUG tenant_id, clinic_* 5-policy RLS).
-- Holds the HOSPITAL-specific intake fields that have no home in clinic_patients
-- (admitting complaint, ward, attending, MRN, insurance, payment, next-of-kin).
-- Core identity stays in clinic_patients; the encounter stays in clinic_visits.
-- Rollback: hospital_pb_admissions_rollback.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hospital_admissions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                text NOT NULL,
  patient_id               uuid REFERENCES public.clinic_patients(id) ON DELETE CASCADE,
  visit_id                 uuid REFERENCES public.clinic_visits(id)   ON DELETE SET NULL,
  mrn                      text,                                        -- medical record number (BSH-######)
  admission_type           text NOT NULL DEFAULT 'opd'
                             CHECK (admission_type IN ('opd','emergency','inpatient','daycare')),
  admitting_complaint      text,                                        -- chief complaint at admission
  department_id            uuid,                                        -- hospital_departments.id (no hard FK — app-validated)
  department_name          text,                                        -- denormalized for display
  ward                     text,                                        -- ward / bed
  attending_staff_id       uuid,                                        -- hr_employees.id (no hard FK — UUID-tenant, app-validated)
  attending_name           text,                                        -- denormalized
  id_doc_type              text,                                        -- passport | national_id | nid | other (ANY card, not Emirates-only)
  id_doc_number            text,
  insurance_status         text DEFAULT 'self_pay'
                             CHECK (insurance_status IN ('self_pay','insured','corporate')),
  insurance_provider       text,
  insurance_number         text,
  next_of_kin_name         text,
  next_of_kin_phone        text,
  next_of_kin_relationship text,
  payment_amount           numeric(12,2),
  payment_currency         text DEFAULT 'BDT',
  payment_method           text CHECK (payment_method IS NULL OR payment_method IN ('cash','card','bank_transfer','insurance','waived')),
  payment_status           text NOT NULL DEFAULT 'pending'
                             CHECK (payment_status IN ('pending','paid','partial','waived')),
  payment_reference        text,
  status                   text NOT NULL DEFAULT 'admitted'
                             CHECK (status IN ('admitted','in_treatment','discharged','cancelled')),
  notes                    text,
  admitted_by              uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_admissions_tenant  ON public.hospital_admissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospital_admissions_patient ON public.hospital_admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_hospital_admissions_visit   ON public.hospital_admissions(visit_id);

-- RLS — clinic_* 5-policy standard (service_role full + authenticated scoped to tenant)
DO $rls$
DECLARE t text := 'hospital_admissions';
BEGIN
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
END
$rls$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_admissions TO authenticated;
GRANT ALL ON public.hospital_admissions TO service_role;
