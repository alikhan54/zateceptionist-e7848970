-- ============================================================================
-- Phase 2B - master_admin PER-TENANT write RPCs (control plane writes)
-- Every function: SECURITY DEFINER, GUARDED (RAISE for non-master_admin via
-- is_master_admin()), PER-TENANT (explicit p_tenant_id — NO bulk path).
-- features writes MERGE (`||`) so secret keys (heygen_api_key, broker secrets,
-- bahmni_secret_ref, etc.) are preserved and never round-tripped to the client.
-- Mirrors the proven master_admin_* guard pattern (migrations 40/42).
-- ============================================================================

-- READ: safe per-tenant control detail (module flags + brand + plan; NO secret keys leak).
-- Module flags use the SAME default semantics as the tenant sidebar's isEnabled()
-- (features key absent => enabled = true).
CREATE OR REPLACE FUNCTION public.master_admin_get_tenant_detail(p_tenant_id text)
 RETURNS TABLE(tenant_id text, company_name text, industry text,
   subscription_plan text, subscription_status text,
   brand_name text, logo_url text, primary_color text, secondary_color text,
   white_label boolean, white_label_tenant_cap integer,
   mod_sales boolean, mod_marketing boolean, mod_hr boolean,
   mod_operations boolean, mod_communications boolean, mod_analytics boolean,
   ai_sales boolean, ai_marketing boolean, ai_hr boolean, ai_support boolean, ai_voice boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'master_admin only';
  END IF;
  RETURN QUERY
  SELECT tc.tenant_id, tc.company_name, tc.industry,
    tc.subscription_plan::text, tc.subscription_status,
    tc.brand_name, tc.logo_url, tc.primary_color, tc.secondary_color,
    COALESCE((tc.features->>'white_label')::boolean, false),
    tc.white_label_tenant_cap,
    COALESCE((tc.features->>'sales_module')::boolean, true),
    COALESCE((tc.features->>'marketing_module')::boolean, true),
    COALESCE((tc.features->>'hr_module')::boolean, true),
    COALESCE((tc.features->>'operations_module')::boolean, true),
    COALESCE((tc.features->>'communications_module')::boolean, true),
    COALESCE((tc.features->>'analytics_module')::boolean, true),
    COALESCE((tc.ai_modules_enabled->>'sales')::boolean, false),
    COALESCE((tc.ai_modules_enabled->>'marketing')::boolean, false),
    COALESCE((tc.ai_modules_enabled->>'hr')::boolean, false),
    COALESCE((tc.ai_modules_enabled->>'support')::boolean, false),
    COALESCE((tc.ai_modules_enabled->>'voice')::boolean, false)
  FROM public.tenant_config tc WHERE tc.tenant_id = p_tenant_id;
END $function$;

-- WRITE: per-tenant module toggles. MERGE p_features into features and p_ai_modules
-- into ai_modules_enabled (preserves all other keys incl. secrets). One tenant only.
CREATE OR REPLACE FUNCTION public.master_admin_update_tenant_modules(
   p_tenant_id text, p_features jsonb, p_ai_modules jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  IF NOT public.is_master_admin() THEN RAISE EXCEPTION 'master_admin only'; END IF;
  IF p_tenant_id IS NULL OR length(trim(p_tenant_id)) = 0 THEN
    RAISE EXCEPTION 'p_tenant_id required (per-tenant only — no bulk writes)';
  END IF;
  UPDATE public.tenant_config
     SET features = COALESCE(features, '{}'::jsonb) || COALESCE(p_features, '{}'::jsonb),
         ai_modules_enabled = COALESCE(ai_modules_enabled, '{}'::jsonb) || COALESCE(p_ai_modules, '{}'::jsonb),
         updated_at = now()
   WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'tenant not found: %', p_tenant_id; END IF;
  RETURN jsonb_build_object('tenant_id', p_tenant_id, 'updated', n);
END $function$;

-- WRITE: per-tenant white-label (brand columns + features.white_label merge). One tenant only.
CREATE OR REPLACE FUNCTION public.master_admin_update_white_label(
   p_tenant_id text, p_brand_name text, p_logo_url text,
   p_primary_color text, p_secondary_color text, p_white_label boolean, p_cap integer)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  IF NOT public.is_master_admin() THEN RAISE EXCEPTION 'master_admin only'; END IF;
  IF p_tenant_id IS NULL OR length(trim(p_tenant_id)) = 0 THEN
    RAISE EXCEPTION 'p_tenant_id required (per-tenant only)';
  END IF;
  UPDATE public.tenant_config
     SET brand_name = COALESCE(p_brand_name, brand_name),
         logo_url = COALESCE(p_logo_url, logo_url),
         primary_color = COALESCE(p_primary_color, primary_color),
         secondary_color = COALESCE(p_secondary_color, secondary_color),
         white_label_tenant_cap = COALESCE(p_cap, white_label_tenant_cap),
         features = COALESCE(features, '{}'::jsonb)
                    || jsonb_build_object('white_label',
                         COALESCE(p_white_label, (features->>'white_label')::boolean, false)),
         updated_at = now()
   WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'tenant not found: %', p_tenant_id; END IF;
  RETURN jsonb_build_object('tenant_id', p_tenant_id, 'updated', n);
END $function$;

-- WRITE: per-tenant plan. Validates against the real plan set; enum-safe via dynamic SQL.
CREATE OR REPLACE FUNCTION public.master_admin_update_plan(p_tenant_id text, p_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  IF NOT public.is_master_admin() THEN RAISE EXCEPTION 'master_admin only'; END IF;
  IF p_tenant_id IS NULL OR length(trim(p_tenant_id)) = 0 THEN
    RAISE EXCEPTION 'p_tenant_id required (per-tenant only)';
  END IF;
  IF p_plan NOT IN ('free','professional','enterprise') THEN
    RAISE EXCEPTION 'invalid plan: % (allowed: free, professional, enterprise)', p_plan;
  END IF;
  -- dynamic SQL so the text literal coerces to the column type whether it is text or an enum
  EXECUTE format('UPDATE public.tenant_config SET subscription_plan = %L, updated_at = now() WHERE tenant_id = %L', p_plan, p_tenant_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'tenant not found: %', p_tenant_id; END IF;
  RETURN jsonb_build_object('tenant_id', p_tenant_id, 'plan', p_plan);
END $function$;

GRANT EXECUTE ON FUNCTION public.master_admin_get_tenant_detail(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.master_admin_update_tenant_modules(text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.master_admin_update_white_label(text, text, text, text, text, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.master_admin_update_plan(text, text) TO authenticated;
