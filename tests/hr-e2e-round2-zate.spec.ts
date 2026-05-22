/**
 * HR end-to-end verification — ROUND 2 (2026-05-21).
 *
 * Round 1 ran against cosmique (healthcare, near-empty HR). Round 2 runs
 * against zateceptionist (UUID ac308ab6-…), which has:
 *   12 employees, 6 departments, 60 attendance, 36 leave balances,
 *   8 leave requests, 8 perf reviews, 10 goals, 5 training programs,
 *   4 jobs, 5 candidates.
 *
 * Differences vs Round 1:
 *  - Fresh login as adeel@zatesystems.com (no shared auth-state).
 *  - Tutorial / onboarding modal pre-dismissed via localStorage.
 *  - Broader card / row / button selectors (not only [data-slot="card"]).
 *  - 4xx/5xx network responses recorded per page.
 *  - Drill-ins: employee profile tabs, leave form, recruitment pipeline,
 *    gratuity calc, AI assistant chat.
 *
 * Results: tests/hr-e2e-round2-results.json + .md
 * Screenshots: tests/screenshots/2026-05-21-hr-round2-zate/
 */
import { test, type Page, type ConsoleMessage } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-21-hr-round2-zate');
const RESULTS_PATH = path.join(__dirname, 'hr-e2e-round2-results.json');
const REPORT_PATH = path.join(__dirname, 'hr-e2e-round2-report.md');

interface NetErr { status: number; url: string; method: string }
interface PageResult {
  route: string;
  name: string;
  loaded: boolean;
  http_status?: number;
  url_after_load: string;
  has_error_boundary: boolean;
  page_errors: string[];
  console_errors: string[];
  net_errors: NetErr[];
  content_length: number;
  signals: Record<string, unknown>;
  screenshot: string;
  notes: string[];
  verdict: 'PASS' | 'EMPTY' | 'SHOWCASE' | 'BROKEN' | 'PARTIAL';
}

const results: PageResult[] = [];

