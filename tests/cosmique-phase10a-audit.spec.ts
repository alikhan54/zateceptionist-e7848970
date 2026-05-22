import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT = path.join(__dirname, 'phase10a-audit.json');

const ROUTES = [
  '/clinic/treatments',
  '/clinic/patients',
  '/clinic/products',
  '/clinic/consultations',
  '/clinic/health-reports',
  '/appointments',
  '/marketing/campaigns',
  '/marketing/competitors',
  '/marketing/blogs',
  '/marketing/seo',
  '/sales/sequences',
  '/sales/pipeline',
  '/sales/proposals',
  '/hr/employees',
  '/hr/departments',
  '/hr/recruitment',
];

const ADD_BUTTON_REGEX = /^\s*(\+\s*)?(add|new|create|upload|invite)\b/i;

test('Phase 10A audit — Add/Create button presence on 16 routes', async ({ page }) => {
  test.setTimeout(600_000);
  page.setDefaultNavigationTimeout(45_000);
  const results: any[] = [];

  for (const route of ROUTES) {
    const row: any = { route, error: null };
    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(2500); // allow react-query first paint

      // Collect every visible button + its text + testid
      const candidates = await page.locator('button, a[role="button"]').filter({ hasText: ADD_BUTTON_REGEX }).all();
      const found: any[] = [];
      for (const c of candidates) {
        if (!await c.isVisible().catch(() => false)) continue;
        const text = (await c.innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
        const testid = await c.getAttribute('data-testid').catch(() => null);
        const role = await c.getAttribute('role').catch(() => null);
        found.push({ text, testid, role });
      }
      row.add_buttons_visible = found.length;
      row.buttons = found.slice(0, 5);

      // Try clicking the first one to see if a dialog opens
      if (found.length > 0) {
        try {
          await page.locator('button, a[role="button"]').filter({ hasText: ADD_BUTTON_REGEX }).first().click({ timeout: 5000 });
          await page.waitForTimeout(800);
          const dialogVisible = await page.locator('[role="dialog"], [data-testid$="-dialog"]').first().isVisible().catch(() => false);
          row.dialog_opens = dialogVisible;
          // close any dialog so next route is clean
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(300);
        } catch (e: any) {
          row.dialog_opens = false;
          row.click_err = String(e?.message || e).slice(0, 100);
        }
      } else {
        row.dialog_opens = false;
      }

      row.build_needed = found.length === 0;
    } catch (e: any) {
      row.error = String(e?.message || e).slice(0, 200);
      row.build_needed = 'unknown_route_error';
    }
    results.push(row);
    fs.writeFileSync(REPORT, JSON.stringify(results, null, 2));
    console.log(`audited ${route}: buttons=${row.add_buttons_visible ?? 'err'} dialog=${row.dialog_opens ?? 'na'}`);
  }

  console.log('\n=== AUDIT COMPLETE ===');
  console.log(JSON.stringify(results, null, 2));
});
