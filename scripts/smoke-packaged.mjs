import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
if (process.platform !== 'win32' || process.env.CI !== 'true') {
  throw new Error('Run the packaged Windows smoke test only on an isolated Windows CI runner.');
}
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const profile = path.join(process.env.APPDATA, 'wrestling-vault');
try {
  await lstat(profile);
  throw new Error('Refusing to replace an existing app profile.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const temporary = await mkdtemp(path.join(tmpdir(), 'vault-packaged-'));
const videos = path.join(temporary, 'videos');
await mkdir(videos);
await mkdir(profile, { recursive: true });
await writeFile(path.join(profile, 'media-folder.json'), JSON.stringify({ root: videos }));
let app;
try {
  app = await electron.launch({
    executablePath: path.resolve('release/win-unpacked/Wrestling Vault.exe'),
    chromiumSandbox: true,
    timeout: 60000,
    env: { ...process.env, WV_DEV_SERVER_URL: '' },
  });
  const page = await app.firstWindow();
  await expect(page.getByRole('button', { name: 'Video folder: videos' })).toBeVisible();
  expect(await page.evaluate(() => window.vault.getVersion())).toBe(version);
  expect(
    await page.evaluate(() => ({ node: typeof window.require, ipc: typeof window.vault })),
  ).toEqual({ node: 'undefined', ipc: 'object' });
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await expect
    .poll(() => page.locator('.grid-browser .flow-cover').count())
    .toBeGreaterThanOrEqual(100);
  await page.locator('.grid-browser .flow-cover').first().click();
  await expect(page.getByRole('button', { name: 'Edit entry', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit entry', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit match', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close edit match', exact: true }).click();
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.screenshot({ path: 'artifacts/screenshots/windows-packaged.png' });
  console.log(
    'Packaged Windows app launched: sandboxed preload/IPC, saved media folder, catalogue, grid, details and editor verified. Installation and real local-video playback still need a manual Windows check.',
  );
} finally {
  await app?.close();
  await rm(profile, { recursive: true, force: true });
  await rm(temporary, { recursive: true, force: true });
}
