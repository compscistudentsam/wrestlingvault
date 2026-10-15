import { test, expect } from '@playwright/test';
const cover = (page: import('@playwright/test').Page) => page.locator('.flow-cover.is-selected');
test('search suggests exact events, Enter flips to the selection, and company filters scope results', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'Search matches' });
  await search.fill('Omega Wrestle Kingdom 17');
  await expect(page.getByRole('option', { name: /Wrestle Kingdom 17/ })).toBeVisible();
  await search.press('Enter');
  await expect(page.locator('.page-flip')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Random', exact: true })).toBeEnabled();
  await expect(cover(page)).toHaveAccessibleName(/Wrestle Kingdom 17/);
  await page.getByRole('combobox', { name: 'Company' }).selectOption('ROH');
  await expect(page.locator('.selection-count')).toContainText('/ 02');
  await search.fill('Ospreay');
  await expect(page.getByText('No matches found in roh.')).toBeVisible();
  await search.fill('Briscoe');
  await search.press('Enter');
  await expect(cover(page)).toHaveAccessibleName(/Final Battle/);
  await expect(page.locator('.flow-cover')).toHaveCount(2);
});
test('downloaded highlighting keeps missing covers grey and applies within company filters', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.assign(window, {
      vault: {
        chooseVideoFolder: async () => ({ name: 'Videos' }),
        getVideoAvailability: async () => [
          'omega-okada-dominion-2018',
          'danielson-ospreay-dynasty-2024',
        ],
      },
    }),
  );
  await page.goto('/');
  const downloaded = page.getByRole('button', { name: 'Downloaded only' });
  await expect(downloaded).toBeEnabled();
  await downloaded.click();
  await expect(cover(page)).not.toHaveClass(/is-unavailable/);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect(cover(page)).not.toHaveClass(/is-unavailable/);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect(cover(page)).toHaveClass(/is-unavailable/);
  await page.getByRole('combobox', { name: 'Company' }).selectOption('ROH');
  await expect(page.locator('.flow-cover.is-unavailable')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Random', exact: true })).toBeDisabled();
  await downloaded.click();
  await expect(page.locator('.flow-cover.is-unavailable')).toHaveCount(0);
});
test('page navigation produces synthesized ticks and mute stops new sounds', async ({ page }) => {
  await page.addInitScript(() => {
    let ticks = 0;
    const Original = window.AudioContext;
    class CountedAudio extends Original {
      createOscillator() {
        Object.assign(window, { ticks: ++ticks });
        return super.createOscillator();
      }
    }
    window.AudioContext = CountedAudio;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { ticks: number }).ticks))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Mute sounds' }).click();
  const ticks = await page.evaluate(() => (window as unknown as { ticks: number }).ticks);
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { ticks: number }).ticks)).toBe(ticks);
});
