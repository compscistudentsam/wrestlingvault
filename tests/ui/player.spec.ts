import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('startup selection, local playback, seeking, parts, and returning to covers', async ({
  page,
}) => {
  const bytes = await readFile('tests/fixtures/playback.webm');
  await page.route('**/test-match.webm*', async (route) => {
    const range = route.request().headers()['range'];
    const start = Number(range?.match(/bytes=(\d+)/)?.[1] ?? 0);
    await route.fulfill({
      status: range ? 206 : 200,
      contentType: 'video/webm',
      headers: {
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${start}-${bytes.length - 1}/${bytes.length}` } : {}),
      },
      body: bytes.subarray(start),
    });
  });
  await page.addInitScript(() => {
    let calls = 0;
    Object.assign(window, {
      vault: {
        chooseVideoFolder: async () => {
          calls++;
          (window as unknown as { folderCalls: number }).folderCalls = calls;
          return { name: 'My matches' };
        },
        getMatchVideos: async () => [
          { name: 'part1.webm', url: '/test-match.webm' },
          { name: 'part2.webm', url: '/test-match.webm?part=2' },
        ],
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Video folder: My matches' })).toBeVisible();
  await page.locator('.flow-cover.is-selected').click();
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate(async (node) => {
    const media = node as HTMLVideoElement;
    await media.play();
    media.pause();
    media.currentTime = 2;
  });
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(1.9);
  const play = page.getByRole('button', { name: 'Play video', exact: true });
  await expect(play).toBeVisible();
  await play.click();
  await expect(page.getByRole('button', { name: 'Pause video', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause video', exact: true }).click();
  await expect(play).toBeVisible();
  await video.evaluate((node) => {
    (node as HTMLVideoElement).currentTime = 2;
  });
  const compact = await video.boundingBox();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => (await video.boundingBox())!.width).toBeGreaterThan(compact!.width);
  await expect
    .poll(async () => (await video.boundingBox())!.height)
    .toBeGreaterThan(compact!.height);
  const timeline = page.getByRole('slider', { name: 'Video position' });
  await timeline.fill('20');
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(19.9);
  await timeline.fill('2');
  await page.getByRole('button', { name: 'Forward 10 seconds' }).click();
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(11.9);
  await page.getByRole('button', { name: 'Back 10 seconds' }).click();
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeLessThan(2.1);
  await page.getByLabel('Video player', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(11.9);
  await page.keyboard.press('ArrowLeft');
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeLessThan(2.1);
  await page.locator('.skip-zone-right').dblclick();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(11.9);
  await expect(page.getByRole('combobox')).toHaveValue('0');
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(video).toHaveCount(0);
});

test('cancelled folder selection offers recovery and an exact match folder name', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.assign(window, { vault: { chooseVideoFolder: async () => null } }),
  );
  await page.goto('/');
  await page.locator('.flow-cover.is-selected').click();
  await expect(page.locator('.video-empty')).toContainText('omega-okada-wk11-2017');
  await expect(
    page.locator('.video-empty').getByRole('button', { name: 'Choose video folder' }),
  ).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Search Google for this match online' }),
  ).toHaveAttribute('href', /google.com\/search\?q=.*Wrestle.*2017.*download%20online/);
});
