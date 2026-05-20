/**
 * Onboarding — fresh tenant E2E (2026-05-19).
 *
 * Real UI test of the 5-step onboarding flow:
 *   Discovery → Channels → KnowledgeBase → Payment → Ready
 *
 * Setup:
 *   - Creates a pre-confirmed Supabase auth user via Admin API (skips email verify)
 *   - Logs in via UI
 *   - Walks every step, screenshots before/after, captures button/input inventory
 *   - Records final URL + post-completion state
 *
 * Reads (NEVER hardcoded):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY  (from frontend .env or shell)
 *
 * Cleanup:
 *   afterAll deletes the auth user + any rows in tenant_config/users it created.
 */
import { test, expect, type Page, request as pwRequest } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fncfbywkemsxwuiowxxe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY env var is required');

const TS = Date.now();
const TEST_EMAIL = `test-onboard-${TS}@420-test.local`;
const TEST_PASSWORD = `Onboard!${TS}aZ`;

const SHOT_DIR = path.join(__dirname, 'screenshots', `2026-05-19-onboarding-fresh-tenant-${TS}`);
fs.mkdirSync(SHOT_DIR, { recursive: true });

const RESULT: {
  testEmail: string;
  testStartedAt: string;
  authUserId: string | null;
  steps: Array<{
    index: number;
    label: string;
    urlBefore: string;
    urlAfter: string;
    inputs: Array<{ name: string; placeholder: string; type: string }>;
    buttons: string[];
    visibleTextSample: string;
    screenshotBefore: string;
    screenshotAfter: string;
    advanced: boolean;
    error?: string;
  }>;
  consoleErrors: string[];
  networkFailures: Array<{ url: string; status: number; method: string }>;
  onboardingWebhookResponses: Array<{ url: string; status: number; bodyPreview: string; durationMs: number }>;
  dbSnapshotPostFlow: Record<string, any>;
  tenantSlugCreated: string | null;
} = {
  testEmail: TEST_EMAIL,
  testStartedAt: new Date().toISOString(),
  authUserId: null,
  steps: [],
  consoleErrors: [],
  networkFailures: [],
  onboardingWebhookResponses: [],
  dbSnapshotPostFlow: {},
  tenantSlugCreated: null,
};

