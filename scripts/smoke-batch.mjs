import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
const temporary = await mkdtemp(path.join(tmpdir(), 'vault-lookup-'));
const videos = path.join(temporary, 'videos');
await mkdir(videos);
const artwork = await readFile('public/art/cagematch100/001.jpg');
const html = await readFile('tests/fixtures/cagematch/6651.html', 'utf8');
const bootstrap = path.join(temporary, 'bootstrap.cjs');
// Only remote responses are fixtures. Main, preload, Chromium fetch and parsing are real.
await writeFile(
  bootstrap,
  `
const {app,session,dialog,BrowserWindow}=require('electron');
app.disableHardwareAcceleration();app.setPath('userData',${JSON.stringify(path.join(temporary, 'profile'))});
global.fetch=async()=>{throw new Error('Node fetch must not be used for CAGEMATCH');};
global.__folderPrompts=0;dialog.showOpenDialog=async()=>{global.__folderPrompts++;return {canceled:false,filePaths:[${JSON.stringify(videos)}]};};
global.__searches=[];global.__browserShows=0;global.__lookupRequests=[];
require('node:dns/promises').lookup=async()=>[{address:'8.8.8.8',family:4}];
app.on('browser-window-created',(_event,window)=>{if(window.getParentWindow())window.on('show',()=>global.__browserShows++);});
app.whenReady().then(()=>{
 const lookup=session.fromPartition('persist:cagematch-lookup');
 lookup.protocol.handle('https',request=>{
  const url=new URL(request.url);
  if(url.hostname!=='www.cagematch.net')return new Response(null,{status:403});
  global.__lookupRequests.push(request.url);
  if(url.searchParams.get('nr')==='78888888')return new Response('<html><body>Too many requests</body></html>',{status:429,headers:{'Content-Type':'text/html'}});
  return new Response(${JSON.stringify(html)},{headers:{'Content-Type':'text/html'}});
 });
 session.fromPartition('persist:google-artwork').protocol.handle('https',request=>{
  const url=new URL(request.url);
  if(url.hostname!=='www.google.com')return new Response(null,{status:403});
  const query=url.searchParams.get('q');global.__searches.push(query);
  const kind=query.includes('event poster')?'poster':query.includes('match graphic')?'graphic':'photo';
  return new Response('<html><script>const results=[["https://art.example.com/'+kind+'.jpg",800,600]];</script></html>',{headers:{'Content-Type':'text/html'}});
 });
 session.fromPartition('artwork-downloads').protocol.handle('https',request=>{
  const url=new URL(request.url);
  if(url.hostname!=='art.example.com')return new Response(null,{status:403});
  if(url.pathname==='/poster.jpg')return new Response('invalid poster bytes');
  return new Response(Buffer.from(${JSON.stringify(artwork.toString('base64'))},'base64'),{headers:{'Content-Type':'image/jpeg'}});
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
  await expect(page.getByRole('button', { name: 'Video folder: videos' })).toBeVisible();
  // Seed the legacy HTTP-reader cooldown: browser batches must ignore it.
  await page.evaluate(() =>
    window.vault.lookupMatch('https://www.cagematch.net/?id=111&nr=99999996'),
  );
  await page.getByRole('button', { name: 'Batch upload', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Batch upload', exact: true });
  await form
    .getByLabel('CAGEMATCH match URLs')
    .fill(
      [
        'https://www.cagematch.net/?id=111&nr=6651',
        'https://www.cagematch.net/?id=111&nr=99999997',
        'https://www.cagematch.net/?id=111&nr=6651',
        'https://www.cagematch.net/?id=111&nr=8034',
        'https://www.cagematch.net/?id=1&nr=999',
      ].join('\n'),
    );
  await form.getByRole('button', { name: 'Import all', exact: true }).click();
  await expect(form.getByRole('status').first()).toContainText(
    'Batch finished: 2 imported · 2 skipped · 1 failed',
    { timeout: 20000 },
  );
  const snapshot = await page.evaluate(() => window.vault.getLibrary());
  expect(snapshot.records).toHaveLength(2);
  expect(snapshot.records[0].title).toBe('Johnny Mundo vs. Prince Puma');
  expect(snapshot.records[0].sourceStatus).toBe('auto-imported');
  expect(snapshot.status.pending).toBe(2);
  expect(await readFile(path.join(videos, 'images', 'cagematch-user-6651.jpg'))).toEqual(artwork);
  expect(await app.evaluate(() => global.__browserShows)).toBe(0);
  await form
    .getByLabel('CAGEMATCH match URLs')
    .fill(
      'https://www.cagematch.net/?id=111&nr=78888888\nhttps://www.cagematch.net/?id=111&nr=99999995',
    );
  await form.getByRole('button', { name: 'Import all', exact: true }).click();
  await expect(form.getByRole('status').first()).toContainText(
    'Batch finished: 0 imported · 0 skipped · 1 failed',
  );
  await expect(form.locator('.batch-results li').first()).toContainText('HTTP 429');
  await expect(form.locator('.batch-results li').nth(1)).toContainText('cancelled');
  expect(
    (await app.evaluate(() => global.__lookupRequests)).some((url) => url.includes('nr=99999995')),
  ).toBe(false);
  await form.getByRole('button', { name: 'Close batch upload', exact: true }).click();
  await expect(page.locator('.selection-count')).toContainText('/ 102');
  await expect(page.getByRole('dialog', { name: 'Add your own match' })).not.toBeVisible();
  console.log(
    'Electron batch passed: sequential multi-entry import without fixed delays even with a pre-existing cooldown, stopping on a real HTTP 429 fixture, one-click automatic metadata/artwork/save, duplicate and existing-entry skipping, invalid-URL reporting, queued GitHub sync and no per-entry confirmation. All remote responses were local fixtures.',
  );
} finally {
  await app?.close();
  await rm(temporary, { recursive: true, force: true });
}
