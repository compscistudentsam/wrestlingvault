import { BrowserWindow, Menu, dialog, type Session } from 'electron';
import { cagematchURL, type MatchDraft } from '../src/shared/imports';
import { isCagematchAddress } from './cagematch-request';
import { readCagematchPage } from './cagematch';

/** A visible remote browser with no preload, app IPC or GitHub credentials. */
export function importFromCagematchBrowser(
  parent: BrowserWindow,
  browsing: Session,
  source: string,
): Promise<Partial<MatchDraft>> {
  const sourceUrl = cagematchURL(source);
  return new Promise((resolve, reject) => {
    const browser = new BrowserWindow({
      parent,
      modal: true,
      width: 1100,
      height: 850,
      title: 'CAGEMATCH — wait for the match, then choose Import match details',
      autoHideMenuBar: false,
      webPreferences: {
        session: browsing,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        webviewTag: false,
        allowRunningInsecureContent: false,
      },
    });
    let finished = false;
    let reading = false;
    browser.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    const guard = (event: Electron.Event, url: string) => {
      if (!isCagematchAddress(url)) event.preventDefault();
    };
    browser.webContents.on('will-navigate', guard);
    browser.webContents.on('will-redirect', guard);
    browser.webContents.on('will-frame-navigate', (event) => {
      if (!isCagematchAddress(event.url)) event.preventDefault();
    });
    browser.webContents.on('will-attach-webview', (event) => event.preventDefault());
    const read = async () => {
      if (reading || finished) return;
      reading = true;
      try {
        if (cagematchURL(browser.webContents.getURL()) !== sourceUrl)
          throw new Error('Return to the requested match page before importing its details.');
        const html = (await browser.webContents.executeJavaScript(
          'document.documentElement.outerHTML',
          false,
        )) as unknown;
        if (typeof html !== 'string' || Buffer.byteLength(html) > 2_000_000)
          throw new Error('This page is too large to import.');
        const result = readCagematchPage(html, sourceUrl);
        finished = true;
        resolve(result);
        browser.close();
      } catch (error) {
        if (!browser.isDestroyed())
          await dialog.showMessageBox(browser, {
            type: 'info',
            title: 'Match details not ready',
            message: error instanceof Error ? error.message : 'Could not read the match.',
            detail:
              'Wait until the requested match details are visible, then choose Import match details from the menu again. You can also cancel and enter them manually.',
          });
      } finally {
        reading = false;
      }
    };
    browser.setMenu(
      Menu.buildFromTemplate([
        { label: 'Import match details', accelerator: 'CmdOrCtrl+Enter', click: () => void read() },
        { label: 'Reload page', role: 'reload' },
        { label: 'Cancel import', click: () => browser.close() },
      ]),
    );
    browser.once('closed', () => {
      if (!finished) {
        finished = true;
        reject(new Error('Browser lookup cancelled. You can retry or enter the details manually.'));
      }
    });
    void browser.loadURL(sourceUrl).catch(() => {
      if (!finished && !browser.isDestroyed())
        void dialog.showMessageBox(browser, {
          type: 'error',
          message:
            'The CAGEMATCH page could not load. Check your connection or cancel to enter details manually.',
        });
    });
  });
}
