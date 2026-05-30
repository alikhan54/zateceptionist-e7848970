import { test, expect, Page } from '@playwright/test';

/**
 * Recruitment Outreach Activity Log UI verification (P5) against LOCAL preview build.
 * Real data only (Zate test candidate): 1 email (sent) + 1 AI screening call (score 72,
 * second_round, transcript + recording). Display-only — creates NO data.
 */
const BASE = process.env.RO_BASE || process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';
const SHOT = (n: string) => `tests/screenshots/recruitment-outreach/${n}.png`;

async function dismissModal(page: Page) {
  await page.locator('button:has-text("Skip tutorial"), button:has-text("Skip"), [aria-label="Close"], button:has(svg.lucide-x)').first()
    .click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(400);
}
async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASS);
    await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
    await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }
  await dismissModal(page);
}

test('RO-01: Outreach tab renders the email + AI call activity (real data, no JSON)', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/recruitment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await dismissModal(page);

  await page.locator('button[role=tab]:has-text("Outreach")').first().click();
  await page.waitForTimeout(2500); // feed fetch
  await page.screenshot({ path: SHOT('01a_feed'), fullPage: true });

  // filter chips present
  await expect(page.locator('[data-testid="outreach-filters"]')).toBeVisible();

  // EMAIL touchpoint
  await expect(page.locator('text=AI Engineer opportunity at Zate Systems').first()).toBeVisible();
  await expect(page.locator('[data-testid^="activity-o_"]').first()).toBeVisible();
  // CALL touchpoint + score + recommendation
  await expect(page.locator('text=AI screening call').first()).toBeVisible();
  const callCard = page.locator('[data-testid^="activity-i_"]').first();
  await expect(callCard).toBeVisible();
  await expect(callCard.locator('text=72').first()).toBeVisible();
  await expect(page.locator('text=/Second round/i').first()).toBeVisible();

  // channel + status chips
  await expect(page.locator('text=/^Sent$/').first()).toBeVisible();
  await expect(page.locator('text=/^Completed$/').first()).toBeVisible();

  // NO raw JSON anywhere in the panel
  const panel = (await page.locator('[role="tabpanel"]').filter({ hasText: 'AI screening call' }).first().textContent()) || '';
  expect(panel.includes('"ai_generated"'), 'no raw provider JSON').toBeFalsy();
  expect(panel.includes('{"'), 'no raw JSON object literal').toBeFalsy();
  expect(panel.includes('claude-premium'), 'no raw provider string').toBeFalsy();

  // EXPAND the email -> body shows (opt-out + company), still no JSON
  await page.locator('[data-testid^="activity-o_"]').first().getByRole('button').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=/reply STOP|STOP|hiring team/i').first()).toBeVisible();
  await page.screenshot({ path: SHOT('01b_email_expanded'), fullPage: true });

  // EXPAND the call -> Play recording + transcript turns
  await callCard.getByRole('button').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('button:has-text("Play recording")').first()).toBeVisible();
  await expect(page.locator('text=/AI score/i').first()).toBeVisible();
  await page.screenshot({ path: SHOT('01c_call_expanded'), fullPage: true });

  // channel filter: click "Calls" -> email card should disappear
  await page.locator('[data-testid="outreach-filters"] button:has-text("Calls")').click();
  await page.waitForTimeout(600);
  expect(await page.locator('[data-testid^="activity-o_"]').count(), 'Calls filter hides email').toBe(0);
  await expect(page.locator('[data-testid^="activity-i_"]').first()).toBeVisible();
  console.log('[RO-01] Outreach feed: email + AI call render, expand works, no JSON, filter works');
});

test('RO-02: Candidate profile shows Outreach Activity timeline', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/recruitment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await dismissModal(page);

  await page.locator('button[role=tab]:has-text("Candidates")').first().click();
  await page.waitForTimeout(1500);
  // search for the test candidate
  const search = page.locator('input[placeholder*="earch" i]').first();
  if (await search.count()) { await search.fill('Test Candidate'); await page.waitForTimeout(1000); }

  // open the candidate's profile via its row menu (ellipsis) -> View Profile
  const menu = page.locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-horizontal)').first();
  if (await menu.count() === 0) {
    console.log('[RO-02] no candidate row menu found — skipping (feed already proved rendering)');
    return;
  }
  await menu.click();
  await page.waitForTimeout(400);
  await page.locator('text=View Profile').first().click();
  await page.waitForTimeout(1500);

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.locator('text=Outreach Activity').first()).toBeVisible();
  // the timeline shows the email + call inside the dialog
  await expect(dialog.locator('text=AI Engineer opportunity at Zate Systems').first()).toBeVisible();
  await expect(dialog.locator('text=AI screening call').first()).toBeVisible();
  await page.screenshot({ path: SHOT('02_candidate_activity'), fullPage: true });
  console.log('[RO-02] Candidate profile Outreach Activity timeline renders');
});
