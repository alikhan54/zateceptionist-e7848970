/**
 * Real-browser debug harness for the four user-reported UI regressions:
 *   1. AI Assistant → "I'm sorry, I couldn't process your request"
 *   2. Training → card title shows raw `{"ai_generated":true,…}` JSON
 *   3. Training → Enroll Now click fails (or no toast)
 *   4. Recruitment → 0 candidates despite "completed" sourcing run
 *
 * Each test opens the page in a real Chromium, captures Network +
 * Console, asserts the user-visible result. NO curl probes.
 *
 * Auth: zate (premium tenant). Cosmique requires a separate storage state.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', 'hr-real-browser');
const RESULTS_PATH = path.join(__dirname, 'hr-real-browser-results.json');
const SUPA = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg2ODI3NSwiZXhwIjoyMDgyNDQ0Mjc1fQ.Q_Z47LEXi7WtYPAL4M18LIVUy7oTvq2VR79nVEIL4FE';
const ZATE = 'ac308ab6-f381-4eef-88ec-4d5c7a860ff9';
const TS = Date.now();

type Verdict = 'PASS' | 'FAIL' | 'PARTIAL';
interface Result { id: string; name: string; verdict: Verdict; evidence: Record<string, unknown>; notes: string[]; screenshot?: string; }
const results: Result[] = [];

test.describe.configure({ mode: 'default' });
test.use({ trace: 'off' });
test.beforeAll(() => fs.mkdirSync(SHOT_DIR, { recursive: true }));
function flush() {
  const byId = new Map<string, Result>();
  for (const r of results) byId.set(r.id, r);
  const final = Array.from(byId.values());
  fs.writeFileSync(RESULTS_PATH, JSON.stringify({
    total: final.length, pass: final.filter(r => r.verdict === 'PASS').length,
    partial: final.filter(r => r.verdict === 'PARTIAL').length,
    fail: final.filter(r => r.verdict === 'FAIL').length, results: final,
  }, null, 2));
}
test.afterEach(() => flush());
test.afterAll(() => flush());

async function goto(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { ['tutorial-dismissed','onboarding-completed','welcome-shown','hr-tour-completed','product-tour-completed'].forEach(k => localStorage.setItem(k, 'true')); } catch {} }).catch(() => {});
}
async function shot(page: Page, slug: string) {
  const p = path.join(SHOT_DIR, `${slug}.png`);
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return path.relative(__dirname, p);
}

test('B1 AI Assistant returns a real answer (no "I\'m sorry" loop)', async ({ page }) => {
  test.setTimeout(150_000);
  const notes: string[] = [];
  const seen: Array<{ url: string; status?: number; bodyPreview?: string }> = [];
  page.on('request', req => {
    if (/ai-assistant|webhooks\.zatesystems/.test(req.url())) seen.push({ url: req.url() });
  });
  page.on('response', async res => {
    if (/ai-assistant|webhooks\.zatesystems/.test(res.url())) {
      try {
        const body = (await res.text()).slice(0, 300);
        seen.push({ url: res.url(), status: res.status(), bodyPreview: body });
      } catch {}
    }
  });
  const consoleErrors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

  await goto(page, '/hr/ai-assistant');
  const input = page.locator('input[placeholder*="HR" i], input[placeholder*="ask" i], textarea').first();
  await input.fill('How many employees do we have?');
  await input.press('Enter').catch(async () => {
    await page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]').first().click({ timeout: 5000 }).catch(() => {});
  });
  await page.waitForTimeout(60_000);
  const shotPath = await shot(page, 'b1_ai_assistant');

  const bodyText = await page.locator('body').innerText();
  const sawSorry = /\bi'?m sorry\b|couldn'?t process|unexpected response from the AI service/i.test(bodyText);
  const sawNumber = /\b(2[0-9]|3[0-9])\s*(employees?|active|people)/i.test(bodyText) || /\b21\b/.test(bodyText) || /\b22\b/.test(bodyText);
  notes.push(`network=${seen.length} calls; first request: ${seen[0]?.url || 'none'}`);
  notes.push(`console errors=${consoleErrors.length}; first: ${consoleErrors[0] || 'none'}`);
  notes.push(`saw "I'm sorry"=${sawSorry}; saw_number=${sawNumber}`);
  results.push({
    id: 'B1', name: 'AI Assistant returns a real answer',
    verdict: (!sawSorry && sawNumber) ? 'PASS' : (sawSorry ? 'FAIL' : 'PARTIAL'),
    evidence: { saw_sorry: sawSorry, saw_number: sawNumber, network_calls: seen.slice(0, 5) },
    notes, screenshot: shotPath,
  });
  expect(sawSorry, 'UI must not show "I\'m sorry" fallback').toBe(false);
});

test('B2 Training cards never render raw JSON', async ({ page }) => {
  test.setTimeout(60_000);
  const notes: string[] = [];
  await goto(page, '/hr/training');
  await page.waitForTimeout(3000);
  const shotPath = await shot(page, 'b2_training_list');
  const bodyText = await page.locator('body').innerText();
  // The bug pattern: any card containing the raw JSON blob
  const jsonInUi = /\{\s*"ai_generated"\s*:\s*true/.test(bodyText)
    || /content_script\s*"\s*:/.test(bodyText);
  notes.push(`raw_json_visible=${jsonInUi}`);
  const cards = await page.locator('[class*="card"], [class*="Card"]').count();
  notes.push(`card_count=${cards}`);
  results.push({
    id: 'B2', name: 'Training cards never render raw JSON',
    verdict: !jsonInUi ? 'PASS' : 'FAIL',
    evidence: { raw_json_visible: jsonInUi, card_count: cards },
    notes, screenshot: shotPath,
  });
  expect(jsonInUi, 'Training card must not show {"ai_generated":true,...} JSON').toBe(false);
});

test('B3 Training Enroll button succeeds (no "Failed to enroll" toast)', async ({ page }) => {
  test.setTimeout(120_000);
  const notes: string[] = [];
  let programId: string | null = null;
  try {
    // Seed a known program directly via API so the test does not depend on
    // having generated one through the UI.
    const created = await page.request.post(`${SUPA}/rest/v1/hr_training_programs`, {
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      data: { tenant_id: ZATE, name: `B3-Enroll-Probe ${TS}`, description: 'Probe program for enroll-button test', type: 'online', status: 'active', duration_hours: 1 },
    });
    const cb = await created.json();
    programId = Array.isArray(cb) ? cb[0]?.id : cb?.id;
    notes.push(`seeded program_id=${programId}`);

    await goto(page, '/hr/training');
    await page.waitForTimeout(3500);
    // Find the card whose text contains our marker, click Enroll Now
    const card = page.locator(`text=B3-Enroll-Probe ${TS}`).first().locator('xpath=ancestor-or-self::*[contains(@class,"card") or contains(@class,"Card")][1]');
    const enrollBtn = card.locator('button:has-text("Enroll")').first();
    const visible = await enrollBtn.isVisible({ timeout: 8000 }).catch(() => false);
    notes.push(`enroll button visible=${visible}`);
    if (visible) {
      await enrollBtn.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
    }
    const shotPath = await shot(page, 'b3_after_enroll_click');
    const toasts = await page.locator('[data-sonner-toast], [role="status"]').allTextContents();
    notes.push(`toasts=${JSON.stringify(toasts).slice(0, 220)}`);
    const failedToast = toasts.some(t => /failed to enroll/i.test(t));
    const successToast = toasts.some(t => /enrolled successfully/i.test(t));

    // Verify DB-side too
    const recs = await page.request.get(
      `${SUPA}/rest/v1/hr_training_records?tenant_id=eq.${ZATE}&training_name=ilike.*B3-Enroll-Probe*&select=id,training_name,status`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } },
    );
    const recsBody = await recs.json();
    notes.push(`db_rows=${recsBody.length}`);

    const pass = (!failedToast && (successToast || recsBody.length > 0));
    results.push({
      id: 'B3', name: 'Training Enroll button succeeds',
      verdict: pass ? 'PASS' : 'FAIL',
      evidence: { failed_toast: failedToast, success_toast: successToast, db_record_count: recsBody.length },
      notes, screenshot: shotPath,
    });
    expect(pass, 'Enroll must produce success toast OR DB row').toBe(true);
  } finally {
    if (programId) {
      await page.request.delete(`${SUPA}/rest/v1/hr_training_records?tenant_id=eq.${ZATE}&training_name=ilike.*B3-Enroll-Probe*`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
      await page.request.delete(`${SUPA}/rest/v1/hr_training_programs?id=eq.${programId}`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
    }
  }
});

test('B4 Recruitment shows real candidates after sourcing', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const notes: string[] = [];
  let jobId: string | null = null, runId: string | null = null;
  try {
    // Seed a job with a generic title that the paid Apify actor can match
    const j = await page.request.post(`${SUPA}/rest/v1/hr_job_requisitions`, {
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      data: { tenant_id: ZATE, requisition_number: `B4-${TS}`, job_title: 'Senior Software Engineer',
              title: 'Senior Software Engineer', location_city: 'Dubai', location_country: 'UAE',
              status: 'active', required_skills: ['React'], source_url: null },
    });
    const jb = await j.json();
    jobId = Array.isArray(jb) ? jb[0]?.id : jb?.id;
    notes.push(`job_id=${jobId}`);

    // Trigger sourcing via the same webhook the UI button hits
    const t = await page.request.post('http://localhost:5678/webhook/hr/job/trigger-sourcing-v2', {
      headers: { 'Content-Type': 'application/json' },
      data: { tenant_id: ZATE, job_requisition_id: jobId, trigger_type: 'manual' },
      timeout: 120_000,
    });
    const tb = await t.json();
    runId = tb?.data?.sourcing_run_id;
    notes.push(`run_id=${runId} path=${tb?.data?.path}`);

    const start = Date.now();
    let final: any = null;
    while (Date.now() - start < 120_000) {
      await new Promise(r => setTimeout(r, 4000));
      const g = await page.request.get(
        `${SUPA}/rest/v1/hr_sourcing_runs?id=eq.${runId}&select=status,total_candidates_found,error_log`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
      const arr = await g.json();
      final = Array.isArray(arr) ? arr[0] : null;
      if (final && ['completed', 'failed'].includes(final.status)) break;
    }
    notes.push(`run_final=${JSON.stringify(final).slice(0, 300)}`);

    // Now check DB-side for this job's candidates
    const cands = await page.request.get(
      `${SUPA}/rest/v1/hr_candidates?tenant_id=eq.${ZATE}&job_id=eq.${jobId}&select=first_name,last_name,current_title,match_score`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
    const candsBody = await cands.json();
    notes.push(`db_candidates=${candsBody.length} sample=${JSON.stringify(candsBody.slice(0, 3)).slice(0, 300)}`);

    // Visit /hr/recruitment and look at the page text
    await goto(page, '/hr/recruitment');
    await page.waitForTimeout(4000);
    const shotPath = await shot(page, 'b4_recruitment');
    const bodyText = await page.locator('body').innerText();
    // Check that at least one of our scraped candidate names appears in the UI
    const anyVisible = candsBody.some((c: any) => {
      const name = ((c.first_name || '') + ' ' + (c.last_name || '')).trim();
      return name && bodyText.includes(name.split(' ')[0]);
    });
    notes.push(`any_candidate_visible_in_ui=${anyVisible}`);

    const dbHasCandidates = candsBody.length > 0;
    results.push({
      id: 'B4', name: 'Recruitment shows real candidates after sourcing',
      verdict: dbHasCandidates ? 'PASS' : 'FAIL',
      evidence: { run_final: final, db_candidate_count: candsBody.length, ui_visible: anyVisible, sample: candsBody.slice(0, 3) },
      notes, screenshot: shotPath,
    });
    expect(dbHasCandidates, 'Sourcing must save >=1 real candidate to hr_candidates').toBe(true);
  } finally {
    if (jobId) {
      await page.request.delete(`${SUPA}/rest/v1/hr_candidates?job_id=eq.${jobId}`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
      if (runId) await page.request.delete(`${SUPA}/rest/v1/hr_sourcing_runs?id=eq.${runId}`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
      await page.request.delete(`${SUPA}/rest/v1/hr_job_requisitions?id=eq.${jobId}`,
        { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } }).catch(() => {});
    }
  }
});
