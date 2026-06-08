/**
 * Phase 2B — proof that a master-admin per-tenant module toggle REACHES the tenant.
 *
 * Driven by the orchestrator (.tmp_phase2b/test_2b.py): it toggles the test tenant's
 * marketing module OFF via the RPC, runs THIS spec, then restores. The legacy dashboard's
 * AI-agents grid reads features.marketing_module role-independently, so an admin login
 * reflects the change. Env (CLAUDE.md §21 — never hardcoded):
 *   TEST_TENANT_EMAIL / TEST_TENANT_PASSWORD  — the disposable test tenant (welkin).
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_TENANT_EMAIL || '';
const PASSWORD = process.env.TEST_TENANT_PASSWORD || '';
const EXPECT_DISABLED = process.env.MARKETING_EXPECT === 'disabled'; // orchestrator sets the expectation

async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  try { await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 }); } catch { /* noop */ }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
}

test('test tenant dashboard reflects the marketing-module toggle', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!PASSWORD, 'TEST_TENANT_PASSWORD (welkin) not provided.');
  await login(page, EMAIL, PASSWORD);
  await page.goto('/dashboard?ui=legacy', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3_000);
  // The legacy dashboard AI-agents grid renders a "Marketing AI" row; when marketing_module=false
  // its badge reads "disabled", otherwise "<n> actions".
  const disabledMarketing = page.locator('div').filter({ hasText: 'Marketing AI' }).filter({ hasText: 'disabled' });
  if (EXPECT_DISABLED) {
    await expect(disabledMarketing.first(), 'Marketing AI must show "disabled" after the toggle OFF').toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.getByText('Marketing AI').first()).toBeVisible({ timeout: 15_000 });
    await expect(disabledMarketing, 'Marketing AI must NOT be disabled when the module is ON').toHaveCount(0);
  }
});
