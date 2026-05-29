# No-Tenant-Column Triage Plan (Phase 3, read-only)

93 tables carry a broad `USING(true)` policy but have **no `tenant_id` column**, so Phase 1/2 could not auto-isolate them. Categorized below into an action plan. **No changes were made to these tables.**

## GLOBAL_leave_open (26)

| Table | Rows | Recommendation | Leak policy |
|---|---:|---|---|
| `ai_agent_templates` | 10 | global reference — keep SELECT open; restrict WRITE to service_role | ai_agent_templates_read |
| `apify_actors` | 0 | global reference — keep SELECT open; restrict WRITE to service_role | Public read |
| `business_settings` | 0 | global reference — keep SELECT open; restrict WRITE to service_role | Allow authenticated |
| `consent_templates` | 0 | global reference — keep SELECT open; restrict WRITE to service_role | Public read |
| `countries` | 65 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `default_checklist_items` | 19 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `industry_campaign_templates` | 0 | global reference — keep SELECT open; restrict WRITE to service_role | Public read |
| `industry_lead_scoring` | 0 | global reference — keep SELECT open; restrict WRITE to service_role | Public read |
| `industry_templates` | 19 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `industry_vip_criteria` | 0 | global reference — keep SELECT open; restrict WRITE to service_role | Public read |
| `ivr_templates` | 10 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `marketing_personas` | 3 | global reference — keep SELECT open; restrict WRITE to service_role | Allow authenticated |
| `marketing_playbooks` | 30 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `marketing_sequence_templates` | 9 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_all |
| `ops_industry_benchmarks` | 9 | global reference — keep SELECT open; restrict WRITE to service_role | allow_all |
| `ops_region_configs` | 4 | global reference — keep SELECT open; restrict WRITE to service_role | allow_all |
| `ops_templates` | 2 | global reference — keep SELECT open; restrict WRITE to service_role | allow_all |
| `page_templates` | 12 | global reference — keep SELECT open; restrict WRITE to service_role | anon_read_pt, auth_all_page_templates |
| `permissions` | 54 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `re_region_config` | 8 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `re_training_knowledge` | 28 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `roles` | 5 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `subscription_plans` | 4 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `subscription_tiers` | 3 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_all |
| `task_automation_rules_template` | 21 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_read |
| `voice_prompt_templates` | 15 | global reference — keep SELECT open; restrict WRITE to service_role | rls_auth_all |

## USER_scopable (2)

| Table | Rows | Recommendation | Leak policy |
|---|---:|---|---|
| `client_packages` | 0 | scope by user_id/created_by = auth.uid() | Allow authenticated |
| `profiles` | 1 | scope by user_id/created_by = auth.uid() | Allow authenticated |

## FK_scopable (7)

| Table | Rows | Recommendation | Leak policy |
|---|---:|---|---|
| `ab_test_events` | 0 | FK-scope via ab_tests (test_id) | ab_test_events_all |
| `ai_team_recommendations` | 0 | FK-scope via users (applied_by) | Allow authenticated |
| `ops_po_line_items` | 23 | FK-scope via ops_inventory_items (item_id) | allow_all |
| `role_permissions` | 270 | FK-scope via users (granted_by) | rls_auth_read |
| `team_activity_logs` | 8 | FK-scope via users (actor_id) | rls_auth_all |
| `team_invitations` | 7 | FK-scope via users (invited_by) | rls_auth_all |
| `team_members` | 3 | FK-scope via users (deactivated_by) | rls_auth_all |

## AMBIGUOUS_flag (58)

| Table | Rows | Recommendation | Leak policy |
|---|---:|---|---|
| `accounting_companies_house_cache` | 445 | manual review — no tenant/user/FK scope detected | ch_cache_authenticated_read |
| `aeo_query_library` | 58 | manual review — no tenant/user/FK scope detected | anyone_read_aeo_ql |
| `analytics` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `call_logs` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `campaign_media` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `company_policies` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `competitor_prices` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `content_calendar` | 0 | manual review — no tenant/user/FK scope detected | content_calendar_all |
| `content_versions` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `conversion_events` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `enrichment_api_usage` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `follow_up_tasks` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `follow_up_tracking` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `follow_ups` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `google_reviews` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `inbound_messages` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `internal_notes` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `inventory_items` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `inventory_stock` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `inventory_transactions` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `journey_stages` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `lead_generation_jobs` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `leave_requests` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `lovable_sync` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `marketing_agencies` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `marketing_api_usage` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `marketing_touchpoints` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `n8n_chat_histories` | 104 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `organizations` | 6 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `package_items` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `patient_visits` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `patient_vitals` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `pricing_analytics` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `pricing_rules` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `re_cross_border_rules` | 13 | manual review — no tenant/user/FK scope detected | rls_auth_read |
| `re_mortgage_banks` | 9 | manual review — no tenant/user/FK scope detected | rls_auth_read |
| `reminders` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `reviews` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `sales_emails` | 0 | manual review — no tenant/user/FK scope detected | Allow authenticated |
| `signed_consents` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `staff` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `staff_chats` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `staff_conversations` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `staff_members` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `staff_schedules` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `storm_events` | 0 | manual review — no tenant/user/FK scope detected | allow_read_storm, allow_write_storm |
| `task_execution_log` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `team_member_notifications` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `tenants` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `treatment_media` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `treatment_notes` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `treatment_records` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `trending_topics` | 0 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `voice_packages` | 4 | manual review — no tenant/user/FK scope detected | rls_auth_read |
| `voice_phone_pool` | 1 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `voice_provider_config` | 13 | manual review — no tenant/user/FK scope detected | rls_auth_all |
| `website_cta_clicks` | 26 | manual review — no tenant/user/FK scope detected | anon_insert_clicks |
| `website_leads` | 2 | manual review — no tenant/user/FK scope detected | anon_insert_leads |

## Notes
- **GLOBAL_leave_open**: shared reference data (countries, roles, plans, templates…). A broad SELECT is usually correct; the only hardening is restricting INSERT/UPDATE/DELETE to `service_role`.
- **USER_scopable**: have a `user_id`/`created_by` — scope rows to `auth.uid()` (and tenant transitively via the user).
- **FK_scopable**: have a FK to a tenant-scoped parent — scope via an `EXISTS` against the parent's `tenant_id` (same pattern as the PHI recommendation).
- **AMBIGUOUS_flag**: no detectable scope key — require a human design decision.