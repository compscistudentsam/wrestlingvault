import { test, expect } from '@playwright/test';

test('batch progress survives closing its dialog and exposes a stop action during an import', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let batch = {
      running: false,
      stopping: false,
      items: [] as { url: string; status: string }[],
    };
    Object.assign(window, {
      vault: {
        chooseVideoFolder: async () => null,
        getLibrary: async () => ({
          records: [],
          status: { connected: false, pending: 0, syncing: false, error: '', lastSyncedAt: null },
        }),
        getBatchImport: async () => batch,
        startBatchImport: async (urls: string) => {
          batch = {
            running: true,
            stopping: false,
            items: urls.split('\n').map((url) => ({ url, status: 'queued' })),
          };
          return batch;
        },
        stopBatchImport: async () => {
          batch = {
            ...batch,
            running: false,
            stopping: true,
            items: batch.items.map((item) => ({ ...item, status: 'cancelled' })),
          };
          return batch;
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Batch upload', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Batch upload', exact: true });
  await dialog
    .getByLabel('CAGEMATCH match URLs')
    .fill('https://www.cagematch.net/?id=111&nr=6651\nhttps://www.cagematch.net/?id=111&nr=6851');
  await dialog.getByRole('button', { name: 'Import all', exact: true }).click();
  await expect(dialog.getByRole('status').first()).toContainText('Importing batch');
  await expect(dialog.getByText(/Waiting for CAGEMATCH cooldown/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close batch upload', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Batch upload (0/2)', exact: true }).click();
  await expect(dialog.getByLabel('CAGEMATCH match URLs')).toBeDisabled();
  await dialog.getByRole('button', { name: 'Stop after current match', exact: true }).click();
  await expect(dialog.getByRole('status').first()).toContainText('Batch finished');
  await expect(dialog.locator('.batch-results li')).toHaveCount(2);
  await expect(dialog.locator('.batch-results li').first()).toContainText('cancelled');
  await expect(page.getByRole('dialog', { name: 'Add your own match' })).not.toBeVisible();
});
