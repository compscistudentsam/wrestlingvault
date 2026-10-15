import { _electron as electron, expect } from '@playwright/test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { buildElectron } from './build-electron.mjs';

const temporary = await mkdtemp(path.join(tmpdir(), 'wrestling-vault-smoke-'));
await mkdir('artifacts/screenshots', { recursive: true });
const development = process.argv.includes('--development');
let server;
let application;
const errors = [];
let testingBlockedFetch = false;
try {
  if (development) {
    await buildElectron();
    server = await createServer();
    await server.listen();
  }
  application = await electron.launch({
    chromiumSandbox: true,
    args: [
      '.',
      '--disable-dev-shm-usage',
      ...(process.platform === 'linux' ? ['--disable-setuid-sandbox'] : []),
    ],
    env: {
      ...process.env,
      XDG_CONFIG_HOME: path.join(temporary, 'config'),
      XDG_CACHE_HOME: path.join(temporary, 'cache'),
      WV_DEV_SERVER_URL: development ? 'http://127.0.0.1:5173/' : '',
    },
    timeout: 30000,
  });
  const page = await application.firstWindow();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const expectedRejection =
      testingBlockedFetch &&
      text.includes('https://www.iwnerd.com/') &&
      (text.includes('Content Security Policy') || text.includes('connect-src'));
    if (!expectedRejection) errors.push(text);
  });
  await expect(page.locator('.flow-cover.is-selected')).toBeVisible();
  const flags = await application.evaluate(({ BrowserWindow }) => {
    const preferences = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return {
      contextIsolation: preferences.contextIsolation,
      nodeIntegration: preferences.nodeIntegration,
      sandbox: preferences.sandbox,
      webSecurity: preferences.webSecurity,
    };
  });
  expect(await application.evaluate(({ app }) => app.commandLine.hasSwitch('no-sandbox'))).toBe(
    false,
  );
  expect(flags).toEqual({
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
  });
  expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
  expect(await page.evaluate(() => typeof window.process)).toBe('undefined');
  expect(await page.evaluate(() => Object.keys(window.vault).sort())).toEqual([
    'chooseVideoFolder',
    'getMatchVideos',
    'getVideoAvailability',
    'getVersion',
    'openExternal',
  ]);
  expect(await page.evaluate(() => window.vault.getVersion())).toBe('0.1.0');
  expect(
    await page.evaluate(async () => {
      try {
        await window.vault.openExternal('file:///etc/passwd');
        return 'accepted';
      } catch {
        return 'rejected';
      }
    }),
  ).toBe('rejected');
  await page.getByRole('button', { name: 'Next match', exact: true }).click();
  await expect(page.locator('.selection-caption h2')).toContainText('Will Ospreay');
  await page.locator('.flow-cover.is-selected').click();
  await expect(
    page.getByRole('heading', { name: 'Will Ospreay vs. Bryan Danielson', exact: true, level: 1 }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to covers', exact: true }).click();
  await expect(page.locator('.flow-cover.is-selected')).toHaveAccessibleName(
    /Open Will Ospreay.*Dynasty/,
  );
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    Math.random = () => 0.25;
  });
  await page.getByRole('button', { name: 'Random', exact: true }).click();
  await expect(page.locator('.flow-cover.is-selected')).toHaveAccessibleName(/High Stakes/);
  await expect(page.locator('.page-flip')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `artifacts/screenshots/electron-${development ? 'development' : 'production'}.png`,
  });
  expect(errors).toEqual([]);
  if (!development) {
    // Prove CSP blocks the request locally; an upstream network failure is not sufficient.
    testingBlockedFetch = true;
    const policy = await page.evaluate(async () => {
      const violation = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 2000);
        document.addEventListener(
          'securitypolicyviolation',
          (event) => {
            clearTimeout(timeout);
            resolve({ directive: event.effectiveDirective, url: event.blockedURI });
          },
          { once: true },
        );
      });
      try {
        await fetch('https://www.iwnerd.com/');
      } catch {
        // The policy-violation event below, not a failed request alone, is the assertion.
      }
      return violation;
    });
    expect(policy).toEqual({ directive: 'connect-src', url: 'https://www.iwnerd.com/' });
    testingBlockedFetch = false;
  }
  expect(errors).toEqual([]);
  console.log(
    `Electron ${development ? 'development' : 'production'} smoke passed: cover browsing, click-through, isolated preload, IPC validation, ${development ? 'Vite' : 'bundled offline'} assets.`,
  );
} finally {
  await application?.close();
  await server?.close();
  await rm(temporary, { recursive: true, force: true });
}
