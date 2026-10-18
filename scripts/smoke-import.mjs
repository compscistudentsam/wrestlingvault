import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const temporary = await mkdtemp(path.join(tmpdir(), 'vault-real-import-'));
const videos = path.join(temporary, 'videos');
await mkdir(videos);
const id = 'cagematch-user-99999999';
await copyFile('tests/fixtures/playback.webm', path.join(videos, `${id}.webm`));
const art = path.resolve('public/art/cagematch100/001.jpg');
const bootstrap = path.join(temporary, 'bootstrap.cjs');
await writeFile(
  bootstrap,
  `const {app,dialog}=require('electron');app.disableHardwareAcceleration();app.setPath('userData',${JSON.stringify(path.join(temporary, 'profile'))});global.fetch=async()=>{throw new Error('Offline test: network disabled');};dialog.showOpenDialog=async(_window,options)=>({canceled:false,filePaths:[options.properties.includes('openDirectory')?${JSON.stringify(videos)}:${JSON.stringify(art)}]});require(${JSON.stringify(path.resolve('dist-electron/main.cjs'))});`,
);
let application;
const launch = async () =>
  electron.launch({
    chromiumSandbox: true,
    args: [
      bootstrap,
      '--disable-dev-shm-usage',
      ...(process.platform === 'linux'
        ? [
            '--disable-setuid-sandbox',
            ...(process.env.WV_HEADLESS ? ['--ozone-platform=headless', '--headless'] : []),
          ]
        : []),
    ],
    env: {
      ...process.env,
      WV_DEV_SERVER_URL: '',
      XDG_CONFIG_HOME: path.join(temporary, 'config'),
      XDG_CACHE_HOME: path.join(temporary, 'cache'),
    },
    timeout: 15000,
  });
try {
  application = await launch();
  let page = await application.firstWindow();
  await expect(page.getByRole('button', { name: 'Video folder: videos' })).toBeVisible();
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add your own match' });
  await dialog
    .getByLabel('CAGEMATCH match link')
    .fill('https://www.cagematch.net/?id=111&nr=99999999');
  await dialog.getByRole('button', { name: 'Manual Entry', exact: true }).click();
  await dialog.getByLabel('Opponents or teams').fill('Test Wrestler\nOther Wrestler');
  await dialog.getByLabel('Event', { exact: true }).fill('Offline Import Test');
  await dialog.getByLabel('Company', { exact: true }).fill('Test Company');
  await dialog.getByLabel('Date', { exact: true }).fill('2025-04-27');
  await dialog.getByRole('button', { name: 'Choose artwork', exact: true }).click();
  await expect(dialog.getByRole('img', { name: 'Chosen match artwork' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Add match', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.flow-cover.is-selected')).toHaveAccessibleName(
    /Test Wrestler.*Offline Import Test/,
  );
  const image = page.locator('.flow-cover.is-selected img');
  await expect(image).toHaveJSProperty('naturalWidth', 480);
  const snapshot = await page.evaluate(() => window.vault.getLibrary());
  expect(snapshot.records).toHaveLength(1);
  expect(snapshot.status.pending).toBe(1);
  expect(snapshot.status.connected).toBe(false);
  const imageResponse = await application.evaluate(async ({ net }, url) => {
    const response = await net.fetch(url);
    return { status: response.status, bytes: [...new Uint8Array(await response.arrayBuffer())] };
  }, `vault-art://local/${id}.jpg`);
  expect(imageResponse.status).toBe(200);
  expect(Buffer.from(imageResponse.bytes)).toEqual(await readFile(art));
  await application.close();
  application = await launch();
  page = await application.firstWindow();
  await expect
    .poll(async () => (await page.evaluate(() => window.vault.getLibrary())).records.length)
    .toBe(1);
  expect((await page.evaluate(() => window.vault.getLibrary())).status.pending).toBe(1);
  await page.goto(`${page.url().split('#')[0]}#/match/${id}`);
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((node) => node.readyState)).toBeGreaterThanOrEqual(2);
  await expect(video).toHaveJSProperty('muted', true);
  const files = await page.evaluate((id) => window.vault.getMatchVideos(id), id);
  expect(files).toHaveLength(1);
  console.log(
    'Real Electron import passed: native artwork selection, local save, custom image protocol, offline queue after restart, and imported-match video playback. No external requests or repository writes were made.',
  );
} finally {
  await application?.close();
  await rm(temporary, { recursive: true, force: true });
}
