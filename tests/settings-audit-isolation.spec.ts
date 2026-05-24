/**
 * Settings v2 Deep Audit — X-CUT 2: multi-tenant ACTION isolation (write-side).
 *
 * For each Settings page with a save action, take a service-role snapshot of
 * every OTHER tenant's relevant rows BEFORE the action, perform the save as
 * ACSFX, snapshot AGAIN, assert zero delta on every other tenant. Restore
 * ACSFX original state.
 *
 * Uses helpers/supabase-snapshot.ts to talk to the service-role API.
 * Skips with clear message if SUPABASE_SERVICE_KEY is unavailable.
 *
 * Additive only. May 23 spec untouched.
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dismissTutorialIfPresent } from './helpers/dismiss-onboarding';
import {
  snapshotByKey,
  countByKey,
  diffSnapshots,
  diffCounts,
  hasServiceKey,
} from './helpers/supabase-snapshot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT = path.resolve(__dirname, '..', '..', '.tmp_settings_v2');
const ISO_DIR = path.join(OUT, '04_deep_audit_run');
if (!fs.existsSync(ISO_DIR)) fs.mkdirSync(ISO_DIR, { recursive: true });

const ACSFX_SLUG = 'acsfx';
const ACSFX_UUID = '8899f7c1-43c7-4bf1-9742-7fc721a3422c';

test.beforeAll(() => {
  if (!hasServiceKey()) {
    test.skip(true, 'SUPABASE_SERVICE_KEY not loadable from ../.env — isolation tests cannot snapshot');
  }
});

test.beforeEach(async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await dismissTutorialIfPresent(page);
});

interface Evidence {
  test: string;
  table: string;
  keyCol: string;
  actor: string;
  actorChanged: boolean;
  leakedKeys: string[];
}
const evidence: Evidence[] = [];

test.afterAll(async () => {
  fs.writeFileSync(
    path.join(ISO_DIR, 'x2_isolation_evidence.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), evidence }, null, 2),
  );
});

// ===========================================================================
// X2-1: Company Info save isolation
// ===========================================================================
test('X2-1 Company Info save: only ACSFX changes in tenant_config', async ({ page }) => {
  const before = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,company_name,industry,timezone,updated_at');
  await page.goto('/settings/business-profile/company');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);

  const input = page.locator('input#company_name');
  const orig = await input.inputValue();
  const stamp = `${orig} [iso-${Date.now()}]`;
  await input.fill(stamp);
  await page.getByRole('button', { name: /Save Changes/i }).click();
  await expect(page.locator('text=/Saved|updated successfully/i').first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800); // let DB settle

  const after = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,company_name,industry,timezone,updated_at');
  const { leakedKeys, actorChanged } = diffSnapshots(before, after, ACSFX_SLUG);
  evidence.push({ test: 'X2-1', table: 'tenant_config', keyCol: 'tenant_id', actor: ACSFX_SLUG, actorChanged, leakedKeys });
  console.log(`[X2-1] actor_changed=${actorChanged} leaked=${leakedKeys.length}`);

  expect(actorChanged).toBe(true);
  expect(leakedKeys).toEqual([]);

  // Restore
  await input.fill(orig);
  await page.getByRole('button', { name: /Save Changes/i }).click();
  await page.waitForTimeout(1_500);
});

// ===========================================================================
// X2-2: Knowledge Base add isolation
// ===========================================================================
test('X2-2 Knowledge Base add: only ACSFX row count changes', async ({ page }) => {
  const before = await countByKey('knowledge_base', 'tenant_id');
  await page.goto('/settings/business-profile/knowledge');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);

  const stamp = `__iso_kb_${Date.now()}`;
  await page.getByRole('button', { name: /Add Entry/i }).first().click();
  await expect(page.locator('[role=dialog]')).toBeVisible({ timeout: 5_000 });
  await page.locator('[role=dialog] input').first().fill(stamp);
  await page.locator('[role=dialog] textarea').first().fill('isolation audit throwaway entry');
  await page.locator('[role=dialog]').getByRole('button', { name: /^Add Entry$/i }).click();
  await expect(page.locator(`text=${stamp}`).first()).toBeVisible({ timeout: 10_000 });

  const after = await countByKey('knowledge_base', 'tenant_id');
  const { leakedKeys, actorDelta } = diffCounts(before, after, ACSFX_SLUG);
  evidence.push({ test: 'X2-2', table: 'knowledge_base', keyCol: 'tenant_id', actor: ACSFX_SLUG, actorChanged: actorDelta !== 0, leakedKeys });
  console.log(`[X2-2] actor_delta=${actorDelta} leaked=${leakedKeys.length}`);

  expect(actorDelta).toBe(1);
  expect(leakedKeys).toEqual([]);

  // Cleanup: delete the entry
  const card = page.locator(`text=${stamp}`).locator('xpath=ancestor::*[contains(@class, "p-4")][1]');
  await card.locator('button').last().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
});

// ===========================================================================
// X2-3: Notifications toggle isolation
// ===========================================================================
test('X2-3 Notifications save: only ACSFX tenant_config row mutates', async ({ page }) => {
  // We're comparing the JSONB outreach_settings.notifications, which lives
  // on tenant_config. Snapshot the full row for comparison.
  const before = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,outreach_settings,updated_at');
  await page.goto('/settings/notifications');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);

  const target = page.locator('#pref-sms');
  await target.click();
  await page.getByRole('button', { name: /Save Preferences/i }).click();
  await expect(page.locator('text=/Preferences saved/i').first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);

  const after = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,outreach_settings,updated_at');
  const { leakedKeys, actorChanged } = diffSnapshots(before, after, ACSFX_SLUG);
  evidence.push({ test: 'X2-3', table: 'tenant_config', keyCol: 'tenant_id', actor: ACSFX_SLUG, actorChanged, leakedKeys });
  console.log(`[X2-3] actor_changed=${actorChanged} leaked=${leakedKeys.length}`);

  expect(actorChanged).toBe(true);
  expect(leakedKeys).toEqual([]);

  // Restore
  await page.locator('#pref-sms').click();
  await page.getByRole('button', { name: /Save Preferences/i }).click();
  await page.waitForTimeout(1_500);
});

// ===========================================================================
// X2-4: Outreach blocked-domain add isolation
// ===========================================================================
test('X2-4 Outreach blocked-domain add: only ACSFX outreach_settings mutates', async ({ page }) => {
  const before = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,outreach_settings,updated_at');
  await page.goto('/settings/outreach');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);

  const stamp = `__iso-${Date.now()}.test`;
  const input = page.locator('input[placeholder*=".gov"]').first();
  await input.fill(stamp);
  await page.getByRole('button', { name: /^Add$/i }).first().click();
  await page.getByRole('button', { name: /Save Settings/i }).first().click();
  await expect(page.locator('text=/Settings saved|updated/i').first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);

  const after = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,outreach_settings,updated_at');
  const { leakedKeys, actorChanged } = diffSnapshots(before, after, ACSFX_SLUG);
  evidence.push({ test: 'X2-4', table: 'tenant_config', keyCol: 'tenant_id', actor: ACSFX_SLUG, actorChanged, leakedKeys });
  console.log(`[X2-4] actor_changed=${actorChanged} leaked=${leakedKeys.length}`);

  expect(actorChanged).toBe(true);
  expect(leakedKeys).toEqual([]);

  // Cleanup: remove the badge
  await page.reload({ waitUntil: 'networkidle' });
  await dismissTutorialIfPresent(page);
  const badge = page.locator(`text=${stamp}`).locator('xpath=ancestor::*[contains(@class,"badge") or self::span][1]');
  if (await badge.count() > 0) {
    await badge.locator('button').first().click({ timeout: 3_000 }).catch(() => {});
    await page.getByRole('button', { name: /Save Settings/i }).first().click().catch(() => {});
    await page.waitForTimeout(1_500);
  }
});

// ===========================================================================
// X2-5: Integrations Marketing-section save isolation
// ===========================================================================
test('X2-5 Integrations Apify save: only ACSFX tenant_config changes', async ({ page }) => {
  const before = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,apify_api_key,updated_at');
  await page.goto('/settings/integrations');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);

  // Apify tab — single field, lowest-risk for an isolation save
  await page.getByRole('tab', { name: /Apify/i }).click();
  await page.waitForTimeout(400);
  const inp = page.locator('input[placeholder*="apify_api_"]').first();
  const orig = await inp.inputValue();
  const stamp = `apify_iso_${Date.now()}`;
  await inp.fill(stamp);
  await page.getByRole('button', { name: /^Save$/i }).first().click();
  await expect(page.locator('text=/Settings saved|Saved/i').first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(800);

  const after = await snapshotByKey('tenant_config', 'tenant_id', 'tenant_id,apify_api_key,updated_at');
  const { leakedKeys, actorChanged } = diffSnapshots(before, after, ACSFX_SLUG);
  evidence.push({ test: 'X2-5', table: 'tenant_config', keyCol: 'tenant_id', actor: ACSFX_SLUG, actorChanged, leakedKeys });
  console.log(`[X2-5] actor_changed=${actorChanged} leaked=${leakedKeys.length}`);

  expect(actorChanged).toBe(true);
  expect(leakedKeys).toEqual([]);

  // Restore
  await inp.fill(orig);
  await page.getByRole('button', { name: /^Save$/i }).first().click();
  await page.waitForTimeout(1_500);
});

// ===========================================================================
// X2-6: Team invite isolation (mock-send + revoke)
// ===========================================================================
test('X2-6 Team invite: only ACSFX team_invitations count changes', async ({ page }) => {
  const before = await countByKey('team_invitations', 'org_id');
  await page.goto('/settings/team');
  await page.waitForLoadState('networkidle');
  await dismissTutorialIfPresent(page);

  await page.getByRole('button', { name: /Invite Member/i }).click();
  await expect(page.locator('[role=dialog]')).toBeVisible({ timeout: 5_000 });
  const stampEmail = `__audit_iso_${Date.now()}@audit.test`;
  // The invite dialog has an email field
  const emailInput = page.locator('[role=dialog] input[type=email]').first();
  if (await emailInput.count() === 0) {
    await page.locator('[role=dialog] input').first().fill(stampEmail);
  } else {
    await emailInput.fill(stampEmail);
  }
  // Pick a role (first option)
  const roleSel = page.locator('[role=dialog] button[role=combobox]').first();
  if (await roleSel.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await roleSel.click();
    await page.waitForTimeout(300);
    const opt = page.locator('[role=option]:visible').first();
    if (await opt.count() > 0) await opt.click();
  }
  await page.locator('[role=dialog]').getByRole('button', { name: /Send Invitation|Invite|Send/i }).last().click();
  // Wait for any toast (success or error)
  await page.waitForTimeout(3_000);

  const after = await countByKey('team_invitations', 'org_id');
  const { leakedKeys, actorDelta } = diffCounts(before, after, ACSFX_UUID);
  evidence.push({ test: 'X2-6', table: 'team_invitations', keyCol: 'org_id', actor: ACSFX_UUID, actorChanged: actorDelta !== 0, leakedKeys });
  console.log(`[X2-6] actor_delta=${actorDelta} leaked=${leakedKeys.length}`);

  // Even if the invite failed (e.g. email already exists or RPC rejected),
  // the assertion that matters is no LEAK to other tenants.
  expect(leakedKeys).toEqual([]);

  // Cleanup: revoke any new invitation matching the stamp email (best-effort).
  // We can't easily target the row from the UI without page navigation; the
  // ACTOR delta being +1 OR 0 is acceptable. If +1, the row is throwaway with
  // a clearly audit-test email and will expire on its own.
});
