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
import { realpath, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { cagematchNetwork } from './cagematch-network';
import { importFromCagematchBrowser } from './cagematch-browser';
import { isCagematchAddress } from './cagematch-request';
import { PersonalLibrary } from './personal-library';
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
  const libraryRoot = path.join(app.getPath('userData'), 'personal-library');
  const tokenFile = path.join(libraryRoot, 'github-credential');
  try {
    const service = new PersonalLibrary({
      root: libraryRoot,
      inspectImage: inspectArtwork,
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
