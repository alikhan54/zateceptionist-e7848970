/**
 * Auth setup for the empty-state test fixture (aamerah).
 *
 * Per the v2 deep audit directive: aamerah credentials must be read from
 * env vars (AAMERAH_EMAIL / AAMERAH_PASSWORD). DO NOT auto-reset the
 * password. If env vars are unset the test gracefully skips with a clear
 * message — the empty-state pass becomes DEPLOY_PENDING in the report.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE = path.join(__dirname, '.auth-state-aamerah.json');

setup('authenticate as aamerah (empty-state fixture)', async ({ page }) => {
  const email = process.env.AAMERAH_EMAIL || 'aamerah@zatesystems.com';
  const password = process.env.AAMERAH_PASSWORD;

  if (!password) {
    // Write an EMPTY storage state so dependent tests can load (they'll self-skip).
    // Without this file the settings-empty-state project errors out at boot.
    const fs = await import('fs');
    fs.writeFileSync(STORAGE, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(
      true,
      'AAMERAH_PASSWORD env var not set — empty-state tests will be skipped. ' +
        'Provide via shell: AAMERAH_PASSWORD=... npx playwright test --project=settings-empty-state',
    );
  }

  const baseURL = process.env.E2E_BASE_URL || 'https://ai.zatesystems.com';
  await page.goto(`${baseURL}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password!);

  await Promise.all([
    page.waitForURL((url) => !/\/login/.test(url.toString()), { timeout: 30_000 }),
    page.click('button[type=submit]'),
  ]);

  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: STORAGE });
});
