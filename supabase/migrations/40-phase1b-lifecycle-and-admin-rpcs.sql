-- ============================================================================
-- Phase 1B - Lifecycle signals + master_admin cross-tenant RPCs (data layer)
-- Generated 2026-06-06 from the LIVE function definitions (pg_get_functiondef).
-- All READ-ONLY (STABLE) SECURITY DEFINER, idempotent (CREATE OR REPLACE).
-- Already live in prod (created + verified in Phase 1B.B/1B.C) -> re-apply is a safe no-op.
--
--   is_master_admin()              reused audit_logs master_admin predicate (auth_id join)
--   derive_lifecycle_signals(text) per-tenant stage (new/never_activated/activating/active/
--                                  silent/at_risk/churned); guard: service_role|master_admin|own-tenant
--   master_admin_* (4)             cross-tenant admin reads, gated on is_master_admin();
--                                  MRR from tenant_config x subscription_plans (sp.name)
--   agency_admin_my_tenants(text)  forward-looking; 0 rows until Phase 1A adds parent_agency_tenant_id
--
-- Verified 1B.D: master_admin -> 44 tenants, MRR $9,992 / 8 paid; non-admin -> 0 rows from every RPC.
-- ============================================================================


CREATE OR REPLACE FUNCTION public.is_master_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id = ur.user_id
                 WHERE u.auth_id = auth.uid() AND ur.role = 'master_admin');
$function$;

CREATE OR REPLACE FUNCTION public.derive_lifecycle_signals(p_tenant_id text DEFAULT NULL::text)
 RETURNS TABLE(tenant_id text, company_name text, signup_date timestamp with time zone, days_since_signup integer, onboarding_completed boolean, last_active timestamp with time zone, days_silent integer, subscription_plan text, monthly_value numeric, is_paid boolean, billing_status text, lifecycle_stage text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT tc.tenant_id, tc.company_name, tc.created_at AS signup_date,
      (now()::date - tc.created_at::date) AS days_since_signup,
      COALESCE(tc.onboarding_completed,false) AS onboarding_completed,
      ua.last_active, (now()::date - ua.last_active::date) AS days_silent,
      tc.subscription_plan::text AS subscription_plan,
      COALESCE(sp.price_monthly,0) AS monthly_value,
      (COALESCE(sp.price_monthly,0) > 0) AS is_paid,
      sub.billing_status
    FROM tenant_config tc
    LEFT JOIN subscription_plans sp ON lower(sp.name) = lower(tc.subscription_plan)
    LEFT JOIN LATERAL (SELECT MAX(au.last_sign_in_at) AS last_active
        FROM public.users u JOIN auth.users au ON au.id = u.auth_id
        WHERE u.tenant_id = tc.tenant_id) ua ON true
    LEFT JOIN LATERAL (SELECT s.status AS billing_status FROM public.subscriptions s
        WHERE s.tenant_id = tc.tenant_id ORDER BY s.created_at DESC LIMIT 1) sub ON true
    WHERE (p_tenant_id IS NULL OR tc.tenant_id = p_tenant_id)
      AND ( auth.role() = 'service_role' OR public.is_master_admin() OR tc.tenant_id = public.get_user_tenant_id() )
  )
  SELECT tenant_id, company_name, signup_date, days_since_signup, onboarding_completed,
    last_active, days_silent, subscription_plan, monthly_value, is_paid, billing_status,
    CASE
      WHEN days_since_signup <= 1   THEN 'new'
      WHEN last_active IS NULL      THEN 'never_activated'
      WHEN NOT onboarding_completed THEN 'activating'
      WHEN days_silent > 30         THEN 'churned'
      WHEN days_silent > 7          THEN 'at_risk'
      WHEN days_silent > 3          THEN 'silent'
      ELSE 'active'
    END AS lifecycle_stage
  FROM base;
$function$;

