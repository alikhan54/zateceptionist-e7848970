/**
 * Smart Ledger Dashboard — MoneyPex parity F5 + F6 verification (Phase 6, 2026-05-29).
 *
 * F5 = JobsCalendar (month grid + click-day modal + bank-holiday markers)
 * F6 = WorkloadPanel (per-staff job count + sort/filter)
 *
 * Both render inside /accounting (the accounting Dashboard). Industry-gated.
 *
 * Run locally:
 *   cd D:/420-system/frontend-session-c
 *   E2E_BASE_URL=http://localhost:4173 SMART_LEDGER_PASSWORD='...' \
 *     npx playwright test --project=smart-ledger-dashboard-parity --reporter=list
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.SMART_LEDGER_EMAIL || 'team@smartledgersolutions.co.uk';
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || '';
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-29-smart-ledger-dashboard-parity');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!PASSWORD) throw new Error('SMART_LEDGER_PASSWORD env var is required');
});

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

test('Phase 6 — Smart Ledger Dashboard renders Calendar + Workload panels (desktop)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE.ERROR: ${msg.text()}`);
  });

  await login(page);
  await page.goto('/accounting', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="accounting-dashboard"]', { timeout: 30_000 });

  // F5 Calendar visible
  await expect(page.getByTestId('jobs-calendar')).toBeVisible();
  await expect(page.getByTestId('cal-month-label')).toBeVisible();
  await expect(page.getByTestId('cal-grid')).toBeVisible();
  await expect(page.getByTestId('cal-legend')).toBeVisible();

  const initialMonth = await page.getByTestId('cal-month-label').textContent();
  console.log(`[Phase 6] initial month label: ${initialMonth}`);

  // Navigate forward then back
  await page.getByTestId('cal-next').click();
  await page.waitForTimeout(300);
  const nextMonth = await page.getByTestId('cal-month-label').textContent();
  expect(nextMonth).not.toBe(initialMonth);
  console.log(`[Phase 6] after next: ${nextMonth}`);

  await page.getByTestId('cal-prev').click();
  await page.waitForTimeout(300);
  const backMonth = await page.getByTestId('cal-month-label').textContent();
  expect(backMonth).toBe(initialMonth);
  console.log(`[Phase 6] after prev: ${backMonth}`);

  // Today button anchors current month
  await page.getByTestId('cal-today').click();
  await page.waitForTimeout(300);
  const todayMonth = await page.getByTestId('cal-month-label').textContent();
  const expectedTodayLabel = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  expect(todayMonth?.trim()).toBe(expectedTodayLabel);

  // At least one day cell exists
  const dayCells = page.locator('[data-testid^="cal-day-"]');
  const cellCount = await dayCells.count();
  expect(cellCount).toBeGreaterThanOrEqual(28);
  console.log(`[Phase 6] day cells in grid: ${cellCount}`);

  // Find a cell flagged as holiday (Spring bank holiday 2026-05-25 should be in May view)
  // Navigate to May 2026 specifically
  // (initialMonth might already be May or might be a different month; just check holiday cell exists somewhere)
  let holidayFound = 0;
  for (let m = 0; m < 6; m++) {
    const holidayCells = page.locator('[data-testid^="cal-day-"][data-holiday="yes"]');
    holidayFound = await holidayCells.count();
    if (holidayFound > 0) break;
    await page.getByTestId('cal-next').click();
    await page.waitForTimeout(200);
  }
  expect(holidayFound).toBeGreaterThan(0);
  console.log(`[Phase 6] holiday cells found in scanned months: ${holidayFound}`);

  // Reset to Today
  await page.getByTestId('cal-today').click();
  await page.waitForTimeout(300);

  // F6 Workload panel visible
  await expect(page.getByTestId('workload-panel')).toBeVisible();
  await expect(page.getByTestId('workload-status-filter')).toBeVisible();
  await expect(page.getByTestId('workload-sort-key')).toBeVisible();

  // At least 1 staff row OR an "Unassigned" row should appear (Smart Ledger has 5 staff)
  await page.waitForTimeout(1500);
  const workloadRows = page.locator('[data-testid^="workload-row-"]');
  const rowCount = await workloadRows.count();
  console.log(`[Phase 6] workload rows: ${rowCount}`);
  expect(rowCount).toBeGreaterThan(0);

  // Change sort key — verify still functional
  await page.getByTestId('workload-sort-key').click();
  await page.getByRole('option', { name: 'Overdue' }).click();
  await page.waitForTimeout(500);
  const afterSort = await page.locator('[data-testid^="workload-row-"]').count();
  expect(afterSort).toBeGreaterThan(0);

  // Change status filter
  await page.getByTestId('workload-status-filter').click();
  await page.getByRole('option', { name: 'All' }).click();
  await page.waitForTimeout(500);
  expect(await page.locator('[data-testid^="workload-row-"]').count()).toBeGreaterThan(0);

  const filteredErrors = errors.filter((e) =>
    !e.toLowerCase().includes('failed to load resource') &&
    !e.toLowerCase().includes('favicon') &&
    !e.toLowerCase().includes('manifest') &&
    !e.toLowerCase().includes('websocket'),
  );
  if (filteredErrors.length) console.log('[Phase 6] uncaught errors:', filteredErrors);

  await page.screenshot({ path: path.join(SHOT_DIR, 'dashboard-parity-desktop.png'), fullPage: true });
  console.log('[Phase 6] Desktop PASS');
});

test('Phase 6 — Dashboard parity panels render on mobile viewport', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto('/accounting', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="accounting-dashboard"]', { timeout: 30_000 });

  await expect(page.getByTestId('jobs-calendar')).toBeVisible();
  await expect(page.getByTestId('workload-panel')).toBeVisible();

  const dims = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }));
  console.log(`[Phase 6 mobile] body scrollWidth=${dims.scrollWidth} clientWidth=${dims.clientWidth}`);
  expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth + 1);

  await page.screenshot({ path: path.join(SHOT_DIR, 'dashboard-parity-mobile.png'), fullPage: true });
  console.log('[Phase 6] Mobile PASS');
});
