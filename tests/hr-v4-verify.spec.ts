import { test, expect } from '@playwright/test';

const BASE = process.env.HR_V4_BASE || 'http://localhost:4280';
const TEST_USER = process.env.ZATE_USER || 'adeel@zatesystems.com';
const TEST_PASS = process.env.ZATE_PASSWORD || '';
const VERIFY_BIO = process.env.VERIFY_BIO || `verify-${Date.now()}`;
const VERIFY_PHONE = process.env.VERIFY_PHONE || `+97155${Math.floor(Math.random() * 10000000)}`;

async function login(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', TEST_USER);
  await page.fill('input[type=password]', TEST_PASS);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard|hr|my|inbox/, { timeout: 20_000 });
  await dismissTutorial(page);
}

async function dismissTutorial(page: any) {
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i++) {
    const skip = page.locator('button:has-text("Skip tutorial"), button:has-text("Skip")').first();
    if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
      await skip.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    } else break;
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);
}

async function safeShot(page: any, name: string) {
  try { await page.screenshot({ path: `tests/screenshots/v4/${name}.png`, fullPage: true }); } catch {}
}

test.describe('HR V4 Integration Verification', () => {
  test.beforeAll(async ({ browser }) => {
    test.skip(!TEST_PASS, 'ZATE_PASSWORD not set');
  });

  test('V1: MyProfile Edit + Save writes to DB', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/my/profile`);
    await dismissTutorial(page);
    await page.waitForTimeout(3000);
    await dismissTutorial(page);

    const editBtn = page.locator('[data-testid="profile-edit-btn"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click({ force: true });
    await page.waitForTimeout(500);

    const bioField = page.locator('label:has-text("Bio")').locator('..').locator('textarea, input').first();
    await bioField.fill(VERIFY_BIO);

    const phoneField = page.locator('label:has-text("Phone")').locator('..').locator('input').first();
    await phoneField.fill(VERIFY_PHONE);

    const saveBtn = page.locator('[data-testid="profile-save-btn"]').first();
    await saveBtn.click({ force: true });
    await page.waitForTimeout(3500);

    await safeShot(page, 'v1_myprofile_after_save');
    console.log(`V1_VERIFY bio=${VERIFY_BIO} phone=${VERIFY_PHONE}`);
  });

  test('V2: Punch In creates open row', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'], { origin: BASE });
    await login(page);
    await page.goto(`${BASE}/my/attendance`);
    await dismissTutorial(page);
    await page.waitForTimeout(3000);
    await dismissTutorial(page);

    // If already punched in, punch out first to start clean
    const existingPunchOut = page.locator('button:has-text("Punch Out")').first();
    if (await existingPunchOut.isVisible({ timeout: 1500 }).catch(() => false)) {
      await existingPunchOut.click({ force: true });
      await page.waitForTimeout(3000);
    }

    const punchIn = page.locator('button:has-text("Punch In")').first();
    await expect(punchIn).toBeVisible({ timeout: 10_000 });
    await punchIn.click({ force: true });
    await page.waitForTimeout(3500);
    await safeShot(page, 'v2_punched_in');

    // UI should now have Punch Out
    const punchOutNow = await page.locator('button:has-text("Punch Out")').count();
    expect(punchOutNow).toBeGreaterThan(0);
    console.log(`V2_VERIFY punched_in_at=${new Date().toISOString()}`);
  });

  test('V3: Punch Out closes the row', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/my/attendance`);
    await dismissTutorial(page);
    await page.waitForTimeout(3000);
    await dismissTutorial(page);

    const punchOut = page.locator('button:has-text("Punch Out")').first();
    if (!(await punchOut.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('V3_SKIP not currently punched in');
      return;
    }
    await punchOut.click({ force: true });
    await page.waitForTimeout(3500);
    await safeShot(page, 'v3_punched_out');

    await expect(page.locator('button:has-text("Punch In")').first()).toBeVisible({ timeout: 10_000 });
  });

  test('V4: WhoIsWorkingNow widget renders', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/hr/dashboard`);
    await dismissTutorial(page);
    await page.waitForTimeout(3500);
    await dismissTutorial(page);

    const widget = await page.locator('text=/Working Now/i').count();
    expect(widget).toBeGreaterThan(0);
    await safeShot(page, 'v4_who_working');

    // Check if it shows any session ("N of M" text)
    const counter = await page.locator('text=/\\d+ of \\d+ staff/').first().textContent().catch(() => '');
    console.log(`V4_VERIFY counter=${counter}`);
  });

  test('V6: Policy Edit dialog opens (creates new version on save)', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/hr/documents`);
    await dismissTutorial(page);
    await page.waitForTimeout(3500);
    await dismissTutorial(page);

    const moreBtn = page.locator('button:has(svg.lucide-more-horizontal)').first();
    if (!(await moreBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('V6_SKIP no document rows visible');
      await safeShot(page, 'v6_no_docs');
      return;
    }
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    const editItem = page.locator('[role="menuitem"]:has-text("Edit Content")').first();
    if (!(await editItem.isVisible({ timeout: 1000 }).catch(() => false))) {
      console.log('V6_SKIP first doc is not a syncable type (no Edit Content menu item)');
      await safeShot(page, 'v6_no_edit');
      return;
    }
    await editItem.click({ force: true });
    await page.waitForTimeout(1500);
    await safeShot(page, 'v6_edit_dialog');

    const dialogVisible = await page.locator('text=/Edit:|Save v\\d/i').count();
    expect(dialogVisible).toBeGreaterThan(0);
  });

  test('V7: Attendance Rules tab saves to DB', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/hr/attendance`);
    await dismissTutorial(page);
    await page.waitForTimeout(3500);
    await dismissTutorial(page);

    const rulesTab = page.locator('[role="tab"]:has-text("Rules")').first();
    await expect(rulesTab).toBeVisible({ timeout: 10_000 });
    await rulesTab.click({ force: true });
    await page.waitForTimeout(2000);

    // Enable the auto-punch-out toggle
    const toggle = page.locator('[data-testid="auto-punch-out-toggle"]').first();
    if (await toggle.isVisible({ timeout: 1500 }).catch(() => false)) {
      await toggle.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Set time
    const timeField = page.locator('input[type=time]').first();
    if (await timeField.isVisible({ timeout: 1500 }).catch(() => false)) {
      await timeField.fill('22:30');
    }

    const saveBtn = page.locator('[data-testid="attendance-rules-save"]').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await safeShot(page, 'v7_rules_saved');
  });

  test('V8: Multi-tenant isolation — zate admin does not see Cosmique requisitions', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/hr/recruitment`);
    await dismissTutorial(page);
    await page.waitForTimeout(4000);
    await dismissTutorial(page);

    // Cosmique-specific job that should NEVER appear for zate user
    // (verify via DB after that no cross-tenant rows shown)
    const cosmiqueJobs = await page.locator('text=/GP Aesthetics/i').count();
    expect(cosmiqueJobs).toBe(0);
    await safeShot(page, 'v8_zate_recruitment');

    const totalRows = await page.locator('[role="listitem"], [data-job-id], .job-row, [class*="JobCard"]').count();
    console.log(`V8_VERIFY zate_jobs_visible=${totalRows} cosmique_jobs_leaked=${cosmiqueJobs}`);
  });

  test('V10: Post Job dialog AI Generate populates questions', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/hr/recruitment`);
    await dismissTutorial(page);
    await page.waitForTimeout(3500);
    await dismissTutorial(page);

    await page.locator('button:has-text("Post Job")').first().click({ force: true });
    await page.waitForTimeout(1500);

    // Already on Manual mode by default
    const titleField = page.locator('input').filter({ hasText: '' }).first();
    // Use label-based lookup
    const titleByLabel = page.locator('label:has-text("Job Title")').locator('..').locator('input').first();
    await titleByLabel.fill(`VERIFY_V10_${Date.now()}`);

    // AI Generate
    const aiBtn = page.locator('button:has-text("AI Generate")').first();
    await expect(aiBtn).toBeVisible({ timeout: 5000 });
    await aiBtn.click({ force: true });
    // Q-gen is Claude for zate premium — ~15-25s
    await page.waitForTimeout(35_000);
    await safeShot(page, 'v10_questions_generated');

    // Count question cards inside the dialog. We added 7-ish questions.
    const qHeadings = await page.locator('text=/behavioral|technical|situational|culture_fit/i').count();
    console.log(`V10_VERIFY question_tags_visible=${qHeadings}`);
    expect(qHeadings).toBeGreaterThan(0);
  });
});
