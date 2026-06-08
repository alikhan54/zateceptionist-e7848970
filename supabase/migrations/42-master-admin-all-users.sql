-- ============================================================================
-- Phase 2A - master_admin_all_users() cross-tenant user read (data layer)
-- Mirrors master_admin_all_tenants(): READ-ONLY STABLE SECURITY DEFINER, gated
-- on is_master_admin() (returns 0 rows for any non-master_admin). Idempotent
-- (CREATE OR REPLACE). Returns every user across all tenants with: role
-- (latest user_roles row -> users.role fallback), tenant company_name, active
-- flag, and last_sign_in (auth.users). EXECUTE granted to authenticated so the
-- master-admin frontend can call it; the is_master_admin() guard enforces access.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.master_admin_all_users()
 RETURNS TABLE(id uuid, email text, full_name text, role text, tenant_id text,
               tenant_company_name text, is_active boolean,
               last_sign_in timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id, u.email, u.full_name,
         COALESCE(ur.role, u.role, 'staff') AS role,
         u.tenant_id, tc.company_name AS tenant_company_name,
         COALESCE(u.is_active, true) AS is_active,
         au.last_sign_in_at AS last_sign_in, u.created_at
  FROM public.users u
  LEFT JOIN LATERAL (
    SELECT ur.role FROM public.user_roles ur
    WHERE ur.user_id = u.id ORDER BY ur.created_at DESC NULLS LAST LIMIT 1
  ) ur ON true
  LEFT JOIN public.tenant_config tc ON tc.tenant_id = u.tenant_id
  LEFT JOIN auth.users au ON au.id = u.auth_id
  WHERE public.is_master_admin();
$function$;

GRANT EXECUTE ON FUNCTION public.master_admin_all_users() TO authenticated;
