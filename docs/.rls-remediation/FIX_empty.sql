-- PHASE 2: empty-table isolation (applied)

-- clinic_health_analyses [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_health_analyses FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_health_analyses_all" ON public.clinic_health_analyses;
-- clinic_medical_reports [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_medical_reports FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_medical_reports_all" ON public.clinic_medical_reports;
-- clinic_medical_review_queue [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_medical_review_queue FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_medical_review_queue_all" ON public.clinic_medical_review_queue;
-- clinic_post_care_schedule [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_post_care_schedule FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_post_care_tenant_isolation" ON public.clinic_post_care_schedule;
-- clinic_prescriptions [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_prescriptions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_prescriptions_tenant_isolation" ON public.clinic_prescriptions;
-- clinic_video_scripts [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.clinic_video_scripts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "clinic_video_scripts_all" ON public.clinic_video_scripts;
-- workflow_health_log [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.workflow_health_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_auth_read" ON public.workflow_health_log;
-- credit_transactions [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.credit_transactions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Authenticated access" ON public.credit_transactions;
-- lead_gen_credit_logs [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_gen_credit_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "lead_gen_credit_logs_policy" ON public.lead_gen_credit_logs;
-- revenue_attribution [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.revenue_attribution FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.revenue_attribution;
DROP POLICY IF EXISTS "anon_read_revenue_attribution" ON public.revenue_attribution;
-- revenue_forecasts [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.revenue_forecasts FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.revenue_forecasts;
-- sales_deals [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sales_deals FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_deals;
-- ai_agent_conversations [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_agent_conversations FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "ai_agent_conv_read" ON public.ai_agent_conversations;
-- ai_agent_suggestions [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_agent_suggestions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "ai_agent_sugg_read" ON public.ai_agent_suggestions;
-- ai_agent_tasks [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_agent_tasks FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "ai_agent_tasks_read" ON public.ai_agent_tasks;
-- ai_feedback [character varying]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_feedback FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_feedback;
-- ai_generated_messages [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_generated_messages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_generated_messages;
-- ai_task_templates [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_task_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_task_templates;
-- ai_tasks [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ai_tasks FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.ai_tasks;
-- analytics_events [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.analytics_events FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.analytics_events;
-- api_usage_logs [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.api_usage_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "api_usage_logs_policy" ON public.api_usage_logs;
-- audit_log [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.audit_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.audit_log;
-- automation_audit_log [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.automation_audit_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.automation_audit_log;
-- automation_rules [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.automation_rules FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.automation_rules;
-- automation_settings [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.automation_settings FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.automation_settings;
-- autonomous_workflows [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.autonomous_workflows FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.autonomous_workflows;
-- business_insights [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.business_insights FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.business_insights;
-- call_queue [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.call_queue FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_access" ON public.call_queue;
-- call_records [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.call_records FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_call_records" ON public.call_records;
-- calls [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.calls FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.calls;
-- campaign_logs [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.campaign_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_logs;
-- campaign_metrics [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.campaign_metrics FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_metrics;
-- campaign_send_log [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.campaign_send_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_send_log;
-- campaign_templates [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.campaign_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaign_templates;
-- campaigns [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.campaigns FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.campaigns;
-- channel_configurations [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.channel_configurations FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.channel_configurations;
-- channel_messages [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.channel_messages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.channel_messages;
-- collections_field_visits [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.collections_field_visits FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "collections_field_visits_tenant_access" ON public.collections_field_visits;
-- comm_analytics_daily [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.comm_analytics_daily FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_read_comm_analytics" ON public.comm_analytics_daily;
DROP POLICY IF EXISTS "allow_write_comm_analytics" ON public.comm_analytics_daily;
-- companies [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.companies FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "companies_allow_all" ON public.companies;
-- competitor_analysis [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.competitor_analysis FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated read competitor_analysis" ON public.competitor_analysis;
-- competitor_intelligence [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.competitor_intelligence FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "ci_allow_all" ON public.competitor_intelligence;
-- consent [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.consent FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_consent" ON public.consent;
-- consent_records [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.consent_records FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.consent_records;
-- contact_channel_map [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.contact_channel_map FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_read_contact_channel_map" ON public.contact_channel_map;
DROP POLICY IF EXISTS "allow_write_contact_channel_map" ON public.contact_channel_map;
-- contact_engagement_patterns [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.contact_engagement_patterns FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_engagement_patterns" ON public.contact_engagement_patterns;
-- content_attribution [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.content_attribution FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_content_attribution" ON public.content_attribution;
-- content_performance [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.content_performance FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.content_performance;
-- conversation_merges [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.conversation_merges FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_conversation_merges" ON public.conversation_merges;
-- conversation_messages [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.conversation_messages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.conversation_messages;
-- conversation_ratings [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.conversation_ratings FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_read_conversation_ratings" ON public.conversation_ratings;
DROP POLICY IF EXISTS "allow_write_conversation_ratings" ON public.conversation_ratings;
-- conversation_tag_assignments [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.conversation_tag_assignments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_read_conv_tag_assign" ON public.conversation_tag_assignments;
DROP POLICY IF EXISTS "allow_write_conv_tag_assign" ON public.conversation_tag_assignments;
-- conversions [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.conversions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_access" ON public.conversions;
-- customer_360 [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_360 FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_360;
-- customer_identities [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_identities FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_identities;
-- customer_loyalty [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_loyalty FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for customer_loyalty" ON public.customer_loyalty;
-- customer_marketing_prefs [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_marketing_prefs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_marketing_prefs;
-- customer_relationships [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_relationships FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_relationships;
-- customer_reviews [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_reviews FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_reviews;
-- customer_timeline [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.customer_timeline FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.customer_timeline;
-- daily_metrics [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.daily_metrics FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.daily_metrics;
-- deal_activities [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.deal_activities FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_deal_activities" ON public.deal_activities;
-- delivery_connectors [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.delivery_connectors FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for delivery_connectors" ON public.delivery_connectors;
-- email_sequence_steps [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.email_sequence_steps FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.email_sequence_steps;
-- email_sequences [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.email_sequences FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.email_sequences;
-- employer_branding_content [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.employer_branding_content FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.employer_branding_content;
-- entity_links [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.entity_links FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.entity_links;
-- escalations [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.escalations FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_access" ON public.escalations;
-- estimation_learning_data [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_learning_data FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_learning" ON public.estimation_learning_data;
DROP POLICY IF EXISTS "tenant_read_learning" ON public.estimation_learning_data;
-- estimation_revisions [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.estimation_revisions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_estimation_revisions" ON public.estimation_revisions;
DROP POLICY IF EXISTS "allow_write_estimation_revisions" ON public.estimation_revisions;
-- hr_announcements [character varying]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_announcements FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_announcements;
-- hr_asset_assignments [character varying]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_asset_assignments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "hr_asset_read" ON public.hr_asset_assignments;
-- hr_audit_logs [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_audit_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_audit_logs;
-- hr_conversations [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_conversations FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_conversations;
-- hr_document_templates [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_document_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_document_templates;
-- hr_employee_documents [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_employee_documents FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_employee_documents;
-- hr_expense_claims [character varying]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_expense_claims FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Authenticated access" ON public.hr_expense_claims;
-- hr_interview_schedules [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_interview_schedules FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "hr_interview_schedules_access" ON public.hr_interview_schedules;
-- hr_payroll_periods [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_payroll_periods FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_payroll_periods;
-- hr_policy_acknowledgments [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_policy_acknowledgments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_policy_acknowledgments;
-- hr_recruitment_outreach [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_recruitment_outreach FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "hr_recruitment_outreach_access" ON public.hr_recruitment_outreach;
-- hr_survey_responses [character varying]
CREATE POLICY "tenant_isolation_rls_fix" ON public.hr_survey_responses FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.hr_survey_responses;
-- inbox_rotation_log [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.inbox_rotation_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rl_read" ON public.inbox_rotation_log;
DROP POLICY IF EXISTS "rl_write" ON public.inbox_rotation_log;
-- insurance_claims [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.insurance_claims FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_insurance_claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "allow_write_insurance_claims" ON public.insurance_claims;
-- landing_page_submissions [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.landing_page_submissions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "landing_page_submissions_all" ON public.landing_page_submissions;
-- lead_ai_analysis [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_ai_analysis FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "lead_ai_analysis_policy" ON public.lead_ai_analysis;
-- lead_gen_saved_searches [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_gen_saved_searches FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "lead_gen_saved_searches_policy" ON public.lead_gen_saved_searches;
-- lead_gen_search_logs [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_gen_search_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "lead_gen_search_logs_policy" ON public.lead_gen_search_logs;
-- lead_gen_searches [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_gen_searches FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "lead_gen_searches_all" ON public.lead_gen_searches;
-- lead_notifications [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.lead_notifications FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "notif_read" ON public.lead_notifications;
DROP POLICY IF EXISTS "notif_write" ON public.lead_notifications;
-- leads [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.leads FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.leads;
-- linkedin_outreach_queue [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.linkedin_outreach_queue FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.linkedin_outreach_queue;
-- marketing_analytics [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_analytics FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_analytics;
-- marketing_consent [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_consent FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "marketing_consent_all" ON public.marketing_consent;
-- marketing_performance_log [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_performance_log FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_mar" ON public.marketing_performance_log;
-- marketing_sequence_enrollments [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.marketing_sequence_enrollments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.marketing_sequence_enrollments;
-- media_library [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.media_library FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.media_library;
-- media_mentions [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.media_mentions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.media_mentions;
-- media_sources [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.media_sources FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.media_sources;
-- message_templates [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.message_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.message_templates;
-- notifications [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.notifications FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.notifications;
-- oauth_state_nonces [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.oauth_state_nonces FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "rls_service_all" ON public.oauth_state_nonces;
-- omega_approval_queue [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.omega_approval_queue FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_omega_approval_queue" ON public.omega_approval_queue;
-- omega_feedback [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.omega_feedback FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_omega_feedback" ON public.omega_feedback;
-- onboarding_checklists [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.onboarding_checklists FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Authenticated access" ON public.onboarding_checklists;
-- onboarding_retry_queue [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.onboarding_retry_queue FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "orq_allow_all" ON public.onboarding_retry_queue;
-- ops_agent_performance [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.ops_agent_performance FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all" ON public.ops_agent_performance;
-- orchestrator_events [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.orchestrator_events FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_all_access" ON public.orchestrator_events;
-- packages [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.packages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.packages;
-- page_analytics [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.page_analytics FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "anon_insert_pa" ON public.page_analytics;
DROP POLICY IF EXISTS "auth_all_page_analytics" ON public.page_analytics;
-- pending_actions [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.pending_actions FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Authenticated access" ON public.pending_actions;
DROP POLICY IF EXISTS "allow_all_pending_actions" ON public.pending_actions;
-- predictive_scores [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.predictive_scores FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.predictive_scores;
-- premium_pages [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.premium_pages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "auth_all_premium_pages" ON public.premium_pages;
-- pricing_logs [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.pricing_logs FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.pricing_logs;
-- providers [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.providers FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.providers;
-- rate_limits [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.rate_limits FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.rate_limits;
-- recruitment_campaigns [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.recruitment_campaigns FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.recruitment_campaigns;
-- restaurant_inventory [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.restaurant_inventory FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for restaurant_inventory" ON public.restaurant_inventory;
-- restaurant_kitchen_display [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.restaurant_kitchen_display FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for restaurant_kitchen_display" ON public.restaurant_kitchen_display;
-- restaurant_orders [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.restaurant_orders FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "Allow all for restaurant_orders" ON public.restaurant_orders;
-- review_response_templates [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.review_response_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.review_response_templates;
-- sales_analytics_daily [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sales_analytics_daily FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_analytics_daily;
-- sales_calls [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sales_calls FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "tenant_isolation" ON public.sales_calls;
-- sales_lead_assignments [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.sales_lead_assignments FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "Allow authenticated" ON public.sales_lead_assignments;
-- scheduled_messages [uuid]
CREATE POLICY "tenant_isolation_rls_fix" ON public.scheduled_messages FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = get_user_tenant_uuid()));
DROP POLICY IF EXISTS "allow_all_scheduled_messages" ON public.scheduled_messages;
-- video_templates [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.video_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "anon_read_video_templates" ON public.video_templates;
DROP POLICY IF EXISTS "auth_read_video_templates" ON public.video_templates;
-- warranty_tracking [text]
CREATE POLICY "tenant_isolation_rls_fix" ON public.warranty_tracking FOR ALL TO public USING ((auth.role() = 'service_role'::text) OR (tenant_id = (get_user_tenant_uuid())::text) OR (tenant_id = get_user_tenant_id()));
DROP POLICY IF EXISTS "allow_read_warranty" ON public.warranty_tracking;
DROP POLICY IF EXISTS "allow_write_warranty" ON public.warranty_tracking;