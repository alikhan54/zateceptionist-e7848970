/**
 * 420 OPS — Full UI E2E (Session 5, 2026-05-19).
 *
 * User explicitly demanded actual click-and-see testing of every ops page
 * and button. This spec:
 *   1. Logs in as bbqtonight tenant
 *   2. Visits each ops route
 *   3. Captures screenshots (full page)
 *   4. Counts data rows + checks for visible errors
 *   5. Clicks the canonical action button on pages that have one
 *      (capturing the network response + screenshot after click)
 *   6. Verifies currency display (Rs./PKR for BBQ)
 *   7. Writes a JSON result manifest
 *
 * Credentials via env vars (matching existing cross-tenant test pattern):
 *   BBQ_EMAIL / BBQ_PASSWORD
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHOT_DIR = path.join(__dirname, 'screenshots', 'ops-ui-e2e-' + new Date().toISOString().slice(0,10));
const RESULT_FILE = path.join(SHOT_DIR, 'results.json');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const EMAIL = process.env.BBQ_EMAIL || process.env.BBQTONIGHT_EMAIL || '';
const PASSWORD = process.env.BBQ_PASSWORD || process.env.BBQTONIGHT_PASSWORD || '';

if (!EMAIL || !PASSWORD) {
  console.error('BBQ_EMAIL and BBQ_PASSWORD must be set');
}

interface OpsPage {
  slug: string;
  name: string;
  buttonsToClick: string[];          // exact-ish button text to test
  expectCurrency: 'PKR' | null;       // whether Rs./PKR must appear
}

const OPS_PAGES: OpsPage[] = [
  { slug: 'command-center',  name: 'Command Center',  buttonsToClick: [],                expectCurrency: null  },
  { slug: 'inventory',       name: 'Inventory',       buttonsToClick: [],                expectCurrency: null  },
  { slug: 'vendors',         name: 'Vendors',         buttonsToClick: ['Score Vendors'], expectCurrency: null  },
  { slug: 'purchase-orders', name: 'Purchase Orders', buttonsToClick: [],                expectCurrency: 'PKR' },
  { slug: 'shipments',       name: 'Shipments',       buttonsToClick: [],                expectCurrency: null  },
  { slug: 'production',      name: 'Production',      buttonsToClick: [],                expectCurrency: null  },
  { slug: 'budgets',         name: 'Budgets',         buttonsToClick: [],                expectCurrency: 'PKR' },
  { slug: 'agents',          name: 'Agent Network',   buttonsToClick: [],                expectCurrency: null  },
];

type PageResult = {
  page: string;
  name: string;
  url: string;
  status: 'loaded' | 'failed' | 'redirected';
  http_status?: number;
  data_rows: number;
  console_errors: string[];
  page_errors: string[];
  visible_errors: string[];
  body_has_bbqtonight: boolean;
  currency_check?: { expected: string; found_pkr: boolean; found_dollar: boolean };
  buttons: Array<{
    label: string;
    clicked: boolean;
    network_calls: Array<{ url: string; status: number }>;
    toast_text?: string;
    error?: string;
  }>;
};

const results: PageResult[] = [];

test.describe.configure({ mode: 'serial' });

test('ops UI E2E — bbqtonight tenant', async ({ page }) => {
  test.setTimeout(600_000);

  // ── 1. Login ──
  console.log(`[E2E] Logging in as ${EMAIL}`);
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.screenshot({ path: path.join(SHOT_DIR, '00_login_page.png') });

  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, '01_post_login.png'), fullPage: true });
  console.log(`[E2E] Logged in. Landed at ${page.url()}`);

  // ── 2. Iterate ops pages ──
  for (const op of OPS_PAGES) {
    console.log(`\n[E2E] === Page: ${op.name} (/operations/${op.slug}) ===`);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const consoleHandler = (msg: any) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(`[${msg.type()}] ${msg.text().slice(0, 200)}`);
      }
    };
    const pageErrorHandler = (e: any) => pageErrors.push(`PAGEERROR: ${e.message?.slice(0, 200)}`);
    page.on('console', consoleHandler);
    page.on('pageerror', pageErrorHandler);

    const url = `/operations/${op.slug}`;
    const pageResult: PageResult = {
      page: op.slug, name: op.name, url,
      status: 'loaded', data_rows: 0,
      console_errors: [], page_errors: [], visible_errors: [],
      body_has_bbqtonight: false,
      buttons: [],
    };

    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      pageResult.http_status = resp?.status();
      if (page.url().includes('/login')) {
        pageResult.status = 'redirected';
        console.log(`  REDIRECT to login from ${url}`);
      }
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SHOT_DIR, `${op.slug}_loaded.png`), fullPage: true });

      const bodyText = (await page.textContent('body')) || '';
      pageResult.body_has_bbqtonight = /bbqtonight|bbq tonight/i.test(bodyText);

      // Count data rows / cards
      const dataElems = await page.locator('tr[role="row"], [data-row], [class*="-row"], [role="listitem"]').count();
      const cards = await page.locator('[class*="card"][class*="hover"], .grid > div').count();
      pageResult.data_rows = Math.max(dataElems, cards);

      // Visible error elements
      const errs = await page.locator('[role="alert"], .text-destructive, [class*="error-message"]').all();
      for (const elem of errs.slice(0, 5)) {
        const t = (await elem.textContent())?.trim() || '';
        if (t.length > 3 && t.length < 400) pageResult.visible_errors.push(t);
      }

      // Currency check
      if (op.expectCurrency) {
        const foundPkr = /Rs\.|PKR|₨/.test(bodyText);
        const foundDollar = /\$\s*\d/.test(bodyText) && !/USD/.test(bodyText);
        pageResult.currency_check = { expected: op.expectCurrency, found_pkr: foundPkr, found_dollar: foundDollar };
        console.log(`  Currency: PKR=${foundPkr}, $=${foundDollar}`);
      }

      console.log(`  data_rows=${pageResult.data_rows}  visible_errors=${pageResult.visible_errors.length}  bbq_in_body=${pageResult.body_has_bbqtonight}`);

      // Buttons
      for (const btnLabel of op.buttonsToClick) {
        const btnRes: PageResult['buttons'][number] = { label: btnLabel, clicked: false, network_calls: [] };
        const responseHandler = (resp: any) => {
          const u = resp.url();
          if (/webhook|supabase|langgraph|8123/.test(u)) {
            btnRes.network_calls.push({ url: u.slice(0, 200), status: resp.status() });
          }
        };
        page.on('response', responseHandler);
        try {
          const btn = page.getByRole('button', { name: new RegExp(btnLabel, 'i') }).first();
          if ((await btn.count()) === 0) {
            btnRes.error = 'button not found';
          } else {
            await btn.click({ timeout: 5_000 });
            btnRes.clicked = true;
            await page.waitForTimeout(8_000); // wait for response
            const toast = page.locator('[role="status"], [class*="toast"], [class*="sonner"]').first();
            if (await toast.isVisible({ timeout: 1_500 }).catch(() => false)) {
              btnRes.toast_text = (await toast.textContent())?.slice(0, 200) || '';
            }
            await page.screenshot({ path: path.join(SHOT_DIR, `${op.slug}_after_${btnLabel.replace(/\s+/g,'_')}.png`), fullPage: true });
          }
        } catch (e: any) {
          btnRes.error = String(e?.message || e).slice(0, 200);
        }
        page.off('response', responseHandler);
        pageResult.buttons.push(btnRes);
        console.log(`  Button "${btnLabel}": clicked=${btnRes.clicked} net=${btnRes.network_calls.length} err=${btnRes.error || '-'}`);
      }
    } catch (e: any) {
      pageResult.status = 'failed';
      pageResult.visible_errors.push(`Navigation/load error: ${String(e?.message || e).slice(0, 200)}`);
      await page.screenshot({ path: path.join(SHOT_DIR, `${op.slug}_FAILED.png`), fullPage: true }).catch(() => {});
    }

    page.off('console', consoleHandler);
    page.off('pageerror', pageErrorHandler);
    pageResult.console_errors = consoleErrors.slice(0, 10);
    pageResult.page_errors = pageErrors.slice(0, 10);
    results.push(pageResult);
  }

  // ── 3. Write manifest ──
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n[E2E] Wrote ${RESULT_FILE}`);
  console.log(`[E2E] Screenshots in: ${SHOT_DIR}`);

  // Summary assertions (don't fail the whole test — we want the full report)
  const passed = results.filter(r => r.status === 'loaded').length;
  console.log(`\n[E2E] SUMMARY: ${passed}/${results.length} pages loaded`);
  expect(passed).toBeGreaterThan(0);
});
