import { app, BrowserWindow, ipcMain, session, shell, dialog, protocol } from 'electron';
import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { inside } from './videos';
import { videoResponse } from './video-response';
import { scanVideoFolder, type VideoIndex } from './video-index';
import { matches } from '../src/data/catalogue';
import { pathToFileURL } from 'node:url';
import { isTrustedRendererURL, validateExternalURL } from '../src/shared/security';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vault-video',
    privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true },
  },
]);
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

void app.whenReady().then(() => {
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
    const indexed = await scanVideoFolder(root);
    videoRoot = root;
    videoIndex = indexed;
    videoFiles.clear();
    return { name: path.basename(videoRoot) };
  });
  ipcMain.handle('vault:match-videos', async (event, ...args: unknown[]) => {
    assertSender(event);
    if (args.length !== 1 || typeof args[0] !== 'string') throw new Error('Expected one match ID.');
    if (!matches.some((match) => match.id === args[0])) throw new Error('Unknown match.');
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
    const indexed = await scanVideoFolder(root);
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
