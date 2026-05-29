-- MASTER POLICY RESTORE — 20260530-001005 — 1505 policies
-- Recreates EVERY policy exactly as it was pre-remediation. psql -f this file.

DROP POLICY IF EXISTS "ab_test_events_all" ON public.ab_test_events;
CREATE POLICY "ab_test_events_all" ON public.ab_test_events AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.ab_tests;
CREATE POLICY "rls_service_all" ON public.ab_tests AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.ab_tests;
CREATE POLICY "rls_tenant_delete" ON public.ab_tests AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.ab_tests;
CREATE POLICY "rls_tenant_read" ON public.ab_tests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.ab_tests;
CREATE POLICY "rls_tenant_update" ON public.ab_tests AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.ab_tests;
CREATE POLICY "rls_tenant_write" ON public.ab_tests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.abm_activities;
CREATE POLICY "rls_service_all" ON public.abm_activities AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.abm_activities;
CREATE POLICY "rls_tenant_delete" ON public.abm_activities AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.abm_activities;
CREATE POLICY "rls_tenant_read" ON public.abm_activities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.abm_activities;
CREATE POLICY "rls_tenant_update" ON public.abm_activities AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.abm_activities;
CREATE POLICY "rls_tenant_write" ON public.abm_activities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.account_heat_map;
CREATE POLICY "rls_service_all" ON public.account_heat_map AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.account_heat_map;
CREATE POLICY "rls_tenant_delete" ON public.account_heat_map AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.account_heat_map;
CREATE POLICY "rls_tenant_read" ON public.account_heat_map AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.account_heat_map;
CREATE POLICY "rls_tenant_update" ON public.account_heat_map AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.account_heat_map;
CREATE POLICY "rls_tenant_write" ON public.account_heat_map AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_clients;
CREATE POLICY "rls_master_admin_all" ON public.accounting_clients AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_clients;
CREATE POLICY "rls_service_all" ON public.accounting_clients AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_clients;
CREATE POLICY "rls_tenant_delete" ON public.accounting_clients AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_clients;
CREATE POLICY "rls_tenant_read" ON public.accounting_clients AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_clients;
CREATE POLICY "rls_tenant_update" ON public.accounting_clients AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_clients;
CREATE POLICY "rls_tenant_write" ON public.accounting_clients AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ch_cache_authenticated_read" ON public.accounting_companies_house_cache;
CREATE POLICY "ch_cache_authenticated_read" ON public.accounting_companies_house_cache AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_invoices;
CREATE POLICY "rls_master_admin_all" ON public.accounting_invoices AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_invoices;
CREATE POLICY "rls_service_all" ON public.accounting_invoices AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_delete" ON public.accounting_invoices AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_read" ON public.accounting_invoices AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_update" ON public.accounting_invoices AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_invoices;
CREATE POLICY "rls_tenant_write" ON public.accounting_invoices AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_jobs;
CREATE POLICY "rls_master_admin_all" ON public.accounting_jobs AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_jobs;
CREATE POLICY "rls_service_all" ON public.accounting_jobs AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_jobs;
CREATE POLICY "rls_tenant_delete" ON public.accounting_jobs AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_jobs;
CREATE POLICY "rls_tenant_read" ON public.accounting_jobs AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_jobs;
CREATE POLICY "rls_tenant_update" ON public.accounting_jobs AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_jobs;
CREATE POLICY "rls_tenant_write" ON public.accounting_jobs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_payments;
CREATE POLICY "rls_master_admin_all" ON public.accounting_payments AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_payments;
CREATE POLICY "rls_service_all" ON public.accounting_payments AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_payments;
CREATE POLICY "rls_tenant_delete" ON public.accounting_payments AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_payments;
CREATE POLICY "rls_tenant_read" ON public.accounting_payments AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_payments;
CREATE POLICY "rls_tenant_update" ON public.accounting_payments AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_payments;
CREATE POLICY "rls_tenant_write" ON public.accounting_payments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_reminders;
CREATE POLICY "rls_master_admin_all" ON public.accounting_reminders AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_reminders;
CREATE POLICY "rls_service_all" ON public.accounting_reminders AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_reminders;
CREATE POLICY "rls_tenant_delete" ON public.accounting_reminders AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_reminders;
CREATE POLICY "rls_tenant_read" ON public.accounting_reminders AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_reminders;
CREATE POLICY "rls_tenant_update" ON public.accounting_reminders AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_reminders;
CREATE POLICY "rls_tenant_write" ON public.accounting_reminders AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_transactions;
CREATE POLICY "rls_master_admin_all" ON public.accounting_transactions AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_transactions;
CREATE POLICY "rls_service_all" ON public.accounting_transactions AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_transactions;
CREATE POLICY "rls_tenant_delete" ON public.accounting_transactions AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_transactions;
CREATE POLICY "rls_tenant_read" ON public.accounting_transactions AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_transactions;
CREATE POLICY "rls_tenant_update" ON public.accounting_transactions AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_transactions;
CREATE POLICY "rls_tenant_write" ON public.accounting_transactions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.accounting_truelayer_connections;
CREATE POLICY "rls_master_admin_all" ON public.accounting_truelayer_connections AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_truelayer_connections;
CREATE POLICY "rls_service_all" ON public.accounting_truelayer_connections AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.accounting_truelayer_connections;
CREATE POLICY "rls_tenant_delete" ON public.accounting_truelayer_connections AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.accounting_truelayer_connections;
CREATE POLICY "rls_tenant_read" ON public.accounting_truelayer_connections AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.accounting_truelayer_connections;
CREATE POLICY "rls_tenant_update" ON public.accounting_truelayer_connections AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.accounting_truelayer_connections;
CREATE POLICY "rls_tenant_write" ON public.accounting_truelayer_connections AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.activities;
CREATE POLICY "Tenant isolation" ON public.activities AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "activities_allow_all" ON public.activities;
CREATE POLICY "activities_allow_all" ON public.activities AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_accounts;
CREATE POLICY "Authenticated access" ON public.ad_accounts AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for ad_accounts" ON public.ad_accounts;
CREATE POLICY "Tenant isolation for ad_accounts" ON public.ad_accounts AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = current_setting('app.tenant_id'::text, true)))));
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_campaigns;
CREATE POLICY "Authenticated access" ON public.ad_campaigns AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for ad_campaigns" ON public.ad_campaigns;
CREATE POLICY "Tenant isolation for ad_campaigns" ON public.ad_campaigns AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = current_setting('app.tenant_id'::text, true)))));
DROP POLICY IF EXISTS "rls_service_all" ON public.ad_conversions;
CREATE POLICY "rls_service_all" ON public.ad_conversions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.ad_conversions;
CREATE POLICY "rls_tenant_delete" ON public.ad_conversions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.ad_conversions;
CREATE POLICY "rls_tenant_read" ON public.ad_conversions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.ad_conversions;
CREATE POLICY "rls_tenant_update" ON public.ad_conversions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.ad_conversions;
CREATE POLICY "rls_tenant_write" ON public.ad_conversions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "service_role_ad_conversions" ON public.ad_conversions;
CREATE POLICY "service_role_ad_conversions" ON public.ad_conversions AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_creatives;
CREATE POLICY "Authenticated access" ON public.ad_creatives AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for ad_creatives" ON public.ad_creatives;
CREATE POLICY "Tenant isolation for ad_creatives" ON public.ad_creatives AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = current_setting('app.tenant_id'::text, true)))));
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_performance_log;
CREATE POLICY "Authenticated access" ON public.ad_performance_log AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for ad_performance_log" ON public.ad_performance_log;
CREATE POLICY "Tenant isolation for ad_performance_log" ON public.ad_performance_log AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = current_setting('app.tenant_id'::text, true)))));
DROP POLICY IF EXISTS "rls_service_all" ON public.ad_script_intelligence;
CREATE POLICY "rls_service_all" ON public.ad_script_intelligence AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.ad_script_intelligence;
CREATE POLICY "rls_tenant_delete" ON public.ad_script_intelligence AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.ad_script_intelligence;
CREATE POLICY "rls_tenant_read" ON public.ad_script_intelligence AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.ad_script_intelligence;
CREATE POLICY "rls_tenant_update" ON public.ad_script_intelligence AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.ad_script_intelligence;
CREATE POLICY "rls_tenant_write" ON public.ad_script_intelligence AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "auth_all_aeo_bp" ON public.aeo_brand_presence;
CREATE POLICY "auth_all_aeo_bp" ON public.aeo_brand_presence AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_aeo_bp" ON public.aeo_brand_presence;
CREATE POLICY "svc_all_aeo_bp" ON public.aeo_brand_presence AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_aeo_cs" ON public.aeo_content_scores;
CREATE POLICY "auth_all_aeo_cs" ON public.aeo_content_scores AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_aeo_cs" ON public.aeo_content_scores;
CREATE POLICY "svc_all_aeo_cs" ON public.aeo_content_scores AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_aeo_eg" ON public.aeo_entity_graph;
CREATE POLICY "auth_all_aeo_eg" ON public.aeo_entity_graph AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_aeo_eg" ON public.aeo_entity_graph;
CREATE POLICY "svc_all_aeo_eg" ON public.aeo_entity_graph AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anyone_read_aeo_ql" ON public.aeo_query_library;
CREATE POLICY "anyone_read_aeo_ql" ON public.aeo_query_library AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "svc_write_aeo_ql" ON public.aeo_query_library;
CREATE POLICY "svc_write_aeo_ql" ON public.aeo_query_library AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_aeo_sr" ON public.aeo_schema_registry;
CREATE POLICY "auth_all_aeo_sr" ON public.aeo_schema_registry AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_aeo_sr" ON public.aeo_schema_registry;
CREATE POLICY "svc_all_aeo_sr" ON public.aeo_schema_registry AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.agent_actions;
CREATE POLICY "rls_service_all" ON public.agent_actions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.agent_actions;
CREATE POLICY "rls_tenant_delete" ON public.agent_actions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.agent_actions;
CREATE POLICY "rls_tenant_read" ON public.agent_actions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.agent_actions;
CREATE POLICY "rls_tenant_update" ON public.agent_actions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.agent_actions;
CREATE POLICY "rls_tenant_write" ON public.agent_actions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ac_allow_all" ON public.agent_contexts;
CREATE POLICY "ac_allow_all" ON public.agent_contexts AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.agent_conversations;
CREATE POLICY "rls_service_all" ON public.agent_conversations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.agent_conversations;
CREATE POLICY "rls_tenant_delete" ON public.agent_conversations AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.agent_conversations;
CREATE POLICY "rls_tenant_read" ON public.agent_conversations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.agent_conversations;
CREATE POLICY "rls_tenant_update" ON public.agent_conversations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.agent_conversations;
CREATE POLICY "rls_tenant_write" ON public.agent_conversations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "agent_exec_log_delete" ON public.agent_execution_log;
CREATE POLICY "agent_exec_log_delete" ON public.agent_execution_log AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "agent_exec_log_insert" ON public.agent_execution_log;
CREATE POLICY "agent_exec_log_insert" ON public.agent_execution_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "agent_exec_log_select" ON public.agent_execution_log;
CREATE POLICY "agent_exec_log_select" ON public.agent_execution_log AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "agent_exec_log_service" ON public.agent_execution_log;
CREATE POLICY "agent_exec_log_service" ON public.agent_execution_log AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "agent_exec_log_update" ON public.agent_execution_log;
CREATE POLICY "agent_exec_log_update" ON public.agent_execution_log AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "agent_memory_service" ON public.agent_memory;
CREATE POLICY "agent_memory_service" ON public.agent_memory AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "ai_agent_conv_read" ON public.ai_agent_conversations;
CREATE POLICY "ai_agent_conv_read" ON public.ai_agent_conversations AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ai_agent_conv_sr" ON public.ai_agent_conversations;
CREATE POLICY "ai_agent_conv_sr" ON public.ai_agent_conversations AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "ai_agent_metrics_read" ON public.ai_agent_metrics;
CREATE POLICY "ai_agent_metrics_read" ON public.ai_agent_metrics AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ai_agent_metrics_service_role" ON public.ai_agent_metrics;
CREATE POLICY "ai_agent_metrics_service_role" ON public.ai_agent_metrics AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "ai_agent_sugg_read" ON public.ai_agent_suggestions;
CREATE POLICY "ai_agent_sugg_read" ON public.ai_agent_suggestions AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ai_agent_sugg_sr" ON public.ai_agent_suggestions;
CREATE POLICY "ai_agent_sugg_sr" ON public.ai_agent_suggestions AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "ai_agent_tasks_read" ON public.ai_agent_tasks;
CREATE POLICY "ai_agent_tasks_read" ON public.ai_agent_tasks AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ai_agent_tasks_service_role" ON public.ai_agent_tasks;
CREATE POLICY "ai_agent_tasks_service_role" ON public.ai_agent_tasks AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "ai_agent_templates_read" ON public.ai_agent_templates;
CREATE POLICY "ai_agent_templates_read" ON public.ai_agent_templates AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ai_agent_templates_write" ON public.ai_agent_templates;
CREATE POLICY "ai_agent_templates_write" ON public.ai_agent_templates AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.ai_agent_traces;
CREATE POLICY "rls_service_all" ON public.ai_agent_traces AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.ai_agent_traces;
CREATE POLICY "rls_tenant_read" ON public.ai_agent_traces AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "ai_agents_anon_read" ON public.ai_agents;
CREATE POLICY "ai_agents_anon_read" ON public.ai_agents AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ai_agents_service_role" ON public.ai_agents;
CREATE POLICY "ai_agents_service_role" ON public.ai_agents AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_decisions;
CREATE POLICY "Allow authenticated" ON public.ai_decisions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_feedback;
CREATE POLICY "Allow authenticated" ON public.ai_feedback AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_generated_messages;
CREATE POLICY "Allow authenticated" ON public.ai_generated_messages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "ai_learning_store_delete" ON public.ai_learning_store;
CREATE POLICY "ai_learning_store_delete" ON public.ai_learning_store AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "ai_learning_store_insert" ON public.ai_learning_store;
CREATE POLICY "ai_learning_store_insert" ON public.ai_learning_store AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "ai_learning_store_select" ON public.ai_learning_store;
CREATE POLICY "ai_learning_store_select" ON public.ai_learning_store AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "ai_learning_store_service" ON public.ai_learning_store;
CREATE POLICY "ai_learning_store_service" ON public.ai_learning_store AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "ai_learning_store_update" ON public.ai_learning_store;
CREATE POLICY "ai_learning_store_update" ON public.ai_learning_store AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.ai_predictions;
CREATE POLICY "rls_service_all" ON public.ai_predictions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.ai_predictions;
CREATE POLICY "rls_tenant_delete" ON public.ai_predictions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.ai_predictions;
CREATE POLICY "rls_tenant_read" ON public.ai_predictions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.ai_predictions;
CREATE POLICY "rls_tenant_update" ON public.ai_predictions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.ai_predictions;
CREATE POLICY "rls_tenant_write" ON public.ai_predictions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_write_ai_predictions" ON public.ai_predictions;
CREATE POLICY "service_role_write_ai_predictions" ON public.ai_predictions AS PERMISSIVE FOR ALL TO public
  USING ((( SELECT ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text)) = 'service_role'::text))
  WITH CHECK ((( SELECT ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text)) = 'service_role'::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_task_templates;
CREATE POLICY "Allow authenticated" ON public.ai_task_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_tasks;
CREATE POLICY "Allow authenticated" ON public.ai_tasks AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_team_recommendations;
CREATE POLICY "Allow authenticated" ON public.ai_team_recommendations AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.analytics;
CREATE POLICY "Allow authenticated" ON public.analytics AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.analytics_daily;
CREATE POLICY "Tenant isolation" ON public.analytics_daily AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "rls_service_all" ON public.analytics_daily;
CREATE POLICY "rls_service_all" ON public.analytics_daily AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.analytics_daily;
CREATE POLICY "rls_tenant_delete" ON public.analytics_daily AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.analytics_daily;
CREATE POLICY "rls_tenant_read" ON public.analytics_daily AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.analytics_daily;
CREATE POLICY "rls_tenant_update" ON public.analytics_daily AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.analytics_daily;
CREATE POLICY "rls_tenant_write" ON public.analytics_daily AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.analytics_events;
CREATE POLICY "Allow authenticated" ON public.analytics_events AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.analytics_hourly;
CREATE POLICY "Allow authenticated" ON public.analytics_hourly AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "akp_all" ON public.api_key_pool;
CREATE POLICY "akp_all" ON public.api_key_pool AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "api_usage_logs_policy" ON public.api_usage_logs;
CREATE POLICY "api_usage_logs_policy" ON public.api_usage_logs AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Public read" ON public.apify_actors;
CREATE POLICY "Public read" ON public.apify_actors AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.appointments;
CREATE POLICY "Tenant isolation" ON public.appointments AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "rls_service_all" ON public.audience_segments;
CREATE POLICY "rls_service_all" ON public.audience_segments AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.audience_segments;
CREATE POLICY "rls_tenant_delete" ON public.audience_segments AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.audience_segments;
CREATE POLICY "rls_tenant_read" ON public.audience_segments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.audience_segments;
CREATE POLICY "rls_tenant_update" ON public.audience_segments AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.audience_segments;
CREATE POLICY "rls_tenant_write" ON public.audience_segments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.audit_log;
CREATE POLICY "Allow authenticated" ON public.audit_log AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "Master admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Master admins can view all audit logs" ON public.audit_logs AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN users u ON ((ur.user_id = u.id)))
  WHERE ((u.auth_id = auth.uid()) AND (ur.role = 'master_admin'::text)))));
DROP POLICY IF EXISTS "Tenant admins can view their logs" ON public.audit_logs;
CREATE POLICY "Tenant admins can view their logs" ON public.audit_logs AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT u.tenant_id
   FROM users u
  WHERE (u.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "Tenant isolation" ON public.auto_lead_gen_settings;
CREATE POLICY "Tenant isolation" ON public.auto_lead_gen_settings AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "auto_lead_gen_tenant_delete" ON public.auto_lead_gen_settings;
CREATE POLICY "auto_lead_gen_tenant_delete" ON public.auto_lead_gen_settings AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "auto_lead_gen_tenant_insert" ON public.auto_lead_gen_settings;
CREATE POLICY "auto_lead_gen_tenant_insert" ON public.auto_lead_gen_settings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "auto_lead_gen_tenant_select" ON public.auto_lead_gen_settings;
CREATE POLICY "auto_lead_gen_tenant_select" ON public.auto_lead_gen_settings AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "auto_lead_gen_tenant_update" ON public.auto_lead_gen_settings;
CREATE POLICY "auto_lead_gen_tenant_update" ON public.auto_lead_gen_settings AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))))
  WITH CHECK ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_all" ON public.auto_lead_gen_settings;
