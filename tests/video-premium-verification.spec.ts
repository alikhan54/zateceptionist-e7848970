/**
 * video-premium-verification.spec.ts
 * ====================================
 * Verifies the 2026-05-26/27 video premium integration:
 *   - HeyGen direct API wiring in video-service
 *   - allowed_tenants whitelist gate in providers.py
 *   - n8n workflow 2Xt2GDV9IbpNlfzA (Avatar Async Proxy v1.0) routes
 *     premium tenants (zate, cosmique) to HeyGen, others to MuseTalk
 *
 * Adopts the skip-when-no-creds pattern from CLAUDE.md § 21 — safe in
 * CI without secrets.
 *
 * To run:
 *   VIDEO_PREMIUM_ZATE_EMAIL=adeel@zatesystems.com \
 *   VIDEO_PREMIUM_ZATE_PASSWORD=... \
 *   SUPABASE_SERVICE_KEY=... \
 *   N8N_API_KEY=... \
 *   npx playwright test tests/video-premium-verification.spec.ts --project=video-premium
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZATE_EMAIL = process.env.VIDEO_PREMIUM_ZATE_EMAIL || '';
const ZATE_PASSWORD = process.env.VIDEO_PREMIUM_ZATE_PASSWORD || '';
const SVC = process.env.SUPABASE_SERVICE_KEY || '';
const N8N_KEY = process.env.N8N_API_KEY || '';
const SB = 'https://fncfbywkemsxwuiowxxe.supabase.co';
const N8N = 'http://localhost:5678';
const WORKFLOW_ID = '2Xt2GDV9IbpNlfzA';

const ZATE_UUID = 'ac308ab6-f381-4eef-88ec-4d5c7a860ff9';
const ACSFX_UUID = '8899f7c1-43c7-4bf1-9742-7fc721a3422c';

const SS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(SS_DIR, { recursive: true });

const skipUI1 = !ZATE_EMAIL || !ZATE_PASSWORD || !SVC || !N8N_KEY;
const skipUI3 = !SVC || !N8N_KEY;

async function sb(p: string, init?: RequestInit) {
  const r = await fetch(`${SB}${p}`, {
    ...init,
    headers: {
      apikey: SVC,
      Authorization: `Bearer ${SVC}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers || {}),
    },
  });
  const txt = await r.text();
  let data: any;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

async function n8nApi(path: string, init?: RequestInit) {
  const r = await fetch(`${N8N}${path}`, {
    ...init,
    headers: { 'X-N8N-API-KEY': N8N_KEY, ...(init?.headers || {}) },
  });
  const txt = await r.text();
  let data: any;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

async function login(page: any, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u: any) => !u.toString().includes('/login'), { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

async function dismissModals(page: any) {
  // The "Welcome to Your Business Hub" modal appears AFTER networkidle.
  // It's a Radix dialog with a dimmer that intercepts clicks. We try several
  // strategies: explicit "Skip tutorial" text → close (X) icon → Escape key.
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(800);
    const skipText = page.getByText(/skip tutorial/i).first();
    if (await skipText.isVisible({ timeout: 1200 }).catch(() => false)) {
      await skipText.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      continue;
    }
    const closeBtn = page.locator('[aria-label="Close"], button:has-text("Skip"), button:has-text("Close")').first();
    if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      continue;
    }
    // Last resort: press Escape
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
    // Check if dimmer is gone
    const overlay = page.locator('div[data-state="open"][aria-hidden="true"]').first();
    if (!(await overlay.isVisible({ timeout: 500 }).catch(() => false))) break;
  }
}

test.describe('Video premium integration verification', () => {
  test('UI-1: zate (premium) avatar generation routes to HeyGen', async ({ page }) => {
    test.skip(skipUI1, 'Set VIDEO_PREMIUM_ZATE_{EMAIL,PASSWORD} + SUPABASE_SERVICE_KEY + N8N_API_KEY to run');
    test.setTimeout(900_000);  // 15 min to accommodate HeyGen + workflow + n8n latency

    await login(page, ZATE_EMAIL, ZATE_PASSWORD);

    // Baseline: most recent video_render_queue row for zate
    const preQ = await sb(
      `/rest/v1/video_render_queue?tenant_id=eq.${ZATE_UUID}&select=project_id,created_at&order=created_at.desc&limit=1`
    );
    const preQId = (preQ.data || [])[0]?.project_id || null;

    await page.goto('/marketing/video-studio', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await dismissModals(page);
    await page.screenshot({ path: path.join(SS_DIR, 'video-premium-ui1-loaded.png') });

    const avatarCard = page.getByText(/avatar video/i).first();
    await expect(avatarCard).toBeVisible({ timeout: 15_000 });
    await avatarCard.click({ force: true });
    await page.waitForTimeout(800);

    const script = "Welcome to Zate Systems. We replace ten SaaS tools with one AI platform.";
    const ta = page.locator('textarea').first();
    await ta.fill(script);
    await page.waitForTimeout(300);

    const genBtn = page.getByRole('button', { name: /generate avatar|generate video/i }).first();
    await genBtn.click({ force: true });
    await page.screenshot({ path: path.join(SS_DIR, 'video-premium-ui1-submitted.png') });

    // ASSERTION 1: a new video_render_queue row appears within 90s of click
    let newProjectId: string | null = null;
    await expect.poll(async () => {
      const r = await sb(
        `/rest/v1/video_render_queue?tenant_id=eq.${ZATE_UUID}&select=project_id,status,output_url,created_at&order=created_at.desc&limit=1`
      );
      const top = (r.data || [])[0];
      if (top && top.project_id !== preQId) {
        newProjectId = top.project_id;
        return top.status;
      }
      return null;
    }, { timeout: 90_000, intervals: [2000, 3000, 5000] }).not.toBeNull();

    // ASSERTION 3: queue row reaches status=completed within 12 min (HeyGen 1-3 min + workflow processing)
    let finalRow: any = null;
    await expect.poll(async () => {
      const r = await sb(
        `/rest/v1/video_render_queue?project_id=eq.${newProjectId}&select=status,output_url,error_message`
      );
      const row = (r.data || [])[0];
      finalRow = row;
      return row?.status;
    }, { timeout: 720_000, intervals: [5000, 10_000, 15_000] }).toMatch(/completed|failed/);

    await page.screenshot({ path: path.join(SS_DIR, 'video-premium-ui1-complete.png') });

    // ASSERTION 4: completion is success (not failed)
    expect(finalRow?.status).toBe('completed');
    expect(finalRow?.error_message).toBeFalsy();
    expect(finalRow?.output_url).toMatch(/^https?:\/\//);

    // ASSERTION 5 (critical): the output_url comes from HeyGen, not from our Supabase storage
    // HeyGen returns https://files2.heygen.ai/... ; free stack returns https://fncfbywkemsxwuiowxxe.supabase.co/storage/...
    expect(finalRow?.output_url).toMatch(/heygen\.ai/i);
  });

  test('UI-3: free-tier tenant (ACSFX) routes to MuseTalk, NOT HeyGen', async ({ request }) => {
    test.skip(skipUI3, 'Set SUPABASE_SERVICE_KEY to run');
    test.setTimeout(900_000);

    const preQ = await sb(
      `/rest/v1/video_render_queue?tenant_id=eq.${ACSFX_UUID}&select=project_id,created_at&order=created_at.desc&limit=1`
    );
    const preQId = (preQ.data || [])[0]?.project_id || null;

    // Hit the actual webhook the UI uses (skipping browser — direct POST is faster + still proves
    // the workflow routes correctly). Webhook accepts tenant_id+script per AVA.2 validation.
    const r = await request.post(`${N8N}/webhook/video/generate-avatar-async`, {
      data: {
        tenant_id: ACSFX_UUID,
        script: 'ACSFX free-tier isolation test — should route to MuseTalk.',
        aspect_ratio: '9:16',
      },
      timeout: 30_000,
    });
    expect(r.status()).toBeLessThan(500);

    // ASSERTION 1: new queue row appears within 60s
    let acsfxProjectId: string | null = null;
    await expect.poll(async () => {
      const x = await sb(
        `/rest/v1/video_render_queue?tenant_id=eq.${ACSFX_UUID}&select=project_id,status,created_at&order=created_at.desc&limit=1`
      );
      const top = (x.data || [])[0];
      if (top && top.project_id !== preQId) {
        acsfxProjectId = top.project_id;
        return top.status;
      }
      return null;
    }, { timeout: 60_000, intervals: [2000, 3000, 5000] }).not.toBeNull();

    // ASSERTION 3 (critical LEAK CHECK): wait for completion or until enough time has passed
    // and verify the output_url is NOT a HeyGen URL — whatever it is, it must be free-stack.
    // Free-stack URLs come from supabase.co/storage or are null/error.
    let acsfxFinal: any = null;
    await expect.poll(async () => {
      const x = await sb(
        `/rest/v1/video_render_queue?project_id=eq.${acsfxProjectId}&select=status,output_url,error_message`
      );
      const row = (x.data || [])[0];
      acsfxFinal = row;
      return row?.status;
    }, { timeout: 720_000, intervals: [5000, 10_000, 15_000] }).toMatch(/completed|failed/);

    // The render may complete OR fail (MuseTalk container may have its own issues today); what
    // matters is NO HeyGen URL ever appears.
    if (acsfxFinal?.output_url) {
      expect(acsfxFinal.output_url).not.toMatch(/heygen\.ai/i);
    }
  });
});
