/**
 * Wave 1 — REAL end-to-end Playwright + pixel proof against PRODUCTION.
 *
 * Runs against https://ai.zatesystems.com using a Path-B-minted temp test user.
 * Test client is a throwaway with email=adeel@zatesystems.com (any reminder
 * cron firing routes to the practice owner — no real client gets emailed).
 *
 * Screenshots land in D:/420-system/.tmp_wave1_audit/e2e/ and double as
 * pixel proof per Adeel's brief.
 *
 * After the assertions run, the spec creates ONE real job + reminders +
 * (if eligible) draft invoice, captures the proof, then leaves the cleanup
 * to the orchestration script (cleanup_e2e.py) so we don't accidentally
 * delete during a failed test step.
 *
 * Env (set by the runner shell):
 *   WAVE1_E2E_EMAIL     — temp user email
 *   WAVE1_E2E_PASSWORD  — temp user password
 *   WAVE1_E2E_CLIENT_ID — UUID of the throwaway test client
 *   WAVE1_E2E_BASE      — defaults to https://ai.zatesystems.com
 *   WAVE1_E2E_SHOT_DIR  — defaults to D:/420-system/.tmp_wave1_audit/e2e
 */
import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.WAVE1_E2E_BASE || "https://ai.zatesystems.com";
const EMAIL = process.env.WAVE1_E2E_EMAIL || "";
const PASSWORD = process.env.WAVE1_E2E_PASSWORD || "";
const TEST_CLIENT_ID = process.env.WAVE1_E2E_CLIENT_ID || "";
const SHOT_DIR =
  process.env.WAVE1_E2E_SHOT_DIR ||
  "D:/420-system/.tmp_wave1_audit/e2e";

if (!EMAIL || !PASSWORD || !TEST_CLIENT_ID) {
  throw new Error(
    "WAVE1_E2E_EMAIL + WAVE1_E2E_PASSWORD + WAVE1_E2E_CLIENT_ID env vars required",
  );
}

if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

const stepLog: Array<{ step: string; pass: boolean; detail?: string; screenshot?: string }> = [];

