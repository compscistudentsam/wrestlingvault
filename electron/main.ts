import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  dialog,
  protocol,
  safeStorage,
} from 'electron';
import path from 'node:path';
import { realpath, readFile, writeFile, rm, stat, mkdir, lstat } from 'node:fs/promises';
import { BatchImporter } from './batch-import';
import { cagematchNetwork } from './cagematch-network';
import { importFromCagematchBrowser } from './cagematch-browser';
import { isCagematchAddress } from './cagematch-request';
import { PersonalLibrary } from './personal-library';
import { googleImageSearch, publicImageURL } from './google-images';
import { searchGoogleImages, googleBrowserURL } from './google-images-browser';
import { downloadImage } from './image-download';
import { cagematchURL } from '../src/shared/imports';
import { inspectArtwork } from './artwork';
import type { ChosenArtwork } from '../src/shared/imports';
import { randomUUID } from 'node:crypto';
import { inside } from './videos';
import { videoResponse } from './video-response';
import { scanVideoFolder, type VideoIndex } from './video-index';
import { matches } from '../src/data/catalogue';
import { pathToFileURL } from 'node:url';
import { isTrustedRendererURL, validateExternalURL } from '../src/shared/security';

protocol.registerSchemesAsPrivileged([
  { scheme: 'vault-art', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  {
    scheme: 'vault-video',
    privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true },
  },
]);
let library: PersonalLibrary | null = null;
let libraryError = '';
let stagedArtwork: { token: string; bytes: Buffer } | null = null;
const allMatches = () => library?.allMatches() ?? [...matches];
let videoRoot: string | null = null;
let videoIndex: VideoIndex = new Map();
const videoFiles = new Map<string, string>();
let window: BrowserWindow | null = null;
const developmentURL = !app.isPackaged && process.env.WV_DEV_SERVER_URL;
if (developmentURL && developmentURL !== 'http://127.0.0.1:5173/') {
  throw new Error('Unexpected development server address.');
}
const appURL = developmentURL || pathToFileURL(path.join(__dirname, '../dist/index.html')).href;

function assertSender(event: Electron.IpcMainInvokeEvent) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    !isTrustedRendererURL(event.senderFrame.url, appURL)
  ) {
    throw new Error('Untrusted IPC sender.');
  }
}

