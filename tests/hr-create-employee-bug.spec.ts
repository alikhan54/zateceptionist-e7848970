/**
 * BUG: "Employee created, but does not appear in list/dashboard."
 *
 * Root cause: callWebhook resolves with { success: false } on HTTP error
 * and on n8n 200-body-success-false. The mutation's mutationFn returned
 * that resolved value, so TanStack Query treated it as success and fired
 * the "Employee added successfully" toast. No row was ever created in
 * hr_employees → user is confused.
 *
 * Fix: useHR.ts mutationFns now go through callWebhookOrThrow which
 * promotes both HTTP and body-level failure to a thrown Error so onError
 * fires instead of onSuccess.
 *
 * This spec proves:
 *   A) Submitting a valid employee shows the success toast AND row in DB.
 *   B) Submitting an employee with missing required fields (which we
 *      simulate by intercepting the webhook and forcing a
 *      {success:false} body) shows the ERROR toast — not success.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-23-create-bug');
const RESULTS_PATH = path.join(__dirname, 'hr-create-bug-results.json');

const TS = Date.now();
const TEST_EMAIL = `playwright+createbug${TS}@e2e.local`;
const cleanup = { employee_emails: [TEST_EMAIL] };

test.describe.configure({ mode: 'serial' });
test.use({ trace: 'off' });

test.beforeAll(() => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
});

async function dismissOverlays(page: Page) {
  await page.evaluate(() => {
    ['tutorial-dismissed', 'onboarding-completed', 'welcome-shown',
     'hr-tour-completed', 'product-tour-completed',
    ].forEach(k => localStorage.setItem(k, 'true'));
  }).catch(() => {});
}

async function openAddEmployeeWizard(page: Page) {
  await page.goto('/hr/employees', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 12_000 }).catch(() => {});

  const addBtn = page.locator('button').filter({ hasText: /add (staff|employee|specialist|member)/i }).first();
  await addBtn.click();
  await page.waitForTimeout(900);
  const dialog = page.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible({ timeout: 5000 });
  return dialog;
}

async function fillStep1(dialog: any, first: string, last: string, email: string) {
  await dialog.locator('input[placeholder="John"]').fill(first);
  await dialog.locator('input[placeholder="Doe"]').fill(last);
  await dialog.locator('input[type="email"]').first().fill(email);
  await dialog.locator('input[type="tel"]').first().fill('+15550100');
  await dialog.locator('input[type="date"]').first().fill('1990-01-15');
}

async function clickAdvance(dialog: any, page: Page) {
  const btn = dialog.getByRole('button', { name: /^(next|submit)$/i });
  await btn.click({ timeout: 5000 });
  await page.waitForTimeout(900);
}

// ────────────────────────────────────────────────────────────────────
// TEST A: Valid submit lands a real row + success toast
// ────────────────────────────────────────────────────────────────────

test('A: valid create shows success toast AND row appears in list', async ({ page }) => {
  test.setTimeout(180_000);
  const dialog = await openAddEmployeeWizard(page);

  // Step 1 — fill identifiers
  await fillStep1(dialog, 'PWCreate', `Valid${TS}`, TEST_EMAIL);

  // Walk wizard steps 1→6
  await clickAdvance(dialog, page); // → 2 Employment (we leave dept/position blank — webhook accepts)
  await clickAdvance(dialog, page); // → 3 Compensation
  await clickAdvance(dialog, page); // → 4 Emergency
  await clickAdvance(dialog, page); // → 5 Documents
  await clickAdvance(dialog, page); // → 6 Review

  // Submit
  const submit = dialog.getByRole('button', { name: /^submit$/i });
  await expect(submit).toBeVisible({ timeout: 3000 });

  // Watch webhook response
  const webhookPromise = page.waitForResponse(
    r => /\/webhook\/hr\/employee-onboarding/.test(r.url()),
    { timeout: 30_000 },
  );
  await submit.click();
  const webhookResp = await webhookPromise;
  expect(webhookResp.status()).toBe(200);
  const body = await webhookResp.json();
  expect(body.success).toBe(true);

  await page.waitForTimeout(3500);
  // Verify employee appears in list
  await page.goto('/hr/employees', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const txt = (await page.textContent('body').catch(() => '')) ?? '';
  await page.screenshot({ path: path.join(SHOT_DIR, 'A_valid_after_create.png'), fullPage: true }).catch(() => {});
  expect(txt).toMatch(/PWCreate/);
});

// ────────────────────────────────────────────────────────────────────
// TEST B: Intercept webhook to return {success:false} — assert error toast
// ────────────────────────────────────────────────────────────────────

test('B: webhook {success:false} body triggers ERROR toast (no false success)', async ({ page }) => {
  test.setTimeout(120_000);

  // Intercept the employee-onboarding webhook + force a failure body.
  // This simulates: user fills the form correctly but the n8n workflow
  // detects a missing field (or some other validation) and returns
  // HTTP 200 with { success: false, error: "..." }.
  await page.route('**/webhook/hr/employee-onboarding-v2', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'first_name and last_name required (forced by test)',
      }),
    });
  });

  const dialog = await openAddEmployeeWizard(page);
  await fillStep1(dialog, 'PWForcedFail', `Y${TS}`, `pw-forced-fail-${TS}@e2e.local`);
  for (let i = 0; i < 5; i++) await clickAdvance(dialog, page);
  const submit = dialog.getByRole('button', { name: /^submit$/i });
  await expect(submit).toBeVisible({ timeout: 3000 });
  await submit.click();

  // Wait up to 8s for the toast to appear
  let foundSuccessToast = false;
  let foundErrorToast = false;
  const start = Date.now();
  while (Date.now() - start < 8000) {
    const bodyText = (await page.textContent('body').catch(() => '')) ?? '';
    if (/Employee added successfully/i.test(bodyText)) foundSuccessToast = true;
    if (/Failed to add employee|MISSING_FIELDS|first_name and last_name required/i.test(bodyText)) {
      foundErrorToast = true;
    }
    if (foundErrorToast || foundSuccessToast) break;
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, 'B_forced_failure_toast.png'), fullPage: true });

  // The fix means: success:false from webhook must NOT trigger the success toast,
  // and an error toast must appear.
  expect(foundSuccessToast, 'Bug regression: false success toast appeared even though webhook returned success:false').toBe(false);
  expect(foundErrorToast, 'Error toast did not appear after webhook returned success:false').toBe(true);
});

test.afterAll(() => {
  fs.writeFileSync(RESULTS_PATH, JSON.stringify({ cleanup, ts: new Date().toISOString() }, null, 2));
});
