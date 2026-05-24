/**
 * Settings v2 Deep Audit — X-CUT 3: empty-state pass on aamerah.
 *
 * aamerah is the chosen empty-state target per Phase 1 plan (real_estate,
 * onboarding_completed=Y, 0 rows across all Settings-relevant tables).
 *
 * If AAMERAH_PASSWORD env var is unset, the auth-setup project skips and
 * these tests skip with it. That state becomes DEPLOY_PENDING in the report.
 *
 * Additive only — May 23 spec untouched.
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dismissTutorialIfPresent } from './helpers/dismiss-onboarding';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHOT_DIR = path.resolve(__dirname, '..', '..', '.tmp_settings_v2', '04_deep_audit_run', 'empty_state');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

interface EmptyStateObservation {
  page: string;
  url: string;
  renderedHeading: string[];
  emptyStateCopy: string | null;
  hasMeaningfulEmptyState: boolean;
  pageErrors: string[];
}
const observations: EmptyStateObservation[] = [];

test.beforeEach(async ({ page }) => {
  // If we have no auth cookies (AAMERAH_PASSWORD was not provided), skip the
  // empty-state pass cleanly. The DEPLOY_PENDING classification in the Phase 2
  // report covers this — tests are wired and ready but require fresh creds.
  const cookies = await page.context().cookies();
  if (cookies.length === 0) {
    test.skip(true, 'No aamerah auth cookies (AAMERAH_PASSWORD env var unset) — empty-state pass deferred.');
  }
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await dismissTutorialIfPresent(page);
});

test.afterAll(async () => {
  fs.writeFileSync(
    path.join(SHOT_DIR, 'x3_empty_state_observations.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), tenant: 'aamerah', observations }, null, 2),
  );
});

const PAGES = [
  { name: 'company_info', path: '/settings/business-profile/company' },
  { name: 'knowledge_base', path: '/settings/business-profile/knowledge' },
  { name: 'ai_training', path: '/settings/business-profile/training' },
  { name: 'integrations', path: '/settings/integrations' },
  { name: 'team', path: '/settings/team' },
  { name: 'billing', path: '/settings/billing' },
  { name: 'notifications', path: '/settings/notifications' },
  { name: 'outreach', path: '/settings/outreach' },
];

for (const p of PAGES) {
  test(`Empty-state aamerah: ${p.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');
    await dismissTutorialIfPresent(page);
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(SHOT_DIR, `${p.name}_aamerah.png`), fullPage: true });

    const data = await page.evaluate(() => {
      const h1 = Array.from(document.querySelectorAll('h1')).map((el) => (el.textContent || '').trim());
      const h2 = Array.from(document.querySelectorAll('h2')).map((el) => (el.textContent || '').trim());
      const headings = [...h1, ...h2];
      const bodyText = (document.body.textContent || '').toLowerCase();
      // Capture any explicit empty-state copy phrases
      const phrases = [
        'no entries', 'no data', 'nothing here', 'get started', 'add your first',
        'no members', 'no invitations', 'no activity', 'empty', 'no knowledge',
      ];
      const found = phrases.filter((p) => bodyText.includes(p));
      return { headings, found_phrases: found, body_length: bodyText.length };
    });

    const obs: EmptyStateObservation = {
      page: p.name,
      url: page.url(),
      renderedHeading: data.headings.slice(0, 4),
      emptyStateCopy: data.found_phrases.length > 0 ? data.found_phrases.join(', ') : null,
      hasMeaningfulEmptyState: data.found_phrases.length > 0,
      pageErrors: errors,
    };
    observations.push(obs);

    console.log(
      `[X3:${p.name}] headings=${obs.renderedHeading.join('|').slice(0, 80)} ` +
        `empty_copy=${obs.emptyStateCopy ?? '(none)'} ` +
        `pageerrors=${errors.length}`,
    );

    // Assert: page rendered without crashing
    expect(data.headings.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}
