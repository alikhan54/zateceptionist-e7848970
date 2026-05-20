import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase6_5-results.json');

const TEST_PREFIX = 'TEST_CC_PHASE6_5_';
const FATIMA_ID = '178729e2-bc49-45f8-bb89-c0c8962e2594';
const COSMIQUE_SLUG = 'cosmique';
const FIXTURE_PDF = path.join(__dirname, 'fixtures', 'sample-lab-report.pdf');

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

async function gotoDashboardAndWaitForIdle(page: any) {
  page.setDefaultNavigationTimeout(60_000);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.v3-input-pill', { timeout: 25_000 });
  // The intro cycle fires ~2.4s after mount and runs ~10s (listening 1.4s
  // → thinking 1.2s → typewriter ~3s → idle 3s buffer). If we wait for just
  // IDLE we can match the BRIEF pre-intro window and our question gets
  // shadowed by the intro's setTranscript. Wait long enough for intro to
  // fully run, THEN wait for IDLE again.
  await page.waitForTimeout(16_000);
  const pill = page.getByTestId('omega-state-pill');
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0],
    { timeout: 30_000, intervals: [500, 500, 1000] }).toBe('IDLE');
  // Extra settle so the typewriter from intro is truly done.
  await page.waitForTimeout(1500);
}

async function askOmega(page: any, question: string): Promise<string> {
  const input = page.locator('.v3-input-pill').first();
  // The input is disabled while state is thinking/speaking. Wait for it to
  // be enabled (i.e., state has settled to idle) before interacting.
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.click();
  // Clear any prior text
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(question, { delay: 25 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');

  // Wait up to 120s for SPEAKING state OR transcript to populate substantially
  const transcript = page.getByTestId('omega-transcript');
  const pill = page.getByTestId('omega-state-pill');

  // First wait for state to leave IDLE (confirms send happened)
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0],
    { timeout: 30_000, intervals: [200, 500, 1000] }).not.toBe('IDLE');

  // Then wait for SPEAKING (means reply received and is being typed) OR
  // for transcript to grow past the echo of our question
  await expect.poll(async () => {
    const txt = (await transcript.innerText()).trim();
    // The transcript first shows our question (echo), then is replaced with reply.
    // Reply state: state pill SPEAKING/IDLE AND transcript != question.
    const state = (await pill.innerText()).trim().split(/\s+/)[0];
    return state === 'SPEAKING' || state === 'IDLE' || (txt.length > question.length + 20 && !txt.startsWith(question));
  }, { timeout: 120_000, intervals: [1000, 2000, 3000] }).toBe(true);

  // Let the typewriter animation finish — wait for state=IDLE
  await expect.poll(async () => (await pill.innerText()).trim().split(/\s+/)[0],
    { timeout: 60_000, intervals: [1000, 2000] }).toBe('IDLE');

  const final = (await transcript.innerText()).trim();
  return final;
}

// ── 6.5.1 OMEGA real UI Q&A ────────────────────────────────────────────────
test('6.5.1 OMEGA real UI Q&A — cosmique services + patient count', async ({ page }) => {
  test.setTimeout(420_000);

  await gotoDashboardAndWaitForIdle(page);

  // Q1: services
  const q1 = 'what services do you offer?';
  const a1 = await askOmega(page, q1);
  const ss1 = path.join(SS_DIR, 'phase6_5-omega-q1.png');
  await page.screenshot({ path: ss1, fullPage: true });

  const a1Lower = a1.toLowerCase();
  const q1ClinicalHit = /aesthetic|clinic|hydrafacial|botox|hifu|mnrf|skincare|cosmique|skin|laser|filler|injection/i.test(a1);
  results.push({ test: '6.5.1.q1', question: q1, answer: a1, length: a1.length, clinical_term_present: q1ClinicalHit, screenshot: ss1 });
  persist();

  // Q2: patient count (between questions, state needs to be IDLE — askOmega
  // already waits for that)
  const q2 = 'how many patients do I have?';
  const a2 = await askOmega(page, q2);
  const ss2 = path.join(SS_DIR, 'phase6_5-omega-q2.png');
  await page.screenshot({ path: ss2, fullPage: true });

  const mentionsPatient = /patient|fatima|omar|rania|3 patient|three patient/i.test(a2);
  results.push({ test: '6.5.1.q2', question: q2, answer: a2, length: a2.length, patient_mention: mentionsPatient, screenshot: ss2 });
  persist();

  // Compare both responses are different
  results.push({ test: '6.5.1.diff_check', distinct_answers: a1 !== a2 });
  persist();
});

