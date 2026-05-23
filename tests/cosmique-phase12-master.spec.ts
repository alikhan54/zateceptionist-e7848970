import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase12-master-results.json');

const SB = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_KEY || '';
const COSMIQUE = 'cosmique';
const FATIMA = '178729e2-bc49-45f8-bb89-c0c8962e2594';

async function sb(p: string, init?: RequestInit) {
  const r = await fetch(`${SB}${p}`, {
    ...init,
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) },
  });
  const txt = await r.text();
  let data: any; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

async function tableExists(table: string): Promise<boolean> {
  const r = await fetch(`${SB}/rest/v1/${table}?limit=0`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
  return r.status !== 404;
}

const results: any[] = [];
function persist() { fs.writeFileSync(REPORT, JSON.stringify(results, null, 2)); }
test.beforeAll(() => { fs.writeFileSync(REPORT, '[]'); results.length = 0; });

// ──────────────────────────────────────────────────────────────────────
// Group A — Industry tab + Pulse (Phase 11+12.D)
// ──────────────────────────────────────────────────────────────────────
test('12F.A1 ClinicPulseTab renders 7 widgets', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/clinic/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="industry-tab-clinic"]', { timeout: 25_000 });
  const ids = ['pulse-patients-today', 'pulse-noshow-rate', 'pulse-avg-visit', 'pulse-repeat-pct', 'pulse-utilization', 'pulse-top-treatment', 'pulse-catalog-size'];
  let visible = 0;
  for (const id of ids) {
    if (await page.getByTestId(id).isVisible().catch(() => false)) visible++;
  }
  results.push({ test: '12F.A1', verdict: visible === 7 ? 'REAL_PASS' : 'PARTIAL', widgets_visible: visible });
  persist();
  expect(visible).toBe(7);
});

