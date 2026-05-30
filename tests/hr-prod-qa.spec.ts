import { test, expect, Page } from '@playwright/test';

// Warrior-mode production QA. Hits LIVE https://ai.zatesystems.com.
// Logs in fresh (proven flow copied from auth.setup.ts). Creates QA_* probe
// rows then deletes them; a DB sweep (STEP 4) removes any leftovers.

const PROD = 'https://ai.zatesystems.com';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';

function trackConsole(page: Page, bag: string[]) {
  page.on('console', m => { if (m.type() === 'error') bag.push(m.text()); });
  page.on('pageerror', e => bag.push(`PAGEERROR: ${e.message}`));
  page.on('requestfailed', r => bag.push(`REQFAIL: ${r.url()} ${r.failure()?.errorText}`));
}

async function login(page: Page) {
  await page.goto(`${PROD}/login`, { waitUntil: 'networkidle' });
  // already authed? (storage reused) -> bail early
  if (!page.url().includes('/login')) return;
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  const skip = page.getByRole('button', { name: /skip tutorial|skip|got it|close/i }).first();
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click().catch(() => {});
}

const SHOT = (n: string) => `tests/screenshots/prod/${n}.png`;

test('PROD-01: HR Dashboard', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('01_dashboard'), fullPage: true });
  const widget = await page.locator('text=/Working Now|Currently Working/i').count();
  console.log(`[01] WhoIsWorkingNow: ${widget > 0 ? 'PRESENT' : 'MISSING'}`);
  console.log(`[01] buttons=${await page.locator('button:visible').count()} links=${await page.locator('a:visible').count()}`);
  console.log(`[01] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 10))}`);
});

