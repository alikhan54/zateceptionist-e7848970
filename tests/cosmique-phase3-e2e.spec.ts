import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase3-results.json');

type Result = {
  route: string;
  url_after: string;
  verdict: 'PASS' | 'EMPTY' | 'ERROR';
  matched_count: number;
  expected_min: number;
  screenshot: string;
  console_errors: string[];
  network_errors_4xx: number;
  notes: string;
};
const results: Result[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }

test.beforeAll(() => { fs.writeFileSync(REPORT_PATH, '[]'); results.length = 0; });

async function probe(page: Page, route: string, expected_min: number, matcher: (page: Page) => Promise<number>, label?: string) {
  const consoleErrors: string[] = [];
  let netErrs = 0;
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('response', resp => { const s = resp.status(); if (s >= 400 && s < 600) netErrs++; });

  await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 }).catch(()=>{});
  const skip = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
  if (await skip.isVisible({ timeout: 800 }).catch(()=>false)) await skip.click().catch(()=>{});
  await page.waitForTimeout(2000);

  const safe = (label || route).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
  const ss = path.join(SCREENSHOT_DIR, `phase3-${safe}.png`);
  await page.screenshot({ path: ss, fullPage: true }).catch(()=>{});

  let matched = 0;
  try { matched = await matcher(page); } catch {}
  const url_after = page.url();
  let verdict: Result['verdict'] = 'PASS';
  if (url_after.includes('/404') || url_after.includes('/not-found')) verdict = 'ERROR';
  else if (matched < expected_min) verdict = 'EMPTY';

  results.push({
    route, url_after, verdict, matched_count: matched, expected_min,
    screenshot: ss, console_errors: consoleErrors.slice(0, 10),
    network_errors_4xx: netErrs,
    notes: label || '',
  });
  persist();
  return matched;
}

// Tightened-selector probes — use SEMANTIC text/role, not generic [role="row"]
test('/clinic/treatments — 14 treatment names', async ({ page }) => {
  const n = await probe(page, '/clinic/treatments', 14, async (p) => {
    return await p.locator('text=/AED\\s*[0-9]+/i').count();
  });
  expect(n).toBeGreaterThanOrEqual(14);
});

test('/clinic/patients — 3 patient name headings', async ({ page }) => {
  const n = await probe(page, '/clinic/patients', 3, async (p) => {
    return await p.locator('h3:has-text("Fatima"), h3:has-text("Omar"), h3:has-text("Rania")').count();
  });
  expect(n).toBeGreaterThanOrEqual(3);
});

test('/clinic/products — 3 product names', async ({ page }) => {
  const n = await probe(page, '/clinic/products', 3, async (p) => {
    const txt = await p.locator('body').innerText();
    return ['Retinol', 'Vitamin C', 'SPF 50'].filter(s => txt.includes(s)).length;
  });
  expect(n).toBeGreaterThanOrEqual(3);
});

test('/clinic/consultations — page renders without ErrorBoundary', async ({ page }) => {
  const n = await probe(page, '/clinic/consultations', 1, async (p) => {
    const text = await p.locator('body').innerText();
    // Pass if heading visible AND no error boundary banner
    const hasHeading = /Consultation Notes/i.test(text);
    const hasErrorBanner = /Something went wrong|ErrorBoundary|empty string is not a valid/i.test(text);
    return hasHeading && !hasErrorBanner ? 1 : 0;
  });
  expect(n).toBe(1);
});

test('/clinic/patients/:id — patient profile drill-in', async ({ page }) => {
  // Find a patient card and click into it
  await page.goto('/clinic/patients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // click the Fatima card
  const card = page.locator('h3:has-text("Fatima")').first();
  await expect(card).toBeVisible({ timeout: 5_000 });
  await card.click();
  await page.waitForURL(u => /\/clinic\/patients\/[a-f0-9-]+/i.test(u.toString()), { timeout: 10_000 });
  await page.waitForTimeout(2000);

  const url_after = page.url();
  const ss = path.join(SCREENSHOT_DIR, `phase3-patient-profile-fatima.png`);
  await page.screenshot({ path: ss, fullPage: true }).catch(()=>{});

  // Expect hero card with patient name + tabs
  const text = await page.locator('body').innerText();
  const hasName = /Fatima/i.test(text);
  const hasTabs = /Timeline/i.test(text) && /Care/i.test(text);

  results.push({
    route: '/clinic/patients/:id',
    url_after, verdict: hasName && hasTabs ? 'PASS' : 'EMPTY',
    matched_count: (hasName ? 1 : 0) + (hasTabs ? 1 : 0),
    expected_min: 2, screenshot: ss,
    console_errors: [], network_errors_4xx: 0,
    notes: 'patient profile drill-in by clicking Fatima',
  });
  persist();
  expect(hasName).toBeTruthy();
  expect(hasTabs).toBeTruthy();
});

test('/marketing/competitors — system_events 400 should be gone', async ({ page }) => {
  let evtsErr = false;
  page.on('response', resp => {
    if (resp.status() >= 400 && resp.url().includes('system_events')) evtsErr = true;
  });
  const n = await probe(page, '/marketing/competitors', 1, async (p) => {
    const text = await p.locator('body').innerText();
    return /3 Total Tracked|3 competitor/i.test(text) ? 1 : 0;
  });
  expect(evtsErr).toBeFalsy();
  expect(n).toBeGreaterThanOrEqual(1);
});

test('/marketing/aeo-dashboard — generated_at order, no created_at 400', async ({ page }) => {
  let aeoErr = false;
  page.on('response', resp => {
    if (resp.status() >= 400 && resp.url().includes('aeo_schema_registry')) aeoErr = true;
  });
  await probe(page, '/marketing/aeo-dashboard', 0, async () => 0);
  expect(aeoErr).toBeFalsy();
});
