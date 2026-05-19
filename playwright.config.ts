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
      name: 'smart-ledger-verify',
      testMatch: /smart-ledger-verification\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user
    },
  ],
});
