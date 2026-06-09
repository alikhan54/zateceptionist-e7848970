/**
 * BBQ POS verify (local preview :5186).
 * TEST 1 (bbqtonight): build an order on the POS -> Send to Kitchen (place_bbq_order) ->
 *   placed banner (KDS + stock + loyalty) -> pay cash + change -> printable receipt ->
 *   then confirm the SAME order appears on the Kitchen Display (omnichannel proof).
 * TEST 2 (cosmique = healthcare_clinic): the Restaurant section / POS link is NOT in the sidebar.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path"; import fs from "fs";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:5186";
const EMAIL = process.env.BBQTONIGHT_EMAIL || "";
const PASSWORD = process.env.BBQTONIGHT_PASSWORD || "";
const C_EMAIL = process.env.COSMIQUE_EMAIL || "";
const C_PASSWORD = process.env.COSMIQUE_PASSWORD || "";
const SHOT = path.join(process.cwd(), "tests/screenshots/bbq-pos");
try { fs.mkdirSync(SHOT, { recursive: true }); } catch { /* ignore */ }

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30_000 });
}
async function dismiss(page: Page) {
  for (let i = 0; i < 4; i++) {
    const dlg = page.locator('[role="dialog"]');
    if (await dlg.count() === 0) break;
    const c = dlg.locator('button:has-text("Skip"), button:has-text("Got it"), button:has-text("Close"), button[aria-label="Close"]');
    if (await c.count()) { await c.first().click({ force: true }).catch(() => {}); } else { await page.keyboard.press("Escape").catch(() => {}); }
    await page.waitForTimeout(500);
  }
}

test("POS: build order -> kitchen + receipt + appears on KDS", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "bbq creds missing");
  test.setTimeout(140_000);
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 160)); });

  await login(page, EMAIL, PASSWORD);
  await page.goto(`${BASE}/operations/pos`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); await dismiss(page);
  await page.waitForSelector('[data-testid="pos-menu-grid"]', { timeout: 20_000 });

  const items = page.locator('[data-testid^="pos-item-"]');
  expect(await items.count()).toBeGreaterThan(2);
  await items.nth(0).click();
  await items.nth(1).click();
  await page.locator('[data-testid^="pos-qty-inc-"]').first().click(); // bump first line to qty 2
  expect(await page.locator('[data-testid^="pos-cart-line-"]').count()).toBe(2);

  await page.locator('[data-testid="pos-ordertype-dine_in"]').click();
  await page.locator('[data-testid="pos-table-input"]').fill("7");
  await page.locator('[data-testid="pos-name-input"]').fill("POS Verify ⚡");
  await page.locator('[data-testid="pos-phone-input"]').fill("+923007770001");
  const total = (await page.locator('[data-testid="pos-total"]').innerText()).trim();
  console.log(`[test] cart total: ${total}`);
  await page.screenshot({ path: path.join(SHOT, "01-cart.png"), fullPage: true });

  await page.locator('[data-testid="pos-send-to-kitchen"]').click();
  await page.waitForSelector('[data-testid="pos-placed-banner"]', { timeout: 25_000 });
  const ordNum = (await page.locator('[data-testid="pos-order-number"]').innerText()).trim().replace("#", "");
  console.log(`[test] POS order #${ordNum}`);
  fs.writeFileSync(path.join(process.cwd(), "tests/.pos_order_number"), ordNum);
  const banner = await page.locator('[data-testid="pos-placed-banner"]').innerText();
  expect(banner).toMatch(/Kitchen Display/i);
  expect(banner).toMatch(/Stock decremented/i);
  expect(banner).toMatch(/Loyalty/i);

  // pay cash
  await page.locator('[data-testid="pos-pay-cash"]').click();
  await page.locator('[data-testid="pos-tendered"]').fill("9000");
  await page.waitForTimeout(400);
  const change = (await page.locator('[data-testid="pos-change"]').innerText()).trim();
  console.log(`[test] change: ${change}`);
  await page.locator('[data-testid="pos-mark-paid"]').click();
  await page.waitForSelector('[data-testid="pos-receipt"]', { timeout: 15_000 });
  const receipt = await page.locator('[data-testid="pos-receipt"]').innerText();
  expect(receipt).toContain(ordNum);
  expect(await page.locator('[data-testid="pos-print"]').count()).toBe(1);
  await page.screenshot({ path: path.join(SHOT, "02-receipt.png"), fullPage: true });

  // OMNICHANNEL PROOF: the counter order is on the same Kitchen Display
  await page.goto(`${BASE}/operations/kitchen-display`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000); await dismiss(page);
  await page.waitForSelector(`[data-testid="kds-ticket-${ordNum}"]`, { timeout: 20_000 });
  console.log(`[test] POS order #${ordNum} is LIVE on the Kitchen Display ✓`);
  await page.screenshot({ path: path.join(SHOT, "03-kds-has-pos-order.png"), fullPage: true });
});

test("clinic tenant does NOT see POS / Restaurant in the sidebar", async ({ page }) => {
  test.skip(!C_EMAIL || !C_PASSWORD, "cosmique creds missing");
  test.setTimeout(80_000);
  await login(page, C_EMAIL, C_PASSWORD);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500); await dismiss(page);
  // no POS nav link, no Restaurant section for a healthcare_clinic tenant
  expect(await page.locator('a[href="/operations/pos"]').count()).toBe(0);
  const nav = await page.locator("nav, aside").first().innerText().catch(async () => await page.locator("body").innerText());
  expect(nav).not.toContain("Point of Sale");
  console.log("[test] clinic sidebar has NO POS link / Restaurant section ✓");
});
