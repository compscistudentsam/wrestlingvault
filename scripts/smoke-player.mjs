import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Launch the real main/preload/renderer; only the native folder chooser is automated.
const temporary = await mkdtemp(path.join(tmpdir(), 'vault-real-player-'));
const videos = path.join(temporary, 'videos');
await mkdir(videos);
const fixture = path.resolve('tests/fixtures/playback.webm');
await copyFile(fixture, path.join(videos, 'omega-okada-dominion-2018.webm'));
const bootstrap = path.join(temporary, 'bootstrap.cjs');
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await writeFile(
  bootstrap,
  `const {app,dialog}=require('electron'); app.setVersion(${JSON.stringify(version)}); app.disableHardwareAcceleration(); dialog.showOpenDialog=async()=>({canceled:false,filePaths:[${JSON.stringify(videos)}]}); require(${JSON.stringify(path.resolve('dist-electron/main.cjs'))});`,
);
let application;
try {
  application = await electron.launch({
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
  const page = await application.firstWindow();
  await expect(page.getByRole('button', { name: 'Video folder: videos' })).toBeVisible();
  const files = await page.evaluate(() => window.vault.getMatchVideos('omega-okada-dominion-2018'));
  expect(files).toHaveLength(1);
  const result = await application.evaluate(async ({ net }, url) => {
    const response = await net.fetch(url, { headers: { Range: 'bytes=100-199' } });
    return {
      status: response.status,
      range: response.headers.get('content-range'),
      length: response.headers.get('content-length'),
      bytes: [...new Uint8Array(await response.arrayBuffer())],
    };
  }, files[0].url);
  const bytes = await readFile(fixture);
  expect(result).toEqual({
    status: 206,
    range: `bytes 100-199/${bytes.length}`,
    length: '100',
    bytes: [...bytes.subarray(100, 200)],
  });
  await page.locator('.flow-cover.is-selected').click();
  const video = page.locator('video');
  await expect.poll(() => video.evaluate((node) => node.readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate((node) => {
    node.pause();
    node.currentTime = 2;
  });
  await page.getByRole('button', { name: 'Forward 10 seconds' }).click();
  await expect.poll(() => video.evaluate((node) => node.currentTime)).toBeGreaterThanOrEqual(11.9);
  await page.getByRole('button', { name: 'Back 10 seconds' }).click();
  await expect.poll(() => video.evaluate((node) => node.currentTime)).toBeLessThan(2.1);
  await page.getByRole('slider', { name: 'Video position' }).fill('20');
  await expect.poll(() => video.evaluate((node) => node.currentTime)).toBeGreaterThanOrEqual(19.9);
  await page.getByRole('button', { name: 'Play video', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause video', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause video', exact: true }).click();
  await expect.poll(() => video.evaluate((node) => node.paused)).toBe(true);
  const normal = await video.boundingBox();
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1920, 1080),
  );
  await expect.poll(async () => (await video.boundingBox()).width).toBeGreaterThan(normal.width);
  await expect.poll(async () => (await video.boundingBox()).height).toBeGreaterThan(normal.height);
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.screenshot({ path: 'artifacts/screenshots/electron-player.png' });
  console.log(
    'Real Electron player passed: authorized folder, exact 206 byte range, seeking, timeline, play/pause and resize.',
  );
} finally {
  await application?.close();
  await rm(temporary, { recursive: true, force: true });
}
