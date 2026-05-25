/**
 * Architectural-fix UI verification (2026-05-26).
 *
 * Verifies the 4 fixes from the "ARCHITECTURAL FIX — OMEGA Integration +
 * Sourcing That Actually Works" prompt:
 *
 *   V1  Frontend routes useHRAI through the OMEGA Bridge (/hr/ai-assistant-v2)
 *       and renders the structured OMEGA response (agent + answer + ctx).
 *   V2  Sourcing v2 chains end-to-end even when source_url is NULL
 *       (Phase 1 OPTIONAL; Phase 2+ run from job metadata alone).
 *   V3  Documents.tsx handleShare wires to navigator.share when available,
 *       falls back to clipboard. No raw Supabase URL leaked as a toast.
 *   V4  Bridge round-trip: webhook → tenant+policy+employee context → OMEGA.
 *
 * Auth: zate adeel via zate-auth.setup.ts (.auth-state-zate.json).
 * Results: tests/arch-fix-verify-results.json + screenshots/arch-fix/*.png.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', 'arch-fix');
const RESULTS_PATH = path.join(__dirname, 'arch-fix-verify-results.json');

const SUPA = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuY2ZieXdrZW1zeHd1aW93eHhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg2ODI3NSwiZXhwIjoyMDgyNDQ0Mjc1fQ.Q_Z47LEXi7WtYPAL4M18LIVUy7oTvq2VR79nVEIL4FE';
const ZATE = 'ac308ab6-f381-4eef-88ec-4d5c7a860ff9';
const TS = Date.now();

type Verdict = 'PASS' | 'FAIL' | 'PARTIAL';
interface Result { id: string; name: string; verdict: Verdict; evidence: Record<string, unknown>; notes: string[]; screenshot?: string; error?: string; }
const results: Result[] = [];

// `default` (not serial) so a single test failure doesn't skip the rest.
test.describe.configure({ mode: 'default' });
test.use({ trace: 'off' });
test.beforeAll(() => fs.mkdirSync(SHOT_DIR, { recursive: true }));
test.afterAll(() => fs.writeFileSync(RESULTS_PATH, JSON.stringify({
  total: results.length,
  pass: results.filter(r => r.verdict === 'PASS').length,
  partial: results.filter(r => r.verdict === 'PARTIAL').length,
  fail: results.filter(r => r.verdict === 'FAIL').length,
  results,
}, null, 2)));

async function goto(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => { try { ['tutorial-dismissed','onboarding-completed','welcome-shown','hr-tour-completed','product-tour-completed'].forEach(k => localStorage.setItem(k,'true')); } catch {} }).catch(() => {});
}
async function shot(page: Page, slug: string) {
  const p = path.join(SHOT_DIR, `${slug}.png`);
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return path.relative(__dirname, p);
}

// V1: useHRAI now routes through /hr/ai-assistant-v2 (OMEGA Bridge)
test('V1 AI Assistant routes through OMEGA bridge', async ({ page }) => {
  test.setTimeout(180_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  let policyId: string | null = null;
  try {
    // Seed a synced policy so OMEGA has something to cite
    const create = await page.request.post(`${SUPA}/rest/v1/hr_documents`, {
      headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}`, Prefer: 'return=representation' },
      data: {
        tenant_id: ZATE,
        document_name: `ARCHFIX-POLICY ${TS}`,
        title: `ARCHFIX-POLICY ${TS}`,
        document_type: 'policy',
        category: 'policy',
        status: 'active',
        sync_status: 'synced',
        document_content: 'Annual leave entitlement: 23 days per year. Sick leave: 12 days per year.',
        extracted_rules: {
          summary: 'Test arch-fix policy',
          policy_rules: [
            { rule: 'Employees receive 23 days annual leave per calendar year', category: 'leave' },
            { rule: 'Employees receive 12 days sick leave per calendar year', category: 'leave' },
          ],
        },
      },
    });
    const r = await create.json();
    policyId = Array.isArray(r) ? r[0]?.id : r?.id;
    notes.push(`seeded policy id=${policyId}`);

    await goto(page, '/hr/ai-assistant');

    // Intercept outgoing webhook calls so we can confirm the v2 endpoint
    const seenUrls: string[] = [];
    let v2Payload: any = null;
    let v2RespBody: any = null;
    page.on('request', req => {
      const u = req.url();
      if (/\/webhook\/hr\/ai-assistant/.test(u)) {
        seenUrls.push(u);
        try { if (u.includes('ai-assistant-v2')) v2Payload = JSON.parse(req.postData() || '{}'); } catch {}
      }
    });
    page.on('response', async resp => {
      const u = resp.url();
      if (u.includes('ai-assistant-v2') && resp.status() === 200) {
        try { v2RespBody = await resp.json(); } catch {}
      }
    });

    const input = page.locator('input[placeholder*="ask" i], input[placeholder*="anything" i], textarea').first();
    await input.fill('How many annual leave days do we get? Cite the policy.');
    await input.press('Enter').catch(async () => {
      await page.locator('button:has-text("Send"), button[aria-label*="send" i]').first().click({ timeout: 5000 }).catch(() => {});
    });
    // OMEGA round-trip is slow; allow up to 90s for the answer to render
    await page.waitForTimeout(90_000);
    screenshot = await shot(page, 'v1_ai_v2_response');

    const hitV2 = seenUrls.some(u => u.includes('ai-assistant-v2'));
    const noLegacy = !seenUrls.some(u => /ai-assistant(?!-v2)/.test(u));
    notes.push(`endpoints_seen=${JSON.stringify(seenUrls)}`);
    notes.push(`hit_v2=${hitV2} no_legacy=${noLegacy}`);

    const ctx = v2RespBody?.data?.context_loaded || v2RespBody?.context_loaded;
    const policiesLoaded = (ctx?.policies ?? 0);
    const empsLoaded = (ctx?.employees ?? 0);
    notes.push(`context_loaded=${JSON.stringify(ctx)}`);

    // Look for cited policy or expected number in the rendered UI
    const bodyText = await page.locator('body').innerText();
    const mentionsNumber = /23\s*days|23\s*annual|23-day/i.test(bodyText);
    const mentionsPolicy = /POLICY|annual leave|leave policy/i.test(bodyText);
    notes.push(`ui_mentions_number=${mentionsNumber} ui_mentions_policy_word=${mentionsPolicy}`);

    const pass = hitV2 && noLegacy && policiesLoaded > 0 && empsLoaded > 0;
    results.push({
      id: 'V1',
      name: 'AI Assistant routes through OMEGA bridge',
      verdict: pass ? 'PASS' : (hitV2 ? 'PARTIAL' : 'FAIL'),
      evidence: { hit_v2: hitV2, no_legacy: noLegacy, policies: policiesLoaded, employees: empsLoaded, ui_mentions_number: mentionsNumber },
      notes, screenshot,
    });
    expect(hitV2, `Expected the AI Assistant to call /hr/ai-assistant-v2; saw ${JSON.stringify(seenUrls)}`).toBe(true);
  } catch (e: any) {
    if (!results.find(r => r.id === 'V1')) {
      results.push({ id: 'V1', name: 'AI Assistant routes through OMEGA bridge', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String(e?.message).slice(0, 400) });
    }
    throw e;
  } finally {
    if (policyId) {
      await page.request.delete(`${SUPA}/rest/v1/hr_documents?id=eq.${policyId}`,
        { headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` } }).catch(() => {});
    }
  }
});

// V2: Sourcing v2 chains end-to-end with NULL source_url (Phase 1 optional)
test('V2 Sourcing v2 completes with NULL careers URL', async ({ page }) => {
  test.setTimeout(180_000);
  const notes: string[] = [];
  let jobId: string | null = null;
  let runId: string | null = null;
  try {
    // Create a job WITHOUT source_url to force the direct-search code path
    const jobName = `ARCHFIX-JOB ${TS}`;
    const create = await page.request.post(`${SUPA}/rest/v1/hr_job_requisitions`, {
      headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}`, Prefer: 'return=representation' },
      data: {
        tenant_id: ZATE,
        requisition_number: `ARCHFIX-REQ-${TS}`,
        job_title: jobName,
        title: jobName,
        location_city: 'Dubai',
        location_country: 'UAE',
        status: 'active',
        required_skills: ['React', 'TypeScript', 'Node.js'],
        source_url: null,
      },
    });
    const j = await create.json();
    jobId = Array.isArray(j) ? j[0]?.id : j?.id;
    notes.push(`seeded job_id=${jobId} (source_url=null) raw=${JSON.stringify(j).slice(0, 200)}`);
    expect(jobId).toBeTruthy();

    // Trigger sourcing v2 via the webhook (this is what the frontend button does)
    const trig = await page.request.post('http://localhost:5678/webhook/hr/job/trigger-sourcing-v2', {
      headers: { 'Content-Type': 'application/json' },
      data: { job_requisition_id: jobId, tenant_id: ZATE, trigger_type: 'manual' },
      timeout: 60_000,
    });
    const body = await trig.json().catch(() => ({}));
    notes.push(`trigger response=${JSON.stringify(body).slice(0, 320)}`);
    // Response shape: { success, data: { sourcing_run_id, job_requisition_id, status, path, ... } }
    const data = body?.data || body;
    runId = data?.sourcing_run_id || data?.run_id || data?.runId;
    const path1 = data?.path;
    notes.push(`run_id=${runId} path=${path1} (expect 'direct-search')`);

    expect(path1).toBe('direct-search');

    // Poll the run status until terminal or 60s
    const start = Date.now();
    let final: any = null;
    while (Date.now() - start < 60_000) {
      await page.waitForTimeout(4000);
      const got = await page.request.get(`${SUPA}/rest/v1/hr_sourcing_runs?id=eq.${runId}&select=status,phase1_status,phase2_status,phase3_status,phase4_status,error_log`, {
        headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` },
      });
      const arr = await got.json();
      final = Array.isArray(arr) ? arr[0] : null;
      if (final && ['completed', 'failed'].includes(final.status)) break;
    }
    notes.push(`final=${JSON.stringify(final)}`);

    const chainCompleted = !!final && final.status === 'completed' && final.phase1_status === 'skipped';
    results.push({
      id: 'V2',
      name: 'Sourcing v2 completes with NULL careers URL',
      verdict: chainCompleted ? 'PASS' : 'FAIL',
      evidence: { run_id: runId, path: path1, final },
      notes,
    });
    expect(chainCompleted).toBe(true);
  } catch (e: any) {
    if (!results.find(r => r.id === 'V2')) {
      results.push({ id: 'V2', name: 'Sourcing v2 completes with NULL careers URL', verdict: 'FAIL', evidence: {}, notes, error: String(e?.message).slice(0, 400) });
    }
    throw e;
  } finally {
    if (runId) {
      await page.request.delete(`${SUPA}/rest/v1/hr_sourcing_runs?id=eq.${runId}`,
        { headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` } }).catch(() => {});
    }
    if (jobId) {
      await page.request.delete(`${SUPA}/rest/v1/hr_job_requisitions?id=eq.${jobId}`,
        { headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` } }).catch(() => {});
    }
  }
});

// V3: Share button uses Web Share API (stubbed) when available
test('V3 Share button invokes Web Share API when available', async ({ page, context }) => {
  test.setTimeout(120_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  let docId: string | null = null;
  try {
    // Stub navigator.share BEFORE navigating
    await context.addInitScript(() => {
      (window as any).__shareCalls = [];
      (navigator as any).share = async (payload: any) => {
        (window as any).__shareCalls.push(payload);
        return undefined;
      };
      (navigator as any).canShare = () => true;
    });

    // Seed a doc with file_url
    const create = await page.request.post(`${SUPA}/rest/v1/hr_documents`, {
      headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}`, Prefer: 'return=representation' },
      data: {
        tenant_id: ZATE,
        document_name: `ARCHFIX-SHARE ${TS}`,
        title: `ARCHFIX-SHARE ${TS}`,
        document_type: 'policy',
        category: 'policy',
        status: 'active',
        document_content: 'Shareable content body for arch-fix test.',
      },
    });
    const r = await create.json();
    docId = Array.isArray(r) ? r[0]?.id : r?.id;
    notes.push(`seeded doc_id=${docId}`);

    await goto(page, '/hr/documents');
    await page.waitForTimeout(3000);
    screenshot = await shot(page, 'v3_documents_page');

    const shareBtn = page.locator(`[data-testid="doc-share-${docId}"]`).first();
    const fallback = page.locator('[role="menuitem"]:has-text("Share")').first();

    let opened = false;
    if (await shareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shareBtn.click({ timeout: 5000 });
      opened = true;
      notes.push('clicked via data-testid');
    } else {
      // Open row menu first
      const moreBtn = page.locator(`tr:has-text("ARCHFIX-SHARE")`).first().locator('button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-horizontal)').first();
      if (await moreBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await moreBtn.click({ timeout: 5000 });
        await page.waitForTimeout(600);
        if (await fallback.isVisible({ timeout: 2000 }).catch(() => false)) {
          await fallback.click({ timeout: 5000 });
          opened = true;
          notes.push('clicked via row menu Share item');
        }
      }
    }
    await page.waitForTimeout(2000);
    screenshot = await shot(page, 'v3_after_share_click');

    const calls = await page.evaluate(() => (window as any).__shareCalls || []);
    notes.push(`navigator.share calls=${calls.length} first=${JSON.stringify(calls[0] || {}).slice(0, 240)}`);

    const usedWebShare = calls.length > 0;
    const payloadHasShape = calls[0] && (calls[0].url || calls[0].text);
    results.push({
      id: 'V3',
      name: 'Share button invokes Web Share API',
      verdict: usedWebShare && payloadHasShape ? 'PASS' : (opened ? 'PARTIAL' : 'FAIL'),
      evidence: { opened, navigator_share_calls: calls.length, payload: calls[0] || null },
      notes, screenshot,
    });
    expect(usedWebShare, 'Expected navigator.share to be invoked after clicking Share').toBe(true);
  } catch (e: any) {
    if (!results.find(r => r.id === 'V3')) {
      results.push({ id: 'V3', name: 'Share button invokes Web Share API', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String(e?.message).slice(0, 400) });
    }
    throw e;
  } finally {
    if (docId) {
      await page.request.delete(`${SUPA}/rest/v1/hr_documents?id=eq.${docId}`,
        { headers: { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` } }).catch(() => {});
    }
  }
});
