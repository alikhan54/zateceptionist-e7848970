import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: /bbq-pwa-isolation\.spec\.ts/,
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5180",
    headless: true,
    viewport: { width: 414, height: 896 }, // mobile-first
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    browserName: "chromium",
  },
});
