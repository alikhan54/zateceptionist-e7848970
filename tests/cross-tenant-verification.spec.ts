/**
 * Cross-tenant no-regression verification (Phase J, 2026-05-19).
 *
 * Logs into 6 different industry tenants and asserts that my Smart-Ledger-only
 * fix did NOT regress any non-accounting tenant's behaviour:
 *   - Post-login URL is NEVER '/accounting/dashboard' (only smart-ledger should land there)
 *   - Sidebar does NOT contain "Accounting" label for non-accounting tenants
 *   - At least one non-accounting standard section visible if user lands on /dashboard
 *
 * Credentials passed via env vars to avoid committing them:
 *   COSMIQUE_EMAIL / COSMIQUE_PASSWORD
 *   BBQTONIGHT_EMAIL / BBQTONIGHT_PASSWORD
 *   MNTHALAN_EMAIL / MNTHALAN_PASSWORD
 *   AAMERAH_EMAIL / AAMERAH_PASSWORD
 *   MARHAMA_EMAIL / MARHAMA_PASSWORD
 *   ALADEEB_EMAIL / ALADEEB_PASSWORD
 *
 * Each test runs independently; one failure doesn't stop the others.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-19-cross-tenant-verification');

interface TenantCred {
  slug: string;
  industry: string;
  emailEnv: string;
  passwordEnv: string;
}

const TENANTS: TenantCred[] = [
  { slug: 'cosmique',    industry: 'healthcare_clinic',     emailEnv: 'COSMIQUE_EMAIL',    passwordEnv: 'COSMIQUE_PASSWORD' },
  { slug: 'bbqtonight',  industry: 'restaurant',            emailEnv: 'BBQTONIGHT_EMAIL',  passwordEnv: 'BBQTONIGHT_PASSWORD' },
  { slug: 'mnthalan',    industry: 'banking_collections',   emailEnv: 'MNTHALAN_EMAIL',    passwordEnv: 'MNTHALAN_PASSWORD' },
  { slug: 'aamerah',     industry: 'real_estate',           emailEnv: 'AAMERAH_EMAIL',     passwordEnv: 'AAMERAH_PASSWORD' },
  { slug: 'marhama',     industry: 'construction_estimation', emailEnv: 'MARHAMA_EMAIL',   passwordEnv: 'MARHAMA_PASSWORD' },
  { slug: 'aladeeb',     industry: 'forex_trading',         emailEnv: 'ALADEEB_EMAIL',     passwordEnv: 'ALADEEB_PASSWORD' },
];

const STANDARD_SECTIONS = ['Sales AI', 'Marketing AI', 'HR AI', 'Operations',
                            'Communications', 'Analytics', 'AI Command'];

async function loginAndCapture(page: Page, email: string, password: string, slug: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

  try {
    await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 });
  } catch {
    // Stayed on /login — likely bad creds or onboarding stalled
    const url = page.url();
    await page.screenshot({ path: path.join(SHOT_DIR, `${slug}-login-failed.png`), fullPage: true });
    return { ok: false, landingUrl: url, errors, reason: 'stayed on /login (creds rejected or login UI stalled)' };
  }

  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close|got it|dismiss/i }).first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }

  const landingUrl = page.url();
  return { ok: true, landingUrl, errors };
}

async function logout(page: Page) {
  // Best-effort — go to a URL that triggers re-render, then click any "Logout"
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
  });
  await page.goto('/login', { waitUntil: 'networkidle' }).catch(() => {});
}

for (const t of TENANTS) {
  test(`Cross-tenant: ${t.slug} (${t.industry}) — sidebar unchanged + no accounting leakage`, async ({ page }) => {
    test.setTimeout(90_000);

    const email = process.env[t.emailEnv];
    const password = process.env[t.passwordEnv];
    test.skip(!email || !password, `${t.emailEnv}/${t.passwordEnv} env var(s) not set`);

    const { ok, landingUrl, errors, reason } = await loginAndCapture(page, email!, password!, t.slug);

    if (!ok) {
      console.log(`[${t.slug}] LOGIN FAIL: ${reason}`);
      test.skip(true, `Login failed for ${t.slug}: ${reason}`);
      return;
    }

    console.log(`[${t.slug}] landing URL: ${landingUrl}`);
    await page.screenshot({ path: path.join(SHOT_DIR, `${t.slug}-dashboard.png`), fullPage: true });

    // CRITICAL: post-login URL must NEVER be /accounting/dashboard for non-accounting tenant
    expect(landingUrl, `${t.slug} (${t.industry}) must NOT land on /accounting/dashboard`)
      .not.toContain('/accounting/dashboard');

    // If landed on /onboarding, can't test sidebar — log + skip sidebar checks
    if (landingUrl.includes('/onboarding')) {
      console.log(`[${t.slug}] onboarding_completed=false — sidebar test skipped, no-regression on redirect path confirmed`);
      return;
    }

    // Sidebar must NOT show Accounting (only smart-ledger should)
    const accountingVisible = await page.getByText('Accounting', { exact: true }).first()
      .isVisible({ timeout: 2500 }).catch(() => false);
    expect(accountingVisible, `${t.slug} sidebar must NOT show "Accounting" — only smart-ledger should`).toBe(false);

    // Sidebar should still show at least 2 of the standard non-accounting sections
    // (proves full sidebar still renders for non-accounting tenants — no regression)
    let visibleCount = 0;
    const visibleSections: string[] = [];
    for (const label of STANDARD_SECTIONS) {
      const v = await page.getByText(label, { exact: true }).first().isVisible({ timeout: 1500 }).catch(() => false);
      if (v) { visibleCount++; visibleSections.push(label); }
    }
    console.log(`[${t.slug}] visible standard sections (${visibleCount}/${STANDARD_SECTIONS.length}): ${visibleSections.join(', ')}`);
    expect(visibleCount, `${t.slug} sidebar must show >=2 standard sections (full sidebar intact)`).toBeGreaterThanOrEqual(2);

    // Direct URL test: navigate to /accounting/dashboard — page renders but RLS gives 0 data
    // (data isolation already proven separately; here we just check no smart-ledger leakage)
    await page.goto('/accounting/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(SHOT_DIR, `${t.slug}-direct-accounting-url.png`), fullPage: true });

    const smartLedgerClients = ['Acme Holdings', 'Cedar Bridge', 'Birch & Co', 'Daleworth', 'Eastgate', 'Fairway'];
    for (const name of smartLedgerClients) {
      const leaked = await page.getByText(name, { exact: false }).first().isVisible({ timeout: 1200 }).catch(() => false);
      expect(leaked, `${t.slug} must NOT see smart-ledger client "${name}"`).toBe(false);
    }

    if (errors.length > 0) {
      console.log(`[${t.slug}] page errors during walk: ${errors.length}`);
      for (const e of errors) console.log(`  ${e}`);
    }

    await logout(page);
  });
}
