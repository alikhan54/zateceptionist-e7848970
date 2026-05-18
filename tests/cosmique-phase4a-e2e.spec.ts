import { test, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const REPORT_PATH = path.join(__dirname, 'phase4a-results.json');

type FeatureResult = {
  feature_num: number;
  feature: string;
  route: string;
  url_after: string;
  verdict: 'PASS' | 'NEEDS_POLISH' | 'NEEDS_DATA' | 'BROKEN' | 'N_A' | 'BLOCKED_ON_DEPLOY';
  screenshot: string;
  evidence: string;
  console_errors: number;
  network_errors_4xx: number;
  notes: string;
};
const results: FeatureResult[] = [];
function persist() { fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2)); }

test.beforeAll(() => { fs.writeFileSync(REPORT_PATH, '[]'); results.length = 0; });

async function walk(page: Page, num: number, feature: string, route: string,
  interact: (p: Page) => Promise<{ verdict: FeatureResult['verdict']; evidence: string }>) {
  let consoleErrors = 0;
  let netErrs = 0;
  const errMessages: string[] = [];
  page.on('console', m => { if (m.type() === 'error') { consoleErrors++; if (errMessages.length < 5) errMessages.push(m.text().slice(0, 120)); } });
  page.on('response', r => { if (r.status() >= 400 && r.status() < 600) netErrs++; });

  await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 }).catch(()=>{});
  const skip = page.getByRole('button', { name: /skip tutorial|skip|close/i }).first();
  if (await skip.isVisible({ timeout: 800 }).catch(()=>false)) await skip.click().catch(()=>{});
  await page.waitForTimeout(2200);

  const safe = `phase4a-${num}-${feature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const ss = path.join(SCREENSHOT_DIR, `${safe}.png`);
  await page.screenshot({ path: ss, fullPage: true }).catch(()=>{});

  let res: { verdict: FeatureResult['verdict']; evidence: string };
  try {
    res = await interact(page);
  } catch (e: any) {
    res = { verdict: 'BROKEN', evidence: `interact threw: ${e.message?.slice(0, 200)}` };
  }

  results.push({
    feature_num: num, feature, route,
    url_after: page.url(),
    verdict: res.verdict,
    screenshot: ss,
    evidence: res.evidence,
    console_errors: consoleErrors,
    network_errors_4xx: netErrs,
    notes: errMessages.join(' | ').slice(0, 300),
  });
  persist();
}

// ── Feature 1: EHR/EMR core (3 lists + patient drill-in) ──
test('F1. EHR/EMR core — patients + consultations + treatments', async ({ page }) => {
  await walk(page, 1, 'EHR-EMR-core', '/clinic/patients', async (p) => {
    const txt = await p.locator('body').innerText();
    const names = ['Fatima', 'Omar', 'Rania'].filter(n => txt.includes(n)).length;
    // Try drill-in (PatientProfile from Phase 3 — only works if deployed)
    let drillIn = false;
    const fatima = p.locator('h3:has-text("Fatima")').first();
    if (await fatima.isVisible({ timeout: 1500 }).catch(()=>false)) {
      await fatima.click().catch(()=>{});
      await p.waitForTimeout(2000);
      const url = p.url();
      drillIn = /\/clinic\/patients\/[a-f0-9-]+/i.test(url);
    }
    return { verdict: names === 3 ? (drillIn ? 'PASS' : 'BLOCKED_ON_DEPLOY') : 'NEEDS_DATA',
      evidence: `patient cards: ${names}/3 named, drill-in: ${drillIn}` };
  });
});

// ── Feature 2: Patient registration (Add Patient modal) ──
test('F2. Patient registration — Add Patient modal opens', async ({ page }) => {
  await walk(page, 2, 'Patient-registration', '/clinic/patients', async (p) => {
    const addBtn = p.getByRole('button', { name: /add patient/i }).first();
    if (!await addBtn.isVisible({ timeout: 1500 }).catch(()=>false)) {
      return { verdict: 'BROKEN', evidence: 'Add Patient button not visible' };
    }
    await addBtn.click();
    await p.waitForTimeout(1000);
    const txt = await p.locator('body').innerText();
    const hasForm = /New Patient/i.test(txt) && /Full Name/i.test(txt) && /Phone/i.test(txt);
    return { verdict: hasForm ? 'PASS' : 'NEEDS_POLISH',
      evidence: `modal text contains New Patient + Full Name + Phone: ${hasForm}` };
  });
});

// ── Feature 3: OPD workflow / appointments calendar ──
test('F3. OPD workflow — appointments calendar', async ({ page }) => {
  await walk(page, 3, 'OPD-appointments', '/appointments', async (p) => {
    const txt = await p.locator('body').innerText();
    const hasHeading = /Appointment|Visit|Schedule/i.test(txt);
    const hasViewToggle = /calendar/i.test(txt) && /list/i.test(txt);
    // Look for a date grid (calendar)
    const dates = await p.locator('button[role="gridcell"], [role="gridcell"]').count();
    return { verdict: hasHeading && hasViewToggle && dates > 0 ? 'PASS' : (hasHeading ? 'NEEDS_POLISH' : 'BROKEN'),
      evidence: `heading=${hasHeading} viewToggle=${hasViewToggle} dateCells=${dates}` };
  });
});

// ── Feature 4: Pharmacy / Products ──
test('F4. Pharmacy — products list', async ({ page }) => {
  await walk(page, 4, 'Pharmacy-products', '/clinic/products', async (p) => {
    const txt = await p.locator('body').innerText();
    const products = ['Retinol', 'Vitamin C', 'SPF 50'].filter(s => txt.includes(s)).length;
    const hasStock = /Stock\s*:\s*\d+/i.test(txt);
    return { verdict: products === 3 && hasStock ? 'PASS' : 'NEEDS_DATA',
      evidence: `products visible: ${products}/3, stock visible: ${hasStock}` };
  });
});

// ── Feature 5: Lab integration / HealthReports ──
test('F5. Lab integration — health reports', async ({ page }) => {
  await walk(page, 5, 'Lab-health-reports', '/clinic/health-reports', async (p) => {
    const txt = await p.locator('body').innerText();
    const hasUpload = /upload|add report|patient report/i.test(txt);
    const hasEmpty = /no reports|nothing uploaded|get started/i.test(txt.toLowerCase());
    return { verdict: hasUpload ? (hasEmpty ? 'NEEDS_DATA' : 'PASS') : 'BROKEN',
      evidence: `upload UI: ${hasUpload}, empty state: ${hasEmpty}, body len: ${txt.length}` };
  });
});

// ── Feature 6: Emergency / Escalation ──
test('F6. Emergency module — search for any escalation surface', async ({ page }) => {
  // No known emergency route; try /clinic/review-queue as closest analog (urgent reviews)
  await walk(page, 6, 'Emergency-escalation', '/clinic/review-queue', async (p) => {
    const txt = await p.locator('body').innerText();
    const hasUrgent = /urgent|escalat|priority|critical/i.test(txt);
    const hasQueue = /review|queue|pending/i.test(txt);
    return { verdict: hasQueue ? (hasUrgent ? 'PASS' : 'NEEDS_POLISH') : 'BROKEN',
      evidence: `queue: ${hasQueue}, urgent flag: ${hasUrgent}` };
  });
});

// ── Feature 7: Doctor workflows / VAPI receptionist ──
test('F7. VAPI / Voice AI config', async ({ page }) => {
  await walk(page, 7, 'VAPI-voice-AI', '/settings/voice-ai', async (p) => {
    const txt = await p.locator('body').innerText();
    const hasVapi = /vapi|voice ai|assistant|phone number/i.test(txt);
    const hasCta = /connect|configure|setup|add/i.test(txt);
    return { verdict: hasVapi && hasCta ? 'PASS' : (hasVapi ? 'NEEDS_POLISH' : 'BROKEN'),
      evidence: `vapi mention: ${hasVapi}, has CTA: ${hasCta}` };
  });
});

// ── Feature 8: AI documentation / MEDICA agent surface ──
test('F8. AI documentation — consultations New + generate Report', async ({ page }) => {
  await walk(page, 8, 'AI-documentation-medica', '/clinic/consultations', async (p) => {
    const txt = await p.locator('body').innerText();
    const hasHeading = /Consultation/i.test(txt);
    const hasErrorBoundary = /Something went wrong|ErrorBoundary/i.test(txt);
    const newBtn = p.getByRole('button', { name: /new consultation/i }).first();
    let modalOk = false;
    if (await newBtn.isVisible({ timeout: 1500 }).catch(()=>false)) {
      await newBtn.click();
      await p.waitForTimeout(1500);
      const t2 = await p.locator('body').innerText();
      modalOk = /Chief Complaint|Diagnosis|Treatment Plan/i.test(t2);
    }
    return { verdict: hasHeading && !hasErrorBoundary && modalOk ? 'PASS' : (hasErrorBoundary ? 'BLOCKED_ON_DEPLOY' : 'NEEDS_POLISH'),
      evidence: `heading: ${hasHeading}, errorBoundary: ${hasErrorBoundary}, modalForm: ${modalOk}` };
  });
});

// ── Feature 9: AI prescriptions — read path inside PatientProfile / Consultations ──
test('F9. AI prescriptions — read path on consultations page', async ({ page }) => {
  await walk(page, 9, 'AI-prescriptions', '/clinic/consultations', async (p) => {
    const txt = await p.locator('body').innerText();
    // Consultation list renders prescriptions inside cards (or via Report)
    const hasReport = /Report/i.test(txt);
    const hasPrescriptionMention = /prescription|prescribe|medication/i.test(txt);
    return { verdict: hasReport ? 'PASS' : 'NEEDS_POLISH',
      evidence: `Report btn visible: ${hasReport}, prescription mention: ${hasPrescriptionMention}` };
  });
});

// ── Feature 10: Real-time Pulse cathedral dashboard ──
test('F10. Pulse cathedral — /dashboard renders no zate-bleed', async ({ page }) => {
  await walk(page, 10, 'Pulse-cathedral', '/dashboard', async (p) => {
    const txt = await p.locator('body').innerText();
    const has522 = /\b522\b/.test(txt);
    const has18Appts = /\b18\s+[Aa]ppointments/.test(txt);
    const hasCosmiqueBrand = /COSMIQUE|Cosmique/i.test(txt);
    return { verdict: !has522 && !has18Appts && hasCosmiqueBrand ? 'PASS' : 'NEEDS_POLISH',
      evidence: `522: ${has522}, 18 appts: ${has18Appts}, cosmique branded: ${hasCosmiqueBrand}` };
  });
});

// ── Feature 11: KPI tracking — analytics + autonomous-health ──
test('F11. KPI tracking — analytics surfaces', async ({ page }) => {
  await walk(page, 11, 'KPI-analytics', '/analytics/autonomous-health', async (p) => {
    const txt = await p.locator('body').innerText();
    const hasContent = txt.length > 200;
    const hasAuditMention = /audit|health|status|score/i.test(txt);
    return { verdict: hasContent && hasAuditMention ? 'PASS' : 'NEEDS_DATA',
      evidence: `content len: ${txt.length}, audit mention: ${hasAuditMention}` };
  });
});

// ── Feature 12: Multi-tenant isolation — patient list shows ONLY cosmique 3 ──
test('F12. Multi-tenant isolation — patient list is cosmique-scoped', async ({ page }) => {
  await walk(page, 12, 'Multi-tenant-isolation', '/clinic/patients', async (p) => {
    const txt = await p.locator('body').innerText();
    // We seeded 3 cosmique patients. Other tenants have their own.
    // If RLS works, we see exactly 3 (Fatima, Omar, Rania).
    const fatima = /Fatima/i.test(txt);
    const omar = /Omar/i.test(txt);
    const rania = /Rania/i.test(txt);
    // Confirm 0 cross-tenant patient names leak through.
    const knownOtherTenantNames = ['Aamerah', 'Sarah Johnson', 'Aisha Khan', 'Khalid Al-Rashid'];
    const leaks = knownOtherTenantNames.filter(n => txt.includes(n));
    const isolated = fatima && omar && rania && leaks.length === 0;
    return { verdict: isolated ? 'PASS' : 'BROKEN',
      evidence: `cosmique 3: ${fatima}/${omar}/${rania}, cross-tenant leaks: ${leaks.join(',') || 'none'}` };
  });
});
