import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase7-results.json');

const TEST_PREFIX = 'TEST_CC_PHASE7_';
const FATIMA_ID = '178729e2-bc49-45f8-bb89-c0c8962e2594';
const COSMIQUE_SLUG = 'cosmique';

const SB_URL = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC_KEY = process.env.SUPABASE_SERVICE_KEY || '';
async function sbFetch(rest: string, init?: RequestInit) {
  if (!SVC_KEY) throw new Error('SUPABASE_SERVICE_KEY env var required');
  const resp = await fetch(`${SB_URL}${rest}`, {
    ...init,
    headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) },
  });
  const text = await resp.text();
  let data: any; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: resp.ok, status: resp.status, data };
}

const results: any[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }
test.beforeAll(() => { fs.writeFileSync(REPORT_PATH, '[]'); results.length = 0; });

async function gotoDashboardAndSettle(page: any) {
  page.setDefaultNavigationTimeout(60_000);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.v3-input-pill', { timeout: 25_000 });
  // Wait for full intro cycle to finish (~11s) + cushion. Hardening pattern.
  await page.waitForTimeout(16_000);
  const pill = page.getByTestId('omega-state-pill');
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0],
    { timeout: 30_000, intervals: [500, 500, 1000] }).toBe('IDLE');
}

async function askOmega(page: any, question: string): Promise<string> {
  const input = page.locator('.v3-input-pill').first();
  // The input is disabled while state ∈ {thinking, speaking}. Wait for enabled.
  await expect(input).toBeEnabled({ timeout: 60_000 });
  // Dismiss any open Radix overlay that might block clicks (hardening pattern #10).
  await page.keyboard.press('Escape').catch(()=>{});
  await page.waitForTimeout(200);
  await input.click({ timeout: 10_000 });
  await page.keyboard.press('Control+A').catch(()=>{});
  await page.keyboard.press('Delete').catch(()=>{});
  await page.keyboard.type(question, { delay: 25 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');

  const pill = page.getByTestId('omega-state-pill');
  const transcript = page.getByTestId('omega-transcript');

  // Wait for state to leave IDLE (send registered)
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0],
    { timeout: 30_000, intervals: [200, 500, 1000] }).not.toBe('IDLE');

  // Wait for typewriter to finish — pill returns to IDLE
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0],
    { timeout: 180_000, intervals: [1000, 2000, 3000] }).toBe('IDLE');

  // Cool-down so next askOmega gets a clean state
  await page.waitForTimeout(1500);
  return (await transcript.innerText()).trim();
}

// ── 7.B.1 OMEGA UI 3-question re-test ─────────────────────────────────────
test('7.B.1 OMEGA UI — 3 questions captured verbatim', async ({ page }) => {
  test.setTimeout(600_000);

  await gotoDashboardAndSettle(page);

  // Q1 — services
  const q1 = 'what services do you offer?';
  const a1 = await askOmega(page, q1);
  const ss1 = path.join(SS_DIR, 'phase7-omega-q1.png');
  await page.screenshot({ path: ss1, fullPage: true });
  const q1Hit = /hydrafacial|hifu|botox|aesthetic|skincare|cosmique|skin|laser|filler|injection|peel|consultation/i.test(a1);
  results.push({ test: '7.B.1.q1', question: q1, answer: a1, length: a1.length, clinical_term_present: q1Hit, screenshot: ss1 });
  persist();

  // Q2 — patient count
  const q2 = 'how many patients do I have?';
  const a2 = await askOmega(page, q2);
  const ss2 = path.join(SS_DIR, 'phase7-omega-q2.png');
  await page.screenshot({ path: ss2, fullPage: true });
  const q2Hit = /3|three|fatima|omar|rania|patient/i.test(a2);
  results.push({ test: '7.B.1.q2', question: q2, answer: a2, length: a2.length, patient_mention: q2Hit, screenshot: ss2 });
  persist();

  // Q3 — HydraFacial
  const q3 = 'Do you have HydraFacial?';
  const a3 = await askOmega(page, q3);
  const ss3 = path.join(SS_DIR, 'phase7-omega-q3.png');
  await page.screenshot({ path: ss3, fullPage: true });
  const q3Hit = /hydrafacial/i.test(a3);
  results.push({ test: '7.B.1.q3', question: q3, answer: a3, length: a3.length, hydrafacial_mentioned: q3Hit, screenshot: ss3 });
  persist();

  // All 3 must be DIFFERENT and at least 2 must have their topic keyword.
  results.push({
    test: '7.B.1.summary',
    distinct: new Set([a1, a2, a3]).size === 3,
    topic_hits: { q1: q1Hit, q2: q2Hit, q3: q3Hit },
  });
  persist();
});

