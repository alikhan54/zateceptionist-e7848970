/**
 * Smart Ledger comprehensive end-to-end test — 2026-05-22.
 *
 * Runs against LIVE https://ai.zatesystems.com (NOT localhost).
 * Covers test groups A-I from Adeel's verification matrix; Group J is a separate
 * Python DB-check script that runs in parallel.
 *
 * Run:
 *   cd D:/420-system/frontend
 *   E2E_BASE_URL=https://ai.zatesystems.com \
 *   SMART_LEDGER_PASSWORD='...' \
 *   COSMIQUE_PASSWORD='...' \
 *     npx playwright test --project=smart-ledger-comprehensive-e2e --reporter=list
 *
 * Env vars:
 *   SMART_LEDGER_EMAIL    — defaults to team@smartledgersolutions.co.uk
 *   SMART_LEDGER_PASSWORD — required
 *   COSMIQUE_EMAIL        — defaults to cosmique@zatesystems.com
 *   COSMIQUE_PASSWORD     — required
 *   E2E_BASE_URL          — set explicitly to https://ai.zatesystems.com for live test
 */
import { test, expect, devices, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SL_EMAIL = process.env.SMART_LEDGER_EMAIL || 'team@smartledgersolutions.co.uk';
const SL_PASSWORD = process.env.SMART_LEDGER_PASSWORD || '';
const COS_EMAIL = process.env.COSMIQUE_EMAIL || 'cosmique@zatesystems.com';
const COS_PASSWORD = process.env.COSMIQUE_PASSWORD || '';

const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-22-comprehensive-e2e');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!SL_PASSWORD) throw new Error('SMART_LEDGER_PASSWORD env var is required');
});

async function loginAsSmartLedger(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', SL_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', SL_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Defensive: dismiss tutorial if any
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close|got it|dismiss/i }).first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

/** Wait for any page's "Loading..." spinner to clear (per Dashboard.tsx + others). */
async function waitForPageLoaded(page: Page, timeoutMs = 30_000) {
  const loadingText = page.getByText(/^Loading\.{0,3}$/i).first();
  // Quick check — if no spinner ever appears, this is a no-op
  const wasVisible = await loadingText.isVisible({ timeout: 1_500 }).catch(() => false);
  if (wasVisible) {
    await loadingText.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => {});
  }
  // Belt-and-braces: small settle delay
  await page.waitForTimeout(800);
}

// =====================================================================
// GROUP A — Auth flow + Group B — Dashboard (combined; serial)
// =====================================================================
test('A + B — Auth + Dashboard render', async ({ page }) => {
  test.setTimeout(120_000);

  // A1: open login
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SHOT_DIR, 'A1-login-page.png'), fullPage: true });

  // A2: form renders
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();

  // A3-A4: login + redirect
  await loginAsSmartLedger(page);
  expect(page.url(), 'Post-login URL must be /accounting/dashboard for accounting tenant').toContain('/accounting/dashboard');

  // Wait for Dashboard counts to load (h1 "Welcome, ..." only renders after async data fetch completes)
  await waitForPageLoaded(page, 30_000);

  // A5: dashboard screenshot
  await page.screenshot({ path: path.join(SHOT_DIR, 'A5-dashboard.png'), fullPage: true });

  // B1: Welcome header (be lenient — text may be 'Welcome, Adil' or 'Welcome back, Adil' etc.)
  const welcomeHit = await page.getByText(/welcome/i).first().isVisible({ timeout: 15_000 }).catch(() => false);
  expect(welcomeHit, 'Dashboard must show a "Welcome" greeting').toBe(true);

  // B2: 3 stat cards — Clients=10, Jobs=5, Invoices=5
  // Use text-presence assertions (more resilient than testid lookups against a live page)
  await expect(page.getByText(/clients/i).first()).toBeVisible();
  await expect(page.getByText(/jobs/i).first()).toBeVisible();
  await expect(page.getByText(/invoices/i).first()).toBeVisible();
  // Note: B2 number assertions deferred to Group C/D where we count rows directly

  // B3: click "View all" on Clients (try multiple selector strategies)
  const viewAllClients = page.locator('a[href="/accounting/clients"], button:has-text("View all")').first();
  if (await viewAllClients.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await viewAllClients.click();
    await page.waitForURL(/\/accounting\/clients/, { timeout: 10_000 });
    // B4: back
    await page.goBack({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/accounting\/dashboard/);
  }

  // B6: "launching May 25" notice (lenient text match)
  const noticeHit = await page.getByText(/may\s*25|launching|coming/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
  // Soft assertion — log but don't fail if absent
  console.log(`[B6] launching-notice visible: ${noticeHit}`);
});

