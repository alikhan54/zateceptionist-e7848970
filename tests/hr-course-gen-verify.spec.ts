import { test, expect, Page } from '@playwright/test';

/**
 * Phase 2 verification: "Generate AI Content" for an EXISTING course writes content
 * INTO that course (no duplicate). Runs against the LOCAL preview build.
 * Targets the empty Zate course "Cybersecurity Awareness".
 */
const BASE = process.env.CG_BASE || process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';
const SHOT = (n: string) => `tests/screenshots/hr-course-gen/${n}.png`;
const COURSE = 'Cybersecurity Awareness';

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

test('CG-01: Generate AI Content fills an existing empty course (no duplicate)', async ({ page }) => {
  test.setTimeout(140000); // real Claude/Gemini generation (~30s)
  await login(page);
  await page.goto(`${BASE}/hr/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);

  // wait for the catalog to load, then locate the target course card
  await expect(page.getByText(COURSE, { exact: false }).first(), `"${COURSE}" should load`).toBeVisible({ timeout: 15000 });
  const card = page.locator('div.overflow-hidden').filter({ hasText: COURSE }).first();
  await expect(card, `"${COURSE}" card should render`).toBeVisible();
  await page.screenshot({ path: SHOT('01a_before'), fullPage: true });

  // the per-card "Generate AI Content" button must be present on this empty course
  const genBtn = card.getByRole('button', { name: /Generate AI Content/i });
  await expect(genBtn, 'empty course shows Generate AI Content').toBeVisible();

  await genBtn.click();
  // button flips to a generating state
  await expect(card.getByRole('button', { name: /Generating/i })).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: SHOT('01b_generating'), fullPage: true });

  // success toast (real LLM generation) within ~90s
  await expect(page.locator('text=/AI content generated/i').first()).toBeVisible({ timeout: 95000 });
  await page.waitForTimeout(1500);

  // after generation the card shows an AI badge and the Generate button is gone
  await expect(card.locator('text=/^AI$/').first(), 'AI badge appears after generation').toBeVisible({ timeout: 8000 });
  await expect(card.getByRole('button', { name: /Generate AI Content/i })).toHaveCount(0);
  await page.screenshot({ path: SHOT('01c_after'), fullPage: true });
  console.log('[CG-01] Generate AI Content on existing course: button → generating → AI badge, no duplicate (DB-checked separately)');
});
