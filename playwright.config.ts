import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_PATH = path.join(__dirname, 'tests', '.auth-state.json');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://ai.zatesystems.com',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'on',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'phase1',
      testMatch: /cosmique-phase1-e2e\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'phase2',
      testMatch: /cosmique-phase2-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase3',
      testMatch: /cosmique-phase3-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase4a',
      testMatch: /cosmique-phase4a-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase4b',
      testMatch: /cosmique-phase4b-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase4b-diag',
      testMatch: /cosmique-phase4b-omega-direct\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase5a',
      testMatch: /cosmique-phase5a-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase5d',
      testMatch: /cosmique-phase5d-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase5e',
      testMatch: /cosmique-phase5e-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase6_5',
      testMatch: /cosmique-phase6_5-verify\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase7',
      testMatch: /cosmique-phase7-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'smart-ledger-verify',
      testMatch: /smart-ledger-verification\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user
    },
    {
      name: 'cross-tenant-verification',
      testMatch: /cross-tenant-verification\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — 6 industries, env-var credentials
    },
    {
      name: 'ops-ui-e2e',
      testMatch: /ops-ui-e2e\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — uses BBQ_EMAIL/BBQ_PASSWORD
    },
    {
      name: 'smart-ledger-mobile',
      testMatch: /smart-ledger-mobile\.spec\.ts/,
      use: { browserName: 'chromium' }, // mobile viewport configured inside spec via test.use(devices['iPhone 12'])
    },
    {
      name: 'cross-tenant-mobile',
      testMatch: /cross-tenant-mobile\.spec\.ts/,
      use: { browserName: 'chromium' }, // mobile viewport configured inside spec; no setup dep
    },
    {
      name: 'onboarding-fresh-tenant',
      testMatch: /onboarding-fresh-tenant\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — Admin-API-creates its own user
    },
    {
      name: 'onboarding-isolation-quick',
      testMatch: /onboarding-isolation-quick\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — uses ADEEL_EMAIL/ADEEL_PASSWORD
    },
    {
      name: 'hr-e2e',
      testMatch: /hr-e2e-verification\.spec\.ts/,
      use: { browserName: 'chromium' }, // uses saved .auth-state.json (set inside spec via test.use)
    },
  ],
});
