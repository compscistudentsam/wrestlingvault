import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
const matches: { image: string }[] = JSON.parse(readFileSync('src/data/matches.json', 'utf8'));
const cover = (page: Page) => page.locator('.flow-cover.is-selected');

test('only the cover browser is displayed, with working local art', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.locator('.brand img')).toHaveAttribute('src', './vault.svg');
  await expect(cover(page)).toHaveAccessibleName(/Open Kazuchika Okada.*Wrestle Kingdom 11/);
  await expect(cover(page).locator('img')).toHaveJSProperty('complete', true);
  await expect(cover(page).locator('img')).not.toHaveJSProperty('naturalWidth', 0);
  await expect(page.locator('.flow-cover')).toHaveCount(7);
  await expect(page.locator('aside, nav, table')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Search matches' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Company' })).toBeVisible();
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect(cover(page)).toHaveAccessibleName(/Open Kenta Kobashi.*Navigate For Evolution/);
  await page.getByRole('button', { name: 'Previous match', exact: true }).click();
  await expect(cover(page)).toHaveAccessibleName(/Open Kazuchika Okada.*Wrestle Kingdom 11/);
  expect(errors).toEqual([]);
});

test('side covers select, centre opens, and back keeps the selected event', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Select Kenta Kobashi.*Navigate For Evolution/ }).click();
  await cover(page).click();
  await expect(
    page.getByRole('heading', {
      name: 'Kenta Kobashi vs. Mitsuharu Misawa',
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.locator('.detail-event')).toContainText('Navigate For Evolution');
  await expect(page.getByRole('link', { name: 'Rating source' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(cover(page)).toHaveAccessibleName(/Open Kenta Kobashi.*Navigate For Evolution/);
  await page.locator('.cover-stage').focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-event')).toContainText('Galaxy Stars');
  await page.keyboard.press('Escape');
  await expect(cover(page)).toHaveAccessibleName(/Galaxy Stars/);
});

test('keyboard wrapping, horizontal wheel and touch browsing work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Select Kenta Kobashi.*Navigate For Evolution/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.cover-stage')).toBeFocused();
  await expect(cover(page)).toHaveAccessibleName(/Galaxy Stars/);
  await page.keyboard.press('ArrowRight');
  await expect(cover(page)).toHaveAccessibleName(/Wrestle Kingdom 11/);
  await page.keyboard.press('End');
  await expect(cover(page)).toHaveAccessibleName(/Galaxy Stars/);
  await page.keyboard.press('Home');
  await expect(cover(page)).toHaveAccessibleName(/Wrestle Kingdom 11/);
  await page.locator('.cover-stage').hover();
  await page.mouse.wheel(150, 0);
  await expect(cover(page)).toHaveAccessibleName(/Open Kenta Kobashi.*Navigate For Evolution/);
  await page
    .locator('.cover-stage')
    .dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 400, clientY: 250 }] });
  await page
    .locator('.cover-stage')
    .dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 200, clientY: 255 }] });
  await expect(cover(page)).toHaveAccessibleName(/Open Kazuchika Okada.*Dominion 6.9/);
});

test('missing images keep readable cover art', async ({ page }) => {
  await page.route('**/art/**', (route) => route.abort());
  await page.goto('/');
  await expect(cover(page).locator('.artwork')).toHaveAttribute('data-fallback', 'true');
  await expect(cover(page).locator('img')).toHaveCount(0);
  await expect(cover(page).locator('.poster-type')).toContainText('OMEGA');
  await cover(page).click();
  await expect(page.locator('.detail-cover .artwork')).toHaveAttribute('data-fallback', 'true');
});