CREATE POLICY "rls_service_all" ON public.auto_lead_gen_settings AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.auto_lead_gen_settings;
CREATE POLICY "rls_tenant_delete" ON public.auto_lead_gen_settings AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.auto_lead_gen_settings;
CREATE POLICY "rls_tenant_read" ON public.auto_lead_gen_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.auto_lead_gen_settings;
CREATE POLICY "rls_tenant_update" ON public.auto_lead_gen_settings AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.auto_lead_gen_settings;
CREATE POLICY "rls_tenant_write" ON public.auto_lead_gen_settings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.automation_audit_log;
CREATE POLICY "Allow authenticated" ON public.automation_audit_log AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.automation_rules;
CREATE POLICY "Allow authenticated" ON public.automation_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.automation_settings;
CREATE POLICY "Allow authenticated" ON public.automation_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.autonomous_marketing_actions;
CREATE POLICY "rls_service_all" ON public.autonomous_marketing_actions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.autonomous_marketing_actions;
CREATE POLICY "rls_tenant_delete" ON public.autonomous_marketing_actions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.autonomous_marketing_actions;
CREATE POLICY "rls_tenant_read" ON public.autonomous_marketing_actions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.autonomous_marketing_actions;
CREATE POLICY "rls_tenant_update" ON public.autonomous_marketing_actions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.autonomous_marketing_actions;
CREATE POLICY "rls_tenant_write" ON public.autonomous_marketing_actions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.autonomous_workflows;
CREATE POLICY "Allow authenticated" ON public.autonomous_workflows AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_full_access" ON public.b2c_discovered_leads;
CREATE POLICY "service_role_full_access" ON public.b2c_discovered_leads AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.b2c_discovered_leads;
CREATE POLICY "tenant_isolation" ON public.b2c_discovered_leads AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tm.org_id
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))))
  WITH CHECK ((tenant_id IN ( SELECT tm.org_id
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))));
DROP POLICY IF EXISTS "service_role_full_access" ON public.b2c_discovery_logs;
CREATE POLICY "service_role_full_access" ON public.b2c_discovery_logs AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.b2c_discovery_logs;
CREATE POLICY "tenant_isolation" ON public.b2c_discovery_logs AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tm.org_id
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))))
  WITH CHECK ((tenant_id IN ( SELECT tm.org_id
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))));
DROP POLICY IF EXISTS "service_role_full_access" ON public.b2c_intent_monitors;
CREATE POLICY "service_role_full_access" ON public.b2c_intent_monitors AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.b2c_intent_monitors;
CREATE POLICY "tenant_isolation" ON public.b2c_intent_monitors AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tm.org_id
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))))
  WITH CHECK ((tenant_id IN ( SELECT tm.org_id
   FROM team_members tm
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))));
DROP POLICY IF EXISTS "rls_service_all" ON public.billing_events;
CREATE POLICY "rls_service_all" ON public.billing_events AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.billing_events;
CREATE POLICY "rls_tenant_delete" ON public.billing_events AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.billing_events;
CREATE POLICY "rls_tenant_read" ON public.billing_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.billing_events;
CREATE POLICY "rls_tenant_update" ON public.billing_events AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.billing_events;
CREATE POLICY "rls_tenant_write" ON public.billing_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_billing" ON public.billing_events;
CREATE POLICY "service_role_billing" ON public.billing_events AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view own billing history" ON public.billing_history;
CREATE POLICY "Users can view own billing history" ON public.billing_history AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_all" ON public.billing_history;
CREATE POLICY "rls_service_all" ON public.billing_history AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.billing_history;
CREATE POLICY "rls_tenant_delete" ON public.billing_history AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.billing_history;
CREATE POLICY "rls_tenant_read" ON public.billing_history AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.billing_history;
CREATE POLICY "rls_tenant_update" ON public.billing_history AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.billing_history;
CREATE POLICY "rls_tenant_write" ON public.billing_history AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "public_read_published" ON public.blog_posts;
CREATE POLICY "public_read_published" ON public.blog_posts AS PERMISSIVE FOR SELECT TO anon
  USING (((status)::text = 'published'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.blog_posts;
CREATE POLICY "rls_service_all" ON public.blog_posts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.blog_posts;
CREATE POLICY "rls_tenant_delete" ON public.blog_posts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.blog_posts;
CREATE POLICY "rls_tenant_read" ON public.blog_posts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.blog_posts;
CREATE POLICY "rls_tenant_update" ON public.blog_posts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.blog_posts;
CREATE POLICY "rls_tenant_write" ON public.blog_posts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.brand_visual_profiles;
CREATE POLICY "rls_service_all" ON public.brand_visual_profiles AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_tenant_isolation" ON public.brand_visual_profiles;
CREATE POLICY "rls_tenant_isolation" ON public.brand_visual_profiles AS PERMISSIVE FOR ALL TO authenticated
  USING ((tenant_id = get_user_tenant_id()))
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.brand_voice_profiles;
CREATE POLICY "rls_service_all" ON public.brand_voice_profiles AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.brand_voice_profiles;
CREATE POLICY "rls_tenant_delete" ON public.brand_voice_profiles AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.brand_voice_profiles;
CREATE POLICY "rls_tenant_read" ON public.brand_voice_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.brand_voice_profiles;
CREATE POLICY "rls_tenant_update" ON public.brand_voice_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.brand_voice_profiles;
CREATE POLICY "rls_tenant_write" ON public.brand_voice_profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "bsh_clinical_log_service_role_all" ON public.bsh_clinical_log;
CREATE POLICY "bsh_clinical_log_service_role_all" ON public.bsh_clinical_log AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "bsh_clinical_log_tenant_isolation" ON public.bsh_clinical_log;
CREATE POLICY "bsh_clinical_log_tenant_isolation" ON public.bsh_clinical_log AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = COALESCE((((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text), current_setting('request.jwt.claim.tenant_id'::text, true))));
DROP POLICY IF EXISTS "bsh_metrics_service_role_all" ON public.bsh_multibranch_metrics;
CREATE POLICY "bsh_metrics_service_role_all" ON public.bsh_multibranch_metrics AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "bsh_metrics_tenant_isolation" ON public.bsh_multibranch_metrics;
CREATE POLICY "bsh_metrics_tenant_isolation" ON public.bsh_multibranch_metrics AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = COALESCE((((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text), current_setting('request.jwt.claim.tenant_id'::text, true))));
DROP POLICY IF EXISTS "rls_service_all" ON public.bulk_call_campaigns;
CREATE POLICY "rls_service_all" ON public.bulk_call_campaigns AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.bulk_call_campaigns;
CREATE POLICY "rls_tenant_delete" ON public.bulk_call_campaigns AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.bulk_call_campaigns;
CREATE POLICY "rls_tenant_read" ON public.bulk_call_campaigns AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.bulk_call_campaigns;
CREATE POLICY "rls_tenant_update" ON public.bulk_call_campaigns AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.bulk_call_campaigns;
CREATE POLICY "rls_tenant_write" ON public.bulk_call_campaigns AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.bulk_call_contacts;
CREATE POLICY "rls_service_all" ON public.bulk_call_contacts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.bulk_call_contacts;
CREATE POLICY "rls_tenant_delete" ON public.bulk_call_contacts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.bulk_call_contacts;
CREATE POLICY "rls_tenant_read" ON public.bulk_call_contacts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.bulk_call_contacts;
CREATE POLICY "rls_tenant_update" ON public.bulk_call_contacts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.bulk_call_contacts;
CREATE POLICY "rls_tenant_write" ON public.bulk_call_contacts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.business_insights;
CREATE POLICY "Allow authenticated" ON public.business_insights AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage tenant profiles" ON public.business_profiles;
CREATE POLICY "Admins can manage tenant profiles" ON public.business_profiles AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'master_admin'::text]))))));
DROP POLICY IF EXISTS "Users can view own tenant profiles" ON public.business_profiles;
CREATE POLICY "Users can view own tenant profiles" ON public.business_profiles AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));
DROP POLICY IF EXISTS "bp_tenant_insert" ON public.business_profiles;
CREATE POLICY "bp_tenant_insert" ON public.business_profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "bp_tenant_select" ON public.business_profiles;
CREATE POLICY "bp_tenant_select" ON public.business_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "bp_tenant_update" ON public.business_profiles;
CREATE POLICY "bp_tenant_update" ON public.business_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()))
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.business_settings;
CREATE POLICY "Allow authenticated" ON public.business_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "bc_all" ON public.buying_committees;
CREATE POLICY "bc_all" ON public.buying_committees AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.call_logs;
CREATE POLICY "Allow authenticated" ON public.call_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_access" ON public.call_queue;
CREATE POLICY "allow_all_access" ON public.call_queue AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_call_records" ON public.call_records;
CREATE POLICY "allow_all_call_records" ON public.call_records AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.calls;
CREATE POLICY "Allow authenticated" ON public.calls AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_campaign_executions" ON public.campaign_executions;
CREATE POLICY "allow_all_campaign_executions" ON public.campaign_executions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_logs;
CREATE POLICY "Allow authenticated" ON public.campaign_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_media;
CREATE POLICY "Allow authenticated" ON public.campaign_media AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_metrics;
CREATE POLICY "Allow authenticated" ON public.campaign_metrics AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_send_log;
CREATE POLICY "Allow authenticated" ON public.campaign_send_log AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_templates;
CREATE POLICY "Allow authenticated" ON public.campaign_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaigns;
CREATE POLICY "Allow authenticated" ON public.campaigns AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.canned_responses;
CREATE POLICY "rls_service_all" ON public.canned_responses AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.canned_responses;
CREATE POLICY "rls_tenant_delete" ON public.canned_responses AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.canned_responses;
CREATE POLICY "rls_tenant_read" ON public.canned_responses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.canned_responses;
CREATE POLICY "rls_tenant_update" ON public.canned_responses AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.canned_responses;
CREATE POLICY "rls_tenant_write" ON public.canned_responses AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.channel_configurations;
CREATE POLICY "Allow authenticated" ON public.channel_configurations AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.channel_messages;
CREATE POLICY "Allow authenticated" ON public.channel_messages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.client_packages;
CREATE POLICY "Allow authenticated" ON public.client_packages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.clinic_consent_forms;
CREATE POLICY "tenant_isolation" ON public.clinic_consent_forms AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text))));
DROP POLICY IF EXISTS "tenant_isolation" ON public.clinic_consent_templates;
CREATE POLICY "tenant_isolation" ON public.clinic_consent_templates AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text))));
DROP POLICY IF EXISTS "clinic_consultations_tenant_isolation" ON public.clinic_consultations;
CREATE POLICY "clinic_consultations_tenant_isolation" ON public.clinic_consultations AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "clinic_health_analyses_all" ON public.clinic_health_analyses;
CREATE POLICY "clinic_health_analyses_all" ON public.clinic_health_analyses AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "clinic_medical_reports_all" ON public.clinic_medical_reports;
CREATE POLICY "clinic_medical_reports_all" ON public.clinic_medical_reports AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "clinic_medical_review_queue_all" ON public.clinic_medical_review_queue;
CREATE POLICY "clinic_medical_review_queue_all" ON public.clinic_medical_review_queue AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.clinic_patient_files;
CREATE POLICY "tenant_isolation" ON public.clinic_patient_files AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text))));
DROP POLICY IF EXISTS "tenant_isolation" ON public.clinic_patient_notes;
CREATE POLICY "tenant_isolation" ON public.clinic_patient_notes AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text))));
DROP POLICY IF EXISTS "rls_service_all" ON public.clinic_patients;
CREATE POLICY "rls_service_all" ON public.clinic_patients AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.clinic_patients;
CREATE POLICY "rls_tenant_delete" ON public.clinic_patients AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.clinic_patients;
CREATE POLICY "rls_tenant_read" ON public.clinic_patients AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.clinic_patients;
CREATE POLICY "rls_tenant_update" ON public.clinic_patients AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.clinic_patients;
CREATE POLICY "rls_tenant_write" ON public.clinic_patients AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_post_care_tenant_isolation" ON public.clinic_post_care_schedule;
CREATE POLICY "clinic_post_care_tenant_isolation" ON public.clinic_post_care_schedule AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "clinic_prescriptions_tenant_isolation" ON public.clinic_prescriptions;
CREATE POLICY "clinic_prescriptions_tenant_isolation" ON public.clinic_prescriptions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.clinic_products;
CREATE POLICY "rls_service_all" ON public.clinic_products AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.clinic_products;
CREATE POLICY "rls_tenant_delete" ON public.clinic_products AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.clinic_products;
CREATE POLICY "rls_tenant_read" ON public.clinic_products AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.clinic_products;
CREATE POLICY "rls_tenant_update" ON public.clinic_products AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.clinic_products;
CREATE POLICY "rls_tenant_write" ON public.clinic_products AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.clinic_treatments;
CREATE POLICY "rls_service_all" ON public.clinic_treatments AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.clinic_treatments;
CREATE POLICY "rls_tenant_delete" ON public.clinic_treatments AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.clinic_treatments;
CREATE POLICY "rls_tenant_read" ON public.clinic_treatments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.clinic_treatments;
CREATE POLICY "rls_tenant_update" ON public.clinic_treatments AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.clinic_treatments;
CREATE POLICY "rls_tenant_write" ON public.clinic_treatments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_video_scripts_all" ON public.clinic_video_scripts;
CREATE POLICY "clinic_video_scripts_all" ON public.clinic_video_scripts AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.collections_accounts;
CREATE POLICY "rls_service_all" ON public.collections_accounts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.collections_accounts;
CREATE POLICY "rls_tenant_delete" ON public.collections_accounts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.collections_accounts;
CREATE POLICY "rls_tenant_read" ON public.collections_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.collections_accounts;
CREATE POLICY "rls_tenant_update" ON public.collections_accounts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.collections_accounts;
CREATE POLICY "rls_tenant_write" ON public.collections_accounts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_collections_accounts" ON public.collections_accounts;
CREATE POLICY "service_role_collections_accounts" ON public.collections_accounts AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.collections_bucket_config;
CREATE POLICY "rls_service_all" ON public.collections_bucket_config AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.collections_bucket_config;
CREATE POLICY "rls_tenant_delete" ON public.collections_bucket_config AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.collections_bucket_config;
CREATE POLICY "rls_tenant_read" ON public.collections_bucket_config AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.collections_bucket_config;
CREATE POLICY "rls_tenant_update" ON public.collections_bucket_config AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.collections_bucket_config;
CREATE POLICY "rls_tenant_write" ON public.collections_bucket_config AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_collections_bucket_config" ON public.collections_bucket_config;
CREATE POLICY "service_role_collections_bucket_config" ON public.collections_bucket_config AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "collections_compliance_log_tenant_access" ON public.collections_compliance_log;
CREATE POLICY "collections_compliance_log_tenant_access" ON public.collections_compliance_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_collections_compliance_log" ON public.collections_compliance_log;
CREATE POLICY "service_role_collections_compliance_log" ON public.collections_compliance_log AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.collections_compliance_rules;
CREATE POLICY "rls_service_all" ON public.collections_compliance_rules AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.collections_compliance_rules;
CREATE POLICY "rls_tenant_delete" ON public.collections_compliance_rules AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.collections_compliance_rules;
CREATE POLICY "rls_tenant_read" ON public.collections_compliance_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.collections_compliance_rules;
CREATE POLICY "rls_tenant_update" ON public.collections_compliance_rules AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.collections_compliance_rules;
CREATE POLICY "rls_tenant_write" ON public.collections_compliance_rules AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_collections_compliance_rules" ON public.collections_compliance_rules;
CREATE POLICY "service_role_collections_compliance_rules" ON public.collections_compliance_rules AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.collections_contact_log;
CREATE POLICY "rls_service_all" ON public.collections_contact_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.collections_contact_log;
CREATE POLICY "rls_tenant_delete" ON public.collections_contact_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.collections_contact_log;
CREATE POLICY "rls_tenant_read" ON public.collections_contact_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.collections_contact_log;
CREATE POLICY "rls_tenant_update" ON public.collections_contact_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.collections_contact_log;
CREATE POLICY "rls_tenant_write" ON public.collections_contact_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_collections_contact_log" ON public.collections_contact_log;
CREATE POLICY "service_role_collections_contact_log" ON public.collections_contact_log AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "collections_field_visits_tenant_access" ON public.collections_field_visits;
CREATE POLICY "collections_field_visits_tenant_access" ON public.collections_field_visits AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_collections_field_visits" ON public.collections_field_visits;
CREATE POLICY "service_role_collections_field_visits" ON public.collections_field_visits AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "collections_kpis_tenant_access" ON public.collections_kpis;
CREATE POLICY "collections_kpis_tenant_access" ON public.collections_kpis AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_collections_kpis" ON public.collections_kpis;
CREATE POLICY "service_role_collections_kpis" ON public.collections_kpis AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.collections_ptp;
CREATE POLICY "rls_service_all" ON public.collections_ptp AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.collections_ptp;
CREATE POLICY "rls_tenant_delete" ON public.collections_ptp AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.collections_ptp;
CREATE POLICY "rls_tenant_read" ON public.collections_ptp AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.collections_ptp;
CREATE POLICY "rls_tenant_update" ON public.collections_ptp AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.collections_ptp;
CREATE POLICY "rls_tenant_write" ON public.collections_ptp AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_collections_ptp" ON public.collections_ptp;
CREATE POLICY "service_role_collections_ptp" ON public.collections_ptp AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.collections_settlements;
CREATE POLICY "rls_service_all" ON public.collections_settlements AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.collections_settlements;
CREATE POLICY "rls_tenant_delete" ON public.collections_settlements AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.collections_settlements;
CREATE POLICY "rls_tenant_read" ON public.collections_settlements AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.collections_settlements;
CREATE POLICY "rls_tenant_update" ON public.collections_settlements AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.collections_settlements;
CREATE POLICY "rls_tenant_write" ON public.collections_settlements AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_collections_settlements" ON public.collections_settlements;
CREATE POLICY "service_role_collections_settlements" ON public.collections_settlements AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_read_comm_analytics" ON public.comm_analytics_daily;
CREATE POLICY "allow_read_comm_analytics" ON public.comm_analytics_daily AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_comm_analytics" ON public.comm_analytics_daily;
CREATE POLICY "allow_write_comm_analytics" ON public.comm_analytics_daily AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "companies_allow_all" ON public.companies;
CREATE POLICY "companies_allow_all" ON public.companies AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.company_intelligence;
CREATE POLICY "rls_service_all" ON public.company_intelligence AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.company_intelligence;
CREATE POLICY "rls_tenant_delete" ON public.company_intelligence AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.company_intelligence;
CREATE POLICY "rls_tenant_read" ON public.company_intelligence AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.company_intelligence;
CREATE POLICY "rls_tenant_update" ON public.company_intelligence AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.company_intelligence;
CREATE POLICY "rls_tenant_write" ON public.company_intelligence AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.company_policies;
CREATE POLICY "Allow authenticated" ON public.company_policies AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.company_research;
CREATE POLICY "rls_service_all" ON public.company_research AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.company_research;
CREATE POLICY "rls_tenant_delete" ON public.company_research AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.company_research;
CREATE POLICY "rls_tenant_read" ON public.company_research AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.company_research;
CREATE POLICY "rls_tenant_update" ON public.company_research AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.company_research;
CREATE POLICY "rls_tenant_write" ON public.company_research AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.competitor_ad_intelligence;
CREATE POLICY "rls_service_all" ON public.competitor_ad_intelligence AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.competitor_ad_intelligence;
CREATE POLICY "rls_tenant_delete" ON public.competitor_ad_intelligence AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.competitor_ad_intelligence;
CREATE POLICY "rls_tenant_read" ON public.competitor_ad_intelligence AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.competitor_ad_intelligence;
CREATE POLICY "rls_tenant_update" ON public.competitor_ad_intelligence AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.competitor_ad_intelligence;
CREATE POLICY "rls_tenant_write" ON public.competitor_ad_intelligence AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated read competitor_analysis" ON public.competitor_analysis;
CREATE POLICY "Allow authenticated read competitor_analysis" ON public.competitor_analysis AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "Service role full access competitor_analysis" ON public.competitor_analysis;
CREATE POLICY "Service role full access competitor_analysis" ON public.competitor_analysis AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role full access competitor_content" ON public.competitor_content;
CREATE POLICY "Service role full access competitor_content" ON public.competitor_content AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.competitor_content;
CREATE POLICY "rls_service_all" ON public.competitor_content AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.competitor_content;
CREATE POLICY "rls_tenant_delete" ON public.competitor_content AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.competitor_content;
CREATE POLICY "rls_tenant_read" ON public.competitor_content AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.competitor_content;
CREATE POLICY "rls_tenant_update" ON public.competitor_content AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.competitor_content;
CREATE POLICY "rls_tenant_write" ON public.competitor_content AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "ci_allow_all" ON public.competitor_intelligence;
CREATE POLICY "ci_allow_all" ON public.competitor_intelligence AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.competitor_prices;
CREATE POLICY "Allow authenticated" ON public.competitor_prices AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.competitor_tracking;
CREATE POLICY "Tenant isolation" ON public.competitor_tracking AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "rls_service_all" ON public.competitor_tracking;
CREATE POLICY "rls_service_all" ON public.competitor_tracking AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.competitor_tracking;
CREATE POLICY "rls_tenant_delete" ON public.competitor_tracking AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.competitor_tracking;
CREATE POLICY "rls_tenant_read" ON public.competitor_tracking AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.competitor_tracking;
CREATE POLICY "rls_tenant_update" ON public.competitor_tracking AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.competitor_tracking;
CREATE POLICY "rls_tenant_write" ON public.competitor_tracking AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.competitors;
CREATE POLICY "rls_service_all" ON public.competitors AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.competitors;
CREATE POLICY "rls_tenant_delete" ON public.competitors AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.competitors;
CREATE POLICY "rls_tenant_read" ON public.competitors AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.competitors;
CREATE POLICY "rls_tenant_update" ON public.competitors AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.competitors;
CREATE POLICY "rls_tenant_write" ON public.competitors AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "allow_all_consent" ON public.consent;
CREATE POLICY "allow_all_consent" ON public.consent AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "cl_all" ON public.consent_log;
CREATE POLICY "cl_all" ON public.consent_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.consent_records;
CREATE POLICY "Allow authenticated" ON public.consent_records AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.consent_signatures;
CREATE POLICY "tenant_isolation" ON public.consent_signatures AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text))));
DROP POLICY IF EXISTS "Public read" ON public.consent_templates;
CREATE POLICY "Public read" ON public.consent_templates AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "allow_read_contact_channel_map" ON public.contact_channel_map;
CREATE POLICY "allow_read_contact_channel_map" ON public.contact_channel_map AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_contact_channel_map" ON public.contact_channel_map;
CREATE POLICY "allow_write_contact_channel_map" ON public.contact_channel_map AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_engagement_patterns" ON public.contact_engagement_patterns;
CREATE POLICY "allow_all_engagement_patterns" ON public.contact_engagement_patterns AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_contacts_insert" ON public.contacts;
CREATE POLICY "allow_all_contacts_insert" ON public.contacts AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_contacts_read" ON public.contacts;
CREATE POLICY "allow_all_contacts_read" ON public.contacts AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_all_contacts_update" ON public.contacts;
CREATE POLICY "allow_all_contacts_update" ON public.contacts AS PERMISSIVE FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "contacts_allow_all" ON public.contacts;
CREATE POLICY "contacts_allow_all" ON public.contacts AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "allow_all_content_attribution" ON public.content_attribution;
CREATE POLICY "allow_all_content_attribution" ON public.content_attribution AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "content_calendar_all" ON public.content_calendar;
CREATE POLICY "content_calendar_all" ON public.content_calendar AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.content_performance;
CREATE POLICY "Allow authenticated" ON public.content_performance AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.content_repurpose_jobs;
CREATE POLICY "rls_service_all" ON public.content_repurpose_jobs AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.content_repurpose_jobs;
CREATE POLICY "rls_tenant_delete" ON public.content_repurpose_jobs AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.content_repurpose_jobs;
CREATE POLICY "rls_tenant_read" ON public.content_repurpose_jobs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.content_repurpose_jobs;
CREATE POLICY "rls_tenant_update" ON public.content_repurpose_jobs AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.content_repurpose_jobs;
CREATE POLICY "rls_tenant_write" ON public.content_repurpose_jobs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.content_versions;
CREATE POLICY "Allow authenticated" ON public.content_versions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_conversation_merges" ON public.conversation_merges;
CREATE POLICY "allow_all_conversation_merges" ON public.conversation_merges AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.conversation_messages;
CREATE POLICY "Allow authenticated" ON public.conversation_messages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_read_conversation_ratings" ON public.conversation_ratings;
CREATE POLICY "allow_read_conversation_ratings" ON public.conversation_ratings AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_conversation_ratings" ON public.conversation_ratings;
CREATE POLICY "allow_write_conversation_ratings" ON public.conversation_ratings AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_conversation_resolution_log" ON public.conversation_resolution_log;
CREATE POLICY "allow_all_conversation_resolution_log" ON public.conversation_resolution_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_read_conv_tag_assign" ON public.conversation_tag_assignments;
CREATE POLICY "allow_read_conv_tag_assign" ON public.conversation_tag_assignments AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_conv_tag_assign" ON public.conversation_tag_assignments;
CREATE POLICY "allow_write_conv_tag_assign" ON public.conversation_tag_assignments AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.conversation_tags;
CREATE POLICY "rls_service_all" ON public.conversation_tags AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.conversation_tags;
CREATE POLICY "rls_tenant_delete" ON public.conversation_tags AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.conversation_tags;
CREATE POLICY "rls_tenant_read" ON public.conversation_tags AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.conversation_tags;
CREATE POLICY "rls_tenant_update" ON public.conversation_tags AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.conversation_tags;
CREATE POLICY "rls_tenant_write" ON public.conversation_tags AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Tenant isolation" ON public.conversations;
CREATE POLICY "Tenant isolation" ON public.conversations AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "allow_all_conversations_insert" ON public.conversations;
CREATE POLICY "allow_all_conversations_insert" ON public.conversations AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_conversations_read" ON public.conversations;
CREATE POLICY "allow_all_conversations_read" ON public.conversations AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_all_conversations_update" ON public.conversations;
CREATE POLICY "allow_all_conversations_update" ON public.conversations AS PERMISSIVE FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.conversion_events;
CREATE POLICY "Allow authenticated" ON public.conversion_events AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_access" ON public.conversions;
CREATE POLICY "allow_all_access" ON public.conversions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.countries;
CREATE POLICY "rls_auth_read" ON public.countries AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.countries;
CREATE POLICY "rls_service_all" ON public.countries AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.credentials_entity;
CREATE POLICY "rls_service_only" ON public.credentials_entity AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.credit_transactions;
CREATE POLICY "Authenticated access" ON public.credit_transactions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_360;
CREATE POLICY "Allow authenticated" ON public.customer_360 AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "customer_health_scores_tenant_isolation" ON public.customer_health_scores;
CREATE POLICY "customer_health_scores_tenant_isolation" ON public.customer_health_scores AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_identities;
CREATE POLICY "Allow authenticated" ON public.customer_identities AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "customer_lifecycle_enrollment_tenant_isolation" ON public.customer_lifecycle_enrollment;
CREATE POLICY "customer_lifecycle_enrollment_tenant_isolation" ON public.customer_lifecycle_enrollment AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "customer_lifecycle_stages_tenant_isolation" ON public.customer_lifecycle_stages;
CREATE POLICY "customer_lifecycle_stages_tenant_isolation" ON public.customer_lifecycle_stages AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "Allow all for customer_loyalty" ON public.customer_loyalty;
CREATE POLICY "Allow all for customer_loyalty" ON public.customer_loyalty AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "ltv_cac_service_role" ON public.customer_ltv_cac;
CREATE POLICY "ltv_cac_service_role" ON public.customer_ltv_cac AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.customer_ltv_cac;
CREATE POLICY "rls_service_all" ON public.customer_ltv_cac AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.customer_ltv_cac;
CREATE POLICY "rls_tenant_delete" ON public.customer_ltv_cac AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.customer_ltv_cac;
CREATE POLICY "rls_tenant_read" ON public.customer_ltv_cac AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.customer_ltv_cac;
CREATE POLICY "rls_tenant_update" ON public.customer_ltv_cac AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.customer_ltv_cac;
CREATE POLICY "rls_tenant_write" ON public.customer_ltv_cac AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_marketing_prefs;
CREATE POLICY "Allow authenticated" ON public.customer_marketing_prefs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_relationships;
CREATE POLICY "Allow authenticated" ON public.customer_relationships AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_reviews;
CREATE POLICY "Allow authenticated" ON public.customer_reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_timeline;
CREATE POLICY "Allow authenticated" ON public.customer_timeline AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.customers;
CREATE POLICY "Tenant isolation" ON public.customers AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "Allow authenticated" ON public.daily_metrics;
CREATE POLICY "Allow authenticated" ON public.daily_metrics AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_deal_activities" ON public.deal_activities;
CREATE POLICY "allow_all_deal_activities" ON public.deal_activities AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.deals;
CREATE POLICY "Tenant isolation" ON public.deals AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "rls_auth_read" ON public.default_checklist_items;
CREATE POLICY "rls_auth_read" ON public.default_checklist_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.default_checklist_items;
CREATE POLICY "rls_service_all" ON public.default_checklist_items AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.deliverability_metrics;
CREATE POLICY "rls_service_all" ON public.deliverability_metrics AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.deliverability_metrics;
CREATE POLICY "rls_tenant_delete" ON public.deliverability_metrics AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.deliverability_metrics;
CREATE POLICY "rls_tenant_read" ON public.deliverability_metrics AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.deliverability_metrics;
CREATE POLICY "rls_tenant_update" ON public.deliverability_metrics AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.deliverability_metrics;
CREATE POLICY "rls_tenant_write" ON public.deliverability_metrics AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for delivery_connectors" ON public.delivery_connectors;
CREATE POLICY "Allow all for delivery_connectors" ON public.delivery_connectors AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.do_not_contact;
CREATE POLICY "Allow authenticated" ON public.do_not_contact AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.document_tracking;
CREATE POLICY "rls_service_all" ON public.document_tracking AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.document_tracking;
CREATE POLICY "rls_tenant_delete" ON public.document_tracking AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.document_tracking;
CREATE POLICY "rls_tenant_read" ON public.document_tracking AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.document_tracking;
CREATE POLICY "rls_tenant_update" ON public.document_tracking AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.document_tracking;
CREATE POLICY "rls_tenant_write" ON public.document_tracking AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.email_sequence_steps;
CREATE POLICY "Allow authenticated" ON public.email_sequence_steps AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.email_sequence_subscribers;
CREATE POLICY "Tenant isolation" ON public.email_sequence_subscribers AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "Allow authenticated" ON public.email_sequences;
CREATE POLICY "Allow authenticated" ON public.email_sequences AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "email_template_library_service_role" ON public.email_template_library;
CREATE POLICY "email_template_library_service_role" ON public.email_template_library AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.email_template_library;
CREATE POLICY "rls_service_all" ON public.email_template_library AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.email_template_library;
CREATE POLICY "rls_tenant_delete" ON public.email_template_library AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.email_template_library;
CREATE POLICY "rls_tenant_read" ON public.email_template_library AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.email_template_library;
CREATE POLICY "rls_tenant_update" ON public.email_template_library AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.email_template_library;
CREATE POLICY "rls_tenant_write" ON public.email_template_library AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.email_templates;
CREATE POLICY "rls_service_all" ON public.email_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.email_templates;
CREATE POLICY "rls_tenant_delete" ON public.email_templates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.email_templates;
CREATE POLICY "rls_tenant_read" ON public.email_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.email_templates;
CREATE POLICY "rls_tenant_update" ON public.email_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.email_templates;
CREATE POLICY "rls_tenant_write" ON public.email_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ev_read" ON public.email_verification;
CREATE POLICY "ev_read" ON public.email_verification AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ev_write" ON public.email_verification;
CREATE POLICY "ev_write" ON public.email_verification AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.email_warmup_status;
CREATE POLICY "rls_service_all" ON public.email_warmup_status AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.email_warmup_status;
CREATE POLICY "rls_tenant_delete" ON public.email_warmup_status AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.email_warmup_status;
CREATE POLICY "rls_tenant_read" ON public.email_warmup_status AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.email_warmup_status;
CREATE POLICY "rls_tenant_update" ON public.email_warmup_status AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.email_warmup_status;
CREATE POLICY "rls_tenant_write" ON public.email_warmup_status AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_bypass" ON public.email_warmup_status;
CREATE POLICY "service_role_bypass" ON public.email_warmup_status AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.employer_branding_content;
CREATE POLICY "Allow authenticated" ON public.employer_branding_content AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "er_master_admin_all" ON public.engagement_responses;
CREATE POLICY "er_master_admin_all" ON public.engagement_responses AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'master_admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'master_admin'::text)))));
DROP POLICY IF EXISTS "er_service_all" ON public.engagement_responses;
CREATE POLICY "er_service_all" ON public.engagement_responses AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "er_tenant_read" ON public.engagement_responses;
CREATE POLICY "er_tenant_read" ON public.engagement_responses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.enrichment_api_usage;
CREATE POLICY "Allow authenticated" ON public.enrichment_api_usage AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.entity_links;
CREATE POLICY "Allow authenticated" ON public.entity_links AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_access" ON public.escalations;
CREATE POLICY "allow_all_access" ON public.escalations AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_activity_log;
CREATE POLICY "rls_service_all" ON public.estimation_activity_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_activity_log;
CREATE POLICY "rls_tenant_delete" ON public.estimation_activity_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_activity_log;
CREATE POLICY "rls_tenant_read" ON public.estimation_activity_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_activity_log;
CREATE POLICY "rls_tenant_update" ON public.estimation_activity_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_activity_log;
CREATE POLICY "rls_tenant_write" ON public.estimation_activity_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_activity_log" ON public.estimation_activity_log;
CREATE POLICY "service_role_estimation_activity_log" ON public.estimation_activity_log AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_bidsets;
CREATE POLICY "rls_service_all" ON public.estimation_bidsets AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_bidsets;
CREATE POLICY "rls_tenant_delete" ON public.estimation_bidsets AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_bidsets;
CREATE POLICY "rls_tenant_read" ON public.estimation_bidsets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_bidsets;
CREATE POLICY "rls_tenant_update" ON public.estimation_bidsets AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_bidsets;
CREATE POLICY "rls_tenant_write" ON public.estimation_bidsets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_bidsets" ON public.estimation_bidsets;
CREATE POLICY "service_role_estimation_bidsets" ON public.estimation_bidsets AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_all_edp" ON public.estimation_drawing_pages;
CREATE POLICY "allow_all_edp" ON public.estimation_drawing_pages AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_estimates;
CREATE POLICY "rls_service_all" ON public.estimation_estimates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_estimates;
CREATE POLICY "rls_tenant_delete" ON public.estimation_estimates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_estimates;
CREATE POLICY "rls_tenant_read" ON public.estimation_estimates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_estimates;
CREATE POLICY "rls_tenant_update" ON public.estimation_estimates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_estimates;
CREATE POLICY "rls_tenant_write" ON public.estimation_estimates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_estimates" ON public.estimation_estimates;
CREATE POLICY "service_role_estimation_estimates" ON public.estimation_estimates AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_all_learning" ON public.estimation_learning_data;
CREATE POLICY "allow_all_learning" ON public.estimation_learning_data AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_read_learning" ON public.estimation_learning_data;
CREATE POLICY "tenant_read_learning" ON public.estimation_learning_data AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_materials;
CREATE POLICY "rls_service_all" ON public.estimation_materials AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_materials;
CREATE POLICY "rls_tenant_delete" ON public.estimation_materials AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_materials;
CREATE POLICY "rls_tenant_read" ON public.estimation_materials AS PERMISSIVE FOR SELECT TO authenticated
  USING (((tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = 'global'::text)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_materials;
CREATE POLICY "rls_tenant_update" ON public.estimation_materials AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_materials;
CREATE POLICY "rls_tenant_write" ON public.estimation_materials AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "service_role_estimation_materials" ON public.estimation_materials;
CREATE POLICY "service_role_estimation_materials" ON public.estimation_materials AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_projects;
CREATE POLICY "rls_service_all" ON public.estimation_projects AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_projects;
CREATE POLICY "rls_tenant_delete" ON public.estimation_projects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_projects;
CREATE POLICY "rls_tenant_read" ON public.estimation_projects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_projects;
CREATE POLICY "rls_tenant_update" ON public.estimation_projects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_projects;
CREATE POLICY "rls_tenant_write" ON public.estimation_projects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_projects" ON public.estimation_projects;
CREATE POLICY "service_role_estimation_projects" ON public.estimation_projects AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_read_estimation_revisions" ON public.estimation_revisions;
CREATE POLICY "allow_read_estimation_revisions" ON public.estimation_revisions AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_estimation_revisions" ON public.estimation_revisions;
CREATE POLICY "allow_write_estimation_revisions" ON public.estimation_revisions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_estimation_revisions" ON public.estimation_revisions;
CREATE POLICY "service_role_estimation_revisions" ON public.estimation_revisions AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_rfis;
CREATE POLICY "rls_service_all" ON public.estimation_rfis AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_rfis;
CREATE POLICY "rls_tenant_delete" ON public.estimation_rfis AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_rfis;
CREATE POLICY "rls_tenant_read" ON public.estimation_rfis AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_rfis;
CREATE POLICY "rls_tenant_update" ON public.estimation_rfis AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_rfis;
CREATE POLICY "rls_tenant_write" ON public.estimation_rfis AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_rfis" ON public.estimation_rfis;
CREATE POLICY "service_role_estimation_rfis" ON public.estimation_rfis AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_read_rd" ON public.estimation_room_details;
CREATE POLICY "allow_read_rd" ON public.estimation_room_details AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_rd" ON public.estimation_room_details;
CREATE POLICY "allow_write_rd" ON public.estimation_room_details AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_erp" ON public.estimation_room_polygons;
CREATE POLICY "allow_all_erp" ON public.estimation_room_polygons AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_rooms;
CREATE POLICY "rls_service_all" ON public.estimation_rooms AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_rooms;
CREATE POLICY "rls_tenant_delete" ON public.estimation_rooms AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_rooms;
CREATE POLICY "rls_tenant_read" ON public.estimation_rooms AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_rooms;
CREATE POLICY "rls_tenant_update" ON public.estimation_rooms AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_rooms;
CREATE POLICY "rls_tenant_write" ON public.estimation_rooms AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_rooms" ON public.estimation_rooms;
CREATE POLICY "service_role_estimation_rooms" ON public.estimation_rooms AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_read_sd" ON public.estimation_spec_data;
CREATE POLICY "allow_read_sd" ON public.estimation_spec_data AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_sd" ON public.estimation_spec_data;
CREATE POLICY "allow_write_sd" ON public.estimation_spec_data AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_read_estimation_supplier_pricing" ON public.estimation_supplier_pricing;
CREATE POLICY "allow_read_estimation_supplier_pricing" ON public.estimation_supplier_pricing AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_estimation_supplier_pricing" ON public.estimation_supplier_pricing;
CREATE POLICY "allow_write_estimation_supplier_pricing" ON public.estimation_supplier_pricing AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_estimation_supplier_pricing" ON public.estimation_supplier_pricing;
CREATE POLICY "service_role_estimation_supplier_pricing" ON public.estimation_supplier_pricing AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_takeoff_items;
CREATE POLICY "rls_service_all" ON public.estimation_takeoff_items AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_takeoff_items;
CREATE POLICY "rls_tenant_delete" ON public.estimation_takeoff_items AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_takeoff_items;
CREATE POLICY "rls_tenant_read" ON public.estimation_takeoff_items AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_takeoff_items;
CREATE POLICY "rls_tenant_update" ON public.estimation_takeoff_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_takeoff_items;
CREATE POLICY "rls_tenant_write" ON public.estimation_takeoff_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_takeoff_items" ON public.estimation_takeoff_items;
CREATE POLICY "service_role_estimation_takeoff_items" ON public.estimation_takeoff_items AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_team_assignments;
CREATE POLICY "rls_service_all" ON public.estimation_team_assignments AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_team_assignments;
CREATE POLICY "rls_tenant_delete" ON public.estimation_team_assignments AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_team_assignments;
CREATE POLICY "rls_tenant_read" ON public.estimation_team_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_team_assignments;
CREATE POLICY "rls_tenant_update" ON public.estimation_team_assignments AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_team_assignments;
CREATE POLICY "rls_tenant_write" ON public.estimation_team_assignments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_estimation_team_assignments" ON public.estimation_team_assignments;
CREATE POLICY "service_role_estimation_team_assignments" ON public.estimation_team_assignments AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_read_tr" ON public.estimation_transition_rules;
CREATE POLICY "allow_read_tr" ON public.estimation_transition_rules AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_tr" ON public.estimation_transition_rules;
CREATE POLICY "allow_write_tr" ON public.estimation_transition_rules AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.estimation_waste_factors;
CREATE POLICY "rls_service_all" ON public.estimation_waste_factors AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.estimation_waste_factors;
CREATE POLICY "rls_tenant_delete" ON public.estimation_waste_factors AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.estimation_waste_factors;
CREATE POLICY "rls_tenant_read" ON public.estimation_waste_factors AS PERMISSIVE FOR SELECT TO authenticated
  USING (((tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = 'global'::text)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.estimation_waste_factors;
CREATE POLICY "rls_tenant_update" ON public.estimation_waste_factors AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.estimation_waste_factors;
CREATE POLICY "rls_tenant_write" ON public.estimation_waste_factors AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "service_role_estimation_waste_factors" ON public.estimation_waste_factors;
CREATE POLICY "service_role_estimation_waste_factors" ON public.estimation_waste_factors AS PERMISSIVE FOR ALL TO public
  USING ((current_setting('role'::text, true) = 'service_role'::text));
DROP POLICY IF EXISTS "allow_read_wm" ON public.estimation_waste_matrix;
CREATE POLICY "allow_read_wm" ON public.estimation_waste_matrix AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_wm" ON public.estimation_waste_matrix;
CREATE POLICY "allow_write_wm" ON public.estimation_waste_matrix AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.execution_data;
CREATE POLICY "rls_service_only" ON public.execution_data AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.execution_entity;
CREATE POLICY "rls_service_only" ON public.execution_entity AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "allow_all" ON public.field_job_cards;
CREATE POLICY "allow_all" ON public.field_job_cards AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.follow_up_tasks;
CREATE POLICY "Allow authenticated" ON public.follow_up_tasks AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.follow_up_tracking;
CREATE POLICY "Allow authenticated" ON public.follow_up_tracking AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.follow_ups;
CREATE POLICY "Allow authenticated" ON public.follow_ups AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON public.forecast_history;
CREATE POLICY "Service role full access" ON public.forecast_history AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.forecast_history;
CREATE POLICY "rls_service_all" ON public.forecast_history AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.forecast_history;
CREATE POLICY "rls_tenant_delete" ON public.forecast_history AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.forecast_history;
CREATE POLICY "rls_tenant_read" ON public.forecast_history AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.forecast_history;
CREATE POLICY "rls_tenant_update" ON public.forecast_history AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.forecast_history;
CREATE POLICY "rls_tenant_write" ON public.forecast_history AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_write_forecast_history" ON public.forecast_history;
CREATE POLICY "service_role_write_forecast_history" ON public.forecast_history AS PERMISSIVE FOR ALL TO public
  USING ((( SELECT ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text)) = 'service_role'::text))
  WITH CHECK ((( SELECT ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text)) = 'service_role'::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.google_reviews;
CREATE POLICY "Allow authenticated" ON public.google_reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "hr_ai_interviews_access" ON public.hr_ai_interviews;
CREATE POLICY "hr_ai_interviews_access" ON public.hr_ai_interviews AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_ai_interviews;
CREATE POLICY "rls_service_all" ON public.hr_ai_interviews AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_ai_interviews;
CREATE POLICY "rls_tenant_read" ON public.hr_ai_interviews AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_announcements;
CREATE POLICY "Authenticated access" ON public.hr_announcements AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "hr_asset_read" ON public.hr_asset_assignments;
CREATE POLICY "hr_asset_read" ON public.hr_asset_assignments AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "hr_asset_sr" ON public.hr_asset_assignments;
CREATE POLICY "hr_asset_sr" ON public.hr_asset_assignments AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_attendance;
CREATE POLICY "Authenticated access" ON public.hr_attendance AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_attendance_rules_all" ON public.hr_attendance_rules;
CREATE POLICY "tenant_attendance_rules_all" ON public.hr_attendance_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_audit_logs;
CREATE POLICY "Authenticated access" ON public.hr_audit_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_auto_decisions;
CREATE POLICY "rls_service_all" ON public.hr_auto_decisions AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_auto_decisions;
CREATE POLICY "rls_tenant_read" ON public.hr_auto_decisions AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_auto_mode_config;
CREATE POLICY "rls_service_all" ON public.hr_auto_mode_config AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_auto_mode_config;
CREATE POLICY "rls_tenant_read" ON public.hr_auto_mode_config AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.hr_auto_mode_config;
CREATE POLICY "rls_tenant_update" ON public.hr_auto_mode_config AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text))
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_candidates;
CREATE POLICY "Tenant isolation" ON public.hr_candidates AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_candidates;
CREATE POLICY "rls_service_all" ON public.hr_candidates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.hr_candidates;
CREATE POLICY "rls_tenant_delete" ON public.hr_candidates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_candidates;
CREATE POLICY "rls_tenant_read" ON public.hr_candidates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.hr_candidates;
CREATE POLICY "rls_tenant_update" ON public.hr_candidates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.hr_candidates;
CREATE POLICY "rls_tenant_write" ON public.hr_candidates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_conversations;
CREATE POLICY "Allow authenticated" ON public.hr_conversations AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_departments;
CREATE POLICY "Authenticated access" ON public.hr_departments AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "hr_doc_ack_all" ON public.hr_document_acknowledgments;
CREATE POLICY "hr_doc_ack_all" ON public.hr_document_acknowledgments AS PERMISSIVE FOR ALL TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_document_templates;
CREATE POLICY "Allow authenticated" ON public.hr_document_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_documents;
CREATE POLICY "Authenticated access" ON public.hr_documents AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_employee_documents;
CREATE POLICY "Allow authenticated" ON public.hr_employee_documents AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_employee_shifts;
CREATE POLICY "Tenant isolation" ON public.hr_employee_shifts AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_employees;
CREATE POLICY "Tenant isolation" ON public.hr_employees AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_expense_claims;
CREATE POLICY "Authenticated access" ON public.hr_expense_claims AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_goals;
CREATE POLICY "Authenticated access" ON public.hr_goals AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_goals;
CREATE POLICY "Tenant isolation" ON public.hr_goals AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "hr_interview_schedules_access" ON public.hr_interview_schedules;
CREATE POLICY "hr_interview_schedules_access" ON public.hr_interview_schedules AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_job_applications;
CREATE POLICY "rls_service_all" ON public.hr_job_applications AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.hr_job_applications;
CREATE POLICY "rls_tenant_delete" ON public.hr_job_applications AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_job_applications;
CREATE POLICY "rls_tenant_read" ON public.hr_job_applications AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.hr_job_applications;
CREATE POLICY "rls_tenant_update" ON public.hr_job_applications AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.hr_job_applications;
CREATE POLICY "rls_tenant_write" ON public.hr_job_applications AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_job_requisitions;
CREATE POLICY "rls_service_all" ON public.hr_job_requisitions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.hr_job_requisitions;
CREATE POLICY "rls_tenant_delete" ON public.hr_job_requisitions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_job_requisitions;
CREATE POLICY "rls_tenant_read" ON public.hr_job_requisitions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.hr_job_requisitions;
CREATE POLICY "rls_tenant_update" ON public.hr_job_requisitions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.hr_job_requisitions;
CREATE POLICY "rls_tenant_write" ON public.hr_job_requisitions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_leave_balances;
CREATE POLICY "Authenticated access" ON public.hr_leave_balances AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_leave_requests;
CREATE POLICY "Authenticated access" ON public.hr_leave_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_leave_types;
CREATE POLICY "Tenant isolation" ON public.hr_leave_types AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "Recipient can read own notifications" ON public.hr_notifications;
CREATE POLICY "Recipient can read own notifications" ON public.hr_notifications AS PERMISSIVE FOR SELECT TO public
  USING ((recipient_id = auth.uid()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_notifications;
CREATE POLICY "Tenant isolation" ON public.hr_notifications AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_payroll_periods;
CREATE POLICY "Allow authenticated" ON public.hr_payroll_periods AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_performance_cycles;
CREATE POLICY "Allow authenticated" ON public.hr_performance_cycles AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_performance_reviews;
CREATE POLICY "Authenticated access" ON public.hr_performance_reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_policy_acknowledgments;
CREATE POLICY "Allow authenticated" ON public.hr_policy_acknowledgments AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_public_holidays;
CREATE POLICY "Tenant isolation" ON public.hr_public_holidays AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "hr_recruitment_outreach_access" ON public.hr_recruitment_outreach;
CREATE POLICY "hr_recruitment_outreach_access" ON public.hr_recruitment_outreach AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.hr_shifts;
CREATE POLICY "Tenant isolation" ON public.hr_shifts AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_sourcing_runs;
CREATE POLICY "rls_service_all" ON public.hr_sourcing_runs AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.hr_sourcing_runs;
CREATE POLICY "rls_tenant_delete" ON public.hr_sourcing_runs AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.hr_sourcing_runs;
CREATE POLICY "rls_tenant_read" ON public.hr_sourcing_runs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.hr_sourcing_runs;
CREATE POLICY "rls_tenant_update" ON public.hr_sourcing_runs AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.hr_sourcing_runs;
CREATE POLICY "rls_tenant_write" ON public.hr_sourcing_runs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_survey_responses;
CREATE POLICY "Allow authenticated" ON public.hr_survey_responses AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_training_programs;
CREATE POLICY "Authenticated access" ON public.hr_training_programs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_training_records;
CREATE POLICY "Authenticated access" ON public.hr_training_records AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.inbound_messages;
CREATE POLICY "Allow authenticated" ON public.inbound_messages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rl_read" ON public.inbox_rotation_log;
CREATE POLICY "rl_read" ON public.inbox_rotation_log AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "rl_write" ON public.inbox_rotation_log;
CREATE POLICY "rl_write" ON public.inbox_rotation_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Public read" ON public.industry_campaign_templates;
CREATE POLICY "Public read" ON public.industry_campaign_templates AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "Public read" ON public.industry_lead_scoring;
CREATE POLICY "Public read" ON public.industry_lead_scoring AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.industry_templates;
CREATE POLICY "rls_auth_read" ON public.industry_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.industry_templates;
CREATE POLICY "rls_service_all" ON public.industry_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Public read" ON public.industry_vip_criteria;
CREATE POLICY "Public read" ON public.industry_vip_criteria AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS "tenant_isolation_modify" ON public.influencer_campaign_members;
CREATE POLICY "tenant_isolation_modify" ON public.influencer_campaign_members AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.influencer_campaign_members;
CREATE POLICY "tenant_isolation_select" ON public.influencer_campaign_members AS PERMISSIVE FOR SELECT TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_modify" ON public.influencer_campaigns;
CREATE POLICY "tenant_isolation_modify" ON public.influencer_campaigns AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.influencer_campaigns;
CREATE POLICY "tenant_isolation_select" ON public.influencer_campaigns AS PERMISSIVE FOR SELECT TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_modify" ON public.influencer_outreach_log;
CREATE POLICY "tenant_isolation_modify" ON public.influencer_outreach_log AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.influencer_outreach_log;
CREATE POLICY "tenant_isolation_select" ON public.influencer_outreach_log AS PERMISSIVE FOR SELECT TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_modify" ON public.influencers;
CREATE POLICY "tenant_isolation_modify" ON public.influencers AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.influencers;
CREATE POLICY "tenant_isolation_select" ON public.influencers AS PERMISSIVE FOR SELECT TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant'::text, true)));
DROP POLICY IF EXISTS "rls_service_only" ON public.insights_by_period;
CREATE POLICY "rls_service_only" ON public.insights_by_period AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.insights_metadata;
CREATE POLICY "rls_service_only" ON public.insights_metadata AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.insights_raw;
CREATE POLICY "rls_service_only" ON public.insights_raw AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "allow_all" ON public.instrument_registry;
CREATE POLICY "allow_all" ON public.instrument_registry AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_read_insurance_claims" ON public.insurance_claims;
CREATE POLICY "allow_read_insurance_claims" ON public.insurance_claims AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_insurance_claims" ON public.insurance_claims;
CREATE POLICY "allow_write_insurance_claims" ON public.insurance_claims AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Users can insert own integration logs" ON public.integration_logs;
CREATE POLICY "Users can insert own integration logs" ON public.integration_logs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id IN ( SELECT tc.tenant_id
   FROM (tenant_config tc
     JOIN team_members tm ON ((tm.org_id = tc.id)))
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))));
DROP POLICY IF EXISTS "Users can view own integration logs" ON public.integration_logs;
CREATE POLICY "Users can view own integration logs" ON public.integration_logs AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT tc.tenant_id
   FROM (tenant_config tc
     JOIN team_members tm ON ((tm.org_id = tc.id)))
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))));
DROP POLICY IF EXISTS "Users can view own usage" ON public.integration_usage;
CREATE POLICY "Users can view own usage" ON public.integration_usage AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT tc.tenant_id
   FROM (tenant_config tc
     JOIN team_members tm ON ((tm.org_id = tc.id)))
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text)))));
DROP POLICY IF EXISTS "Allow authenticated" ON public.internal_notes;
CREATE POLICY "Allow authenticated" ON public.internal_notes AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.inventory_items;
CREATE POLICY "Allow authenticated" ON public.inventory_items AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.inventory_stock;
CREATE POLICY "Allow authenticated" ON public.inventory_stock AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated" ON public.inventory_transactions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "ivr_flows_tenant_isolation" ON public.ivr_flows;
CREATE POLICY "ivr_flows_tenant_isolation" ON public.ivr_flows AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid())))));
DROP POLICY IF EXISTS "rls_auth_read" ON public.ivr_templates;
CREATE POLICY "rls_auth_read" ON public.ivr_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.ivr_templates;
CREATE POLICY "rls_service_all" ON public.ivr_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.journey_stages;
CREATE POLICY "Allow authenticated" ON public.journey_stages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Users can manage own tenant knowledge" ON public.knowledge_base;
CREATE POLICY "Users can manage own tenant knowledge" ON public.knowledge_base AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_all" ON public.knowledge_base;
CREATE POLICY "rls_service_all" ON public.knowledge_base AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.knowledge_base;
CREATE POLICY "rls_tenant_delete" ON public.knowledge_base AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.knowledge_base;
CREATE POLICY "rls_tenant_read" ON public.knowledge_base AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.knowledge_base;
CREATE POLICY "rls_tenant_update" ON public.knowledge_base AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.knowledge_base;
CREATE POLICY "rls_tenant_write" ON public.knowledge_base AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "landing_page_submissions_all" ON public.landing_page_submissions;
CREATE POLICY "landing_page_submissions_all" ON public.landing_page_submissions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_landing_pages" ON public.landing_pages;
CREATE POLICY "auth_all_landing_pages" ON public.landing_pages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_landing_pages" ON public.landing_pages;
CREATE POLICY "svc_all_landing_pages" ON public.landing_pages AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "lead_ai_analysis_policy" ON public.lead_ai_analysis;
CREATE POLICY "lead_ai_analysis_policy" ON public.lead_ai_analysis AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Service role full access to lead_engagement_events" ON public.lead_engagement_events;
CREATE POLICY "Service role full access to lead_engagement_events" ON public.lead_engagement_events AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for lead_engagement_events" ON public.lead_engagement_events;
CREATE POLICY "Tenant isolation for lead_engagement_events" ON public.lead_engagement_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "lead_gen_credit_logs_policy" ON public.lead_gen_credit_logs;
CREATE POLICY "lead_gen_credit_logs_policy" ON public.lead_gen_credit_logs AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.lead_gen_credits;
CREATE POLICY "Tenant isolation" ON public.lead_gen_credits AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "rls_service_all" ON public.lead_gen_credits;
CREATE POLICY "rls_service_all" ON public.lead_gen_credits AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.lead_gen_credits;
CREATE POLICY "rls_tenant_delete" ON public.lead_gen_credits AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.lead_gen_credits;
CREATE POLICY "rls_tenant_read" ON public.lead_gen_credits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.lead_gen_credits;
CREATE POLICY "rls_tenant_update" ON public.lead_gen_credits AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.lead_gen_credits;
CREATE POLICY "rls_tenant_write" ON public.lead_gen_credits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.lead_gen_history;
CREATE POLICY "Tenant isolation" ON public.lead_gen_history AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "rls_service_all" ON public.lead_gen_history;
CREATE POLICY "rls_service_all" ON public.lead_gen_history AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.lead_gen_history;
CREATE POLICY "rls_tenant_delete" ON public.lead_gen_history AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.lead_gen_history;
CREATE POLICY "rls_tenant_read" ON public.lead_gen_history AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.lead_gen_history;
CREATE POLICY "rls_tenant_update" ON public.lead_gen_history AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.lead_gen_history;
CREATE POLICY "rls_tenant_write" ON public.lead_gen_history AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "lead_gen_saved_searches_policy" ON public.lead_gen_saved_searches;
CREATE POLICY "lead_gen_saved_searches_policy" ON public.lead_gen_saved_searches AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "lead_gen_search_logs_policy" ON public.lead_gen_search_logs;
CREATE POLICY "lead_gen_search_logs_policy" ON public.lead_gen_search_logs AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "lead_gen_searches_all" ON public.lead_gen_searches;
CREATE POLICY "lead_gen_searches_all" ON public.lead_gen_searches AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.lead_generation_jobs;
CREATE POLICY "Allow authenticated" ON public.lead_generation_jobs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.lead_interactions;
CREATE POLICY "Tenant isolation" ON public.lead_interactions AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "rls_service_all" ON public.lead_magnets;
CREATE POLICY "rls_service_all" ON public.lead_magnets AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.lead_magnets;
CREATE POLICY "rls_tenant_delete" ON public.lead_magnets AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.lead_magnets;
CREATE POLICY "rls_tenant_read" ON public.lead_magnets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.lead_magnets;
CREATE POLICY "rls_tenant_update" ON public.lead_magnets AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.lead_magnets;
CREATE POLICY "rls_tenant_write" ON public.lead_magnets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "notif_read" ON public.lead_notifications;
CREATE POLICY "notif_read" ON public.lead_notifications AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "notif_write" ON public.lead_notifications;
CREATE POLICY "notif_write" ON public.lead_notifications AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.lead_score_predictions;
CREATE POLICY "rls_service_all" ON public.lead_score_predictions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.lead_score_predictions;
CREATE POLICY "rls_tenant_delete" ON public.lead_score_predictions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.lead_score_predictions;
CREATE POLICY "rls_tenant_read" ON public.lead_score_predictions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.lead_score_predictions;
CREATE POLICY "rls_tenant_update" ON public.lead_score_predictions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.lead_score_predictions;
CREATE POLICY "rls_tenant_write" ON public.lead_score_predictions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.lead_scoring_models;
CREATE POLICY "rls_service_all" ON public.lead_scoring_models AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.lead_scoring_models;
CREATE POLICY "rls_tenant_delete" ON public.lead_scoring_models AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.lead_scoring_models;
CREATE POLICY "rls_tenant_read" ON public.lead_scoring_models AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.lead_scoring_models;
CREATE POLICY "rls_tenant_update" ON public.lead_scoring_models AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.lead_scoring_models;
CREATE POLICY "rls_tenant_write" ON public.lead_scoring_models AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ls_read" ON public.lead_signals;
CREATE POLICY "ls_read" ON public.lead_signals AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "ls_write" ON public.lead_signals;
CREATE POLICY "ls_write" ON public.lead_signals AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.leads;
CREATE POLICY "Allow authenticated" ON public.leads AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.leave_requests;
CREATE POLICY "Allow authenticated" ON public.leave_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.linkedin_outreach_queue;
CREATE POLICY "Allow authenticated" ON public.linkedin_outreach_queue AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.lovable_sync;
CREATE POLICY "Allow authenticated" ON public.lovable_sync AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "ltv_snapshots_service_role" ON public.ltv_cac_snapshots;
CREATE POLICY "ltv_snapshots_service_role" ON public.ltv_cac_snapshots AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.ltv_cac_snapshots;
CREATE POLICY "rls_service_all" ON public.ltv_cac_snapshots AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.ltv_cac_snapshots;
CREATE POLICY "rls_tenant_delete" ON public.ltv_cac_snapshots AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.ltv_cac_snapshots;
CREATE POLICY "rls_tenant_read" ON public.ltv_cac_snapshots AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.ltv_cac_snapshots;
CREATE POLICY "rls_tenant_update" ON public.ltv_cac_snapshots AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.ltv_cac_snapshots;
CREATE POLICY "rls_tenant_write" ON public.ltv_cac_snapshots AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.maintenance_contracts;
CREATE POLICY "allow_all" ON public.maintenance_contracts AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.manual_email_campaigns;
CREATE POLICY "rls_service_all" ON public.manual_email_campaigns AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.manual_email_campaigns;
CREATE POLICY "rls_tenant_delete" ON public.manual_email_campaigns AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.manual_email_campaigns;
CREATE POLICY "rls_tenant_read" ON public.manual_email_campaigns AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.manual_email_campaigns;
CREATE POLICY "rls_tenant_update" ON public.manual_email_campaigns AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.manual_email_campaigns;
CREATE POLICY "rls_tenant_write" ON public.manual_email_campaigns AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.manual_email_recipients;
CREATE POLICY "rls_service_all" ON public.manual_email_recipients AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.manual_email_recipients;
CREATE POLICY "rls_tenant_delete" ON public.manual_email_recipients AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.manual_email_recipients;
CREATE POLICY "rls_tenant_read" ON public.manual_email_recipients AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.manual_email_recipients;
CREATE POLICY "rls_tenant_update" ON public.manual_email_recipients AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.manual_email_recipients;
CREATE POLICY "rls_tenant_write" ON public.manual_email_recipients AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.market_signals;
CREATE POLICY "Tenant isolation" ON public.market_signals AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_agencies;
CREATE POLICY "Allow authenticated" ON public.marketing_agencies AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.marketing_ai_activity;
CREATE POLICY "rls_service_all" ON public.marketing_ai_activity AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.marketing_ai_activity;
CREATE POLICY "rls_tenant_delete" ON public.marketing_ai_activity AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.marketing_ai_activity;
CREATE POLICY "rls_tenant_read" ON public.marketing_ai_activity AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.marketing_ai_activity;
CREATE POLICY "rls_tenant_update" ON public.marketing_ai_activity AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.marketing_ai_activity;
CREATE POLICY "rls_tenant_write" ON public.marketing_ai_activity AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_analytics;
CREATE POLICY "Allow authenticated" ON public.marketing_analytics AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_api_usage;
CREATE POLICY "Allow authenticated" ON public.marketing_api_usage AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_marketing_calendar" ON public.marketing_calendar;
CREATE POLICY "auth_all_marketing_calendar" ON public.marketing_calendar AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_marketing_calendar" ON public.marketing_calendar;
CREATE POLICY "svc_all_marketing_calendar" ON public.marketing_calendar AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.marketing_campaigns;
CREATE POLICY "rls_service_all" ON public.marketing_campaigns AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.marketing_campaigns;
CREATE POLICY "rls_tenant_delete" ON public.marketing_campaigns AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.marketing_campaigns;
CREATE POLICY "rls_tenant_read" ON public.marketing_campaigns AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.marketing_campaigns;
CREATE POLICY "rls_tenant_update" ON public.marketing_campaigns AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.marketing_campaigns;
CREATE POLICY "rls_tenant_write" ON public.marketing_campaigns AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "marketing_consent_all" ON public.marketing_consent;
CREATE POLICY "marketing_consent_all" ON public.marketing_consent AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.marketing_content;
CREATE POLICY "rls_service_all" ON public.marketing_content AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.marketing_content;
CREATE POLICY "rls_tenant_delete" ON public.marketing_content AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.marketing_content;
CREATE POLICY "rls_tenant_read" ON public.marketing_content AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.marketing_content;
CREATE POLICY "rls_tenant_update" ON public.marketing_content AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.marketing_content;
CREATE POLICY "rls_tenant_write" ON public.marketing_content AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "allow_all_mar" ON public.marketing_performance_log;
CREATE POLICY "allow_all_mar" ON public.marketing_performance_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_personas;
CREATE POLICY "Allow authenticated" ON public.marketing_personas AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.marketing_playbooks;
CREATE POLICY "rls_auth_read" ON public.marketing_playbooks AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.marketing_playbooks;
CREATE POLICY "rls_service_all" ON public.marketing_playbooks AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "mkt_predictions_access" ON public.marketing_predictions;
CREATE POLICY "mkt_predictions_access" ON public.marketing_predictions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "mkt_predictions_service" ON public.marketing_predictions;
CREATE POLICY "mkt_predictions_service" ON public.marketing_predictions AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_sequence_enrollments;
CREATE POLICY "Allow authenticated" ON public.marketing_sequence_enrollments AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_sequence_steps;
CREATE POLICY "Allow authenticated" ON public.marketing_sequence_steps AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.marketing_sequence_templates;
CREATE POLICY "rls_auth_all" ON public.marketing_sequence_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.marketing_sequence_templates;
CREATE POLICY "rls_service_all" ON public.marketing_sequence_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.marketing_sequences;
CREATE POLICY "rls_service_all" ON public.marketing_sequences AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.marketing_sequences;
CREATE POLICY "rls_tenant_delete" ON public.marketing_sequences AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.marketing_sequences;
CREATE POLICY "rls_tenant_read" ON public.marketing_sequences AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.marketing_sequences;
CREATE POLICY "rls_tenant_update" ON public.marketing_sequences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.marketing_sequences;
CREATE POLICY "rls_tenant_write" ON public.marketing_sequences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_touchpoints;
CREATE POLICY "Allow authenticated" ON public.marketing_touchpoints AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Service role only" ON public.master_api_keys;
CREATE POLICY "Service role only" ON public.master_api_keys AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.media_library;
CREATE POLICY "Allow authenticated" ON public.media_library AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.media_mentions;
CREATE POLICY "Allow authenticated" ON public.media_mentions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.media_sources;
CREATE POLICY "Allow authenticated" ON public.media_sources AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.meeting_links;
CREATE POLICY "rls_service_all" ON public.meeting_links AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.meeting_links;
CREATE POLICY "rls_tenant_delete" ON public.meeting_links AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.meeting_links;
CREATE POLICY "rls_tenant_read" ON public.meeting_links AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.meeting_links;
CREATE POLICY "rls_tenant_update" ON public.meeting_links AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.meeting_links;
CREATE POLICY "rls_tenant_write" ON public.meeting_links AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.message_queue;
CREATE POLICY "Tenant isolation" ON public.message_queue AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "allow_all_message_sentiment" ON public.message_sentiment;
CREATE POLICY "allow_all_message_sentiment" ON public.message_sentiment AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.message_templates;
CREATE POLICY "Allow authenticated" ON public.message_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_messages_insert" ON public.messages;
CREATE POLICY "allow_all_messages_insert" ON public.messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_messages_read" ON public.messages;
CREATE POLICY "allow_all_messages_read" ON public.messages AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_all_messages_update" ON public.messages;
CREATE POLICY "allow_all_messages_update" ON public.messages AS PERMISSIVE FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.messages;
CREATE POLICY "rls_service_all" ON public.messages AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.messages;
CREATE POLICY "rls_tenant_delete" ON public.messages AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.messages;
CREATE POLICY "rls_tenant_read" ON public.messages AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.messages;
CREATE POLICY "rls_tenant_update" ON public.messages AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.messages;
CREATE POLICY "rls_tenant_write" ON public.messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_only" ON public.migrations;
CREATE POLICY "rls_service_only" ON public.migrations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "mco_all" ON public.multichannel_outreach;
CREATE POLICY "mco_all" ON public.multichannel_outreach AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.n8n_chat_histories;
CREATE POLICY "Allow authenticated" ON public.n8n_chat_histories AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.notifications;
CREATE POLICY "Allow authenticated" ON public.notifications AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "nps_surveys_tenant_isolation" ON public.nps_surveys;
CREATE POLICY "nps_surveys_tenant_isolation" ON public.nps_surveys AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "rls_service_only" ON public.oauth_clients;
CREATE POLICY "rls_service_only" ON public.oauth_clients AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.oauth_state_nonces;
CREATE POLICY "rls_service_all" ON public.oauth_state_nonces AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "allow_all_omega_alerts" ON public.omega_alerts;
CREATE POLICY "allow_all_omega_alerts" ON public.omega_alerts AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_omega_approval_queue" ON public.omega_approval_queue;
CREATE POLICY "allow_all_omega_approval_queue" ON public.omega_approval_queue AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_omega_campaigns" ON public.omega_campaigns;
CREATE POLICY "allow_all_omega_campaigns" ON public.omega_campaigns AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_omega_feedback" ON public.omega_feedback;
CREATE POLICY "allow_all_omega_feedback" ON public.omega_feedback AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "oal_allow_all" ON public.onboarding_audit_log;
CREATE POLICY "oal_allow_all" ON public.onboarding_audit_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.onboarding_checklists;
CREATE POLICY "Authenticated access" ON public.onboarding_checklists AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "oms_allow_read" ON public.onboarding_module_status;
CREATE POLICY "oms_allow_read" ON public.onboarding_module_status AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "oms_allow_write" ON public.onboarding_module_status;
CREATE POLICY "oms_allow_write" ON public.onboarding_module_status AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "orq_allow_all" ON public.onboarding_retry_queue;
CREATE POLICY "orq_allow_all" ON public.onboarding_retry_queue AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Users can insert own tenant sessions" ON public.onboarding_sessions;
CREATE POLICY "Users can insert own tenant sessions" ON public.onboarding_sessions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))) OR (user_id = auth.uid())));
DROP POLICY IF EXISTS "Users can update own tenant sessions" ON public.onboarding_sessions;
CREATE POLICY "Users can update own tenant sessions" ON public.onboarding_sessions AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));
DROP POLICY IF EXISTS "Users can view own tenant sessions" ON public.onboarding_sessions;
CREATE POLICY "Users can view own tenant sessions" ON public.onboarding_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));
DROP POLICY IF EXISTS "allow_all" ON public.ops_agent_memory;
CREATE POLICY "allow_all" ON public.ops_agent_memory AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_agent_performance;
CREATE POLICY "allow_all" ON public.ops_agent_performance AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_agent_tasks;
CREATE POLICY "allow_all" ON public.ops_agent_tasks AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_budget_actuals;
CREATE POLICY "allow_all" ON public.ops_budget_actuals AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_budgets;
CREATE POLICY "allow_all" ON public.ops_budgets AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_compliance_log;
CREATE POLICY "allow_all" ON public.ops_compliance_log AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_ops_compliance_rules" ON public.ops_compliance_rules;
CREATE POLICY "allow_all_ops_compliance_rules" ON public.ops_compliance_rules AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_cost_savings;
CREATE POLICY "allow_all" ON public.ops_cost_savings AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_demand_forecasts;
CREATE POLICY "allow_all" ON public.ops_demand_forecasts AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_industry_benchmarks;
CREATE POLICY "allow_all" ON public.ops_industry_benchmarks AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_industry_configs;
CREATE POLICY "allow_all" ON public.ops_industry_configs AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_inventory_items;
CREATE POLICY "allow_all" ON public.ops_inventory_items AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_inventory_movements;
CREATE POLICY "allow_all" ON public.ops_inventory_movements AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_po_line_items;
CREATE POLICY "allow_all" ON public.ops_po_line_items AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_production_plans;
CREATE POLICY "allow_all" ON public.ops_production_plans AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_production_tasks;
CREATE POLICY "allow_all" ON public.ops_production_tasks AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_purchase_orders;
CREATE POLICY "allow_all" ON public.ops_purchase_orders AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_qc_checkpoints;
CREATE POLICY "allow_all" ON public.ops_qc_checkpoints AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_qc_results;
CREATE POLICY "allow_all" ON public.ops_qc_results AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_ops_quality_alerts" ON public.ops_quality_alerts;
CREATE POLICY "allow_all_ops_quality_alerts" ON public.ops_quality_alerts AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_ops_quality_checks" ON public.ops_quality_checks;
CREATE POLICY "allow_all_ops_quality_checks" ON public.ops_quality_checks AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_region_configs;
CREATE POLICY "allow_all" ON public.ops_region_configs AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_shipment_events;
CREATE POLICY "allow_all" ON public.ops_shipment_events AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_shipments;
CREATE POLICY "allow_all" ON public.ops_shipments AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_simulations;
CREATE POLICY "allow_all" ON public.ops_simulations AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_slas;
CREATE POLICY "allow_all" ON public.ops_slas AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_templates;
CREATE POLICY "allow_all" ON public.ops_templates AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_vendor_performance;
CREATE POLICY "allow_all" ON public.ops_vendor_performance AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.ops_vendors;
CREATE POLICY "allow_all" ON public.ops_vendors AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "opt_reports_delete" ON public.optimization_reports;
CREATE POLICY "opt_reports_delete" ON public.optimization_reports AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "opt_reports_insert" ON public.optimization_reports;
CREATE POLICY "opt_reports_insert" ON public.optimization_reports AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "opt_reports_select" ON public.optimization_reports;
CREATE POLICY "opt_reports_select" ON public.optimization_reports AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "opt_reports_service" ON public.optimization_reports;
CREATE POLICY "opt_reports_service" ON public.optimization_reports AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "opt_reports_update" ON public.optimization_reports;
CREATE POLICY "opt_reports_update" ON public.optimization_reports AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "allow_all_access" ON public.orchestrator_events;
CREATE POLICY "allow_all_access" ON public.orchestrator_events AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.orchestrator_logs;
CREATE POLICY "rls_service_all" ON public.orchestrator_logs AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.orchestrator_logs;
CREATE POLICY "rls_tenant_delete" ON public.orchestrator_logs AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.orchestrator_logs;
CREATE POLICY "rls_tenant_read" ON public.orchestrator_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.orchestrator_logs;
CREATE POLICY "rls_tenant_update" ON public.orchestrator_logs AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.orchestrator_logs;
CREATE POLICY "rls_tenant_write" ON public.orchestrator_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.organizations;
CREATE POLICY "Allow authenticated" ON public.organizations AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.outbound_messages;
CREATE POLICY "Tenant isolation" ON public.outbound_messages AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "Allow authenticated" ON public.package_items;
CREATE POLICY "Allow authenticated" ON public.package_items AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.packages;
CREATE POLICY "Allow authenticated" ON public.packages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_insert_pa" ON public.page_analytics;
CREATE POLICY "anon_insert_pa" ON public.page_analytics AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_page_analytics" ON public.page_analytics;
CREATE POLICY "auth_all_page_analytics" ON public.page_analytics AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_page_analytics" ON public.page_analytics;
CREATE POLICY "svc_all_page_analytics" ON public.page_analytics AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_pt" ON public.page_templates;
CREATE POLICY "anon_read_pt" ON public.page_templates AS PERMISSIVE FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS "auth_all_page_templates" ON public.page_templates;
CREATE POLICY "auth_all_page_templates" ON public.page_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_page_templates" ON public.page_templates;
CREATE POLICY "svc_all_page_templates" ON public.page_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation" ON public.patient_testimonials;
CREATE POLICY "tenant_isolation" ON public.patient_testimonials AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (((auth.jwt() ->> 'user_metadata'::text))::jsonb ->> 'tenant_id'::text))));
DROP POLICY IF EXISTS "Allow authenticated" ON public.patient_visits;
CREATE POLICY "Allow authenticated" ON public.patient_visits AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.patient_vitals;
CREATE POLICY "Allow authenticated" ON public.patient_vitals AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated access" ON public.pending_actions;
CREATE POLICY "Authenticated access" ON public.pending_actions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_pending_actions" ON public.pending_actions;
CREATE POLICY "allow_all_pending_actions" ON public.pending_actions AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.permissions;
CREATE POLICY "rls_auth_read" ON public.permissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.permissions;
CREATE POLICY "rls_service_all" ON public.permissions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.predictive_scores;
CREATE POLICY "Allow authenticated" ON public.predictive_scores AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_pp" ON public.premium_pages;
CREATE POLICY "anon_read_pp" ON public.premium_pages AS PERMISSIVE FOR SELECT TO anon
  USING ((status = 'published'::text));
