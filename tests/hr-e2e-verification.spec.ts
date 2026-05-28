/**
 * HR end-to-end verification (2026-05-20).
 *
 * Walks every HR route in App.tsx, in a real browser, with the currently
 * saved auth-state. Reports: page load, error boundary, data presence,
 * key buttons, key tabs. Does NOT mutate data; forms are opened but never
 * submitted. Screenshots full-page for every route + every profile tab.
 *
 * Tenant under test is whichever the saved auth-state belongs to (currently:
 * `cosmique`). HR is a standard section — every tenant gets it — so empty
 * tables are themselves a finding (showcase vs working).
 *
 * Results JSON written to tests/hr-e2e-results.json.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-20-hr-e2e');
const RESULTS_PATH = path.join(__dirname, 'hr-e2e-results.json');

interface PageResult {
  route: string;
  name: string;
  loaded: boolean;
  http_status?: number;
  url_after_load: string;
  has_error_boundary: boolean;
  page_errors: string[];
  console_errors: string[];
  content_length: number;
  signals: Record<string, string | number | boolean | string[]>;
  screenshot: string;
  notes: string[];
  verdict: 'PASS' | 'EMPTY' | 'SHOWCASE' | 'BROKEN' | 'PARTIAL';
}

const results: PageResult[] = [];

async function visitAndDiagnose(
  page: Page,
  route: string,
  name: string,
  shotName: string,
  probe: (p: Page, signals: Record<string, any>, notes: string[]) => Promise<void>,
): Promise<PageResult> {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const signals: Record<string, any> = {};
  const notes: string[] = [];

  const onError = (e: Error) => pageErrors.push(`PAGEERROR: ${e.message}`);
  const onConsole = (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  };
  page.on('pageerror', onError);
  page.on('console', onConsole);

  let loaded = false;
  let httpStatus: number | undefined;
  let urlAfter = '';
  let contentLen = 0;
  let hasErrBoundary = false;

  try {
    const resp = await page.goto(route, { waitUntil: 'networkidle', timeout: 25_000 });
    httpStatus = resp?.status();
    loaded = true;
  } catch (e: any) {
    notes.push(`navigation: ${e.message}`);
  }

  await page.waitForTimeout(2500); // let data fetch
  urlAfter = page.url();

  // Generic checks
  const bodyText = (await page.textContent('body').catch(() => '')) ?? '';
  contentLen = bodyText.length;

  // Error boundary detection
  const errBoundaryHints = [
    /Something went wrong/i,
    /Application error/i,
    /Failed to load/i,
    /ChunkLoadError/i,
    /Error boundary/i,
  ];
  for (const re of errBoundaryHints) {
    if (re.test(bodyText)) {
      hasErrBoundary = true;
      notes.push(`error-boundary text matched: ${re}`);
      break;
    }
  }

  // 404 redirect detection
  if (urlAfter.includes('/404') || /Page not found|404/i.test(bodyText.slice(0, 500))) {
    notes.push('404 detected');
    hasErrBoundary = true;
  }

  try {
    await probe(page, signals, notes);
  } catch (e: any) {
    notes.push(`probe-error: ${e.message}`);
  }

  // Screenshot
  const shotPath = path.join(SHOT_DIR, shotName);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch (e: any) {
    notes.push(`screenshot-error: ${e.message}`);
  }

  page.off('pageerror', onError);
  page.off('console', onConsole);

  let verdict: PageResult['verdict'] = 'PASS';
  if (!loaded || hasErrBoundary) verdict = 'BROKEN';
  else if (signals.row_count === 0 || signals.card_count === 0) verdict = 'EMPTY';
  if (signals.no_handlers === true) verdict = 'SHOWCASE';
  if (notes.some(n => n.startsWith('probe-error'))) verdict = 'PARTIAL';

  const result: PageResult = {
    route,
    name,
    loaded,
    http_status: httpStatus,
    url_after_load: urlAfter,
    has_error_boundary: hasErrBoundary,
    page_errors: pageErrors,
    console_errors: consoleErrors.slice(0, 10),
    content_length: contentLen,
    signals,
    screenshot: path.relative(__dirname, shotPath),
    notes,
    verdict,
  };
  results.push(result);
  return result;
}

async function countEls(page: Page, selector: string): Promise<number> {
  return (await page.$$(selector)).length;
}

async function textPresent(page: Page, txt: string): Promise<boolean> {
  return !!(await page.$(`text=${txt}`));
}

test.use({ storageState: path.join(__dirname, '.auth-state.json') });

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
});

test.afterAll(() => {
  const summary = {
    timestamp: new Date().toISOString(),
    base_url: process.env.E2E_BASE_URL || 'https://ai.zatesystems.com',
    tenant_under_test: 'cosmique (from saved auth-state)',
    pages_tested: results.length,
    by_verdict: results.reduce((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    results,
  };
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(summary, null, 2));
  // also write a human-readable report
  const lines: string[] = [];
  lines.push('# HR E2E Verification Report');
  lines.push(`Timestamp: ${summary.timestamp}`);
  lines.push(`Base URL:  ${summary.base_url}`);
  lines.push(`Tenant:    ${summary.tenant_under_test}`);
  lines.push(`Pages tested: ${summary.pages_tested}`);
  lines.push('');
  lines.push('## Verdict counts');
  for (const [k, v] of Object.entries(summary.by_verdict)) lines.push(`- ${k}: ${v}`);
  lines.push('');
  lines.push('## Per-page results');
  for (const r of results) {
    lines.push(`### ${r.route} — ${r.verdict}`);
    lines.push(`- name: ${r.name}`);
    lines.push(`- loaded: ${r.loaded}  http: ${r.http_status ?? '-'}  err_boundary: ${r.has_error_boundary}`);
    lines.push(`- final URL: ${r.url_after_load}`);
    lines.push(`- content_length: ${r.content_length}`);
    lines.push(`- page_errors: ${r.page_errors.length}`);
    lines.push(`- console_errors: ${r.console_errors.length}`);
    if (r.console_errors.length) lines.push(`  - ${r.console_errors.slice(0, 3).join(' | ')}`);
    lines.push(`- signals:`);
    for (const [k, v] of Object.entries(r.signals)) lines.push(`    ${k}: ${JSON.stringify(v)}`);
    if (r.notes.length) {
      lines.push(`- notes:`);
      for (const n of r.notes) lines.push(`    - ${n}`);
    }
    lines.push(`- screenshot: ${r.screenshot}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(__dirname, 'hr-e2e-report.md'), lines.join('\n'));
});

test('HR1: /hr/dashboard', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/dashboard', 'HR Dashboard', '01_hr_dashboard.png', async (p, s, notes) => {
    s.card_count = await countEls(p, '[class*="card"], [data-slot="card"]');
    s.kpi_numbers = await countEls(p, '[class*="text-2xl"], [class*="text-3xl"]');
    s.attrition_widget = await textPresent(p, 'Attrition');
    s.compensation_widget = await textPresent(p, 'Compensation');
    s.needs_attention = await textPresent(p, 'Needs Attention') || await textPresent(p, 'Alerts');
    s.has_chart = (await countEls(p, 'canvas, svg.recharts-surface, [class*="recharts"]')) > 0;
  });
});

test('HR2: /hr/employees + drill-in', async ({ page }) => {
  const r = await visitAndDiagnose(page, '/hr/employees', 'Employees', '02_employees.png', async (p, s, notes) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.card_rows = await countEls(p, '[class*="employee"], [data-slot="card"]');
    s.add_button = !!(await p.$('button:has-text("Add"), button:has-text("New"), button:has-text("Create")'));
    s.search_input = !!(await p.$('input[placeholder*="earch" i], input[type="search"]'));
    s.dept_filter = !!(await p.$('select, [class*="select-trigger"]'));
    // Grab first employee link if any
    const empLink = await p.$('a[href*="/hr/employees/"]');
    s.has_employee_link = !!empLink;
    if (empLink) {
      const href = await empLink.getAttribute('href');
      s.first_employee_href = href ?? '';
    }
  });

  // Drill into first employee if we can
  if (r.signals.first_employee_href) {
    const href = r.signals.first_employee_href as string;
    await visitAndDiagnose(page, href, `Employee Profile (${href})`, '03_employee_profile.png', async (p, s, notes) => {
      // Tab labels we expect
      const tabLabels = ['Overview', 'Personal', 'Employment', 'Leave', 'Performance', 'Documents', 'Assets'];
      const tabsFound: string[] = [];
      for (const lbl of tabLabels) {
        const t = await p.$(`[role="tab"]:has-text("${lbl}"), button:has-text("${lbl}")`);
        if (t) tabsFound.push(lbl);
      }
      s.tabs_found = tabsFound;
      s.tab_count = tabsFound.length;
      s.ask_ai_button = !!(await p.$('button:has-text("Ask AI"), button:has-text("AI")'));

      // Click each tab and screenshot content
      for (const lbl of tabsFound) {
        const tab = await p.$(`[role="tab"]:has-text("${lbl}"), button:has-text("${lbl}")`);
        if (tab) {
          await tab.click().catch(() => {});
          await p.waitForTimeout(700);
          const safe = lbl.toLowerCase();
          await p.screenshot({ path: path.join(SHOT_DIR, `03b_profile_${safe}.png`), fullPage: true }).catch(() => {});
        }
      }
    });
  }
});

test('HR3: /hr/attendance', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/attendance', 'Attendance', '04_attendance.png', async (p, s) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.export_button = !!(await p.$('button:has-text("Export"), button:has-text("CSV")'));
    s.filter_select = !!(await p.$('select, [class*="select-trigger"]'));
    s.date_input = !!(await p.$('input[type="date"], [class*="DatePicker"], [class*="calendar"]'));
  });
});

test('HR4: /hr/shifts', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/shifts', 'Shifts', '05_shifts.png', async (p, s) => {
    s.grid_present = (await countEls(p, 'table, [class*="grid"]')) > 0;
    s.shift_blocks = await countEls(p, '[class*="shift"], [class*="block"]');
    s.create_button = !!(await p.$('button:has-text("Create"), button:has-text("Add"), button:has-text("New Shift")'));
    s.empty_state = !!(await p.$('text=No shifts'));
  });
});

test('HR5: /hr/leave', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/leave', 'Leave', '06_leave.png', async (p, s) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.request_button = !!(await p.$('button:has-text("Request"), button:has-text("Apply"), button:has-text("New Leave")'));
    s.approve_button = !!(await p.$('button:has-text("Approve")'));
    s.reject_button = !!(await p.$('button:has-text("Reject")'));
    // Try opening Request form
    const reqBtn = await p.$('button:has-text("Request"), button:has-text("Apply")');
    if (reqBtn) {
      await reqBtn.click().catch(() => {});
      await p.waitForTimeout(900);
      s.request_form_fields = await countEls(p, 'dialog input, dialog select, dialog textarea, [role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select');
      await p.screenshot({ path: path.join(SHOT_DIR, '06b_leave_form.png'), fullPage: true }).catch(() => {});
      await p.keyboard.press('Escape').catch(() => {});
    }
  });
});

test('HR6: /hr/payroll', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/payroll', 'Payroll', '07_payroll.png', async (p, s) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.card_count = await countEls(p, '[class*="card"], [data-slot="card"]');
    s.run_payroll_btn = !!(await p.$('button:has-text("Run"), button:has-text("Process")'));
    s.has_amount_format = /(AED|USD|\$|د\.إ)/.test(((await p.textContent('main').catch(() => '')) ?? ''));
  });
});

test('HR7: /hr/departments', async ({ page }) => {
  const r = await visitAndDiagnose(page, '/hr/departments', 'Departments', '08_departments.png', async (p, s) => {
    s.card_count = await countEls(p, '[data-slot="card"], [class*="department"]');
    s.org_chart_tab = !!(await p.$('text=Org Chart')) || !!(await p.$('text=Organization'));
    s.add_dept_btn = !!(await p.$('button:has-text("Add"), button:has-text("New Department")'));
  });
  if (r.signals.org_chart_tab) {
    const tab = await page.$('text=Org Chart') ?? await page.$('text=Organization');
    if (tab) {
      await tab.click().catch(() => {});
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SHOT_DIR, '08b_org_chart.png'), fullPage: true }).catch(() => {});
    }
  }
});

test('HR8: /hr/performance', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/performance', 'Performance', '09_performance.png', async (p, s) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.card_count = await countEls(p, '[data-slot="card"]');
    s.create_review_btn = !!(await p.$('button:has-text("Create"), button:has-text("New Review"), button:has-text("Start")'));
    s.has_goals = !!(await p.$('text=Goals')) || !!(await p.$('text=KPI'));
  });
});

test('HR9: /hr/training', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/training', 'Training', '10_training.png', async (p, s) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.card_count = await countEls(p, '[data-slot="card"]');
    s.create_button = !!(await p.$('button:has-text("Create"), button:has-text("New"), button:has-text("Add Program")'));
  });
});

test('HR10: /hr/recruitment + tabs', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/recruitment', 'Recruitment', '11_recruitment.png', async (p, s, notes) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.card_count = await countEls(p, '[data-slot="card"]');
    s.post_job_btn = !!(await p.$('button:has-text("Post"), button:has-text("Create Job"), button:has-text("New Job")'));
    // tabs
    const tabs = ['Pipeline', 'Candidates', 'Kanban', 'Board', 'Jobs'];
    const found: string[] = [];
    for (const t of tabs) {
      if (await p.$(`text=${t}`)) found.push(t);
    }
    s.tabs_found = found;

    // Post-job form open (no submit)
    const pjBtn = await p.$('button:has-text("Post"), button:has-text("Create Job"), button:has-text("New Job")');
    if (pjBtn) {
      await pjBtn.click().catch(() => {});
      await p.waitForTimeout(900);
      s.post_job_form_fields = await countEls(p, '[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select');
      await p.screenshot({ path: path.join(SHOT_DIR, '11b_post_job_form.png'), fullPage: true }).catch(() => {});
      await p.keyboard.press('Escape').catch(() => {});
    }

    // Click Pipeline if exists
    const pipe = await p.$('text=Pipeline');
    if (pipe) {
      await pipe.click().catch(() => {});
      await p.waitForTimeout(900);
      await p.screenshot({ path: path.join(SHOT_DIR, '11c_pipeline.png'), fullPage: true }).catch(() => {});
    }
  });
});

test('HR11: /hr/compliance', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/compliance', 'Compliance', '12_compliance.png', async (p, s) => {
    const tabs = ['Emiratisation', 'Visa', 'WPS', 'Medical', 'Labor', 'Gratuity'];
    const found: string[] = [];
    for (const t of tabs) {
      if (await p.$(`text=${t}`)) found.push(t);
    }
    s.uae_tabs_found = found;
    s.gratuity_calc_btn = !!(await p.$('button:has-text("Calculate")')) || !!(await p.$('text=Gratuity Calculator'));
    s.card_count = await countEls(p, '[data-slot="card"]');
  });
});

test('HR12: /hr/documents', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/documents', 'Documents', '13_documents.png', async (p, s) => {
    s.table_rows = await countEls(p, 'table tbody tr');
    s.upload_btn = !!(await p.$('button:has-text("Upload"), button:has-text("Add Document")'));
  });
});

test('HR13: /hr/reports', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/reports', 'Reports', '14_reports.png', async (p, s) => {
    s.card_count = await countEls(p, '[data-slot="card"]');
    s.charts = await countEls(p, 'canvas, svg.recharts-surface, [class*="recharts-wrapper"]');
    s.tables = await countEls(p, 'table');
  });
});

test('HR14: /hr/ai-assistant (send message)', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-assistant', 'HR AI Assistant', '15_ai_assistant.png', async (p, s, notes) => {
    const chatInput = await p.$('textarea, input[type="text"][placeholder*="ask" i], input[placeholder*="message" i]');
    s.chat_input = !!chatInput;
    if (chatInput) {
      await chatInput.fill('How many employees do we have?').catch(() => {});
      const sendBtn = await p.$('button:has-text("Send"), button[type="submit"], button[aria-label*="send" i]');
      s.send_button = !!sendBtn;
      if (sendBtn) {
        await sendBtn.click().catch(() => {});
        await p.waitForTimeout(8000); // wait for AI response (Ollama can be slow)
        const txt = (await p.textContent('main').catch(() => '')) ?? '';
        s.ai_responded = txt.includes('employee') || txt.includes('Employee') || txt.toLowerCase().includes('here are') || txt.toLowerCase().includes('have');
        s.transcript_length = txt.length;
        await p.screenshot({ path: path.join(SHOT_DIR, '15b_ai_response.png'), fullPage: true }).catch(() => {});
      }
    }
  });
});

test('HR15: /hr/ai-agents', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-agents', 'AI Workforce', '16_ai_workforce.png', async (p, s) => {
    s.card_count = await countEls(p, '[data-slot="card"]');
    s.hire_button = !!(await p.$('button:has-text("Hire"), a:has-text("Hire")'));
    s.tabs = await countEls(p, '[role="tab"]');
  });
});

test('HR16: /hr/ai-agents/hire (no submit)', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-agents/hire', 'Hire AI Agent', '17_ai_hire.png', async (p, s) => {
    const tabs: string[] = [];
    for (const t of ['Describe', 'Templates', 'Choose']) {
      if (await p.$(`text=${t}`)) tabs.push(t);
    }
    s.tabs_found = tabs;
    s.textarea = !!(await p.$('textarea'));
    s.chips = await countEls(p, '[class*="chip"], [class*="badge"], button[class*="outline"]');
    s.template_cards = await countEls(p, '[data-slot="card"]');

    const ta = await p.$('textarea');
    if (ta) {
      await ta.fill('I need a friendly customer support agent for WhatsApp').catch(() => {});
      s.textarea_accepts_input = true;
      await p.screenshot({ path: path.join(SHOT_DIR, '17b_ai_hire_filled.png'), fullPage: true }).catch(() => {});
    }
  });
});

test('HR17: /hr/ai-agents/analytics', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-agents/analytics', 'AI Analytics', '18_ai_analytics.png', async (p, s) => {
    s.card_count = await countEls(p, '[data-slot="card"]');
    s.charts = await countEls(p, 'canvas, svg.recharts-surface, [class*="recharts"]');
    s.kpis = await countEls(p, '[class*="text-2xl"], [class*="text-3xl"]');
  });
});

test('HR18: sidebar groups + counts', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/dashboard', 'Sidebar Inspection', '19_sidebar.png', async (p, s, notes) => {
    const groups = ['People', 'Talent', 'Operations', 'AI Workforce'];
    const groupsFound: string[] = [];
    for (const g of groups) {
      // sidebar labels live in navigation, possibly collapsed/expanded
      const found = await p.$(`nav >> text=${g}, [class*="sidebar" i] >> text=${g}, aside >> text=${g}`);
      if (found) groupsFound.push(g);
    }
    s.groups_found = groupsFound;

    const allHrLinks = await p.$$('a[href*="/hr/"]');
    s.hr_link_count = allHrLinks.length;
    const hrefs: string[] = [];
    for (const l of allHrLinks) {
      const h = await l.getAttribute('href');
      if (h && !hrefs.includes(h)) hrefs.push(h);
    }
    s.distinct_hr_hrefs = hrefs;
  });
});
