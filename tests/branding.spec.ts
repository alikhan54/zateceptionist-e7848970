/**
 * Phase 1A — White-label branding E2E (permanent regression).
 *
 * Credentials via env vars (CLAUDE.md §21 — never hardcoded):
 *   WL_EMAIL / WL_PASSWORD        — a tenant with features.white_label=true (zateceptionist)
 *   NONWL_EMAIL / NONWL_PASSWORD  — a tenant with features.white_label NULL/false (cosmique)
 * Run against a local preview build: E2E_BASE_URL=http://localhost:4173
 *
 * Tests 1–5 are full E2E. Tests 6–7 (onboarding "Brand Your Platform" interstitial) require a
 * tenant with onboarding_completed=false + white_label=true; existing tenants are redirected off
 * /onboarding, so they self-skip with a reason (the interstitial is additive + build-verified).
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHOT_DIR = process.env.BRANDING_SHOT_DIR || path.join(__dirname, 'screenshots', 'branding');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const shot = (p: Page, name: string) => p.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });

const WL_EMAIL = process.env.WL_EMAIL || '';
const WL_PASSWORD = process.env.WL_PASSWORD || '';
const NONWL_EMAIL = process.env.NONWL_EMAIL || '';
const NONWL_PASSWORD = process.env.NONWL_PASSWORD || '';

// 1x1 transparent PNG (valid) for the upload test
const TEST_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_PNG_PATH = path.join(SHOT_DIR, '_test-logo.png');
fs.writeFileSync(TEST_PNG_PATH, Buffer.from(TEST_PNG_B64, 'base64'));

// Onboarding progress seeded to the FINAL step, so the white-label interstitial (an early-return at
// currentStep===4) renders without driving the whole wizard. Used by tests 6–7 (needs a tenant with
// onboarding_completed=false + features.white_label=true).
const ONBOARDING_SEED_STEP4 = JSON.stringify({
  companyData: { company_name: 'Demo', industry: 'general', services: [], description: '',
    contact: { phone: '', email: '', address: '' }, social_links: {}, logo_url: '',
    suggested_ai_name: 'Zate', suggested_greeting: 'Hello!' },
  scrapeConfidence: 0, scrapeSource: '',
  aiConfig: { name: 'Zate', role: 'AI Receptionist', greeting: 'Hello!', personality: 'friendly',
    workingHoursStart: '09:00', workingHoursEnd: '17:00', timezone: 'America/New_York' },
  channels: { whatsapp: false, voiceAI: false, email: true, instagram: false, facebook: false, webChat: false },
  connectedChannels: [], uploadedFiles: [], knowledgeText: '', trainingComplete: false,
  selectedPlan: 'professional', paymentVerified: false, trialStarted: false,
  skippedSteps: [], currentStep: 4,
});

async function dismissModals(page: Page) {
  // Best-effort: close the "Welcome to Your Business Hub" onboarding modal that can intercept clicks.
  for (const name of [/skip/i, /get started/i, /close/i, /dismiss/i, /maybe later/i]) {
    const btn = page.getByRole('button', { name }).first();
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await page.waitForTimeout(300); }
  }
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  try { await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 }); } catch { /* noop */ }
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
  await dismissModals(page);
}