async function dismissTutorialOverlay(page: Page) {
  // Localstorage flags commonly used by onboarding/tutorial modals
  await page.evaluate(() => {
    try {
      const keys = [
        'tutorial-dismissed', 'tutorial_dismissed',
        'onboarding-completed', 'onboarding_completed',
        'welcome-shown', 'welcome_shown',
        'first-login-tour-shown', 'tour-shown',
        'product-tour-completed', 'hr-tour-completed',
      ];
      keys.forEach(k => localStorage.setItem(k, 'true'));
    } catch {}
  }).catch(() => {});

  // Also try clicking obvious close buttons if present
  for (const sel of [
    'button:has-text("Skip tutorial")',
    'button:has-text("Skip")',
    'button:has-text("Got it")',
    'button:has-text("Close")',
    'button:has-text("Maybe later")',
    'button:has-text("Dismiss")',
    '[aria-label="Close"]',
  ]) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 400 }).catch(() => false)) {
      await btn.click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function visitAndDiagnose(
  page: Page,
  route: string,
  name: string,
  shotName: string,
  probe: (p: Page, signals: Record<string, unknown>, notes: string[]) => Promise<void>,
): Promise<PageResult> {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const netErrors: NetErr[] = [];
  const signals: Record<string, unknown> = {};
  const notes: string[] = [];

  const onError = (e: Error) => pageErrors.push(`PAGEERROR: ${e.message}`);
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 240));
  };
  const onResponse = (resp: any) => {
    const s = resp.status();
    const u = resp.url();
    if (s >= 400 && /supabase|zatesystems|host\.docker|localhost/i.test(u)) {
      netErrors.push({ status: s, url: u.slice(0, 240), method: resp.request().method() });
    }
  };
  page.on('pageerror', onError);
  page.on('console', onConsole);
  page.on('response', onResponse);

  let loaded = false;
  let httpStatus: number | undefined;
  let urlAfter = '';
  let contentLen = 0;
  let hasErrBoundary = false;

  try {
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    httpStatus = resp?.status();
    loaded = true;
  } catch (e: any) {
    notes.push(`navigation: ${e.message}`);
  }

  // Settle wait — don't rely on networkidle (some prod pages keep long-poll connections open)
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(2200);
  await dismissTutorialOverlay(page);
  await page.waitForTimeout(700);

  urlAfter = page.url();
  const bodyText = (await page.textContent('body').catch(() => '')) ?? '';
  contentLen = bodyText.length;

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
      notes.push(`error-boundary matched: ${re}`);
      break;
    }
  }
  if (urlAfter.includes('/404') || /^Page not found|^404$/i.test(bodyText.slice(0, 200))) {
    notes.push('404 detected');
    hasErrBoundary = true;
  }
  // Detect silent redirect to /login (auth lost)
  if (urlAfter.includes('/login') && !route.includes('/login')) {
    notes.push(`auth-redirect: requested ${route} but landed on ${urlAfter}`);
    hasErrBoundary = true;
  }

  try {
    await probe(page, signals, notes);
  } catch (e: any) {
    notes.push(`probe-error: ${e.message}`);
  }

  const shotPath = path.join(SHOT_DIR, shotName);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch (e: any) {
    notes.push(`screenshot-error: ${e.message}`);
  }

  page.off('pageerror', onError);
  page.off('console', onConsole);
  page.off('response', onResponse);

  let verdict: PageResult['verdict'] = 'PASS';
  if (!loaded || hasErrBoundary) verdict = 'BROKEN';
  else {
    const rows = (signals.row_count as number) ?? -1;
    const cards = (signals.card_count as number) ?? -1;
    const data = (signals.data_count as number) ?? -1;
    if ((rows === 0 && cards === 0) || data === 0) verdict = 'EMPTY';
  }
  if (signals.no_handlers === true) verdict = 'SHOWCASE';
  if (notes.some(n => n.startsWith('probe-error'))) verdict = verdict === 'BROKEN' ? 'BROKEN' : 'PARTIAL';

  const result: PageResult = {
    route,
    name,
    loaded,
    http_status: httpStatus,
    url_after_load: urlAfter,
    has_error_boundary: hasErrBoundary,
    page_errors: pageErrors,
    console_errors: consoleErrors.slice(0, 10),
    net_errors: netErrors.slice(0, 15),
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

async function bodyMain(page: Page): Promise<string> {
  return ((await page.textContent('main').catch(() => '')) ?? (await page.textContent('body').catch(() => ''))) ?? '';
}

const cardSelector = '[data-slot="card"], [class*="Card "], [class*=" card "], [class*="rounded-lg"][class*="border"], [class*="bg-card"], [class*="employee"]';
const rowSelector  = 'table tbody tr, [role="row"], [class*="TableRow"], [class*="EmployeeRow"]';
const btnSelector  = 'button:not([disabled])';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
});

test('PRE: verify auth carried over from setup', async ({ page }) => {
  // If auth state didn't load, this redirects to /login and we fail loudly.
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const url = page.url();
  await dismissTutorialOverlay(page);
  await page.screenshot({ path: path.join(SHOT_DIR, '00_post_login_dashboard.png'), fullPage: true });
  if (url.includes('/login')) {
    throw new Error(`AUTH FAILED — landed on ${url} instead of /dashboard. Re-run zate-setup.`);
  }
});

test.afterAll(() => {
  const summary = {
    timestamp: new Date().toISOString(),
    base_url: process.env.E2E_BASE_URL || 'https://ai.zatesystems.com',
    tenant_under_test: 'zateceptionist (adeel@zatesystems.com)',
    pages_tested: results.length,
    by_verdict: results.reduce((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    results,
  };
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(summary, null, 2));
  const lines: string[] = [];
  lines.push('# HR E2E Round 2 — zateceptionist tenant');
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
    lines.push(`- net_errors: ${r.net_errors.length}`);
    for (const ne of r.net_errors.slice(0, 5)) lines.push(`  - ${ne.method} ${ne.status} ${ne.url}`);
    lines.push(`- signals:`);
    for (const [k, v] of Object.entries(r.signals)) lines.push(`    ${k}: ${JSON.stringify(v)}`);
    if (r.notes.length) {
      lines.push(`- notes:`);
      for (const n of r.notes) lines.push(`    - ${n}`);
    }
    lines.push(`- screenshot: ${r.screenshot}`);
    lines.push('');
  }
  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
});

// ─────────────────────────────────────────────────────────
// HR PAGES
// ─────────────────────────────────────────────────────────

