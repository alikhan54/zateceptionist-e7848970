import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: /bbq-orderflow\.spec\.ts/,
  timeout: 100_000, fullyParallel: false, workers: 1, retries: 0, reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5183", headless: true,
    viewport: { width: 1366, height: 900 }, actionTimeout: 15_000, navigationTimeout: 30_000, browserName: "chromium" },
});
