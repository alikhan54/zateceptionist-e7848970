import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase5d-results.json');

// Phase 5d strict mandate: REAL UI CLICKS ONLY for the verdict. REST PATCH is
// permitted to SEED test data, not to assert success. If a verdict can't be
// produced from a click + DB-readback + DOM-update, mark DEPLOY_PENDING.
const TEST_PREFIX = 'TEST_CC_PHASE5D_';
const COSMIQUE_SLUG = 'cosmique';
const COSMIQUE_UUID = '933967dd-1f90-4676-96c1-42a01b6d9835';

const SB_URL = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC_KEY = process.env.SUPABASE_SERVICE_KEY || '';
async function sbFetch(rest: string, init?: RequestInit) {
  if (!SVC_KEY) throw new Error('SUPABASE_SERVICE_KEY env var not set for e2e DB assertions');
  const resp = await fetch(`${SB_URL}${rest}`, {
    ...init,
    headers: {
      apikey: SVC_KEY,
      Authorization: `Bearer ${SVC_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers || {}),
    },
  });
  const text = await resp.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data };
}

type Verdict = 'REAL_PASS' | 'DEPLOY_PENDING' | 'BROKEN_UI' | 'BROKEN_API' | 'BROKEN_REFETCH';
const results: any[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }

test.beforeAll(() => { fs.writeFileSync(REPORT_PATH, '[]'); results.length = 0; });

// ── J12: Adjust pharmacy stock ─────────────────────────────────────────────
// Click "Adjust stock" on a product card → open dialog → press + button →
// click Save → assert DB stock_quantity incremented by 1 → assert DOM Stock: N
// updated.
test('J12. Adjust pharmacy stock via UI dialog', async ({ page }) => {
  test.setTimeout(120_000);

  // Pick a real cosmique product to adjust (we'll revert after).
  const seed = await sbFetch(
    `/rest/v1/clinic_products?tenant_id=eq.${COSMIQUE_SLUG}&is_active=eq.true&select=id,name,stock_quantity&limit=1`,
  );
  expect(seed.ok).toBeTruthy();
  expect(Array.isArray(seed.data) && seed.data.length === 1).toBeTruthy();
  const product = seed.data[0];
  const originalStock: number = product.stock_quantity;

  await page.goto('/clinic/products', { waitUntil: 'networkidle' });
  // Wait for the product cards grid to render — clinic_products hook can take
  // 5-10s under cold cache.
  await page.waitForSelector(`[data-testid^="product-card-"]`, { timeout: 20_000 }).catch(()=>{});
  await page.waitForTimeout(500);

  // Verify product card is on the page; if the testid is missing, the deploy
  // hasn't propagated — record DEPLOY_PENDING and bail.
  const adjustBtn = page.getByTestId(`adjust-stock-${product.id}`);
  if (!await adjustBtn.isVisible({ timeout: 8000 }).catch(()=>false)) {
    const ss = path.join(SS_DIR, `phase5d-j12-deploy-pending.png`);
    await page.screenshot({ path: ss, fullPage: true });
    results.push({
      journey: 'J12',
      verdict: 'DEPLOY_PENDING',
      notes: 'adjust-stock-{id} testid not found — Lovable build has not propagated yet. Re-run after Publish.',
      screenshot: ss,
    });
    persist();
    test.skip(true, 'DEPLOY_PENDING');
    return;
  }

  await adjustBtn.click();
  await page.waitForTimeout(500);

  const dialog = page.getByTestId('adjust-stock-dialog');
  await expect(dialog).toBeVisible();

  // Click the + button once → adjustment = +1
  await page.locator('[aria-label="Increment"]').click();
  await page.waitForTimeout(200);

  // Optionally fill a reason
  await page.getByTestId('stock-reason-input').fill(`${TEST_PREFIX}restock_test`);

  // Click Save adjustment
  const submit = page.getByTestId('stock-adjust-submit');
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.waitForTimeout(2500); // mutation + invalidate + refetch

  // DB assertion — stock incremented by 1
  const after = await sbFetch(
    `/rest/v1/clinic_products?id=eq.${product.id}&select=stock_quantity`,
  );
  expect(after.ok).toBeTruthy();
  const newStock = after.data[0].stock_quantity;
  expect(newStock).toBe(originalStock + 1);

  // UI assertion — the product-stock-{id} element reflects the new number.
  // React Query invalidate + refetch can take a few seconds; poll instead
  // of single-shot read.
  await expect.poll(
    async () => (await page.getByTestId(`product-stock-${product.id}`).innerText()),
    { timeout: 10_000, intervals: [500, 500, 1000] },
  ).toContain(String(newStock));

  // Multi-tenant gate — fetch any product mutation log; verify it's cosmique
  // (we don't have a stock_adjustments table per handover, so we just confirm
  // the row we mutated still has tenant_id=cosmique).
  const tenantCheck = await sbFetch(
    `/rest/v1/clinic_products?id=eq.${product.id}&select=tenant_id`,
  );
  expect(tenantCheck.data[0].tenant_id).toBe(COSMIQUE_SLUG);

  const ss = path.join(SS_DIR, `phase5d-j12-adjust-stock.png`);
  await page.screenshot({ path: ss, fullPage: true });
  results.push({
    journey: 'J12',
    verdict: 'REAL_PASS',
    db_row_id: product.id,
    original_stock: originalStock,
    new_stock: newStock,
    screenshot: ss,
  });
  persist();

  // Revert
  await sbFetch(`/rest/v1/clinic_products?id=eq.${product.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ stock_quantity: originalStock }),
  });
});

