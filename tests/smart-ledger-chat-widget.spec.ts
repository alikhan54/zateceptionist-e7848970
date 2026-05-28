/**
 * Smart Ledger Dashboard — AI Accountant chat widget verification (Phase 7, 2026-05-29).
 *
 * Widget lives on the accounting Dashboard. Uses the existing OMEGA_CHAT webhook
 * proxy (no new backend endpoint). Renders greeting + suggestion chips initially.
 * Sending a message swaps to a thread layout with user + assistant bubbles.
 *
 * This spec verifies the UI shell + form wiring. It does NOT assert on the
 * actual LangGraph response content — that's covered by upstream agent specs
 * and would be flaky here (LLM stochasticity + cold-load timing).
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAIL = process.env.SMART_LEDGER_EMAIL || 'team@smartledgersolutions.co.uk';
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || '';
const SHOT_DIR = path.join(__dirname, 'screenshots', '2026-05-29-smart-ledger-chat-widget');

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!PASSWORD) throw new Error('SMART_LEDGER_PASSWORD env var is required');
});

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

test('Phase 7 — AccountantChatWidget greeting + form + suggestion chips render', async ({ page }) => {
  test.setTimeout(120_000);

  await login(page);
  await page.goto('/accounting', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="accounting-dashboard"]', { timeout: 30_000 });

  await expect(page.getByTestId('accountant-chat-widget')).toBeVisible();
  await expect(page.getByTestId('chat-greeting')).toBeVisible();
  await expect(page.getByTestId('chat-suggestions')).toBeVisible();
  await expect(page.getByTestId('chat-form')).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeVisible();
  await expect(page.getByTestId('chat-send')).toBeVisible();

  // At least 1 suggestion chip
  const chips = page.locator('[data-testid^="suggestion-"]');
  const chipCount = await chips.count();
  console.log(`[Phase 7] suggestion chips: ${chipCount}`);
  expect(chipCount).toBeGreaterThanOrEqual(2);

  // Type a short message and submit — verify user bubble appears + loading indicator fires.
  // Do NOT wait for the LLM response (flaky timing); just check the UI swaps.
  await page.getByTestId('chat-input').fill('hello');
  await page.getByTestId('chat-send').click();
  // Greeting should disappear once a message exists in state
  await expect(page.getByTestId('chat-greeting')).not.toBeVisible({ timeout: 5_000 });
  // User bubble appears
  await expect(page.getByTestId('chat-msg-user-0')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('chat-msg-user-0')).toContainText('hello');
  // Loading indicator appears
  await expect(page.getByTestId('chat-loading')).toBeVisible({ timeout: 5_000 });

  await page.screenshot({ path: path.join(SHOT_DIR, 'chat-widget-after-send.png'), fullPage: true });
  console.log('[Phase 7] Desktop PASS');
});

test('Phase 7 — Chat widget renders on mobile viewport', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto('/accounting', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="accounting-dashboard"]', { timeout: 30_000 });

  await expect(page.getByTestId('accountant-chat-widget')).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeVisible();

  const dims = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }));
  console.log(`[Phase 7 mobile] body scrollWidth=${dims.scrollWidth} clientWidth=${dims.clientWidth}`);
  expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth + 1);

  await page.screenshot({ path: path.join(SHOT_DIR, 'chat-widget-mobile.png'), fullPage: true });
  console.log('[Phase 7] Mobile PASS');
});
