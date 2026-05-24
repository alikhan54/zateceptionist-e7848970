import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE = path.join(__dirname, '.auth-state-acsfx.json');

setup('authenticate as ACSFX', async ({ page }) => {
  const baseURL = process.env.E2E_BASE_URL || 'https://ai.zatesystems.com';
  await page.goto(`${baseURL}/login`);

  // The login form uses standard email + password fields.
  await page.fill('input[type=email]', 'acsfx@zatesystems.com');
  await page.fill('input[type=password]', 'ACSFX@DemoZate2026!');

  await Promise.all([
    page.waitForURL((url) => !/\/login/.test(url.toString()), { timeout: 30_000 }),
    page.click('button[type=submit]'),
  ]);

  // Quick sanity that we have a session
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: STORAGE });
});
