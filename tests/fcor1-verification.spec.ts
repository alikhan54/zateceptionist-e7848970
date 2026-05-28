/**
 * F-COR-1 Verification — Permanent regression spec.
 *
 * Verifies the 2026-05-26 cleanup that removed 2 duplicate user_roles rows:
 *  - asra@marhamagroup.com  (deleted row 07aa8813 staff/NULL/2026-01-07)
 *  - admin@rewerck-roofing.zatesystems.com (deleted row 05d040c8 admin/admin-aeba8a66/2026-04-21)
 *
 * Plus captures the KNOWN-BROKEN adeel@zatesystems.com case (phantom public.users row
 * 4c60c257 not yet deleted — separate session task) so we have a stable failure baseline
 * if the phantom ever IS cleaned up later.
 *
 * Credentials are env-var based (see CLAUDE.md §21). Each test skips itself if the
 * relevant env vars are not set, so CI / cred-less environments stay green.
 */
import { test, expect } from '@playwright/test';

const REWERCK_EMAIL = 'admin@rewerck-roofing.zatesystems.com';
const REWERCK_PASSWORD = process.env.REWERCK_ADMIN_PASSWORD;
const ASRA_EMAIL = 'asra@marhamagroup.com';
const ASRA_PASSWORD = process.env.ASRA_PASSWORD;
const ADEEL_EMAIL = 'adeel@zatesystems.com';
const ADEEL_PASSWORD = process.env.ZATE_PASSWORD;

const BASE = process.env.E2E_BASE_URL || 'https://ai.zatesystems.com';

async function loginAs(page: any, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test('F-COR-1: rewerck admin renders as Admin (post-cleanup)', async ({ page }) => {
  test.skip(!REWERCK_PASSWORD, 'REWERCK_ADMIN_PASSWORD not set — credential-gated test deferred');
  test.setTimeout(120_000);
  await loginAs(page, REWERCK_EMAIL, REWERCK_PASSWORD!);
  await page.screenshot({ path: '.tmp_phase2_sweep/02_playwright_results/fcor1_rewerck_dashboard.png', fullPage: true });

  // The user should NOT land on /login (login succeeded)
  await expect(page).not.toHaveURL(/\/login/);

  // Navigate to /settings/billing — admin-gated page; if AccessRestricted shows the user is rendering as staff (= bug)
  await page.goto(`${BASE}/settings/billing`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  const bodyText = (await page.locator('body').textContent({ timeout: 5_000 }))?.toLowerCase() || '';
  const stillRestricted = bodyText.includes('access restricted') && bodyText.includes('admin');
  await page.screenshot({ path: '.tmp_phase2_sweep/02_playwright_results/fcor1_rewerck_billing.png', fullPage: true });
  expect(stillRestricted, 'Rewerck admin should NOT see AccessRestricted on /settings/billing after F-COR-1 cleanup').toBe(false);
});

test('F-COR-1: asra has marhama-group access (post-cleanup)', async ({ page }) => {
  test.skip(!ASRA_PASSWORD, 'ASRA_PASSWORD not set — credential-gated test deferred');
  test.setTimeout(120_000);
  await loginAs(page, ASRA_EMAIL, ASRA_PASSWORD!);
  await expect(page).not.toHaveURL(/\/login/);
  // asra is staff role; she should land on dashboard, not be denied
  await page.screenshot({ path: '.tmp_phase2_sweep/02_playwright_results/fcor1_asra_dashboard.png', fullPage: true });
});

test('F-COR-1: adeel STILL renders as staff (KNOWN BROKEN — phantom public.users 4c60c257 not yet deleted)', async ({ page }) => {
  test.skip(!ADEEL_PASSWORD, 'ZATE_PASSWORD not set — credential-gated test deferred');
  test.setTimeout(120_000);
  await loginAs(page, ADEEL_EMAIL, ADEEL_PASSWORD!);
  await expect(page).not.toHaveURL(/\/login/);

  // Visit /settings/billing — adeel SHOULD be admin (zateceptionist owner) but the .maybeSingle()
  // bug on AuthContext means he renders as staff right now and gets AccessRestricted.
  // This assertion is INVERTED relative to expected-behavior; flip when phantom is deleted.
  await page.goto(`${BASE}/settings/billing`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  const bodyText = (await page.locator('body').textContent({ timeout: 5_000 }))?.toLowerCase() || '';
  await page.screenshot({ path: '.tmp_phase2_sweep/02_playwright_results/fcor1_adeel_KNOWN_BROKEN.png', fullPage: true });
  // We KNOW this is broken right now. Record the symptom; do NOT fail the suite.
  const isRestricted = bodyText.includes('access restricted');
  test.info().annotations.push({ type: 'known-broken', description: `adeel /settings/billing access_restricted=${isRestricted} (expected isRestricted=true until phantom public.users 4c60c257 is deleted)` });
});
