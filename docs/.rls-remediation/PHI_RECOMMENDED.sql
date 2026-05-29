-- PHASE 3 — RECOMMENDED PHI isolation (NOT APPLIED — review before running).
-- patient_visits / patient_vitals are PHI, currently EMPTY (0 rows -> no exposure today),
-- carry 'Allow authenticated' USING(true), and have NO declared FK. Their customer_id (uuid)
-- plausibly references clinic_patients.id OR customers.id (both tenant-isolated by slug).
-- The dual-parent EXISTS below is PROVABLY leak-free (a row is visible only if its customer_id
-- belongs to the current tenant in EITHER parent; otherwise hidden). Once the patient-visit
-- feature is built and the real parent is confirmed, tighten to that single parent.

CREATE POLICY "Tenant isolation FK" ON public.patient_visits FOR ALL TO public USING (
  (auth.role() = 'service_role'::text)
  OR EXISTS (SELECT 1 FROM public.clinic_patients p WHERE p.id = patient_visits.customer_id AND p.tenant_id = get_user_tenant_id())
  OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = patient_visits.customer_id AND c.tenant_id = get_user_tenant_id())
);
DROP POLICY IF EXISTS "Allow authenticated" ON public.patient_visits;

CREATE POLICY "Tenant isolation FK" ON public.patient_vitals FOR ALL TO public USING (
  (auth.role() = 'service_role'::text)
  OR EXISTS (SELECT 1 FROM public.clinic_patients p WHERE p.id = patient_vitals.customer_id AND p.tenant_id = get_user_tenant_id())
  OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = patient_vitals.customer_id AND c.tenant_id = get_user_tenant_id())
);
DROP POLICY IF EXISTS "Allow authenticated" ON public.patient_vitals;
