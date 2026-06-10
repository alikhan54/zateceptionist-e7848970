/**
 * Phase 5 — audit-login pipeline proof (the headline proof).
 *
 * Logs in as real tenant users (welkin admin, cosmique user) against a local
 * preview wired to the prod DB. Each successful password login should now
 * write a real `audit_logs` row via the log_audit_event RPC (migration 45),
 * fired fire-and-forget from AuthContext.login(). The NEW-row assertion is
 * done DB-side by the driver script (.tmp_phase5/verify_phase5.py) which
 * records a T0 watermark before running this spec.
 *
 * Env (CLAUDE.md §21 — never hardcode credentials):
 *   WELKIN_EMAIL / WELKIN_PASSWORD     — welkin demo admin
 *   COSMIQUE_EMAIL / COSMIQUE_PASSWORD — cosmique tenant user
 * Tests self-skip when creds are not provided. Master-admin browser E2E
 * self-skips by design (no master creds in Playwright) — /admin assertions
 * are proven via DB + the exact queries the UI issues, per the established
 * pattern.
 */
import { test, expect, type Page } from '@playwright/test';

const WELKIN_EMAIL = process.env.WELKIN_EMAIL || '';
const WELKIN_PASSWORD = process.env.WELKIN_PASSWORD || '';
const COSMIQUE_EMAIL = process.env.COSMIQUE_EMAIL || '';
const COSMIQUE_PASSWORD = process.env.COSMIQUE_PASSWORD || '';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30_000 });
  // Give the fire-and-forget log_audit_event RPC time to complete.
  await page.waitForTimeout(5_000);
}

test('welkin login lands and fires the audit RPC', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!WELKIN_PASSWORD, 'WELKIN_PASSWORD not provided.');

  // Capture the audit RPC request to prove the frontend actually fires it.
  const rpcCalls: number[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/rpc/log_audit_event')) rpcCalls.push(res.status());
  });

  await login(page, WELKIN_EMAIL, WELKIN_PASSWORD);
  await page.screenshot({ path: 'D:/420-system/.tmp_phase5/results/welkin-logged-in.png', fullPage: false });

  expect(rpcCalls.length, 'log_audit_event RPC must be called on login').toBeGreaterThan(0);
  expect(rpcCalls[0], 'log_audit_event RPC must return 200').toBe(200);
});

test('cosmique login lands and fires the audit RPC', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!COSMIQUE_PASSWORD, 'COSMIQUE_PASSWORD not provided.');

  const rpcCalls: number[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/rpc/log_audit_event')) rpcCalls.push(res.status());
  });

  await login(page, COSMIQUE_EMAIL, COSMIQUE_PASSWORD);
  await page.screenshot({ path: 'D:/420-system/.tmp_phase5/results/cosmique-logged-in.png', fullPage: false });

  expect(rpcCalls.length, 'log_audit_event RPC must be called on login').toBeGreaterThan(0);
  expect(rpcCalls[0], 'log_audit_event RPC must return 200').toBe(200);

  // Isolation smoke: a non-master admin must not reach the master admin panel.
  await page.goto('/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_000);
  const masterPanelVisible = await page.getByText('Master Admin Panel').count();
  expect(masterPanelVisible, 'cosmique must NOT see the Master Admin Panel').toBe(0);
  await page.screenshot({ path: 'D:/420-system/.tmp_phase5/results/cosmique-admin-blocked.png', fullPage: false });
});