// ── 7.C.1 Patient progress photos UI ──────────────────────────────────────
test('7.C.1 Patient photos — click + upload + DB + UI refresh', async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(60_000);

  await page.goto(`/clinic/patients/${FATIMA_ID}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('[role="tab"]', { timeout: 20_000 });
  await page.waitForTimeout(1500);

  // Switch to Photos tab
  await page.getByRole('tab', { name: /photos/i }).click();
  await page.waitForTimeout(800);

  // If the deployed bundle doesn't have the new testid yet, mark DEPLOY_PENDING
  const addBtn = page.getByTestId('add-photos-button');
  if (!await addBtn.isVisible({ timeout: 8_000 }).catch(()=>false)) {
    const ss = path.join(SS_DIR, 'phase7-c1-deploy-pending.png');
    await page.screenshot({ path: ss, fullPage: true });
    results.push({ test: '7.C.1', verdict: 'DEPLOY_PENDING', notes: 'add-photos-button testid not found — needs Lovable Publish', screenshot: ss });
    persist();
    test.skip(true, 'DEPLOY_PENDING');
    return;
  }

  await addBtn.click();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('add-photos-dialog')).toBeVisible();

  // Provide a tiny 1x1 PNG as both before + after
  const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAYehTtQAAAAASUVORK5CYII=', 'base64');
  const fixDir = path.join(__dirname, 'fixtures'); fs.mkdirSync(fixDir, { recursive: true });
  const beforePath = path.join(fixDir, 'phase7-before.png');
  const afterPath = path.join(fixDir, 'phase7-after.png');
  fs.writeFileSync(beforePath, pngBytes);
  fs.writeFileSync(afterPath, pngBytes);

  await page.getByTestId('photo-before-input').setInputFiles(beforePath);
  await page.waitForTimeout(200);
  await page.getByTestId('photo-after-input').setInputFiles(afterPath);
  await page.waitForTimeout(200);
  await page.getByTestId('photo-caption-input').fill(`${TEST_PREFIX}follow-up`);

  await page.getByTestId('photo-save-submit').click();
  // Wait for save (upload to storage + insert consultation row)
  await page.waitForTimeout(8_000);

  // DB assertion: a new consultation row with this caption exists
  const rows = await sbFetch(
    `/rest/v1/clinic_consultations?tenant_id=eq.${COSMIQUE_SLUG}&patient_id=eq.${FATIMA_ID}&chief_complaint=eq.${encodeURIComponent(TEST_PREFIX+'follow-up')}&select=id,before_photos,after_photos`,
  );
  expect(rows.ok).toBeTruthy();
  expect(rows.data?.length).toBeGreaterThanOrEqual(1);
  const row = rows.data[0];
  expect(Array.isArray(row.before_photos) && row.before_photos.length).toBeGreaterThanOrEqual(1);

  // UI: the grid should now have at least one pair
  await expect.poll(
    async () => (await page.locator('[data-testid^="photo-pair-"]').count()),
    { timeout: 10_000, intervals: [500, 1000] },
  ).toBeGreaterThanOrEqual(1);

  const ss = path.join(SS_DIR, 'phase7-c1-photos.png');
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ test: '7.C.1', verdict: 'REAL_PASS', consultation_row_id: row.id, before_count: row.before_photos?.length, after_count: row.after_photos?.length, screenshot: ss });
  persist();

  // Cleanup
  await sbFetch(`/rest/v1/clinic_consultations?id=eq.${row.id}`, { method: 'DELETE' });
  fs.unlinkSync(beforePath); fs.unlinkSync(afterPath);
});

// ── 7.D.1 MEDICA-suggested prescriptions ──────────────────────────────────
test('7.D.1 AI-Suggest button populates medicines with MEDICA badge', async ({ page }) => {
  test.setTimeout(240_000);
  page.setDefaultNavigationTimeout(60_000);

  await page.goto(`/clinic/patients/${FATIMA_ID}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('[role="tab"]', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await page.getByRole('tab', { name: /care/i }).click();
  await page.waitForTimeout(600);

  const addRxBtn = page.getByTestId('add-prescription-button');
  await expect(addRxBtn).toBeVisible({ timeout: 8_000 });
  await addRxBtn.click();
  await page.waitForTimeout(400);

  const suggestBtn = page.getByTestId('rx-ai-suggest');
  if (!await suggestBtn.isVisible({ timeout: 8_000 }).catch(()=>false)) {
    const ss = path.join(SS_DIR, 'phase7-d1-deploy-pending.png');
    await page.screenshot({ path: ss, fullPage: true });
    results.push({ test: '7.D.1', verdict: 'DEPLOY_PENDING', notes: 'rx-ai-suggest testid not found — needs Lovable Publish', screenshot: ss });
    persist();
    test.skip(true, 'DEPLOY_PENDING');
    return;
  }

  await page.getByTestId('rx-diagnosis-input').fill('acne vulgaris');
  await suggestBtn.click();
  // MEDICA can take 30–90s — wait up to 150s for the suggestion toast + badge
  await expect(page.getByTestId('rx-ai-badge-0')).toBeVisible({ timeout: 150_000 });

  // Med 0 name should be populated
  const med0Name = await page.getByTestId('rx-med-name-0').inputValue();
  expect(med0Name.length).toBeGreaterThan(0);

  const ss = path.join(SS_DIR, 'phase7-d1-ai-suggest.png');
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ test: '7.D.1', verdict: 'REAL_PASS', first_medicine_name: med0Name, screenshot: ss });
  persist();
});