DROP POLICY IF EXISTS "auth_all_premium_pages" ON public.premium_pages;
CREATE POLICY "auth_all_premium_pages" ON public.premium_pages AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_premium_pages" ON public.premium_pages;
CREATE POLICY "svc_all_premium_pages" ON public.premium_pages AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.pricing_analytics;
CREATE POLICY "Allow authenticated" ON public.pricing_analytics AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.pricing_logs;
CREATE POLICY "Allow authenticated" ON public.pricing_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.pricing_rules;
CREATE POLICY "Allow authenticated" ON public.pricing_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.profiles;
CREATE POLICY "Allow authenticated" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.project;
CREATE POLICY "rls_service_only" ON public.project AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.project_relation;
CREATE POLICY "rls_service_only" ON public.project_relation AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.proposals;
CREATE POLICY "Tenant isolation" ON public.proposals AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "rls_service_all" ON public.proposals;
CREATE POLICY "rls_service_all" ON public.proposals AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.proposals;
CREATE POLICY "rls_tenant_delete" ON public.proposals AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.proposals;
CREATE POLICY "rls_tenant_read" ON public.proposals AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.proposals;
CREATE POLICY "rls_tenant_update" ON public.proposals AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.proposals;
CREATE POLICY "rls_tenant_write" ON public.proposals AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.providers;
CREATE POLICY "Allow authenticated" ON public.providers AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.rate_limits;
CREATE POLICY "Allow authenticated" ON public.rate_limits AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_api_keys;
CREATE POLICY "rls_service_all" ON public.re_api_keys AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_api_keys;
CREATE POLICY "rls_tenant_insert" ON public.re_api_keys AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_api_keys;
CREATE POLICY "rls_tenant_read" ON public.re_api_keys AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_api_keys;
CREATE POLICY "rls_tenant_update" ON public.re_api_keys AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_automation_log;
CREATE POLICY "rls_service_all" ON public.re_automation_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_automation_log;
CREATE POLICY "rls_tenant_delete" ON public.re_automation_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_automation_log;
CREATE POLICY "rls_tenant_read" ON public.re_automation_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_automation_log;
CREATE POLICY "rls_tenant_update" ON public.re_automation_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_automation_log;
CREATE POLICY "rls_tenant_write" ON public.re_automation_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "service_role_bypass" ON public.re_automation_log;
CREATE POLICY "service_role_bypass" ON public.re_automation_log AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.re_clients;
CREATE POLICY "Service role bypass" ON public.re_clients AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_clients;
CREATE POLICY "rls_service_all" ON public.re_clients AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_clients;
CREATE POLICY "rls_tenant_delete" ON public.re_clients AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_clients;
CREATE POLICY "rls_tenant_read" ON public.re_clients AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_clients;
CREATE POLICY "rls_tenant_update" ON public.re_clients AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_clients;
CREATE POLICY "rls_tenant_write" ON public.re_clients AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_commissions;
CREATE POLICY "rls_service_all" ON public.re_commissions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_commissions;
CREATE POLICY "rls_tenant_read" ON public.re_commissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_commissions;
CREATE POLICY "rls_tenant_write" ON public.re_commissions AS PERMISSIVE FOR ALL TO authenticated
  USING ((tenant_id = get_user_tenant_id()))
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_compliance_alerts;
CREATE POLICY "rls_service_all" ON public.re_compliance_alerts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_select" ON public.re_compliance_alerts;
CREATE POLICY "rls_tenant_select" ON public.re_compliance_alerts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_compliance_alerts;
CREATE POLICY "rls_tenant_update" ON public.re_compliance_alerts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_auth_read" ON public.re_cross_border_rules;
CREATE POLICY "rls_auth_read" ON public.re_cross_border_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_cross_border_rules;
CREATE POLICY "rls_service_all" ON public.re_cross_border_rules AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_deal_orchestrations;
CREATE POLICY "rls_service_all" ON public.re_deal_orchestrations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_deal_orchestrations;
CREATE POLICY "rls_tenant_insert" ON public.re_deal_orchestrations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_deal_orchestrations;
CREATE POLICY "rls_tenant_read" ON public.re_deal_orchestrations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_deal_orchestrations;
CREATE POLICY "rls_tenant_update" ON public.re_deal_orchestrations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Service role bypass" ON public.re_deals;
CREATE POLICY "Service role bypass" ON public.re_deals AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_deals;
CREATE POLICY "rls_service_all" ON public.re_deals AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_deals;
CREATE POLICY "rls_tenant_delete" ON public.re_deals AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_deals;
CREATE POLICY "rls_tenant_read" ON public.re_deals AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_deals;
CREATE POLICY "rls_tenant_update" ON public.re_deals AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_deals;
CREATE POLICY "rls_tenant_write" ON public.re_deals AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Service role bypass" ON public.re_documents;
CREATE POLICY "Service role bypass" ON public.re_documents AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_documents;
CREATE POLICY "rls_service_all" ON public.re_documents AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_documents;
CREATE POLICY "rls_tenant_delete" ON public.re_documents AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_documents;
CREATE POLICY "rls_tenant_read" ON public.re_documents AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_documents;
CREATE POLICY "rls_tenant_update" ON public.re_documents AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_documents;
CREATE POLICY "rls_tenant_write" ON public.re_documents AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Service role bypass" ON public.re_eoi;
CREATE POLICY "Service role bypass" ON public.re_eoi AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_eoi;
CREATE POLICY "rls_service_all" ON public.re_eoi AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_eoi;
CREATE POLICY "rls_tenant_delete" ON public.re_eoi AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_eoi;
CREATE POLICY "rls_tenant_read" ON public.re_eoi AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_eoi;
CREATE POLICY "rls_tenant_update" ON public.re_eoi AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_eoi;
CREATE POLICY "rls_tenant_write" ON public.re_eoi AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_investment_portfolio;
CREATE POLICY "rls_service_all" ON public.re_investment_portfolio AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_investment_portfolio;
CREATE POLICY "rls_tenant_insert" ON public.re_investment_portfolio AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_investment_portfolio;
CREATE POLICY "rls_tenant_read" ON public.re_investment_portfolio AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_investment_portfolio;
CREATE POLICY "rls_tenant_update" ON public.re_investment_portfolio AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_investment_routes;
CREATE POLICY "rls_service_all" ON public.re_investment_routes AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_investment_routes;
CREATE POLICY "rls_tenant_read" ON public.re_investment_routes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_investment_routes;
CREATE POLICY "rls_tenant_write" ON public.re_investment_routes AS PERMISSIVE FOR ALL TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text))
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_lead_scores;
CREATE POLICY "rls_service_all" ON public.re_lead_scores AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_lead_scores;
CREATE POLICY "rls_tenant_insert" ON public.re_lead_scores AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_lead_scores;
CREATE POLICY "rls_tenant_read" ON public.re_lead_scores AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_lead_scores;
CREATE POLICY "rls_tenant_update" ON public.re_lead_scores AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Service role bypass" ON public.re_listings;
CREATE POLICY "Service role bypass" ON public.re_listings AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_listings;
CREATE POLICY "rls_service_all" ON public.re_listings AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_listings;
CREATE POLICY "rls_tenant_delete" ON public.re_listings AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_listings;
CREATE POLICY "rls_tenant_read" ON public.re_listings AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_listings;
CREATE POLICY "rls_tenant_update" ON public.re_listings AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_listings;
CREATE POLICY "rls_tenant_write" ON public.re_listings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Service role bypass" ON public.re_market_data;
CREATE POLICY "Service role bypass" ON public.re_market_data AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_market_data;
CREATE POLICY "rls_service_all" ON public.re_market_data AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_market_data;
CREATE POLICY "rls_tenant_delete" ON public.re_market_data AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_market_data;
CREATE POLICY "rls_tenant_read" ON public.re_market_data AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_market_data;
CREATE POLICY "rls_tenant_update" ON public.re_market_data AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_market_data;
CREATE POLICY "rls_tenant_write" ON public.re_market_data AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_market_forecasts;
CREATE POLICY "rls_service_all" ON public.re_market_forecasts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_market_forecasts;
CREATE POLICY "rls_tenant_insert" ON public.re_market_forecasts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_market_forecasts;
CREATE POLICY "rls_tenant_read" ON public.re_market_forecasts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_market_forecasts;
CREATE POLICY "rls_tenant_update" ON public.re_market_forecasts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_matches;
CREATE POLICY "rls_service_all" ON public.re_matches AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_matches;
CREATE POLICY "rls_tenant_insert" ON public.re_matches AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_select" ON public.re_matches;
CREATE POLICY "rls_tenant_select" ON public.re_matches AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_matches;
CREATE POLICY "rls_tenant_update" ON public.re_matches AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_auth_read" ON public.re_mortgage_banks;
CREATE POLICY "rls_auth_read" ON public.re_mortgage_banks AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_mortgage_banks;
CREATE POLICY "rls_service_all" ON public.re_mortgage_banks AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_offplan_projects;
CREATE POLICY "rls_service_all" ON public.re_offplan_projects AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_offplan_projects;
CREATE POLICY "rls_tenant_insert" ON public.re_offplan_projects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_offplan_projects;
CREATE POLICY "rls_tenant_read" ON public.re_offplan_projects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_offplan_projects;
CREATE POLICY "rls_tenant_update" ON public.re_offplan_projects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_portal_credentials;
CREATE POLICY "rls_service_all" ON public.re_portal_credentials AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_portal_credentials;
CREATE POLICY "rls_tenant_read" ON public.re_portal_credentials AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_portal_credentials;
CREATE POLICY "rls_tenant_write" ON public.re_portal_credentials AS PERMISSIVE FOR ALL TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text))
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_portal_sync_log;
CREATE POLICY "rls_service_all" ON public.re_portal_sync_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_portal_sync_log;
CREATE POLICY "rls_tenant_delete" ON public.re_portal_sync_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_portal_sync_log;
CREATE POLICY "rls_tenant_read" ON public.re_portal_sync_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_portal_sync_log;
CREATE POLICY "rls_tenant_update" ON public.re_portal_sync_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_portal_sync_log;
CREATE POLICY "rls_tenant_write" ON public.re_portal_sync_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_price_predictions;
CREATE POLICY "rls_service_all" ON public.re_price_predictions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_price_predictions;
CREATE POLICY "rls_tenant_delete" ON public.re_price_predictions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_price_predictions;
CREATE POLICY "rls_tenant_read" ON public.re_price_predictions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_price_predictions;
CREATE POLICY "rls_tenant_update" ON public.re_price_predictions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_price_predictions;
CREATE POLICY "rls_tenant_write" ON public.re_price_predictions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_auth_read" ON public.re_region_config;
CREATE POLICY "rls_auth_read" ON public.re_region_config AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_region_config;
CREATE POLICY "rls_service_all" ON public.re_region_config AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.re_road_shows;
CREATE POLICY "Service role bypass" ON public.re_road_shows AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_road_shows;
CREATE POLICY "rls_service_all" ON public.re_road_shows AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_road_shows;
CREATE POLICY "rls_tenant_delete" ON public.re_road_shows AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_road_shows;
CREATE POLICY "rls_tenant_read" ON public.re_road_shows AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_road_shows;
CREATE POLICY "rls_tenant_update" ON public.re_road_shows AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_road_shows;
CREATE POLICY "rls_tenant_write" ON public.re_road_shows AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_auth_read" ON public.re_training_knowledge;
CREATE POLICY "rls_auth_read" ON public.re_training_knowledge AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.re_training_knowledge;
CREATE POLICY "rls_service_all" ON public.re_training_knowledge AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.re_viewings;
CREATE POLICY "Service role bypass" ON public.re_viewings AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_viewings;
CREATE POLICY "rls_service_all" ON public.re_viewings AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.re_viewings;
CREATE POLICY "rls_tenant_delete" ON public.re_viewings AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_viewings;
CREATE POLICY "rls_tenant_read" ON public.re_viewings AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_viewings;
CREATE POLICY "rls_tenant_update" ON public.re_viewings AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.re_viewings;
CREATE POLICY "rls_tenant_write" ON public.re_viewings AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.re_whatsapp_journeys;
CREATE POLICY "rls_service_all" ON public.re_whatsapp_journeys AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_insert" ON public.re_whatsapp_journeys;
CREATE POLICY "rls_tenant_insert" ON public.re_whatsapp_journeys AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.re_whatsapp_journeys;
CREATE POLICY "rls_tenant_read" ON public.re_whatsapp_journeys AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.re_whatsapp_journeys;
CREATE POLICY "rls_tenant_update" ON public.re_whatsapp_journeys AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.recruitment_campaigns;
CREATE POLICY "Allow authenticated" ON public.recruitment_campaigns AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.referrals;
CREATE POLICY "rls_service_all" ON public.referrals AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.referrals;
CREATE POLICY "rls_tenant_delete" ON public.referrals AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.referrals;
CREATE POLICY "rls_tenant_read" ON public.referrals AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.referrals;
CREATE POLICY "rls_tenant_update" ON public.referrals AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.referrals;
CREATE POLICY "rls_tenant_write" ON public.referrals AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.reminders;
CREATE POLICY "Allow authenticated" ON public.reminders AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.reply_events;
CREATE POLICY "rls_service_all" ON public.reply_events AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.reply_events;
CREATE POLICY "rls_tenant_delete" ON public.reply_events AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.reply_events;
CREATE POLICY "rls_tenant_read" ON public.reply_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.reply_events;
CREATE POLICY "rls_tenant_update" ON public.reply_events AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.reply_events;
CREATE POLICY "rls_tenant_write" ON public.reply_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.reply_routing_rules;
CREATE POLICY "rls_service_all" ON public.reply_routing_rules AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.reply_routing_rules;
CREATE POLICY "rls_tenant_delete" ON public.reply_routing_rules AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.reply_routing_rules;
CREATE POLICY "rls_tenant_read" ON public.reply_routing_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.reply_routing_rules;
CREATE POLICY "rls_tenant_update" ON public.reply_routing_rules AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.reply_routing_rules;
CREATE POLICY "rls_tenant_write" ON public.reply_routing_rules AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for restaurant_inventory" ON public.restaurant_inventory;
CREATE POLICY "Allow all for restaurant_inventory" ON public.restaurant_inventory AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for restaurant_kitchen_display" ON public.restaurant_kitchen_display;
CREATE POLICY "Allow all for restaurant_kitchen_display" ON public.restaurant_kitchen_display AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.restaurant_menus;
CREATE POLICY "rls_service_all" ON public.restaurant_menus AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.restaurant_menus;
CREATE POLICY "rls_tenant_delete" ON public.restaurant_menus AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.restaurant_menus;
CREATE POLICY "rls_tenant_read" ON public.restaurant_menus AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.restaurant_menus;
CREATE POLICY "rls_tenant_update" ON public.restaurant_menus AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.restaurant_menus;
CREATE POLICY "rls_tenant_write" ON public.restaurant_menus AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for restaurant_orders" ON public.restaurant_orders;
CREATE POLICY "Allow all for restaurant_orders" ON public.restaurant_orders AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.restaurant_reservations;
CREATE POLICY "rls_service_all" ON public.restaurant_reservations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.restaurant_reservations;
CREATE POLICY "rls_tenant_delete" ON public.restaurant_reservations AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.restaurant_reservations;
CREATE POLICY "rls_tenant_read" ON public.restaurant_reservations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.restaurant_reservations;
CREATE POLICY "rls_tenant_update" ON public.restaurant_reservations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.restaurant_reservations;
CREATE POLICY "rls_tenant_write" ON public.restaurant_reservations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.revenue_attribution;
CREATE POLICY "Allow authenticated" ON public.revenue_attribution AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_revenue_attribution" ON public.revenue_attribution;
CREATE POLICY "anon_read_revenue_attribution" ON public.revenue_attribution AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "service_role_write_revenue_attribution" ON public.revenue_attribution;
CREATE POLICY "service_role_write_revenue_attribution" ON public.revenue_attribution AS PERMISSIVE FOR ALL TO public
  USING ((( SELECT ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text)) = 'service_role'::text))
  WITH CHECK ((( SELECT ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text)) = 'service_role'::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.revenue_forecasts;
CREATE POLICY "Allow authenticated" ON public.revenue_forecasts AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.review_response_templates;
CREATE POLICY "Allow authenticated" ON public.review_response_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.reviews;
CREATE POLICY "Allow authenticated" ON public.reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.role;
CREATE POLICY "rls_service_only" ON public.role AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.role_permissions;
CREATE POLICY "rls_auth_read" ON public.role_permissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.role_permissions;
CREATE POLICY "rls_service_all" ON public.role_permissions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.role_scope;
CREATE POLICY "rls_service_only" ON public.role_scope AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.roles;
CREATE POLICY "rls_auth_read" ON public.roles AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.roles;
CREATE POLICY "rls_service_all" ON public.roles AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "sales_ab_assignments_tenant_isolation" ON public.sales_ab_assignments;
CREATE POLICY "sales_ab_assignments_tenant_isolation" ON public.sales_ab_assignments AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "service_role_bypass" ON public.sales_ab_assignments;
CREATE POLICY "service_role_bypass" ON public.sales_ab_assignments AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "tenant_isolation" ON public.sales_ab_assignments;
CREATE POLICY "tenant_isolation" ON public.sales_ab_assignments AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "sales_ab_tests_tenant_isolation" ON public.sales_ab_tests;
CREATE POLICY "sales_ab_tests_tenant_isolation" ON public.sales_ab_tests AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "service_role_bypass" ON public.sales_ab_tests;
CREATE POLICY "service_role_bypass" ON public.sales_ab_tests AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "tenant_isolation" ON public.sales_ab_tests;
CREATE POLICY "tenant_isolation" ON public.sales_ab_tests AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "sales_analytics_by_rep_tenant_isolation" ON public.sales_analytics_by_rep;
CREATE POLICY "sales_analytics_by_rep_tenant_isolation" ON public.sales_analytics_by_rep AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_analytics_daily;
CREATE POLICY "Allow authenticated" ON public.sales_analytics_daily AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "sales_assignment_rules_tenant_isolation" ON public.sales_assignment_rules;
CREATE POLICY "sales_assignment_rules_tenant_isolation" ON public.sales_assignment_rules AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "sales_assignments_tenant_isolation" ON public.sales_assignments;
CREATE POLICY "sales_assignments_tenant_isolation" ON public.sales_assignments AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "sales_availability_tenant_isolation" ON public.sales_availability;
CREATE POLICY "sales_availability_tenant_isolation" ON public.sales_availability AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "sales_calendar_events_tenant_isolation" ON public.sales_calendar_events;
CREATE POLICY "sales_calendar_events_tenant_isolation" ON public.sales_calendar_events AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "service_role_bypass" ON public.sales_calls;
CREATE POLICY "service_role_bypass" ON public.sales_calls AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "tenant_isolation" ON public.sales_calls;
CREATE POLICY "tenant_isolation" ON public.sales_calls AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "sales_communication_limits_tenant_isolation" ON public.sales_communication_limits;
CREATE POLICY "sales_communication_limits_tenant_isolation" ON public.sales_communication_limits AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "sales_compliance_log_tenant_isolation" ON public.sales_compliance_log;
CREATE POLICY "sales_compliance_log_tenant_isolation" ON public.sales_compliance_log AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "Tenant isolation for sales_consent_records" ON public.sales_consent_records;
CREATE POLICY "Tenant isolation for sales_consent_records" ON public.sales_consent_records AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "sales_consent_records_tenant_isolation" ON public.sales_consent_records;
CREATE POLICY "sales_consent_records_tenant_isolation" ON public.sales_consent_records AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "service_role_all_sales_consent_records" ON public.sales_consent_records;
CREATE POLICY "service_role_all_sales_consent_records" ON public.sales_consent_records AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for sales_conversations" ON public.sales_conversations;
CREATE POLICY "Tenant isolation for sales_conversations" ON public.sales_conversations AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "sales_conversations_policy" ON public.sales_conversations;
CREATE POLICY "sales_conversations_policy" ON public.sales_conversations AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "sales_conversations_tenant_isolation" ON public.sales_conversations;
CREATE POLICY "sales_conversations_tenant_isolation" ON public.sales_conversations AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "service_role_all_sales_conversations" ON public.sales_conversations;
CREATE POLICY "service_role_all_sales_conversations" ON public.sales_conversations AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_deals;
CREATE POLICY "Allow authenticated" ON public.sales_deals AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.sales_do_not_contact;
CREATE POLICY "Tenant isolation" ON public.sales_do_not_contact AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "sales_dnc_policy" ON public.sales_do_not_contact;
CREATE POLICY "sales_dnc_policy" ON public.sales_do_not_contact AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "sales_do_not_contact_tenant_isolation" ON public.sales_do_not_contact;
CREATE POLICY "sales_do_not_contact_tenant_isolation" ON public.sales_do_not_contact AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "service_role_all_sales_do_not_contact" ON public.sales_do_not_contact;
CREATE POLICY "service_role_all_sales_do_not_contact" ON public.sales_do_not_contact AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.sales_email_verification;
CREATE POLICY "Tenant isolation" ON public.sales_email_verification AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_emails;
CREATE POLICY "Allow authenticated" ON public.sales_emails AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_lead_assignments;
CREATE POLICY "Allow authenticated" ON public.sales_lead_assignments AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation" ON public.sales_leads;
CREATE POLICY "Tenant isolation" ON public.sales_leads AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "allow_all_bridge" ON public.sales_marketing_bridge;
CREATE POLICY "allow_all_bridge" ON public.sales_marketing_bridge AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.sales_marketing_bridge;
CREATE POLICY "rls_service_all" ON public.sales_marketing_bridge AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sales_marketing_bridge;
CREATE POLICY "rls_tenant_delete" ON public.sales_marketing_bridge AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sales_marketing_bridge;
CREATE POLICY "rls_tenant_read" ON public.sales_marketing_bridge AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sales_marketing_bridge;
CREATE POLICY "rls_tenant_update" ON public.sales_marketing_bridge AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sales_marketing_bridge;
CREATE POLICY "rls_tenant_write" ON public.sales_marketing_bridge AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.sales_phone_validation;
CREATE POLICY "rls_service_all" ON public.sales_phone_validation AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sales_phone_validation;
CREATE POLICY "rls_tenant_delete" ON public.sales_phone_validation AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sales_phone_validation;
CREATE POLICY "rls_tenant_read" ON public.sales_phone_validation AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sales_phone_validation;
CREATE POLICY "rls_tenant_update" ON public.sales_phone_validation AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sales_phone_validation;
CREATE POLICY "rls_tenant_write" ON public.sales_phone_validation AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "sales_referrals_tenant_isolation" ON public.sales_referrals;
CREATE POLICY "sales_referrals_tenant_isolation" ON public.sales_referrals AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "rls_service_all" ON public.sales_sequences;
CREATE POLICY "rls_service_all" ON public.sales_sequences AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sales_sequences;
CREATE POLICY "rls_tenant_delete" ON public.sales_sequences AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sales_sequences;
CREATE POLICY "rls_tenant_read" ON public.sales_sequences AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sales_sequences;
CREATE POLICY "rls_tenant_update" ON public.sales_sequences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sales_sequences;
CREATE POLICY "rls_tenant_write" ON public.sales_sequences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.sales_team_members;
CREATE POLICY "rls_service_all" ON public.sales_team_members AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sales_team_members;
CREATE POLICY "rls_tenant_delete" ON public.sales_team_members AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sales_team_members;
CREATE POLICY "rls_tenant_read" ON public.sales_team_members AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sales_team_members;
CREATE POLICY "rls_tenant_update" ON public.sales_team_members AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sales_team_members;
CREATE POLICY "rls_tenant_write" ON public.sales_team_members AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "sales_team_members_tenant_isolation" ON public.sales_team_members;
CREATE POLICY "sales_team_members_tenant_isolation" ON public.sales_team_members AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "sales_territories_tenant_isolation" ON public.sales_territories;
CREATE POLICY "sales_territories_tenant_isolation" ON public.sales_territories AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id = (current_setting('app.current_tenant'::text, true))::uuid));
DROP POLICY IF EXISTS "allow_all_scheduled_messages" ON public.scheduled_messages;
CREATE POLICY "allow_all_scheduled_messages" ON public.scheduled_messages AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.scope;
CREATE POLICY "rls_service_only" ON public.scope AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "allow_all" ON public.security_deposits;
CREATE POLICY "allow_all" ON public.security_deposits AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.send_time_preferences;
CREATE POLICY "rls_service_all" ON public.send_time_preferences AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.send_time_preferences;
CREATE POLICY "rls_tenant_delete" ON public.send_time_preferences AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.send_time_preferences;
CREATE POLICY "rls_tenant_read" ON public.send_time_preferences AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.send_time_preferences;
CREATE POLICY "rls_tenant_update" ON public.send_time_preferences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.send_time_preferences;
CREATE POLICY "rls_tenant_write" ON public.send_time_preferences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.sending_accounts;
CREATE POLICY "rls_service_all" ON public.sending_accounts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sending_accounts;
CREATE POLICY "rls_tenant_delete" ON public.sending_accounts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sending_accounts;
CREATE POLICY "rls_tenant_read" ON public.sending_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sending_accounts;
CREATE POLICY "rls_tenant_update" ON public.sending_accounts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sending_accounts;
CREATE POLICY "rls_tenant_write" ON public.sending_accounts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.seo_content_scores;
CREATE POLICY "rls_service_all" ON public.seo_content_scores AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.seo_content_scores;
CREATE POLICY "rls_tenant_delete" ON public.seo_content_scores AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.seo_content_scores;
CREATE POLICY "rls_tenant_read" ON public.seo_content_scores AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.seo_content_scores;
CREATE POLICY "rls_tenant_update" ON public.seo_content_scores AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.seo_content_scores;
CREATE POLICY "rls_tenant_write" ON public.seo_content_scores AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.seo_keyword_tracking;
CREATE POLICY "rls_service_all" ON public.seo_keyword_tracking AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.seo_keyword_tracking;
CREATE POLICY "rls_tenant_delete" ON public.seo_keyword_tracking AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.seo_keyword_tracking;
CREATE POLICY "rls_tenant_read" ON public.seo_keyword_tracking AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.seo_keyword_tracking;
CREATE POLICY "rls_tenant_update" ON public.seo_keyword_tracking AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.seo_keyword_tracking;
CREATE POLICY "rls_tenant_write" ON public.seo_keyword_tracking AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "sat_all" ON public.sequence_ab_tests;
CREATE POLICY "sat_all" ON public.sequence_ab_tests AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.sequence_enrollments;
CREATE POLICY "rls_service_all" ON public.sequence_enrollments AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sequence_enrollments;
CREATE POLICY "rls_tenant_delete" ON public.sequence_enrollments AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sequence_enrollments;
CREATE POLICY "rls_tenant_read" ON public.sequence_enrollments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sequence_enrollments;
CREATE POLICY "rls_tenant_update" ON public.sequence_enrollments AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sequence_enrollments;
CREATE POLICY "rls_tenant_write" ON public.sequence_enrollments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.sequence_step_history;
CREATE POLICY "rls_service_all" ON public.sequence_step_history AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sequence_step_history;
CREATE POLICY "rls_tenant_delete" ON public.sequence_step_history AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sequence_step_history;
CREATE POLICY "rls_tenant_read" ON public.sequence_step_history AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sequence_step_history;
CREATE POLICY "rls_tenant_update" ON public.sequence_step_history AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sequence_step_history;
CREATE POLICY "rls_tenant_write" ON public.sequence_step_history AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.sequence_templates;
CREATE POLICY "rls_service_all" ON public.sequence_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.sequence_templates;
CREATE POLICY "rls_tenant_delete" ON public.sequence_templates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.sequence_templates;
CREATE POLICY "rls_tenant_read" ON public.sequence_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.sequence_templates;
CREATE POLICY "rls_tenant_update" ON public.sequence_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.sequence_templates;
CREATE POLICY "rls_tenant_write" ON public.sequence_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.sequences;
CREATE POLICY "Tenant isolation" ON public.sequences AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id())));
DROP POLICY IF EXISTS "allow_all" ON public.service_visits;
CREATE POLICY "allow_all" ON public.service_visits AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.services;
CREATE POLICY "rls_service_all" ON public.services AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.services;
CREATE POLICY "rls_tenant_delete" ON public.services AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.services;
CREATE POLICY "rls_tenant_read" ON public.services AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.services;
CREATE POLICY "rls_tenant_update" ON public.services AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.services;
CREATE POLICY "rls_tenant_write" ON public.services AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Admins can manage tenant services" ON public.services_catalog;
CREATE POLICY "Admins can manage tenant services" ON public.services_catalog AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'master_admin'::text]))))));
DROP POLICY IF EXISTS "Users can view own tenant services" ON public.services_catalog;
CREATE POLICY "Users can view own tenant services" ON public.services_catalog AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_only" ON public.settings;
CREATE POLICY "rls_service_only" ON public.settings AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.shared_credentials;
CREATE POLICY "rls_service_only" ON public.shared_credentials AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.shared_workflow;
CREATE POLICY "rls_service_only" ON public.shared_workflow AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.signed_consents;
CREATE POLICY "rls_auth_all" ON public.signed_consents AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.signed_consents;
CREATE POLICY "rls_service_all" ON public.signed_consents AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "allow_all_sla_breaches" ON public.sla_breaches;
CREATE POLICY "allow_all_sla_breaches" ON public.sla_breaches AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_sla_policies" ON public.sla_policies;
CREATE POLICY "allow_all_sla_policies" ON public.sla_policies AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.smart_tasks;
CREATE POLICY "rls_service_all" ON public.smart_tasks AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.smart_tasks;
CREATE POLICY "rls_tenant_delete" ON public.smart_tasks AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.smart_tasks;
CREATE POLICY "rls_tenant_read" ON public.smart_tasks AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.smart_tasks;
CREATE POLICY "rls_tenant_update" ON public.smart_tasks AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.smart_tasks;
CREATE POLICY "rls_tenant_write" ON public.smart_tasks AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.social_accounts;
CREATE POLICY "rls_service_all" ON public.social_accounts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.social_accounts;
CREATE POLICY "rls_tenant_delete" ON public.social_accounts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.social_accounts;
CREATE POLICY "rls_tenant_read" ON public.social_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.social_accounts;
CREATE POLICY "rls_tenant_update" ON public.social_accounts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.social_accounts;
CREATE POLICY "rls_tenant_write" ON public.social_accounts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.social_content_posts;
CREATE POLICY "rls_service_all" ON public.social_content_posts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.social_content_posts;
CREATE POLICY "rls_tenant_delete" ON public.social_content_posts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.social_content_posts;
CREATE POLICY "rls_tenant_read" ON public.social_content_posts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.social_content_posts;
CREATE POLICY "rls_tenant_update" ON public.social_content_posts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.social_content_posts;
CREATE POLICY "rls_tenant_write" ON public.social_content_posts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.social_mentions;
CREATE POLICY "rls_service_all" ON public.social_mentions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.social_mentions;
CREATE POLICY "rls_tenant_delete" ON public.social_mentions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.social_mentions;
CREATE POLICY "rls_tenant_read" ON public.social_mentions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.social_mentions;
CREATE POLICY "rls_tenant_update" ON public.social_mentions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.social_mentions;
CREATE POLICY "rls_tenant_write" ON public.social_mentions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.social_post_queue;
CREATE POLICY "rls_service_all" ON public.social_post_queue AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.social_post_queue;
CREATE POLICY "rls_tenant_delete" ON public.social_post_queue AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.social_post_queue;
CREATE POLICY "rls_tenant_read" ON public.social_post_queue AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.social_post_queue;
CREATE POLICY "rls_tenant_update" ON public.social_post_queue AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.social_post_queue;
CREATE POLICY "rls_tenant_write" ON public.social_post_queue AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.social_posts;
CREATE POLICY "rls_service_all" ON public.social_posts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.social_posts;
CREATE POLICY "rls_tenant_delete" ON public.social_posts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.social_posts;
CREATE POLICY "rls_tenant_read" ON public.social_posts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.social_posts;
CREATE POLICY "rls_tenant_update" ON public.social_posts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.social_posts;
CREATE POLICY "rls_tenant_write" ON public.social_posts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.social_schedule_slots;
CREATE POLICY "rls_service_all" ON public.social_schedule_slots AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.social_schedule_slots;
CREATE POLICY "rls_tenant_delete" ON public.social_schedule_slots AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.social_schedule_slots;
CREATE POLICY "rls_tenant_read" ON public.social_schedule_slots AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.social_schedule_slots;
CREATE POLICY "rls_tenant_update" ON public.social_schedule_slots AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.social_schedule_slots;
CREATE POLICY "rls_tenant_write" ON public.social_schedule_slots AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_auth_all" ON public.staff;
CREATE POLICY "rls_auth_all" ON public.staff AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.staff;
CREATE POLICY "rls_service_all" ON public.staff AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.staff_chats;
CREATE POLICY "rls_auth_all" ON public.staff_chats AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.staff_chats;
CREATE POLICY "rls_service_all" ON public.staff_chats AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.staff_conversations;
CREATE POLICY "rls_auth_all" ON public.staff_conversations AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.staff_conversations;
CREATE POLICY "rls_service_all" ON public.staff_conversations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.staff_members;
CREATE POLICY "rls_auth_all" ON public.staff_members AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.staff_members;
CREATE POLICY "rls_service_all" ON public.staff_members AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.staff_schedules;
CREATE POLICY "rls_auth_all" ON public.staff_schedules AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.staff_schedules;
CREATE POLICY "rls_service_all" ON public.staff_schedules AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "allow_read_storm" ON public.storm_events;
CREATE POLICY "allow_read_storm" ON public.storm_events AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_storm" ON public.storm_events;
CREATE POLICY "allow_write_storm" ON public.storm_events AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_auth_read" ON public.subscription_plans;
CREATE POLICY "rls_auth_read" ON public.subscription_plans AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.subscription_plans;
CREATE POLICY "rls_service_all" ON public.subscription_plans AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.subscription_tiers;
CREATE POLICY "rls_auth_all" ON public.subscription_tiers AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.subscription_tiers;
CREATE POLICY "rls_service_all" ON public.subscription_tiers AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_all" ON public.subscriptions;
CREATE POLICY "rls_service_all" ON public.subscriptions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.subscriptions;
CREATE POLICY "rls_tenant_delete" ON public.subscriptions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.subscriptions;
CREATE POLICY "rls_tenant_read" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.subscriptions;
CREATE POLICY "rls_tenant_update" ON public.subscriptions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.subscriptions;
CREATE POLICY "rls_tenant_write" ON public.subscriptions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation" ON public.system_events;
CREATE POLICY "Tenant isolation" ON public.system_events AS PERMISSIVE FOR ALL TO public
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid())));
DROP POLICY IF EXISTS "Tenant isolation for system_events" ON public.system_events;
CREATE POLICY "Tenant isolation for system_events" ON public.system_events AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tenant_config.id
   FROM tenant_config
  WHERE (tenant_config.tenant_id = current_setting('app.tenant_id'::text, true)))));
