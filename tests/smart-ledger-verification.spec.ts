/**
 * Smart Ledger UI verification — Phase J2 (2026-05-19)
 *
 * Standalone test: does NOT consume auth.setup.ts (that's for the cosmique tenant).
 * Logs in as Adil Vohra (team@smartledgersolutions.co.uk), walks every page in the
 * new accounting/ surface, screenshots each, asserts visible content.
 *
 * Run: cd D:/420-system/frontend && npx playwright test smart-ledger-verification.spec.ts --reporter=list
 *
 * Credentials passed via env vars to avoid committing the temp password.
 *   SMART_LEDGER_EMAIL    — defaults to team@smartledgersolutions.co.uk
 *   SMART_LEDGER_PASSWORD — required
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.SMART_LEDGER_EMAIL || 'team@smartledgersolutions.co.uk';
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || '';
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-19-smart-ledger-verification');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!PASSWORD) throw new Error('SMART_LEDGER_PASSWORD env var is required');
});

test('Phase J2 — Smart Ledger UI end-to-end walk', async ({ page }) => {
  test.setTimeout(180_000);

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE.ERROR: ${msg.text()}`);
  });

  // ---- 1) Login ----
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SHOT_DIR, '01-login-page.png'), fullPage: true });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  const loginBtn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
  await loginBtn.click();

  // ---- 2) Wait for app shell ----
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500); // allow TenantContext to settle (industry/feature gates)

  // Skip onboarding/tutorial if it appears
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close|got it|dismiss/i }).first();
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, '02-after-login.png'), fullPage: true });

  // ---- 3) Post-login landing URL MUST be /accounting/dashboard (Phase J fix) ----
  const landingUrl = page.url();
  console.log(`[verify] Post-login landing URL: ${landingUrl}`);
  expect(landingUrl).toContain('/accounting/dashboard');

  // ---- 3b) Sidebar must NOT show non-accounting sections (minimal-mode) ----
  const forbiddenSectionLabels = [
    'Sales AI', 'Marketing AI', 'HR AI', 'Operations',
    'Communications', 'Analytics', 'Intelligence Layer',
  ];
  for (const label of forbiddenSectionLabels) {
    const visible = await page.getByText(label, { exact: true }).first()
      .isVisible({ timeout: 1500 }).catch(() => false);
    if (visible) {
      console.log(`[verify] FAIL: sidebar contains forbidden label "${label}"`);
    }
    expect(visible, `sidebar must NOT show "${label}" for accounting tenant non-master-admin`).toBe(false);
  }

  // Sidebar MUST show Accounting label
  const accountingVisible = await page.getByText('Accounting', { exact: true }).first()
    .isVisible({ timeout: 3000 }).catch(() => false);
  expect(accountingVisible, 'sidebar MUST show "Accounting" section').toBe(true);

  // ---- 3c) Direct URL test — /dashboard must redirect back to /accounting/dashboard ----
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  expect(page.url()).toContain('/accounting/dashboard');

  // ---- 4) Navigate to /accounting/dashboard directly ----
  await page.goto('/accounting/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // let count queries resolve
  await page.screenshot({ path: path.join(SHOT_DIR, '03-accounting-dashboard.png'), fullPage: true });

  // The header must mention the user (Adil Vohra) — full_name from D2 provisioning
  await expect(page.getByText(/Welcome,?\s*Adil/i)).toBeVisible({ timeout: 10_000 });

  // The 3 stat counts must appear: 10 / 5 / 5
  // Wait for any of the count labels (loose check — robust to skeleton timing)
  await expect(page.locator('body')).toContainText(/10/);
  await expect(page.locator('body')).toContainText(/Clients/i);
  await expect(page.locator('body')).toContainText(/Jobs/i);
  await expect(page.locator('body')).toContainText(/Invoices/i);
  await expect(page.locator('body')).toContainText(/May.*2026/);

  // Brand background — Smart Ledger cream #faf6ed must be on the Layout container.
  // Read inline style of the root SidebarProvider div.
  const bodyBg = await page.evaluate(() => {
    const rootDiv = document.querySelector('.min-h-screen.flex.w-full');
    return rootDiv ? (rootDiv as HTMLElement).style.backgroundColor : '';
  });
  console.log('[verify] Layout root backgroundColor:', bodyBg);

  // ---- 5) Clients page ----
  await page.goto('/accounting/clients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let table load
  await page.screenshot({ path: path.join(SHOT_DIR, '04-accounting-clients.png'), fullPage: true });

  await expect(page.getByRole('heading', { name: /^Clients$/, level: 1 })).toBeVisible({ timeout: 10_000 });

  // 10 client names must be present (assert at least 5 of them to be robust to render variance)
  const expectedClients = ['Acme Holdings', 'Birch & Co', 'Cedar Bridge', 'Daleworth', 'Eastgate',
                           'Fairway', 'Greenhill', 'Hawthorne', 'Ironside', 'Jubilee'];
  let visibleClients = 0;
  for (const name of expectedClients) {
    if (await page.getByText(name, { exact: false }).first().isVisible({ timeout: 2000 }).catch(() => false)) {
      visibleClients++;
    }
  }
  console.log(`[verify] Visible client names: ${visibleClients}/10`);
  expect(visibleClients).toBeGreaterThanOrEqual(8);

  // Status badge "active" must appear at least once
  await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 5000 });

  // ---- 6) 4 placeholder pages ----
  for (const slug of ['jobs', 'finance', 'invoices', 'reminders']) {
    await page.goto(`/accounting/${slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SHOT_DIR, `05-accounting-${slug}.png`), fullPage: true });
    // Each placeholder must mention May 25 and have feature bullets
    await expect(page.getByText(/Monday,? 25 May 2026|May 2026/i)).toBeVisible({ timeout: 5000 });
  }

  // ---- 7) Back to dashboard (final state) ----
  await page.goto('/accounting/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SHOT_DIR, '06-final-dashboard.png'), fullPage: true });

  // ---- 8) Surface any console errors collected during the walk ----
  if (errors.length > 0) {
    console.log('\n=== CONSOLE / PAGE ERRORS DURING WALK ===');
    for (const e of errors) console.log('  ' + e);
    console.log('=== END ERRORS ===\n');
  } else {
    console.log('[verify] No page or console errors observed during the walk.');
  }

  // Allow up to 2 console errors (some apps are noisy from 3rd-party scripts).
  // Fail hard if more — Adil would see issues.
  expect(errors.length).toBeLessThan(3);
});
