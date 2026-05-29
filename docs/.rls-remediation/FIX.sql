-- RLS REMEDIATION — applied statements

-- api_key_pool [BUCKET7_secrets_lock]
DROP POLICY IF EXISTS "akp_all" ON public.api_key_pool;
-- tenant_oauth_grants [BUCKET7_secrets_lock]
DROP POLICY IF EXISTS "rls_service_all" ON public.tenant_oauth_grants;
-- accounting_clients [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_clients;
-- accounting_invoices [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_invoices;
-- accounting_jobs [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_jobs;
-- accounting_payments [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_payments;
-- accounting_reminders [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_reminders;
-- accounting_transactions [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_transactions;
-- accounting_truelayer_connections [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.accounting_truelayer_connections;
-- activities [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "activities_allow_all" ON public.activities;
-- ad_accounts [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_accounts;
-- ad_campaigns [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_campaigns;
-- ad_creatives [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_creatives;
-- ad_performance_log [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "Authenticated access" ON public.ad_performance_log;
-- audit_logs [BUCKET1_drop_leak_only]
CREATE POLICY "tenant_isolation_rls_fix" ON public.audit_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
-- conversations [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "allow_all_conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "allow_all_conversations_read" ON public.conversations;
DROP POLICY IF EXISTS "allow_all_conversations_update" ON public.conversations;
-- hr_ai_interviews [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "hr_ai_interviews_access" ON public.hr_ai_interviews;
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_ai_interviews;
-- hr_auto_decisions [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_auto_decisions;
-- hr_auto_mode_config [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "rls_service_all" ON public.hr_auto_mode_config;
-- hr_goals [BUCKET1_drop_leak_only]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_goals FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_goals;
-- messages [BUCKET1_drop_leak_only]
CREATE POLICY "tenant_isolation_rls_fix" ON public.messages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "allow_all_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "allow_all_messages_read" ON public.messages;
DROP POLICY IF EXISTS "allow_all_messages_update" ON public.messages;
-- sales_ab_assignments [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "tenant_isolation" ON public.sales_ab_assignments;
-- sales_ab_tests [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "tenant_isolation" ON public.sales_ab_tests;
-- sales_consent_records [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "Tenant isolation for sales_consent_records" ON public.sales_consent_records;
-- sales_conversations [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "Tenant isolation for sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "sales_conversations_policy" ON public.sales_conversations;
-- sales_do_not_contact [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "sales_dnc_policy" ON public.sales_do_not_contact;
-- sales_marketing_bridge [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "allow_all_bridge" ON public.sales_marketing_bridge;
-- tenant_integrations [BUCKET1_drop_leak_only]
DROP POLICY IF EXISTS "tenant_integrations_insert" ON public.tenant_integrations;
-- aeo_brand_presence [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.aeo_brand_presence FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_aeo_bp" ON public.aeo_brand_presence;
-- aeo_content_scores [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.aeo_content_scores FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_aeo_cs" ON public.aeo_content_scores;
-- aeo_entity_graph [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.aeo_entity_graph FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_aeo_eg" ON public.aeo_entity_graph;
-- aeo_schema_registry [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.aeo_schema_registry FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_aeo_sr" ON public.aeo_schema_registry;
-- ai_agent_metrics [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_agent_metrics FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "ai_agent_metrics_read" ON public.ai_agent_metrics;
-- ai_agents [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_agents FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "ai_agents_anon_read" ON public.ai_agents;
-- ai_decisions [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_decisions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_decisions;
-- conversation_resolution_log [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.conversation_resolution_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_conversation_resolution_log" ON public.conversation_resolution_log;
-- hr_attendance [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_attendance FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_attendance;
-- hr_attendance_rules [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_attendance_rules FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "tenant_attendance_rules_all" ON public.hr_attendance_rules;
-- hr_departments [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_departments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_departments;
-- hr_document_acknowledgments [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_document_acknowledgments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "hr_doc_ack_all" ON public.hr_document_acknowledgments;
-- hr_documents [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_documents FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_documents;
-- hr_leave_requests [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_leave_requests FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_leave_requests;
-- hr_performance_cycles [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_performance_cycles FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_performance_cycles;
-- hr_performance_reviews [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_performance_reviews FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_performance_reviews;
-- hr_training_programs [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_training_programs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_training_programs;
-- hr_training_records [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_training_records FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_training_records;
-- landing_pages [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.landing_pages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_landing_pages" ON public.landing_pages;
-- marketing_calendar [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_calendar FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_marketing_calendar" ON public.marketing_calendar;
-- marketing_predictions [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_predictions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "mkt_predictions_access" ON public.marketing_predictions;
-- marketing_sequence_steps [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_sequence_steps FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_sequence_steps;
-- message_sentiment [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.message_sentiment FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_message_sentiment" ON public.message_sentiment;
-- sla_breaches [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sla_breaches FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_sla_breaches" ON public.sla_breaches;
-- sla_policies [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sla_policies FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_sla_policies" ON public.sla_policies;
-- video_performance_signals [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.video_performance_signals FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "allow_read_vps" ON public.video_performance_signals;
DROP POLICY IF EXISTS "allow_write_vps" ON public.video_performance_signals;
-- video_projects [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.video_projects FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "auth_all_video_projects" ON public.video_projects;
-- video_render_queue [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.video_render_queue FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text));
DROP POLICY IF EXISTS "auth_all_video_render_queue" ON public.video_render_queue;
-- voice_inbox_sync [BUCKET2_add_uuid_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.voice_inbox_sync FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_voice_inbox_sync" ON public.voice_inbox_sync;
-- clinic_consultations [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_consultations FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_consultations_tenant_isolation" ON public.clinic_consultations;
-- tender_payments [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.tender_payments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.tender_payments;
-- agent_contexts [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.agent_contexts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ac_allow_all" ON public.agent_contexts;
-- agent_memory [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.agent_memory FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "agent_memory_service" ON public.agent_memory;
-- analytics_hourly [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.analytics_hourly FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.analytics_hourly;
-- buying_committees [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.buying_committees FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "bc_all" ON public.buying_committees;
-- campaign_executions [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.campaign_executions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_campaign_executions" ON public.campaign_executions;
-- collections_compliance_log [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.collections_compliance_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "collections_compliance_log_tenant_access" ON public.collections_compliance_log;
-- collections_kpis [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.collections_kpis FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "collections_kpis_tenant_access" ON public.collections_kpis;
-- consent_log [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.consent_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "cl_all" ON public.consent_log;
-- do_not_contact [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.do_not_contact FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.do_not_contact;
-- email_verification [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.email_verification FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ev_read" ON public.email_verification;
DROP POLICY IF EXISTS "ev_write" ON public.email_verification;
-- estimation_drawing_pages [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_drawing_pages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_edp" ON public.estimation_drawing_pages;
-- estimation_room_details [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_room_details FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_rd" ON public.estimation_room_details;
DROP POLICY IF EXISTS "allow_write_rd" ON public.estimation_room_details;
-- estimation_room_polygons [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_room_polygons FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_erp" ON public.estimation_room_polygons;
-- estimation_spec_data [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_spec_data FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_sd" ON public.estimation_spec_data;
DROP POLICY IF EXISTS "allow_write_sd" ON public.estimation_spec_data;
-- estimation_supplier_pricing [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_supplier_pricing FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_estimation_supplier_pricing" ON public.estimation_supplier_pricing;
DROP POLICY IF EXISTS "allow_write_estimation_supplier_pricing" ON public.estimation_supplier_pricing;
-- estimation_transition_rules [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_transition_rules FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_tr" ON public.estimation_transition_rules;
DROP POLICY IF EXISTS "allow_write_tr" ON public.estimation_transition_rules;
-- estimation_waste_matrix [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_waste_matrix FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_wm" ON public.estimation_waste_matrix;
DROP POLICY IF EXISTS "allow_write_wm" ON public.estimation_waste_matrix;
-- field_job_cards [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.field_job_cards FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.field_job_cards;
-- instrument_registry [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.instrument_registry FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.instrument_registry;
-- lead_signals [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_signals FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ls_read" ON public.lead_signals;
DROP POLICY IF EXISTS "ls_write" ON public.lead_signals;
-- maintenance_contracts [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.maintenance_contracts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.maintenance_contracts;
-- multichannel_outreach [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.multichannel_outreach FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "mco_all" ON public.multichannel_outreach;
-- omega_alerts [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.omega_alerts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_omega_alerts" ON public.omega_alerts;
-- omega_campaigns [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.omega_campaigns FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_omega_campaigns" ON public.omega_campaigns;
-- onboarding_audit_log [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.onboarding_audit_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "oal_allow_all" ON public.onboarding_audit_log;
-- onboarding_module_status [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.onboarding_module_status FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "oms_allow_read" ON public.onboarding_module_status;
DROP POLICY IF EXISTS "oms_allow_write" ON public.onboarding_module_status;
-- ops_budget_actuals [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_budget_actuals FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_budget_actuals;
-- ops_budgets [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_budgets FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_budgets;
-- ops_compliance_log [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_compliance_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_compliance_log;
-- ops_compliance_rules [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_compliance_rules FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_ops_compliance_rules" ON public.ops_compliance_rules;
-- ops_cost_savings [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_cost_savings FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_cost_savings;
-- ops_demand_forecasts [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_demand_forecasts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_demand_forecasts;
-- ops_industry_configs [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_industry_configs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_industry_configs;
-- ops_inventory_items [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_inventory_items FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_inventory_items;
-- ops_inventory_movements [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_inventory_movements FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_inventory_movements;
-- ops_production_plans [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_production_plans FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_production_plans;
-- ops_production_tasks [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_production_tasks FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_production_tasks;
-- ops_purchase_orders [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_purchase_orders FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_purchase_orders;
-- ops_qc_checkpoints [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_qc_checkpoints FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_qc_checkpoints;
-- ops_qc_results [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_qc_results FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_qc_results;
-- ops_quality_alerts [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_quality_alerts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_ops_quality_alerts" ON public.ops_quality_alerts;
-- ops_quality_checks [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_quality_checks FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_ops_quality_checks" ON public.ops_quality_checks;
-- ops_shipment_events [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_shipment_events FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_shipment_events;
-- ops_shipments [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_shipments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_shipments;
-- ops_simulations [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_simulations FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_simulations;
-- ops_slas [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_slas FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_slas;
-- ops_vendor_performance [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_vendor_performance FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_vendor_performance;
-- ops_vendors [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_vendors FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_vendors;
-- security_deposits [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.security_deposits FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.security_deposits;
-- sequence_ab_tests [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sequence_ab_tests FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "sat_all" ON public.sequence_ab_tests;
-- service_visits [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.service_visits FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.service_visits;
-- tenant_audit_log [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.tenant_audit_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "tenant_audit_log_authenticated_read" ON public.tenant_audit_log;
-- tender_documents [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.tender_documents FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.tender_documents;
-- tender_stages [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.tender_stages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.tender_stages;
-- tenders [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.tenders FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.tenders;
-- user_roles [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.user_roles FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.user_roles;
-- users [BUCKET3_add_slug_iso]
CREATE POLICY "tenant_isolation_rls_fix" ON public.users FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.users;
-- tenant_config [STEP5 own-row]
CREATE POLICY "tenant_isolation_rls_fix" ON public.tenant_config FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Authenticated can read config" ON public.tenant_config;