DROP POLICY IF EXISTS "rls_service_all" ON public.system_events;
CREATE POLICY "rls_service_all" ON public.system_events AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.system_events;
CREATE POLICY "rls_tenant_delete" ON public.system_events AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.system_events;
CREATE POLICY "rls_tenant_read" ON public.system_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.system_events;
CREATE POLICY "rls_tenant_update" ON public.system_events AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.system_events;
CREATE POLICY "rls_tenant_write" ON public.system_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.system_health;
CREATE POLICY "rls_service_all" ON public.system_health AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.system_health;
CREATE POLICY "rls_tenant_delete" ON public.system_health AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.system_health;
CREATE POLICY "rls_tenant_read" ON public.system_health AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.system_health;
CREATE POLICY "rls_tenant_update" ON public.system_health AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.system_health;
CREATE POLICY "rls_tenant_write" ON public.system_health AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.target_accounts;
CREATE POLICY "rls_service_all" ON public.target_accounts AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.target_accounts;
CREATE POLICY "rls_tenant_delete" ON public.target_accounts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.target_accounts;
CREATE POLICY "rls_tenant_read" ON public.target_accounts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.target_accounts;
CREATE POLICY "rls_tenant_update" ON public.target_accounts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.target_accounts;
CREATE POLICY "rls_tenant_write" ON public.target_accounts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Admins can manage tenant personas" ON public.target_personas;
CREATE POLICY "Admins can manage tenant personas" ON public.target_personas AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::text, 'master_admin'::text]))))));
DROP POLICY IF EXISTS "Users can view own tenant personas" ON public.target_personas;
CREATE POLICY "Users can view own tenant personas" ON public.target_personas AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT user_roles.tenant_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_all" ON public.task_automation_rules;
CREATE POLICY "rls_service_all" ON public.task_automation_rules AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.task_automation_rules;
CREATE POLICY "rls_tenant_delete" ON public.task_automation_rules AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.task_automation_rules;
CREATE POLICY "rls_tenant_read" ON public.task_automation_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.task_automation_rules;
CREATE POLICY "rls_tenant_update" ON public.task_automation_rules AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.task_automation_rules;
CREATE POLICY "rls_tenant_write" ON public.task_automation_rules AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_auth_read" ON public.task_automation_rules_template;
CREATE POLICY "rls_auth_read" ON public.task_automation_rules_template AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.task_automation_rules_template;
CREATE POLICY "rls_service_all" ON public.task_automation_rules_template AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.task_execution_log;
CREATE POLICY "rls_auth_all" ON public.task_execution_log AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.task_execution_log;
CREATE POLICY "rls_service_all" ON public.task_execution_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.task_executions;
CREATE POLICY "rls_service_all" ON public.task_executions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.task_executions;
CREATE POLICY "rls_tenant_delete" ON public.task_executions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.task_executions;
CREATE POLICY "rls_tenant_read" ON public.task_executions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.task_executions;
CREATE POLICY "rls_tenant_update" ON public.task_executions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.task_executions;
CREATE POLICY "rls_tenant_write" ON public.task_executions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.tasks;
CREATE POLICY "rls_service_all" ON public.tasks AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tasks;
CREATE POLICY "rls_tenant_delete" ON public.tasks AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tasks;
CREATE POLICY "rls_tenant_read" ON public.tasks AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tasks;
CREATE POLICY "rls_tenant_update" ON public.tasks AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tasks;
CREATE POLICY "rls_tenant_write" ON public.tasks AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_auth_all" ON public.team_activity_logs;
CREATE POLICY "rls_auth_all" ON public.team_activity_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.team_activity_logs;
CREATE POLICY "rls_service_all" ON public.team_activity_logs AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.team_invitations;
CREATE POLICY "rls_auth_all" ON public.team_invitations AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.team_invitations;
CREATE POLICY "rls_service_all" ON public.team_invitations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.team_member_notifications;
CREATE POLICY "rls_auth_all" ON public.team_member_notifications AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.team_member_notifications;
CREATE POLICY "rls_service_all" ON public.team_member_notifications AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.team_members;
CREATE POLICY "rls_auth_all" ON public.team_members AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.team_members;
CREATE POLICY "rls_service_all" ON public.team_members AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "tenant_audit_log_authenticated_read" ON public.tenant_audit_log;
CREATE POLICY "tenant_audit_log_authenticated_read" ON public.tenant_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "tenant_audit_log_service_all" ON public.tenant_audit_log;
CREATE POLICY "tenant_audit_log_service_all" ON public.tenant_audit_log AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can read config" ON public.tenant_config;
CREATE POLICY "Authenticated can read config" ON public.tenant_config AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_update_tenant_config" ON public.tenant_config;
CREATE POLICY "rls_tenant_update_tenant_config" ON public.tenant_config AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()))
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "tenant_cta_library_select_own" ON public.tenant_cta_library;
CREATE POLICY "tenant_cta_library_select_own" ON public.tenant_cta_library AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = ( SELECT tenant_config.id
   FROM tenant_config
  WHERE (tenant_config.tenant_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_slug'::text))
 LIMIT 1)));
