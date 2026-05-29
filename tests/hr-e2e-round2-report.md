# HR E2E Round 2 — zateceptionist tenant
Timestamp: 2026-05-23T00:13:13.066Z
Base URL:  https://ai.zatesystems.com
Tenant:    zateceptionist (adeel@zatesystems.com)
Pages tested: 18

## Verdict counts
- PASS: 18

## Per-page results
### /hr/dashboard — PASS
- name: HR Dashboard
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/dashboard
- content_length: 3183
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    card_count: 20
    kpi_numbers: 7
    attrition_widget: true
    compensation_widget: true
    needs_attention: false
    has_chart: false
    employee_count_text: null
    mentions_12: false
    mentions_6_depts: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\01_hr_dashboard.png

### /hr/employees — PASS
- name: Employees
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/employees
- content_length: 3035
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 0
    card_count: 29
    data_count: 29
    add_button: true
    search_input: true
    dept_filter: true
    has_real_names: true
    has_employee_link: false
- screenshot: screenshots\2026-05-21-hr-round2-zate\02_employees.png

### /hr/attendance — PASS
- name: Attendance
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/attendance
- content_length: 1203
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 0
    card_count: 9
    data_count: 9
    export_button: true
    filter_select: true
    date_input: true
    records_text: null
- screenshot: screenshots\2026-05-21-hr-round2-zate\04_attendance.png

### /hr/shifts — PASS
- name: Shifts
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/shifts
- content_length: 1134
- page_errors: 0
- console_errors: 9
  - Failed to load resource: net::ERR_SOCKET_NOT_CONNECTED | Error fetching tenant config: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
    at https://ai.zates…atesystems.com/assets/index-ahawwjOO.js:751:52135, hint: , code: } | Failed to load resource: net::ERR_SOCKET_NOT_CONNECTED
- net_errors: 0
- signals:
    grid_present: true
    shift_blocks: 1
    card_count: 7
    data_count: 8
    create_button: false
    empty_state: false
- screenshot: screenshots\2026-05-21-hr-round2-zate\05_shifts.png

### /hr/leave — PASS
- name: Leave
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/leave
- content_length: 3541
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 9
    card_count: 44
    data_count: 53
    request_button: true
    approve_button: false
    reject_button: false
    request_form_fields: 1
    request_form_has_dropdowns: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\06_leave.png

### /hr/payroll — PASS
- name: Payroll
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/payroll
- content_length: 2251
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 21
    card_count: 9
    data_count: 30
    run_payroll_btn: true
    has_currency_format: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\07_payroll.png

### /hr/departments — PASS
- name: Departments
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/departments
- content_length: 1363
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    card_count: 13
    data_count: 13
    mentions_6: false
    org_chart_tab: true
    add_dept_btn: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\08_departments.png

### /hr/performance — PASS
- name: Performance
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/performance
- content_length: 1521
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 0
    card_count: 8
    data_count: 8
    create_review_btn: true
    mentions_goals: true
    mentions_kpi: false
- screenshot: screenshots\2026-05-21-hr-round2-zate\09_performance.png

### /hr/training — PASS
- name: Training
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/training
- content_length: 1621
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 0
    card_count: 12
    data_count: 12
    create_button: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\10_training.png

### /hr/recruitment — PASS
- name: Recruitment
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/recruitment
- content_length: 1774
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 0
    card_count: 14
    data_count: 14
    post_job_btn: true
    tabs_found: ["Pipeline","Candidates","Board","Jobs","Offers"]
    post_job_form_fields: 7
    pipeline_stages_found: ["applied","screening","interview","technical","final","offer","hired"]
- screenshot: screenshots\2026-05-21-hr-round2-zate\11_recruitment.png

### /hr/compliance — PASS
- name: Compliance
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/compliance
- content_length: 1361
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    uae_tabs_found: ["Emiratisation","Visa","WPS","Medical","Labor","Gratuity"]
    card_count: 11
    data_count: 11
    mentions_33: false
    mentions_gratuity: true
    gratuity_inputs: 2
    gratuity_calc_btn: false
- screenshot: screenshots\2026-05-21-hr-round2-zate\12_compliance.png

### /hr/documents — PASS
- name: Documents
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/documents
- content_length: 2004
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    table_rows: 8
    card_count: 9
    data_count: 17
    upload_btn: true
    has_expiry_badges: false
- screenshot: screenshots\2026-05-21-hr-round2-zate\13_documents.png

### /hr/reports — PASS
- name: Reports
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/reports
- content_length: 1625
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    card_count: 14
    charts: 2
    tables: 0
    data_count: 2
    mentions_headcount: true
    mentions_turnover: true
    mentions_tenure: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\14_reports.png

### /hr/ai-assistant — PASS
- name: HR AI Assistant
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-assistant
- content_length: 1828
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    chat_input: true
    data_count: 1
    send_button: true
    ai_responded: false
    transcript_length: 2339
- screenshot: screenshots\2026-05-21-hr-round2-zate\15_ai_assistant.png

### /hr/ai-agents — PASS
- name: AI Workforce
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-agents
- content_length: 2366
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    card_count: 14
    data_count: 14
    hire_button: true
    tabs: 0
- screenshot: screenshots\2026-05-21-hr-round2-zate\16_ai_workforce.png

### /hr/ai-agents/hire — PASS
- name: Hire AI Agent
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-agents/hire
- content_length: 1428
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    tabs_found: ["Describe","Choose"]
    textarea: true
    chips: 33
    template_cards: 4
    data_count: 4
    textarea_accepts_input: true
- screenshot: screenshots\2026-05-21-hr-round2-zate\17_ai_hire.png

### /hr/ai-agents/analytics — PASS
- name: AI Analytics
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-agents/analytics
- content_length: 1072
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    card_count: 6
    charts: 0
    kpis: 4
    data_count: 10
- screenshot: screenshots\2026-05-21-hr-round2-zate\18_ai_analytics.png

### /hr/dashboard — PASS
- name: Sidebar Inspection
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/dashboard
- content_length: 3183
- page_errors: 0
- console_errors: 0
- net_errors: 0
- signals:
    groups_found: ["People","Talent","Operations","AI Workforce"]
    hr_link_count: 18
    data_count: 18
    distinct_hr_hrefs: ["/hr/ai-assistant","/hr/ai-assistant?q=Create%20a%20360-degree%20manager%20feedback%20survey","/hr/ai-assistant?q=Generate%20a%2030-day%20onboarding%20satisfaction%20survey","/hr/ai-assistant?q=Prepare%20exit%20interview%20questions%20for%20a%20departing%20employee","/hr/ai-assistant?q=Run%20an%20employee%20engagement%20pulse%20survey%20for%20my%20team","/hr/attendance","/hr/compliance","/hr/employees","/hr/leave","/hr/payroll","/hr/performance","/hr/recruitment","/hr/training"]
- screenshot: screenshots\2026-05-21-hr-round2-zate\19_sidebar.png
