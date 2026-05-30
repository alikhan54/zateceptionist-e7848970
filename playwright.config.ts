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
      name: 'phase10a',
      testMatch: /cosmique-phase10a-audit\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase10a-e2e',
      testMatch: /cosmique-phase10a-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase10a-avatar',
      testMatch: /cosmique-phase10a-avatar\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase11-walk',
      testMatch: /cosmique-phase11-comprehensive-walk\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase11_5-verify',
      testMatch: /cosmique-phase11_5-verify\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase12-multi-tenant',
      testMatch: /cosmique-phase12-multi-tenant\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase12-master',
      testMatch: /cosmique-phase12-master\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium', storageState: STORAGE_PATH },
    },
    {
      name: 'phase13a-mobile-baseline',
      testMatch: /cosmique-phase13a-mobile-baseline\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium' },
    },
    {
      name: 'phase13a-mobile',
      testMatch: /cosmique-phase13a-mobile\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium' },
    },
    {
      name: 'phase13d-diagnose',
      testMatch: /cosmique-phase13d-diagnose\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium' },
    },
    {
      name: 'phase13d-dispatch',
      testMatch: /cosmique-phase13d-dispatch\.spec\.ts/,
      dependencies: ['setup'],
      use: { browserName: 'chromium' },
    },
    {
      name: 'smart-ledger-verify',
      testMatch: /smart-ledger-verification\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user
    },
    {
      name: 'video-premium',
      testMatch: /video-premium-verification\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as zate user (env-driven)
    },
    {
      name: 'smart-ledger-jobs',
      testMatch: /smart-ledger-jobs\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user; D7-A CRUD verification
    },
    {
      name: 'smart-ledger-finance',
      testMatch: /smart-ledger-finance\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user; D7-B Finance verification
    },
    {
      name: 'smart-ledger-invoices',
      testMatch: /smart-ledger-invoices\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user; D7-C Invoices CRUD verification
    },
    {
      name: 'smart-ledger-reminders',
      testMatch: /smart-ledger-reminders\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as Smart Ledger user; D7-D Reminders CRUD verification
    },
    {
      name: 'smart-ledger-dashboard-parity',
      testMatch: /smart-ledger-dashboard-parity\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login; MoneyPex parity F5 (calendar) + F6 (workload)
    },
    {
      name: 'smart-ledger-chat-widget',
      testMatch: /smart-ledger-chat-widget\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login; D7-E ACCOUNTANT chat widget
    },
    {
      name: 'smart-ledger-add-client',
      testMatch: /smart-ledger-add-client\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login; D7-F Add/Edit Client CRUD
    },
    {
      name: 'smart-ledger-comprehensive-phase1-e2e',
      testMatch: /smart-ledger-comprehensive-phase1-e2e\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login; Phase 10 canonical E2E
    },
    {
      name: 'smart-ledger-comprehensive-e2e',
      testMatch: /smart-ledger-comprehensive-e2e\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — full E2E matrix (auth + dashboard + clients + jobs + placeholders + nav + mobile + cross-tenant + session security)
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
    {
      name: 'zate-setup',
      testMatch: /zate-auth\.setup\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'hr-e2e-round2',
      testMatch: /hr-e2e-round2-zate\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-e2e-round3',
      testMatch: /hr-e2e-round3-interactive\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-askai-nav',
      testMatch: /hr-askai-navigation\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-create-employee-bug',
      testMatch: /hr-create-employee-bug\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-hiring-pipeline',
      testMatch: /hr-hiring-pipeline\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-sourcing-pipeline',
      testMatch: /hr-sourcing-pipeline\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-hiring-complete',
      testMatch: /hr-hiring-complete\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-data-integrity',
      testMatch: /hr-data-integrity\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-v3-fixes',
      testMatch: /hr-v3-fixes-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'arch-fix-verify',
      testMatch: /arch-fix-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'deep-fix-verify',
      testMatch: /deep-fix-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'premium-tier-verify',
      testMatch: /premium-tier-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-real-browser-debug',
      testMatch: /hr-real-browser-debug\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'final-fixes-verify',
      testMatch: /final-fixes-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'auto-mode-verify',
      testMatch: /auto-mode-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'enrichment-and-interviews-verify',
      testMatch: /enrichment-and-interviews-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-hidden-features',
      testMatch: /hr-hidden-features\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-f4f5-smoke',
      testMatch: /hr-f4f5-smoke\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'hr-rls-live-verify',
      testMatch: /hr-rls-live-verify\.spec\.ts/,
      dependencies: ['zate-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-zate.json'),
      },
    },
    {
      name: 'settings-acsfx-setup',
      testMatch: /settings-acsfx-auth\.setup\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'settings-audit',
      testMatch: /settings-audit\.spec\.ts/,
      dependencies: ['settings-acsfx-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-acsfx.json'),
      },
    },
    {
      name: 'settings-discovery',
      testMatch: /settings-discovery\.spec\.ts/,
      dependencies: ['settings-acsfx-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-acsfx.json'),
      },
    },
    {
      name: 'settings-audit-deep',
      testMatch: /settings-audit-deep\.spec\.ts/,
      dependencies: ['settings-acsfx-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-acsfx.json'),
      },
    },
    {
      name: 'settings-audit-isolation',
      testMatch: /settings-audit-isolation\.spec\.ts/,
      dependencies: ['settings-acsfx-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-acsfx.json'),
      },
    },
    {
      name: 'settings-aamerah-setup',
      testMatch: /settings-aamerah-auth\.setup\.ts/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'settings-empty-state',
      testMatch: /settings-audit-empty-state\.spec\.ts/,
      dependencies: ['settings-aamerah-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-aamerah.json'),
      },
    },
    {
      name: 'settings-q1-team',
      testMatch: /settings-q1-team-access\.spec\.ts/,
      dependencies: ['settings-acsfx-setup'],
      use: {
        browserName: 'chromium',
        storageState: path.join(__dirname, 'tests', '.auth-state-acsfx.json'),
      },
    },
    {
      name: 'hr-prod-qa',
      testMatch: /hr-prod-qa\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login as zate admin (ZATE_PASSWORD); production warrior QA
    },
    {
      name: 'hr-v6-verify',
      testMatch: /hr-v6-verify\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login; V6 fix verification against local preview (HR_V6_BASE)
    },
    {
      name: 'hr-v7-verify',
      testMatch: /hr-v7-verify\.spec\.ts/,
      use: { browserName: 'chromium' }, // no setup dep — fresh login; V7 fix verification against local preview (HR_V7_BASE/HR_V6_BASE)
    },
  ],
});
