import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('Discover renders without browser errors or missing local assets', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to the Vault.' })).toBeVisible();
  await expect(page.locator('.hero-title')).toContainText('Kenny Omega');
  await expect(page.locator('.hero-score-value')).toHaveText('7.0');
  await expect(page.getByRole('navigation')).toContainText('My Watchlist');
  await expect(page.locator('.hero img')).toHaveJSProperty('complete', true);
  await expect(page.locator('.hero img')).not.toHaveJSProperty('naturalWidth', 0);
  await page.getByRole('button', { name: 'Next featured match' }).click();
  await expect(page.locator('.hero-title')).toContainText('CM Punk');
  await page.getByRole('button', { name: 'Previous featured match' }).click();
  await expect(page.locator('.hero-title')).toContainText('Kenny Omega');
  expect(failures).toEqual([]);
});

test('carousels move using arrows and keyboard, and cards open details', async ({ page }) => {
  await page.goto('/');
  const collection = page.getByRole('region', {
    name: 'Greatness, without a ceiling.',
    exact: true,
  });
  const rail = collection.locator('.carousel');
  await collection.getByRole('button', { name: /Scroll .* right/ }).click();
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await rail.focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeLessThan(5);
  const first = collection.locator('.card-link').first();
  await first.hover();
  await expect(collection.locator('.card-open').first()).toHaveCSS('opacity', '1');
  await first.click();
  await expect(
    page.getByRole('heading', { name: 'Kenny Omega vs. Kazuchika Okada', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('9 June 2018', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Watchlist' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /IWNerd/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to the Vault.' })).toBeVisible();
});

test('combined search and filters work and reset recovers from empty results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('omega');
  await expect(page.locator('.match-grid .match-card')).toHaveCount(5);
  await page.getByLabel('Filter by minimum rating').selectOption('7');
  await expect(page.locator('.match-grid .match-card')).toHaveCount(1);
  await page.getByLabel('Filter by promotion').selectOption('WWE');
  await expect(page.getByRole('heading', { name: 'No matches in this corner.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
  await page.getByLabel('Filter by promotion').selectOption('WWE');
  await page.getByLabel('Filter by decade').selectOption('1990');
  await expect(page.locator('.match-grid .match-card')).toHaveCount(2);
  await page.getByLabel('Sort matches').selectOption('oldest');
  await expect(page.locator('.card-info h3').first()).toHaveText('Bret Hart vs. Owen Hart');
});

test('all navigation items have honest, working destinations', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Promotions', 'Wrestlers', 'Timeline', 'Statistics', 'My Watchlist']) {
    await page
      .getByRole('navigation')
      .getByRole('button', { name: new RegExp(`^${name}`) })
      .click();
    await expect(page.getByRole('heading', { name: `${name}.`, exact: true })).toBeVisible();
    await expect(page.getByText('UNAVAILABLE IN PHASE 1', { exact: true })).toBeVisible();
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The finer details.' })).toBeVisible();
  await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
  await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'All Matches', exact: true })
    .click();
  await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
});

test('missing artwork leaves cinematic text fallbacks and no broken images', async ({ page }) => {
  await page.route('**/art/*.svg', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.hero .artwork')).toHaveAttribute('data-fallback', 'true');
  await expect(page.locator('.hero-title')).toContainText('Kenny Omega');
  await expect(page.locator('.hero .artwork img')).toHaveCount(0);
  await expect(page.locator('.poster-type').first()).toBeVisible();
});

test('keyboard search and focus indicators work, including system reduced motion', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('SummerSlam');
  await expect(page.locator('.match-grid .match-card')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await page.getByRole('navigation').getByRole('button', { name: 'Discover', exact: true }).focus();
  await expect(
    page.getByRole('navigation').getByRole('button', { name: 'Discover', exact: true }),
  ).toHaveCSS('outline-style', 'solid');
  await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);
});

for (const size of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 960, height: 640 },
  { width: 430, height: 932 },
]) {
  test(`layout stays inside viewport at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('.hero-title')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      return {
        document: document.documentElement.scrollWidth > innerWidth,
        main: main.scrollWidth > main.clientWidth + 1,
      };
    });
    expect(overflow).toEqual({ document: false, main: false });
    await expect(page.getByRole('button', { name: 'Explore the match' })).toBeInViewport();
  });
}

test('invalid direct routes have a recovery action', async ({ page }) => {
  await page.goto('/#/match/missing-record');
  await expect(
    page.getByRole('heading', { name: 'This page isn’t in the archive.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to Discover' }).click();
  await expect(page.locator('.hero')).toBeVisible();
});

test('animated navigation stays functional when reduced motion is off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Next featured match' }).click();
  await expect(page.locator('.hero-title')).toContainText('CM Punk');
  await page.getByRole('button', { name: 'Explore the match' }).click();
  await expect(
    page.getByRole('heading', { name: 'CM Punk vs. John Cena', exact: true, level: 1 }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(page.locator('.hero-title')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
  await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);
});

test('capture review screenshots', async ({ page }) => {
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero img')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: 'artifacts/screenshots/discover-desktop.png' });
  await page.locator('main').evaluate((element) => {
    element.scrollTop = 620;
  });
  await page.screenshot({ path: 'artifacts/screenshots/discover-collections.png' });
  await page.locator('main').evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.getByRole('button', { name: 'Explore the match' }).click();
  await expect(page.locator('.detail-heading')).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/match-details.png' });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'All Matches', exact: true })
    .click();
  await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
  await page.screenshot({ path: 'artifacts/screenshots/collection.png' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('navigation').getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.locator('.hero-title')).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/discover-laptop.png' });
});