DROP POLICY IF EXISTS "tenant_health_probe_service_role" ON public.tenant_health_probe;
CREATE POLICY "tenant_health_probe_service_role" ON public.tenant_health_probe AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_health_probe_tenant_read" ON public.tenant_health_probe;
CREATE POLICY "tenant_health_probe_tenant_read" ON public.tenant_health_probe AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_icp_config;
CREATE POLICY "rls_service_all" ON public.tenant_icp_config AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_icp_config;
CREATE POLICY "rls_tenant_delete" ON public.tenant_icp_config AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_icp_config;
CREATE POLICY "rls_tenant_read" ON public.tenant_icp_config AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_icp_config;
CREATE POLICY "rls_tenant_update" ON public.tenant_icp_config AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_icp_config;
CREATE POLICY "rls_tenant_write" ON public.tenant_icp_config AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_integrations;
CREATE POLICY "rls_service_all" ON public.tenant_integrations AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_integrations;
CREATE POLICY "rls_tenant_delete" ON public.tenant_integrations AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_integrations;
CREATE POLICY "rls_tenant_read" ON public.tenant_integrations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_integrations;
CREATE POLICY "rls_tenant_update" ON public.tenant_integrations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_integrations;
CREATE POLICY "rls_tenant_write" ON public.tenant_integrations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "tenant_integrations_insert" ON public.tenant_integrations;
CREATE POLICY "tenant_integrations_insert" ON public.tenant_integrations AS PERMISSIVE FOR INSERT TO authenticated, anon
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_master_admin_all" ON public.tenant_oauth_grants;
CREATE POLICY "rls_master_admin_all" ON public.tenant_oauth_grants AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'role'::text) = 'master_admin'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_oauth_grants;
CREATE POLICY "rls_service_all" ON public.tenant_oauth_grants AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_oauth_grants;
CREATE POLICY "rls_tenant_delete" ON public.tenant_oauth_grants AS PERMISSIVE FOR DELETE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_oauth_grants;
CREATE POLICY "rls_tenant_read" ON public.tenant_oauth_grants AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_oauth_grants;
CREATE POLICY "rls_tenant_update" ON public.tenant_oauth_grants AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_oauth_grants;
CREATE POLICY "rls_tenant_write" ON public.tenant_oauth_grants AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Users can update own tenant onboarding" ON public.tenant_onboarding;
CREATE POLICY "Users can update own tenant onboarding" ON public.tenant_onboarding AS PERMISSIVE FOR UPDATE TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "Users can view own tenant onboarding" ON public.tenant_onboarding;
CREATE POLICY "Users can view own tenant onboarding" ON public.tenant_onboarding AS PERMISSIVE FOR SELECT TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_onboarding;
CREATE POLICY "rls_service_all" ON public.tenant_onboarding AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_onboarding;
CREATE POLICY "rls_tenant_delete" ON public.tenant_onboarding AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_onboarding;
CREATE POLICY "rls_tenant_read" ON public.tenant_onboarding AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_onboarding;
CREATE POLICY "rls_tenant_update" ON public.tenant_onboarding AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_onboarding;
CREATE POLICY "rls_tenant_write" ON public.tenant_onboarding AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_phone_numbers;
CREATE POLICY "rls_service_all" ON public.tenant_phone_numbers AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_phone_numbers;
CREATE POLICY "rls_tenant_delete" ON public.tenant_phone_numbers AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_phone_numbers;
CREATE POLICY "rls_tenant_read" ON public.tenant_phone_numbers AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_phone_numbers;
CREATE POLICY "rls_tenant_update" ON public.tenant_phone_numbers AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_phone_numbers;
CREATE POLICY "rls_tenant_write" ON public.tenant_phone_numbers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_providers;
CREATE POLICY "rls_service_all" ON public.tenant_providers AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_providers;
CREATE POLICY "rls_tenant_delete" ON public.tenant_providers AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_providers;
CREATE POLICY "rls_tenant_read" ON public.tenant_providers AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_providers;
CREATE POLICY "rls_tenant_update" ON public.tenant_providers AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_providers;
CREATE POLICY "rls_tenant_write" ON public.tenant_providers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_services;
CREATE POLICY "rls_service_all" ON public.tenant_services AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_services;
CREATE POLICY "rls_tenant_delete" ON public.tenant_services AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_services;
CREATE POLICY "rls_tenant_read" ON public.tenant_services AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_services;
CREATE POLICY "rls_tenant_update" ON public.tenant_services AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_services;
CREATE POLICY "rls_tenant_write" ON public.tenant_services AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_templates;
CREATE POLICY "rls_service_all" ON public.tenant_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.tenant_templates;
CREATE POLICY "rls_tenant_delete" ON public.tenant_templates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.tenant_templates;
CREATE POLICY "rls_tenant_read" ON public.tenant_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.tenant_templates;
CREATE POLICY "rls_tenant_update" ON public.tenant_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.tenant_templates;
CREATE POLICY "rls_tenant_write" ON public.tenant_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_auth_all" ON public.tenants;
CREATE POLICY "rls_auth_all" ON public.tenants AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.tenants;
CREATE POLICY "rls_service_all" ON public.tenants AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "allow_all" ON public.tender_documents;
CREATE POLICY "allow_all" ON public.tender_documents AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.tender_payments;
CREATE POLICY "allow_all" ON public.tender_payments AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.tender_stages;
CREATE POLICY "allow_all" ON public.tender_stages AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all" ON public.tenders;
CREATE POLICY "allow_all" ON public.tenders AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.treatment_media;
CREATE POLICY "rls_auth_all" ON public.treatment_media AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.treatment_media;
CREATE POLICY "rls_service_all" ON public.treatment_media AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.treatment_notes;
CREATE POLICY "rls_auth_all" ON public.treatment_notes AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.treatment_notes;
CREATE POLICY "rls_service_all" ON public.treatment_notes AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.treatment_records;
CREATE POLICY "rls_auth_all" ON public.treatment_records AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.treatment_records;
CREATE POLICY "rls_service_all" ON public.treatment_records AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.treatments;
CREATE POLICY "rls_service_all" ON public.treatments AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.treatments;
CREATE POLICY "rls_tenant_delete" ON public.treatments AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.treatments;
CREATE POLICY "rls_tenant_read" ON public.treatments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.treatments;
CREATE POLICY "rls_tenant_update" ON public.treatments AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.treatments;
CREATE POLICY "rls_tenant_write" ON public.treatments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.trend_insights;
CREATE POLICY "rls_service_all" ON public.trend_insights AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.trend_insights;
CREATE POLICY "rls_tenant_delete" ON public.trend_insights AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.trend_insights;
CREATE POLICY "rls_tenant_read" ON public.trend_insights AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.trend_insights;
CREATE POLICY "rls_tenant_update" ON public.trend_insights AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.trend_insights;
CREATE POLICY "rls_tenant_write" ON public.trend_insights AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_auth_all" ON public.trending_topics;
CREATE POLICY "rls_auth_all" ON public.trending_topics AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.trending_topics;
CREATE POLICY "rls_service_all" ON public.trending_topics AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.trigger_events;
CREATE POLICY "rls_service_all" ON public.trigger_events AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.trigger_events;
CREATE POLICY "rls_tenant_delete" ON public.trigger_events AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.trigger_events;
CREATE POLICY "rls_tenant_read" ON public.trigger_events AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.trigger_events;
CREATE POLICY "rls_tenant_update" ON public.trigger_events AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.trigger_events;
CREATE POLICY "rls_tenant_write" ON public.trigger_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.trigger_monitors;
CREATE POLICY "rls_service_all" ON public.trigger_monitors AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.trigger_monitors;
CREATE POLICY "rls_tenant_delete" ON public.trigger_monitors AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.trigger_monitors;
CREATE POLICY "rls_tenant_read" ON public.trigger_monitors AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.trigger_monitors;
CREATE POLICY "rls_tenant_update" ON public.trigger_monitors AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.trigger_monitors;
CREATE POLICY "rls_tenant_write" ON public.trigger_monitors AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Tenant isolation for unified_predictions" ON public.unified_predictions;
CREATE POLICY "Tenant isolation for unified_predictions" ON public.unified_predictions AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT tenant_config.id
   FROM tenant_config
  WHERE (tenant_config.tenant_id = current_setting('app.tenant_id'::text, true)))));