async function adminFetch(method: string, p: string, body?: object) {
  const res = await fetch(`${SUPABASE_URL}${p}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

test.describe.serial('Fresh tenant onboarding — full UI walk', () => {
  test.beforeAll(async () => {
    // 1) Create pre-confirmed user via Supabase Admin API
    const created = await adminFetch('POST', '/auth/v1/admin/users', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (created.status !== 200 && created.status !== 201) {
      throw new Error(`Failed to create admin user (HTTP ${created.status}): ${JSON.stringify(created.body).slice(0, 300)}`);
    }
    RESULT.authUserId = created.body?.id || null;
    console.log(`[setup] Created test user ${TEST_EMAIL} -> auth.users.id=${RESULT.authUserId}`);

    // Write a result skeleton up-front so even crashes leave evidence
    fs.writeFileSync(path.join(SHOT_DIR, 'result.json'), JSON.stringify(RESULT, null, 2));
  });

  test.afterAll(async () => {
    fs.writeFileSync(path.join(SHOT_DIR, 'result.json'), JSON.stringify(RESULT, null, 2));

    if (process.env.SKIP_CLEANUP === '1') {
      console.log(`[cleanup] SKIPPED (SKIP_CLEANUP=1). Leaving user ${RESULT.authUserId} + tenant ${RESULT.tenantSlugCreated} in DB.`);
      return;
    }
    // Cleanup: delete every row this test created. Order matters — child tables first.
    if (RESULT.tenantSlugCreated) {
      const slug = RESULT.tenantSlugCreated;
      for (const t of [
        'reply_routing_rules',
        'sequence_templates',
        'tenant_icp_config',
        'agent_contexts',
        'onboarding_module_status',
        'brand_voice_profiles',
        'sequences',
      ]) {
        await adminFetch('DELETE', `/rest/v1/${t}?tenant_id=eq.${slug}`).catch(() => null);
      }
      // public.users row(s) for this tenant
      await adminFetch('DELETE', `/rest/v1/users?tenant_id=eq.${slug}`).catch(() => null);
      // Finally tenant_config (FK target for some other tables — delete last)
      await adminFetch('DELETE', `/rest/v1/tenant_config?tenant_id=eq.${slug}`).catch(() => null);
    }
    if (RESULT.authUserId) {
      // Belt-and-braces: also delete by auth_id in case slug lookup missed something
      await adminFetch('DELETE', `/rest/v1/users?auth_id=eq.${RESULT.authUserId}`).catch(() => null);
      const del = await adminFetch('DELETE', `/auth/v1/admin/users/${RESULT.authUserId}`).catch(() => ({ status: 0, body: null }));
      console.log(`[cleanup] Deleted auth user ${RESULT.authUserId} -> HTTP ${del.status}`);
    }
  });

  test('login + record the journey', async ({ page }) => {
    test.setTimeout(180_000);

    page.on('console', (m) => {
      if (m.type() === 'error') RESULT.consoleErrors.push(m.text().slice(0, 500));
    });
    page.on('response', async (r) => {
      const url = r.url();
      if (r.status() >= 400 && (url.includes('supabase.co') || url.includes('webhooks.zatesystems') || url.includes('zatesystems.com/api'))) {
        RESULT.networkFailures.push({ url, status: r.status(), method: r.request().method() });
      }
      // Capture EVERY onboarding webhook response (status + body preview), regardless of HTTP code,
      // so we can verify whether they returned valid JSON / empty body / etc.
      if (url.includes('/onboarding/') || url.includes('webhook/onboarding') || url.includes('/provision-')) {
        try {
          const t0 = Date.now();
          const body = await r.text().catch(() => '');
          RESULT.onboardingWebhookResponses.push({
            url,
            status: r.status(),
            bodyPreview: (body || '').slice(0, 400),
            durationMs: Date.now() - t0,
          });
        } catch { /* ignore */ }
      }
    });

    // === LOGIN ===
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(SHOT_DIR, '00-login-page.png'), fullPage: true });

    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.screenshot({ path: path.join(SHOT_DIR, '01-login-filled.png'), fullPage: true });

    const signIn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
    await signIn.click();

    // Allow up to 30s to leave /login
    try {
      await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 });
    } catch {
      await page.screenshot({ path: path.join(SHOT_DIR, '02-stuck-on-login.png'), fullPage: true });
      throw new Error(`Login did not leave /login. URL=${page.url()}`);
    }

    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    await page.screenshot({ path: path.join(SHOT_DIR, '02-after-login.png'), fullPage: true });
    console.log(`[login] post-login URL: ${page.url()}`);

    // === NAVIGATE TO /onboarding ===
    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding', { waitUntil: 'networkidle' });
    }

    // Wait HARD for the loading spinner to disappear (up to 30s).
    // The CompanySetup page renders <PageLoading message="Loading..." /> via Suspense
    // until its lazy chunk resolves. If it's still visible after 30s, that's a real bug.
    const loadingLocator = page.locator('text=/^Loading\\.\\.\\.$/');
    try {
      await loadingLocator.first().waitFor({ state: 'detached', timeout: 30_000 });
      console.log(`[onboarding] Loading spinner cleared after wait`);
    } catch {
      const stillThere = await loadingLocator.first().isVisible().catch(() => false);
      console.log(`[onboarding] Loading spinner still visible after 30s: ${stillThere}`);
    }

    await page.waitForTimeout(2_000); // settle
    await page.screenshot({ path: path.join(SHOT_DIR, '03-onboarding-landed.png'), fullPage: true });
    fs.writeFileSync(path.join(SHOT_DIR, '03-onboarding-landed.html'), await page.content());
    console.log(`[onboarding] arrived at: ${page.url()}`);

    // === WALK STEPS ===
    const STEP_LABELS = ['Discovery', 'Channels', 'KnowledgeBase', 'Payment', 'Ready'];
    for (let i = 0; i < STEP_LABELS.length; i++) {
      const label = STEP_LABELS[i];
      const urlBefore = page.url();
      const before = path.join(SHOT_DIR, `step-${i}-${label}-before.png`);
      await page.screenshot({ path: before, fullPage: true });

      // Capture inputs + buttons + visible heading text
      const inputs = await page.locator('input:visible, textarea:visible, select:visible').evaluateAll((els) =>
        els.map((el: any) => ({
          name: el.getAttribute('name') || '',
          placeholder: el.getAttribute('placeholder') || '',
          type: el.getAttribute('type') || el.tagName.toLowerCase(),
        }))
      );
      const buttons = await page.locator('button:visible').evaluateAll((els) =>
        els.map((el: any) => (el.textContent || '').trim()).filter((t: string) => t.length > 0 && t.length < 50)
      );
      const visibleTextSample = (await page.locator('main, body').first().innerText().catch(() => '')).slice(0, 600);

      // Fill any visible required-looking text/email/url fields with sane values
      try {
        const allInputs = await page.locator('input:visible').all();
        for (const inp of allInputs) {
          const type = (await inp.getAttribute('type').catch(() => null)) || 'text';
          const name = (await inp.getAttribute('name').catch(() => null)) || '';
          const ph = (await inp.getAttribute('placeholder').catch(() => null)) || '';
          if (await inp.inputValue().catch(() => '')) continue;
          if (type === 'email') await inp.fill(TEST_EMAIL).catch(() => null);
          else if (type === 'url' || ph.toLowerCase().includes('http')) await inp.fill('https://420-test.local').catch(() => null);
          else if (type === 'tel' || name.toLowerCase().includes('phone')) await inp.fill('+15555550100').catch(() => null);
          else if (type === 'text' && (name.toLowerCase().includes('company') || ph.toLowerCase().includes('company')))
            await inp.fill(`Test Co ${TS}`).catch(() => null);
          else if (type === 'text') await inp.fill('Test value').catch(() => null);
        }
        const textareas = await page.locator('textarea:visible').all();
        for (const ta of textareas) if (!(await ta.inputValue().catch(() => ''))) await ta.fill('Test description').catch(() => null);
      } catch {
        /* keep going — capture screenshot regardless */
      }

      await page.screenshot({ path: path.join(SHOT_DIR, `step-${i}-${label}-filled.png`), fullPage: true });

      // Try Continue / Next / Skip — substring match so "Next: Connect Channels" qualifies.
      // Try positive advance verbs first; only fall back to Skip if those aren't there.
      let advanced = false;
      let err: string | undefined;
      const advanceVerbs = [/continue/i, /^next/i, /next:/i, /save.*(continue|next)/i, /get started/i, /finish/i, /complete/i, /start trial/i, /confirm/i, /start free/i, /subscribe/i];
      const skipVerbs = [/continue free/i, /^skip$/i];
      const captureUrlBefore = page.url();
      const captureStepBefore = await page.locator('text=/Step \\d of/').first().innerText().catch(() => '');

      // Step indicator HIDES on the final Ready step (CompanySetup gates it `{currentStep < 4}`),
      // so transitioning from Payment → Ready makes captureStepAfter empty. Detect that case by
      // looking for Ready-specific content as a positive advance signal.
      const READY_SIGNALS = [/training your ai/i, /you're all set/i, /training progress/i, /go to dashboard/i];
      const findReady = async () => {
        for (const re of READY_SIGNALS) {
          if (await page.getByText(re).first().isVisible({ timeout: 500 }).catch(() => false)) return true;
        }
        return false;
      };

      for (const re of [...advanceVerbs, ...skipVerbs]) {
        const btn = page.getByRole('button', { name: re }).first();
        if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
          const txt = (await btn.innerText().catch(() => '')).trim();
          try {
            await btn.scrollIntoViewIfNeeded({ timeout: 2_000 }).catch(() => {});
            await btn.click({ timeout: 5_000 });
            await page.waitForTimeout(3_500);
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
            const captureStepAfter = await page.locator('text=/Step \\d of/').first().innerText().catch(() => '');
            const reachedReady = await findReady();
            const onDashboard = page.url().includes('/dashboard');
            // Advance if step indicator changed, OR Ready step content appeared, OR we reached /dashboard.
            if (captureStepAfter && captureStepAfter !== captureStepBefore) {
              advanced = true;
              err = `clicked "${txt.slice(0, 30)}" -> ${captureStepBefore} -> ${captureStepAfter}`;
              break;
            } else if (reachedReady) {
              advanced = true;
              err = `clicked "${txt.slice(0, 30)}" -> reached Ready step (indicator hidden)`;
              break;
            } else if (onDashboard) {
              advanced = true;
              err = `clicked "${txt.slice(0, 30)}" -> redirected to /dashboard`;
              break;
            } else {
              err = `clicked "${txt.slice(0, 30)}" but step indicator unchanged (${captureStepBefore})`;
              // try next candidate
            }
          } catch (e: any) {
            err = `clicked "${txt.slice(0, 30)}" error: ${(e?.message || '').slice(0, 200)}`;
          }
        }
      }
      // If we didn't see a step indicator change but the URL changed or we're on /dashboard, count as advanced
      if (!advanced && page.url() !== captureUrlBefore && !page.url().includes('/onboarding')) {
        advanced = true;
        err = `(no step indicator; URL changed -> ${page.url()})`;
      }

      const urlAfter = page.url();
      const after = path.join(SHOT_DIR, `step-${i}-${label}-after.png`);
      await page.screenshot({ path: after, fullPage: true });
      // Also dump DOM at each step end so we can debug stuck-state offline
      fs.writeFileSync(path.join(SHOT_DIR, `step-${i}-${label}.html`), await page.content());

      RESULT.steps.push({
        index: i,
        label,
        urlBefore,
        urlAfter,
        inputs: inputs.slice(0, 30),
        buttons: buttons.slice(0, 20),
        visibleTextSample,
        screenshotBefore: path.relative(SHOT_DIR, before),
        screenshotAfter: path.relative(SHOT_DIR, after),
        advanced,
        error: err,
      });

      fs.writeFileSync(path.join(SHOT_DIR, 'result.json'), JSON.stringify(RESULT, null, 2));
      console.log(`[step-${i}] ${label}: advanced=${advanced}, urlAfter=${urlAfter}, inputs=${inputs.length}, buttons=${buttons.length}`);

      if (!advanced) break; // no point pretending we're still walking
    }

    // Wait for the Ready step's async work to settle: insert tenant_config, insert public.users,
    // call /provision-orchestrate (this alone takes ~5–10s), and update onboarding_completed.
    // 35s gives the orchestrator time + a margin.
    console.log('[post-loop] Waiting 35s for ReadyStep async provisioning to complete...');
    await page.waitForTimeout(35_000);
    await page.screenshot({ path: path.join(SHOT_DIR, '99-final-state.png'), fullPage: true });
    fs.writeFileSync(path.join(SHOT_DIR, '99-final-state.html'), await page.content());
    console.log(`[post-loop] Final URL: ${page.url()}`);

    // === POST-FLOW DB SNAPSHOT — what actually got written? ===
    // CRITICAL: public.users.id is its own PK, not the auth user id. Look up by auth_id.
    if (RESULT.authUserId) {
      const usersRow = await adminFetch('GET', `/rest/v1/users?auth_id=eq.${RESULT.authUserId}&select=*`);
      RESULT.dbSnapshotPostFlow.users = usersRow.body || [];
      const slug = Array.isArray(usersRow.body) && usersRow.body[0]?.tenant_id ? usersRow.body[0].tenant_id : null;
      RESULT.tenantSlugCreated = slug;

      if (slug) {
        const [tc, oms, ac, rrr, bvp, st, seq, sl] = await Promise.all([
          adminFetch('GET', `/rest/v1/tenant_config?tenant_id=eq.${slug}&select=id,tenant_id,company_name,industry,onboarding_completed,ai_agent_mode,created_at`),
          adminFetch('GET', `/rest/v1/onboarding_module_status?tenant_id=eq.${slug}&select=*`),
          adminFetch('GET', `/rest/v1/agent_contexts?tenant_id=eq.${slug}&select=agent_name,is_active,confidence_score`),
          adminFetch('GET', `/rest/v1/reply_routing_rules?tenant_id=eq.${slug}&select=id,channel,target_agent`),
          adminFetch('GET', `/rest/v1/brand_voice_profiles?tenant_id=eq.${slug}&select=id,brand_name`),
          adminFetch('GET', `/rest/v1/sequence_templates?tenant_id=eq.${slug}&select=id,name`),
          adminFetch('GET', `/rest/v1/sequences?tenant_id=eq.${slug}&select=id,name,is_active`),
          adminFetch('GET', `/rest/v1/sales_leads?tenant_id=eq.${slug}&select=count`),
        ]);
        RESULT.dbSnapshotPostFlow.tenant_config = tc.body;
        RESULT.dbSnapshotPostFlow.onboarding_module_status = oms.body;
        RESULT.dbSnapshotPostFlow.agent_contexts = ac.body;
        RESULT.dbSnapshotPostFlow.reply_routing_rules = rrr.body;
        RESULT.dbSnapshotPostFlow.brand_voice_profiles = bvp.body;
        RESULT.dbSnapshotPostFlow.sequence_templates = st.body;
        RESULT.dbSnapshotPostFlow.sequences = seq.body;
        RESULT.dbSnapshotPostFlow.sales_leads_count = sl.body;
      }
    }

    fs.writeFileSync(path.join(SHOT_DIR, 'result.json'), JSON.stringify(RESULT, null, 2));
    console.log(`[post-flow] tenant slug created: ${RESULT.tenantSlugCreated}`);
    console.log(`[post-flow] onboarding webhook responses: ${RESULT.onboardingWebhookResponses.length}`);
    for (const r of RESULT.onboardingWebhookResponses) {
      console.log(`  ${r.status} ${r.url} body[${r.bodyPreview.length}b]: ${r.bodyPreview.slice(0, 80)}`);
    }
  });
});
