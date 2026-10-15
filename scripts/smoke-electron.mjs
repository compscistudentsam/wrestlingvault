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
  await expect(page.getByRole('heading', { name: 'All matches', exact: true })).toBeVisible();
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
  await expect(page.locator('.selection-caption h2')).toContainText('Bryan Danielson');
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bryan Danielson vs. Will Ospreay', exact: true, level: 1 }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'All Matches', exact: true })
    .click();
  await page.getByRole('searchbox').fill('1994');
  await expect(page.locator('.match-grid .match-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('navigation').getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.locator('.selection-caption h2')).toBeVisible();
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
    `Electron ${development ? 'development' : 'production'} smoke passed: rendered UI, navigation, search, isolated preload, IPC validation, ${development ? 'Vite' : 'bundled offline'} assets.`,
  );
} finally {
  await application?.close();
  await server?.close();
  await rm(temporary, { recursive: true, force: true });
}
