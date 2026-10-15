import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const selectedCover = (page: import('@playwright/test').Page) =>
  page.locator('.flow-cover.is-selected');

test('cover library loads local art without browser errors', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'All matches', exact: true })).toBeVisible();
  await expect(page.locator('.match-list tbody tr')).toHaveCount(12);
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*Dominion 6.9/);
  await expect(selectedCover(page).locator('img')).toHaveJSProperty('complete', true);
  await expect(selectedCover(page).locator('img')).not.toHaveJSProperty('naturalWidth', 0);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Bryan Danielson/);
  await expect(page.locator('.selected-row')).toContainText('Bryan Danielson');
  await page.getByRole('button', { name: 'Previous match', exact: true }).click();
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*Dominion 6.9/);
  expect(failures).toEqual([]);
});

test('side covers select, the centre opens details, and back preserves selection', async ({
  page,
}) => {
  await page.goto('/');
  const covers = page.getByRole('region', { name: 'Match covers', exact: true });
  await covers.getByRole('button', { name: /Select Bryan Danielson/ }).click();
  await expect(page.locator('.selection-caption h2')).toHaveText(
    'Bryan Danielson vs. Will Ospreay',
  );
  await selectedCover(page).hover();
  await expect(selectedCover(page).locator('.cover-open')).toHaveCSS('opacity', '1');
  await selectedCover(page).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bryan Danielson vs. Will Ospreay' }),
  ).toBeVisible();
  await expect(page.getByText('21 April 2024', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Watchlist' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /WrestlePurists/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await expect(page.getByText('Sample record · Source verification pending')).toBeVisible();
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Bryan Danielson/);
  await expect(page.locator('.selected-row')).toContainText('Bryan Danielson');
});

test('rows select matching covers and explicit row links open the correct event', async ({
  page,
}) => {
  await page.goto('/');
  const row = page.getByRole('row').filter({ hasText: 'G1 Climax 27' });
  await row.getByRole('button', { name: /^Select/ }).click();
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*G1 Climax 27/);
  await row.getByRole('button', { name: /^View/ }).click();
  await expect(page.locator('.detail-event')).toHaveText('G1 Climax 27');
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(selectedCover(page)).toHaveAccessibleName(/G1 Climax 27/);
  await page.getByRole('row').filter({ hasText: 'SummerSlam' }).dblclick();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bret Hart vs. Owen Hart' }),
  ).toBeVisible();
});

test('cover keyboard navigation wraps and reaches both ends without losing the gallery', async ({
  page,
}) => {
  await page.goto('/');
  const stage = page.locator('.cover-stage');
  await page
    .getByRole('region', { name: 'Match covers', exact: true })
    .getByRole('button', { name: /Select Bryan Danielson/ })
    .focus();
  await page.keyboard.press('ArrowLeft');
  await expect(stage).toBeFocused();
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Ricky Steamboat/);
  await expect(page.locator('.selected-row')).toBeInViewport();
  await expect(selectedCover(page)).toBeInViewport();
  await page.keyboard.press('ArrowRight');
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*Dominion 6.9/);
  await page.keyboard.press('End');
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Ricky Steamboat/);
  await page.keyboard.press('Home');
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*Dominion 6.9/);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kenny Omega vs. Kazuchika Okada' }),
  ).toBeVisible();
});

test('horizontal wheel and touch gestures browse covers', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cover-stage').hover();
  await page.mouse.wheel(150, 0);
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Bryan Danielson/);
  await page
    .locator('.cover-stage')
    .dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 400, clientY: 250 }] });
  await page
    .locator('.cover-stage')
    .dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 200, clientY: 255 }] });
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kazuchika Okada.*Dominion 6.11/);
});