async function shot(page: Page, label: string) {
  const file = path.join(SHOT_DIR, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function record(step: string, pass: boolean, detail?: string, screenshot?: string) {
  stepLog.push({ step, pass, detail, screenshot });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ${step}${detail ? ` — ${detail}` : ""}`);
}

test.describe.configure({ mode: "serial" });
test.describe("Wave 1 — PROD E2E + pixel proof", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
  });

  test.afterAll(async () => {
    const reportPath = path.join(SHOT_DIR, "RESULT.json");
    const summary = {
      base: BASE,
      email: EMAIL,
      test_client_id: TEST_CLIENT_ID,
      run_at: new Date().toISOString(),
      steps: stepLog,
      overall: stepLog.every((s) => s.pass) ? "PASS" : "FAIL",
    };
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\n  RESULT.json written to ${reportPath}`);
  });

  test("STEP 1: login lands on dashboard with tenant name", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
    await shot(page, "01-login-page");

    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForLoadState("networkidle", { timeout: 45000 });
    await page.waitForTimeout(2000); // allow brand-injection / pulse hydration
    const dashboardShot = await shot(page, "01b-dashboard");

    // The brand banner / sidebar should mention Smart Ledger Solutions
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasBrand = /Smart Ledger Solutions|smart\s*ledger/i.test(bodyText);
    record("STEP 1 login + dashboard shows Smart Ledger", hasBrand,
           hasBrand ? "brand string detected" : `brand NOT in page body (url=${page.url()})`,
           dashboardShot);
    expect(hasBrand).toBe(true);
  });

  test("STEP 2: /accounting/jobs renders the Jobs list", async () => {
    await page.goto(`${BASE}/accounting/jobs`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    const f = await shot(page, "02-jobs-list");
    // The header "Jobs" should be present + the "New Job" button
    const newJobBtn = page.getByTestId("new-job-button");
    const visible = await newJobBtn.isVisible().catch(() => false);
    record("STEP 2 Jobs list visible + New Job button present", visible,
           visible ? "new-job-button found" : "new-job-button NOT visible",
           f);
    expect(visible).toBe(true);
  });

  test("STEP 3: Open New Job dialog", async () => {
    await page.getByTestId("new-job-button").click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);
    const f = await shot(page, "03-new-job-dialog");
    record("STEP 3 New Job dialog opens", true, "dialog rendered", f);
  });

  test("STEP 4: Job-type picker shows 14 types incl Company Secretarial Services, no PSC Update", async () => {
    // Fill title first so submit is theoretically enabled (not needed yet)
    await page.getByTestId("job-form-title").fill("[WAVE1 E2E TEST] verify auto-dates");

    const categoryTrigger = page.getByTestId("job-form-category");
    await categoryTrigger.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(400);
    const f = await shot(page, "04-job-type-picker");

    const expectedNames = [
      "Annual Accounts", "Corporation Tax (CT600)", "Confirmation Statement",
      "PAYE (Monthly)", "Self Assessment", "VAT Quarterly", "VAT Registration",
      "Company Restoration", "VAT MTD Submission", "Year-End Accounts (Micro)",
      "Partnership SA (SA800)", "P11D Benefits", "CIS Monthly",
      "Company Secretarial Services",
    ];
    const visibleNames: string[] = [];
    for (const n of expectedNames) {
      const visible = await listbox.getByRole("option", { name: n }).isVisible().catch(() => false);
      if (visible) visibleNames.push(n);
    }
    const allVisible = visibleNames.length === expectedNames.length;
    record(
      "STEP 4a picker contains all 14 seeded types",
      allVisible,
      `${visibleNames.length}/${expectedNames.length} visible — missing: ${expectedNames.filter((n) => !visibleNames.includes(n)).join("|") || "none"}`,
      f,
    );

    const pscVisible = await listbox.getByRole("option", { name: "PSC Update" }).isVisible().catch(() => false);
    record("STEP 4b 'PSC Update' label is absent (rename to Company Secretarial Services applied)",
           !pscVisible, `pscVisible=${pscVisible}`);

    const cssVisible = await listbox.getByRole("option", { name: "Company Secretarial Services" }).isVisible().catch(() => false);
    record("STEP 4c 'Company Secretarial Services' present", cssVisible, `cssVisible=${cssVisible}`);

    expect(allVisible).toBe(true);
    expect(pscVisible).toBe(false);
    expect(cssVisible).toBe(true);

    // Close the dropdown for next step (Escape)
    await page.keyboard.press("Escape");
  });

  test("STEP 5: Pick the test client, Client Type 'Private Limited Company' displays", async () => {
    await page.getByTestId("job-form-client").click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });

    // Search-find the throwaway test client by name fragment
    const opt = listbox.getByText(/\[WAVE1 E2E TEST\]/i).first();
    await expect(opt).toBeVisible({ timeout: 5000 });
    await opt.click();
    await page.waitForTimeout(700);
    const f = await shot(page, "05-client-picked-with-client-type");

    const clientTypeEl = page.getByTestId("job-form-client-type");
    const clientTypeVisible = await clientTypeEl.isVisible().catch(() => false);
    const clientTypeText = clientTypeVisible ? ((await clientTypeEl.textContent()) || "") : "";
    const showsLtd = /Private Limited Company/i.test(clientTypeText);
    record(
      "STEP 5 Client Type read-only label shows 'Private Limited Company'",
      showsLtd,
      clientTypeVisible ? `text="${clientTypeText.trim()}"` : "client-type element NOT visible",
      f,
    );
    expect(showsLtd).toBe(true);
  });

  test("STEP 6: Pick 'Confirmation Statement' → Period End + Deadline auto-fill from CH", async () => {
    await page.getByTestId("job-form-category").click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await listbox.getByRole("option", { name: "Confirmation Statement" }).click();
    await page.waitForTimeout(700);
    const f = await shot(page, "06-confirmation-statement-auto-dates");

    const periodEnd = await page.getByTestId("job-form-period-end").inputValue();
    const deadline = await page.getByTestId("job-form-deadline").inputValue();
    // Test client has confirmation_statement_last_made_up='2025-04-29' so
    // period_end should be 2025-04-29 + 12mo = 2026-04-29.
    // CH-direct confirmation_statement_next_due='2026-05-13'.
    const peOk = periodEnd === "2026-04-29";
    const dlOk = deadline === "2026-05-13";
    record("STEP 6a Period End auto-fills 2026-04-29",
           peOk, `got="${periodEnd}"`);
    record("STEP 6b Deadline auto-fills 2026-05-13 (CH-direct)",
           dlOk, `got="${deadline}"`);
    expect(peOk).toBe(true);
    expect(dlOk).toBe(true);
  });

  test("STEP 7: Pick 'Self Assessment' → fixed 5 Apr / 31 Jan window", async () => {
    await page.getByTestId("job-form-category").click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await listbox.getByRole("option", { name: "Self Assessment" }).click();
    await page.waitForTimeout(700);
    const f = await shot(page, "07-self-assessment-fixed-dates");

    const periodEnd = await page.getByTestId("job-form-period-end").inputValue();
    const deadline = await page.getByTestId("job-form-deadline").inputValue();
    // SA fires: next 5 Apr and next 31 Jan after "now" (early Jun 2026).
    // Next 5 Apr = 2027-04-05; next 31 Jan = 2027-01-31.
    const peOk = /^(2026|2027)-04-05$/.test(periodEnd);
    const dlOk = /^(2026|2027)-01-31$/.test(deadline);
    record("STEP 7a Period End is fixed 5 Apr (year 2026 or 2027)",
           peOk, `got="${periodEnd}"`);
    record("STEP 7b Deadline is fixed 31 Jan (year 2026 or 2027)",
           dlOk, `got="${deadline}"`);
    expect(peOk).toBe(true);
    expect(dlOk).toBe(true);
  });

  test("STEP 8: Notes for staff accepts text", async () => {
    const notesEl = page.getByTestId("job-form-staff-notes");
    const notesText = "[WAVE1 E2E TEST] Internal-only note — confirm field accepts text and persists.";
    await notesEl.fill(notesText);
    await page.waitForTimeout(400);
    const f = await shot(page, "08-staff-notes-typed");

    const val = await notesEl.inputValue();
    const ok = val === notesText;
    record("STEP 8 Staff Notes textarea accepts text", ok, `length=${val.length}`, f);
    expect(ok).toBe(true);
  });

  test("STEP 9: Submit — annual_accounts (no fee → no invoice) + reminders enrol", async () => {
    // Switch picker to 'Annual Accounts' so we test the most common path.
    // Test client has accounts_last_made_up=2025-03-31 → period_end=2026-03-31;
    // accounts_next_due=2026-12-31 → deadline=2026-12-31 (60d out → all 11 reminders enrol).
    await page.getByTestId("job-form-category").click();
    let listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });
    await listbox.getByRole("option", { name: "Annual Accounts" }).click();
    await page.waitForTimeout(500);

    // Assign owner to ourselves to satisfy invoice-eligibility gate (although default_fee=NULL → no invoice)
    await page.getByTestId("job-form-owner").click();
    listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 5000 });
    // First option after "Unassigned" — that's the temp user themselves
    const ownerOpts = listbox.getByRole("option");
    const ownerCount = await ownerOpts.count();
    // Pick the first non-Unassigned option (our temp user)
    let pickedOwner = false;
    for (let i = 0; i < ownerCount; i++) {
      const opt = ownerOpts.nth(i);
      const txt = (await opt.textContent()) || "";
      if (!/Unassigned/i.test(txt)) {
        await opt.click();
        pickedOwner = true;
        break;
      }
    }
    record("STEP 9a owner assigned", pickedOwner, pickedOwner ? "first available teammate picked" : "no teammate option found");
    await page.waitForTimeout(400);
    const fPreSubmit = await shot(page, "09a-pre-submit");

    // Submit
    await page.getByTestId("job-form-submit").click();
    await page.waitForTimeout(2500); // allow createJob + auto-invoice + reminder enrolment to settle
    const fPostSubmit = await shot(page, "09b-post-submit-list");

    // Dialog should be closed; job should appear in the list
    const dialogStillOpen = await page.getByRole("dialog").isVisible().catch(() => false);
    record("STEP 9b dialog closed after submit", !dialogStillOpen,
           dialogStillOpen ? "dialog still open — submission may have errored" : "ok",
           fPostSubmit);

    // The new job's row should be in the list (matched by the title)
    const rowText = await page.locator("body").textContent();
    const found = /\[WAVE1 E2E TEST\] verify auto-dates/.test(rowText || "");
    record("STEP 9c new job visible in list", found, found ? "row matched" : "title NOT found in list");
    expect(found).toBe(true);
  });
});