test('PROD-02: /hr/leave Leave Types CRUD', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/leave`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('02a_leave_landing'), fullPage: true });
  console.log(`[02] Leave Types card: ${await page.locator('text=/Leave Types/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  const bodyText = (await page.locator('body').textContent()) || '';
  console.log(`[02] mentions days/year: ${/days\/?\s*year|days per year/i.test(bodyText)}`);
  const addBtn = page.locator('button:has-text("New Leave Type"), button:has-text("Add Leave Type")').first();
  if (await addBtn.count() > 0) {
    await addBtn.click(); await page.waitForTimeout(1200);
    await page.screenshot({ path: SHOT('02b_leave_dialog'), fullPage: true });
    const name = `QA_LEAVE_${Date.now()}`;
    await page.locator('input[placeholder*="Annual" i], input[placeholder*="name" i], input#name').first().fill(name).catch(() => {});
    await page.locator('button:has-text("Save"), button:has-text("Create")').first().click().catch(() => {});
    await page.waitForTimeout(3000);
    const created = await page.locator(`text=${name}`).count();
    console.log(`[02] CREATE "${name}": ${created > 0 ? 'SUCCESS' : 'FAILED'}`);
    await page.screenshot({ path: SHOT('02c_leave_after_create'), fullPage: true });
    if (created > 0) {
      page.on('dialog', d => d.accept());
      await page.locator(`text=${name}`).locator('xpath=ancestor::*[contains(@class,"border")][1]').locator('button:has(svg.lucide-trash-2)').first().click().catch(() => console.log('[02] del btn not found'));
      await page.waitForTimeout(2500);
      console.log(`[02] DELETE cleanup: ${await page.locator(`text=${name}`).count() === 0 ? 'SUCCESS' : 'LEFTOVER'}`);
    }
  } else console.log('[02] No "New Leave Type" button (gating or missing UI)');
  console.log(`[02] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-03: /hr/leave Public Holidays CRUD', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/leave`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  console.log(`[03] Public Holidays card: ${await page.locator('text=/Public Holidays/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  const addBtn = page.locator('button:has-text("Add Holiday")').first();
  if (await addBtn.count() > 0) {
    await addBtn.click(); await page.waitForTimeout(1200);
    const name = `QA_HOLIDAY_${Date.now()}`;
    await page.locator('input[placeholder*="Eid" i], input[placeholder*="name" i], input#name').first().fill(name).catch(() => {});
    await page.locator('input[type=date]').first().fill('2026-12-25').catch(() => {});
    await page.locator('button:has-text("Save"), button:has-text("Create")').first().click().catch(() => {});
    await page.waitForTimeout(3000);
    const created = await page.locator(`text=${name}`).count();
    console.log(`[03] CREATE holiday: ${created > 0 ? 'SUCCESS' : 'FAILED'}`);
    await page.screenshot({ path: SHOT('03_holidays'), fullPage: true });
    if (created > 0) {
      page.on('dialog', d => d.accept());
      await page.locator(`text=${name}`).locator('xpath=ancestor::*[contains(@class,"border")][1]').locator('button:has(svg.lucide-trash-2)').first().click().catch(() => {});
      await page.waitForTimeout(2500);
      console.log(`[03] DELETE cleanup: ${await page.locator(`text=${name}`).count() === 0 ? 'SUCCESS' : 'LEFTOVER'}`);
    }
  } else console.log('[03] No "Add Holiday" button');
  console.log(`[03] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-04: /hr/recruitment funnel + tabs + post job', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/recruitment`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('04a_recruitment'), fullPage: true });
  console.log(`[04] Pipeline funnel: ${await page.locator('text=/Recruitment Pipeline|Pipeline/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  const bodyText = (await page.locator('body').textContent()) || '';
  console.log(`[04] shows candidate count: ${/\d+\s*candidate/i.test(bodyText)}`);
  const tabs = page.locator('button[role=tab]');
  const tc = await tabs.count();
  console.log(`[04] tabs=${tc}`);
  for (let i = 0; i < tc; i++) {
    const label = (await tabs.nth(i).textContent())?.trim();
    await tabs.nth(i).click().catch(() => {}); await page.waitForTimeout(1200);
    console.log(`[04]   tab "${label}"`);
    await page.screenshot({ path: SHOT(`04_tab_${i}`), fullPage: true });
  }
  const postBtn = page.locator('button:has-text("Post Job"), button:has-text("New Job"), button:has-text("Add Job")').first();
  if (await postBtn.count() > 0) {
    await postBtn.click(); await page.waitForTimeout(1500);
    await page.screenshot({ path: SHOT('04b_postjob_dialog'), fullPage: true });
    console.log(`[04] Interview Questions section: ${await page.locator('text=/Interview Question/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
    console.log(`[04] AI Generate button: ${await page.locator('button:has-text("AI Generate"), button:has-text("Generate")').count() > 0 ? 'PRESENT' : 'MISSING'}`);
    await page.keyboard.press('Escape');
  } else console.log('[04] No Post Job button');
  console.log(`[04] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-05: /hr/shifts templates + assignments', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/shifts`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('05a_shifts'), fullPage: true });
  console.log(`[05] 404: ${await page.locator('text=/404|not found|does.*exist/i').count() > 0 ? 'YES' : 'NO'}`);
  console.log(`[05] tabs=${await page.locator('button[role=tab]').count()}`);
  const tmplTab = page.locator('button[role=tab]:has-text("Type"), button[role=tab]:has-text("Template"), button[role=tab]:has-text("Definition")').first();
  if (await tmplTab.count() > 0) { await tmplTab.click(); await page.waitForTimeout(1500); }
  console.log(`[05] Shift Types/Templates card: ${await page.locator('text=/Shift Type|Shift Template/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  const newShift = page.locator('button:has-text("New Shift"), button:has-text("Add Shift"), button:has-text("Add Shift Type")').first();
  if (await newShift.count() > 0) {
    await newShift.click(); await page.waitForTimeout(1200);
    await page.screenshot({ path: SHOT('05b_shift_dialog'), fullPage: true });
    const name = `QA_SHIFT_${Date.now()}`;
    await page.locator('input[placeholder*="Morning" i], input[placeholder*="name" i], input#name').first().fill(name).catch(() => {});
    await page.locator('button:has-text("Save"), button:has-text("Create")').first().click().catch(() => {});
    await page.waitForTimeout(3000);
    const created = await page.locator(`text=${name}`).count();
    console.log(`[05] CREATE shift: ${created > 0 ? 'SUCCESS' : 'FAILED'}`);
    await page.screenshot({ path: SHOT('05c_shift_created'), fullPage: true });
    if (created > 0) {
      page.on('dialog', d => d.accept());
      await page.locator(`text=${name}`).locator('xpath=ancestor::*[contains(@class,"border")][1]').locator('button:has(svg.lucide-trash-2)').first().click().catch(() => {});
      await page.waitForTimeout(2500);
      console.log(`[05] DELETE cleanup: ${await page.locator(`text=${name}`).count() === 0 ? 'SUCCESS' : 'LEFTOVER'}`);
    }
  } else console.log('[05] No New Shift button');
  const assignTab = page.locator('button[role=tab]:has-text("Assignment")').first();
  if (await assignTab.count() > 0) {
    await assignTab.click(); await page.waitForTimeout(2000);
    await page.screenshot({ path: SHOT('05e_assignments'), fullPage: true });
    console.log(`[05] Assignments card: ${await page.locator('text=/Assignment/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  }
  console.log(`[05] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-06: /hr/notifications admin feed', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/notifications`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('06_notifications'), fullPage: true });
  console.log(`[06] 404: ${await page.locator('text=/404|not found/i').count() > 0 ? 'YES' : 'NO'}`);
  console.log(`[06] Notifications card: ${await page.locator('text=/Notification/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  console.log(`[06] empty/caught-up state: ${await page.locator('text=/caught up|no notification|all caught/i').count() > 0 ? 'YES' : 'NO'}`);
  console.log(`[06] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-07: /my self-service tabs', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  for (const tab of ['profile', 'attendance', 'leaves', 'payslips', 'training', 'documents', 'reviews', 'notifications']) {
    await page.goto(`${PROD}/my/${tab}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1800);
    const is404 = await page.locator('text=/404|not found/i').count();
    const notLinked = await page.locator('text=/not.*linked|no.*employee.*record/i').count();
    console.log(`[07] /my/${tab}: ${is404 > 0 ? '404' : notLinked > 0 ? 'NOT-LINKED' : 'RENDERS'}`);
    await page.screenshot({ path: SHOT(`07_my_${tab}`), fullPage: true });
  }
  console.log(`[07] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-08: /hr/documents', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/documents`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('08_documents'), fullPage: true });
  console.log(`[08] 404: ${await page.locator('text=/404/i').count() > 0 ? 'YES' : 'NO'}`);
  console.log(`[08] Documents heading: ${await page.locator('text=/Document/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
  console.log(`[08] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-09: /hr/attendance settings/rules', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/attendance`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SHOT('09a_attendance'), fullPage: true });
  const tabs = page.locator('button[role=tab]');
  const n = await tabs.count();
  console.log(`[09] tabs=${n}`);
  for (let i = 0; i < n; i++) {
    const label = (await tabs.nth(i).textContent())?.trim();
    await tabs.nth(i).click().catch(() => {}); await page.waitForTimeout(1000);
    if (/setting|rule/i.test(label || '')) {
      console.log(`[09] Rules card on "${label}": ${await page.locator('text=/Auto Punch|Attendance Rule/i').count() > 0 ? 'PRESENT' : 'MISSING'}`);
      await page.screenshot({ path: SHOT('09b_attendance_rules'), fullPage: true });
    }
  }
  console.log(`[09] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});

test('PROD-10: sidebar HR nav — dead links', async ({ page }) => {
  const errs: string[] = []; trackConsole(page, errs);
  await login(page);
  await page.goto(`${PROD}/hr/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('text=/^HR$|Human Resource/i').first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const links = await page.locator('a[href^="/hr"], a[href^="/my"]').all();
  const hrefs = new Set<string>();
  for (const l of links) { const h = await l.getAttribute('href'); if (h) hrefs.add(h); }
  console.log(`[10] unique HR/my nav routes (${hrefs.size}): ${JSON.stringify([...hrefs])}`);
  const dead: string[] = [];
  for (const href of hrefs) {
    await page.goto(`${PROD}${href}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(1200);
    if (await page.locator('text=/404|page does.*exist/i').count() > 0) dead.push(href);
  }
  console.log(`[10] DEAD LINKS: ${dead.length === 0 ? 'NONE' : JSON.stringify(dead)}`);
  console.log(`[10] CONSOLE ERRORS (${errs.length}): ${JSON.stringify(errs.slice(0, 8))}`);
});
