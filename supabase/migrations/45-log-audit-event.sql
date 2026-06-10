-- 45: log_audit_event — the single guarded write path for audit_logs from the browser.
--
-- Master-Admin Phase 5. The audit pipeline never had a real writer: the 6 historical
-- rows were batch-seeded (two groups of 3 with identical timestamps), no trigger or
-- function writes audit_logs, and the only frontend insert (admin actions) is blocked
-- by RLS for cross-tenant master-admin writes (tenant_isolation_rls_fix requires
-- tenant_id = get_user_tenant_id()).
--
-- This RPC is the smallest guarded fix: SECURITY DEFINER with identity (user_id,
-- user_email, tenant_id) derived from the caller's JWT via users.auth_id = auth.uid()
-- — the client can never spoof who or which tenant. p_tenant_id (the target tenant of
-- an admin action) is honored only for master_admin callers; for everyone else the
-- event is attributed to their own tenant. Returns false instead of raising on any
-- failure: audit logging must never break a login or an admin action.

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action    text,
  p_resource  text DEFAULT 'auth',
  p_details   text DEFAULT NULL,
  p_level     text DEFAULT 'info',
  p_metadata  jsonb DEFAULT '{}'::jsonb,
  p_tenant_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email   text;
  v_tenant  text;
BEGIN
  IF auth.uid() IS NULL OR p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RETURN false;
  END IF;

  SELECT u.id, u.email, u.tenant_id INTO v_user_id, v_email, v_tenant
  FROM public.users u WHERE u.auth_id = auth.uid() LIMIT 1;

  -- No profile row (phantom-user edge): skip silently rather than error.
  IF v_tenant IS NULL THEN
    RETURN false;
  END IF;

  -- Cross-tenant attribution is a master_admin-only privilege.
  IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant AND public.is_master_admin() THEN
    v_tenant := p_tenant_id;
  END IF;

  INSERT INTO public.audit_logs
    (tenant_id, user_id, user_email, action, resource, details, level, metadata)
  VALUES (
    v_tenant,
    v_user_id,
    v_email,
    left(trim(p_action), 100),
    left(coalesce(nullif(trim(p_resource), ''), 'auth'), 100),
    left(p_details, 500),
    CASE WHEN p_level IN ('info', 'success', 'warning', 'error') THEN p_level ELSE 'info' END,
    coalesce(p_metadata, '{}'::jsonb)
  );
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, text) TO authenticated, service_role;
