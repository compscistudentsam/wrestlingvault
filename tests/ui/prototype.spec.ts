import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
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
  await expect(cover(page)).toHaveAccessibleName(/Open Kenny Omega.*Dominion 6.9/);
  await expect(cover(page).locator('img')).toHaveJSProperty('complete', true);
  await expect(cover(page).locator('img')).not.toHaveJSProperty('naturalWidth', 0);
  await expect(page.locator('.flow-cover')).toHaveCount(12);
  await expect(page.locator('aside, nav, input, select, table, .view-switch')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect(cover(page)).toHaveAccessibleName(/Open CM Punk/);
  await page.getByRole('button', { name: 'Previous match', exact: true }).click();
  await expect(cover(page)).toHaveAccessibleName(/Open Kenny Omega.*Dominion 6.9/);
  expect(errors).toEqual([]);
});

test('side covers select, centre opens, and back keeps the selected event', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Select CM Punk/ }).click();
  await cover(page).click();
  await expect(
    page.getByRole('heading', { name: 'CM Punk vs. John Cena', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.detail-event')).toContainText('Money in the Bank');
  await expect(page.getByRole('link', { name: 'Rating source' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(cover(page)).toHaveAccessibleName(/Open CM Punk/);
  await page.locator('.cover-stage').focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-event')).toContainText('Forbidden Door');
  await page.keyboard.press('Escape');
  await expect(cover(page)).toHaveAccessibleName(/Forbidden Door/);
});

test('keyboard wrapping, horizontal wheel and touch browsing work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Select CM Punk/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.cover-stage')).toBeFocused();
  await expect(cover(page)).toHaveAccessibleName(/Forbidden Door/);
  await page.keyboard.press('ArrowRight');
  await expect(cover(page)).toHaveAccessibleName(/Dominion 6.9/);
  await page.keyboard.press('End');
  await expect(cover(page)).toHaveAccessibleName(/Forbidden Door/);
  await page.keyboard.press('Home');
  await expect(cover(page)).toHaveAccessibleName(/Dominion 6.9/);
  await page.locator('.cover-stage').hover();
  await page.mouse.wheel(150, 0);
  await expect(cover(page)).toHaveAccessibleName(/Open CM Punk/);
  await page
    .locator('.cover-stage')
    .dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 400, clientY: 250 }] });
  await page
    .locator('.cover-stage')
    .dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 200, clientY: 255 }] });
  await expect(cover(page)).toHaveAccessibleName(/Open Bryan Danielson/);
});

test('missing images keep readable cover art', async ({ page }) => {
  await page.route('**/art/*.svg', (route) => route.abort());
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
  await expect(cover(page)).toHaveAccessibleName(/Open Bryan Danielson/);
  await cover(page).click();
  await expect(
    page.getByRole('heading', { name: 'Bryan Danielson vs. Will Ospreay', exact: true }),
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