DROP POLICY IF EXISTS "rls_service_all" ON public.usage_records;
CREATE POLICY "rls_service_all" ON public.usage_records AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.usage_records;
CREATE POLICY "rls_tenant_delete" ON public.usage_records AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.usage_records;
CREATE POLICY "rls_tenant_read" ON public.usage_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.usage_records;
CREATE POLICY "rls_tenant_update" ON public.usage_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.usage_records;
CREATE POLICY "rls_tenant_write" ON public.usage_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_only" ON public.user;
CREATE POLICY "rls_service_only" ON public.user AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.user_api_keys;
CREATE POLICY "rls_service_only" ON public.user_api_keys AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.user_roles;
CREATE POLICY "Allow authenticated" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated" ON public.users;
CREATE POLICY "Allow authenticated" ON public.users AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Tenant isolation for video_analytics" ON public.video_analytics;
CREATE POLICY "Tenant isolation for video_analytics" ON public.video_analytics AS PERMISSIVE FOR ALL TO public
  USING (((tenant_id IN ( SELECT (tc.id)::text AS id
   FROM tenant_config tc
  WHERE (tc.tenant_id = current_setting('app.tenant_id'::text, true)))) OR (tenant_id IN ( SELECT tc.tenant_id
   FROM tenant_config tc
  WHERE (tc.tenant_id = current_setting('app.tenant_id'::text, true))))));
