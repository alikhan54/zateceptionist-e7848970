/**
 * Phase 2A — Master Admin control plane E2E (permanent regression).
 *
 * Credentials via env vars (CLAUDE.md §21 — never hardcoded):
 *   MASTER_EMAIL / MASTER_PASSWORD     — the master_admin (zatesystems7@gmail.com).
 *                                        NOT in the shared creds file; tests 1-3 self-skip
 *                                        until these are provided.
 *   NONADMIN_EMAIL / NONADMIN_PASSWORD — a regular tenant admin (cosmique) for isolation.
 *
 * Run against a local preview of the built worktree (E2E_BASE_URL).
 */
import { test, expect, type Page } from '@playwright/test';

const MASTER_EMAIL = process.env.MASTER_EMAIL || '';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || '';
const NONADMIN_EMAIL = process.env.NONADMIN_EMAIL || '';
const NONADMIN_PASSWORD = process.env.NONADMIN_PASSWORD || '';

const OPERATIONAL = ['Sales AI', 'Marketing AI', 'HR AI', 'Operations', 'Communications'];

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  try { await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 }); } catch { /* noop */ }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
}

test.describe.serial('Master Admin control plane', () => {
  test('1. master admin sidebar shows ONLY the Master Admin section (operational hidden)', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!MASTER_PASSWORD, 'MASTER_PASSWORD (zatesystems7) not provided — set to run.');
    await loginAs(page, MASTER_EMAIL, MASTER_PASSWORD);
    await expect(page.getByText('Master Admin', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /All Tenants/i }).first()).toBeVisible();
    for (const label of OPERATIONAL) {
      await expect(page.getByText(label, { exact: true }), `${label} must be hidden for master admin`).toHaveCount(0);
    }
  });

  test('2. /admin/tenants shows real tenants + MRR (not the 156 / $48.5K placeholders)', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!MASTER_PASSWORD, 'MASTER_PASSWORD not provided.');
    await loginAs(page, MASTER_EMAIL, MASTER_PASSWORD);
    await page.goto('/admin/tenants', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    await expect(page.getByText('$48.5K')).toHaveCount(0);          // hardcoded MRR gone
    const rows = page.locator('table tbody tr');
    await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(10); // real 45, not 1
  });

  test('3. /admin/users shows users across multiple tenants', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!MASTER_PASSWORD, 'MASTER_PASSWORD not provided.');
    await loginAs(page, MASTER_EMAIL, MASTER_PASSWORD);
    await page.goto('/admin/users', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    const rows = page.locator('table tbody tr');
    await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(5);
  });

  test('4. isolation — a non-master_admin sees no Master Admin section nor cross-tenant data', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!NONADMIN_PASSWORD, 'NONADMIN_PASSWORD (cosmique) not provided.');
    await loginAs(page, NONADMIN_EMAIL, NONADMIN_PASSWORD);
    // No Master Admin section in the sidebar for a regular tenant admin.
    await expect(page.getByRole('link', { name: /All Tenants/i })).toHaveCount(0);
    // Even if /admin/tenants is reached, the master_admin RPC returns 0 rows for non-admins,
    // so no OTHER tenant's data leaks into this tenant's view.
    await page.goto('/admin/tenants', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    const html = await page.content();
    expect(html, 'another tenant (BBQ Tonight) must not appear for a non-master_admin').not.toContain('BBQ Tonight');
  });
});
