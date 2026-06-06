/**
 * Wave 1 Phase B verification — Create Job picker reads from accounting_job_types.
 *
 * Verifies in the live preview:
 *   1. Login as Smart Ledger admin (Adil) at /login
 *   2. Navigate to /accounting/jobs
 *   3. Click "Add Job"
 *   4. Open the "UK filing category" Select
 *   5. Assert 14 options visible (DB-driven) — NOT the legacy 14 codes
 *   6. Assert "Company Secretarial Services" present, "PSC Update" absent
 *
 * Run locally against vite preview (port 4173):
 *   cd D:/420-system/frontend-smart-ledger-wave1
 *   E2E_BASE_URL=http://localhost:4173 \
 *     SMART_LEDGER_EMAIL='team@smartledgersolutions.co.uk' \
 *     SMART_LEDGER_PASSWORD='<password>' \
 *     npx playwright test tests/wave1-phase-b-picker.spec.ts --project=chromium
 *
 * Auth-blocked exits cleanly with test.skip so the rest of the suite still runs.
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:4173";
const EMAIL = process.env.SMART_LEDGER_EMAIL || "team@smartledgersolutions.co.uk";
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || "";

// Names expected from the DB seed (migration 38, sort_order asc):
const EXPECTED_JOB_TYPE_NAMES = [
  "Annual Accounts",
  "Corporation Tax (CT600)",
  "Confirmation Statement",
  "PAYE (Monthly)",
  "Self Assessment",
  "VAT Quarterly",
  "VAT Registration",
  "Company Restoration",
  "VAT MTD Submission",
  "Year-End Accounts (Micro)",
  "Partnership SA (SA800)",
  "P11D Benefits",
  "CIS Monthly",
  "Company Secretarial Services",
];

test.describe("Wave 1 Phase B — Create Job picker reads accounting_job_types", () => {
  test.beforeEach(async ({ page }) => {
    if (!PASSWORD) test.skip(true, "SMART_LEDGER_PASSWORD env var not set");

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForLoadState("networkidle", { timeout: 30000 });
  });

  test("picker shows 14 DB-seeded types incl. Company Secretarial Services, not PSC Update", async ({ page }) => {
    await page.goto(`${BASE}/accounting/jobs`, { waitUntil: "networkidle" });

    // Open the Create Job dialog (button is data-testid="new-job-button", label "New Job")
    const addBtn = page.getByTestId("new-job-button");
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });

    // Click the category Select trigger
    const categoryTrigger = page.getByTestId("job-form-category");
    await expect(categoryTrigger).toBeVisible();
    await categoryTrigger.click();

    // Listbox should be open. Wait for the seeded names to render.
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });

    // Assert each expected job_type name is visible inside the listbox
    for (const name of EXPECTED_JOB_TYPE_NAMES) {
      await expect(listbox.getByRole("option", { name })).toBeVisible();
    }

    // Assert "PSC Update" is NOT in the listbox (rename)
    await expect(listbox.getByRole("option", { name: "PSC Update" })).toHaveCount(0);

    // Count options that aren't the "Untagged" placeholder — should be exactly 14
    const allOptions = listbox.getByRole("option");
    const total = await allOptions.count();
    // 14 job types + 1 "Untagged" sentinel = 15. Don't assert exact in case Untagged label varies.
    expect(total).toBeGreaterThanOrEqual(14);
    expect(total).toBeLessThanOrEqual(15);
  });
});