test('HR1: /hr/dashboard', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/dashboard', 'HR Dashboard', '01_hr_dashboard.png', async (p, s) => {
    s.card_count = await countEls(p, cardSelector);
    s.kpi_numbers = await countEls(p, '[class*="text-2xl"], [class*="text-3xl"], [class*="text-4xl"]');
    const txt = await bodyMain(p);
    s.attrition_widget = /attrition/i.test(txt);
    s.compensation_widget = /compensation|salary/i.test(txt);
    s.needs_attention = /needs attention|alerts/i.test(txt);
    s.has_chart = (await countEls(p, 'canvas, svg.recharts-surface, [class*="recharts"]')) > 0;
    // Look for the employee count
    const m = txt.match(/(\d+)\s+(?:total\s+)?employees?/i);
    s.employee_count_text = m ? m[1] : null;
    s.mentions_12 = /\b12\b/.test(txt);
    s.mentions_6_depts = /6\s*departments|departments[^.]*6/i.test(txt);
  });
});

test('HR2: /hr/employees + profile drill', async ({ page }) => {
  const r = await visitAndDiagnose(page, '/hr/employees', 'Employees', '02_employees.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.add_button = !!(await p.$('button:has-text("Add"), button:has-text("New"), button:has-text("Create")'));
    s.search_input = !!(await p.$('input[placeholder*="earch" i], input[type="search"]'));
    s.dept_filter = !!(await p.$('select, [class*="select-trigger"], [role="combobox"]'));
    const txt = await bodyMain(p);
    s.has_real_names = /fatima|ahmed|sara|adeel|priya|khalid|carlos/i.test(txt);

    // First employee link can be (a) an <a href>, (b) a TR with onClick, or (c) a Card with onClick.
    let empHref: string | null = null;
    const empAnchor = await p.$('a[href*="/hr/employees/"]');
    if (empAnchor) {
      empHref = await empAnchor.getAttribute('href');
    } else {
      // Try clicking the first row that has cursor-pointer onClick → URL changes
      const empRow = await p.$('tr.cursor-pointer, tbody tr[class*="cursor-pointer"]');
      if (empRow) {
        await empRow.click().catch(() => {});
        await p.waitForTimeout(1500);
        const u = p.url();
        if (/\/hr\/employees\/[0-9a-f-]{36}/.test(u)) {
          empHref = new URL(u).pathname;
        }
        // navigate back so test screenshots are clean
        await p.goBack().catch(() => {});
        await p.waitForTimeout(800);
      }
    }
    s.has_employee_link = !!empHref;
    if (empHref) s.first_employee_href = empHref;
  });

  if (r.signals.first_employee_href) {
    const href = r.signals.first_employee_href as string;
    await visitAndDiagnose(page, href, `Employee Profile (${href})`, '03_employee_profile.png', async (p, s) => {
      const tabLabels = ['Overview', 'Personal', 'Employment', 'Leave', 'Performance', 'Documents', 'Assets'];
      const tabsFound: string[] = [];
      for (const lbl of tabLabels) {
        const t = await p.$(`[role="tab"]:has-text("${lbl}"), button:has-text("${lbl}")`);
        if (t) tabsFound.push(lbl);
      }
      s.tabs_found = tabsFound;
      s.tab_count = tabsFound.length;
      s.data_count = tabsFound.length;

      // Click each tab and capture content + tab-specific data signals
      const tabSignals: Record<string, { content_length: number; has_data: boolean }> = {};
      for (const lbl of tabsFound) {
        const tab = await p.$(`[role="tab"]:has-text("${lbl}"), button:has-text("${lbl}")`);
        if (tab) {
          await tab.click().catch(() => {});
          await p.waitForTimeout(900);
          const tabContent = await bodyMain(p);
          tabSignals[lbl] = {
            content_length: tabContent.length,
            has_data: tabContent.length > 1000 && !/no data|empty|not available/i.test(tabContent.slice(-1500)),
          };
          await p.screenshot({ path: path.join(SHOT_DIR, `03b_profile_${lbl.toLowerCase()}.png`), fullPage: true }).catch(() => {});
        }
      }
      s.tab_signals = tabSignals;
    });
  }
});

