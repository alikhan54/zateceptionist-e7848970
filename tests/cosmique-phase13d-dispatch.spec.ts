import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('13D.dispatch — raw click dispatch + inspect Radix onclick wiring', async ({ browser }) => {
  test.setTimeout(60_000);
  const ctx = await browser.newContext({
    storageState: path.join(__dirname, '.auth-state.json'),
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.goto('/clinic/treatments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.getByTestId('mobile-nav-trigger').click();
  await page.waitForTimeout(800);

  const trigger = page.locator('button[data-state]').filter({ hasText: /sales ai/i }).first();
  await trigger.waitFor({ state: 'visible', timeout: 5000 });

  const result = await trigger.evaluate((btn) => {
    const el = btn as HTMLButtonElement;
    const before = el.getAttribute('data-state');
    // React onClick is attached via fiber, not DOM property. Dispatch a real bubbling click.
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    const dispatched = el.dispatchEvent(evt);
    // Also try the .click() native method
    el.click();
    // Yield to React
    return { before, dispatched, after_sync: el.getAttribute('data-state') };
  });
  await page.waitForTimeout(500);
  const afterAsync = await trigger.getAttribute('data-state');

  // Also try clicking the INNER div (where cursor:pointer is set in original code)
  const innerDiv = trigger.locator('[data-sidebar="group-label"]').first();
  const innerResult = await innerDiv.evaluate((el) => {
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    el.dispatchEvent(evt);
    return { ok: true };
  });
  await page.waitForTimeout(500);
  const afterInnerClick = await trigger.getAttribute('data-state');

  console.log('=== Phase 13D.dispatch ===');
  console.log(JSON.stringify({ ...result, afterAsync, innerResult, afterInnerClick }, null, 2));

  await ctx.close();
});
