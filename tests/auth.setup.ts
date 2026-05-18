import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.COSMIQUE_EMAIL || 'admin@cosmique.zatesystems.com';
const PASSWORD = process.env.COSMIQUE_PASSWORD || '';
if (!PASSWORD) throw new Error('COSMIQUE_PASSWORD env var is required');

const STORAGE_PATH = path.join(__dirname, '.auth-state.json');

setup('login + save storage state', async ({ page }) => {
  setup.setTimeout(60_000);
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  const btn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
  await btn.click();
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(()=>{});
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(()=>false)) {
    await skipBtn.click().catch(()=>{});
    await page.waitForTimeout(500);
  }
  await page.context().storageState({ path: STORAGE_PATH });
});