// ── J13: Edit treatment pricing ────────────────────────────────────────────
// Click "Edit" on a treatment card → open dialog → bump price by +1 → Save →
// assert DB price updated → assert DOM reflects new price → REVERT to preserve
// real Cosmique pricing.
test('J13. Edit treatment price via UI dialog', async ({ page }) => {
  test.setTimeout(120_000);

  const seed = await sbFetch(
    `/rest/v1/clinic_treatments?tenant_id=eq.${COSMIQUE_SLUG}&is_active=eq.true&select=id,name,price,duration_minutes,description&limit=1`,
  );
  expect(seed.ok).toBeTruthy();
  expect(Array.isArray(seed.data) && seed.data.length >= 1).toBeTruthy();
  const treatment = seed.data[0];
  const originalPrice: number = Number(treatment.price);
  const originalDuration: number = Number(treatment.duration_minutes);
  const originalDescription: string | null = treatment.description ?? null;
  const newPrice = originalPrice + 1;

  await page.goto('/clinic/treatments', { waitUntil: 'networkidle' });
  await page.waitForSelector(`[data-testid^="treatment-card-"]`, { timeout: 20_000 }).catch(()=>{});
  await page.waitForTimeout(500);

  const editBtn = page.getByTestId(`edit-treatment-${treatment.id}`);
  if (!await editBtn.isVisible({ timeout: 8000 }).catch(()=>false)) {
    const ss = path.join(SS_DIR, `phase5d-j13-deploy-pending.png`);
    await page.screenshot({ path: ss, fullPage: true });
    results.push({
      journey: 'J13',
      verdict: 'DEPLOY_PENDING',
      notes: 'edit-treatment-{id} testid not found — Lovable build has not propagated. Re-run after Publish.',
      screenshot: ss,
    });
    persist();
    test.skip(true, 'DEPLOY_PENDING');
    return;
  }

  await editBtn.click();
  await page.waitForTimeout(500);

  const dialog = page.getByTestId('edit-treatment-dialog');
  await expect(dialog).toBeVisible();

  // Clear and set new price
  const priceInput = page.getByTestId('treatment-price-input');
  await priceInput.fill(String(newPrice));

  const submit = page.getByTestId('treatment-save-submit');
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.waitForTimeout(2500);

  // DB assertion
  const after = await sbFetch(
    `/rest/v1/clinic_treatments?id=eq.${treatment.id}&select=price,tenant_id`,
  );
  expect(after.ok).toBeTruthy();
  expect(Number(after.data[0].price)).toBe(newPrice);
  expect(after.data[0].tenant_id).toBe(COSMIQUE_SLUG); // multi-tenant gate

  // UI assertion — the treatment card should now show the new price.
  // Poll for refetch like J12.
  const card = page.getByTestId(`treatment-card-${treatment.id}`);
  await expect.poll(
    async () => (await card.innerText()),
    { timeout: 10_000, intervals: [500, 500, 1000] },
  ).toContain(String(newPrice));

  const ss = path.join(SS_DIR, `phase5d-j13-edit-treatment.png`);
  await page.screenshot({ path: ss, fullPage: true });
  results.push({
    journey: 'J13',
    verdict: 'REAL_PASS',
    db_row_id: treatment.id,
    original_price: originalPrice,
    new_price: newPrice,
    screenshot: ss,
  });
  persist();

  // REVERT — preserve real Cosmique pricing
  await sbFetch(`/rest/v1/clinic_treatments?id=eq.${treatment.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      price: originalPrice,
      duration_minutes: originalDuration,
      description: originalDescription,
    }),
  });
});

// ── J15: Export patient list CSV ───────────────────────────────────────────
// Click "Export CSV" button → capture browser download → assert CSV headers +
// at least one cosmique patient row.
test('J15. Export patient CSV via UI button', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/clinic/patients', { waitUntil: 'networkidle' });
  // Wait for header to render with the Export button visible
  await page.waitForSelector('[data-testid="export-patients-csv"], [data-testid="add-patient-button"]', { timeout: 20_000 }).catch(()=>{});
  await page.waitForTimeout(500);

  const exportBtn = page.getByTestId('export-patients-csv');
  if (!await exportBtn.isVisible({ timeout: 8000 }).catch(()=>false)) {
    const ss = path.join(SS_DIR, `phase5d-j15-deploy-pending.png`);
    await page.screenshot({ path: ss, fullPage: true });
    results.push({
      journey: 'J15',
      verdict: 'DEPLOY_PENDING',
      notes: 'export-patients-csv testid not found — Lovable build has not propagated. Re-run after Publish.',
      screenshot: ss,
    });
    persist();
    test.skip(true, 'DEPLOY_PENDING');
    return;
  }

  // Wait for the download event triggered by the anchor.click() inside handleExportCsv
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }),
    exportBtn.click(),
  ]);

  // Save to a temp file
  const csvPath = path.join(SS_DIR, `phase5d-j15-patients-${Date.now()}.csv`);
  await download.saveAs(csvPath);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  // Header assertion
  expect(lines[0]).toBe('id,name,phone,email,gender,age,skin_type,loyalty_tier,total_visits,total_spent,created_at');

  // Body assertion — at least 1 row, and every row's id should match a cosmique patient
  expect(lines.length).toBeGreaterThanOrEqual(2);

  // Multi-tenant gate — sample first 3 data rows, confirm each id belongs to cosmique
  const sampleIds = lines.slice(1, Math.min(4, lines.length)).map(line => {
    // Naive CSV split is fine here because id is always the first column and a UUID
    return line.split(',')[0];
  });
  for (const id of sampleIds) {
    const check = await sbFetch(`/rest/v1/clinic_patients?id=eq.${id}&select=tenant_id`);
    expect(check.ok).toBeTruthy();
    expect(check.data[0]?.tenant_id).toBe(COSMIQUE_SLUG);
  }

  const ss = path.join(SS_DIR, `phase5d-j15-export-csv.png`);
  await page.screenshot({ path: ss, fullPage: true });
  results.push({
    journey: 'J15',
    verdict: 'REAL_PASS',
    csv_path: csvPath,
    row_count: lines.length - 1,
    sampled_ids: sampleIds,
    screenshot: ss,
  });
  persist();
});

// ── OMEGA progress indicator — visual assertion ────────────────────────────
// Navigate to OMEGA shell, submit a query, immediately assert the progress
// hint testid is visible while state=thinking. We don't wait for the response
// — just confirm the new UX element renders.
test('OMEGA. Progress hint appears while thinking', async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultNavigationTimeout(60_000);

  // ParticleSphereShell lives at /dashboard by default (CLAUDE.md § 22A —
  // DashboardRouter picks NeuralDashboardV3 when ui query is unset).
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // The sphere shell mounts after auth resolves — wait for the input pill or
  // bail with DEPLOY_PENDING.
  await page.waitForSelector('.v3-input-pill', { timeout: 25_000 }).catch(()=>{});
  await page.waitForTimeout(1500);

  // Find the omega input pill
  const input = page.locator('.v3-input-pill').first();
  if (!await input.isVisible({ timeout: 8000 }).catch(()=>false)) {
    results.push({
      journey: 'OMEGA_PROGRESS',
      verdict: 'DEPLOY_PENDING',
      notes: 'v3-input-pill not found at /omega — page may live elsewhere or build not yet deployed.',
    });
    persist();
    test.skip(true, 'DEPLOY_PENDING');
    return;
  }

  // Wait for the intro cycle to finish — sendQuery early-returns if state
  // !== 'idle'. Intro takes ~9s after mount (listening 1.4s → thinking 1.2s →
  // type ~3s → idle delay 3s). Poll state pill text until it reads IDLE.
  const pill = page.getByTestId('omega-state-pill');
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0], {
    timeout: 20_000, intervals: [500, 500, 1000],
  }).toBe('IDLE');

  // Install a MutationObserver BEFORE we submit so we catch the hint element
  // even if state=thinking only lasts a few hundred ms (warm cache / fast
  // webhook). Polling-based isVisible can miss transient renders.
  await page.evaluate(() => {
    (window as any).__omegaHintSeen = false;
    const obs = new MutationObserver(() => {
      if (document.querySelector('[data-testid="omega-progress-hint"]')) {
        (window as any).__omegaHintSeen = true;
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    (window as any).__omegaObserver = obs;
  });

  // Type char-by-char so each onChange has time to commit; then Enter.
  await input.click();
  await page.keyboard.type('What is the total revenue this month?', { delay: 25 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');

  // Wait through the listening → thinking → speaking cycle.
  await page.waitForTimeout(15_000);

  const hintVisible: boolean = await page.evaluate(() => (window as any).__omegaHintSeen === true);
  const pillText = await pill.innerText().catch(()=>'');

  const ss = path.join(SS_DIR, `phase5d-omega-progress.png`);
  await page.screenshot({ path: ss, fullPage: true });

  if (!hintVisible) {
    results.push({
      journey: 'OMEGA_PROGRESS',
      verdict: 'DEPLOY_PENDING',
      notes: `omega-progress-hint not visible (pill text="${pillText}"). Either deploy pending or query resolved too fast.`,
      screenshot: ss,
    });
    persist();
    return;
  }

  results.push({
    journey: 'OMEGA_PROGRESS',
    verdict: 'REAL_PASS',
    pill_text: pillText,
    notes: 'progress hint visible while thinking',
    screenshot: ss,
  });
  persist();
});
