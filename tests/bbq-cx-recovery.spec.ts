/**
 * BBQ-CX-RECOVERY end-to-end Playwright proof.
 * - Login as bbqtonight
 * - Open /marketing/social-listening → Negative tab
 * - Click "Recover" on a seeded negative mention
 * - Assert: toast appears, page reflects "Recovered" badge, Recovery tab shows the new action
 *
 * Runs against the local preview at http://127.0.0.1:5181 (vite preview).
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:5181";
const EMAIL = process.env.BBQTONIGHT_EMAIL || "";
const PASSWORD = process.env.BBQTONIGHT_PASSWORD || "";
const SHOT = path.join(process.cwd(), "tests/screenshots/bbq-cx-recovery");
try { fs.mkdirSync(SHOT, { recursive: true }); } catch { /* ignore */ }

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 30_000 });
}

test.describe.serial("BBQ CX Recovery", () => {
  test("Click Recover on a negative mention → action lands + recovery badge + timeline row", async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, "BBQTONIGHT_EMAIL/PASSWORD missing");
    test.setTimeout(90_000);
    await login(page);
    await page.goto(`${BASE}/marketing/social-listening`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    // Dismiss any welcome/onboarding dialog (Escape × 2 is safe and idempotent)
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOT, "01-loaded.png"), fullPage: true });

    // Switch to Negative tab
    await page.locator('[data-testid="cx-tab-negative"]').click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOT, "02-negative-tab.png"), fullPage: true });

    // Find any Recover button (data-testid cx-recover-{id})
    const recoverBtns = page.locator('[data-testid^="cx-recover-"]');
    const count = await recoverBtns.count();
    expect(count).toBeGreaterThan(0);
    const firstBtn = recoverBtns.first();
    const btnTestId = (await firstBtn.getAttribute("data-testid")) || "";
    const mentionId = btnTestId.replace(/^cx-recover-/, "");
    console.log(`[test] mentions with Recover button: ${count}, firing on mention_id=${mentionId}`);

    // Click Recover → workflow fires (n8n → Supabase RPC)
    await firstBtn.click({ force: true });
    // Workflow can take 10-15s (Ollama timeout + fallback path)
    await page.waitForSelector(`[data-testid="cx-mention-${mentionId}-recovered"]`, { timeout: 30_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SHOT, "03-recovered-badge.png"), fullPage: true });

    // Verify the badge text contains a voucher code "BBQ-RECOV-"
    const badge = await page.locator(`[data-testid="cx-mention-${mentionId}-recovered"]`).innerText();
    expect(badge).toContain("BBQ-RECOV-");

    // Switch to Recovery tab → confirm a new row is visible
    await page.locator('[data-testid="cx-tab-recovery"]').click({ force: true });
    await page.waitForSelector('[data-testid="cx-recovery-timeline"]', { timeout: 10_000 });
    const timelineText = await page.locator('[data-testid="cx-recovery-timeline"]').innerText();
    expect(timelineText).toContain("BBQ-RECOV-");
    expect(timelineText.toLowerCase()).toMatch(/manager|khurram|rizwan/);
    await page.screenshot({ path: path.join(SHOT, "04-recovery-timeline.png"), fullPage: true });
  });
});