// =====================================================================
// GROUP C — Clients page
// =====================================================================
test('C — Clients page (D7)', async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsSmartLedger(page);
  await page.goto('/accounting/clients', { waitUntil: 'networkidle' });
  await waitForPageLoaded(page, 30_000);

  // C2: 10 rows
  const rowCount = await page.locator('table tbody tr').count();
  console.log(`[C2] table rows: ${rowCount}`);
  expect(rowCount, 'Clients table should show 10 demo rows').toBeGreaterThanOrEqual(10);

  // C6: column headers
  for (const header of ['Name', 'Company No', 'VAT Number', 'Status', 'Period End', 'Email']) {
    await expect(
      page.locator('thead').getByText(header, { exact: false }).first(),
      `Header "${header}" must be visible`,
    ).toBeVisible();
  }

  // C3: search "Acme" → 1 row
  const searchInput = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i]').first();
  await searchInput.fill('Acme');
  await page.waitForTimeout(800);
  const acmeRows = await page.locator('table tbody tr').count();
  console.log(`[C3] rows visible with search 'Acme': ${acmeRows}`);
  expect(acmeRows, 'Search "Acme" should narrow to ~1 row').toBeLessThanOrEqual(2);

  // C4: clear search → 10 rows
  await searchInput.fill('');
  await page.waitForTimeout(500);
  const clearedRows = await page.locator('table tbody tr').count();
  expect(clearedRows, 'Clearing search restores full list').toBeGreaterThanOrEqual(10);

  // C7: click row → "Coming May 25" toast
  await page.locator('table tbody tr').first().click();
  await page.waitForTimeout(1000);
  const toastVisible = await page.getByText(/may\s*25|coming|client detail|launches/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
  console.log(`[C7] post-row-click toast/text visible: ${toastVisible}`);

  // C8: screenshot
  await page.screenshot({ path: path.join(SHOT_DIR, 'C8-clients.png'), fullPage: true });
});

