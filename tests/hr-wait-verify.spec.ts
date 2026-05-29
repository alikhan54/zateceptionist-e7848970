import { test, expect } from '@playwright/test';

const BASE = process.env.HR_WAIT_BASE || 'http://localhost:4285';
const TEST_USER = 'adeel@zatesystems.com';
const TEST_PASS = process.env.ZATE_PASSWORD || '';

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
  for (let i = 0; i < 4; i++) {
    const skip = page.locator('button:has-text("Skip tutorial"), button:has-text("Skip"), button:has-text("Got it")').first();
    if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
      await skip.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    } else break;
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);
}

test.describe('HR V4 Wait-Mode Verifications', () => {
  test.beforeAll(async () => {
    test.skip(!TEST_PASS, 'ZATE_PASSWORD not set');
  });

  test('V6: Policy Edit creates new version', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/hr/documents`);
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
    await dismissTutorial(page);
    // Long wait for documents table to populate
    await page.waitForTimeout(4500);
    await dismissTutorial(page);

    // Find a syncable policy row by name. The Documents page filters
    // SYNCABLE_TYPES = policy/contract/handbook/code_of_conduct/sop/guidelines
    // From DB snapshot we know "Zate Leave Policy 2026 (test)" exists as policy.
    const policyRow = page.locator('tr:has-text("Zate Leave Policy")').first();
    await expect(policyRow).toBeVisible({ timeout: 15_000 });

    // Click the 3-dot menu inside that row
    const moreBtn = policyRow.locator('button:has(svg.lucide-more-horizontal), [aria-haspopup="menu"]').first();
    await moreBtn.click({ force: true });
    await page.waitForTimeout(800);

    // Click Edit Content
    const editItem = page.getByRole('menuitem', { name: /Edit Content/i }).first();
    await expect(editItem).toBeVisible({ timeout: 5000 });
    await editItem.click({ force: true });

    // Wait for edit dialog
    const dialog = page.locator('[role="dialog"]').last();
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);

    // Content textarea — the one with the larger row count
    const contentTa = dialog.locator('textarea').last();
    await expect(contentTa).toBeVisible({ timeout: 5000 });

    const marker = `[VERIFY-V6-${Date.now()}]`;
    const existing = await contentTa.inputValue();
    await contentTa.fill(`${existing}\n\n${marker}\n\nThis is policy content for v6 verification.`);

    // Re-sync checkbox — uncheck to avoid hitting the sync webhook (test scope is only DB write)
    const syncCheckbox = dialog.locator('input[type=checkbox]').first();
    if (await syncCheckbox.isChecked().catch(() => false)) {
      await syncCheckbox.click({ force: true });
    }

    // Click Save vN
    const saveBtn = dialog.locator('button:has-text("Save v"), button:has-text("Save")').last();
    await saveBtn.click({ force: true });

    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'tests/screenshots/wait/v6_after_save.png', fullPage: true });

    console.log(`V6_MARKER=${marker}`);
  });

  test('V10: Post Job AI Generate populates questions', async ({ page }) => {
    // Capture network call to the gen webhook so we can diagnose if AI returns empty
    const genResponses: Array<{ status: number; len: number; routing?: string; count?: number }> = [];
    page.on('response', async (resp) => {
      const url = resp.url();
      if (url.includes('/hr/job/generate-interview-questions')) {
        try {
          const text = await resp.text();
          let routing, count;
          try { const j = JSON.parse(text); routing = j.routing; count = j.count; } catch {}
          genResponses.push({ status: resp.status(), len: text.length, routing, count });
        } catch {
          genResponses.push({ status: resp.status(), len: 0 });
        }
      }
    });

    await login(page);
    await page.goto(`${BASE}/hr/recruitment`);
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
    await dismissTutorial(page);
    await page.waitForTimeout(3500);
    await dismissTutorial(page);

    await page.locator('button:has-text("Post Job")').first().click({ force: true });
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
    await page.waitForTimeout(1800);

    // Dialog is in Manual mode by default per Recruitment.tsx state init.
    // Fill Job Title — it's the FIRST input inside the dialog under "Job Title *"
    const dialog = page.locator('[role="dialog"]').last();
    const titleInput = dialog.locator('label:has-text("Job Title")').locator('..').locator('input').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    const testTitle = `WAITV10_${Date.now()}`;
    await titleInput.fill(testTitle);
    await page.waitForTimeout(400);

    // Add required skills so question generation has more context
    const skillsInput = dialog.locator('label:has-text("Required Skills")').locator('..').locator('input').first();
    if (await skillsInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skillsInput.fill('React, TypeScript');
    }

    // Add experience years
    const expInput = dialog.locator('label:has-text("Required Experience")').locator('..').locator('input').first();
    if (await expInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expInput.fill('3');
    }

    await page.screenshot({ path: 'tests/screenshots/wait/v10_form_filled.png', fullPage: true });

    const aiBtn = dialog.locator('button:has-text("AI Generate")').first();
    await expect(aiBtn).toBeEnabled({ timeout: 5000 });
    await aiBtn.click({ force: true });

    // Claude/Ollama takes 5-30s — wait up to 50s for first card to appear
    // The InterviewQuestion card has a Select with values "behavioral|technical|situational|culture_fit"
    // Wait for at least one Select trigger to appear inside the dialog AFTER click
    const before = Date.now();
    let questionTags = 0;
    for (let i = 0; i < 60; i++) {
      questionTags = await dialog.locator('text=/behavioral|technical|situational|culture_fit/i').count();
      if (questionTags >= 3) break;
      await page.waitForTimeout(1000);
    }
    const elapsed = Math.round((Date.now() - before) / 1000);

    await page.screenshot({ path: 'tests/screenshots/wait/v10_after_generate.png', fullPage: true });
    console.log(`V10_TYPE_TAGS=${questionTags} elapsed=${elapsed}s`);
    console.log(`V10_GEN_RESPONSES=${JSON.stringify(genResponses)}`);
    expect(questionTags).toBeGreaterThanOrEqual(3);
  });
});