test('combined filters, empty recovery, sorting and single-result navigation work', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('omega');
  await expect(page.locator('.match-list tbody tr')).toHaveCount(5);
  await page.getByLabel('Filter by minimum rating').selectOption('7');
  await expect(page.locator('.match-list tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous match', exact: true })).toBeDisabled();
  await page.getByLabel('Filter by promotion').selectOption('WWE');
  await expect(page.getByRole('heading', { name: 'No matches found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(page.locator('.match-list tbody tr')).toHaveCount(12);
  await page.getByLabel('Filter by promotion').selectOption('WWE');
  await page.getByLabel('Filter by decade').selectOption('1990');
  await expect(page.locator('.match-list tbody tr')).toHaveCount(2);
  await page.getByLabel('Sort matches').selectOption('oldest');
  await expect(page.locator('.row-title').first()).toHaveText('Bret Hart vs. Owen Hart');
  await expect(selectedCover(page)).toHaveAccessibleName(/WWF|Shawn Michaels|Bret Hart/);
  await selectedCover(page).click();
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(page.getByLabel('Filter by promotion')).toHaveValue('WWE');
  await expect(page.getByLabel('Filter by decade')).toHaveValue('1990');
  await expect(page.locator('.match-list tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.match-list tbody tr')).toHaveCount(12);
});

test('grid view and collection shortcuts retain working click-through', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
  await page.locator('.card-link').first().click();
  await expect(page.locator('.detail-event')).toContainText('Dominion 6.9');
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /Six stars & above/ })
    .click();
  await expect(page.locator('.match-list tbody tr')).toHaveCount(6);
  await expect(page.getByLabel('Filter by minimum rating')).toHaveValue('6');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^WWE \/ WWF/ })
    .click();
  await expect(page.locator('.match-list tbody tr')).toHaveCount(4);
  await expect(page.locator('.promotion-cell').filter({ hasText: 'WWF' })).toHaveCount(2);
});

test('future navigation stays honest and settings respect reduced motion', async ({ page }) => {
  await page.goto('/');
  await page.locator('.more-nav summary').click();
  for (const name of ['Promotions', 'Wrestlers', 'Timeline', 'Statistics', 'My Watchlist']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText(/Unavailable in this prototype/)).toBeVisible();
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: /Reduce motion/ }).check();
  await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'All Matches', exact: true })
    .click();
  await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
});

test('missing artwork leaves readable sleeves without broken images', async ({ page }) => {
  await page.route('**/art/*.svg', (route) => route.abort());
  await page.goto('/');
  await expect(selectedCover(page).locator('.artwork')).toHaveAttribute('data-fallback', 'true');
  await expect(selectedCover(page).locator('img')).toHaveCount(0);
  await expect(selectedCover(page).locator('.poster-type')).toContainText('OMEGA');
  await expect(selectedCover(page).locator('.cover-event')).toHaveText('Dominion 6.9');
  await selectedCover(page).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kenny Omega vs. Kazuchika Okada' }),
  ).toBeVisible();
});

test('keyboard search works without intercepting text cursor arrows', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('SummerSlam');
  await expect(page.locator('.match-list tbody tr')).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('searchbox')).toBeFocused();
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
  test(`covers, grid and details fit ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    const expectNoOverflow = async () => {
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        return {
          document: document.documentElement.scrollWidth > innerWidth,
          main: main.scrollWidth > main.clientWidth + 1,
        };
      });
      expect(overflow).toEqual({ document: false, main: false });
    };
    await expect(selectedCover(page)).toBeInViewport();
    await expectNoOverflow();
    await selectedCover(page).click();
    await expect(page.locator('.detail-cover')).toBeVisible();
    await expectNoOverflow();
    await page.getByRole('button', { name: 'Back to collection' }).click();
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
    await expectNoOverflow();
  });
}

test('invalid direct routes have a recovery action', async ({ page }) => {
  await page.goto('/#/match/missing-record');
  await expect(page.getByRole('heading', { name: 'Match not found' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(selectedCover(page)).toBeVisible();
});

test('rapid selection remains correct with animation enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const next = page.getByRole('button', { name: 'Next match', exact: true });
  await next.click({ clickCount: 3, delay: 60 });
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*Forbidden Door/);
  await selectedCover(page).click();
  await expect(page.locator('.detail-event')).toHaveText('Forbidden Door');
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await expect(selectedCover(page)).toHaveAccessibleName(/Open Kenny Omega.*Forbidden Door/);
});

test('capture review screenshots', async ({ page }) => {
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(selectedCover(page).locator('img')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: 'artifacts/screenshots/discover-desktop.png' });
  await page.screenshot({ path: 'artifacts/screenshots/discover-collections.png' });
  await selectedCover(page).click();
  await expect(page.locator('.detail-info')).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/match-details.png' });
  await page.getByRole('button', { name: 'Back to collection' }).click();
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await expect(page.locator('.match-grid .match-card')).toHaveCount(12);
  await page.screenshot({ path: 'artifacts/screenshots/collection.png' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Cover flow view', exact: true }).click();
  await expect(selectedCover(page)).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/discover-laptop.png' });
});
