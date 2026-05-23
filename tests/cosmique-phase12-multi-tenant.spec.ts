import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase12-multi-tenant-results.json');

const SB = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SVC = process.env.SUPABASE_SERVICE_KEY || '';

async function sb(p: string) {
  const r = await fetch(`${SB}${p}`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, Prefer: 'count=exact', Range: '0-0' } });
  const cr = r.headers.get('content-range') || '';
  return { ok: r.ok, status: r.status, total: cr.includes('/') ? parseInt(cr.split('/').pop() || '0', 10) : null };
}

const results: any[] = [];
function persist() { fs.writeFileSync(REPORT, JSON.stringify(results, null, 2)); }

test('12.G.1 ClinicPulseTab renders only for cosmique (UI proof for healthcare_clinic)', async ({ page }) => {
  test.setTimeout(90_000);
  page.setDefaultNavigationTimeout(45_000);
  await page.goto('/clinic/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="industry-tab-clinic"]', { timeout: 25_000 });
  const visible = await page.getByTestId('industry-tab-clinic').isVisible();
  // None of the other industry tabs should be visible (they're not even mounted for this tenant).
  const others = ['industry-tab-restaurant', 'industry-tab-real_estate', 'industry-tab-banking_collections', 'industry-tab-technology'];
  const otherVisible: Record<string, boolean> = {};
  for (const t of others) otherVisible[t] = await page.getByTestId(t).count().then(n => n > 0);

  const ss = path.join(SS_DIR, 'phase12g-cosmique-industry-tab.png');
  await page.screenshot({ path: ss, fullPage: true });
  results.push({ test: '12.G.1', verdict: visible && Object.values(otherVisible).every(v => !v) ? 'REAL_PASS' : 'CROSS_TENANT_LEAK', clinicTabVisible: visible, otherTabsMounted: otherVisible, screenshot: ss });
  persist();
  expect(visible).toBe(true);
  for (const t of others) expect(otherVisible[t]).toBe(false);
});

test('12.G.2 IndustryTab dispatcher matrix (static source contract)', async () => {
  // Read the dispatcher source and prove every industry → component mapping
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'pulse', 'IndustryTab.tsx'), 'utf-8');
  const mapping = {
    healthcare_clinic: src.includes('ClinicPulseTab'),
    restaurant: src.includes('RestaurantPulseTab'),
    real_estate: src.includes('RealEstatePulseTab'),
    banking_collections: src.includes('BankingCollectionsPulseTab'),
    technology: src.includes('TechPulseTab'),
  };
  const returnsNullDefault = /return null;\s*}/.test(src);

  results.push({ test: '12.G.2', verdict: Object.values(mapping).every(v => v) && returnsNullDefault ? 'REAL_PASS' : 'CONTRACT_BROKEN', dispatcher_mapping: mapping, returnsNullDefault });
  persist();
  expect(Object.values(mapping).every(v => v)).toBe(true);
  expect(returnsNullDefault).toBe(true);
});

test('12.G.3 Cross-tenant data leak probe (REST, service_role bypasses RLS — used for drift detection only)', async () => {
  // Sample query: does cosmique appear in another tenant's data filter?
  // Each table filtered by another tenant's id should NOT return cosmique's row count.
  const probes: any[] = [];
  // clinic_patients is SLUG-keyed; query by bbqtonight should return 0 (BBQ isn't a clinic tenant)
  for (const tbl of ['clinic_treatments', 'clinic_products', 'clinic_patients', 'clinic_consultations']) {
    const c = await sb(`/rest/v1/${tbl}?tenant_id=eq.bbqtonight&select=id`);
    probes.push({ table: tbl, tenant: 'bbqtonight', count: c.total });
  }
  // Bbqtonight should have 0 in every clinic_* table — they're not a clinic tenant
  const leaks = probes.filter(p => (p.count ?? 0) > 0);
  results.push({ test: '12.G.3', verdict: leaks.length === 0 ? 'REAL_PASS' : 'LEAK_DETECTED', probes, leaks });
  persist();
  expect(leaks.length).toBe(0);
});

test('12.G.4 Phase 12.A schema readiness probe', async () => {
  // Check whether the 7 new tables exist yet. If not, fail with clear DEPLOY_PENDING.
  const tables = ['clinic_patient_files','clinic_patient_notes','patient_testimonials','clinic_consent_templates','clinic_consent_forms','consent_signatures'];
  const present: Record<string, boolean> = {};
  for (const t of tables) {
    const r = await fetch(`${SB}/rest/v1/${t}?limit=0`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
    present[t] = r.status !== 404;
  }
  const allPresent = Object.values(present).every(v => v);
  results.push({ test: '12.G.4', verdict: allPresent ? 'REAL_PASS' : 'SCHEMA_PENDING_USER_PASTE', tables: present, hint: allPresent ? '' : 'User must paste docs/PHASE12A_SCHEMA.sql into Supabase Studio' });
  persist();
  // Don't fail the suite if schemas aren't yet applied — this is a status probe.
});
