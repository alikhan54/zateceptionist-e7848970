import { test, expect } from '@playwright/test';

const BASE = process.env.HR_R3_BASE || 'http://localhost:4173';
const TEST_USER = process.env.ZATE_USER || 'adeel@zatesystems.com';
const TEST_PASS = process.env.ZATE_PASSWORD || '';

// HR V4 R3 smoke. Verifies the five user-visible R1+R2 surfaces still render
// after the rebase, plus the new R2 Attendance Rules tab.
//
// This is a "does the markup render?" smoke — it does NOT click through
// dialog/modal flows, since first-visit modals (onboarding, intro) often
// intercept events and would flake the spec. For a full interactive
// regression, write a longer end-to-end spec separately.
//
// Run with:
//   ZATE_PASSWORD=... npx playwright test \
//       --config=playwright.hr-r3.config.ts --reporter=list

async function login(page: any) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', TEST_USER);
  await page.fill('input[type=password]', TEST_PASS);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard|hr|my|inbox|onboarding/, { timeout: 15_000 });
  await dismissTutorial(page);
}

async function dismissTutorial(page: any) {
  await page.waitForTimeout(800);
  // The "Welcome to Your Business Hub" tutorial modal intercepts pointer
  // events on every fresh page navigation. Click Skip tutorial whenever it
  // appears.
  for (let attempt = 0; attempt < 3; attempt++) {
    const skip = page.locator('button:has-text("Skip tutorial"), button:has-text("Skip")').first();
    if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
      await skip.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    } else {
      break;
    }
  }
  // Also try Escape as a fallback for any other overlay
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);
}

async function safeScreenshot(page: any, file: string) {
  try { await page.screenshot({ path: file, fullPage: true }); } catch { /* ignore */ }
}

test.describe('HR V4 R3 Smoke', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_PASS, 'ZATE_PASSWORD not provided');
    await login(page);
  });

  test('S1: Post Job button + Recruitment page render', async ({ page }) => {
    await page.goto(`${BASE}/hr/recruitment`);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);
    await page.waitForTimeout(2000);
    const postJobBtn = await page.locator('button:has-text("Post Job")').count();
    expect(postJobBtn).toBeGreaterThan(0);
    await safeScreenshot(page, 'tests/screenshots/r3/s1_recruitment.png');
  });

  test('S2: Documents page renders with Upload button', async ({ page }) => {
    await page.goto(`${BASE}/hr/documents`);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);
    await page.waitForTimeout(2000);
    const uploadBtn = await page.locator('button:has-text("Upload Document"), button:has-text("Upload")').count();
    expect(uploadBtn).toBeGreaterThan(0);
    await safeScreenshot(page, 'tests/screenshots/r3/s2_documents.png');
  });

  test('S3: /my/profile renders (Edit button OR no-employee-linked message)', async ({ page }) => {
    await page.goto(`${BASE}/my/profile`);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);
    await page.waitForTimeout(2500);
    const notFound = await page.locator('text=/^404|Not Found$/i').count();
    expect(notFound).toBe(0);
    // Either: edit button visible (employee linked) OR welcome card (not linked)
    const editCount = await page.locator('button:has-text("Edit")').count();
    const welcomeCount = await page.locator('text=/not linked yet|employee record/i').count();
    const myProfileCount = await page.locator('text=My Profile').count();
    expect(editCount + welcomeCount + myProfileCount).toBeGreaterThan(0);
    await safeScreenshot(page, 'tests/screenshots/r3/s3_my_profile.png');
  });

  test('S4: WhoIsWorkingNow widget on HR Dashboard', async ({ page }) => {
    await page.goto(`${BASE}/hr/dashboard`);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);
    await page.waitForTimeout(3000);
    const widget = await page.locator('text=/Working Now/i').count();
    expect(widget).toBeGreaterThan(0);
    await safeScreenshot(page, 'tests/screenshots/r3/s4_dashboard.png');
  });

  test('S5: /my/attendance page renders', async ({ page }) => {
    await page.goto(`${BASE}/my/attendance`);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);
    await page.waitForTimeout(2500);
    const notFound = await page.locator('text=/^404|Not Found$/i').count();
    expect(notFound).toBe(0);
    // Either punch button (employee linked) OR not-linked message
    const punchIn = await page.locator('button:has-text("Punch In")').count();
    const punchOut = await page.locator('button:has-text("Punch Out")').count();
    const welcome = await page.locator('text=/not linked yet|employee record/i').count();
    expect(punchIn + punchOut + welcome).toBeGreaterThan(0);
    await safeScreenshot(page, 'tests/screenshots/r3/s5_my_attendance.png');
  });

  test('S6: Attendance page has Rules tab', async ({ page }) => {
    await page.goto(`${BASE}/hr/attendance`);
    await page.waitForLoadState('networkidle');
    await dismissTutorial(page);
    await page.waitForTimeout(2500);
    // Tab in the Tabs widget
    const rulesTab = await page.locator('[role="tab"]:has-text("Rules")').count();
    expect(rulesTab).toBeGreaterThan(0);
    await safeScreenshot(page, 'tests/screenshots/r3/s6_attendance.png');
  });
});
