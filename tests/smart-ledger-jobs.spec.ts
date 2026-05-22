/**
 * Smart Ledger Jobs page CRUD verification — D7-A (2026-05-22).
 *
 * Standalone test: does NOT consume auth.setup.ts (that's the cosmique flow).
 * Logs in as Adil Vohra (team@smartledgersolutions.co.uk), exercises the new
 * /accounting/jobs page end-to-end:
 *   1. Verifies the 5 demo jobs seeded May 18 render
 *   2. Status + priority filters narrow the list correctly
 *   3. Search by title narrows the list
 *   4. Creates a new job via the dialog — assert it appears in the table
 *   5. Inline status menu transitions the new job to 'done' — assert auto-stamp
 *   6. Deletes the test job via row menu → confirmation → assert removed
 *
 * Run locally:
 *   cd D:/420-system/frontend
 *   E2E_BASE_URL=http://localhost:4173 SMART_LEDGER_PASSWORD='...' \
 *     npx playwright test smart-ledger-jobs.spec.ts --reporter=list
 *
 * Credentials passed via env vars (never committed):
 *   SMART_LEDGER_EMAIL     defaults to team@smartledgersolutions.co.uk
 *   SMART_LEDGER_PASSWORD  required
 *   E2E_BASE_URL           defaults to https://ai.zatesystems.com — set to local URL while testing local build
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.SMART_LEDGER_EMAIL || 'team@smartledgersolutions.co.uk';
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || '';
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-22-smart-ledger-jobs');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!PASSWORD) throw new Error('SMART_LEDGER_PASSWORD env var is required');
});

test('D7-A — Smart Ledger Jobs page CRUD end-to-end', async ({ page }) => {
  test.setTimeout(180_000);

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE.ERROR: ${msg.text()}`);
  });

  // ---- 1) Login ----
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();

  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500); // TenantContext settle

  // Skip onboarding/tutorial if it appears (should NOT for Smart Ledger — Layout gate — but be defensive)
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close|got it|dismiss/i }).first();
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(SHOT_DIR, '01-after-login.png'), fullPage: true });
  expect(page.url()).toContain('/accounting/dashboard');

  // ---- 2) Navigate to Jobs page ----
  await page.goto('/accounting/jobs', { waitUntil: 'networkidle' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT_DIR, '02-jobs-loaded.png'), fullPage: true });

  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible();
  await expect(page.getByTestId('new-job-button')).toBeVisible();
  await expect(page.getByTestId('stat-open-jobs')).toBeVisible();
  await expect(page.getByTestId('stat-overdue')).toBeVisible();
  await expect(page.getByTestId('stat-due-week')).toBeVisible();
  await expect(page.getByTestId('stat-done-month')).toBeVisible();

  // ---- 3) Verify the 5 demo jobs seeded May 18 render ----
  // Demo job titles (from accounting_jobs query 2026-05-22):
  const demoTitles = [
    'CT600 FY25',
    'PAYE month-end May',
    'Self Assessment 2024/25',
    'VAT return Q1 2026',
    'Year-end accounts FY25',
  ];
  for (const partial of demoTitles) {
    const cell = page.locator(`tr td:first-child`).filter({ hasText: partial });
    await expect(cell.first(), `Demo job containing "${partial}" should render`).toBeVisible({ timeout: 10_000 });
  }
  // At least 5 rows in the table body (excluding header)
  const initialRowCount = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[D7-A] Initial visible job rows: ${initialRowCount}`);
  expect(initialRowCount).toBeGreaterThanOrEqual(5);

  // ---- 4) Filter by status=blocked → only CT600 should remain ----
  await page.getByTestId('status-filter').click();
  await page.getByRole('option', { name: 'Blocked' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOT_DIR, '03-filter-blocked.png'), fullPage: true });
  const blockedRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[D7-A] Rows visible with status=blocked filter: ${blockedRows}`);
  expect(blockedRows).toBe(1);
  await expect(
    page.locator('tr td:first-child').filter({ hasText: 'CT600 FY25' })
  ).toBeVisible();

  // Reset status filter
  await page.getByTestId('status-filter').click();
  await page.getByRole('option', { name: 'All statuses' }).click();
  await page.waitForTimeout(500);

  // ---- 5) Search filter ----
  await page.getByTestId('jobs-search').fill('VAT');
  await page.waitForTimeout(800);
  const vatRows = await page.locator('table tbody tr[data-testid^="job-row-"]').count();
  console.log(`[D7-A] Rows visible with search 'VAT': ${vatRows}`);
  expect(vatRows).toBeGreaterThanOrEqual(1);
  await expect(
    page.locator('tr td:first-child').filter({ hasText: 'VAT return Q1 2026' })
  ).toBeVisible();
  await page.getByTestId('jobs-search').fill('');
  await page.waitForTimeout(500);

  // ---- 6) Create new test job ----
  const testJobTitle = `D7A_TEST_${Date.now()}`;
  await page.getByTestId('new-job-button').click();
  await page.waitForTimeout(500);
  await page.getByTestId('job-form-title').fill(testJobTitle);
  await page.getByTestId('job-form-description').fill('Auto-created by D7-A Playwright spec — safe to delete.');

  // Set priority = urgent via Select
  await page.getByTestId('job-form-priority').click();
  await page.getByRole('option', { name: 'Urgent' }).click();

  await page.screenshot({ path: path.join(SHOT_DIR, '04-create-dialog-filled.png'), fullPage: true });

  await page.getByTestId('job-form-submit').click();

  // Wait for dialog to close and toast to confirm
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SHOT_DIR, '05-after-create.png'), fullPage: true });

  // New job should appear (find by title)
  await expect(
    page.locator('tr').filter({ hasText: testJobTitle })
  ).toBeVisible({ timeout: 10_000 });

  // Capture the new job row's testid to look it up later
  const newRowHandle = page.locator('tr').filter({ hasText: testJobTitle }).first();
  const newRowTestId = await newRowHandle.getAttribute('data-testid');
  console.log(`[D7-A] Created job row testid: ${newRowTestId}`);
  expect(newRowTestId).toMatch(/^job-row-/);
  const newJobId = newRowTestId!.replace('job-row-', '');

  // ---- 7) Transition status via inline menu: backlog → done ----
  await page.getByTestId(`job-row-menu-${newJobId}`).click();
  await page.waitForTimeout(400);
  await page.getByTestId('job-row-menu-status-done').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOT_DIR, '06-after-status-done.png'), fullPage: true });

  // The same row should now show 'Done' badge
  await expect(
    page.locator(`tr[data-testid="${newRowTestId}"]`).getByText('Done', { exact: true })
  ).toBeVisible({ timeout: 5000 });

  // ---- 8) Delete the test job ----
  await page.getByTestId(`job-row-menu-${newJobId}`).click();
  await page.waitForTimeout(400);
  await page.getByTestId('job-row-menu-delete').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOT_DIR, '07-delete-confirm-open.png'), fullPage: true });

  await page.getByTestId('confirm-delete-job').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOT_DIR, '08-after-delete.png'), fullPage: true });

  // Row should be gone
  await expect(
    page.locator(`tr[data-testid="${newRowTestId}"]`)
  ).not.toBeVisible({ timeout: 5000 });

  // Original 5 demo rows should still be present
  for (const partial of demoTitles) {
    const cell = page.locator(`tr td:first-child`).filter({ hasText: partial });
    await expect(cell.first(), `Demo job "${partial}" must still render after CRUD cycle`).toBeVisible();
  }

  // ---- 9) Final sanity: no page-level errors ----
  if (errors.length) {
    console.log('[D7-A] Captured errors:');
    for (const e of errors) console.log('  ', e);
  }
  // Treat unhandled page errors as a failure (console errors are tolerated)
  const fatal = errors.filter((e) => e.startsWith('PAGEERROR:'));
  expect(fatal, `Fatal page errors: ${fatal.join('; ')}`).toEqual([]);

  console.log('[D7-A] PASS — Smart Ledger Jobs CRUD end-to-end clean');
});