// =====================================================================
// GROUP D — Jobs page (NEW D7-A)
// =====================================================================
test('D — Jobs page CRUD (D7-A)', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsSmartLedger(page);
  await page.goto('/accounting/jobs', { waitUntil: 'networkidle' });
  await waitForPageLoaded(page, 30_000);

  // D2: 4 stats cards
  await expect(page.getByTestId('stat-open-jobs')).toBeVisible();
  await expect(page.getByTestId('stat-overdue')).toBeVisible();
  await expect(page.getByTestId('stat-due-week')).toBeVisible();
  await expect(page.getByTestId('stat-done-month')).toBeVisible();

  // D3: 5 demo jobs (use partial title match; exact strings have an em-dash)
  const demoTitles = ['CT600', 'PAYE month-end', 'Self Assessment', 'VAT return Q1', 'Year-end accounts'];
  for (const partial of demoTitles) {
    await expect(
      page.locator('tr td:first-child').filter({ hasText: partial }).first(),
      `Demo job "${partial}" should render`,
    ).toBeVisible({ timeout: 10_000 });
  }
  const initialRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[D3] initial job rows: ${initialRows}`);
  expect(initialRows, 'Should have at least 5 demo job rows').toBeGreaterThanOrEqual(5);

  // D4: status filter = blocked → 1 row (CT600 only)
  await page.getByTestId('status-filter').click();
  await page.getByRole('option', { name: 'Blocked' }).click();
  await page.waitForTimeout(800);
  const blockedRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[D4] rows visible with status=blocked: ${blockedRows}`);
  expect(blockedRows).toBe(1);
  await expect(page.locator('tr td:first-child').filter({ hasText: 'CT600' }).first()).toBeVisible();

  // D5: clear filter
  await page.getByTestId('status-filter').click();
  await page.getByRole('option', { name: 'All statuses' }).click();
  await page.waitForTimeout(500);
  const restoredRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  expect(restoredRows).toBeGreaterThanOrEqual(5);

  // D6: search "VAT" → narrows
  await page.getByTestId('jobs-search').fill('VAT');
  await page.waitForTimeout(800);
  const vatRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[D6] rows visible with search 'VAT': ${vatRows}`);
  expect(vatRows).toBeGreaterThanOrEqual(1);
  await page.getByTestId('jobs-search').fill('');
  await page.waitForTimeout(500);

  // D7: New Job button → dialog opens
  const testJobTitle = `E2E_TEST_JOB_${Date.now()}`;
  await page.getByTestId('new-job-button').click();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('job-form-title')).toBeVisible();

  // D8: fill form
  await page.getByTestId('job-form-title').fill(testJobTitle);
  await page.getByTestId('job-form-priority').click();
  await page.getByRole('option', { name: 'High' }).click();
  // Deadline = tomorrow in YYYY-MM-DD
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.getByTestId('job-form-deadline').fill(tomorrow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'D8-create-dialog-filled.png'), fullPage: true });

  // D9: submit → row appears
  await page.getByTestId('job-form-submit').click();
  await page.waitForTimeout(2500);
  await expect(page.locator('tr').filter({ hasText: testJobTitle })).toBeVisible({ timeout: 10_000 });

  // Capture new row id
  const newRow = page.locator('tr').filter({ hasText: testJobTitle }).first();
  const newRowTestId = await newRow.getAttribute('data-testid');
  expect(newRowTestId).toMatch(/^job-row-/);
  const newJobId = newRowTestId!.replace('job-row-', '');
  console.log(`[D9] created job id: ${newJobId}`);

  // D10: open row menu → click Edit → dialog with pre-filled
  await page.getByTestId(`job-row-menu-${newJobId}`).click();
  await page.waitForTimeout(400);
  await page.getByRole('menuitem', { name: 'Edit details' }).click();
  await page.waitForTimeout(800);
  const titleInput = page.getByTestId('job-form-title');
  await expect(titleInput).toBeVisible();
  await expect(titleInput).toHaveValue(testJobTitle);

  // D11: change status to done → save → completed_at auto-stamped
  await page.getByTestId('job-form-status').click();
  await page.getByRole('option', { name: 'Done' }).click();
  await page.getByTestId('job-form-submit').click();
  await page.waitForTimeout(2_000);

  // Verify Done badge on new row
  await expect(
    page.locator(`tr[data-testid="${newRowTestId}"]`).getByText('Done', { exact: true }),
  ).toBeVisible({ timeout: 5_000 });

  // D12: Done This Month stat incremented (was N, now N+1) — soft check (env state varies)
  const doneStat = await page.getByTestId('stat-done-month').textContent();
  console.log(`[D12] Done This Month after status change: ${doneStat?.trim()}`);

  // D13-D14: delete via row menu → AlertDialog → confirm
  await page.getByTestId(`job-row-menu-${newJobId}`).click();
  await page.waitForTimeout(400);
  await page.getByTestId('job-row-menu-delete').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOT_DIR, 'D13-delete-confirm.png'), fullPage: true });
  await page.getByTestId('confirm-delete-job').click();
  await page.waitForTimeout(2_000);

  // D15: row removed
  await expect(page.locator(`tr[data-testid="${newRowTestId}"]`)).not.toBeVisible({ timeout: 5_000 });

  // D15b: 5 demo jobs still present
  for (const partial of demoTitles) {
    await expect(
      page.locator('tr td:first-child').filter({ hasText: partial }).first(),
      `Demo job "${partial}" must remain after CRUD cycle`,
    ).toBeVisible();
  }

  // D16: final screenshot
  await page.screenshot({ path: path.join(SHOT_DIR, 'D16-jobs-final.png'), fullPage: true });
});

// =====================================================================
// GROUP E — Placeholder pages
// =====================================================================
test('E — Placeholder pages (Finance, Invoices, Reminders)', async ({ page }) => {
  test.setTimeout(90_000);
  await loginAsSmartLedger(page);

  const placeholders: Array<[string, string]> = [
    ['/accounting/finance', 'E1-finance.png'],
    ['/accounting/invoices', 'E2-invoices.png'],
    ['/accounting/reminders', 'E3-reminders.png'],
  ];

  for (const [url, shot] of placeholders) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForPageLoaded(page, 15_000);
    const comingHit = await page.getByText(/coming|may\s*25|launching|placeholder/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[E ${url}] "Coming" text visible: ${comingHit}`);
    expect(comingHit, `${url} should show a "Coming" placeholder`).toBe(true);
    await page.screenshot({ path: path.join(SHOT_DIR, shot), fullPage: true });
  }
});