DROP POLICY IF EXISTS "rls_service_all" ON public.video_assets;
CREATE POLICY "rls_service_all" ON public.video_assets AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.video_assets;
CREATE POLICY "rls_tenant_delete" ON public.video_assets AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.video_assets;
CREATE POLICY "rls_tenant_read" ON public.video_assets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.video_assets;
CREATE POLICY "rls_tenant_update" ON public.video_assets AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.video_assets;
CREATE POLICY "rls_tenant_write" ON public.video_assets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "allow_read_vps" ON public.video_performance_signals;
CREATE POLICY "allow_read_vps" ON public.video_performance_signals AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_vps" ON public.video_performance_signals;
CREATE POLICY "allow_write_vps" ON public.video_performance_signals AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_video_projects" ON public.video_projects;
CREATE POLICY "auth_all_video_projects" ON public.video_projects AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_video_projects" ON public.video_projects;
CREATE POLICY "svc_all_video_projects" ON public.video_projects AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "publog_service_all" ON public.video_publishing_log;
CREATE POLICY "publog_service_all" ON public.video_publishing_log AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "publog_tenant_select" ON public.video_publishing_log;
CREATE POLICY "publog_tenant_select" ON public.video_publishing_log AS PERMISSIVE FOR SELECT TO public
  USING (((tenant_id)::text = current_setting('app.current_tenant_id'::text, true)));
