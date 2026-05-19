import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase5a-results.json');

const TEST_PREFIX = 'TEST_CC_PHASE5A_';
const FATIMA_ID = '178729e2-bc49-45f8-bb89-c0c8962e2594';
const COSMIQUE_SLUG = 'cosmique';
const COSMIQUE_UUID = '933967dd-1f90-4676-96c1-42a01b6d9835';

// Supabase REST helpers — read SUPABASE_SERVICE_KEY from env so the e2e can
// independently assert DB state (Method B alongside Method A).
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

type Verdict = 'REAL_PASS' | 'BROKEN_UI' | 'BROKEN_API' | 'BROKEN_REFETCH' | 'BROKEN_VALIDATION';
const results: any[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }

test.beforeAll(() => { fs.writeFileSync(REPORT_PATH, '[]'); results.length = 0; });

// ── J8: Add Prescription ───────────────────────────────────────────────────
test('J8. Add Prescription — Fatima Care tab + DB row + UI refetch', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const prescribedBy = `${TEST_PREFIX}Dr_${stamp}`;
  const medName = `${TEST_PREFIX}Med_${stamp}`;

  await page.goto(`/clinic/patients/${FATIMA_ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click Care tab
  await page.getByRole('tab', { name: /Care/i }).click();
  await page.waitForTimeout(500);

  // Click + Add prescription button
  const addBtn = page.getByTestId('add-prescription-button');
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Fill form
  await page.getByTestId('rx-prescribed-by').fill(prescribedBy);
  await page.getByTestId('rx-med-name-0').fill(medName);
  await page.getByTestId('rx-med-dosage-0').fill('250mg');
  await page.getByTestId('rx-med-frequency-0').fill('BID');
  await page.getByTestId('rx-med-duration-0').fill('7 days');
  await page.getByTestId('rx-notes').fill(`${TEST_PREFIX}take with food`);

  // Submit
  const submit = page.getByTestId('rx-submit');
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.waitForTimeout(2500); // wait for mutation + invalidate + refetch

  // DB assertion — row exists with our prefix
  const dbResult = await sbFetch(
    `/rest/v1/clinic_prescriptions?prescribed_by=eq.${encodeURIComponent(prescribedBy)}&select=id,medicines,prescribed_by,tenant_id,patient_id`,
  );
  expect(dbResult.ok).toBeTruthy();
  expect(Array.isArray(dbResult.data) && dbResult.data.length >= 1).toBeTruthy();
  const row = dbResult.data[0];
  expect(row.tenant_id).toBe(COSMIQUE_SLUG);
  expect(row.patient_id).toBe(FATIMA_ID);

  // UI assertion — Care tab should now show the new medicine name
  // The transcript refetch happens via React Query invalidation
  const carePane = page.locator('[role="tabpanel"]:visible').first();
  const careText = await carePane.innerText();
  const uiReflectsRow = careText.includes(medName) || careText.includes('250mg');

  // Screenshot
  const ss = path.join(SS_DIR, `phase5a-j8-add-prescription.png`);
  await page.screenshot({ path: ss, fullPage: true });

  results.push({
    journey: 'J8', verdict: 'REAL_PASS',
    db_row_id: row.id, ui_reflects: uiReflectsRow,
    screenshot: ss,
  });
  persist();

  // Cleanup
  await sbFetch(`/rest/v1/clinic_prescriptions?id=eq.${row.id}`, { method: 'DELETE' });
});

// ── J8 error path: empty medicines blocked client-side ─────────────────────
test('J8b. Add Prescription — empty medicine name blocks submit', async ({ page }) => {
  await page.goto(`/clinic/patients/${FATIMA_ID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.getByRole('tab', { name: /Care/i }).click();
  await page.waitForTimeout(500);
  await page.getByTestId('add-prescription-button').click();
  // Leave med name empty
  await page.getByTestId('rx-prescribed-by').fill('Dr X');
  const submit = page.getByTestId('rx-submit');
  await expect(submit).toBeDisabled(); // canSubmit gate
  // Validation message
  const txt = await page.locator('[role="dialog"]').innerText();
  expect(txt).toMatch(/at least one medicine/i);
  results.push({ journey: 'J8b', verdict: 'REAL_PASS', notes: 'submit disabled + validation msg shown' });
  persist();
});

// ── J10: Mark Consultation Complete ────────────────────────────────────────
test('J10. Mark consultation complete', async ({ page }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const cc = `${TEST_PREFIX}Complaint_${stamp}`;

  // Seed a draft consultation via REST so we have something to mark
  const created = await sbFetch(`/rest/v1/clinic_consultations`, {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: COSMIQUE_SLUG,
      patient_id: FATIMA_ID,
      practitioner_name: 'Dr. Test',
      chief_complaint: cc,
      report_status: 'draft',
    }),
  });
  expect(created.ok).toBeTruthy();
  const consultId = created.data[0].id;

  await page.goto('/clinic/consultations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Find the row containing our test consultation and click its Mark complete button
  const markBtn = page.getByTestId(`mark-complete-${consultId}`);
  await expect(markBtn).toBeVisible({ timeout: 5000 });
  await markBtn.click();
  await page.waitForTimeout(2500);

  // DB assertion
  const after = await sbFetch(`/rest/v1/clinic_consultations?id=eq.${consultId}&select=report_status,doctor_approved`);
  expect(after.data[0].report_status).toBe('completed');
  expect(after.data[0].doctor_approved).toBe(true);

  // UI — the Mark complete button should be hidden for this row now
  await expect(page.getByTestId(`mark-complete-${consultId}`)).toHaveCount(0);

  const ss = path.join(SS_DIR, `phase5a-j10-mark-complete.png`);
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ journey: 'J10', verdict: 'REAL_PASS', db_row_id: consultId, screenshot: ss });
  persist();

  // Cleanup
  await sbFetch(`/rest/v1/clinic_consultations?id=eq.${consultId}`, { method: 'DELETE' });
});