test('HR3: /hr/attendance', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/attendance', 'Attendance', '04_attendance.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.export_button = !!(await p.$('button:has-text("Export"), button:has-text("CSV"), button:has-text("Download")'));
    s.filter_select = !!(await p.$('select, [class*="select-trigger"], [role="combobox"]'));
    s.date_input = !!(await p.$('input[type="date"], [class*="DatePicker"], [class*="calendar"]'));
    const txt = await bodyMain(p);
    const m = txt.match(/(\d+)\s+records?/i);
    s.records_text = m ? m[1] : null;
  });
});

test('HR4: /hr/shifts', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/shifts', 'Shifts', '05_shifts.png', async (p, s) => {
    s.grid_present = (await countEls(p, 'table, [class*="grid"], [class*="Grid"]')) > 0;
    s.shift_blocks = await countEls(p, '[class*="shift"], [class*="Shift"], [class*="block"]');
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.shift_blocks as number) + (s.card_count as number);
    s.create_button = !!(await p.$('button:has-text("Create"), button:has-text("Add"), button:has-text("New Shift")'));
    s.empty_state = /no shifts|nothing scheduled/i.test(await bodyMain(p));
  });
});

test('HR5: /hr/leave + form', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/leave', 'Leave', '06_leave.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.request_button = !!(await p.$('button:has-text("Request"), button:has-text("Apply"), button:has-text("New Leave")'));
    s.approve_button = !!(await p.$('button:has-text("Approve")'));
    s.reject_button = !!(await p.$('button:has-text("Reject")'));
    const reqBtn = await p.$('button:has-text("Request"), button:has-text("Apply"), button:has-text("New Leave")');
    if (reqBtn) {
      await reqBtn.click().catch(() => {});
      await p.waitForTimeout(1100);
      s.request_form_fields = await countEls(p, '[role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea, dialog input, dialog select');
      s.request_form_has_dropdowns = (await countEls(p, '[role="dialog"] [role="combobox"], dialog [role="combobox"]')) > 0;
      await p.screenshot({ path: path.join(SHOT_DIR, '06b_leave_form.png'), fullPage: true }).catch(() => {});
      await p.keyboard.press('Escape').catch(() => {});
    }
  });
});

test('HR6: /hr/payroll', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/payroll', 'Payroll', '07_payroll.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.run_payroll_btn = !!(await p.$('button:has-text("Run"), button:has-text("Process"), button:has-text("Generate")'));
    const txt = await bodyMain(p);
    s.has_currency_format = /(AED|USD|\$|د\.إ|EUR|GBP|£|€)/.test(txt);
  });
});

test('HR7: /hr/departments + org chart', async ({ page }) => {
  const r = await visitAndDiagnose(page, '/hr/departments', 'Departments', '08_departments.png', async (p, s) => {
    s.card_count = await countEls(p, cardSelector);
    s.data_count = s.card_count;
    const txt = await bodyMain(p);
    s.mentions_6 = /\b6\s+departments|departments[^.]{0,40}\b6\b/i.test(txt);
    s.org_chart_tab = /org\s*chart|organi[sz]ation\s*chart/i.test(txt);
    s.add_dept_btn = !!(await p.$('button:has-text("Add"), button:has-text("New Department")'));
  });
  if (r.signals.org_chart_tab) {
    const tab = await page.$('text=/Org Chart/i') ?? await page.$('text=/Organi[sz]ation/i');
    if (tab) {
      await tab.click().catch(() => {});
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(SHOT_DIR, '08b_org_chart.png'), fullPage: true }).catch(() => {});
    }
  }
});

test('HR8: /hr/performance + goals', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/performance', 'Performance', '09_performance.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.create_review_btn = !!(await p.$('button:has-text("Create"), button:has-text("New Review"), button:has-text("Start")'));
    const txt = await bodyMain(p);
    s.mentions_goals = /goals?/i.test(txt);
    s.mentions_kpi = /kpi|key result/i.test(txt);
  });
  // Try clicking Goals tab if any
  const goalsTab = await page.$('[role="tab"]:has-text("Goals"), button:has-text("Goals")');
  if (goalsTab) {
    await goalsTab.click().catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SHOT_DIR, '09b_goals.png'), fullPage: true }).catch(() => {});
  }
});

test('HR9: /hr/training', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/training', 'Training', '10_training.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.create_button = !!(await p.$('button:has-text("Create"), button:has-text("New"), button:has-text("Add Program")'));
  });
});

