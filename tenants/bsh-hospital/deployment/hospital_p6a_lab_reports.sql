-- ============================================================================
-- hospital_p6a_lab_reports.sql — lab-report document intelligence (P6a)
-- ADDITIVE / IDEMPOTENT / REVERSIBLE. Apply on DIRECT 5432.
-- +1 table: public.hospital_lab_reports (SLUG tenant_id, clinic_* 5-policy RLS).
-- extracted_via + model_used are the PHI AUDIT columns (record exactly how each
-- report was processed: gemini-2.5-flash | local_pymupdf | manual).
-- Rollback: hospital_p6a_lab_reports_rollback.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hospital_lab_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,
  order_id      uuid REFERENCES public.hospital_orders(id) ON DELETE SET NULL,
  patient_id    uuid REFERENCES public.clinic_patients(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,                                   -- private clinic-phi object path
  file_name     text,
  status        text NOT NULL DEFAULT 'uploaded'
                  CHECK (status IN ('uploaded','inspected','reviewed','failed')),
  findings      jsonb,                                           -- [{test,value,unit,ref_range,flag}]
  takeaway      text,
  extracted_via text,                                            -- PHI audit: how extracted
  model_used    text,                                            -- PHI audit: which model
  inspected_at  timestamptz,
  uploaded_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospital_lab_reports_tenant ON public.hospital_lab_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hospital_lab_reports_order  ON public.hospital_lab_reports(order_id);

-- RLS — clinic_* 5-policy standard (service_role full + authenticated scoped to tenant)
DO $rls$
DECLARE t text := 'hospital_lab_reports';
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_lab_reports TO authenticated;
GRANT ALL ON public.hospital_lab_reports TO service_role;
