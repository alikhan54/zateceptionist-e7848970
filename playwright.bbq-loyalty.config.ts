import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: /bbq-loyalty\.spec\.ts/,
  timeout: 90_000, fullyParallel: false, workers: 1, retries: 0, reporter: "list",
  use: { baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5182", headless: true,
    viewport: { width: 1280, height: 900 }, actionTimeout: 15_000, navigationTimeout: 30_000, browserName: "chromium" },
});