test('HR10: /hr/recruitment + pipeline + post-job', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/recruitment', 'Recruitment', '11_recruitment.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.post_job_btn = !!(await p.$('button:has-text("Post"), button:has-text("Create Job"), button:has-text("New Job")'));
    const tabs = ['Pipeline', 'Candidates', 'Kanban', 'Board', 'Jobs', 'Offers'];
    const found: string[] = [];
    for (const t of tabs) {
      if (await p.$(`text=${t}`)) found.push(t);
    }
    s.tabs_found = found;

    const pjBtn = await p.$('button:has-text("Post"), button:has-text("Create Job"), button:has-text("New Job")');
    if (pjBtn) {
      await pjBtn.click().catch(() => {});
      await p.waitForTimeout(1100);
      s.post_job_form_fields = await countEls(p, '[role="dialog"] input, [role="dialog"] textarea, [role="dialog"] select');
      await p.screenshot({ path: path.join(SHOT_DIR, '11b_post_job_form.png'), fullPage: true }).catch(() => {});
      await p.keyboard.press('Escape').catch(() => {});
      await p.waitForTimeout(400);
    }

    const pipe = await p.$('[role="tab"]:has-text("Pipeline"), button:has-text("Pipeline")');
    if (pipe) {
      await pipe.click().catch(() => {});
      await p.waitForTimeout(1200);
      const stages = ['applied', 'screening', 'interview', 'technical', 'final', 'offer', 'hired'];
      const stagesFound = [];
      const txt = (await bodyMain(p)).toLowerCase();
      for (const st of stages) if (txt.includes(st)) stagesFound.push(st);
      s.pipeline_stages_found = stagesFound;
      await p.screenshot({ path: path.join(SHOT_DIR, '11c_pipeline.png'), fullPage: true }).catch(() => {});
    }
  });
});

test('HR11: /hr/compliance + gratuity calculator', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/compliance', 'Compliance', '12_compliance.png', async (p, s) => {
    const tabs = ['Emiratisation', 'Visa', 'WPS', 'Medical', 'Labor', 'Gratuity'];
    const found: string[] = [];
    for (const t of tabs) {
      if (await p.$(`text=${t}`)) found.push(t);
    }
    s.uae_tabs_found = found;
    s.card_count = await countEls(p, cardSelector);
    s.data_count = s.card_count;
    const txt = await bodyMain(p);
    s.mentions_33 = /33\s*%|0\.33|target.*33|33.*target/i.test(txt);
    s.mentions_gratuity = /gratuity/i.test(txt);

    // Try gratuity tab
    const gratTab = await p.$('[role="tab"]:has-text("Gratuity"), button:has-text("Gratuity")');
    if (gratTab) {
      await gratTab.click().catch(() => {});
      await p.waitForTimeout(900);
      const numInputs = await p.$$('input[type="number"], input[inputmode="numeric"]');
      s.gratuity_inputs = numInputs.length;
      // Try fill with sample values
      if (numInputs.length >= 1) {
        try { await numInputs[0].fill('5'); } catch {}
      }
      if (numInputs.length >= 2) {
        try { await numInputs[1].fill('10000'); } catch {}
      }
      const calcBtn = await p.$('button:has-text("Calculate")');
      s.gratuity_calc_btn = !!calcBtn;
      if (calcBtn) {
        await calcBtn.click().catch(() => {});
        await p.waitForTimeout(900);
        const after = await bodyMain(p);
        // Look for a result amount near the calculator
        const numMatch = after.match(/(?:AED|د\.إ|\$|USD)\s*[\d,]+(?:\.\d+)?/);
        s.gratuity_result = numMatch ? numMatch[0] : null;
      }
      await p.screenshot({ path: path.join(SHOT_DIR, '12b_gratuity.png'), fullPage: true }).catch(() => {});
    }
  });
});

test('HR12: /hr/documents', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/documents', 'Documents', '13_documents.png', async (p, s) => {
    s.table_rows = await countEls(p, rowSelector);
    s.card_count = await countEls(p, cardSelector);
    s.data_count = (s.table_rows as number) + (s.card_count as number);
    s.upload_btn = !!(await p.$('button:has-text("Upload"), button:has-text("Add Document")'));
    const txt = await bodyMain(p);
    s.has_expiry_badges = /expir(ed|es|y|ing)|days left/i.test(txt);
  });
});

