/**
 * HR hidden-features smoke test (2026-05-29).
 *
 * Auth: zate adeel via zate-auth.setup.ts (master_admin → canManage=true).
 * READ-ONLY — navigates and asserts render only; never seeds or mutates data.
 *
 * Verifies the 3 newly-wired hidden HR features render without crashing:
 *   F2 PipelineFunnel    → /hr/recruitment → Pipeline tab → "Recruitment Funnel"
 *   F1 LeaveTypesTab     → /hr/leave → Leave Types tab → card renders
 *   F3 PublicHolidaysTab → /hr/leave → Holidays tab → card renders
 *
 * F1/F3 read hr_leave_types / hr_public_holidays, which currently have RLS
 * enabled + 0 browser policies (deny-all). An EMPTY-STATE render is therefore
 * the expected, honest outcome for those two — not a failure. The pass bar is
 * "the admin tab + its card render without crashing".
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', 'hr-hidden-features');
const RESULTS_PATH = path.join(__dirname, 'hr-hidden-features-results.json');

type Verdict = 'PASS' | 'FAIL' | 'PARTIAL';
interface Result {
  id: string;
  name: string;
  verdict: Verdict;
  evidence: Record<string, unknown>;
  notes: string[];
  screenshot?: string;
  error?: string;
}
const results: Result[] = [];
const consoleErrors: string[] = [];

test.describe.configure({ mode: 'serial' });
test.use({ trace: 'off' });
test.beforeAll(() => fs.mkdirSync(SHOT_DIR, { recursive: true }));
test.afterAll(() =>
  fs.writeFileSync(
    RESULTS_PATH,
    JSON.stringify(
      {
        total: results.length,
        pass: results.filter((r) => r.verdict === 'PASS').length,
        partial: results.filter((r) => r.verdict === 'PARTIAL').length,
        fail: results.filter((r) => r.verdict === 'FAIL').length,
        console_errors_sample: consoleErrors.slice(0, 20),
        results,
      },
      null,
      2,
    ),
  ),
);

async function goto(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page
    .evaluate(() => {
      try {
        ['tutorial-dismissed', 'onboarding-completed', 'welcome-shown', 'hr-tour-completed', 'product-tour-completed'].forEach(
          (k) => localStorage.setItem(k, 'true'),
        );
      } catch {
        /* noop */
      }
    })
    .catch(() => {});
}

async function shot(page: Page, slug: string) {
  const p = path.join(SHOT_DIR, `${slug}.png`);
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return path.relative(__dirname, p);
}

async function hasCrashed(page: Page): Promise<boolean> {
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  return /Something went wrong|Application error|This page crashed|Unexpected Application Error/i.test(body);
}

test.beforeEach(({ page }) => {
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e?.message).slice(0, 300)));
});

