/**
 * Wave 2b — MoneyPex Add/Edit Client form: conditional-render + name-compose E2E.
 *
 * STATUS: authored but NOT yet executed in this build session — the smart-ledger staff
 * temp passwords are "forced reset on first login" (using them would disrupt the real
 * admin account), and the browser→PostgREST SAVE path was blocked by the T20 pooler
 * read-only state at build time. The form's save-path + name-compose + encryption
 * triggers were instead VERIFIED-DB directly against the writable primary
 * (.tmp_diag/sl_verify_form_save.py — all 3 client types pass).
 *
 * TO RUN (once a non-forced-reset smart-ledger login exists + pooler is read-write):
 *   cd D:/420-system/frontend-sl-moneypex
 *   npm run build && npm run preview -- --port 4178   # serve the new build
 *   E2E_BASE_URL=http://localhost:4178 \
 *   SMART_LEDGER_EMAIL='<user>' SMART_LEDGER_PASSWORD='<pass>' \
 *   npx playwright test tests/smart-ledger-moneypex-form.spec.ts --project=chromium
 *
 * Covers: (1) Limited — company_no + Business Name shown, person fields hidden;
 *         (2) Sole Trader — first/last + Business Name shown, company_no hidden;
 *         (3) Person — first/last shown, Business Name hidden; name composes from first+last.
 */
import { test, expect, Page } from "@playwright/test";

const EMAIL = process.env.SMART_LEDGER_EMAIL || "team@smartledgersolutions.co.uk";
const PASSWORD = process.env.SMART_LEDGER_PASSWORD || "";

async function login(page: Page) {
  if (!PASSWORD) throw new Error("SMART_LEDGER_PASSWORD env var is required");
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(accounting|dashboard)/, { timeout: 30_000 });
}

async function openAddClient(page: Page) {
  await page.goto("/accounting/clients", { waitUntil: "networkidle" });
  await page.getByTestId("clients-add-button").click();
  await expect(page.getByTestId("add-client-dialog")).toBeVisible();
  // 3 MoneyPex sections present for every type
  await expect(page.getByTestId("acf-section-basic")).toBeVisible();
  await expect(page.getByTestId("acf-section-address")).toBeVisible();
  await expect(page.getByTestId("acf-section-misc")).toBeVisible();
}

async function setType(page: Page, label: string) {
  await page.getByTestId("acf-client-type").click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test("2b-1 Limited Company shows company_no + Business Name, hides person fields", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await openAddClient(page);
  await setType(page, "Limited Company");
  await expect(page.getByTestId("acf-company-no")).toBeVisible();
  await expect(page.getByTestId("acf-name")).toBeVisible();          // Business Name
  await expect(page.getByTestId("acf-first-name")).toHaveCount(0);   // person field hidden
});

test("2b-2 Sole Trader shows first/last + Business Name, hides company_no", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await openAddClient(page);
  await setType(page, "Sole Trader");
  await expect(page.getByTestId("acf-first-name")).toBeVisible();
  await expect(page.getByTestId("acf-last-name")).toBeVisible();
  await expect(page.getByTestId("acf-name")).toBeVisible();          // Business Name (optional)
  await expect(page.getByTestId("acf-company-no")).toHaveCount(0);   // Limited-only field hidden
});

test("2b-3 Person hides Business Name + company_no; name composes from first+last", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await openAddClient(page);
  await setType(page, "Person");
  await expect(page.getByTestId("acf-first-name")).toBeVisible();
  await expect(page.getByTestId("acf-name")).toHaveCount(0);         // no Business Name for Person
  await expect(page.getByTestId("acf-company-no")).toHaveCount(0);

  // name-compose: capture the outgoing create payload (works even if the save 503s)
  await page.getByTestId("acf-reference-no").fill("E2E-PERSON-1");
  await page.getByTestId("acf-first-name").fill("Sam");
  await page.getByTestId("acf-last-name").fill("Smith");
  // partner_responsible is required — pick first option if it's a select, else type
  const reqBodies: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /accounting_clients/i.test(r.url())) reqBodies.push(r.postData() || "");
  });
  await page.getByTestId("acf-submit").click();
  await page.waitForTimeout(2500);
  const composed = reqBodies.find((b) => /"name"\s*:\s*"Sam Smith"/.test(b));
  expect(composed, "create payload should carry composed name 'Sam Smith'").toBeTruthy();
});
