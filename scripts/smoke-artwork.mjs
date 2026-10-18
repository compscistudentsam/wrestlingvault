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
global.__searches=[];global.__browserShows=0;
require('node:dns/promises').lookup=async()=>[{address:'8.8.8.8',family:4}];
app.on('browser-window-created',(_event,window)=>{if(window.getParentWindow())window.on('show',()=>global.__browserShows++);});
app.whenReady().then(()=>{
 const lookup=session.fromPartition('persist:cagematch-lookup');
 lookup.protocol.handle('https',request=>{
  const url=new URL(request.url);
  if(url.hostname!=='www.cagematch.net')return new Response(null,{status:403});
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
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('CAGEMATCH match link').fill('https://www.cagematch.net/?id=111&nr=6651');
  await form.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(form.getByRole('img', { name: 'Chosen match artwork' })).toBeVisible();
  expect(await readFile(path.join(videos, 'images', 'cagematch-user-6651.jpg'))).toEqual(artwork);
  expect(await page.evaluate(() => window.vault.getSavedVideoFolder())).toEqual({ name: 'videos' });
  expect(await app.evaluate(() => global.__folderPrompts)).toBe(1);
  await form.getByRole('button', { name: 'Add match', exact: true }).click();
  await expect(form).not.toBeVisible();
  expect((await page.evaluate(() => window.vault.getLibrary())).records).toHaveLength(1);
  const searches = await app.evaluate(() => global.__searches);
  expect(searches).toHaveLength(2);
  expect(searches[0]).toContain('event poster');
  expect(searches[1]).toContain('match graphic');
  expect(await app.evaluate(() => global.__browserShows)).toBe(0);
  const provenance = JSON.parse(
    await readFile(path.join(videos, 'images', 'cagematch-user-6651.jpg.source.json'), 'utf8'),
  );
  expect(provenance.kind).toBe('graphic');
  expect(provenance.imageUrl).toBe('https://art.example.com/graphic.jpg');
  expect(await readFile(path.join(videos, 'images', 'cagematch-user-6651.jpg'))).toEqual(artwork);
  console.log(
    'Electron artwork import passed: hidden Google search, event poster then match graphic fallback, exact image bytes and provenance saved under images, folder restored without prompting, and match saved with automatically chosen artwork. Website responses were local fixtures.',
  );
} finally {
  await app?.close();
  await rm(temporary, { recursive: true, force: true });
}