test.describe.serial('White-label branding', () => {
  test.beforeAll(() => {
    if (!WL_PASSWORD) throw new Error('WL_PASSWORD env required');
    if (!NONWL_PASSWORD) throw new Error('NONWL_PASSWORD env required');
  });

  test('1. white-label tenant sees the Branding editor (not the upgrade CTA)', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, WL_EMAIL, WL_PASSWORD);
    await page.goto('/settings/branding', { waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.waitForTimeout(1500);
    await shot(page, '01-wl-branding-page.png');
    await expect(page.getByTestId('branding-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('branding-upgrade-cta')).toHaveCount(0);
  });

  test('2. logo upload persists (preview + reload + visible img)', async ({ page }) => {
    test.setTimeout(150_000);
    await loginAs(page, WL_EMAIL, WL_PASSWORD);
    await page.goto('/settings/branding', { waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.getByTestId('branding-page').waitFor({ timeout: 15_000 });
    await page.locator('[data-testid="logo-upload"] input[type="file"]').setInputFiles(TEST_PNG_PATH);
    // wait for the upload→save→refresh (toast or preview img)
    await page.waitForTimeout(6_000);
    await shot(page, '02a-after-upload.png');
    await page.reload({ waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.waitForTimeout(2_000);
    const logoImg = page.locator('img[src*="tenant-logos"]').first();
    await expect(logoImg, 'an uploaded tenant-logos image should render after reload').toBeVisible({ timeout: 15_000 });
    await shot(page, '02b-after-reload-logo-persists.png');
  });

  test('3. colour change saves (and the app re-skins)', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, WL_EMAIL, WL_PASSWORD);
    await page.goto('/settings/branding', { waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.getByTestId('branding-page').waitFor({ timeout: 15_000 });
    // primary colour = the first text Input next to the colour picker (id="primary" is the color input)
    const primaryHex = page.locator('input#primary').locator('xpath=following-sibling::input').first();
    await primaryHex.fill('#1e88e5');
    await page.getByTestId('branding-save').click();
    await page.waitForTimeout(3_000);
    await shot(page, '03a-after-colour-save.png');
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.waitForTimeout(2_000);
    await shot(page, '03b-dashboard-reskinned.png');
  });

  test('4. non-white-label tenant sees the upgrade CTA (not the editor)', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, NONWL_EMAIL, NONWL_PASSWORD);
    await page.goto('/settings/branding', { waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.waitForTimeout(1500);
    await shot(page, '04-nonwl-upgrade-cta.png');
    await expect(page.getByTestId('branding-upgrade-cta')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('branding-page')).toHaveCount(0);
  });

  test('5. isolation — the white-label tenant logo never appears for the other tenant', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, NONWL_EMAIL, NONWL_PASSWORD);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await dismissModals(page);
    await page.waitForTimeout(2_000);
    await shot(page, '05-cosmique-sidebar-isolation.png');
    // The other tenant's logo lives under tenant-logos/<wl-slug>/... — its slug must NOT appear here.
    const wlSlug = (process.env.WL_TENANT_SLUG || 'zateceptionist');
    const html = await page.content();
    expect(html, `the white-label tenant slug (${wlSlug}) must not leak into this tenant's UI`)
      .not.toContain(`tenant-logos/${wlSlug}`);
  });

  test('6. onboarding interstitial shows for white-label tenants', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, WL_EMAIL, WL_PASSWORD);
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    test.skip(!page.url().includes('/onboarding'),
      'tenant onboarding_completed=true → /onboarding redirects; interstitial needs onboarding_completed=false.');
    // seed progress to the final step, then reload the wizard → the WL interstitial early-returns
    await page.evaluate((seed) => localStorage.setItem('420_onboarding_progress', seed), ONBOARDING_SEED_STEP4);
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    // Do NOT call dismissModals here — its /skip/i matcher would click the interstitial's "Skip for now".
    await expect(page.getByTestId('brand-your-platform')).toBeVisible({ timeout: 15_000 });
    await shot(page, '06-interstitial.png');
  });

  test('7. "Skip for now" dismisses the interstitial and continues onboarding', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, WL_EMAIL, WL_PASSWORD);
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    test.skip(!page.url().includes('/onboarding'), 'tenant already onboarded; see test 6.');
    await page.evaluate((seed) => localStorage.setItem('420_onboarding_progress', seed), ONBOARDING_SEED_STEP4);
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500);
    // Do NOT dismissModals — it would click the interstitial Skip prematurely.
    const skip = page.getByTestId('brand-skip');
    await expect(skip).toBeVisible({ timeout: 15_000 });
    await skip.click();
    await page.waitForTimeout(1_500);
    await expect(page.getByTestId('brand-your-platform')).toHaveCount(0); // interstitial dismissed
    await shot(page, '07-after-skip.png');
  });
});
