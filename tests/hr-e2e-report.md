# HR E2E Verification Report
Timestamp: 2026-05-20T11:49:23.457Z
Base URL:  https://ai.zatesystems.com
Tenant:    cosmique (from saved auth-state)
Pages tested: 18

## Verdict counts
- PASS: 10
- EMPTY: 8

## Per-page results
### /hr/dashboard — PASS
- name: HR Dashboard
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/dashboard
- content_length: 2591
- page_errors: 0
- console_errors: 2
  - Failed to load resource: the server responded with a status of 400 () | Failed to load resource: the server responded with a status of 400 ()
- signals:
    card_count: 17
    kpi_numbers: 8
    attrition_widget: true
    compensation_widget: true
    needs_attention: false
    has_chart: false
- screenshot: screenshots\2026-05-20-hr-e2e\01_hr_dashboard.png

### /hr/employees — PASS
- name: Employees
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/employees
- content_length: 1373
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 0
    card_rows: 0
    add_button: true
    search_input: true
    dept_filter: false
    has_employee_link: false
- screenshot: screenshots\2026-05-20-hr-e2e\02_employees.png

### /hr/attendance — PASS
- name: Attendance
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/attendance
- content_length: 1446
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 0
    export_button: true
    filter_select: false
    date_input: true
- screenshot: screenshots\2026-05-20-hr-e2e\04_attendance.png

### /hr/shifts — PASS
- name: Shifts
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/shifts
- content_length: 1398
- page_errors: 0
- console_errors: 1
  - Failed to load resource: the server responded with a status of 404 ()
- signals:
    grid_present: true
    shift_blocks: 1
    create_button: false
    empty_state: false
- screenshot: screenshots\2026-05-20-hr-e2e\05_shifts.png

### /hr/leave — PASS
- name: Leave
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/leave
- content_length: 1849
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 0
    request_button: true
    approve_button: false
    reject_button: false
    request_form_fields: 0
- screenshot: screenshots\2026-05-20-hr-e2e\06_leave.png

### /hr/payroll — PASS
- name: Payroll
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/payroll
- content_length: 1527
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 1
    card_count: 7
    run_payroll_btn: true
    has_amount_format: true
- screenshot: screenshots\2026-05-20-hr-e2e\07_payroll.png

### /hr/departments — EMPTY
- name: Departments
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/departments
- content_length: 1172
- page_errors: 0
- console_errors: 0
- signals:
    card_count: 0
    org_chart_tab: true
    add_dept_btn: true
- screenshot: screenshots\2026-05-20-hr-e2e\08_departments.png

### /hr/performance — EMPTY
- name: Performance
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/performance
- content_length: 1277
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 0
    card_count: 0
    create_review_btn: true
    has_goals: true
- screenshot: screenshots\2026-05-20-hr-e2e\09_performance.png

### /hr/training — EMPTY
- name: Training
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/training
- content_length: 1175
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 0
    card_count: 0
    create_button: false
- screenshot: screenshots\2026-05-20-hr-e2e\10_training.png

### /hr/recruitment — EMPTY
- name: Recruitment
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/recruitment
- content_length: 1216
- page_errors: 0
- console_errors: 2
  - Failed to load resource: the server responded with a status of 400 () | Failed to load resource: the server responded with a status of 400 ()
- signals:
    table_rows: 0
    card_count: 0
    post_job_btn: true
    tabs_found: ["Pipeline","Candidates","Board","Jobs"]
    post_job_form_fields: 7
- screenshot: screenshots\2026-05-20-hr-e2e\11_recruitment.png

### /hr/compliance — EMPTY
- name: Compliance
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/compliance
- content_length: 1317
- page_errors: 0
- console_errors: 0
- signals:
    uae_tabs_found: ["Emiratisation","Visa","WPS","Medical","Labor","Gratuity"]
    gratuity_calc_btn: true
    card_count: 0
- screenshot: screenshots\2026-05-20-hr-e2e\12_compliance.png

### /hr/documents — PASS
- name: Documents
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/documents
- content_length: 1255
- page_errors: 0
- console_errors: 0
- signals:
    table_rows: 0
    upload_btn: true
- screenshot: screenshots\2026-05-20-hr-e2e\13_documents.png

### /hr/reports — EMPTY
- name: Reports
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/reports
- content_length: 1655
- page_errors: 0
- console_errors: 0
- signals:
    card_count: 0
    charts: 0
    tables: 0
- screenshot: screenshots\2026-05-20-hr-e2e\14_reports.png

### /hr/ai-assistant — PASS
- name: HR AI Assistant
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-assistant
- content_length: 2089
- page_errors: 0
- console_errors: 0
- signals:
    chat_input: false
- screenshot: screenshots\2026-05-20-hr-e2e\15_ai_assistant.png

### /hr/ai-agents — EMPTY
- name: AI Workforce
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-agents
- content_length: 2579
- page_errors: 0
- console_errors: 0
- signals:
    card_count: 0
    hire_button: true
    tabs: 4
- screenshot: screenshots\2026-05-20-hr-e2e\16_ai_workforce.png

### /hr/ai-agents/hire — PASS
- name: Hire AI Agent
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-agents/hire
- content_length: 1689
- page_errors: 0
- console_errors: 0
- signals:
    tabs_found: ["Describe","Choose"]
    textarea: true
    chips: 41
    template_cards: 0
    textarea_accepts_input: true
- screenshot: screenshots\2026-05-20-hr-e2e\17_ai_hire.png

### /hr/ai-agents/analytics — EMPTY
- name: AI Analytics
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/ai-agents/analytics
- content_length: 1297
- page_errors: 0
- console_errors: 0
- signals:
    card_count: 0
    charts: 0
    kpis: 5
- screenshot: screenshots\2026-05-20-hr-e2e\18_ai_analytics.png

### /hr/dashboard — PASS
- name: Sidebar Inspection
- loaded: true  http: 200  err_boundary: false
- final URL: https://ai.zatesystems.com/hr/dashboard
- content_length: 2591
- page_errors: 0
- console_errors: 2
  - Failed to load resource: the server responded with a status of 400 () | Failed to load resource: the server responded with a status of 400 ()
- signals:
    groups_found: []
    hr_link_count: 17
    distinct_hr_hrefs: ["/hr/employees","/hr/leave","/hr/recruitment","/hr/departments","/hr/attendance","/hr/payroll","/hr/ai-assistant","/hr/compliance","/hr/performance","/hr/training","/hr/ai-assistant?q=Run%20an%20employee%20engagement%20pulse%20survey%20for%20my%20team","/hr/ai-assistant?q=Create%20a%20360-degree%20manager%20feedback%20survey","/hr/ai-assistant?q=Generate%20a%2030-day%20onboarding%20satisfaction%20survey","/hr/ai-assistant?q=Prepare%20exit%20interview%20questions%20for%20a%20departing%20employee"]
- screenshot: screenshots\2026-05-20-hr-e2e\19_sidebar.png
