-- =============================================================================
--  HR Hidden-Features F4 / F5 — RLS ACTIVATION SQL
--  Tables: hr_notifications, hr_shifts, hr_employee_shifts
-- =============================================================================
--
--  ⚠  DO NOT EXECUTE AGAINST PRODUCTION FROM THIS SESSION.
--     This file is for REVIEW. Apply it manually in the Supabase SQL editor
--     AFTER the frontend branch is merged. The three UIs (NotificationsFeed,
--     ShiftDefinitionsTab, ShiftAssignmentsTab) are shipped RLS-GATED: they
--     render a graceful empty state today because all three tables are
--     RLS-enabled with no browser-usable policy (deny-all). Running this file
--     is what "activates" them for tenant users.
--
--  WHY THIS DESIGN
--  ---------------
--  Every statement mirrors the VERIFIED, currently-live policy on the canonical
--  working HR table `hr_employees`:
--
--     policy "Tenant isolation"  (cmd=ALL, roles=public, WITH CHECK omitted)
--       USING ((auth.role() = 'service_role'::text)
--              OR (tenant_id = (get_user_tenant_uuid())::text))
--
--  Notes on that shape (all verified in pg_policies / pg_proc on 2026-05-29):
--    • roles=public (no TO clause) — the auth.role()='service_role' branch is
--      what lets the n8n service key bypass; tenant users match the 2nd branch.
--    • WITH CHECK is intentionally OMITTED. For a FOR ALL policy Postgres reuses
--      the USING expression as the write-check, so INSERT/UPDATE rows must also
--      satisfy the tenant match. We replicate that exactly (omit WITH CHECK).
--    • get_user_tenant_uuid() is STABLE SECURITY DEFINER and returns the tenant
--      UUID for the logged-in user (slug -> tenant_config.id). All three F4/F5
--      tables store tenant_id as the UUID-as-text, written by the UI from
--      useTenant().tenantConfig.id — so `tenant_id = (get_user_tenant_uuid())::text`
--      is the correct comparison (same as hr_employees, which is UUID-based).
--
--  PROVENANCE OF THE GATE (per table, verified 2026-05-29 via pg_policies):
--    hr_notifications    RLS on, 0 policies                  -> deny-all (empty)
--    hr_shifts           RLS on, 0 policies                  -> deny-all (empty)
--    hr_employee_shifts  RLS on, 1 policy "Allow authenticated"
--                        (USING true / WITH CHECK true, ALL) -> CROSS-TENANT LEAK
--
--  ⚠  hr_employee_shifts CURRENTLY LEAKS ACROSS TENANTS. The lone existing
--     "Allow authenticated" policy is USING(true)/WITH CHECK(true) for ALL
--     commands, so any authenticated user of ANY tenant can read/write every
--     row. Section 3 below DROPS it and replaces it with tenant isolation.
--     The UI already filters every query by tenant_id, so the UI does not
--     exhibit the leak — but the database boundary is open until this runs.
--
--  HOW TO APPLY (post-merge):
--    1. Read this whole file.
--    2. Run Section 0 (preflight) to confirm the live state still matches the
--       comments above (policy counts unchanged; the leak policy still present).
--    3. Run Sections 1, 2, 3 in order.
--    4. Run Section 4 (verification) and confirm each table has exactly the
--       expected policies and that a tenant user sees only their own rows.
--
--  Reference for parity: SELECT * FROM pg_policies
--    WHERE schemaname='public' AND tablename='hr_employees';
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 0 — PREFLIGHT (read-only; run first, change nothing)
-- -----------------------------------------------------------------------------
-- Expect: hr_notifications=0, hr_shifts=0, hr_employee_shifts=1 (the leak).
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hr_notifications', 'hr_shifts', 'hr_employee_shifts')
GROUP BY tablename
ORDER BY tablename;

-- Expect: all three rowsecurity = true.
SELECT c.relname, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('hr_notifications', 'hr_shifts', 'hr_employee_shifts')
ORDER BY c.relname;

-- Confirm the leak policy is still exactly the one we plan to drop.
-- Expect: 1 row -> hr_employee_shifts / "Allow authenticated" / qual=true.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'hr_employee_shifts';


-- =============================================================================
-- SECTION 1 — hr_notifications  (F4 NotificationsFeed)
-- =============================================================================
-- RLS is already enabled; this line is idempotent and safe to re-run.
ALTER TABLE public.hr_notifications ENABLE ROW LEVEL SECURITY;

-- 1a. Tenant isolation — EXACT mirror of hr_employees "Tenant isolation".
--     Enables the admin scope="all" view (/hr/notifications) and the
--     browser-side mark-read / mark-all-read UPDATEs (both tenant-scoped),
--     and lets the n8n service key insert notifications (service_role branch).
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_notifications;
CREATE POLICY "Tenant isolation" ON public.hr_notifications
  FOR ALL
  USING (
    (auth.role() = 'service_role'::text)
    OR (tenant_id = (get_user_tenant_uuid())::text)
  );

