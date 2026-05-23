-- =====================================================================
-- Phase 12.A — Schema additions for Patient Files / Notes / Testimonials
-- + Consent Forms triplet.
--
-- USER PRE-APPROVED IN PHASE 12 MARATHON MISSION (2026-05-23).
-- Run this entire file in Supabase Studio → SQL Editor.
-- Idempotent: safe to re-run; uses CREATE ... IF NOT EXISTS throughout.
--
-- Tables added (7): clinic_patient_files, clinic_patient_notes,
-- patient_testimonials, clinic_consent_templates, clinic_consent_forms,
-- consent_signatures.
--
-- RLS pattern: every table gets a 'tenant_isolation' policy matching
-- existing clinic_* tables — service_role bypass + JWT tenant_id match.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 12.A.1 — clinic_patient_files
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_patient_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text NOT NULL,
  patient_id      uuid NOT NULL,
  file_name       text NOT NULL,
  file_type       text,
  file_url        text,
  file_size_bytes bigint,
  uploaded_by     uuid,
  uploaded_at     timestamptz DEFAULT now(),
  description     text,
  is_archived     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_patient_files_patient
  ON public.clinic_patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_patient_files_tenant
  ON public.clinic_patient_files(tenant_id);

ALTER TABLE public.clinic_patient_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.clinic_patient_files;
CREATE POLICY tenant_isolation ON public.clinic_patient_files
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR tenant_id = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')
  );

-- ---------------------------------------------------------------------
-- 12.A.2 — clinic_patient_notes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_patient_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL,
  patient_id  uuid NOT NULL,
  note_type   text DEFAULT 'general',
  content     text NOT NULL,
  author_id   uuid,
  is_private  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_patient_notes_patient
  ON public.clinic_patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_patient_notes_tenant
  ON public.clinic_patient_notes(tenant_id);

ALTER TABLE public.clinic_patient_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.clinic_patient_notes;
CREATE POLICY tenant_isolation ON public.clinic_patient_notes
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR tenant_id = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')
  );

-- ---------------------------------------------------------------------
-- 12.A.3 — patient_testimonials
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_testimonials (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text NOT NULL,
  patient_id            uuid,
  patient_display_name  text NOT NULL,
  treatment_id          uuid,
  treatment_name        text,
  quote                 text NOT NULL,
  rating                int CHECK (rating BETWEEN 1 AND 5),
  photo_url             text,
  consent_signed        boolean DEFAULT false,
  consent_signed_at     timestamptz,
  is_published          boolean DEFAULT false,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_testimonials_tenant
  ON public.patient_testimonials(tenant_id);

ALTER TABLE public.patient_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.patient_testimonials;
CREATE POLICY tenant_isolation ON public.patient_testimonials
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR tenant_id = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')
  );

-- ---------------------------------------------------------------------
-- 12.A.4 — Consent forms triplet
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_consent_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text NOT NULL,
  title           text NOT NULL,
  body_markdown   text NOT NULL,
  treatment_id    uuid,
  is_active       boolean DEFAULT true,
  version         int DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_consent_templates_tenant
  ON public.clinic_consent_templates(tenant_id);

CREATE TABLE IF NOT EXISTS public.clinic_consent_forms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,
  patient_id    uuid NOT NULL,
  template_id   uuid REFERENCES public.clinic_consent_templates(id),
  treatment_id  uuid,
  status        text DEFAULT 'pending',
  sent_at       timestamptz,
  signed_at     timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_consent_forms_patient
  ON public.clinic_consent_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinic_consent_forms_tenant
  ON public.clinic_consent_forms(tenant_id);

CREATE TABLE IF NOT EXISTS public.consent_signatures (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        text NOT NULL,
  consent_form_id  uuid NOT NULL REFERENCES public.clinic_consent_forms(id) ON DELETE CASCADE,
  signed_by_name   text NOT NULL,
  signature_data   text,
  signed_at        timestamptz DEFAULT now(),
  ip_address       text,
  user_agent       text
);

ALTER TABLE public.clinic_consent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.clinic_consent_templates;
CREATE POLICY tenant_isolation ON public.clinic_consent_templates
  FOR ALL USING (
    auth.role() = 'service_role'
    OR tenant_id = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')
  );

DROP POLICY IF EXISTS tenant_isolation ON public.clinic_consent_forms;
CREATE POLICY tenant_isolation ON public.clinic_consent_forms
  FOR ALL USING (
    auth.role() = 'service_role'
    OR tenant_id = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')
  );

DROP POLICY IF EXISTS tenant_isolation ON public.consent_signatures;
CREATE POLICY tenant_isolation ON public.consent_signatures
  FOR ALL USING (
    auth.role() = 'service_role'
    OR tenant_id = ((auth.jwt()->>'user_metadata')::jsonb->>'tenant_id')
  );

-- ---------------------------------------------------------------------
-- 12.A.5 — Sanity verification (read-only after the migration)
-- ---------------------------------------------------------------------
SELECT table_name, row_security
FROM information_schema.tables t
LEFT JOIN pg_tables p ON p.tablename = t.table_name AND p.schemaname='public'
WHERE table_schema = 'public'
  AND table_name IN (
    'clinic_patient_files','clinic_patient_notes','patient_testimonials',
    'clinic_consent_templates','clinic_consent_forms','consent_signatures'
  )
ORDER BY table_name;
