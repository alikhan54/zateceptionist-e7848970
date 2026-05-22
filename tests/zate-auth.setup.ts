import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASSWORD = process.env.ZATE_PASSWORD || 'ZateE2E!Round2-2026';
const STORAGE_PATH = path.join(__dirname, '.auth-state-zate.json');

setup('login as zateceptionist admin + save storage state', async ({ page }) => {
  setup.setTimeout(90_000);
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Pre-set tutorial dismissal flags so subsequent tests don't get blocked
  await page.evaluate(() => {
    try {
      const keys = [
        'tutorial-dismissed', 'tutorial_dismissed',
        'onboarding-completed', 'onboarding_completed',
        'welcome-shown', 'welcome_shown',
        'first-login-tour-shown', 'tour-shown',
        'product-tour-completed', 'hr-tour-completed',
      ];
      keys.forEach(k => localStorage.setItem(k, 'true'));
    } catch {}
  });

  // Try to click any visible Skip button (best effort)
  const skip = page.getByRole('button', { name: /skip tutorial|skip|got it|maybe later|dismiss/i }).first();
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  await page.context().storageState({ path: STORAGE_PATH });
});
