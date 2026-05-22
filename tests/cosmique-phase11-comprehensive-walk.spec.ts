import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SS_DIR = path.join(__dirname, 'screenshots', 'walk');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase11-walk-results.json');

const FATIMA = '178729e2-bc49-45f8-bb89-c0c8962e2594';

const ROUTES = [
  // Dashboard
  '/dashboard',
  // Clinic
  '/clinic/dashboard', '/clinic/patients', `/clinic/patients/${FATIMA}`,
  '/clinic/treatments', '/clinic/products', '/clinic/consultations',
  '/clinic/health-reports', '/clinic/doctors', '/clinic/review-queue',
  // Operations
  '/appointments',
  // Marketing
  '/marketing/campaigns', '/marketing/competitors', '/marketing/blogs',
  '/marketing/seo',
  // Sales
  '/sales/sequences', '/sales/pipeline', '/sales/proposals', '/sales/pricing',
  // HR
  '/hr/employees', '/hr/departments', '/hr/recruitment',
  // Settings
  '/settings/business-profile/company', '/settings/billing',
  '/settings/integrations', '/settings/ai-configs', '/settings/team',
];

const ADD_BTN_RE = /(\+\s*)?(add|create|new|upload|invite|book|schedule)\b/i;

test('Phase 11 D — comprehensive cosmique walk', async ({ page }) => {
  test.setTimeout(900_000);
  page.setDefaultNavigationTimeout(45_000);
  const results: any[] = [];
  fs.writeFileSync(REPORT, '[]');

  for (const route of ROUTES) {
    const row: any = { route, error: null };
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];

    const onConsole = (m: any) => {
      if (m.type() === 'error') {
        const t = m.text();
        // Filter out Lovable-injected dev noise
        if (!/preload|FontAwesome|gtag|Failed to load resource: net::ERR_BLOCKED/i.test(t)) {
          consoleErrors.push(t.slice(0, 220));
        }
      }
    };
    const onResponse = (r: any) => {
      const u = r.url();
      if (/(supabase|webhooks\.zatesystems\.com|host\.docker\.internal)/i.test(u) && r.status() >= 400) {
        networkErrors.push({ url: u.slice(0, 160), status: r.status() });
      }
    };
    page.on('console', onConsole);
    page.on('response', onResponse);

    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(2500); // settle for react-query
      // Take screenshot
      const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'root';
      const ssPath = path.join(SS_DIR, `${slug}.png`);
      await page.screenshot({ path: ssPath, fullPage: false });
      row.screenshot = ssPath;

      // Page content check
      const bodyText = await page.locator('body').innerText().catch(() => '');
      row.pageHasContent = bodyText.length > 200;
      row.bodyTextSample = bodyText.slice(0, 100).replace(/\s+/g, ' ');

      // Error boundary check
      row.hasErrorBoundary = /error.*occurred|something went wrong/i.test(bodyText) && bodyText.length < 1000;

      // Add button presence
      const addBtns = await page.locator('button, a[role="button"]').filter({ hasText: ADD_BTN_RE }).all();
      let addVisible = 0;
      for (const b of addBtns) {
        if (await b.isVisible().catch(() => false)) addVisible++;
      }
      row.hasAddButton = addVisible > 0;
      row.addButtonCount = addVisible;

      // Filter/Search presence
      const search = await page.locator('input[placeholder*="earch" i], input[type="search"], [data-testid*="filter" i]').first().isVisible().catch(() => false);
      row.hasFiltersOrSearch = search;

      // URL check (no redirect to /login)
      row.finalUrl = page.url();
      row.redirectedToLogin = page.url().includes('/login');
    } catch (e: any) {
      row.error = String(e?.message || e).slice(0, 200);
    } finally {
      page.off('console', onConsole);
      page.off('response', onResponse);
      row.consoleErrors = consoleErrors.slice(0, 5);
      row.networkErrors = networkErrors.slice(0, 5);
      row.consoleErrorCount = consoleErrors.length;
      row.networkErrorCount = networkErrors.length;
      results.push(row);
      fs.writeFileSync(REPORT, JSON.stringify(results, null, 2));
      console.log(`walked ${route} | content=${row.pageHasContent ?? 'err'} addBtn=${row.addButtonCount ?? 0} consoleErr=${row.consoleErrorCount ?? 0} netErr=${row.networkErrorCount ?? 0}`);
    }
  }

  console.log('=== WALK COMPLETE ===');
});