function createWindow() {
  window = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#10131B',
    title: 'Wrestling Vault',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererURL(url, appURL)) event.preventDefault();
  });
  window.webContents.on('will-frame-navigate', (event) => {
    if (!isTrustedRendererURL(event.url, appURL)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('render-process-gone', (_event, details) =>
    console.error('Renderer exited:', details.reason),
  );
  window.once('ready-to-show', () => window?.show());
  window.on('closed', () => {
    window = null;
  });
  void window.loadURL(appURL).catch((error: unknown) => {
    console.error('Application failed to load.', error);
    app.quit();
  });
}

void app.whenReady().then(async () => {
  // Dedicated browser networking: honours the desktop proxy/certificate configuration,
  // without opening internet access to the app renderer or sharing GitHub credentials.
  const cagematchSession = session.fromPartition('persist:cagematch-lookup');
  cagematchSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  cagematchSession.setPermissionCheckHandler(() => false);
  cagematchSession.on('will-download', (event) => event.preventDefault());
  cagematchSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    callback({ cancel: !isCagematchAddress(details.url) });
  });
  const googleSession = session.fromPartition('persist:google-artwork');
  googleSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  googleSession.setPermissionCheckHandler(() => false);
  googleSession.on('will-download', (event) => event.preventDefault());
  googleSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    let allowed = googleBrowserURL(details.url);
    try {
      const url = new URL(details.url);
      allowed ||=
        url.protocol === 'https:' &&
        !url.port &&
        ['gstatic.com', 'googleusercontent.com', 'google.com'].some(
          (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
        );
    } catch {
      /* Deny unrecognised resources. */
    }
    callback({ cancel: !allowed });
  });
  const imageSession = session.fromPartition('artwork-downloads');
  imageSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  imageSession.setPermissionCheckHandler(() => false);
  imageSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) =>
    callback({ cancel: !publicImageURL(details.url) }),
  );
  const libraryRoot = path.join(app.getPath('userData'), 'personal-library');
  const tokenFile = path.join(libraryRoot, 'github-credential');
  try {
    const service = new PersonalLibrary({
      root: libraryRoot,
      inspectImage: inspectArtwork,
      readBundledArtwork: (match) => readFile(path.join(__dirname, '../dist/art', match.image)),
      lookupRequest: cagematchNetwork(cagematchSession),
      browserLookup: (url) => {
        if (!window) throw new Error('Open the application window before looking up a match.');
        return importFromCagematchBrowser(window, cagematchSession, url);
      },
      getToken: async () => {
        let encrypted: Buffer;
        try {
          encrypted = await readFile(tokenFile);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }
        if (
          !safeStorage.isEncryptionAvailable() ||
          (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
        )
          throw new Error('Secure credential storage is unavailable.');
        return safeStorage.decryptString(encrypted);
      },
      setToken: async (token) => {
        if (
          !safeStorage.isEncryptionAvailable() ||
          (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
        )
          throw new Error(
            'Secure credential storage is unavailable. Enable your system keychain before connecting GitHub. Local matches can still be saved.',
          );
        await writeFile(tokenFile, safeStorage.encryptString(token), { mode: 0o600 });
      },
      clearToken: () => rm(tokenFile, { force: true }),
    });
    await service.init();
    library = service;
  } catch (error) {
    libraryError =
      error instanceof Error ? error.message : 'The saved library could not be loaded.';
  }
  const requireLibrary = () => {
    if (!library) throw new Error(libraryError || 'Library unavailable.');
    return library;
  };
  protocol.handle('vault-art', async (request) => {
    const url = new URL(request.url);
    const file =
      url.hostname === 'local' &&
      /^\/cagematch-user-[1-9]\d{0,8}\.(png|jpg|webp)$/.test(url.pathname)
        ? library?.imageFile(url.pathname.slice(1))
        : null;
    if (!file || !['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 404 });
    try {
      const bytes = await readFile(file);
      const type = file.endsWith('.png')
        ? 'image/png'
        : file.endsWith('.jpg')
          ? 'image/jpeg'
          : 'image/webp';
      return new Response(request.method === 'HEAD' ? null : new Uint8Array(bytes), {
        headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
  const noArgs = (args: unknown[]) => {
    if (args.length) throw new Error('This request takes no arguments.');
  };
  ipcMain.handle('vault:library', (event, ...args: unknown[]) => {
    assertSender(event);
    noArgs(args);
    return (
      library?.snapshot() ?? {
        records: [],
        status: {
          connected: false,
          pending: 0,
          syncing: false,
          error: libraryError,
          lastSyncedAt: null,
        },
      }
    );
  });
  const imageFolder = async () => {
    if (!videoRoot)
      throw new Error(
        'Choose your video folder first so artwork can be saved in its images folder.',
      );
    const directory = path.join(videoRoot, 'images');
    await mkdir(directory, { recursive: true });
    if ((await lstat(directory)).isSymbolicLink() || !inside(videoRoot, await realpath(directory)))
      throw new Error('The images folder must be inside your chosen video folder.');
    return directory;
  };
  const findArtwork = async (
    sourceInput: unknown,
    detailsInput: unknown,
  ): Promise<{ bytes: Buffer; artwork: ChosenArtwork } | null> => {
    if (!window || window.isDestroyed())
      throw new Error('Open the application window before searching for artwork.');
    if (!detailsInput || typeof detailsInput !== 'object')
      throw new Error('Expected match details for image search.');
    const source = cagematchURL(sourceInput);
    const details = detailsInput as Record<string, unknown>;
    if (
      !Array.isArray(details.wrestlers) ||
      details.wrestlers.length < 2 ||
      details.wrestlers.length > 8 ||
      details.wrestlers.some((value) => typeof value !== 'string' || value.length > 150) ||
      typeof details.event !== 'string' ||
      !details.event.trim() ||
      details.event.length > 200 ||
      typeof details.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(details.date)
    )
      throw new Error('Enter opponents, event and date before searching for artwork.');
    const directory = await imageFolder();
    for (const kind of ['poster', 'graphic', 'photo'] as const) {
      const searchUrl = googleImageSearch(
        details.wrestlers as string[],
        details.event,
        details.date,
        kind,
      );
      const candidates = await searchGoogleImages(window!, googleSession, searchUrl);
      for (const url of candidates) {
        try {
          const bytes = await downloadImage(imageSession, url);
          const image = inspectArtwork(bytes);
          if (image.width < 300 || image.height < 300) continue;
          const base = `cagematch-user-${new URL(source).searchParams.get('nr')}`;
          let name = `${base}.${image.extension}`;
          let file = path.join(directory, name);
          try {
            await writeFile(file, bytes, { flag: 'wx' });
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            if ((await lstat(file)).isSymbolicLink() || !(await readFile(file)).equals(bytes)) {
              name = `${base}-${randomUUID()}.${image.extension}`;
              file = path.join(directory, name);
              await writeFile(file, bytes, { flag: 'wx' });
            }
          }
          await writeFile(
            `${file}.source.json`,
            JSON.stringify({ matchUrl: source, searchUrl, imageUrl: url, kind }, null, 2),
            { flag: 'wx' },
          ).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'EEXIST') throw error;
          });
          const token = randomUUID();
          return {
            bytes,
            artwork: {
              token,
              name,
              width: image.width,
              height: image.height,
              preview: `data:image/${image.extension === 'jpg' ? 'jpeg' : image.extension};base64,${bytes.toString('base64')}`,
            },
          };
        } catch {
          /* Try another result if the source refuses access or the image is unsuitable. */
        }
      }
    }
    return null;
  };
  ipcMain.handle('vault:find-artwork', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 2) throw new Error('Expected a match link and details.');
    const found = await findArtwork(args[0], args[1]);
    if (!found) return null;
    stagedArtwork = { token: found.artwork.token, bytes: found.bytes };
    return found.artwork;
  });
  const batch = new BatchImporter({
    exists: (url) =>
      requireLibrary()
        .allMatches()
        .some((match) => cagematchURL(match.sourceUrl) === url),
    lookup: (url) => requireLibrary().lookupInBrowser(url),
    artwork: async (draft) => (await findArtwork(draft.sourceUrl, draft))?.bytes ?? null,
    save: (draft, image) => requireLibrary().add(draft, image, false),
    sync: () => {
      void requireLibrary().sync();
    },
  });
  app.on('before-quit', () => batch.stop());
  ipcMain.handle('vault:batch-start', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1) throw new Error('Expected a list of match links.');
    await imageFolder();
    return batch.start(args[0]);
  });
  ipcMain.handle('vault:batch-status', (event, ...args: unknown[]) => {
    assertSender(event);
    noArgs(args);
    return batch.snapshot();
  });
  ipcMain.handle('vault:batch-stop', (event, ...args: unknown[]) => {
    assertSender(event);
    noArgs(args);
    return batch.stop();
  });
  ipcMain.handle('vault:lookup-browser', (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1) throw new Error('Expected one CAGEMATCH link.');
    return requireLibrary().lookupInBrowser(args[0]);
  });
  ipcMain.handle('vault:lookup-match', (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1) throw new Error('Expected one CAGEMATCH link.');
    return requireLibrary().lookup(args[0]);
  });
  ipcMain.handle(
    'vault:choose-artwork',
    async (event, ...args: unknown[]): Promise<ChosenArtwork | null> => {
      assertSender(event);
      noArgs(args);
      const choice = await dialog.showOpenDialog(window!, {
        title: 'Choose match artwork',
        properties: ['openFile'],
        filters: [{ name: 'Artwork', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (choice.canceled) return null;
      const file = choice.filePaths[0];
      const info = await stat(file);
      if (info.size > 8_388_608 || !info.isFile())
        throw new Error('Choose an image smaller than 8 MB.');
      const bytes = await readFile(file);
      const image = inspectArtwork(bytes);
      const token = randomUUID();
      stagedArtwork = { token, bytes };
      return {
        token,
        preview: `data:image/${image.extension === 'jpg' ? 'jpeg' : image.extension};base64,${bytes.toString('base64')}`,
        name: path.basename(file),
        width: image.width,
        height: image.height,
      };
    },
  );
  ipcMain.handle('vault:edit-match', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 3 || !args[2])
      throw new Error('Expected a match ID, edited details and original details.');
    const snapshot = await requireLibrary().edit(args[0], args[1], args[2]);
    void library?.sync();
    return snapshot;
  });
  ipcMain.handle('vault:add-match', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (
      args.length !== 2 ||
      !stagedArtwork ||
      typeof args[1] !== 'string' ||
      args[1] !== stagedArtwork.token
    )
      throw new Error('Choose your artwork again.');
    const snapshot = await requireLibrary().add(args[0], stagedArtwork.bytes);
    stagedArtwork = null;
    void library?.sync();
    return snapshot;
  });
  ipcMain.handle('vault:connect-github', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1) throw new Error('Expected a GitHub credential.');
    const snapshot = await requireLibrary().connect(args[0]);
    void library?.sync();
    return snapshot;
  });
  ipcMain.handle('vault:disconnect-github', (event, ...args: unknown[]) => {
    assertSender(event);
    noArgs(args);
    return requireLibrary().disconnect();
  });
  ipcMain.handle('vault:sync-library', (event, ...args: unknown[]) => {
    assertSender(event);
    noArgs(args);
    return requireLibrary().sync();
  });
  const syncTimer = setInterval(() => void library?.sync(), 5 * 60 * 1000);
  syncTimer.unref();
  void library?.sync();
  // Only our trusted main frame may enter fullscreen; other permissions remain denied.
  const allowsFullscreen = (
    contents: Electron.WebContents | null,
    permission: string,
    details: { isMainFrame: boolean; requestingUrl?: string },
  ) =>
    permission === 'fullscreen' &&
    Boolean(window) &&
    contents === window?.webContents &&
    details.isMainFrame &&
    isTrustedRendererURL(details.requestingUrl ?? '', appURL);
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) =>
    callback(allowsFullscreen(contents, permission, details)),
  );
  session.defaultSession.setPermissionCheckHandler((contents, permission, _origin, details) =>
    allowsFullscreen(contents, permission, details),
  );
  // Production may load only the bundled application; no renderer network access is required.
  if (!developmentURL) {
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, callback) => callback({ cancel: true }),
    );
  }
  protocol.handle('vault-video', async (request) => {
    const url = new URL(request.url);
    const file = url.hostname === 'local' ? videoFiles.get(url.pathname.slice(1)) : undefined;
    if (!file || !videoRoot || !['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 404 });
    try {
      const resolved = await realpath(file);
      if (!inside(videoRoot, resolved)) return new Response(null, { status: 403 });
      return await videoResponse(resolved, request);
    } catch {
      return new Response(null, { status: 404 });
    }
  });
  ipcMain.handle('vault:saved-video-folder', async (event, ...args: unknown[]) => {
    assertSender(event);
    noArgs(args);
    try {
      const saved = JSON.parse(
        await readFile(path.join(app.getPath('userData'), 'media-folder.json'), 'utf8'),
      );
      if (typeof saved.root !== 'string') return null;
      const root = await realpath(saved.root);
      const indexed = await scanVideoFolder(root, allMatches());
      videoRoot = root;
      await imageFolder();
      videoIndex = indexed;
      return { name: path.basename(root) };
    } catch {
      return null;
    }
  });
  ipcMain.handle('vault:choose-video-folder', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length) throw new Error('Folder request takes no arguments.');
    const choice = await dialog.showOpenDialog(window!, {
      title: 'Choose your wrestling video folder',
      properties: ['openDirectory'],
    });
    if (choice.canceled) return videoRoot ? { name: path.basename(videoRoot) } : null;
    const root = await realpath(choice.filePaths[0]);
    const indexed = await scanVideoFolder(root, allMatches());
    videoRoot = root;
    await imageFolder();
    await writeFile(
      path.join(app.getPath('userData'), 'media-folder.json'),
      JSON.stringify({ root }),
      { mode: 0o600 },
    );
    videoIndex = indexed;
    videoFiles.clear();
    return { name: path.basename(videoRoot) };
  });
  ipcMain.handle('vault:match-videos', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1 || typeof args[0] !== 'string') throw new Error('Expected one match ID.');
    if (!allMatches().some((match) => match.id === args[0])) throw new Error('Unknown match.');
    if (!videoRoot) return [];
    const files = videoIndex.get(args[0]) ?? [];
    return files.map((file) => {
      const token = randomUUID();
      videoFiles.set(token, file.path);
      return { name: file.name, url: `vault-video://local/${token}` };
    });
  });
  ipcMain.handle('vault:video-availability', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length) throw new Error('Availability takes no arguments.');
    if (!videoRoot) return [];
    const root = videoRoot;
    const indexed = await scanVideoFolder(root, allMatches());
    if (root === videoRoot) videoIndex = indexed;
    return [...videoIndex].filter(([, files]) => files.length > 0).map(([id]) => id);
  });
  ipcMain.handle('vault:version', (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length) throw new Error('Version request takes no arguments.');
    return app.getVersion();
  });
  ipcMain.handle('vault:open-reference', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1) throw new Error('Expected one reference URL.');
    await shell.openExternal(validateExternalURL(args[0]));
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
