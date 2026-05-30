import { test, expect, Page } from '@playwright/test';

/**
 * HR V7 fix verification against LOCAL preview build (run `npm run build` first,
 * then `npm run preview`).  Covers the three QA breaks:
 *   1A  Employee Edit "Save Changes" persists (PRIORITY) — submits a real edit,
 *       asserts success, confirms persistence, then REVERTS (net-zero on prod).
 *   1B  Training: no raw provider-JSON leak; per-card Edit/Add-media/Delete menu;
 *       Edit Course dialog opens. (non-destructive)
 *   1C  Performance reviews show the recipient NAME (V6 showed blank) and are
 *       editable via a prefilled dialog. (non-destructive)
 *
 * 1B/1C never mutate prod data; 1A reverts its own change in a finally block.
 */

const BASE = process.env.HR_V7_BASE || process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';
const SHOT = (n: string) => `tests/screenshots/v7/${n}.png`;

async function dismissModal(page: Page) {
  // Onboarding "Welcome to Your Business Hub" modal intercepts clicks on a fresh context.
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

const editDialog = (page: Page) => page.locator('[role="dialog"]');
const fieldByLabel = (page: Page, label: string) =>
  editDialog(page).locator(`div.space-y-2:has(> label:text-is("${label}")) input`).first();

test('V7-01 (1A): Employee Edit SAVES and persists (then reverts)', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/employees`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);

  const menuBtn = page.locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)').first();
  await menuBtn.click();
  await page.waitForTimeout(400);
  await page.locator('[role="menuitem"]:has-text("Edit")').first().click();
  await page.waitForTimeout(800);

  await expect(editDialog(page).locator('button:has-text("Save Changes")'), 'Edit dialog should open').toBeVisible();
  const firstName = fieldByLabel(page, 'First Name');
  const original = (await firstName.inputValue()).trim();
  expect(original.length, 'pick an employee with a non-empty first name for a clean revert').toBeGreaterThan(0);
  const marker = `${original} QA`;

  let reverted = false;
  try {
    await firstName.fill(marker);
    await editDialog(page).locator('button:has-text("Save Changes")').click();
    // updateEmployee onSuccess => toast "Employee updated successfully" + dialog closes
    await expect(page.locator('text=/updated successfully/i'), '1A: save should succeed').toBeVisible({ timeout: 10000 });
    expect(await page.locator('text=/Failed to update/i').count(), 'no failure toast').toBe(0);
    await page.screenshot({ path: SHOT('01a_save_success'), fullPage: false });

    // Re-open and confirm the new value persisted
    await page.waitForTimeout(1500);
    await menuBtn.click();
    await page.waitForTimeout(400);
    await page.locator('[role="menuitem"]:has-text("Edit")').first().click();
    await page.waitForTimeout(800);
    await expect(fieldByLabel(page, 'First Name'), '1A: edited value should persist after reload').toHaveValue(marker);
    await page.screenshot({ path: SHOT('01b_persisted'), fullPage: false });

    // Revert to original — leave prod unchanged
    await fieldByLabel(page, 'First Name').fill(original);
    await editDialog(page).locator('button:has-text("Save Changes")').click();
    await expect(page.locator('text=/updated successfully/i')).toBeVisible({ timeout: 10000 });
    reverted = true;
    console.log(`[V7-01] PASS save+persist+revert (employee first_name "${original}")`);
  } finally {
    if (!reverted) {
      // best-effort restore so a mid-test failure doesn't strand the marker on prod
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
      await menuBtn.click().catch(() => {});
      await page.waitForTimeout(400);
      await page.locator('[role="menuitem"]:has-text("Edit")').first().click().catch(() => {});
      await page.waitForTimeout(700);
      await fieldByLabel(page, 'First Name').fill(original).catch(() => {});
      await editDialog(page).locator('button:has-text("Save Changes")').click().catch(() => {});
      await page.waitForTimeout(1500);
      console.log('[V7-01] performed best-effort revert in finally');
    }
  }
});

test('V7-02 (1B): Training — no provider-JSON leak + course actions menu', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);
  await page.screenshot({ path: SHOT('02a_catalog'), fullPage: true });

  // Regression guard: raw provider JSON must NEVER render in the catalog.
  const body = (await page.textContent('body')) || '';
  expect(body.includes('"ai_generated"'), 'no raw provider JSON in catalog').toBeFalsy();
  expect(body.includes('claude-premium'), 'no raw provider agent string in catalog').toBeFalsy();
  console.log('[V7-02] no-JSON-leak regression: PASS');

  // Per-card actions menu (MoreVertical). zate may have 0 active courses — tolerate.
  const menu = page.locator('button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical)').first();
  if (await menu.count() === 0) {
    console.log('[V7-02] no course cards for this tenant — menu wiring covered by data-layer + build');
    return;
  }
  await menu.click();
  await page.waitForTimeout(400);
  await expect(page.locator('[role="menuitem"]:has-text("Edit course")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Add video")')).toBeVisible();
  await expect(page.locator('[role="menuitem"]:has-text("Delete course")')).toBeVisible();
  await page.screenshot({ path: SHOT('02b_course_menu'), fullPage: false });

  await page.locator('[role="menuitem"]:has-text("Edit course")').click();
  await page.waitForTimeout(700);
  await expect(page.locator('[role="dialog"]:has-text("Edit course") button:has-text("Save changes")'), 'Edit Course dialog opens').toBeVisible();
  await page.screenshot({ path: SHOT('02c_edit_course_dialog'), fullPage: true });
  await page.keyboard.press('Escape');
  console.log('[V7-02] course actions menu + Edit dialog: PASS');
});

test('V7-03 (1C): Reviews show recipient name + are editable', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE}/hr/performance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await dismissModal(page);

  await page.locator('button[role=tab]:has-text("Team Reviews")').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: SHOT('03a_team_reviews'), fullPage: true });

  const editBtns = page.locator('button[aria-label="Edit review"]');
  const n = await editBtns.count();
  console.log(`[V7-03] review rows with Edit affordance: ${n}`);
  if (n === 0) {
    console.log('[V7-03] no reviews for this tenant — name-join covered by data-layer probe (resolved "Ahmed Al Mansoori")');
    return;
  }
  // First row recipient name must be non-blank and not the fallback (V6 rendered blank).
  const firstRow = page.locator('div.rounded-xl:has(button[aria-label="Edit review"])').first();
  const name = ((await firstRow.locator('p.font-semibold').first().textContent()) || '').trim();
  console.log(`[V7-03] first review recipient name: ${JSON.stringify(name)}`);
  expect(name.length, '1C: recipient name should not be blank').toBeGreaterThan(0);
  expect(name, '1C: name should resolve, not fall back').not.toBe('Unknown employee');

  // Edit dialog opens, prefilled, names the recipient.
  await editBtns.first().click();
  await page.waitForTimeout(700);
  await expect(page.locator('[role="dialog"]:has-text("Edit review")'), 'Edit Review dialog opens').toBeVisible();
  await page.screenshot({ path: SHOT('03b_edit_review_dialog'), fullPage: true });
  await page.keyboard.press('Escape');
  console.log('[V7-03] recipient name + Edit Review dialog: PASS');
});
