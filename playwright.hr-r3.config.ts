// Standalone Playwright config for HR V4 R3 smoke. Bypasses the shared
// playwright.config.ts which runs a Cosmique auth.setup that's irrelevant
// here. Run with:
//   ZATE_PASSWORD=... npx playwright test --config=playwright.hr-r3.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /hr-r3-smoke\.spec\.ts|check_rules\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.HR_R3_BASE || 'http://localhost:4173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
});
