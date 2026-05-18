import { test, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.COSMIQUE_EMAIL || 'admin@cosmique.zatesystems.com';
const PASSWORD = process.env.COSMIQUE_PASSWORD || '';
if (!PASSWORD) throw new Error('COSMIQUE_PASSWORD env var is required');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase1-e2e-results.json');

type Result = {
  route: string;
  url_after: string;
  rendered: number;
  expected: number;
  verdict: 'PASS' | 'BUG' | 'GAP';
  screenshot: string;
  notes: string;
  consoleErrors: string[];
  bodyExcerpt?: string;
};
const results: Result[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  // If already logged in, /login may redirect us elsewhere
  if (!page.url().includes('/login')) return;
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  const btn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
  await btn.click();
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 30_000 }).catch(()=>{});
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(()=>{});
  // Dismiss onboarding/welcome modal if present (visible "Skip tutorial" or close X)
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(()=>false)) {
    await skipBtn.click().catch(()=>{});
    await page.waitForTimeout(500);
  }
}

async function probe(page: Page, route: string, expected: number, matcher: (page: Page) => Promise<number>) {
  const consoleErrors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  await login(page);
  await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 }).catch(()=>{});
  // Dismiss any modal again (onboarding may pop up per-route)
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(()=>false)) {
    await skipBtn.click().catch(()=>{});
  }
  await page.waitForTimeout(3500);

  const safeName = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
  const ss = path.join(SCREENSHOT_DIR, `phase1-${safeName}.png`);
  await page.screenshot({ path: ss, fullPage: true }).catch(()=>{});

  let rendered = 0;
  try { rendered = await matcher(page); } catch (e: any) {}
  const url_after = page.url();
  let verdict: Result['verdict'] = 'GAP';
  let notes = `landed on ${url_after}`;
  if (url_after.includes('/login') || url_after.includes('/404') || url_after.endsWith('/not-found')) {
    verdict = 'GAP';
    notes += ' (redirected — route blocked/missing)';
  } else if (rendered >= expected) {
    verdict = 'PASS';
  } else {
    verdict = 'BUG';
  }
  let bodyExcerpt = '';
  try { bodyExcerpt = (await page.locator('main, [role="main"], #root').first().innerText()).slice(0, 800); } catch {}
  results.push({ route, url_after, rendered, expected, verdict, screenshot: ss, notes, consoleErrors, bodyExcerpt });
  persist();
}

// Reset results
test.beforeAll(() => { fs.writeFileSync(REPORT_PATH, '[]'); results.length = 0; });

test('1. /pulse — Phase 1.6 zate-bleed killed (no 522/no "18 Appointments")', async ({ page }) => {
  await probe(page, '/pulse', 1, async (page) => {
    const text = await page.locator('body').innerText();
    const has522 = /\b522\b/.test(text);
    const has18 = /\b18\s+[Aa]ppointments\b/.test(text);
    return (has522 || has18) ? 0 : 1;
  });
});

test('2. /clinic/treatments — expect ≥14 AED price labels', async ({ page }) => {
  await probe(page, '/clinic/treatments', 14, async (page) => {
    return await page.locator('text=/AED\\s*[0-9]+/i').count();
  });
});

test('3. /clinic/patients — expect ≥3 patient rows', async ({ page }) => {
  await probe(page, '/clinic/patients', 3, async (page) => {
    return await page.locator('[role="row"], tr, [data-testid*="patient"]').count();
  });
});

test('4. /clinic/products — expect ≥3 product rows', async ({ page }) => {
  await probe(page, '/clinic/products', 3, async (page) => {
    return await page.locator('[role="row"], tr, [data-testid*="product"]').count();
  });
});

test('5. /marketing/competitors — expect Kaya, Euromed, Biolite', async ({ page }) => {
  await probe(page, '/marketing/competitors', 3, async (page) => {
    const text = await page.locator('body').innerText();
    return ['Kaya', 'Euromed', 'Biolite'].filter(n => text.includes(n)).length;
  });
});

test('6. /marketing/campaigns — expect 2 draft campaign names', async ({ page }) => {
  await probe(page, '/marketing/campaigns', 2, async (page) => {
    const text = await page.locator('body').innerText();
    return ['Welcome Series', 'HydraFacial Spotlight'].filter(n => text.includes(n)).length;
  });
});

test('7. /marketing/blogs — expect "5 Things" blog title', async ({ page }) => {
  await probe(page, '/marketing/blogs', 1, async (page) => {
    const text = await page.locator('body').innerText();
    return /5 Things|Botox Appointment|Things To Know Before/i.test(text) ? 1 : 0;
  });
});

test('8. /sales/sequences — expect Hot/Warm/Cold Lead Sequence', async ({ page }) => {
  await probe(page, '/sales/sequences', 3, async (page) => {
    const text = await page.locator('body').innerText();
    return ['Hot Lead', 'Warm Lead', 'Cold Lead'].filter(n => text.includes(n)).length;
  });
});

test('9. /dashboard (or post-login default) — confirm Cosmique branding loads', async ({ page }) => {
  await probe(page, '/dashboard', 1, async (page) => {
    const text = await page.locator('body').innerText();
    // Any mention of cosmique-specific terms
    return /Cosmique|Aesthetic|Botox|HydraFacial|Dubai/i.test(text) ? 1 : 0;
  });
});