-- 1b. Per-user read — recipient sees notifications addressed to them.
--     Requested explicitly for the staff "Alerts" tab (NotificationsFeed
--     scope="mine", which the UI also narrows by recipient_id in-query).
--     recipient_id holds auth.users.id (no FK; chosen to match auth.uid()).
--
--     ⚠ SEMANTICS: permissive policies are OR'd. With 1a present, the
--     effective read scope for any tenant user is already "all rows in my
--     tenant", so this 1b policy is ADDITIVE and currently redundant for
--     reads (own-rows ⊂ tenant-rows). It is included as requested and becomes
--     the meaningful boundary only if you later choose the STRICT variant
--     below (restrict staff to their own notifications, admins to all).
DROP POLICY IF EXISTS "Recipient can read own notifications" ON public.hr_notifications;
CREATE POLICY "Recipient can read own notifications" ON public.hr_notifications
  FOR SELECT
  USING (recipient_id = auth.uid());

-- 1c. (OPTIONAL — STRICT STAFF ISOLATION, leave commented unless you want it)
--     If you want staff to see ONLY their own notifications while admins/
--     managers still see the whole tenant, replace 1a's broad SELECT with a
--     SELECT that is gated on an admin check, and keep 1b for everyone.
--     There is no admin-claim helper in the current schema (the existing HR
--     tables do not role-gate), so this is left as a documented option, not a
--     default. Example shape (requires an is_hr_admin()-style helper you'd add):
--
--     -- DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_notifications;
--     -- CREATE POLICY "Service + admin tenant read" ON public.hr_notifications
--     --   FOR SELECT USING (
--     --     (auth.role() = 'service_role'::text)
--     --     OR (tenant_id = (get_user_tenant_uuid())::text AND is_hr_admin())
--     --   );
--     -- CREATE POLICY "Tenant write" ON public.hr_notifications
--     --   FOR ALL USING (
--     --     (auth.role() = 'service_role'::text)
--     --     OR (tenant_id = (get_user_tenant_uuid())::text)
--     --   );
--     -- (1b "Recipient can read own notifications" then gives every staff
--     --  member read access to exactly their own rows.)


-- =============================================================================
-- SECTION 2 — hr_shifts  (F5a ShiftDefinitionsTab)
-- =============================================================================
ALTER TABLE public.hr_shifts ENABLE ROW LEVEL SECURITY;

-- Tenant isolation — EXACT mirror of hr_employees "Tenant isolation".
-- Covers SELECT (Shift Types list), and the admin INSERT/UPDATE/DELETE CRUD
-- (gated in-UI by canManage = isAdmin || isManager) plus service_role.
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_shifts;
CREATE POLICY "Tenant isolation" ON public.hr_shifts
  FOR ALL
  USING (
    (auth.role() = 'service_role'::text)
    OR (tenant_id = (get_user_tenant_uuid())::text)
  );


-- =============================================================================
-- SECTION 3 — hr_employee_shifts  (F5b ShiftAssignmentsTab)
-- =============================================================================
-- ⚠ FIRST close the cross-tenant leak: drop the allow-all policy.
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_employee_shifts;

ALTER TABLE public.hr_employee_shifts ENABLE ROW LEVEL SECURITY;

-- Tenant isolation — EXACT mirror of hr_employees "Tenant isolation".
-- Covers SELECT (Assignments list) and the admin assign/edit/delete CRUD
-- (gated in-UI by canManage) plus service_role.
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_employee_shifts;
CREATE POLICY "Tenant isolation" ON public.hr_employee_shifts
  FOR ALL
  USING (
    (auth.role() = 'service_role'::text)
    OR (tenant_id = (get_user_tenant_uuid())::text)
  );


-- =============================================================================
-- SECTION 4 — VERIFICATION (run after Sections 1–3)
-- =============================================================================
-- 4a. Expected policy inventory:
--       hr_notifications   -> "Recipient can read own notifications" (SELECT),
--                             "Tenant isolation" (ALL)
--       hr_shifts          -> "Tenant isolation" (ALL)
--       hr_employee_shifts -> "Tenant isolation" (ALL)   [NO "Allow authenticated"]
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hr_notifications', 'hr_shifts', 'hr_employee_shifts')
ORDER BY tablename, policyname;

-- 4b. Confirm the leak is gone (expect 0 rows).
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'hr_employee_shifts'
  AND qual = 'true';

-- 4c. Tenant-scoped smoke (run while logged in as a normal tenant user, e.g.
--     in the app via the browser, NOT as service_role). Each should return only
--     rows whose tenant_id = your tenant UUID. hr_shifts already has 1 seeded
--     row for zate (tenant_id = 'ac308ab6-f381-4eef-88ec-4d5c7a860ff9'); a zate
--     user should see exactly that 1 row after activation.
-- SELECT count(*) FROM public.hr_shifts;
-- SELECT count(*) FROM public.hr_notifications;
-- SELECT count(*) FROM public.hr_employee_shifts;

-- =============================================================================
-- ROLLBACK (if you need to revert to the pre-activation gate)
-- =============================================================================
-- DROP POLICY IF EXISTS "Recipient can read own notifications" ON public.hr_notifications;
-- DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_notifications;
-- DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_shifts;
-- DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_employee_shifts;
-- -- NOTE: rolling back does NOT recreate the old "Allow authenticated" leak on
-- --       hr_employee_shifts (by design). Leaving it dropped returns that table
-- --       to a safe deny-all state, which is the correct gated baseline.
-- =============================================================================
