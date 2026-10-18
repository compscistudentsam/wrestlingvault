import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Match } from '../../src/data/catalogue';
const matches: Match[] = JSON.parse(readFileSync('src/data/matches.json', 'utf8'));

test.beforeEach(async ({ page }) => {
  await page.addInitScript((base) => {
    const records: unknown[] = [];
    const status = {
      connected: false,
      pending: 0,
      syncing: false,
      error: '',
      lastSyncedAt: null as string | null,
    };
    Object.assign(window, {
      vault: {
        chooseVideoFolder: async () => null,
        getLibrary: async () => ({ records, status }),
        lookupMatch: async () => {
          throw new Error(
            "Error invoking remote method 'vault:lookup-match': Error: CAGEMATCH is unavailable. Enter the details manually.",
          );
        },
        chooseMatchArtwork: async () => ({
          token: 'chosen-artwork',
          preview:
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="679"/%3E',
          name: 'poster.jpg',
          width: 480,
          height: 679,
        }),
        addMatch: async (d: Record<string, unknown>, token: string) => {
          if (token !== 'chosen-artwork') throw new Error('Invalid artwork token');
          if (records.length) throw new Error('This CAGEMATCH match is already in your library.');
          const record = {
            ...base,
            ...d,
            id: 'cagematch-user-99999999',
            rank: 101,
            title: (d.wrestlers as string[]).join(' vs. '),
            sourceStatus: 'user-reviewed',
            shortNames: ['TEST', 'OTHER'],
            videoNameGroups: [['TEST', 'OTHER']],
            image: base.image,
          };
          records.push(record);
          status.pending = 1;
          return { records: [...records], status: { ...status } };
        },
        connectGitHub: async () => {
          status.connected = true;
          return { records, status: { ...status } };
        },
        disconnectGitHub: async () => {
          status.connected = false;
          return { records, status: { ...status } };
        },
        syncLibrary: async () => {
          if (status.connected) {
            status.pending = 0;
            status.lastSyncedAt = new Date().toISOString();
          }
          return { records, status: { ...status } };
        },
        getMatchVideos: async () => [],
      },
    });
  }, matches[0]);
});
async function fill(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add your own match' });
  await dialog
    .getByLabel('CAGEMATCH match link')
    .fill('https://www.cagematch.net/?id=111&nr=99999999');
  await dialog.getByRole('button', { name: 'Look up match' }).click();
  await expect(dialog.getByRole('status').first()).toContainText('unavailable');
  await expect(dialog.getByRole('status').first()).not.toContainText(
    'Error invoking remote method',
  );
  await dialog.getByLabel('Opponents or teams').fill('Test Wrestler\nOther Wrestler');
  await dialog.getByLabel('Event', { exact: true }).fill('Personal Event');
  await dialog.getByLabel('Company', { exact: true }).fill('My Company');
  await dialog.getByLabel('Date', { exact: true }).fill('2025-04-27');
  await dialog.getByRole('button', { name: 'Choose artwork', exact: true }).click();
  await expect(dialog.getByRole('img', { name: 'Chosen match artwork' })).toBeVisible();
  return dialog;
}
test('review saves an unrated custom match into the current grid, filters and player without GitHub credentials', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  const dialog = await fill(page);
  await page.screenshot({ path: 'artifacts/screenshots/add-match-review.png' });
  await dialog.getByRole('button', { name: 'Add match', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.grid-browser .flow-cover')).toHaveCount(101);
  const selected = page.locator('.flow-cover.is-selected');
  await expect(selected).toHaveAccessibleName(/Test Wrestler.*Personal Event/);
  await expect(selected.locator('.cover-bottom')).toContainText('Unrated');
  await expect(page.getByRole('button', { name: '1 queued', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Company', exact: true }).selectOption('My Company');
  await expect(page.locator('.flow-cover')).toHaveCount(1);
  await selected.click();
  await expect(
    page.getByRole('heading', { name: 'Test Wrestler vs. Other Wrestler', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.source-box')).toContainText('CAGEMATCH score not supplied');
});
test('GitHub connection clears the password field and retry updates the upload status', async ({
  page,
}) => {
  await page.goto('/');
  const dialog = await fill(page);
  await dialog.getByRole('button', { name: 'Add match', exact: true }).click();
  await page.getByRole('button', { name: '1 queued', exact: true }).click();
  await dialog.locator('summary').click();
  await dialog.getByLabel('GitHub token', { exact: true }).fill('github_pat_fake_ui_test_only');
  await dialog.getByRole('button', { name: 'Connect GitHub', exact: true }).click();
  await expect(dialog.getByLabel('GitHub token', { exact: true })).toHaveCount(0);
  await expect(dialog.locator('summary')).toContainText('Connected');
  await dialog.getByRole('button', { name: 'Sync now / retry', exact: true }).click();
  await expect(dialog.getByRole('status').last()).toContainText('up to date');
  await dialog.getByRole('button', { name: 'Disconnect GitHub', exact: true }).click();
  await expect(dialog.getByLabel('GitHub token', { exact: true })).toHaveValue('');
});
test('bad links stay on the link step and cancelling does not add a match', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('CAGEMATCH match link').fill('https://www.cagematch.net/?id=1&nr=123');
  await dialog.getByRole('button', { name: 'Enter details manually', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('match link');
  await expect(dialog.getByLabel('Opponents or teams')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.selection-count')).toContainText('/ 100');
});

test('browser-copied page text fills the review without another background lookup', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('CAGEMATCH match link').fill('https://www.cagematch.net/?id=111&nr=6651');
  await dialog.getByRole('button', { name: 'Paste page text', exact: true }).click();
  await dialog
    .getByLabel('Copied CAGEMATCH page text')
    .fill(
      'A Wrestler vs. B Wrestler\nDate: 27.04.2025\nEvent: Test Event\nPromotion: NJPW\nTime: 25:10\nAverage rating: 9.75',
    );
  await dialog.getByRole('button', { name: 'Fill details from text', exact: true }).click();
  await expect(dialog.getByLabel('Opponents or teams')).toHaveValue('A Wrestler\nB Wrestler');
  await expect(dialog.getByLabel('Event', { exact: true })).toHaveValue('Test Event');
  await expect(dialog.getByLabel('Date', { exact: true })).toHaveValue('2025-04-27');
  await expect(dialog.getByLabel('CAGEMATCH score')).toHaveValue('9.75');
  await expect(dialog.getByLabel('WON stars')).toHaveValue('');
});
