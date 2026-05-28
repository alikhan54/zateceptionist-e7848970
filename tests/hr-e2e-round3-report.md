# HR E2E Round 3 — Interactive Verification
Timestamp: 2026-05-23T00:18:13.535Z
Tenant:    zateceptionist

## Verdict counts
- WORKING: 7
- PARTIAL: 1

## Per-test results
### 3A Create employee — WORKING
- route: /hr/employees
- add_button_visible: true
- dialog_opened: true
- submit_button_visible: true
- webhook_fired: true
- webhook_status: 200
- webhook_body_preview: "{\"success\":true,\"employee\":{\"id\":\"9720e0e2-6493-43d3-83be-e5f71367dc4c\",\"employee_id\":\"EMP-2026-DL78X1\",\"first_name\":\"Playwright\",\"last_name\":\"Test1779495194162\",\"company_email\"...
- test_name_in_list: true
- test_email_in_list: false
- webhook_calls:
    - 200 https://webhooks.zatesystems.com/webhook/hr/employee-onboarding-v2
- screenshot: screenshots\2026-05-22-hr-round3\3A_after_create.png

### 3B Submit leave — WORKING
- route: /hr/leave
- request_button_visible: true
- dialog_opened: true
- day_button_count: 35
- clicked_indices: [21,23]
- submit_visible: true
- webhook_fired: true
- webhook_status: 200
- webhook_body_preview: "{\"success\":true,\"leave_request\":{\"id\":\"498ed489-2213-4b7b-8a1b-a716d15f74eb\",\"employee_id\":\"9720e0e2-6493-43d3-83be-e5f71367dc4c\",\"leave_type\":\"Leave\",\"start_date\":\"2026-06-16\",\"...
- reason_in_list: true
- webhook_calls:
    - 200 https://webhooks.zatesystems.com/webhook/hr/leave/request-v2
- screenshot: screenshots\2026-05-22-hr-round3\3B_after_submit.png

### 3C Post a job — PARTIAL
- route: /hr/recruitment
- post_button_visible: true
- dialog_opened: true
- submit_visible: true
- job_in_list: false
- notes:
    - Job not visible in Jobs tab list (DB shows it persisted — UI may filter/cache)
- screenshot: screenshots\2026-05-22-hr-round3\3C_after_post.png

### 3D Hire AI agent — WORKING
- route: /hr/ai-agents/hire
- textarea_visible: true
- hire_button_visible: true
- url_changed: true
- final_url: "https://ai.zatesystems.com/hr/ai-agents/1be189bd-39c7-434b-93f0-be9f28a5f457"
- webhook_calls:
    - 200 https://webhooks.zatesystems.com/webhook/hr/ai-agent/create
- screenshot: screenshots\2026-05-22-hr-round3\3D_agent_profile.png

### 3E AI assistant chat — WORKING
- route: /hr/ai-assistant
- chat_input_visible: true
- response_chars_after_question: 391
- response_received: true
- screenshot: screenshots\2026-05-22-hr-round3\3E_after_send.png

### 3F Employee profile tabs — WORKING
- route: /hr/employees/:id
- clicked_name: "Ahmed"
- url: "https://ai.zatesystems.com/hr/employees/23b3d10f-316f-41b2-a64c-7f8e58eb51ee"
- on_profile_page: true
- tabs: {"Overview":{"present":true,"contentLen":1339,"hasData":true},"Personal":{"present":true,"contentLen":1440,"hasData":true},"Employment":{"present":true,"contentLen":1304,"hasData":true},"Leave":{"pres...
- tabs_present: 7
- tabs_with_data: 6
- screenshot: screenshots\2026-05-22-hr-round3\3F_profile_final.png

### 3G Gratuity calculator — WORKING
- route: /hr/compliance
- tab_visible: true
- salary_input_visible: true
- years_input_visible: true
- amount_candidates: ["AED 52,500","AED 15,000","AED 500","AED 52,500"]
- has_total_label: true
- screenshot: screenshots\2026-05-22-hr-round3\3G_gratuity_result.png

### 3H Sidebar HR groups — WORKING
- route: /hr/dashboard
- groups: {"People":{"group_visible":true,"group_button_present":true,"child_visible":true,"child_navigated":true},"Talent":{"group_visible":true,"group_button_present":true,"child_visible":true,"child_navigate...
- groups_found: 4
- children_navigated: 4
- screenshot: screenshots\2026-05-22-hr-round3\3H_sidebar_after.png
