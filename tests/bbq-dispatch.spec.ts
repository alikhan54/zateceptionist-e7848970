/**
 * BBQ-DISPATCH verify (local preview :5184). bbqtonight only.
 * Asserts: area groups (DHA/Clifton/Gulshan), grouped stop counts, OSRM route distance,
 * a rendered route polyline on the Leaflet map, the ordered stop list contents, and a
 * MANUAL rider assignment (DHA group -> Imran Ali) persisting to an assigned badge.
 * Also exercises the autonomous-mode toggle/button.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path"; import fs from "fs";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:5184";
const EMAIL = process.env.BBQTONIGHT_EMAIL || "";
const PASSWORD = process.env.BBQTONIGHT_PASSWORD || "";
const SHOT = path.join(process.cwd(), "tests/screenshots/bbq-dispatch");
try { fs.mkdirSync(SHOT, { recursive: true }); } catch { /* ignore */ }

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30_000 });
}

async function dismissDialog(page: Page) {
  for (let i = 0; i < 4; i++) {
    const dlg = page.locator('[role="dialog"]');
    if (await dlg.count() === 0) break;
    const closeBtn = dlg.locator('button:has-text("Skip"), button:has-text("Got it"), button:has-text("Close"), button[aria-label="Close"]');
    if (await closeBtn.count()) { await closeBtn.first().click({ force: true }).catch(() => {}); }
    else { await page.keyboard.press("Escape").catch(() => {}); }
    await page.waitForTimeout(600);
  }
}

test("Dispatch: area groups + OSRM route + manual rider assign", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "creds missing");
  test.setTimeout(120_000);

  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 200)); });
  page.on("response", async (r) => {
    if (r.url().includes("restaurant_orders") && r.request().method() === "PATCH") console.log(`PATCH orders -> ${r.status()}`);
    if (r.url().includes("router.project-osrm.org")) console.log(`OSRM -> ${r.status()}`);
  });

  await login(page);
  await page.goto(`${BASE}/operations/dispatch`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await dismissDialog(page);
  await page.waitForTimeout(1500);

  await expect(page.getByRole("heading", { name: /Delivery Dispatch/i })).toBeVisible();

  // area groups
  await page.waitForSelector('[data-testid="dispatch-group-DHA"]', { timeout: 25_000 });
  for (const a of ["DHA", "Clifton", "Gulshan"]) {
    await expect(page.locator(`[data-testid="dispatch-group-${a}"]`)).toBeVisible();
  }

  // allow OSRM routes to compute
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(SHOT, "01-dispatch.png"), fullPage: true });

  // grouped stop counts: DHA 2, Clifton 2, Gulshan 1
  const dha = await page.locator('[data-testid^="dispatch-stop-DHA-"]').count();
  const clf = await page.locator('[data-testid^="dispatch-stop-Clifton-"]').count();
  const gul = await page.locator('[data-testid^="dispatch-stop-Gulshan-"]').count();
  console.log(`[test] stops DHA=${dha} Clifton=${clf} Gulshan=${gul}`);
  expect(dha).toBe(2); expect(clf).toBe(2); expect(gul).toBe(1);

  // OSRM (or est.) distance label present
  await expect(page.locator('[data-testid="dispatch-route-distance-DHA"]')).toBeVisible();

  // map rendered route polyline(s) — SVG path in leaflet overlay pane
  const paths = await page.locator('.leaflet-overlay-pane path').count();
  console.log(`[test] leaflet route paths: ${paths}`);
  expect(paths).toBeGreaterThan(0);

  // DHA ordered stop list contains both customers
  const dhaText = await page.locator('[data-testid="dispatch-stoplist-DHA"]').innerText();
  expect(dhaText).toContain("Bilal Ahmed");
  expect(dhaText).toContain("Hina Raza");

  // MANUAL ASSIGN: DHA group -> Imran Ali
  await page.locator('[data-testid="rider-select-DHA"]').click();
  await page.getByRole("option", { name: /Imran Ali/ }).click();
  await page.locator('[data-testid="assign-btn-DHA"]').click();
  await page.waitForSelector('[data-testid="assigned-rider-DHA"]', { timeout: 25_000 });
  const badge = (await page.locator('[data-testid="assigned-rider-DHA"]').innerText()).trim();
  console.log(`[test] DHA assigned badge: "${badge}"`);
  expect(badge).toContain("Imran Ali");
  await page.screenshot({ path: path.join(SHOT, "02-assigned.png"), fullPage: true });

  // exercise autonomous-mode UI
  await page.locator('[data-testid="mode-autonomous"]').click();
  await expect(page.locator('[data-testid="auto-assign-all"]')).toBeVisible();
  console.log("[test] autonomous mode button visible");
});
