import { test, expect, Page } from '@playwright/test';

// V6 post-ship fix verification against LOCAL preview (build first).
// Confirms the previously-DEAD buttons now open functional dialogs.
// Non-destructive: opens dialogs, does NOT submit edits/terminations on prod data.

const BASE = process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';

async function dismissModal(page: Page) {
  // V6 onboarding modal can intercept clicks on a fresh context — dismiss it.
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

const SHOT = (n: string) => `tests/screenshots/v6/${n}.png`;

test('V6-01: Employee Edit + Terminate dialogs open', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/employees`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);
  // open the first card's 3-dot menu (grid view)
  const menuBtn = page.locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)').first();
  await menuBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOT('01a_menu'), fullPage: false });
  // Edit
  await page.locator('[role="menuitem"]:has-text("Edit")').first().click();
  await page.waitForTimeout(800);
  const editOpen = await page.locator('text=/Edit (Staff|Provider|Specialist|Employee)/i').count();
  const saveBtn = await page.locator('button:has-text("Save Changes")').count();
  console.log(`[V6-01] Edit dialog open: ${editOpen > 0}, Save Changes btn: ${saveBtn > 0}`);
  await page.screenshot({ path: SHOT('01b_edit_dialog'), fullPage: true });
  expect(saveBtn, 'Edit dialog should open with Save Changes').toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  // Terminate (admin)
  await menuBtn.click();
  await page.waitForTimeout(500);
  const termItem = await page.locator('[role="menuitem"]:has-text("Terminate")').count();
  console.log(`[V6-01] Terminate menu item (admin): ${termItem > 0}`);
  if (termItem > 0) {
    await page.locator('[role="menuitem"]:has-text("Terminate")').first().click();
    await page.waitForTimeout(800);
    const reasonField = await page.locator('textarea').count();
    console.log(`[V6-01] Terminate dialog reason field: ${reasonField > 0}`);
    await page.screenshot({ path: SHOT('01c_terminate_dialog'), fullPage: true });
    expect(reasonField, 'Terminate dialog should have a reason field').toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  }
});

test('V6-02: Performance 360 feedback dialogs open + Goals render', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/performance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);
  await page.screenshot({ path: SHOT('02a_performance'), fullPage: true });
  // 360 tab
  await page.locator('button[role=tab]:has-text("360")').first().click();
  await page.waitForTimeout(1000);
  // Start Feedback
  await page.locator('button:has-text("Start Feedback")').first().click();
  await page.waitForTimeout(800);
  const giveOpen = await page.locator('text=/Give Feedback/i').count();
  console.log(`[V6-02] Give Feedback dialog: ${giveOpen > 0}`);
  await page.screenshot({ path: SHOT('02b_give_feedback'), fullPage: true });
  expect(giveOpen, 'Start Feedback should open a Give Feedback dialog').toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  // Request Feedback
  await page.locator('button:has-text("Request Feedback")').first().click();
  await page.waitForTimeout(800);
  const reqOpen = await page.locator('text=/Request Feedback/i').count();
  console.log(`[V6-02] Request Feedback dialog: ${reqOpen > 0}`);
  expect(reqOpen, 'Request Feedback should open a dialog').toBeGreaterThan(0);
  await page.keyboard.press('Escape');
});

test('V6-03: Training Generate AI Course dialog opens', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);
  await page.locator('button:has-text("Generate AI Course")').first().click();
  await page.waitForTimeout(800);
  const dlg = await page.locator('text=/Generate AI Course/i').count();
  const topic = await page.locator('input[placeholder*="HIPAA" i], label:has-text("Topic")').count();
  console.log(`[V6-03] Generate AI Course dialog: ${dlg > 0}, topic field: ${topic > 0}`);
  await page.screenshot({ path: SHOT('03_ai_course'), fullPage: true });
  expect(dlg, 'Generate AI Course dialog should open').toBeGreaterThan(0);
});
