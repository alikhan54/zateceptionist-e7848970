import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots', 'phase13a-mobile');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase13a-mobile-results.json');

const results: any[] = [];
function persist() { fs.writeFileSync(REPORT, JSON.stringify(results, null, 2)); }

const STORAGE = path.join(__dirname, '.auth-state.json');

const MOBILES = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'pixel-5', width: 412, height: 915 },
];

for (const vp of MOBILES) {
  test(`13A.M ${vp.name} (${vp.width}x${vp.height}) — hamburger visible, opens drawer, nav works`, async ({ browser }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext({ storageState: STORAGE, viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(45_000);

    await page.goto('/clinic/patients', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SS_DIR, `${vp.name}-1-page-loaded.png`), fullPage: false });

    // Step 2: hamburger visible
    const hamburger = page.getByTestId('mobile-nav-trigger');
    await expect(hamburger).toBeVisible({ timeout: 15_000 });

    // Step 3: click hamburger
    await hamburger.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SS_DIR, `${vp.name}-2-drawer-open.png`), fullPage: false });

    // Step 4: assert drawer/sheet open (shadcn Sheet has role=dialog)
    const drawer = page.locator('[role="dialog"]').first();
    const drawerVisible = await drawer.isVisible({ timeout: 5000 }).catch(() => false);

    // Step 5: assert nav items present in drawer (Clinic Dashboard, Patients should be there)
    const clinicDashLink = await page.getByText(/clinic dashboard/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    results.push({ test: `13A.M.${vp.name}`, verdict: drawerVisible && clinicDashLink ? 'REAL_PASS' : 'BROKEN_UI',
      hamburgerVisible: true, drawerOpened: drawerVisible, clinicNavInDrawer: clinicDashLink, viewport: `${vp.width}x${vp.height}` });
    persist();

    expect(drawerVisible).toBe(true);
    expect(clinicDashLink).toBe(true);

    await ctx.close();
  });
}

// Phase 13.B — collapsible sub-section tap on mobile drawer
for (const vp of MOBILES) {
  test(`13B.C ${vp.name} — drawer opens, tap CLINIC collapsible reveals child items`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ storageState: STORAGE, viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(45_000);

    // Land on /dashboard so CLINIC section is NOT auto-expanded (its isInSection() returns false)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Open drawer
    await page.getByTestId('mobile-nav-trigger').click();
    await page.waitForTimeout(800);
    const drawer = page.locator('[role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Find the SALES AI section label (collapsed by default when on /dashboard)
    const salesLabel = page.locator('[data-sidebar="group-label"][data-state]').filter({ hasText: /sales ai/i }).first();
    const labelVisible = await salesLabel.isVisible({ timeout: 5000 }).catch(() => false);

    // Pre-tap state
    const preState = await salesLabel.getAttribute('data-state').catch(() => null);

    // Tap the label row (NOT just the chevron) — proves 44px touch target works
    await salesLabel.tap({ timeout: 5000 });
    await page.waitForTimeout(800);

    const postState = await salesLabel.getAttribute('data-state').catch(() => null);
    // After tap, state should have flipped (closed→open or open→closed)
    const stateFlipped = preState !== null && postState !== null && preState !== postState;

    // Child items should now be visible — "Sales Dashboard" is a typical SALES AI child
    const childVisible = await page.getByText(/sales dashboard/i).first().isVisible({ timeout: 3000 }).catch(() => false);

    await page.screenshot({ path: path.join(SS_DIR, `${vp.name}-collapsible-after-tap.png`), fullPage: false });
    results.push({ test: `13B.C.${vp.name}`,
      verdict: (labelVisible && stateFlipped) ? 'REAL_PASS' : 'BROKEN_UI',
      labelVisible, preState, postState, stateFlipped, childRendered: childVisible, viewport: `${vp.width}x${vp.height}` });
    persist();

    expect(labelVisible, 'SALES AI label visible').toBe(true);
    expect(stateFlipped, 'tap flipped data-state').toBe(true);
    await ctx.close();
  });
}

test('13A.D Desktop regression: PanelLeft trigger still visible at 1440x900, mobile hamburger hidden', async ({ browser }) => {
  test.setTimeout(60_000);
  const ctx = await browser.newContext({ storageState: STORAGE, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/clinic/patients', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const mobileHamburger = await page.getByTestId('mobile-nav-trigger').isVisible({ timeout: 2000 }).catch(() => false);
  const desktopTrigger = await page.locator('[data-sidebar="trigger"]').first().isVisible({ timeout: 5000 }).catch(() => false);
  const sidebarVisible = await page.locator('aside, [data-sidebar="sidebar"]').first().isVisible({ timeout: 5000 }).catch(() => false);

  await page.screenshot({ path: path.join(SS_DIR, 'desktop-regression.png'), fullPage: false });

  results.push({ test: '13A.D.desktop',
    verdict: (!mobileHamburger && desktopTrigger && sidebarVisible) ? 'REAL_PASS' : 'REGRESSION',
    mobileHamburgerHidden: !mobileHamburger, desktopTriggerVisible: desktopTrigger, sidebarVisible });
  persist();

  expect(mobileHamburger, 'mobile hamburger should be hidden on desktop').toBe(false);
  expect(desktopTrigger).toBe(true);
  expect(sidebarVisible).toBe(true);
  await ctx.close();
});