DROP POLICY IF EXISTS "auth_all_video_render_queue" ON public.video_render_queue;
CREATE POLICY "auth_all_video_render_queue" ON public.video_render_queue AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "svc_all_video_render_queue" ON public.video_render_queue;
CREATE POLICY "svc_all_video_render_queue" ON public.video_render_queue AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.video_retargeting_audiences;
CREATE POLICY "rls_service_all" ON public.video_retargeting_audiences AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.video_retargeting_audiences;
CREATE POLICY "rls_tenant_delete" ON public.video_retargeting_audiences AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.video_retargeting_audiences;
CREATE POLICY "rls_tenant_read" ON public.video_retargeting_audiences AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.video_retargeting_audiences;
CREATE POLICY "rls_tenant_update" ON public.video_retargeting_audiences AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.video_retargeting_audiences;
CREATE POLICY "rls_tenant_write" ON public.video_retargeting_audiences AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "anon_read_video_templates" ON public.video_templates;
CREATE POLICY "anon_read_video_templates" ON public.video_templates AS PERMISSIVE FOR SELECT TO anon
  USING (true);
DROP POLICY IF EXISTS "auth_read_video_templates" ON public.video_templates;
CREATE POLICY "auth_read_video_templates" ON public.video_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "svc_all_video_templates" ON public.video_templates;
CREATE POLICY "svc_all_video_templates" ON public.video_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.video_view_tracking;
CREATE POLICY "rls_service_all" ON public.video_view_tracking AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.video_view_tracking;
CREATE POLICY "rls_tenant_delete" ON public.video_view_tracking AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.video_view_tracking;
CREATE POLICY "rls_tenant_read" ON public.video_view_tracking AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.video_view_tracking;
CREATE POLICY "rls_tenant_update" ON public.video_view_tracking AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.video_view_tracking;
CREATE POLICY "rls_tenant_write" ON public.video_view_tracking AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.vip_routing_rules;
CREATE POLICY "rls_service_all" ON public.vip_routing_rules AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.vip_routing_rules;
CREATE POLICY "rls_tenant_delete" ON public.vip_routing_rules AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.vip_routing_rules;
CREATE POLICY "rls_tenant_read" ON public.vip_routing_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.vip_routing_rules;
CREATE POLICY "rls_tenant_update" ON public.vip_routing_rules AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.vip_routing_rules;
CREATE POLICY "rls_tenant_write" ON public.vip_routing_rules AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.visitor_sessions;
CREATE POLICY "rls_service_all" ON public.visitor_sessions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.visitor_sessions;
CREATE POLICY "rls_tenant_delete" ON public.visitor_sessions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.visitor_sessions;
CREATE POLICY "rls_tenant_read" ON public.visitor_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.visitor_sessions;
CREATE POLICY "rls_tenant_update" ON public.visitor_sessions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.visitor_sessions;
CREATE POLICY "rls_tenant_write" ON public.visitor_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.visits;
CREATE POLICY "rls_service_all" ON public.visits AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.visits;
CREATE POLICY "rls_tenant_delete" ON public.visits AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.visits;
CREATE POLICY "rls_tenant_read" ON public.visits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.visits;
CREATE POLICY "rls_tenant_update" ON public.visits AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.visits;
CREATE POLICY "rls_tenant_write" ON public.visits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_call_log;
CREATE POLICY "rls_service_all" ON public.voice_call_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_call_log;
CREATE POLICY "rls_tenant_delete" ON public.voice_call_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_call_log;
CREATE POLICY "rls_tenant_read" ON public.voice_call_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_call_log;
CREATE POLICY "rls_tenant_update" ON public.voice_call_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_call_log;
CREATE POLICY "rls_tenant_write" ON public.voice_call_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_credit_transactions;
CREATE POLICY "rls_service_all" ON public.voice_credit_transactions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_credit_transactions;
CREATE POLICY "rls_tenant_delete" ON public.voice_credit_transactions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_credit_transactions;
CREATE POLICY "rls_tenant_read" ON public.voice_credit_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_credit_transactions;
CREATE POLICY "rls_tenant_update" ON public.voice_credit_transactions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_credit_transactions;
CREATE POLICY "rls_tenant_write" ON public.voice_credit_transactions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_credits;
CREATE POLICY "rls_service_all" ON public.voice_credits AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_credits;
CREATE POLICY "rls_tenant_delete" ON public.voice_credits AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_credits;
CREATE POLICY "rls_tenant_read" ON public.voice_credits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_credits;
CREATE POLICY "rls_tenant_update" ON public.voice_credits AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_credits;
CREATE POLICY "rls_tenant_write" ON public.voice_credits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_voice_inbox_sync" ON public.voice_inbox_sync;
CREATE POLICY "allow_all_voice_inbox_sync" ON public.voice_inbox_sync AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_invoices;
CREATE POLICY "rls_service_all" ON public.voice_invoices AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_invoices;
CREATE POLICY "rls_tenant_delete" ON public.voice_invoices AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_invoices;
CREATE POLICY "rls_tenant_read" ON public.voice_invoices AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_invoices;
CREATE POLICY "rls_tenant_update" ON public.voice_invoices AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_invoices;
CREATE POLICY "rls_tenant_write" ON public.voice_invoices AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_marketing_calls;
CREATE POLICY "rls_service_all" ON public.voice_marketing_calls AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_marketing_calls;
CREATE POLICY "rls_tenant_delete" ON public.voice_marketing_calls AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_marketing_calls;
CREATE POLICY "rls_tenant_read" ON public.voice_marketing_calls AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_marketing_calls;
CREATE POLICY "rls_tenant_update" ON public.voice_marketing_calls AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_marketing_calls;
CREATE POLICY "rls_tenant_write" ON public.voice_marketing_calls AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_auth_read" ON public.voice_packages;
CREATE POLICY "rls_auth_read" ON public.voice_packages AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_packages;
CREATE POLICY "rls_service_all" ON public.voice_packages AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_phone_numbers;
CREATE POLICY "rls_service_all" ON public.voice_phone_numbers AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_phone_numbers;
CREATE POLICY "rls_tenant_delete" ON public.voice_phone_numbers AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_phone_numbers;
CREATE POLICY "rls_tenant_read" ON public.voice_phone_numbers AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_phone_numbers;
CREATE POLICY "rls_tenant_update" ON public.voice_phone_numbers AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_phone_numbers;
CREATE POLICY "rls_tenant_write" ON public.voice_phone_numbers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = ( SELECT tc.id
   FROM tenant_config tc
  WHERE (tc.tenant_id = get_user_tenant_id())
 LIMIT 1)));
DROP POLICY IF EXISTS "rls_auth_all" ON public.voice_phone_pool;
CREATE POLICY "rls_auth_all" ON public.voice_phone_pool AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_phone_pool;
CREATE POLICY "rls_service_all" ON public.voice_phone_pool AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.voice_prompt_templates;
CREATE POLICY "rls_auth_all" ON public.voice_prompt_templates AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_prompt_templates;
CREATE POLICY "rls_service_all" ON public.voice_prompt_templates AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_auth_all" ON public.voice_provider_config;
CREATE POLICY "rls_auth_all" ON public.voice_provider_config AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_provider_config;
CREATE POLICY "rls_service_all" ON public.voice_provider_config AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.voice_usage;
CREATE POLICY "rls_service_all" ON public.voice_usage AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.voice_usage;
CREATE POLICY "rls_tenant_delete" ON public.voice_usage AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.voice_usage;
CREATE POLICY "rls_tenant_read" ON public.voice_usage AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.voice_usage;
CREATE POLICY "rls_tenant_update" ON public.voice_usage AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.voice_usage;
CREATE POLICY "rls_tenant_write" ON public.voice_usage AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.warmup_daily_log;
CREATE POLICY "rls_service_all" ON public.warmup_daily_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.warmup_daily_log;
CREATE POLICY "rls_tenant_delete" ON public.warmup_daily_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.warmup_daily_log;
CREATE POLICY "rls_tenant_read" ON public.warmup_daily_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.warmup_daily_log;
CREATE POLICY "rls_tenant_update" ON public.warmup_daily_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.warmup_daily_log;
CREATE POLICY "rls_tenant_write" ON public.warmup_daily_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_warranty" ON public.warranty_tracking;
CREATE POLICY "allow_read_warranty" ON public.warranty_tracking AS PERMISSIVE FOR SELECT TO public
  USING (true);
DROP POLICY IF EXISTS "allow_write_warranty" ON public.warranty_tracking;
CREATE POLICY "allow_write_warranty" ON public.warranty_tracking AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.webhook_entity;
CREATE POLICY "rls_service_only" ON public.webhook_entity AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Users can view own webhook logs" ON public.webhook_logs;
CREATE POLICY "Users can view own webhook logs" ON public.webhook_logs AS PERMISSIVE FOR SELECT TO public
  USING (((tenant_id IS NULL) OR (tenant_id IN ( SELECT tc.tenant_id
   FROM (tenant_config tc
     JOIN team_members tm ON ((tm.org_id = tc.id)))
  WHERE ((tm.user_id = auth.uid()) AND ((tm.status)::text = 'active'::text))))));
DROP POLICY IF EXISTS "anon_insert_clicks" ON public.website_cta_clicks;
CREATE POLICY "anon_insert_clicks" ON public.website_cta_clicks AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_clicks" ON public.website_cta_clicks;
CREATE POLICY "service_role_all_clicks" ON public.website_cta_clicks AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "anon_insert_leads" ON public.website_leads;
CREATE POLICY "anon_insert_leads" ON public.website_leads AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all_leads" ON public.website_leads;
CREATE POLICY "service_role_all_leads" ON public.website_leads AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.website_visitors;
CREATE POLICY "rls_service_all" ON public.website_visitors AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.website_visitors;
CREATE POLICY "rls_tenant_delete" ON public.website_visitors AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.website_visitors;
CREATE POLICY "rls_tenant_read" ON public.website_visitors AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.website_visitors;
CREATE POLICY "rls_tenant_update" ON public.website_visitors AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.website_visitors;
CREATE POLICY "rls_tenant_write" ON public.website_visitors AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_only" ON public.workflow_dependency;
CREATE POLICY "rls_service_only" ON public.workflow_dependency AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.workflow_entity;
CREATE POLICY "rls_service_only" ON public.workflow_entity AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "Tenant isolation for workflow_errors" ON public.workflow_errors;
CREATE POLICY "Tenant isolation for workflow_errors" ON public.workflow_errors AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text)));
DROP POLICY IF EXISTS "rls_service_all" ON public.workflow_errors;
CREATE POLICY "rls_service_all" ON public.workflow_errors AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.workflow_errors;
CREATE POLICY "rls_tenant_delete" ON public.workflow_errors AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.workflow_errors;
CREATE POLICY "rls_tenant_read" ON public.workflow_errors AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.workflow_errors;
CREATE POLICY "rls_tenant_update" ON public.workflow_errors AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.workflow_errors;
CREATE POLICY "rls_tenant_write" ON public.workflow_errors AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_service_all" ON public.workflow_executions;
CREATE POLICY "rls_service_all" ON public.workflow_executions AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_tenant_delete" ON public.workflow_executions;
CREATE POLICY "rls_tenant_delete" ON public.workflow_executions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_read" ON public.workflow_executions;
CREATE POLICY "rls_tenant_read" ON public.workflow_executions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_update" ON public.workflow_executions;
CREATE POLICY "rls_tenant_update" ON public.workflow_executions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_tenant_write" ON public.workflow_executions;
CREATE POLICY "rls_tenant_write" ON public.workflow_executions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "rls_auth_read" ON public.workflow_health_log;
CREATE POLICY "rls_auth_read" ON public.workflow_health_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "rls_service_all" ON public.workflow_health_log;
CREATE POLICY "rls_service_all" ON public.workflow_health_log AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.workflow_history;
CREATE POLICY "rls_service_only" ON public.workflow_history AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.workflow_publish_history;
CREATE POLICY "rls_service_only" ON public.workflow_publish_history AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "rls_service_only" ON public.workflow_statistics;
CREATE POLICY "rls_service_only" ON public.workflow_statistics AS PERMISSIVE FOR ALL TO service_role
  USING (true);
DROP POLICY IF EXISTS "service_role_yt_analytics_snapshots" ON public.yt_analytics_snapshots;
CREATE POLICY "service_role_yt_analytics_snapshots" ON public.yt_analytics_snapshots AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_analytics_snapshots" ON public.yt_analytics_snapshots;
CREATE POLICY "tenant_isolation_yt_analytics_snapshots" ON public.yt_analytics_snapshots AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_channel_audits" ON public.yt_channel_audits;
CREATE POLICY "service_role_yt_channel_audits" ON public.yt_channel_audits AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_channel_audits" ON public.yt_channel_audits;
CREATE POLICY "tenant_isolation_yt_channel_audits" ON public.yt_channel_audits AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_channels" ON public.yt_channels;
CREATE POLICY "service_role_yt_channels" ON public.yt_channels AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_channels" ON public.yt_channels;
CREATE POLICY "tenant_isolation_yt_channels" ON public.yt_channels AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_client_economics" ON public.yt_client_economics;
CREATE POLICY "service_role_yt_client_economics" ON public.yt_client_economics AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_client_economics" ON public.yt_client_economics;
CREATE POLICY "tenant_isolation_yt_client_economics" ON public.yt_client_economics AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_client_reports" ON public.yt_client_reports;
CREATE POLICY "service_role_yt_client_reports" ON public.yt_client_reports AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_client_reports" ON public.yt_client_reports;
CREATE POLICY "tenant_isolation_yt_client_reports" ON public.yt_client_reports AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_competitor_alerts" ON public.yt_competitor_alerts;
CREATE POLICY "service_role_yt_competitor_alerts" ON public.yt_competitor_alerts AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_competitor_alerts" ON public.yt_competitor_alerts;
CREATE POLICY "tenant_isolation_yt_competitor_alerts" ON public.yt_competitor_alerts AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_competitor_tracking" ON public.yt_competitor_tracking;
CREATE POLICY "service_role_yt_competitor_tracking" ON public.yt_competitor_tracking AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_competitor_tracking" ON public.yt_competitor_tracking;
CREATE POLICY "tenant_isolation_yt_competitor_tracking" ON public.yt_competitor_tracking AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_content_calendar" ON public.yt_content_calendar;
CREATE POLICY "service_role_yt_content_calendar" ON public.yt_content_calendar AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_content_calendar" ON public.yt_content_calendar;
CREATE POLICY "tenant_isolation_yt_content_calendar" ON public.yt_content_calendar AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_discovery_batches" ON public.yt_discovery_batches;
CREATE POLICY "service_role_yt_discovery_batches" ON public.yt_discovery_batches AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_discovery_batches" ON public.yt_discovery_batches;
CREATE POLICY "tenant_isolation_yt_discovery_batches" ON public.yt_discovery_batches AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_generated_assets" ON public.yt_generated_assets;
CREATE POLICY "service_role_yt_generated_assets" ON public.yt_generated_assets AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_generated_assets" ON public.yt_generated_assets;
CREATE POLICY "tenant_isolation_yt_generated_assets" ON public.yt_generated_assets AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_oauth_connections" ON public.yt_oauth_connections;
CREATE POLICY "service_role_yt_oauth_connections" ON public.yt_oauth_connections AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_oauth_connections" ON public.yt_oauth_connections;
CREATE POLICY "tenant_isolation_yt_oauth_connections" ON public.yt_oauth_connections AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_outreach_campaigns" ON public.yt_outreach_campaigns;
CREATE POLICY "service_role_yt_outreach_campaigns" ON public.yt_outreach_campaigns AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_outreach_campaigns" ON public.yt_outreach_campaigns;
CREATE POLICY "tenant_isolation_yt_outreach_campaigns" ON public.yt_outreach_campaigns AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_outreach_sequences" ON public.yt_outreach_sequences;
CREATE POLICY "service_role_yt_outreach_sequences" ON public.yt_outreach_sequences AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_iso_yt_outreach_sequences" ON public.yt_outreach_sequences;
CREATE POLICY "tenant_iso_yt_outreach_sequences" ON public.yt_outreach_sequences AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_outreach_touches" ON public.yt_outreach_touches;
CREATE POLICY "service_role_yt_outreach_touches" ON public.yt_outreach_touches AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_iso_yt_outreach_touches" ON public.yt_outreach_touches;
CREATE POLICY "tenant_iso_yt_outreach_touches" ON public.yt_outreach_touches AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_payment_transactions" ON public.yt_payment_transactions;
CREATE POLICY "service_role_yt_payment_transactions" ON public.yt_payment_transactions AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_payment_transactions" ON public.yt_payment_transactions;
CREATE POLICY "tenant_isolation_yt_payment_transactions" ON public.yt_payment_transactions AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_portal_messages" ON public.yt_portal_messages;
CREATE POLICY "service_role_yt_portal_messages" ON public.yt_portal_messages AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_portal_messages" ON public.yt_portal_messages;
CREATE POLICY "tenant_isolation_yt_portal_messages" ON public.yt_portal_messages AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_portal_users" ON public.yt_portal_users;
CREATE POLICY "service_role_yt_portal_users" ON public.yt_portal_users AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_portal_users" ON public.yt_portal_users;
CREATE POLICY "tenant_isolation_yt_portal_users" ON public.yt_portal_users AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_seo_packages" ON public.yt_seo_packages;
CREATE POLICY "service_role_yt_seo_packages" ON public.yt_seo_packages AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_seo_packages" ON public.yt_seo_packages;
CREATE POLICY "tenant_isolation_yt_seo_packages" ON public.yt_seo_packages AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_thumbnail_tests" ON public.yt_thumbnail_tests;
CREATE POLICY "service_role_yt_thumbnail_tests" ON public.yt_thumbnail_tests AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_thumbnail_tests" ON public.yt_thumbnail_tests;
CREATE POLICY "tenant_isolation_yt_thumbnail_tests" ON public.yt_thumbnail_tests AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_trending_topics" ON public.yt_trending_topics;
CREATE POLICY "service_role_yt_trending_topics" ON public.yt_trending_topics AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_trending_topics" ON public.yt_trending_topics;
CREATE POLICY "tenant_isolation_yt_trending_topics" ON public.yt_trending_topics AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "service_role_yt_video_scripts" ON public.yt_video_scripts;
CREATE POLICY "service_role_yt_video_scripts" ON public.yt_video_scripts AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_isolation_yt_video_scripts" ON public.yt_video_scripts;
CREATE POLICY "tenant_isolation_yt_video_scripts" ON public.yt_video_scripts AS PERMISSIVE FOR ALL TO public
  USING ((tenant_id IN ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));