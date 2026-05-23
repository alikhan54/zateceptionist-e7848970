import { test, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots', 'phase13a-mobile-baseline');
fs.mkdirSync(SS_DIR, { recursive: true });

test('13A baseline: capture mobile state on 3 viewports', async ({ browser }) => {
  test.setTimeout(180_000);
  const storageState = path.join(__dirname, '.auth-state.json');

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'iphone-se', width: 375, height: 667 },
    { name: 'pixel-5', width: 412, height: 915 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({ storageState, viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(45_000);

    await page.goto('/clinic/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SS_DIR, `${vp.name}-dashboard.png`), fullPage: false });

    // Check trigger visibility + sidebar
    const sidebarVisible = await page.locator('[data-sidebar="sidebar"], aside').first().isVisible().catch(() => false);
    const triggerVisible = await page.locator('[data-sidebar="trigger"], button:has-text("Toggle Sidebar")').first().isVisible().catch(() => false);
    const bottomTabBar = await page.locator('nav[class*="bottom"], [data-testid="bottom-tab-bar"]').first().isVisible().catch(() => false);

    console.log(`${vp.name} ${vp.width}x${vp.height}: sidebar=${sidebarVisible} trigger=${triggerVisible} bottomTabBar=${bottomTabBar}`);

    if (vp.width < 768) {
      // Mobile: try clicking the SidebarTrigger
      try {
        const trigger = page.locator('[data-sidebar="trigger"]').first();
        if (await trigger.isVisible({ timeout: 2000 })) {
          await trigger.click({ timeout: 3000 });
          await page.waitForTimeout(800);
          await page.screenshot({ path: path.join(SS_DIR, `${vp.name}-after-trigger-click.png`), fullPage: false });
          const sheetOpen = await page.locator('[role="dialog"], [data-state="open"]').first().isVisible().catch(() => false);
          console.log(`  after click: sheetOpen=${sheetOpen}`);
        }
      } catch (e: any) {
        console.log(`  trigger click error: ${e?.message?.slice(0, 100)}`);
      }
    }

    await ctx.close();
  }
});
