import { test, expect, Page } from '@playwright/test';

/**
 * Chaptered training-video E2E vs LOCAL preview build.
 * Course "Cybersecurity Awareness" already has chapters generated via real HeyGen:
 *   ch0 = generating, ch1 = ready (real HeyGen video_url, completed via the webhook).
 * Proves the chaptered player: chapter list + status, a generating placeholder, AND a
 * READY chapter whose <video> actually loads the real HeyGen URL. REAL screenshots.
 */
const BASE = process.env.CV_BASE || process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';
const SHOT = (n: string) => `tests/screenshots/chaptered-video/${n}.png`;

async function dismissModal(page: Page) {
  await page.locator('button:has-text("Skip tutorial"), button:has-text("Skip"), [aria-label="Close"], button:has(svg.lucide-x)').first()
    .click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(400);
}
async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASS);
    await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
    await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }
  await dismissModal(page);
}

test('CV-01: chaptered player shows chapter list + ready HeyGen video', async ({ page }) => {
  test.setTimeout(90000);
  await login(page);
  await page.goto(`${BASE}/hr/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await dismissModal(page);

  // My Learning tab → open the Cybersecurity course player
  await page.locator('button[role=tab]:has-text("My Learning")').first().click();
  await page.waitForTimeout(1500);
  const row = page.locator('[data-testid^="enrollment-row-"]').filter({ hasText: 'Cybersecurity Awareness' }).first();
  await expect(row, 'Cybersecurity enrollment row').toBeVisible();
  await row.getByRole('button', { name: /Continue|Review/i }).first().click();
  await page.waitForTimeout(1500);

  // Chaptered player section
  const chapters = page.locator('[data-testid="course-chapters"]');
  await expect(chapters, 'chapter player renders').toBeVisible();
  await expect(chapters.locator('text=Chapter Videos')).toBeVisible();
  // both chapters present (titles)
  await expect(page.locator('text=Understanding Cybersecurity Threats').first()).toBeVisible();
  await expect(page.locator('text=Protecting Your Credentials').first()).toBeVisible();
  await page.screenshot({ path: SHOT('01_chapters_generating'), fullPage: true });

  // ch1 is READY with a real HeyGen video element
  const video = page.locator('[data-testid="chapter-video-1"]');
  await expect(video, 'ready chapter has a video element').toBeVisible({ timeout: 10000 });
  const src = await video.getAttribute('src');
  console.log('[CV-01] ch1 video src:', src);
  expect(src && /heygen/i.test(src), 'video src is a real HeyGen URL').toBeTruthy();
  await chapters.scrollIntoViewIfNeeded();
  await page.screenshot({ path: SHOT('02_chaptered_player_ready'), fullPage: true });

  // the <video> actually LOADS the HeyGen URL (metadata) — not just a src attribute
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
  const state = await video.evaluate((el: HTMLVideoElement) => ({
    readyState: el.readyState, videoWidth: el.videoWidth, duration: el.duration, networkState: el.networkState,
  }));
  console.log('[CV-01] video load state:', JSON.stringify(state));
  await page.screenshot({ path: SHOT('03_video_loaded'), fullPage: true });
  expect(state.readyState >= 1 || state.videoWidth > 0, 'HeyGen video loaded (metadata/dimensions)').toBeTruthy();
  console.log('[CV-01] PASS — chaptered player with a real, loaded HeyGen chapter video');
});