for (const size of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 960, height: 640 },
  { width: 430, height: 932 },
]) {
  test(`covers and click-through fit ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    const fits = async () =>
      expect(
        await page.evaluate(() => {
          const main = document.querySelector('main')!;
          return (
            document.documentElement.scrollWidth <= innerWidth &&
            main.scrollWidth <= main.clientWidth + 1
          );
        }),
      ).toBe(true);
    await expect(cover(page)).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeInViewport();
    await fits();
    await cover(page).click();
    await expect(page.locator('.detail-cover')).toBeInViewport();
    await fits();
  });
}

test('invalid routes recover and animation respects system preferences', async ({ page }) => {
  await page.goto('/#/match/missing');
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(cover(page)).toBeVisible();
  await expect(cover(page)).toHaveCSS('transition-duration', '1e-05s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page
    .getByRole('button', { name: 'Next match', exact: true })
    .click({ clickCount: 2, delay: 60 });
  await expect(cover(page)).toHaveAccessibleName(/Open Kazuchika Okada.*Dominion 6.9/);
  await cover(page).click();
  await expect(
    page.getByRole('heading', { name: 'Kazuchika Okada vs. Kenny Omega', exact: true }),
  ).toBeVisible();
});

test('capture the simplified library', async ({ page }) => {
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(cover(page).locator('img')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: 'artifacts/screenshots/discover-desktop.png' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: 'artifacts/screenshots/discover-laptop.png' });
  await cover(page).click();
  await expect(page.locator('.detail-cover')).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/match-details.png' });
});

test('Random flips through a full pass and stops on the chosen match', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await page.goto('/');
  const random = page.getByRole('button', { name: 'Random', exact: true });
  await random.click();
  await expect(random).toBeDisabled();
  await expect(page.locator('.page-flip')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeDisabled();
  await expect(random).toBeEnabled({ timeout: 8000 });
  await expect(cover(page)).toHaveAccessibleName(/Open Bryan Danielson.*New Beginning In Osaka/);
  await expect(page.locator('.page-flip')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('The New Beginning In Osaka');
  await cover(page).click();
  await expect(page.locator('.detail-event')).toContainText('The New Beginning In Osaka');
  await expect(random).toHaveCount(0);
});

test('Random supports reduced motion, the current match, and a centred mobile button', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/');
  const random = page.getByRole('button', { name: 'Random', exact: true });
  const box = await random.boundingBox();
  expect(Math.abs(box!.x + box!.width / 2 - 215)).toBeLessThan(1);
  await random.click();
  await expect(random).toBeEnabled();
  await expect(page.locator('.page-flip')).toHaveCount(0);
  await expect(cover(page)).toHaveAccessibleName(/Wrestle Kingdom 11/);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await random.click();
  await expect(cover(page)).toHaveAccessibleName(/Wrestle Kingdom 11/);
});

test('leaving during a random browse cancels the pending flips', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Random', exact: true }).click();
  await expect(page.locator('.page-flip')).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = '/match/omega-okada-dominion-2018';
  });
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(page.getByRole('button', { name: 'Random', exact: true })).toBeEnabled();
  await expect(page.locator('.page-flip')).toHaveCount(0);
});

test('all 100 ranked cards decode, including repeat matchups and the final match', async ({
  page,
}) => {
  await page.goto('/');
  const images = matches.map((match) => `./art/${match.image}`);
  expect(new Set(images).size).toBe(100);
  const decoded = await page.evaluate(
    async (urls) =>
      Promise.all(
        urls.map(async (url) => {
          const image = new Image();
          image.src = url;
          try {
            await image.decode();
            return image.naturalWidth > 0;
          } catch {
            return false;
          }
        }),
      ),
    images,
  );
  expect(decoded.every(Boolean)).toBe(true);
  await expect(page.locator('.selection-count')).toHaveText('01 / 100');
  await page.locator('.cover-stage').focus();
  await page.keyboard.press('End');
  await expect(page.locator('.selection-count')).toHaveText('100 / 100');
  await expect(cover(page).locator('.poster-type')).toContainText('IWATANI');
  await cover(page).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Io Shirai vs. Mayu Iwatani');
});
