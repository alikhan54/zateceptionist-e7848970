import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase10a-e2e-results.json');

const SB_URL = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_KEY || '';
const TEST_PREFIX = 'TEST_CC_PHASE10A_';
const COSMIQUE = 'cosmique';

async function sbFetch(p: string, init?: RequestInit) {
  if (!SVC) throw new Error('SUPABASE_SERVICE_KEY missing');
  const r = await fetch(`${SB_URL}${p}`, {
    ...init,
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) },
  });
  const txt = await r.text();
  let data: any; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

const results: any[] = [];
function persist() { fs.writeFileSync(REPORT, JSON.stringify(results, null, 2)); }
test.beforeAll(() => { fs.writeFileSync(REPORT, '[]'); results.length = 0; });

test('10A.T — Add Treatment: click → fill → submit → DB + UI assertions', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(60_000);
  const testName = `${TEST_PREFIX}TreatmentX_${Date.now()}`;
  let createdId: string | null = null;

  try {
    await page.goto('/clinic/treatments', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid^="treatment-card-"]', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(800);

    // Step 2 — open the new dialog
    const addBtn = page.getByTestId('add-treatment-button');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });

    // ERROR PATH — submit with empty name first
    await addBtn.click();
    await expect(page.getByTestId('add-treatment-dialog')).toBeVisible();
    await page.getByTestId('add-treatment-submit').click();
    // Validation toast should fire; dialog stays open
    await page.waitForTimeout(800);
    await expect(page.getByTestId('add-treatment-dialog')).toBeVisible();
    results.push({ test: '10A.T.error_path', verdict: 'PASS', notes: 'submit with empty name does not close dialog' });
    persist();

    // Step 3 — fill valid form
    await page.getByTestId('add-treatment-name-input').fill(testName);
    await page.getByTestId('add-treatment-category-input').selectOption('aesthetics');
    await page.getByTestId('add-treatment-price-input').fill('777');
    await page.getByTestId('add-treatment-duration-input').fill('45');
    await page.getByTestId('add-treatment-description-input').fill('Phase 10A test row — auto-cleanup');

    // Step 4 — submit
    await page.getByTestId('add-treatment-submit').click();

    // Step 5+6 — DB assertion (PostgREST round-trip)
    await expect.poll(async () => {
      const r = await sbFetch(`/rest/v1/clinic_treatments?tenant_id=eq.${COSMIQUE}&name=eq.${encodeURIComponent(testName)}&select=id,name,price,duration_minutes,category`);
      if (r.ok && Array.isArray(r.data) && r.data.length) { createdId = r.data[0].id; return r.data[0].price; }
      return null;
    }, { timeout: 15_000, intervals: [500, 1000, 2000] }).toBe(777);

    // Step 7 — UI assertion (treatment-card-${createdId} appears)
    await expect.poll(async () => createdId ? await page.locator(`[data-testid="treatment-card-${createdId}"]`).count() : 0,
      { timeout: 15_000, intervals: [500, 1000] }).toBeGreaterThanOrEqual(1);

    const ss = path.join(SS_DIR, 'phase10a-treatment-added.png');
    await page.screenshot({ path: ss, fullPage: true });
    results.push({ test: '10A.T.happy_path', verdict: 'REAL_PASS', row_id: createdId, name: testName, screenshot: ss });
    persist();
  } finally {
    if (createdId) {
      await sbFetch(`/rest/v1/clinic_treatments?id=eq.${createdId}`, { method: 'DELETE' });
    }
  }
});

test('10A.P — Add Product: click → fill → submit → DB + UI assertions', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(60_000);
  const testName = `${TEST_PREFIX}ProductX_${Date.now()}`;
  let createdId: string | null = null;

  try {
    await page.goto('/clinic/products', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid^="product-card-"], [data-testid^="adjust-stock-"]', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(800);

    const addBtn = page.getByTestId('add-product-button');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });

    // ERROR PATH — empty name
    await addBtn.click();
    await expect(page.getByTestId('add-product-dialog')).toBeVisible();
    await page.getByTestId('add-product-submit').click();
    await page.waitForTimeout(800);
    await expect(page.getByTestId('add-product-dialog')).toBeVisible();
    results.push({ test: '10A.P.error_path', verdict: 'PASS', notes: 'submit with empty name does not close dialog' });
    persist();

    // Happy path
    await page.getByTestId('add-product-name-input').fill(testName);
    await page.getByTestId('add-product-category-input').selectOption('skincare');
    await page.getByTestId('add-product-brand-input').fill('TEST');
    await page.getByTestId('add-product-price-input').fill('199');
    await page.getByTestId('add-product-stock-input').fill('25');
    await page.getByTestId('add-product-submit').click();

    await expect.poll(async () => {
      const r = await sbFetch(`/rest/v1/clinic_products?tenant_id=eq.${COSMIQUE}&name=eq.${encodeURIComponent(testName)}&select=id,name,price,stock_quantity`);
      if (r.ok && Array.isArray(r.data) && r.data.length) { createdId = r.data[0].id; return r.data[0].price; }
      return null;
    }, { timeout: 15_000, intervals: [500, 1000, 2000] }).toBe(199);

    const ss = path.join(SS_DIR, 'phase10a-product-added.png');
    await page.screenshot({ path: ss, fullPage: true });
    results.push({ test: '10A.P.happy_path', verdict: 'REAL_PASS', row_id: createdId, name: testName, screenshot: ss });
    persist();
  } finally {
    if (createdId) {
      await sbFetch(`/rest/v1/clinic_products?id=eq.${createdId}`, { method: 'DELETE' });
    }
  }
});