// ── 6.5.2 MEDICA via UI ────────────────────────────────────────────────────
test('6.5.2 MEDICA clinical question — HydraFacial', async ({ page }) => {
  test.setTimeout(300_000);

  // Capture network to see which agent the response came from
  let agentSeen: string | null = null;
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('omega-chat') && resp.status() === 200) {
      try {
        const body = await resp.json().catch(()=>null);
        const found = body?.data?.agent_used || body?.agent_used || body?.data?.current_agent;
        if (found) agentSeen = String(found);
      } catch { /* noop */ }
    }
  });

  await gotoDashboardAndWaitForIdle(page);
  const q = 'Do you have HydraFacial?';
  const a = await askOmega(page, q);
  const ss = path.join(SS_DIR, 'phase6_5-medica-hydrafacial.png');
  await page.screenshot({ path: ss, fullPage: true });

  const mentionsHF = /hydrafacial/i.test(a);
  results.push({ test: '6.5.2', question: q, answer: a, length: a.length, hydrafacial_mentioned: mentionsHF, agent_used: agentSeen, screenshot: ss });
  persist();
});

// ── 6.5.3 Medical report — real UI upload (workflow exercise) ──────────────
test('6.5.3 Medical report flow — real upload, watch workflow + analysis', async ({ page }) => {
  test.setTimeout(420_000);
  page.setDefaultNavigationTimeout(60_000);

  const stamp = Date.now();
  const filenameTag = `${TEST_PREFIX}${stamp}.pdf`;

  // PRE: count workflow executions BEFORE
  const execBefore = await fetch('http://localhost:5678/api/v1/executions?workflowId=lhdU0HUxmdgSSDpD&limit=20', {
    headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYmVhOTRhMS1mOWRhLTQyZDktYmQ4Yi1hNjZhZTA0MGMwYWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTc0MGI1MzctMjhjZS00Njg0LTllMDYtN2QxMjE1NDYwNWRkIiwiaWF0IjoxNzc0Mjg0MjQ2fQ.NguZRCCrXj6BNLjG7mzM5630apRr2oLxZvoN2WOfWIY' },
  }).then(r => r.json()).catch(() => ({ data: [] }));
  const execCountBefore = (execBefore.data || []).length;

  await page.goto('/clinic/health-reports', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('h1', { timeout: 20_000 });
  await page.waitForTimeout(1500);

  // Open upload dialog
  await page.getByRole('button', { name: /upload report/i }).first().click();
  await page.waitForTimeout(400);

  // Pick Fatima
  await page.getByRole('combobox').nth(0).click();
  await page.waitForTimeout(200);
  await page.getByRole('option').filter({ hasText: /fatima/i }).first().click();

  // Pick Blood Test
  await page.getByRole('combobox').nth(1).click();
  await page.waitForTimeout(200);
  await page.getByRole('option', { name: /blood test/i }).click();

  // Attach file (REAL upload — no route stub this time)
  await page.getByTestId('health-report-file-input').setInputFiles(FIXTURE_PDF);
  await page.waitForTimeout(300);

  // Submit
  await page.getByTestId('upload-report-submit').click();
  // Wait for either success toast OR error toast
  await page.waitForTimeout(4000);

  // Check if a clinic_medical_reports row was created server-side. The n8n
  // workflow is the path that creates the row (frontend POSTs to it).
  // Look for any recent row for cosmique+Fatima within last 60s.
  let reportRow: any = null;
  const startTs = Date.now();
  while (Date.now() - startTs < 60_000) {
    const r = await sbFetch(`/rest/v1/clinic_medical_reports?tenant_id=eq.${COSMIQUE_SLUG}&patient_id=eq.${FATIMA_ID}&order=created_at.desc&limit=3&select=*`);
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      const recent = r.data[0];
      // Was this created within the test window? (created within last 90s)
      if (recent.created_at && (Date.now() - new Date(recent.created_at).getTime()) < 90_000) {
        reportRow = recent;
        break;
      }
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  const ss = path.join(SS_DIR, 'phase6_5-medical-upload.png');
  await page.screenshot({ path: ss, fullPage: true });

  // Check n8n executions AFTER
  await new Promise(r => setTimeout(r, 5000));
  const execAfter = await fetch('http://localhost:5678/api/v1/executions?workflowId=lhdU0HUxmdgSSDpD&limit=20', {
    headers: { 'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYmVhOTRhMS1mOWRhLTQyZDktYmQ4Yi1hNjZhZTA0MGMwYWQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTc0MGI1MzctMjhjZS00Njg0LTllMDYtN2QxMjE1NDYwNWRkIiwiaWF0IjoxNzc0Mjg0MjQ2fQ.NguZRCCrXj6BNLjG7mzM5630apRr2oLxZvoN2WOfWIY' },
  }).then(r => r.json()).catch(() => ({ data: [] }));
  const execCountAfter = (execAfter.data || []).length;
  const newExec = execCountAfter > execCountBefore ? (execAfter.data || [])[0] : null;

  // Verdict
  let verdict = 'WORKFLOW_BROKEN';
  if (reportRow) verdict = 'UPLOAD_PASS';
  if (reportRow && newExec) verdict = 'WORKFLOW_FIRED';
  // Poll for analysis row (signals MEDICA ran)
  let analysisRow: any = null;
  if (reportRow) {
    const startA = Date.now();
    while (Date.now() - startA < 90_000) {
      const a = await sbFetch(`/rest/v1/clinic_health_analyses?tenant_id=eq.${COSMIQUE_SLUG}&patient_id=eq.${FATIMA_ID}&order=created_at.desc&limit=1&select=*`);
      if (a.ok && a.data?.length && (Date.now() - new Date(a.data[0].created_at).getTime()) < 180_000) {
        analysisRow = a.data[0];
        verdict = 'ANALYSIS_PASS';
        break;
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  // Poll for video row
  let videoRow: any = null;
  if (analysisRow) {
    const startV = Date.now();
    while (Date.now() - startV < 90_000) {
      const v = await sbFetch(`/rest/v1/clinic_video_scripts?tenant_id=eq.${COSMIQUE_SLUG}&patient_id=eq.${FATIMA_ID}&order=created_at.desc&limit=1&select=*`);
      if (v.ok && v.data?.length && (Date.now() - new Date(v.data[0].created_at).getTime()) < 240_000) {
        videoRow = v.data[0];
        if (videoRow.video_url) verdict = 'FULL_FLOW_PASS';
        else verdict = 'VIDEO_BROKEN';
        break;
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  results.push({
    test: '6.5.3',
    verdict,
    upload_dialog_clicked: true,
    report_row_id: reportRow?.id || null,
    n8n_exec_count_before: execCountBefore,
    n8n_exec_count_after: execCountAfter,
    n8n_new_execution: newExec ? { id: newExec.id, status: newExec.status, startedAt: newExec.startedAt } : null,
    analysis_row_id: analysisRow?.id || null,
    video_row_id: videoRow?.id || null,
    video_url: videoRow?.video_url || null,
    screenshot: ss,
  });
  persist();

  // Cleanup test data
  if (videoRow) await sbFetch(`/rest/v1/clinic_video_scripts?id=eq.${videoRow.id}`, { method: 'DELETE' });
  if (analysisRow) await sbFetch(`/rest/v1/clinic_health_analyses?id=eq.${analysisRow.id}`, { method: 'DELETE' });
  if (reportRow) await sbFetch(`/rest/v1/clinic_medical_reports?id=eq.${reportRow.id}`, { method: 'DELETE' });
});
