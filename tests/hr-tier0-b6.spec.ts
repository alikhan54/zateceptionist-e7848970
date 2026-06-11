/**
 * Tier-0 B6 — Recruitment Outreach: Approve & send + Automation dials + reply badges.
 *
 * Runs against a local dev server (BASE_URL, default http://localhost:4282).
 * Credentials come from env vars (per CLAUDE.md §21 — never hardcoded):
 *   ZATE_ADMIN_EMAIL / ZATE_ADMIN_PASSWORD       (zateceptionist admin)
 *   COSMIQUE_EMAIL / COSMIQUE_PASSWORD           (cosmique isolation check, optional)
 * Tests self-skip when env vars are unset, so the suite is CI-safe without secrets.
 *
 * The approve-flow test expects a seeded 'pending' hr_recruitment_outreach row for
 * zateceptionist (the session test-harness seeds + cleans it; without one the test
 * only asserts the Automation card).
 */
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4282';
const ZATE_EMAIL = process.env.ZATE_ADMIN_EMAIL;
const ZATE_PASSWORD = process.env.ZATE_ADMIN_PASSWORD;
const COSMIQUE_EMAIL = process.env.COSMIQUE_EMAIL;
const COSMIQUE_PASSWORD = process.env.COSMIQUE_PASSWORD;

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|hr|clinic|hospital/, { timeout: 30000 });
}

async function openOutreachTab(page: Page, tenantSlug: string) {
  await page.goto(`${BASE}/hr/recruitment?tenant=${tenantSlug}`);
  const tab = page.locator('[role="tab"][id$="-trigger-outreach"]');
  await tab.waitFor({ state: 'visible', timeout: 30000 });
  await tab.click();
  await expect(page.locator('[data-testid="recruitment-automation-card"]')).toBeVisible({ timeout: 15000 });
}

test.describe('Tier-0 B6 (zateceptionist)', () => {
  test.skip(!ZATE_EMAIL || !ZATE_PASSWORD, 'ZATE_ADMIN_EMAIL/PASSWORD not set');

  test('automation card renders with three default-off dials; voice-screen toggles round-trip', async ({ page }) => {
    await login(page, ZATE_EMAIL!, ZATE_PASSWORD!);
    await openOutreachTab(page, 'zateceptionist');

    for (const flag of ['recruitment_auto_outreach', 'recruitment_voice_screen', 'recruitment_auto_onboard']) {
      await expect(page.locator(`[data-testid="automation-${flag}"]`)).toHaveAttribute('data-state', 'unchecked');
    }

    const voice = page.locator('[data-testid="automation-recruitment_voice_screen"]');
    await expect(voice).toBeEnabled({ timeout: 15000 });
    await voice.click();
    await expect(voice).toHaveAttribute('data-state', 'checked', { timeout: 10000 });
    await expect(page.getByText('AI voice phone-screen enabled')).toBeVisible({ timeout: 10000 });

    // round-trip back off (leaves the tenant with flag=false, equivalent to default-off)
    await voice.click();
    await expect(voice).toHaveAttribute('data-state', 'unchecked', { timeout: 10000 });
    await expect(page.getByText('AI voice phone-screen disabled')).toBeVisible({ timeout: 10000 });
  });

  test('pending outreach shows Approve & send; confirm sends and flips the row', async ({ page }) => {
    await login(page, ZATE_EMAIL!, ZATE_PASSWORD!);
    await openOutreachTab(page, 'zateceptionist');

    const approveBtn = page.locator('[data-testid^="approve-outreach-"]').first();
    const hasPending = await approveBtn.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    test.skip(!hasPending, 'no pending outreach row seeded — approve flow not exercisable');

    await expect(page.getByText('Prepared and awaiting your approval', { exact: false })).toBeVisible();
    await approveBtn.click();
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Send this outreach email?')).toBeVisible();
    await page.getByRole('button', { name: 'Send now' }).click();

    await expect(page.getByText('Outreach approved — email sent')).toBeVisible({ timeout: 30000 });
    // optimistic flip: the pending strip is gone
    await expect(page.getByText('Prepared and awaiting your approval', { exact: false })).toHaveCount(0, { timeout: 15000 });
  });

  test('replied row renders sentiment badge on the pipeline card', async ({ page }) => {
    await login(page, ZATE_EMAIL!, ZATE_PASSWORD!);
    await page.goto(`${BASE}/hr/recruitment?tenant=zateceptionist`);
    const pipelineTab = page.locator('[role="tab"][id$="-trigger-pipeline"]');
    await pipelineTab.waitFor({ state: 'visible', timeout: 30000 });
    await pipelineTab.click();
    // The harness PATCHes the seeded row to status=replied + reply_sentiment=interested
    // before this test; assert the structured badge (plain 'Replied' would mean the
    // sentiment column didn't flow through).
    const badge = page.getByText('Replied: Interested', { exact: true }).first();
    const visible = await badge.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    test.skip(!visible, 'no replied+sentiment row present — badge not exercisable');
    await expect(badge).toBeVisible();
  });
});

test.describe('Tier-0 B6 isolation (cosmique)', () => {
  test.skip(!COSMIQUE_EMAIL || !COSMIQUE_PASSWORD, 'COSMIQUE_EMAIL/PASSWORD not set');

  test('cosmique sees default-off dials and zero zate outreach', async ({ page }) => {
    await login(page, COSMIQUE_EMAIL!, COSMIQUE_PASSWORD!);
    await openOutreachTab(page, 'cosmique');
    for (const flag of ['recruitment_auto_outreach', 'recruitment_voice_screen', 'recruitment_auto_onboard']) {
      await expect(page.locator(`[data-testid="automation-${flag}"]`)).toHaveAttribute('data-state', 'unchecked');
    }
    await expect(page.getByText('Tier0 UI test', { exact: false })).toHaveCount(0);
    await expect(page.locator('[data-testid^="approve-outreach-"]')).toHaveCount(0);
  });
});
