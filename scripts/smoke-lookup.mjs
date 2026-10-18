import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
const temporary = await mkdtemp(path.join(tmpdir(), 'vault-lookup-'));
const html = await readFile('tests/fixtures/cagematch/6651.html', 'utf8');
const bootstrap = path.join(temporary, 'bootstrap.cjs');
// Only remote responses are fixtures. Main, preload, Chromium fetch and parsing are real.
await writeFile(
  bootstrap,
  `
const {app,session,dialog,BrowserWindow}=require('electron');
app.disableHardwareAcceleration();app.setPath('userData',${JSON.stringify(path.join(temporary, 'profile'))});
global.fetch=async()=>{throw new Error('Node fetch must not be used for CAGEMATCH');};
dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});
const savedSetMenu=BrowserWindow.prototype.setMenu;
BrowserWindow.prototype.setMenu=function(menu){this.__lookupMenu=menu;return savedSetMenu.call(this,menu);};
let challengeRequests=0;global.__lookupRequests=[];global.__lookupBrowserShows=0;
app.on('browser-window-created',(_event,window)=>{if(window.getParentWindow())window.on('show',()=>global.__lookupBrowserShows++);});
app.whenReady().then(()=>{
 const lookup=session.fromPartition('persist:cagematch-lookup');
 lookup.protocol.handle('https',request=>{
  const url=new URL(request.url);global.__lookupRequests.push(request.url);
  if(url.hostname!=='www.cagematch.net')return new Response(null,{status:403});
  if(url.pathname==='/robots.txt')return new Response(null,{status:301,headers:{location:'/robots-live.txt'}});
  if(url.pathname==='/robots-live.txt')return new Response('User-agent: *\\nCrawl-delay: 527');
  if(url.searchParams.get('nr')==='6651')return new Response(${JSON.stringify(html)},{headers:{'Content-Type':'text/html'}});
  if(url.searchParams.get('nr')==='78888888')return new Response('<html><body><div class="g-recaptcha">User verification required</div></body></html>',{headers:{'Content-Type':'text/html'}});
  if(url.searchParams.get('nr')==='79999999'){
   challengeRequests++;
   if(challengeRequests===1)return new Response(null,{status:302,headers:{location:request.url}});
   return new Response('<html><body><p>Loading match...</p><script>setTimeout(()=>{document.body.innerHTML='+${JSON.stringify(JSON.stringify(html))}+'},900);</script></body></html>',{headers:{'Content-Type':'text/html'}});
  }
  return new Response(null,{status:404});
 });
});
require(${JSON.stringify(path.resolve('dist-electron/main.cjs'))});
`,
);
let app;
try {
  app = await electron.launch({
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
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('CAGEMATCH match link').fill('https://www.cagematch.net/?id=111&nr=6651');
  await dialog.getByRole('button', { name: 'Look up match', exact: true }).click();
  await expect(dialog.getByLabel('Opponents or teams')).toHaveValue('Johnny Mundo\nPrince Puma');
  await expect(dialog.getByLabel('Company', { exact: true })).toHaveValue('Lucha Underground');
  await expect(dialog.getByLabel('Event', { exact: true })).toHaveValue(
    'Lucha Underground #1.32 - All Night Long',
  );
  await expect(dialog.getByLabel('Date', { exact: true })).toHaveValue('2015-04-11');
  await expect(dialog.getByLabel('CAGEMATCH score')).toHaveValue('9.31');
  await expect(dialog.getByLabel('WON stars')).toHaveValue('');
  const requested = await app.evaluate(() => global.__lookupRequests);
  expect(requested.some((url) => url.endsWith('/robots-live.txt'))).toBe(true);
  // Advance only the local test's persisted crawl timer before exercising a second lookup.
  const stateFile = path.join(temporary, 'profile', 'personal-library', 'state.json');
  const state = JSON.parse(await readFile(stateFile, 'utf8'));
  state.nextLookup = 0;
  await writeFile(stateFile, JSON.stringify(state));
  // Restart to use that fixture clock state, while retaining the same production code.
  await app.close();
  app = await electron.launch({
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
  const parent = await app.firstWindow();
  await parent.getByRole('button', { name: 'Add match', exact: true }).click();
  const form = parent.getByRole('dialog');
  await form
    .getByLabel('CAGEMATCH match link')
    .fill('https://www.cagematch.net/?id=111&nr=79999999');
  await form.getByRole('button', { name: 'Look up match', exact: true }).click();
  await expect.poll(() => app.windows().length).toBe(2);
  const child = app.windows().find((p) => p !== parent);
  const isolation = await child.evaluate(() => ({
    node: typeof window.require,
    api: typeof window.vault,
  }));
  expect(isolation).toEqual({ node: 'undefined', api: 'undefined' });
  expect(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.getParentWindow())
        .isVisible(),
    ),
  ).toBe(false);
  await expect(form.getByLabel('Opponents or teams')).toHaveValue('Johnny Mundo\nPrince Puma');
  await expect.poll(() => app.windows().length).toBe(1);
  expect(await app.evaluate(() => global.__lookupBrowserShows)).toBe(0);
  // A genuine interaction screen is shown; cancellation remains available during cooldown.
  await form
    .getByLabel('CAGEMATCH match link')
    .fill('https://www.cagematch.net/?id=111&nr=78888888');
  await form.getByRole('button', { name: 'Import in app browser', exact: true }).click();
  await expect.poll(() => app.windows().length).toBe(2);
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.getParentWindow())
          .isVisible(),
      ),
    )
    .toBe(true);
  await app.evaluate(({ BrowserWindow }) => {
    const browser = BrowserWindow.getAllWindows().find((w) => w.getParentWindow());
    browser.__lookupMenu.items[2].click();
  });
  await expect.poll(() => app.windows().length).toBe(1);
  await expect(form.locator('.import-error').first()).toContainText('cancelled');
  // Simulate the user finishing the visible check; extraction must resume automatically.
  await form.getByRole('button', { name: 'Import in app browser', exact: true }).click();
  await expect.poll(() => app.windows().length).toBe(2);
  await expect
    .poll(() =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.getParentWindow())
          .isVisible(),
      ),
    )
    .toBe(true);
  const verification = app.windows().find((p) => p !== parent);
  await verification.evaluate((markup) => {
    document.body.innerHTML = markup;
  }, html);
  await expect.poll(() => app.windows().length).toBe(1);
  await expect(form.locator('.import-notice')).toContainText('Details imported');
  expect((await parent.evaluate(() => window.vault.getLibrary())).records).toHaveLength(0);
  console.log(
    'Real Electron lookup passed: Chromium networking instead of Node fetch, approved robots redirect, fixture metadata, redirect-loop fallback, hidden JavaScript rendering and automatic extraction without user clicks, plus visible interaction fallback, automatic extraction after user verification, cancellation during cooldown, and review before save. All website responses were local fixtures; no live CAGEMATCH connection was claimed.',
  );
} catch (error) {
  if (app) {
    console.error(
      'Lookup notices:',
      await app.windows()[0].locator('.import-notice, .import-error').allTextContents(),
    );
    console.error('Fixture requests:', await app.evaluate(() => global.__lookupRequests));
  }
  throw error;
} finally {
  await app?.close();
  await rm(temporary, { recursive: true, force: true });
}