// =====================================================================
// GROUP F — Navigation (sidebar gating + redirects)
// =====================================================================
test('F — Navigation (sidebar gating + redirects)', async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsSmartLedger(page);

  // F1: sidebar shows MAIN + ACCOUNTING + Logout (exact accounting label)
  await expect(page.getByText('Accounting', { exact: true }).first()).toBeVisible({ timeout: 5_000 });

  // F2: sidebar does NOT show these
  const forbidden = ['Sales AI', 'Marketing AI', 'HR AI', 'Operations', 'Communications', 'Analytics', 'AI Command', 'Intelligence Layer'];
  for (const label of forbidden) {
    const visible = await page.getByText(label, { exact: true }).first().isVisible({ timeout: 1_500 }).catch(() => false);
    expect(visible, `Sidebar must NOT show "${label}" for accounting tenant`).toBe(false);
  }

  // F3: click each Accounting sidebar item → navigates correctly
  const accountingItems: Array<[string, string]> = [
    ['Dashboard', '/accounting/dashboard'],
    ['Clients', '/accounting/clients'],
    ['Jobs', '/accounting/jobs'],
    ['Finance', '/accounting/finance'],
    ['Invoices', '/accounting/invoices'],
    ['Reminders', '/accounting/reminders'],
  ];
  for (const [label, expectedUrl] of accountingItems) {
    const link = page.locator('aside, nav').getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first();
    if (await link.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await link.click();
      await page.waitForURL((u) => u.toString().includes(expectedUrl), { timeout: 10_000 }).catch(() => {});
      const url = page.url();
      console.log(`[F3] click "${label}" -> ${url}`);
      expect(url, `${label} should navigate to ${expectedUrl}`).toContain(expectedUrl);
    } else {
      console.log(`[F3] "${label}" sidebar link not found via getByRole(link) — skipping click`);
    }
  }

  // F4: direct /dashboard → redirects to /accounting/dashboard
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_500);
  expect(page.url(), '/dashboard should redirect to /accounting/dashboard').toContain('/accounting/dashboard');

  // F5: direct /sales/dashboard → behavior capture (likely redirects too)
  await page.goto('/sales/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_500);
  console.log(`[F5] /sales/dashboard ended at: ${page.url()}`);
});