// ──────────────────────────────────────────────────────────────────────
// Group B — Bulk + Filter (Phase 11+12.C)
// ──────────────────────────────────────────────────────────────────────
test('12F.B1 Bulk archive flow on /clinic/products', async ({ page }) => {
  test.setTimeout(90_000);
  const baseline = await sb(`/rest/v1/clinic_products?tenant_id=eq.${COSMIQUE}&is_active=eq.true&select=id&limit=2`);
  if ((baseline.data?.length || 0) < 2) {
    results.push({ test: '12F.B1', verdict: 'SKIPPED', notes: 'need 2+ active products' }); persist();
    test.skip(true, 'data');
    return;
  }
  const ids = baseline.data!.map((p: any) => p.id);
  await page.goto('/clinic/products', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid^="product-card-"]', { timeout: 25_000 });
  for (const id of ids) await page.getByTestId(`product-select-${id}`).click();
  await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
  await page.getByTestId('bulk-archive').click();
  await page.waitForTimeout(2500);
  const after = await sb(`/rest/v1/clinic_products?id=in.(${ids.join(',')})&select=is_active`);
  const archived = (after.data || []).filter((p: any) => p.is_active === false).length;
  results.push({ test: '12F.B1', verdict: archived === 2 ? 'REAL_PASS' : 'BROKEN_API', archived });
  persist();
  // Revert
  for (const id of ids) await sb(`/rest/v1/clinic_products?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) });
  expect(archived).toBe(2);
});

test('12F.B2 Treatments search narrows and clears', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/clinic/treatments', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid^="treatment-card-"]', { timeout: 25_000 });
  await page.waitForTimeout(500);
  const initial = await page.locator('[data-testid^="treatment-card-"]').count();
  const firstName = await page.locator('[data-testid^="treatment-card-"] >> nth=0').getAttribute('data-testid');
  await page.getByTestId('treatments-filter-search-input').fill('Bot');
  await page.waitForTimeout(700);
  const filtered = await page.locator('[data-testid^="treatment-card-"]').count();
  await page.getByTestId('treatments-filter-search-clear').click();
  await page.waitForTimeout(700);
  const restored = await page.locator('[data-testid^="treatment-card-"]').count();
  const verdict = filtered <= initial && restored === initial ? 'REAL_PASS' : 'BROKEN_UI';
  results.push({ test: '12F.B2', verdict, initial, filtered, restored });
  persist();
  expect(restored).toBe(initial);
});

// ──────────────────────────────────────────────────────────────────────
// Group C — Phase 12.B UIs (gated on DDL applied)
// ──────────────────────────────────────────────────────────────────────
test('12F.C1 PatientFilesTab renders or schema-pending', async ({ page }) => {
  test.setTimeout(60_000);
  const exists = await tableExists('clinic_patient_files');
  await page.goto(`/clinic/patients/${FATIMA}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[role="tab"]', { timeout: 20_000 });
  await page.getByRole('tab', { name: /files/i }).click();
  await page.waitForTimeout(800);
  const uploadBtn = await page.getByTestId('upload-file-button').isVisible().catch(() => false);
  const verdict = uploadBtn ? (exists ? 'REAL_PASS' : 'UI_PASS_SCHEMA_PENDING') : 'BROKEN_UI';
  const ss = path.join(SS_DIR, 'phase12-files-tab.png'); await page.screenshot({ path: ss, fullPage: false });
  results.push({ test: '12F.C1', verdict, table_exists: exists, button_visible: uploadBtn, screenshot: ss });
  persist();
  expect(uploadBtn).toBe(true);
});

test('12F.C2 PatientNotesTab renders or schema-pending', async ({ page }) => {
  test.setTimeout(60_000);
  const exists = await tableExists('clinic_patient_notes');
  await page.goto(`/clinic/patients/${FATIMA}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[role="tab"]', { timeout: 20_000 });
  await page.getByRole('tab', { name: /notes/i }).click();
  await page.waitForTimeout(800);
  const addBtn = await page.getByTestId('add-note-button').isVisible().catch(() => false);
  const verdict = addBtn ? (exists ? 'REAL_PASS' : 'UI_PASS_SCHEMA_PENDING') : 'BROKEN_UI';
  results.push({ test: '12F.C2', verdict, table_exists: exists, button_visible: addBtn });
  persist();
  expect(addBtn).toBe(true);
});

test('12F.C3 Testimonials page renders or schema-pending', async ({ page }) => {
  test.setTimeout(90_000);
  const exists = await tableExists('patient_testimonials');
  await page.goto('/marketing/testimonials', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
  // Phase 5d pattern #3 — lazy chunk on cold load. Wait long for either the
  // page H1 or the testid.
  const addBtn = await page.getByTestId('add-testimonial-button').isVisible({ timeout: 40_000 }).catch(() => false);
  const verdict = addBtn ? (exists ? 'REAL_PASS' : 'UI_PASS_SCHEMA_PENDING') : 'BROKEN_UI';
  results.push({ test: '12F.C3', verdict, table_exists: exists, button_visible: addBtn });
  persist();
  expect(addBtn).toBe(true);
});

test('12F.C4 ConsentForms page renders or schema-pending', async ({ page }) => {
  test.setTimeout(90_000);
  const exists = await tableExists('clinic_consent_templates');
  await page.goto('/clinic/consent-forms', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
  const createBtn = await page.getByTestId('create-template-button').isVisible({ timeout: 40_000 }).catch(() => false);
  const assignBtn = await page.getByTestId('assign-consent-button').isVisible({ timeout: 5_000 }).catch(() => false);
  const verdict = createBtn ? (exists ? 'REAL_PASS' : 'UI_PASS_SCHEMA_PENDING') : 'BROKEN_UI';
  results.push({ test: '12F.C4', verdict, table_exists: exists, create_visible: createBtn, assign_visible: assignBtn });
  persist();
  expect(createBtn).toBe(true);
});

// ──────────────────────────────────────────────────────────────────────
// Group D — Existing flows regression (Add Treatment + Add Product)
// ──────────────────────────────────────────────────────────────────────
test('12F.D1 Add Treatment round-trip', async ({ page }) => {
  test.setTimeout(90_000);
  const testName = `TEST_CC_PHASE12F_T_${Date.now()}`;
  let createdId: string | null = null;
  try {
    await page.goto('/clinic/treatments', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid^="treatment-card-"]', { timeout: 25_000 });
    await page.getByTestId('add-treatment-button').click();
    await expect(page.getByTestId('add-treatment-dialog')).toBeVisible();
    await page.getByTestId('add-treatment-name-input').fill(testName);
    await page.getByTestId('add-treatment-category-input').selectOption('aesthetics');
    await page.getByTestId('add-treatment-price-input').fill('555');
    await page.getByTestId('add-treatment-duration-input').fill('30');
    await page.getByTestId('add-treatment-submit').click();
    await expect.poll(async () => {
      const r = await sb(`/rest/v1/clinic_treatments?tenant_id=eq.${COSMIQUE}&name=eq.${encodeURIComponent(testName)}&select=id,price`);
      if (r.ok && r.data?.length) { createdId = r.data[0].id; return r.data[0].price; }
      return null;
    }, { timeout: 15_000, intervals: [500, 1000, 2000] }).toBe(555);
    results.push({ test: '12F.D1', verdict: 'REAL_PASS', row_id: createdId });
    persist();
  } finally {
    if (createdId) await sb(`/rest/v1/clinic_treatments?id=eq.${createdId}`, { method: 'DELETE' });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Group E — Multi-tenant safety (industry-tab dispatcher in deployed bundle)
// ──────────────────────────────────────────────────────────────────────
test('12F.E1 No cross-industry tab leak on cosmique', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/clinic/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="industry-tab-clinic"]', { timeout: 25_000 });
  const others = ['industry-tab-restaurant', 'industry-tab-real_estate', 'industry-tab-banking_collections', 'industry-tab-technology'];
  const visible: Record<string, boolean> = {};
  for (const t of others) visible[t] = await page.getByTestId(t).isVisible().catch(() => false);
  const leak = Object.values(visible).some(v => v);
  results.push({ test: '12F.E1', verdict: leak ? 'CROSS_TENANT_LEAK' : 'REAL_PASS', other_tabs_visible: visible });
  persist();
  expect(leak).toBe(false);
});