CREATE OR REPLACE FUNCTION public.master_admin_all_tenants()
 RETURNS TABLE(tenant_id text, company_name text, industry text, subscription_plan text, subscription_status text, created_at timestamp with time zone, onboarding_completed boolean, white_label_enabled boolean, users_count bigint, monthly_value numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tc.tenant_id, tc.company_name, tc.industry, tc.subscription_plan::text,
    tc.subscription_status, tc.created_at, COALESCE(tc.onboarding_completed,false),
    COALESCE(lower(tc.features->>'white_label') IN ('true','t','1'), false),
    (SELECT COUNT(*) FROM public.users u WHERE u.tenant_id = tc.tenant_id),
    COALESCE(sp.price_monthly,0)
  FROM tenant_config tc
  LEFT JOIN subscription_plans sp ON lower(sp.name) = lower(tc.subscription_plan)
  WHERE public.is_master_admin();
$function$;

CREATE OR REPLACE FUNCTION public.master_admin_mrr_breakdown()
 RETURNS TABLE(subscription_plan text, subscription_status text, tenant_count bigint, unit_price numeric, mrr numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tc.subscription_plan::text, tc.subscription_status, COUNT(*),
    COALESCE(MAX(sp.price_monthly),0),
    CASE WHEN tc.subscription_status='active'
         THEN COUNT(*)*COALESCE(MAX(sp.price_monthly),0) ELSE 0 END
  FROM tenant_config tc
  LEFT JOIN subscription_plans sp ON lower(sp.name) = lower(tc.subscription_plan)
  WHERE public.is_master_admin()
  GROUP BY tc.subscription_plan, tc.subscription_status;
$function$;

CREATE OR REPLACE FUNCTION public.master_admin_time_to_purchase()
 RETURNS TABLE(tenant_id text, company_name text, signup timestamp with time zone, first_purchase timestamp with time zone, days_to_purchase numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tc.tenant_id, tc.company_name, tc.created_at,
    MIN(s.created_at),
    ROUND(EXTRACT(EPOCH FROM (MIN(s.created_at)-tc.created_at))/86400.0, 2)
  FROM tenant_config tc
  LEFT JOIN subscriptions s ON s.tenant_id=tc.tenant_id AND s.status IN ('active','canceled')
  WHERE public.is_master_admin()
  GROUP BY tc.tenant_id, tc.company_name, tc.created_at;
$function$;

CREATE OR REPLACE FUNCTION public.master_admin_activity_feed(p_limit integer DEFAULT 20)
 RETURNS TABLE(tenant_id text, company_name text, activity text, occurred_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ev AS (
    SELECT tc.tenant_id, tc.company_name, 'signed up'::text AS activity, tc.created_at AS occurred_at
    FROM tenant_config tc WHERE tc.created_at IS NOT NULL
    UNION ALL
    SELECT tc.tenant_id, tc.company_name, 'completed onboarding', tc.onboarding_completed_at
    FROM tenant_config tc WHERE tc.onboarding_completed_at IS NOT NULL
    UNION ALL
    SELECT s.tenant_id, tc.company_name, 'subscription started', s.created_at
    FROM subscriptions s JOIN tenant_config tc ON tc.tenant_id=s.tenant_id
    UNION ALL
    SELECT s.tenant_id, tc.company_name, 'subscription canceled', s.cancelled_at
    FROM subscriptions s JOIN tenant_config tc ON tc.tenant_id=s.tenant_id WHERE s.cancelled_at IS NOT NULL
  )
  SELECT ev.tenant_id, ev.company_name, ev.activity, ev.occurred_at
  FROM ev WHERE public.is_master_admin()
  ORDER BY ev.occurred_at DESC NULLS LAST LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.agency_admin_my_tenants(p_parent_id text)
 RETURNS TABLE(tenant_id text, company_name text, subscription_plan text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tenant_config' AND column_name='parent_agency_tenant_id') THEN
    RETURN;
  END IF;
  RETURN QUERY EXECUTE $q$
    SELECT tc.tenant_id, tc.company_name, tc.subscription_plan::text, tc.created_at
    FROM tenant_config tc
    WHERE tc.parent_agency_tenant_id = $1
      AND EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.users u ON u.id=ur.user_id
        WHERE u.auth_id = auth.uid()
          AND (ur.role='master_admin' OR (ur.role='agency_admin' AND ur.tenant_id=$1)))
  $q$ USING p_parent_id;
END $function$;

