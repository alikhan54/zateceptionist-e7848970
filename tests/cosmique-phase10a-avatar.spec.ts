import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase10a-avatar-results.json');

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

const results: any = { phase: '10A.3', steps: [] };
function persist() { fs.writeFileSync(REPORT, JSON.stringify(results, null, 2)); }

test('10A.3 Doctor avatar — real UI upload → workflow → MEDICA → video script', async ({ page }) => {
  test.setTimeout(360_000);
  page.setDefaultNavigationTimeout(60_000);

  // PRE-CHECK: baseline row counts
  const preReports = await sb(`/rest/v1/clinic_medical_reports?tenant_id=eq.${COSMIQUE}&patient_id=eq.${FATIMA}&select=id`);
  const preScripts = await sb(`/rest/v1/clinic_video_scripts?tenant_id=eq.${COSMIQUE}&patient_id=eq.${FATIMA}&select=id`);
  results.steps.push({ step: 'baseline', reports: preReports.data?.length || 0, video_scripts: preScripts.data?.length || 0 });
  persist();

  // STEP 1 — navigate to health reports
  await page.goto('/clinic/health-reports', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // STEP 2 — open upload dialog
  const uploadBtn = page.getByRole('button', { name: /upload report/i }).first();
  await expect(uploadBtn).toBeVisible({ timeout: 20_000 });
  await uploadBtn.click();
  await page.waitForTimeout(800);

  // STEP 3 — pick Fatima
  await page.getByRole('combobox').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: /Fatima/i }).first().click();
  await page.waitForTimeout(400);

  // STEP 4 — pick report type (general or first option)
  await page.getByRole('combobox').nth(1).click();
  await page.waitForTimeout(400);
  await page.getByRole('option').first().click();
  await page.waitForTimeout(400);

  // STEP 5 — attach the fixture PDF
  const pdfPath = path.join(__dirname, 'fixtures', 'sample-medical-report.pdf');
  await page.getByTestId('health-report-file-input').setInputFiles(pdfPath);
  await page.waitForTimeout(500);

  // STEP 6 — submit
  await page.getByTestId('upload-report-submit').click();
  results.steps.push({ step: 'submit_clicked', t: Date.now() });
  persist();

  // STEP 7 — poll for new medical report row (up to 60s)
  let newReportId: string | null = null;
  await expect.poll(async () => {
    const r = await sb(`/rest/v1/clinic_medical_reports?tenant_id=eq.${COSMIQUE}&patient_id=eq.${FATIMA}&select=id,status,created_at&order=created_at.desc&limit=1`);
    const top = (r.data || [])[0];
    if (top && !preReports.data?.find((x: any) => x.id === top.id)) { newReportId = top.id; return top.status; }
    return null;
  }, { timeout: 60_000, intervals: [2000, 3000, 5000] }).not.toBeNull();
  results.steps.push({ step: 'medical_report_created', report_id: newReportId });
  persist();

  // STEP 8 — poll for video_script row (workflow chain reaches DA.2 + creates script)
  let newScriptId: string | null = null; let scriptRow: any = null;
  await expect.poll(async () => {
    const r = await sb(`/rest/v1/clinic_video_scripts?tenant_id=eq.${COSMIQUE}&patient_id=eq.${FATIMA}&select=id,status,video_status,video_url,full_script,created_at&order=created_at.desc&limit=1`);
    const top = (r.data || [])[0];
    if (top && !preScripts.data?.find((x: any) => x.id === top.id)) { newScriptId = top.id; scriptRow = top; return top.video_status || top.status; }
    return null;
  }, { timeout: 60_000, intervals: [2000, 3000, 5000] }).not.toBeNull();
  results.steps.push({
    step: 'video_script_created',
    script_id: newScriptId,
    video_status: scriptRow?.video_status,
    status: scriptRow?.status,
    video_url: scriptRow?.video_url,
    full_script_len: (scriptRow?.full_script || '').length,
  });
  persist();

  const ss = path.join(SS_DIR, 'phase10a-avatar-after-upload.png');
  await page.screenshot({ path: ss, fullPage: true });
  results.steps.push({ step: 'ui_screenshot', path: ss });

  // VERDICT logic
  const reportOK = !!newReportId;
  const scriptOK = !!newScriptId && (scriptRow?.full_script || '').length > 30;
  const videoOK = !!scriptRow?.video_url;
  let verdict = 'NO_EXECUTION_FIRED';
  if (reportOK && scriptOK && videoOK) verdict = 'FULL_FLOW_PASS';
  else if (reportOK && scriptOK) verdict = 'PARTIAL_VIDEO_MISSING';
  else if (reportOK) verdict = 'PARTIAL_NO_SCRIPT';
  results.verdict = verdict;
  persist();

  // CLEANUP
  if (newScriptId) await sb(`/rest/v1/clinic_video_scripts?id=eq.${newScriptId}`, { method: 'DELETE' });
  if (newReportId) {
    await sb(`/rest/v1/clinic_health_analyses?report_id=eq.${newReportId}`, { method: 'DELETE' });
    await sb(`/rest/v1/clinic_medical_review_queue?report_id=eq.${newReportId}`, { method: 'DELETE' });
    await sb(`/rest/v1/clinic_medical_reports?id=eq.${newReportId}`, { method: 'DELETE' });
  }
  results.steps.push({ step: 'cleanup_done' });
  persist();
});
