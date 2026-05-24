import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SS_DIR = path.join(__dirname, 'screenshots', 'phase13d');
fs.mkdirSync(SS_DIR, { recursive: true });
const REPORT = path.join(__dirname, 'phase13d-diagnose.json');
const STORAGE = path.join(__dirname, '.auth-state.json');

test('13D — capture DOM state before/after CollapsibleTrigger click on iphone-se', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({
    storageState: STORAGE,
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(45_000);

  // Capture all console logs + errors
  const consoleMessages: string[] = [];
  page.on('console', (m) => consoleMessages.push(`${m.type()}: ${m.text().slice(0, 200)}`));

  // Land on /clinic/treatments (NOT in SALES AI scope — so SALES AI starts closed)
  await page.goto('/clinic/treatments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Open drawer
  await page.getByTestId('mobile-nav-trigger').click();
  await page.waitForTimeout(800);

  // Find the SALES AI trigger (button[data-state] filtered by text)
  const trigger = page.locator('button[data-state]').filter({ hasText: /sales ai/i }).first();
  await trigger.waitFor({ state: 'visible', timeout: 5000 });

  // CAPTURE PRE-CLICK STATE
  const preCapture = await trigger.evaluate((el) => {
    const cs = window.getComputedStyle(el as HTMLElement);
    return {
      tagName: el.tagName,
      dataState: el.getAttribute('data-state'),
      ariaExpanded: el.getAttribute('aria-expanded'),
      classList: (el as HTMLElement).className,
      computedTouchAction: cs.touchAction,
      computedCursor: cs.cursor,
      computedMinHeight: cs.minHeight,
      computedHeight: cs.height,
      pointerEvents: cs.pointerEvents,
      // What's the URL? path?
      url: window.location.pathname,
      // Are there siblings in the same collapsible group?
      parentTag: el.parentElement?.tagName,
      parentAttrs: el.parentElement ? Array.from(el.parentElement.attributes).map(a => `${a.name}=${a.value}`).join(',') : null,
      // First child's text (should be SidebarGroupLabel div)
      firstChildAttrs: el.firstElementChild ? {
        tag: el.firstElementChild.tagName,
        dataSidebar: el.firstElementChild.getAttribute('data-sidebar'),
        cursor: window.getComputedStyle(el.firstElementChild as HTMLElement).cursor,
        touchAction: window.getComputedStyle(el.firstElementChild as HTMLElement).touchAction,
      } : null,
    };
  });

  // What CollapsibleContent sibling looks like (where the menu items should render)
  const preSiblingContent = await page.evaluate(() => {
    const triggers = Array.from(document.querySelectorAll('button[data-state]')) as HTMLButtonElement[];
    const sales = triggers.find(t => t.textContent?.toLowerCase().includes('sales ai'));
    if (!sales) return { found: false };
    // CollapsibleContent is the next sibling of CollapsibleTrigger or inside the same Collapsible parent
    const parent = sales.parentElement;
    const content = parent?.querySelector('[data-state][role="region"]') ||
                    parent?.querySelector('[data-state]:not(button)') ||
                    parent?.nextElementSibling;
    return {
      found: true,
      parentChildrenCount: parent?.children.length,
      contentTag: content?.tagName,
      contentDataState: content?.getAttribute('data-state'),
      contentDisplay: content ? window.getComputedStyle(content as HTMLElement).display : null,
      contentHeight: content ? window.getComputedStyle(content as HTMLElement).height : null,
      contentInnerHTMLLen: content?.innerHTML.length || 0,
    };
  });

  // Take a screenshot of the trigger area pre-click
  await page.screenshot({ path: path.join(SS_DIR, 'pre-click.png'), fullPage: false });

  // ACT: click
  await trigger.click({ timeout: 5000 });
  await page.waitForTimeout(500);

  // CAPTURE POST-CLICK STATE
  const postCapture = await trigger.evaluate((el) => ({
    dataState: el.getAttribute('data-state'),
    ariaExpanded: el.getAttribute('aria-expanded'),
    url: window.location.pathname,
  }));

  const postSiblingContent = await page.evaluate(() => {
    const triggers = Array.from(document.querySelectorAll('button[data-state]')) as HTMLButtonElement[];
    const sales = triggers.find(t => t.textContent?.toLowerCase().includes('sales ai'));
    if (!sales) return { found: false };
    const parent = sales.parentElement;
    const content = parent?.querySelector('[data-state][role="region"]') ||
                    parent?.querySelector('[data-state]:not(button)') ||
                    parent?.nextElementSibling;
    return {
      found: true,
      contentDataState: content?.getAttribute('data-state'),
      contentDisplay: content ? window.getComputedStyle(content as HTMLElement).display : null,
      contentHeight: content ? window.getComputedStyle(content as HTMLElement).height : null,
      contentInnerHTMLLen: content?.innerHTML.length || 0,
      // Are SidebarMenu items visible?
      menuButtonsInContent: content?.querySelectorAll('[data-sidebar="menu-button"]').length || 0,
    };
  });

  // Check if drawer is still open (mode C — drawer closes on click)
  const drawerStillOpen = await page.locator('[role="dialog"]').first().isVisible({ timeout: 1000 }).catch(() => false);

  await page.screenshot({ path: path.join(SS_DIR, 'post-click.png'), fullPage: false });

  // ALSO: dispatch raw 'click' event on the inner div to bypass any button-vs-div distinction
  const innerDiv = trigger.locator('[data-sidebar="group-label"]').first();
  const innerExists = await innerDiv.isVisible({ timeout: 1000 }).catch(() => false);

  const findings = {
    test: '13D.DIAGNOSE',
    preCapture,
    preSiblingContent,
    postCapture,
    postSiblingContent,
    drawerStillOpenAfterClick: drawerStillOpen,
    stateChanged: preCapture.dataState !== postCapture.dataState,
    urlChanged: preCapture.url !== postCapture.url,
    innerDivExists: innerExists,
    consoleMessages: consoleMessages.slice(-15),
    classification:
      preCapture.dataState !== postCapture.dataState ? 'STATE_FLIPPED_OK' :
      !drawerStillOpen ? 'MODE_C_DRAWER_CLOSED' :
      preCapture.url !== postCapture.url ? 'MODE_C_ROUTE_CHANGED' :
      'MODE_B_EVENT_NOT_REACHING_RADIX',
  };
  fs.writeFileSync(REPORT, JSON.stringify(findings, null, 2));
  console.log('=== Phase 13D DOM diagnosis ===');
  console.log(JSON.stringify(findings, null, 2));

  await ctx.close();
});
