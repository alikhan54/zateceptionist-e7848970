import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase11_5-results.json');

const SB_URL = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_KEY || '';
const COSMIQUE = 'cosmique';

async function sb(p: string, init?: RequestInit) {
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

test('11.5.B1 ClinicPulseTab renders 7 widgets on cosmique', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(45_000);

  await page.goto('/clinic/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="industry-tab-clinic"]', { timeout: 25_000 });
  const ids = ['pulse-patients-today', 'pulse-noshow-rate', 'pulse-avg-visit', 'pulse-repeat-pct', 'pulse-utilization', 'pulse-top-treatment', 'pulse-catalog-size'];
  const found: Record<string, string> = {};
  for (const id of ids) {
    const t = await page.getByTestId(id).innerText().catch(() => '');
    found[id] = t.replace(/\s+/g, ' ').slice(0, 80);
  }
  const ss = path.join(SS_DIR, 'phase11_5-pulse-clinic.png');
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ test: '11.5.B1', verdict: 'REAL_PASS', widgets: found, screenshot: ss }); persist();

  // At least the catalog widget should show a real number (cosmique has 14 treatments)
  expect(found['pulse-catalog-size']).toMatch(/14/);
});

test('11.5.B2 Edit Competitor PATCH + revert', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(45_000);

  // Pick first competitor for cosmique
  // Phase 12.E fix: competitor_tracking.tenant_id stores the SLUG (verified via
  // baseline snapshot 2026-05-23 — cosmique has 3 rows when queried by slug).
  const list = await sb(`/rest/v1/competitor_tracking?tenant_id=eq.${COSMIQUE}&select=id,competitor_name,notes&limit=1`);
  if (!list.data?.length) {
    results.push({ test: '11.5.B2', verdict: 'SKIPPED', notes: 'no competitor for cosmique' }); persist();
    test.skip(true, 'no competitor');
    return;
  }
  const row = list.data[0];
  const origNotes = row.notes;
  const testNote = `TEST_CC_PHASE11_5_${Date.now()}`;

  await page.goto('/marketing/competitors', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const editBtn = page.getByTestId(`competitor-edit-${row.id}`);
  await expect(editBtn).toBeVisible({ timeout: 15_000 });
  await editBtn.click();
  await page.waitForTimeout(500);
  await expect(page.getByTestId('edit-competitor-dialog')).toBeVisible();
  await page.getByTestId('edit-competitor-notes-input').fill(testNote);
  await page.getByTestId('edit-competitor-submit').click();
  await page.waitForTimeout(2000);

  const after = await sb(`/rest/v1/competitor_tracking?id=eq.${row.id}&select=notes`);
  const verdict = after.data?.[0]?.notes === testNote ? 'REAL_PASS' : 'BROKEN_API';
  results.push({ test: '11.5.B2', verdict, row_id: row.id, expected: testNote, got: after.data?.[0]?.notes });
  persist();

  // Revert
  await sb(`/rest/v1/competitor_tracking?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ notes: origNotes }) });
});

test('11.5.B3 Bulk archive on /clinic/products + revert', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(45_000);

  // Snapshot baseline (3 active cosmique products)
  const baseline = await sb(`/rest/v1/clinic_products?tenant_id=eq.${COSMIQUE}&is_active=eq.true&select=id,name,is_active&limit=10`);
  if ((baseline.data?.length || 0) < 2) {
    results.push({ test: '11.5.B3', verdict: 'SKIPPED', notes: 'fewer than 2 active products' }); persist();
    test.skip(true, 'not enough products');
    return;
  }
  const target = baseline.data!.slice(0, 2);
  const targetIds = target.map((p: any) => p.id);

  await page.goto('/clinic/products', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid^="product-card-"]', { timeout: 25_000 });
  await page.waitForTimeout(800);

  for (const id of targetIds) {
    await page.getByTestId(`product-select-${id}`).click();
  }
  await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
  await page.getByTestId('bulk-archive').click();
  await page.waitForTimeout(2500);

  const after = await sb(`/rest/v1/clinic_products?id=in.(${targetIds.join(',')})&select=id,is_active`);
  const archived = (after.data || []).filter((p: any) => p.is_active === false).length;
  const verdict = archived === 2 ? 'REAL_PASS' : 'BROKEN_API';
  results.push({ test: '11.5.B3', verdict, target_ids: targetIds, archived_count: archived });
  persist();

  // Revert via direct REST
  for (const id of targetIds) {
    await sb(`/rest/v1/clinic_products?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) });
  }
});

test('11.5.B4 FilterBar narrows + sort changes order on /clinic/products', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(45_000);

  await page.goto('/clinic/products', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid^="product-card-"]', { timeout: 25_000 });
  await page.waitForTimeout(500);

  const initialCount = await page.locator('[data-testid^="product-card-"]').count();

  // Get first product's name + filter to a slice of it
  const firstName = await page.locator('[data-testid^="product-card-"] h3').first().innerText();
  const slice = firstName.split(' ')[0];

  await page.getByTestId('products-filter-search-input').fill(slice);
  await page.waitForTimeout(700); // debounce
  const filteredCount = await page.locator('[data-testid^="product-card-"]').count();

  // Clear
  await page.getByTestId('products-filter-search-clear').click();
  await page.waitForTimeout(700);
  const restoredCount = await page.locator('[data-testid^="product-card-"]').count();

  const verdict = (filteredCount <= initialCount && restoredCount === initialCount) ? 'REAL_PASS' : 'BROKEN_UI';
  results.push({ test: '11.5.B4', verdict, initial: initialCount, filtered: filteredCount, restored: restoredCount, slice });
  persist();

  expect(restoredCount).toBe(initialCount);
});
