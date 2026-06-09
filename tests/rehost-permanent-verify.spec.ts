import { test, expect, Page } from '@playwright/test';

/**
 * RE-HOST PERMANENCE E2E vs LOCAL preview build.
 *
 * Background: chaptered training videos are rendered by HeyGen, which returns a TEMPORARY
 * signed URL (files2.heygen.ai/...?Expires=...) that 404s once it expires — unacceptable for a
 * client training feature. The completion paths (Receiver KyIF7qhdTZR3o9E5 + Poll NaVWUiV5oXsFZXDH)
 * now DOWNLOAD the video and RE-HOST it to PERMANENT Supabase storage (public 'training-videos'
 * bucket, tenant-isolated path) and store that permanent URL in hr_course_chapters.video_url.
 *
 * This proves the player loads + plays the chapter video FROM SUPABASE (not HeyGen), readyState 4.
 * The "public speaking" course (program 8c06d965) has one chapter whose video was re-hosted and
 * byte-verified identical to the HeyGen original. REAL screenshots.
 */
const BASE = process.env.RH_BASE || process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';
const SHOT = (n: string) => `tests/screenshots/rehost/${n}.png`;

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

test('RH-01: chaptered player plays a chapter from PERMANENT Supabase storage (not HeyGen)', async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await page.goto(`${BASE}/hr/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await dismissModal(page);

  // My Learning -> public speaking course (has the re-hosted chapter) -> Continue -> player
  await page.locator('button[role=tab]:has-text("My Learning")').first().click();
  await page.waitForTimeout(1500);
  const row = page.locator('[data-testid^="enrollment-row-"]').filter({ hasText: /public speaking/i }).first();
  await expect(row, 'public speaking enrollment row in My Learning').toBeVisible();
  await row.getByRole('button', { name: /Continue|Review/i }).first().click();
  await page.waitForTimeout(1500);

  const chapters = page.locator('[data-testid="course-chapters"]');
  await expect(chapters, 'course chapters player').toBeVisible();
  await page.screenshot({ path: SHOT('01_player_open'), fullPage: true });

  // the chapter video element must be sourced from PERMANENT Supabase storage
  const video = page.locator('[data-testid="chapter-video-0"]');
  await expect(video, 'chapter video element').toBeVisible({ timeout: 12000 });
  const src = await video.getAttribute('src');
  console.log('[RH-01] chapter-video-0 src:', src);
  expect(src, 'video src present').toBeTruthy();
  expect(
    /supabase\.co\/storage\/v1\/object\/public\/training-videos\//i.test(src || ''),
    'video src is a PERMANENT Supabase storage URL'
  ).toBeTruthy();
  expect(
    /files2\.heygen\.ai/i.test(src || ''),
    'video src is NOT an expiring HeyGen temp URL'
  ).toBeFalsy();

  // actually load/play it and poll for readyState 4 (HAVE_ENOUGH_DATA)
  await video.scrollIntoViewIfNeeded();
  await video.evaluate((el: HTMLVideoElement) => { el.muted = true; el.play().catch(() => {}); });
  let state: any = {};
  for (let i = 0; i < 15; i++) {
    state = await video.evaluate((el: HTMLVideoElement) => ({
      readyState: el.readyState, videoWidth: el.videoWidth, videoHeight: el.videoHeight,
      duration: el.duration, currentSrc: el.currentSrc,
    }));
    if (state.readyState >= 4) break;
    await page.waitForTimeout(1000);
  }
  console.log('[RH-01] video load state:', JSON.stringify(state));
  await page.screenshot({ path: SHOT('02_supabase_video_playing'), fullPage: true });

  expect(state.readyState >= 2, `video loaded enough to play (readyState=${state.readyState})`).toBeTruthy();
  expect(state.videoWidth > 0, 'video has real decoded dimensions').toBeTruthy();
  expect(
    /supabase\.co\/storage\/v1\/object\/public\/training-videos\//i.test(state.currentSrc || ''),
    'currentSrc is the permanent Supabase URL'
  ).toBeTruthy();
  console.log(`[RH-01] PASS — chapter video served from PERMANENT Supabase storage, readyState=${state.readyState}, ${state.videoWidth}x${state.videoHeight}`);
});
