/**
 * Helper: dismiss the "Welcome to Your Business Hub" onboarding tutorial.
 *
 * Freshly-onboarded tenants get a site-wide modal that intercepts every click.
 * Canonical localStorage key is 'onboarding-completed' per
 * frontend/src/components/global/OnboardingFlow.tsx:27.
 *
 * This helper is additive — the May 23 spec (settings-audit.spec.ts) has its
 * own inline copy and is intentionally not modified by this audit session.
 */

import type { Page } from '@playwright/test';

export async function dismissTutorialIfPresent(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('onboarding-completed', 'true');
  }).catch(() => { /* navigation not loaded yet */ });

  const skipBtn = page.getByRole('button', { name: /Skip tutorial/i });
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}
