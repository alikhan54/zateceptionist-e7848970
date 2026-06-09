/**
 * BBQ demo-hygiene verify (local preview :5185). bbqtonight only.
 * 1) Orders: delivery "ready" advance button reads "Dispatch ->" (not the stuck-looking "Out for Delivery").
 * 2) Menu Editor: per-item Edit works (open -> prefilled -> rename -> save -> reflected -> revert).
 * 3) KDS: station-column board is alive (stations, tickets, big timers, Start + Mark Ready actions).
 * 4) Dispatch: manual assign advances the group to dispatched (rider badge shows).
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path"; import fs from "fs";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:5185";
const EMAIL = process.env.BBQTONIGHT_EMAIL || "";
const PASSWORD = process.env.BBQTONIGHT_PASSWORD || "";
const SHOT = path.join(process.cwd(), "tests/screenshots/bbq-hygiene");
try { fs.mkdirSync(SHOT, { recursive: true }); } catch { /* ignore */ }

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
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

test("demo hygiene: orders button, menu edit, KDS board, dispatch->dispatched", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "creds missing");
  test.setTimeout(120_000);
  page.on("response", async (r) => { if (r.url().includes("restaurant_orders") && r.request().method() === "PATCH") console.log(`PATCH orders -> ${r.status()}`); });
  await login(page);

  // 1) ORDERS button clarity
  await page.goto(`${BASE}/operations/orders`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); await dismiss(page); await page.waitForTimeout(1000);
  const bodyOrders = await page.locator("body").innerText();
  expect(bodyOrders).toMatch(/Dispatch\s*→|Dispatch\s*->/);
  expect(bodyOrders).not.toContain("Out for Delivery");
  console.log("[test] Orders shows 'Dispatch →' action (not 'Out for Delivery')");

  // 2) MENU EDITOR edit + revert
  await page.goto(`${BASE}/operations/menu`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); await dismiss(page);
  await page.waitForSelector('[data-testid^="menu-edit-"]', { timeout: 20_000 });
  // delete buttons present (per-item)
  expect(await page.locator('[data-testid^="menu-delete-"]').count()).toBeGreaterThan(0);
  await page.locator('[data-testid^="menu-edit-"]').first().click();
  await page.waitForSelector('[data-testid="menu-edit-dialog"]', { timeout: 10_000 });
  const orig = await page.locator('[data-testid="menu-edit-name"]').inputValue();
  expect(orig.length).toBeGreaterThan(0);
  console.log(`[test] edit dialog prefilled name: "${orig}"`);
  await page.locator('[data-testid="menu-edit-name"]').fill(`${orig} ✏️`);
  await page.locator('[data-testid="menu-edit-save"]').click();
  await page.waitForTimeout(2500);
  expect(await page.locator("body").innerText()).toContain(`${orig} ✏️`);
  console.log("[test] menu edit saved + reflected");
  // revert
  await page.locator('[data-testid^="menu-edit-"]').first().click();
  await page.waitForSelector('[data-testid="menu-edit-dialog"]', { timeout: 10_000 });
  await page.locator('[data-testid="menu-edit-name"]').fill(orig);
  await page.locator('[data-testid="menu-edit-save"]').click();
  await page.waitForTimeout(2500);
  console.log("[test] menu edit reverted (menu pristine)");

  // 3) KDS station board alive
  await page.goto(`${BASE}/operations/kitchen-display`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); await dismiss(page);
  await page.waitForSelector('[data-testid="kds-board"]', { timeout: 20_000 });
  const stations = await page.locator('[data-testid^="kds-station-"]').count();
  const tickets = await page.locator('[data-testid^="kds-ticket-"]').count();
  const timers = await page.locator('[data-testid^="kds-timer-"]').count();
  const starts = await page.locator('[data-testid^="kds-start-"]').count();
  const readies = await page.locator('[data-testid^="kds-ready-"]').count();
  console.log(`[test] KDS stations=${stations} tickets=${tickets} timers=${timers} start=${starts} ready=${readies}`);
  expect(stations).toBeGreaterThanOrEqual(2);
  expect(tickets).toBeGreaterThanOrEqual(5);
  expect(timers).toBeGreaterThanOrEqual(5);
  expect(starts).toBeGreaterThanOrEqual(1);   // new tickets
  expect(readies).toBeGreaterThanOrEqual(1);  // preparing tickets
  await page.screenshot({ path: path.join(SHOT, "01-kds.png"), fullPage: true });

  // 4) DISPATCH assign -> dispatched
  await page.goto(`${BASE}/operations/dispatch`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500); await dismiss(page);
  await page.waitForSelector('[data-testid="dispatch-group-DHA"]', { timeout: 25_000 });
  await page.waitForTimeout(4000); // routes
  await page.locator('[data-testid="rider-select-DHA"]').click();
  await page.getByRole("option", { name: /Imran Ali/ }).click();
  await page.locator('[data-testid="assign-btn-DHA"]').click();
  await page.waitForSelector('[data-testid="assigned-rider-DHA"]', { timeout: 25_000 });
  const badge = (await page.locator('[data-testid="assigned-rider-DHA"]').innerText()).trim();
  console.log(`[test] dispatch DHA assigned (->dispatched): "${badge}"`);
  expect(badge).toContain("Imran Ali");
  await page.screenshot({ path: path.join(SHOT, "02-dispatch.png"), fullPage: true });
});
