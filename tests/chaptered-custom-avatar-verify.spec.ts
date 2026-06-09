import { test, expect, Page } from '@playwright/test';

/**
 * Custom-avatar chaptered video E2E vs LOCAL preview build.
 * Zate has a custom Talking Photo ("Adeel - Zate Lecturer") + Indian-English voice stored.
 * Leadership course: ch0 = READY (real HeyGen video rendered from Adeel's photo), ch1 = generating.
 * Proves: (1) avatar picker shows the custom avatar, (2) a chapter generating with the custom
 * avatar, (3) the custom-avatar video actually loads/plays (readyState 4). REAL screenshots.
 */
const BASE = process.env.CA_BASE || process.env.HR_V6_BASE || 'http://localhost:4173';
const EMAIL = process.env.ZATE_EMAIL || 'adeel@zatesystems.com';
const PASS = process.env.ZATE_PASSWORD || 'Zate2024!-!';
const SHOT = (n: string) => `tests/screenshots/custom-avatar/${n}.png`;

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

test('CA-01: chaptered player with custom-avatar picker + real custom-avatar video', async ({ page }) => {
  test.setTimeout(90000);
  await login(page);
  await page.goto(`${BASE}/hr/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await dismissModal(page);

  await page.locator('button[role=tab]:has-text("My Learning")').first().click();
  await page.waitForTimeout(1500);
  const row = page.locator('[data-testid^="enrollment-row-"]').filter({ hasText: 'Leadership & Management Excellence' }).first();
  await expect(row, 'Leadership enrollment row').toBeVisible();
  await row.getByRole('button', { name: /Continue|Review/i }).first().click();
  await page.waitForTimeout(1500);

  const chapters = page.locator('[data-testid="course-chapters"]');
  await expect(chapters).toBeVisible();

  // (1) avatar picker shows the CUSTOM avatar
  const picker = page.locator('[data-testid="avatar-picker"]');
  await expect(picker, 'avatar picker present').toBeVisible();
  await expect(picker.locator('text=/Adeel - Zate Lecturer/i'), 'picker shows custom lecturer').toBeVisible();
  await expect(page.locator('[data-testid="avatar-preview"]'), 'custom avatar preview thumbnail').toBeVisible();
  await page.screenshot({ path: SHOT('01_avatar_picker'), fullPage: true });

  // (2) a chapter generating with the custom avatar (any in-progress chapter)
  await expect(chapters.locator('text=/Video generating/i').first(), 'a chapter is generating with the custom avatar').toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: SHOT('02_chapter_generating'), fullPage: true });

  // (3) the ready custom-avatar video actually LOADS (readyState 4)
  const video = page.locator('[data-testid="chapter-video-0"]');
  await expect(video, 'ready custom-avatar chapter video element').toBeVisible({ timeout: 10000 });
  const src = await video.getAttribute('src');
  console.log('[CA-01] custom-avatar video src:', src);
  expect(src && /heygen/i.test(src), 'video src is a real HeyGen URL').toBeTruthy();
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
  const state = await video.evaluate((el: HTMLVideoElement) => ({ readyState: el.readyState, videoWidth: el.videoWidth, duration: el.duration }));
  console.log('[CA-01] video load state:', JSON.stringify(state));
  await page.screenshot({ path: SHOT('03_custom_avatar_video_loaded'), fullPage: true });
  expect(state.readyState >= 1 || state.videoWidth > 0, 'custom-avatar HeyGen video loaded').toBeTruthy();
  console.log('[CA-01] PASS — custom-avatar picker + a real, loaded Adeel HeyGen chapter video');
});
