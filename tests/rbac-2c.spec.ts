/**
 * Phase 2C — full capability control. Proves a tenant ADMIN is now subject to the module
 * featureKey gate (only master_admin bypasses). Driven by .tmp_phase2c/test_2c_part1.py,
 * which sets welkin's marketing_module via the 2B RPC, runs this spec with the matching
 * expectation, and always restores. Env (CLAUDE.md §21):
 *   TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD  — welkin admin (saif@welkin-demo.com)
 *   MARKETING_EXPECT = 'present' | 'gone'
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_TENANT_EMAIL || '';
const PASSWORD = process.env.TEST_TENANT_PASSWORD || '';
const EXPECT = process.env.MARKETING_EXPECT || 'present';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  try { await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 }); } catch { /* noop */ }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
}

test('tenant admin sidebar respects the module gate', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!PASSWORD, 'TEST_TENANT_PASSWORD (welkin) not provided.');
  await login(page, EMAIL, PASSWORD);
  // Neutral page: the sidebar renders, and "Marketing AI" appears ONLY as a sidebar section here.
  await page.goto('/customers', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_500);

  // Sanity: sidebar loaded; an untoggled module section + a non-featureKey section both remain.
  await expect(page.getByText('Sales AI', { exact: true }).first(), 'Sales AI (untoggled) must remain').toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Settings', { exact: true }).first(), 'Settings (no featureKey) must remain').toBeVisible();

  const marketing = page.getByText('Marketing AI', { exact: true });
  if (EXPECT === 'gone') {
    await expect(marketing, 'Marketing AI must be GONE from the tenant ADMIN sidebar when flagged off').toHaveCount(0);
  } else {
    await expect(marketing.first(), 'Marketing AI must be visible on default flags (NO REGRESSION)').toBeVisible({ timeout: 15_000 });
  }
});
