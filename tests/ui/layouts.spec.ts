import { test, expect } from '@playwright/test';

const selected = (page: import('@playwright/test').Page) => page.locator('.flow-cover.is-selected');

test('layout buttons are exclusive, sit left of search, and preserve selection when switching', async ({
  page,
}) => {
  await page.goto('/');
  const covers = page.getByRole('button', { name: 'Cover view', exact: true });
  const grid = page.getByRole('button', { name: 'Grid view', exact: true });
  await expect(covers).toHaveAttribute('aria-pressed', 'true');
  await expect(grid).toHaveAttribute('aria-pressed', 'false');
  const buttons = await page.getByRole('group', { name: 'Library layout' }).boundingBox();
  const searchBox = await page.getByRole('combobox', { name: 'Search matches' }).boundingBox();
  expect(buttons!.x + buttons!.width).toBeLessThanOrEqual(searchBox!.x);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  const name = await selected(page).getAttribute('aria-label');
  await grid.click();
  await expect(grid).toHaveAttribute('aria-pressed', 'true');
  await expect(covers).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.grid-browser .flow-cover')).toHaveCount(100);
  await expect(selected(page)).toHaveAttribute('aria-label', name!);
  await covers.click();
  await expect(page.locator('.grid-browser')).toHaveCount(0);
  await expect(page.locator('.flow-cover')).toHaveCount(7);
  await expect(selected(page)).toHaveAttribute('aria-label', name!);
});

test('grid shares filters, downloaded highlights and click-through, then returns to the same tile', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.assign(window, {
      vault: {
        chooseVideoFolder: async () => ({ name: 'Videos' }),
        getVideoAvailability: async () => ['omega-okada-dominion-2018'],
        getMatchVideos: async () => [],
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await page.getByRole('combobox', { name: 'Company' }).selectOption('NJPW');
  await page.getByRole('combobox', { name: 'Star rating' }).selectOption('7');
  await expect(page.locator('.flow-cover')).toHaveCount(1);
  await expect(selected(page)).toHaveAccessibleName(/Dominion 6.9/);
  await page.getByRole('combobox', { name: 'Star rating' }).selectOption('all');
  await page.getByRole('button', { name: 'Downloaded only' }).click();
  await expect(page.locator('.flow-cover:not(.is-unavailable)')).toHaveCount(1);
  const tile = page.getByRole('button', { name: /Open Kazuchika Okada.*Dominion 6.9/ });
  await tile.click();
  await expect(
    page.getByRole('heading', { name: 'Kazuchika Okada vs. Kenny Omega', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(page.locator('.grid-browser')).toBeVisible();
  await expect(selected(page)).toHaveAccessibleName(/Dominion 6.9/);
  await expect(page.getByRole('combobox', { name: 'Company' })).toHaveValue('NJPW');
});

test('grid search and Random reveal the selection and keyboard navigation still works', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  const search = page.getByRole('combobox', { name: 'Search matches' });
  await search.fill('Shirai Iwatani');
  await search.press('Enter');
  await expect(selected(page)).toHaveAccessibleName(/Shirai.*Iwatani/);
  await expect(selected(page)).toBeInViewport();
  await selected(page).click();
  await page.getByRole('button', { name: 'Back to covers' }).click();
  await expect(selected(page)).toHaveAccessibleName(/Shirai.*Iwatani/);
  await expect(selected(page)).toBeInViewport();
  await page.locator('.cover-stage').focus();
  await page.keyboard.press('Home');
  await expect(selected(page)).toHaveAccessibleName(/Wrestle Kingdom 11/);
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).not.toHaveAccessibleName(/Wrestle Kingdom 11/);
  await expect(selected(page)).toBeInViewport();
  await page.getByRole('combobox', { name: 'Star rating' }).selectOption('7');
  await page.getByRole('button', { name: 'Random', exact: true }).click();
  await expect(selected(page)).toHaveAccessibleName(/Dominion 6.9/);
  await expect(selected(page)).toBeInViewport();
});

for (const width of [430, 960, 1440]) {
  test(`grid fits ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector('main')!.scrollWidth <=
            document.querySelector('main')!.clientWidth + 1,
      ),
    ).toBe(true);
    const columns = await page
      .locator('.cover-stage')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBeGreaterThanOrEqual(2);
    if (width === 1440) await page.screenshot({ path: 'artifacts/screenshots/library-grid.png' });
  });
}

test('grid keeps the animated search transition and locks the layout switch until it finishes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.dataset.sawGridFlip = 'false';
    document.documentElement.dataset.sawGridBusy = 'false';
    new MutationObserver(() => {
      if (document.querySelector('.grid-browser .page-flip'))
        document.documentElement.dataset.sawGridFlip = 'true';
      if (document.querySelector('.view-switch button:disabled'))
        document.documentElement.dataset.sawGridBusy = 'true';
    }).observe(document.body, { childList: true, subtree: true, attributes: true });
  });
  const search = page.getByRole('combobox', { name: 'Search matches' });
  await search.fill('Shirai Iwatani');
  await search.press('Enter');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.sawGridBusy))
    .toBe('true');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.sawGridFlip))
    .toBe('true');
  await expect(page.getByRole('button', { name: 'Cover view', exact: true })).toBeEnabled();
  await expect(selected(page)).toHaveAccessibleName(/Shirai.*Iwatani/);
  await expect(selected(page)).toBeInViewport();
  await expect(page.locator('.page-flip')).toHaveCount(0);
});
