import { test, Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.COSMIQUE_EMAIL || 'admin@cosmique.zatesystems.com';
const PASSWORD = process.env.COSMIQUE_PASSWORD || '';
if (!PASSWORD) throw new Error('COSMIQUE_PASSWORD env var is required');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase2-results.json');
const STORAGE_PATH = path.join(__dirname, '.auth-state.json');

type NetErr = { url: string; status: number; method: string };
type Result = {
  route: string;
  url_after: string;
  render_status: 'FULL' | 'PARTIAL' | 'STUB' | 'EMPTY' | 'ERROR';
  screenshot: string;
  console_errors: string[];
  network_errors: NetErr[];
  data_indicator_count: number;
  empty_state_visible: boolean;
  body_excerpt: string;
};
const results: Result[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }

// ROUTE LIST (~30) — cosmique-relevant routes that should have data
const ROUTES = [
  '/dashboard',
  '/pulse',
  '/clinic/dashboard',
  '/clinic/treatments',
  '/clinic/patients',
  '/clinic/products',
  '/clinic/consultations',
  '/clinic/health-reports',
  '/clinic/review-queue',
  '/appointments',
  '/customers',
  '/inbox',
  '/leads',
  '/sales/dashboard',
  '/sales/pipeline',
  '/sales/sequences',
  '/sales/deals',
  '/sales/auto-leadgen',
  '/sales/proposals',
  '/sales/analytics',
  '/marketing',
  '/marketing/campaigns',
  '/marketing/competitors',
  '/marketing/blogs',
  '/marketing/seo',
  '/marketing/aeo-dashboard',
  '/marketing/calendar',
  '/marketing/sequences',
  '/marketing/social',
  '/marketing/analytics',
  '/communications',
  '/omega',
  '/settings/integrations',
  '/settings/business-profile',
  '/settings/team',
  '/analytics/autonomous-health',
];

// storageState applied via playwright.config.ts project dependency on `setup`.
test.beforeAll(() => {
  fs.writeFileSync(REPORT_PATH, '[]');
  results.length = 0;
});

for (const route of ROUTES) {
  test(`route: ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: NetErr[] = [];

    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
    });
    page.on('response', async (resp) => {
      const status = resp.status();
      if (status >= 400 && status < 600) {
        networkErrors.push({
          url: resp.url().slice(0, 250),
          status,
          method: resp.request().method(),
        });
      }
    });
    page.on('pageerror', (e) => {
      consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`);
    });

    await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 }).catch(()=>{});

    // dismiss onboarding modal that re-pops on some routes
    const skipBtn = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
    if (await skipBtn.isVisible({ timeout: 800 }).catch(()=>false)) {
      await skipBtn.click().catch(()=>{});
    }
    await page.waitForTimeout(2500);

    const safe = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
    const ss = path.join(SCREENSHOT_DIR, `phase2-${safe}.png`);
    await page.screenshot({ path: ss, fullPage: true }).catch(()=>{});

    const url_after = page.url();
    let body_excerpt = '';
    try { body_excerpt = (await page.locator('main, [role="main"], #root').first().innerText()).slice(0, 1500); } catch {}

    // count data indicators — rows, articles, role=card, treatment cards
    let data_indicator_count = 0;
    for (const sel of ['[role="row"]', 'tr', '[role="article"]', '[data-testid*="card"]', '.shadcn-card', 'article']) {
      try { data_indicator_count += await page.locator(sel).count(); } catch {}
    }

    // empty-state heuristic
    const empty_phrases = ['no patients', 'no campaigns', 'no leads', 'no competitors', 'no products', 'no data', 'add your first', 'get started', 'nothing to show', 'no records', 'empty', 'no posts', 'no audience'];
    const lower = body_excerpt.toLowerCase();
    const empty_state_visible = empty_phrases.some(p => lower.includes(p));

    // classify
    let render_status: Result['render_status'] = 'FULL';
    if (url_after.includes('/404') || /page not found|attempted path/i.test(body_excerpt)) {
      render_status = 'ERROR';
    } else if (url_after.includes('/login')) {
      render_status = 'ERROR'; // auth bounced
    } else if (body_excerpt.length < 50) {
      render_status = 'STUB';
    } else if (empty_state_visible && data_indicator_count < 3) {
      render_status = 'EMPTY';
    } else if (data_indicator_count >= 3) {
      render_status = 'FULL';
    } else {
      render_status = 'PARTIAL';
    }

    const result: Result = {
      route,
      url_after,
      render_status,
      screenshot: ss,
      console_errors: consoleErrors.slice(0, 20),
      network_errors: networkErrors.slice(0, 30),
      data_indicator_count,
      empty_state_visible,
      body_excerpt: body_excerpt.slice(0, 600),
    };
    results.push(result);
    persist();
  });
}
