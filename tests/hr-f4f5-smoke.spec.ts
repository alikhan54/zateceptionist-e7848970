/**
 * HR hidden-features F4/F5 smoke test (2026-05-29).
 *
 * Auth: zate adeel via zate-auth.setup.ts (master_admin → canManage=true).
 * READ-ONLY — navigates and asserts render only; never seeds or mutates data.
 *
 * Verifies the 2 newly-wired hidden HR features render without crashing:
 *   F4 NotificationsFeed  → /hr/notifications (admin scope="all") → card renders
 *   F5a ShiftDefinitionsTab → /hr/shifts → "Shift Types" tab → card renders
 *   F5b ShiftAssignmentsTab → /hr/shifts → "Assignments" tab → card renders
 *
 * RLS gate (deny-all / cross-tenant) means an EMPTY-STATE render is the
 * expected, honest outcome for all three — not a failure. The pass bar is
 * "the admin surface + its card render without crashing".
 *
 *   hr_notifications     RLS on + 0 browser policies → deny-all (empty)
 *   hr_shifts            RLS on + 0 browser policies → deny-all (empty)
 *   hr_employee_shifts   RLS on + 1 permissive "Allow authenticated" (USING true)
 *                        → latent cross-tenant leak; queries here are still
 *                        explicitly tenant-scoped. See docs/.hr-rls-activation.sql.
 *
 * NOTE on F4: the per-user "Alerts" tab lives at /my (MyHR), but /my requires
 * the logged-in user to have an hr_employees row. The zate test account
 * (adeel, master_admin) is NOT an employee, so /my shows the "not linked"
 * card and the Alerts tab is unreachable for this account. We therefore
 * exercise F4 via the admin /hr/notifications surface (scope="all"), which
 * admins/managers can open regardless of employee linkage.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', 'hr-f4f5');
const RESULTS_PATH = path.join(__dirname, 'hr-f4f5-results.json');

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

// F4 — NotificationsFeed (admin org-wide view; RLS-gated reads → empty state EXPECTED)
test('F4 Notifications feed renders (admin /hr/notifications)', async ({ page }) => {
  test.setTimeout(90_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  try {
    await goto(page, '/hr/notifications');
    expect(await hasCrashed(page), 'hr/notifications crashed on load').toBe(false);

    // scope="all" CardDescription is unique to this admin surface
    const cardVisible = await page
      .getByText('All HR notifications across your organization')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const emptyState = /You're all caught up|No notifications to show/i.test(bodyText);
    notes.push(`card_visible=${cardVisible} empty_state=${emptyState}`);

    screenshot = await shot(page, 'f4_notifications');
    expect(await hasCrashed(page), 'hr/notifications crashed after render').toBe(false);

    results.push({
      id: 'F4',
      name: 'NotificationsFeed renders',
      verdict: cardVisible ? 'PASS' : 'FAIL',
      evidence: { card_visible: cardVisible, empty_state_rls_gated: emptyState },
      notes: [...notes, 'F4 reads are RLS-gated (0 browser policies) — empty state is the expected honest outcome'],
      screenshot,
    });
    expect(cardVisible, 'NotificationsFeed card not rendered').toBe(true);
  } catch (e: unknown) {
    if (!results.find((r) => r.id === 'F4'))
      results.push({ id: 'F4', name: 'NotificationsFeed renders', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String((e as Error)?.message).slice(0, 400) });
    throw e;
  }
});

// F5a — ShiftDefinitionsTab (hr_shifts; RLS-gated reads → empty state EXPECTED)
test('F5a Shift Types tab renders (/hr/shifts)', async ({ page }) => {
  test.setTimeout(90_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  try {
    await goto(page, '/hr/shifts');
    expect(await hasCrashed(page), 'shifts crashed on load').toBe(false);

    const tab = page.locator('[role="tab"]:has-text("Shift Types")').first();
    const tabVisible = await tab.isVisible({ timeout: 8000 }).catch(() => false);
    notes.push(`shift_types_tab_visible=${tabVisible}`);
    expect(tabVisible, 'Shift Types tab not visible').toBe(true);
    await tab.click({ timeout: 8000 });
    await page.waitForTimeout(2000);

    const cardVisible = await page
      .getByText('Define the shift templates employees can be assigned to')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const emptyState = /No shift types configured/i.test(bodyText);
    const addBtn = await page
      .locator('button:has-text("Add Shift Type")')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    notes.push(`card_visible=${cardVisible} empty_state=${emptyState} add_btn=${addBtn}`);

    screenshot = await shot(page, 'f5a_shift_types');
    expect(await hasCrashed(page), 'shifts crashed after Shift Types click').toBe(false);

    results.push({
      id: 'F5a',
      name: 'ShiftDefinitionsTab renders',
      verdict: cardVisible ? 'PASS' : 'FAIL',
      evidence: { tab_visible: tabVisible, card_visible: cardVisible, empty_state_rls_gated: emptyState, add_btn: addBtn },
      notes: [...notes, 'F5a reads are RLS-gated (0 browser policies) — empty state is the expected honest outcome'],
      screenshot,
    });
    expect(cardVisible, 'Shift Types card not rendered').toBe(true);
  } catch (e: unknown) {
    if (!results.find((r) => r.id === 'F5a'))
      results.push({ id: 'F5a', name: 'ShiftDefinitionsTab renders', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String((e as Error)?.message).slice(0, 400) });
    throw e;
  }
});

// F5b — ShiftAssignmentsTab (hr_employee_shifts; cross-tenant-leak policy → tenant-scoped query)
test('F5b Assignments tab renders (/hr/shifts)', async ({ page }) => {
  test.setTimeout(90_000);
  const notes: string[] = [];
  let screenshot: string | undefined;
  try {
    await goto(page, '/hr/shifts');
    expect(await hasCrashed(page), 'shifts crashed on load').toBe(false);

    const tab = page.locator('[role="tab"]:has-text("Assignments")').first();
    const tabVisible = await tab.isVisible({ timeout: 8000 }).catch(() => false);
    notes.push(`assignments_tab_visible=${tabVisible}`);
    expect(tabVisible, 'Assignments tab not visible').toBe(true);
    await tab.click({ timeout: 8000 });
    await page.waitForTimeout(2000);

    const cardVisible = await page
      .getByText('Assign employees to a recurring shift on specific weekdays')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const emptyState = /No shift assignments configured/i.test(bodyText);
    const addBtn = await page
      .locator('button:has-text("Assign Shift")')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    notes.push(`card_visible=${cardVisible} empty_state=${emptyState} add_btn=${addBtn}`);

    screenshot = await shot(page, 'f5b_assignments');
    expect(await hasCrashed(page), 'shifts crashed after Assignments click').toBe(false);

    results.push({
      id: 'F5b',
      name: 'ShiftAssignmentsTab renders',
      verdict: cardVisible ? 'PASS' : 'FAIL',
      evidence: { tab_visible: tabVisible, card_visible: cardVisible, empty_state: emptyState, add_btn: addBtn },
      notes: [...notes, 'F5b: hr_employee_shifts has an allow-all policy (cross-tenant leak); query is tenant-scoped. See activation SQL.'],
      screenshot,
    });
    expect(cardVisible, 'Shift Assignments card not rendered').toBe(true);
  } catch (e: unknown) {
    if (!results.find((r) => r.id === 'F5b'))
      results.push({ id: 'F5b', name: 'ShiftAssignmentsTab renders', verdict: 'FAIL', evidence: {}, notes, screenshot, error: String((e as Error)?.message).slice(0, 400) });
    throw e;
  }
});
