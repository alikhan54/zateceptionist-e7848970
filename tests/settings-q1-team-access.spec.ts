/**
 * Q1 probe — does ACSFX owner have access to /settings/team TODAY?
 * Captures screenshot + records the gate outcome. Read-only.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dismissTutorialIfPresent } from './helpers/dismiss-onboarding';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT = path.resolve(__dirname, '..', '..', '.tmp_settings_v2');
const SHOT_DIR = path.join(OUT, '04_deep_audit_run');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

test('Q1: ACSFX owner /settings/team access today', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await dismissTutorialIfPresent(page);
  await page.goto('/settings/team');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SHOT_DIR, 'q1_acsfx_team_access.png'), fullPage: true });

  const data = await page.evaluate(() => {
    const body = (document.body.textContent || '').toLowerCase();
    const restrictedVisible = /access restricted|permission to view team|don't have permission/i.test(document.body.innerText);
    const inviteBtn = !!document.querySelector('button:has-text("Invite Member"), button[aria-label*="Invite"]');
    const teamHeading = !!document.querySelector('h1, h2');
    return {
      restrictedVisible,
      hasInviteBtn: !!document.body.innerText.match(/Invite Member/i),
      hasTeamMgmt: !!document.body.innerText.match(/Team Management/i),
      hasMembers: !!document.body.innerText.match(/Total Members/i),
      url: window.location.pathname,
    };
  });

  fs.writeFileSync(path.join(SHOT_DIR, 'q1_acsfx_team_access.json'), JSON.stringify(data, null, 2));
  console.log('[Q1] ACSFX owner /settings/team:', JSON.stringify(data));
  // No assertion — pure observation
});