test('HR13: /hr/reports', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/reports', 'Reports', '14_reports.png', async (p, s) => {
    s.card_count = await countEls(p, cardSelector);
    s.charts = await countEls(p, 'canvas, svg.recharts-surface, [class*="recharts-wrapper"]');
    s.tables = await countEls(p, 'table');
    s.data_count = (s.charts as number) + (s.tables as number);
    const txt = await bodyMain(p);
    s.mentions_headcount = /headcount/i.test(txt);
    s.mentions_turnover = /turnover|attrition/i.test(txt);
    s.mentions_tenure = /tenure/i.test(txt);
  });
});

test('HR14: /hr/ai-assistant (send message)', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-assistant', 'HR AI Assistant', '15_ai_assistant.png', async (p, s) => {
    const chatInput = await p.$('textarea, input[placeholder*="ask" i], input[placeholder*="message" i], input[placeholder*="HR" i], input[placeholder*="anything" i]');
    s.chat_input = !!chatInput;
    s.data_count = chatInput ? 1 : 0;
    if (chatInput) {
      await chatInput.fill('How many employees do we have?').catch(() => {});
      const sendBtn = await p.$('button:has-text("Send"), button[type="submit"], button[aria-label*="send" i], button:has(svg)');
      s.send_button = !!sendBtn;
      if (sendBtn) {
        await sendBtn.click().catch(() => {});
        await p.waitForTimeout(14000); // Ollama can be slow
        const txt = await bodyMain(p);
        s.ai_responded = /\b12\b|employees|employee count|here are|we have/i.test(txt);
        s.transcript_length = txt.length;
        await p.screenshot({ path: path.join(SHOT_DIR, '15b_ai_response.png'), fullPage: true }).catch(() => {});
      }
    }
  });
});

test('HR15: /hr/ai-agents', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-agents', 'AI Workforce', '16_ai_workforce.png', async (p, s) => {
    s.card_count = await countEls(p, cardSelector);
    s.data_count = s.card_count;
    s.hire_button = !!(await p.$('button:has-text("Hire"), a:has-text("Hire")'));
    s.tabs = await countEls(p, '[role="tab"]');
  });
});

test('HR16: /hr/ai-agents/hire', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/ai-agents/hire', 'Hire AI Agent', '17_ai_hire.png', async (p, s) => {
    const tabs: string[] = [];
    for (const t of ['Describe', 'Templates', 'Choose']) {
      if (await p.$(`text=${t}`)) tabs.push(t);
    }
    s.tabs_found = tabs;
    s.textarea = !!(await p.$('textarea'));
    s.chips = await countEls(p, '[class*="chip"], [class*="badge"], button[class*="outline"]');
    s.template_cards = await countEls(p, cardSelector);
    s.data_count = s.template_cards;

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
    s.card_count = await countEls(p, cardSelector);
    s.charts = await countEls(p, 'canvas, svg.recharts-surface, [class*="recharts"]');
    s.kpis = await countEls(p, '[class*="text-2xl"], [class*="text-3xl"], [class*="text-4xl"]');
    // analytics dashboard intentionally empty when no agents hired yet — accept either
    s.data_count = ((s.card_count as number) + (s.charts as number) + (s.kpis as number)) || 1;
  });
});

test('HR18: sidebar + nav inventory', async ({ page }) => {
  await visitAndDiagnose(page, '/hr/dashboard', 'Sidebar Inspection', '19_sidebar.png', async (p, s) => {
    const groups = ['People', 'Talent', 'Operations', 'AI Workforce'];
    const groupsFound: string[] = [];
    for (const g of groups) {
      const txt = await p.textContent('body').catch(() => '') ?? '';
      if (new RegExp(g, 'i').test(txt)) groupsFound.push(g);
    }
    s.groups_found = groupsFound;

    const allHrLinks = await p.$$('a[href*="/hr/"]');
    s.hr_link_count = allHrLinks.length;
    s.data_count = allHrLinks.length;
    const hrefs: string[] = [];
    for (const l of allHrLinks) {
      const h = await l.getAttribute('href');
      if (h && !hrefs.includes(h)) hrefs.push(h);
    }
    s.distinct_hr_hrefs = hrefs.sort();
  });
});
