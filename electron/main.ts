import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isTrustedRendererURL, validateExternalURL } from '../src/shared/security';

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
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  // Production may load only the bundled application; no renderer network access is required.
  if (!developmentURL) {
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, callback) => callback({ cancel: true }),
    );
  }
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