// F2 — PipelineFunnel (works live: hr_pipeline_summary is a security_invoker view)
test('F2 Recruitment Funnel renders on Pipeline tab', async ({ page }) => {
  test.setTimeout(90_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  try {
    await goto(page, '/hr/recruitment');
    expect(await hasCrashed(page), 'recruitment crashed on load').toBe(false);

    await page.locator('[role="tab"]:has-text("Pipeline")').first().click({ timeout: 8000 });
    await page.waitForTimeout(2500);

    const funnelVisible = await page
      .getByText('Recruitment Funnel')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    notes.push(`funnel_title_visible=${funnelVisible}`);

    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const totalMatch = bodyText.match(/(\d+)\s+total/i);
    const totalCount = totalMatch ? Number(totalMatch[1]) : null;
    const stageSeen = /(Applied|Screening|Phone Screen|Interview|Assessment|Offer|Hired|Reference Check)/i.test(bodyText);
    const emptyState = /No pipeline data yet/i.test(bodyText);
    notes.push(`total=${totalCount} stage_label_seen=${stageSeen} empty_state=${emptyState}`);

    screenshot = await shot(page, 'f2_pipeline_funnel');
    expect(await hasCrashed(page), 'recruitment crashed after Pipeline click').toBe(false);

    results.push({
      id: 'F2',
      name: 'PipelineFunnel renders',
      verdict: funnelVisible ? 'PASS' : 'FAIL',
      evidence: { funnel_visible: funnelVisible, total: totalCount, stage_label_seen: stageSeen, empty_state: emptyState },
      notes,
      screenshot,
    });
    expect(funnelVisible, 'Recruitment Funnel title not visible').toBe(true);
  } catch (e: unknown) {
    if (!results.find((r) => r.id === 'F2'))
      results.push({ id: 'F2', name: 'PipelineFunnel renders', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String((e as Error)?.message).slice(0, 400) });
    throw e;
  }
});

// F1 — LeaveTypesTab (admin-gated; RLS-gated reads → empty state is EXPECTED)
test('F1 Leave Types tab renders (admin)', async ({ page }) => {
  test.setTimeout(90_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  try {
    await goto(page, '/hr/leave');
    expect(await hasCrashed(page), 'leave crashed on load').toBe(false);

    const tab = page.locator('[role="tab"]:has-text("Leave Types")').first();
    const tabVisible = await tab.isVisible({ timeout: 8000 }).catch(() => false);
    notes.push(`leave_types_tab_visible=${tabVisible}`);
    expect(tabVisible, 'Leave Types tab not visible for admin').toBe(true);
    await tab.click({ timeout: 8000 });
    await page.waitForTimeout(2000);

    const cardVisible = await page
      .getByText('Configure the leave categories employees can request')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const emptyState = /No leave types configured/i.test(bodyText);
    const addBtn = await page
      .locator('button:has-text("Add Leave Type")')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    notes.push(`card_visible=${cardVisible} empty_state=${emptyState} add_btn=${addBtn}`);

    screenshot = await shot(page, 'f1_leave_types');
    expect(await hasCrashed(page), 'leave crashed after Leave Types click').toBe(false);

    results.push({
      id: 'F1',
      name: 'LeaveTypesTab renders',
      verdict: cardVisible ? 'PASS' : 'FAIL',
      evidence: { tab_visible: tabVisible, card_visible: cardVisible, empty_state_rls_gated: emptyState, add_btn: addBtn },
      notes: [...notes, 'F1 reads are RLS-gated (0 browser policies) — empty state is the expected honest outcome'],
      screenshot,
    });
    expect(cardVisible, 'Leave Types card not rendered').toBe(true);
  } catch (e: unknown) {
    if (!results.find((r) => r.id === 'F1'))
      results.push({ id: 'F1', name: 'LeaveTypesTab renders', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String((e as Error)?.message).slice(0, 400) });
    throw e;
  }
});

// F3 — PublicHolidaysTab (admin-gated; RLS-gated reads → empty state is EXPECTED)
test('F3 Holidays tab renders (admin)', async ({ page }) => {
  test.setTimeout(90_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  try {
    await goto(page, '/hr/leave');
    expect(await hasCrashed(page), 'leave crashed on load').toBe(false);

    const tab = page.locator('[role="tab"]:has-text("Holidays")').first();
    const tabVisible = await tab.isVisible({ timeout: 8000 }).catch(() => false);
    notes.push(`holidays_tab_visible=${tabVisible}`);
    expect(tabVisible, 'Holidays tab not visible for admin').toBe(true);
    await tab.click({ timeout: 8000 });
    await page.waitForTimeout(2000);

    const cardVisible = await page
      .getByText('Company-wide holidays that count against the working calendar')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const emptyState = /No public holidays configured/i.test(bodyText);
    const addBtn = await page
      .locator('button:has-text("Add Holiday")')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    notes.push(`card_visible=${cardVisible} empty_state=${emptyState} add_btn=${addBtn}`);

    screenshot = await shot(page, 'f3_public_holidays');
    expect(await hasCrashed(page), 'leave crashed after Holidays click').toBe(false);

    results.push({
      id: 'F3',
      name: 'PublicHolidaysTab renders',
      verdict: cardVisible ? 'PASS' : 'FAIL',
      evidence: { tab_visible: tabVisible, card_visible: cardVisible, empty_state_rls_gated: emptyState, add_btn: addBtn },
      notes: [...notes, 'F3 reads are RLS-gated (0 browser policies) — empty state is the expected honest outcome'],
      screenshot,
    });
    expect(cardVisible, 'Public Holidays card not rendered').toBe(true);
  } catch (e: unknown) {
    if (!results.find((r) => r.id === 'F3'))
      results.push({ id: 'F3', name: 'PublicHolidaysTab renders', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String((e as Error)?.message).slice(0, 400) });
    throw e;
  }
});
