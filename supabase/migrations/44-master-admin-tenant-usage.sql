-- ============================================================================
-- Phase 4 (Tier 1) - master_admin_tenant_usage() — real per-tenant usage counts
-- READ-ONLY STABLE SECURITY DEFINER, gated on is_master_admin() (0 rows for
-- non-admins — mirrors master_admin_all_tenants). One GROUP BY scan per usage
-- table (not per-tenant LATERAL), joined to tenant_config with the CORRECT
-- tenant_id format per table (CONFIRMED by sampling, Phase 4.0 — sample_formats.py):
--   conversations  : tenant_id = tenant_config.id (UUID)   — 31/37 uuid-match
--   messages       : tenant_id = tenant_config.id (UUID)   — 364/365 uuid-match (resolves CLAUDE.md §2 vs §6: messages is UUID)
--   sales_leads    : tenant_id = tenant_config.tenant_id (SLUG) — 1048/1136 slug-match
--   appointments   : tenant_id = tenant_config.tenant_id (SLUG) — 57/57 slug-match
-- (A small minority of rows carry the other format and are excluded consistently
--  by the LEFT JOIN; the dominant key per table is authoritative.)
-- Idempotent (CREATE OR REPLACE). EXECUTE granted to authenticated; the
-- is_master_admin() guard enforces access.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.master_admin_tenant_usage()
 RETURNS TABLE(
   tenant_id text,
   conversations_total bigint, conversations_7d bigint, last_conversation_at timestamp with time zone,
   messages_total bigint, messages_7d bigint, last_message_at timestamp with time zone,
   leads_total bigint, leads_7d bigint, last_lead_at timestamp with time zone,
   appointments_total bigint, appointments_7d bigint, last_appointment_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH conv AS (
    SELECT c.tenant_id::text AS tid, count(*) AS n,
           count(*) FILTER (WHERE c.created_at >= now() - interval '7 days') AS n7,
           max(c.created_at) AS last_at
    FROM public.conversations c GROUP BY 1
  ), msg AS (
    SELECT m.tenant_id::text AS tid, count(*) AS n,
           count(*) FILTER (WHERE m.created_at >= now() - interval '7 days') AS n7,
           max(m.created_at) AS last_at
    FROM public.messages m GROUP BY 1
  ), leads AS (
    SELECT l.tenant_id::text AS tid, count(*) AS n,
           count(*) FILTER (WHERE l.created_at >= now() - interval '7 days') AS n7,
           max(l.created_at) AS last_at
    FROM public.sales_leads l GROUP BY 1
  ), appts AS (
    SELECT a.tenant_id::text AS tid, count(*) AS n,
           count(*) FILTER (WHERE a.created_at >= now() - interval '7 days') AS n7,
           max(a.created_at) AS last_at
    FROM public.appointments a GROUP BY 1
  )
  SELECT tc.tenant_id,
    COALESCE(conv.n, 0),  COALESCE(conv.n7, 0),  conv.last_at,
    COALESCE(msg.n, 0),   COALESCE(msg.n7, 0),   msg.last_at,
    COALESCE(leads.n, 0), COALESCE(leads.n7, 0), leads.last_at,
    COALESCE(appts.n, 0), COALESCE(appts.n7, 0), appts.last_at
  FROM public.tenant_config tc
  LEFT JOIN conv  ON conv.tid  = tc.id::text      -- UUID-keyed (confirmed 4.0)
  LEFT JOIN msg   ON msg.tid   = tc.id::text      -- UUID-keyed (confirmed 4.0)
  LEFT JOIN leads ON leads.tid = tc.tenant_id     -- SLUG-keyed (confirmed 4.0)
  LEFT JOIN appts ON appts.tid = tc.tenant_id     -- SLUG-keyed (confirmed 4.0)
  WHERE public.is_master_admin();
$function$;

GRANT EXECUTE ON FUNCTION public.master_admin_tenant_usage() TO authenticated;
