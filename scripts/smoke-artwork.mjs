import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
const temporary = await mkdtemp(path.join(tmpdir(), 'vault-lookup-'));
const videos = path.join(temporary, 'videos');
await mkdir(videos);
const artwork = await readFile('public/art/cagematch100/001.jpg');
const html =
  (await readFile('tests/fixtures/cagematch/6651.html', 'utf8')) +
  '<meta property="og:image" content="/poster.jpg">';
const bootstrap = path.join(temporary, 'bootstrap.cjs');
// Only remote responses are fixtures. Main, preload, Chromium fetch and parsing are real.
await writeFile(
  bootstrap,
  `
const {app,session,dialog,BrowserWindow}=require('electron');
app.disableHardwareAcceleration();app.setPath('userData',${JSON.stringify(path.join(temporary, 'profile'))});
global.fetch=async()=>{throw new Error('Node fetch must not be used for CAGEMATCH');};
global.__folderPrompts=0;dialog.showOpenDialog=async()=>{global.__folderPrompts++;return {canceled:false,filePaths:[${JSON.stringify(videos)}]};};
const savedSetMenu=BrowserWindow.prototype.setMenu;
BrowserWindow.prototype.setMenu=function(menu){this.__lookupMenu=menu;return savedSetMenu.call(this,menu);};
let challengeRequests=0;global.__lookupRequests=[];global.__lookupBrowserShows=0;
app.on('browser-window-created',(_event,window)=>{if(window.getParentWindow())window.on('show',()=>global.__lookupBrowserShows++);});
app.whenReady().then(()=>{
 const lookup=session.fromPartition('persist:cagematch-lookup');
 lookup.protocol.handle('https',request=>{
  const url=new URL(request.url);global.__lookupRequests.push(request.url);
  if(url.hostname!=='www.cagematch.net')return new Response(null,{status:403});
  if(url.pathname==='/poster.jpg')return new Response(Buffer.from(${JSON.stringify(artwork.toString('base64'))},'base64'),{headers:{'Content-Type':'image/jpeg'}});
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
  await expect(page.getByRole('button', { name: 'Video folder: videos' })).toBeVisible();
  await page.getByRole('button', { name: 'Add match', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('CAGEMATCH match link').fill('https://www.cagematch.net/?id=111&nr=6651');
  await form.getByRole('button', { name: 'Import in app browser', exact: true }).click();
  await expect(form.getByRole('img', { name: 'Chosen match artwork' })).toBeVisible();
  expect(await readFile(path.join(videos, 'images', 'cagematch-user-6651.jpg'))).toEqual(artwork);
  expect(await page.evaluate(() => window.vault.getSavedVideoFolder())).toEqual({ name: 'videos' });
  expect(await app.evaluate(() => global.__folderPrompts)).toBe(1);
  await form.getByRole('button', { name: 'Add match', exact: true }).click();
  await expect(form).not.toBeVisible();
  expect((await page.evaluate(() => window.vault.getLibrary())).records).toHaveLength(1);
  await page.evaluate(() =>
    window.vault.findMatchArtwork('https://www.cagematch.net/?id=111&nr=6651'),
  );
  expect(await readFile(path.join(videos, 'images', 'cagematch-user-6651.jpg'))).toEqual(artwork);
  console.log(
    'Electron artwork import passed: hidden browser extraction, exact image bytes saved under images, existing image reused, folder restored without prompting, and match saved with retrieved artwork. Website responses were local fixtures.',
  );
} finally {
  await app?.close();
  await rm(temporary, { recursive: true, force: true });
}
