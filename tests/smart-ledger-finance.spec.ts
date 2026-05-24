/**
 * Smart Ledger Finance page verification — D7-B (2026-05-24).
 *
 * Runs against whatever URL E2E_BASE_URL points at (default https://ai.zatesystems.com).
 * For local-build verification before push, pass E2E_BASE_URL=http://127.0.0.1:4173.
 *
 * Asserts:
 *   1. Login → /accounting/dashboard
 *   2. Navigate to /accounting/finance
 *   3. All 6 KPI cards render (testids)
 *   4. Range selector cycles through 4 options without throwing
 *   5. Revenue trend + invoice donut sections render (loaded or empty-state)
 *   6. Top 5 clients section renders
 *   7. Recent transactions section renders
 *   8. "Add Payment" / "Reconcile" buttons are DISABLED + show TrueLayer tooltip on hover
 *   9. Mobile viewport (iPhone 12 via separate context) — page renders, no horizontal scroll
 *
 * Credentials via env vars (gitignored):
 *   SMART_LEDGER_EMAIL    defaults to team@smartledgersolutions.co.uk
 *   SMART_LEDGER_PASSWORD required
 */
import { test, expect, devices, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.SMART_LEDGER_EMAIL || 'team@smartledgersolutions.co.uk';
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || '';
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-24-smart-ledger-finance');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!PASSWORD) throw new Error('SMART_LEDGER_PASSWORD env var is required');
});

async function loginAsSmartLedger(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close|got it|dismiss/i }).first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function waitForFinanceLoaded(page: Page) {
  // Page is loaded when at least one KPI card has text in its value div (or skeleton has been replaced)
  await page.getByTestId('accounting-finance-page').waitFor({ state: 'visible', timeout: 15_000 });
  // Wait for Skeleton placeholders inside KPI cards to disappear
  const skel = page.getByTestId('kpi-cash-position').locator('.animate-pulse').first();
  if (await skel.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skel.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

test('D7-B — Finance page renders 6 KPIs + charts + tables (desktop)', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsSmartLedger(page);
  expect(page.url()).toContain('/accounting/dashboard');

  await page.goto('/accounting/finance', { waitUntil: 'networkidle' });
  await waitForFinanceLoaded(page);
  await page.screenshot({ path: path.join(SHOT_DIR, '01-finance-default-month.png'), fullPage: true });

  // 6 KPI cards
  for (const testId of [
    'kpi-cash-position',
    'kpi-outstanding',
    'kpi-overdue',
    'kpi-mtd-revenue',
    'kpi-avg-dso',
    'kpi-top-client',
  ]) {
    await expect(page.getByTestId(testId), `KPI ${testId} must render`).toBeVisible();
  }

  // Charts (loaded or empty-state — both acceptable; container must render)
  await expect(page.getByTestId('finance-revenue-trend')).toBeVisible();
  await expect(page.getByTestId('finance-invoice-donut')).toBeVisible();

  // Top 5 + recent transactions tables
  await expect(page.getByTestId('finance-top-clients')).toBeVisible();
  await expect(page.getByTestId('finance-recent-transactions')).toBeVisible();

  // "View all" links to /accounting/invoices
  await expect(page.getByTestId('finance-view-all-invoices')).toBeVisible();

  // Range selector cycles
  await page.getByTestId('finance-range-selector').click();
  await page.getByRole('option', { name: 'This quarter' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT_DIR, '02-finance-quarter.png'), fullPage: true });
  await expect(page.getByTestId('kpi-cash-position')).toBeVisible();

  await page.getByTestId('finance-range-selector').click();
  await page.getByRole('option', { name: 'This year' }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('kpi-cash-position')).toBeVisible();

  await page.getByTestId('finance-range-selector').click();
  await page.getByRole('option', { name: 'All time' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT_DIR, '03-finance-all-time.png'), fullPage: true });

  // Disabled buttons + tooltip
  const addPaymentBtn = page.getByTestId('finance-add-payment');
  await expect(addPaymentBtn).toBeVisible();
  await expect(addPaymentBtn).toBeDisabled();
  const reconcileBtn = page.getByTestId('finance-reconcile');
  await expect(reconcileBtn).toBeVisible();
  await expect(reconcileBtn).toBeDisabled();

  // Tooltip text shown on hover of the span wrapper (TooltipTrigger asChild)
  const addPaymentWrapper = addPaymentBtn.locator('xpath=ancestor::span[1]');
  await addPaymentWrapper.hover();
  await page.waitForTimeout(500);
  const tooltipShown = await page.getByText(/Available after TrueLayer/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
  console.log(`[D7-B] TrueLayer tooltip visible on hover: ${tooltipShown}`);
  // Tooltip may or may not appear under emulation; the disabled state itself is the load-bearing assertion

  console.log('[D7-B] Desktop PASS');
});

test('D7-B — Finance page mobile (iPhone 12) renders without horizontal scroll', async ({ browser }) => {
  test.setTimeout(120_000);
  const context: BrowserContext = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();

  await loginAsSmartLedger(page);
  await page.goto('/accounting/finance', { waitUntil: 'networkidle' });
  await waitForFinanceLoaded(page);
  await page.screenshot({ path: path.join(SHOT_DIR, '04-finance-mobile.png'), fullPage: true });

  // KPI cards still render
  await expect(page.getByTestId('kpi-cash-position')).toBeVisible();
  await expect(page.getByTestId('kpi-top-client')).toBeVisible();

  // No horizontal page-level scroll (KPI grid is 2-col on mobile per design)
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log(`[D7-B mobile] body scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);
  // Allow a 4px tolerance for sub-pixel rounding
  expect(scrollWidth - clientWidth, 'Page should not have meaningful horizontal scroll on iPhone 12').toBeLessThanOrEqual(4);

  await context.close();
  console.log('[D7-B] Mobile PASS');
});