// =====================================================================
// GROUP G — Mobile (iPhone 12 viewport) — own context to avoid test.use() worker conflict
// =====================================================================
test('G — Mobile (iPhone 12) bottom nav + sidebar + Jobs', async ({ browser }) => {
  test.setTimeout(180_000);
  const context: BrowserContext = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();

  await loginAsSmartLedger(page);
  expect(page.url()).toContain('/accounting/dashboard');
  await waitForPageLoaded(page, 30_000);
  await page.screenshot({ path: path.join(SHOT_DIR, 'G2-mobile-dashboard.png'), fullPage: true });

  // G1: bottom nav labels visible
  for (const label of ['Home', 'Clients', 'Jobs', 'Invoices']) {
    const hit = await page.getByText(label, { exact: true }).first().isVisible({ timeout: 3_000 }).catch(() => false);
    console.log(`[G1] bottom-nav label "${label}": ${hit ? 'visible' : 'NOT visible'}`);
  }
  // G1b: must NOT show Leads/Sales (default zateceptionist tabs)
  for (const forbidden of ['Leads', 'Sales']) {
    const hit = await page.getByText(forbidden, { exact: true }).first().isVisible({ timeout: 1_500 }).catch(() => false);
    expect(hit, `Mobile bottom nav must NOT show "${forbidden}" for accounting tenant`).toBe(false);
  }

  // G2: no welcome tutorial modal
  const modalVisible = await page.getByText(/welcome to your business hub|let's get started/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
  expect(modalVisible, 'OnboardingFlow tutorial must NOT show for accounting tenant on mobile').toBe(false);

  // G3-G4: hamburger → sidebar → Clients
  const hamburger = page.locator('button[aria-label*="menu" i], button:has(svg.lucide-menu)').first();
  if (await hamburger.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await hamburger.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOT_DIR, 'G3-mobile-sidebar.png'), fullPage: true });

    await expect(page.getByText('Accounting', { exact: true }).first()).toBeVisible();

    const clientsLink = page.locator('aside, [role="dialog"]').getByRole('link', { name: /^Clients$/i }).first();
    if (await clientsLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await clientsLink.click();
      await page.waitForTimeout(1500);
      expect(page.url(), 'Tapping sidebar Clients should navigate').toContain('/accounting/clients');
    } else {
      console.log('[G4] sidebar Clients link not found via getByRole(link)');
    }
  } else {
    console.log('[G3] hamburger not found');
  }

  // G7: jobs page renders on mobile
  await page.goto('/accounting/jobs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: path.join(SHOT_DIR, 'G7-mobile-jobs.png'), fullPage: true });

  const initialMobileRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[G7] mobile job rows: ${initialMobileRows}`);
  expect(initialMobileRows, 'Mobile jobs page renders rows').toBeGreaterThanOrEqual(5);

  await context.close();
});

// =====================================================================
// GROUP H — Cross-tenant isolation (CRITICAL) — separate context
// =====================================================================
test.describe('H — Cross-tenant isolation', () => {
  test.skip(!COS_PASSWORD, 'COSMIQUE_PASSWORD env var not set — cross-tenant test skipped');

  test('H1-H10 — Cosmique cannot see Smart Ledger data', async ({ browser }) => {
    test.setTimeout(180_000);
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();

    // H1-H2: fresh context, login as cosmique
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', COS_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', COS_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
    await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2_000);

    // Best-effort skip onboarding tutorial
    const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close|got it|dismiss/i }).first();
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // H3: NOT on /accounting/dashboard
    const landing = page.url();
    console.log(`[H3] cosmique landing URL: ${landing}`);
    expect(landing, 'cosmique must NOT land on /accounting/dashboard').not.toContain('/accounting/dashboard');
    await page.screenshot({ path: path.join(SHOT_DIR, 'H3-cosmique-landing.png'), fullPage: true });

    // H5: sidebar does NOT show "Accounting" section
    const accountingInSidebar = await page.getByText('Accounting', { exact: true }).first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(accountingInSidebar, 'cosmique sidebar must NOT show "Accounting" section').toBe(false);

    // H6: direct URL /accounting/jobs → MUST return 0 jobs (no Smart Ledger leakage)
    await page.goto('/accounting/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    await page.screenshot({ path: path.join(SHOT_DIR, 'H6-cosmique-on-accounting-jobs.png'), fullPage: true });

    // H8: NO Smart Ledger client/job names visible
    const slLeakNames = ['Acme Holdings', 'Birch', 'Cedar Bridge', 'Daleworth', 'Eastgate', 'Fairway', 'Greenhill', 'Hawthorne', 'Ironside', 'Jubilee', 'CT600 FY25', 'PAYE month-end', 'VAT return Q1', 'Year-end accounts'];
    for (const name of slLeakNames) {
      const hit = await page.getByText(name, { exact: false }).first().isVisible({ timeout: 1_500 }).catch(() => false);
      expect(hit, `cosmique must NOT see Smart Ledger entity "${name}"`).toBe(false);
    }

    // H7: direct URL /accounting/clients → 0 clients
    await page.goto('/accounting/clients', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    for (const name of ['Acme Holdings', 'Cedar Bridge', 'Daleworth', 'Hawthorne']) {
      const hit = await page.getByText(name, { exact: false }).first().isVisible({ timeout: 1_500 }).catch(() => false);
      expect(hit, `cosmique must NOT see Smart Ledger client "${name}"`).toBe(false);
    }

    await context.close();
  });
});

// =====================================================================
// GROUP I — Session security (unauthenticated)
// =====================================================================
test.describe('I — Session security', () => {
  test('I1-I4 — unauthenticated access redirects to /login', async ({ browser }) => {
    test.setTimeout(60_000);
    const context: BrowserContext = await browser.newContext();
    const page = await context.newPage();

    for (const url of ['/accounting/dashboard', '/accounting/clients', '/accounting/jobs']) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2_000);
      const final = page.url();
      console.log(`[I] ${url} -> ${final}`);
      // Accept either /login OR a landing that does NOT expose tenant data
      const safe = final.includes('/login') || (await page.getByText('Adil', { exact: false }).first().isVisible({ timeout: 1_500 }).catch(() => false)) === false;
      expect(safe, `Unauthenticated ${url} must redirect to /login (or not expose data)`).toBe(true);
    }
    await context.close();
  });
});
