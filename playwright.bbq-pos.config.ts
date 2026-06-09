import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: /bbq-pos\.spec\.ts/,
  timeout: 140_000, fullyParallel: false, workers: 1, retries: 0, reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5186", headless: true,
    viewport: { width: 1440, height: 980 }, actionTimeout: 20_000, navigationTimeout: 35_000, browserName: "chromium" },
});