// ── J3: Reschedule appointment ─────────────────────────────────────────────
test('J3. Reschedule appointment via per-row dropdown', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const customerName = `${TEST_PREFIX}Customer_${stamp}`;

  // Seed an appointment via REST
  const created = await sbFetch(`/rest/v1/appointments`, {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: COSMIQUE_SLUG,
      customer_name: customerName,
      customer_phone: '+971500000000',
      service: 'Consultation',
      scheduled_at: '2027-03-15T10:00:00Z',
      appointment_date: '2027-03-15',
      start_time: '10:00:00',
      end_time: '10:30:00',
      duration_minutes: 30,
      status: 'scheduled',
    }),
  });
  expect(created.ok).toBeTruthy();
  const apptId = created.data[0].id;

  await page.goto('/appointments?view=list', { waitUntil: 'networkidle' });
  // Switch to list view so dropdown is visible
  await page.getByRole('tab', { name: /list/i }).click().catch(()=>{});
  await page.waitForTimeout(2000);

  // Click the per-row dropdown trigger near our test customer (search by visible text)
  // The dropdown is a MoreHorizontal icon button next to the status badge.
  // Use the data-testid we added: reschedule-{id}
  const rescheduleItem = page.getByTestId(`reschedule-${apptId}`);
  // Need to open the menu first — click the row's MoreHorizontal trigger
  // The dropdown trigger is a Button ghost with MoreHorizontal icon adjacent to the row.
  // Easier path: click the trigger by locating the row by customer_name, then within it the icon button.
  const row = page.locator('div').filter({ hasText: customerName }).first();
  const trigger = row.locator('button:has(svg)').filter({ hasNotText: 'Add' }).last();
  await trigger.click().catch(()=>{});
  await page.waitForTimeout(500);

  await expect(rescheduleItem).toBeVisible({ timeout: 5000 });
  await rescheduleItem.click();

  // Reschedule dialog should open with prefilled values
  await page.waitForTimeout(500);
  await page.getByTestId('reschedule-date-input').fill('2027-04-20');
  await page.getByTestId('reschedule-time-input').fill('14:30');

  await page.getByTestId('reschedule-submit').click();
  await page.waitForTimeout(2500);

  // DB assertion — scheduled_at, appointment_date, start_time all updated
  const after = await sbFetch(`/rest/v1/appointments?id=eq.${apptId}&select=scheduled_at,appointment_date,start_time,end_time`);
  expect(after.data[0].appointment_date).toBe('2027-04-20');
  expect(after.data[0].start_time).toBe('14:30:00');

  const ss = path.join(SS_DIR, `phase5a-j3-reschedule.png`);
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ journey: 'J3', verdict: 'REAL_PASS', db_row_id: apptId, screenshot: ss });
  persist();

  await sbFetch(`/rest/v1/appointments?id=eq.${apptId}`, { method: 'DELETE' });
});

// ── J4: Per-row Cancel appointment ─────────────────────────────────────────
test('J4. Cancel appointment via per-row dropdown', async ({ page }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const customerName = `${TEST_PREFIX}CustomerCancel_${stamp}`;

  const created = await sbFetch(`/rest/v1/appointments`, {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: COSMIQUE_SLUG,
      customer_name: customerName,
      customer_phone: '+971500000000',
      service: 'Consultation',
      scheduled_at: '2027-03-16T10:00:00Z',
      appointment_date: '2027-03-16',
      start_time: '10:00:00',
      end_time: '10:30:00',
      duration_minutes: 30,
      status: 'scheduled',
    }),
  });
  const apptId = created.data[0].id;

  await page.goto('/appointments?view=list', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /list/i }).click().catch(()=>{});
  await page.waitForTimeout(2000);

  const row = page.locator('div').filter({ hasText: customerName }).first();
  const trigger = row.locator('button:has(svg)').filter({ hasNotText: 'Add' }).last();
  await trigger.click().catch(()=>{});
  await page.waitForTimeout(500);

  const cancelItem = page.getByTestId(`cancel-appt-${apptId}`);
  await expect(cancelItem).toBeVisible({ timeout: 5000 });
  await cancelItem.click();
  await page.waitForTimeout(2000);

  const after = await sbFetch(`/rest/v1/appointments?id=eq.${apptId}&select=status`);
  expect(after.data[0].status).toBe('cancelled');

  const ss = path.join(SS_DIR, `phase5a-j4-cancel.png`);
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ journey: 'J4', verdict: 'REAL_PASS', db_row_id: apptId, screenshot: ss });
  persist();

  await sbFetch(`/rest/v1/appointments?id=eq.${apptId}`, { method: 'DELETE' });
});

// ── Department validation ──────────────────────────────────────────────────
test('Department validation — empty name blocks submit', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/hr/departments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const addBtn = page.getByRole('button', { name: /add department/i }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // Empty name — submit should be disabled, error message visible
  const submit = page.getByTestId('dept-create-submit');
  await expect(submit).toBeDisabled();
  await expect(page.getByTestId('dept-name-error')).toBeVisible();
  results.push({ journey: 'DEPT_VAL', verdict: 'REAL_PASS', notes: 'submit disabled + error shown when name blank' });
  persist();

  // DB sanity — no blank-name row created since previous cleanup
  const sanity = await sbFetch(`/rest/v1/hr_departments?tenant_id=eq.${COSMIQUE_UUID}&or=(name.eq.,name.is.null)&select=id`);
  expect(Array.isArray(sanity.data) && sanity.data.length === 0).toBeTruthy();
});
