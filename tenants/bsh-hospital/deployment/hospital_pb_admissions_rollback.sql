-- Rollback for hospital_pb_admissions.sql — drops the additive admissions table.
-- Safe: no other object depends on it (FKs are outbound to clinic_patients/clinic_visits).
DROP TABLE IF EXISTS public.hospital_admissions CASCADE;
