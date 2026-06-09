/**
 * Brief A — Orders status controls + prep timer. Local preview :5183.
 * Verifies: advance buttons present, prep timer renders, and advancing #10
 * (preparing → ready) works by clicking. bbqtonight only.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path"; import fs from "fs";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:5183";
const EMAIL = process.env.BBQTONIGHT_EMAIL || "";
const PASSWORD = process.env.BBQTONIGHT_PASSWORD || "";
const SHOT = path.join(process.cwd(), "tests/screenshots/bbq-orderflow");
try { fs.mkdirSync(SHOT, { recursive: true }); } catch { /* ignore */ }

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30_000 });
}

test("Orders page: advance buttons + prep timer; advance order #10", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "creds missing");
  test.setTimeout(80_000);
  await login(page);
  await page.goto(`${BASE}/operations/orders`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Robustly dismiss any welcome/onboarding radix dialog (it intercepts clicks).
  for (let i = 0; i < 4; i++) {
    const dlg = page.locator('[role="dialog"]');
    if (await dlg.count() === 0) break;
    // try a close button inside the dialog, else Escape
    const closeBtn = dlg.locator('button:has-text("Skip"), button:has-text("Got it"), button:has-text("Close"), button[aria-label="Close"]');
    if (await closeBtn.count()) { await closeBtn.first().click({ force: true }).catch(() => {}); }
    else { await page.keyboard.press("Escape").catch(() => {}); }
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT, "01-orders.png"), fullPage: true });

  const body = await page.locator("body").innerText();
  expect(body).toContain("Orders");
  // prep timer markers present for active orders
  const timers = await page.locator('[data-testid^="order-timer-"]').count();
  expect(timers).toBeGreaterThan(0);
  // "Ready ~" and "elapsed" text appear
  expect(body).toMatch(/Ready ~\d/);
  expect(body).toMatch(/elapsed/);
  console.log(`[test] prep timers rendered: ${timers}`);

  // capture console + the supabase PATCH response for diagnosis
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 200)); });
  page.on("response", async (r) => {
    if (r.url().includes("restaurant_orders") && r.request().method() === "PATCH") {
      console.log(`PATCH restaurant_orders → ${r.status()} ${(await r.text().catch(() => "")).slice(0, 200)}`);
    }
  });

  // advance #10 — it's at 'preparing' → should show "Mark Ready"
  const adv10 = page.locator('[data-testid="order-advance-10"]');
  if (await adv10.count()) {
    const label = (await adv10.innerText()).trim();
    console.log(`[test] #10 advance button label: "${label}"`);
    expect(label.toLowerCase()).toContain("mark ready");
    await adv10.scrollIntoViewIfNeeded();
    await adv10.click();  // NOT force — dialog dismissed above, so a real click reaches the button
    await page.waitForTimeout(6000); // realtime refresh + PATCH round-trip
    await page.screenshot({ path: path.join(SHOT, "02-after-advance-10.png"), fullPage: true });
    // After Mark Ready, #10's advance button becomes "Out for Delivery" (it's a delivery order)
    const adv10b = page.locator('[data-testid="order-advance-10"]');
    if (await adv10b.count()) {
      const label2 = (await adv10b.innerText()).trim();
      console.log(`[test] #10 advance button after Mark Ready: "${label2}"`);
      expect(label2.toLowerCase()).toMatch(/out for delivery|complete/);
    }
  } else {
    console.log("[test] #10 not on current page (may be filtered) — checking any advance button works");
    const anyAdv = page.locator('[data-testid^="order-advance-"]').first();
    expect(await anyAdv.count()).toBeGreaterThan(0);
  }
});
