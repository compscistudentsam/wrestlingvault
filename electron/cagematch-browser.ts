import { BrowserWindow, Menu, dialog, type Session } from 'electron';
import { cagematchURL, type MatchDraft } from '../src/shared/imports';
import { isCagematchAddress, cagematchConnectionError } from './cagematch-request';
import { readCagematchPage } from './cagematch';

/** Render normally in an isolated background browser; surface only for user interaction. */
export function importFromCagematchBrowser(
  parent: BrowserWindow,
  browsing: Session,
  source: string,
  onPage?: (html: string) => void,
): Promise<Partial<MatchDraft>> {
  const sourceUrl = cagematchURL(source);
  return new Promise((resolve, reject) => {
    const browser = new BrowserWindow({
      parent,
      show: false,
      width: 1100,
      height: 850,
      title: 'CAGEMATCH — complete any access check; match details import automatically',
      autoHideMenuBar: false,
      webPreferences: {
        session: browsing,
        backgroundThrottling: false,
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
    let visible = false;
    let partial: Partial<MatchDraft> | null = null;
    let polling: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      clearInterval(polling);
      clearTimeout(deadline);
    };
    const complete = (result: Partial<MatchDraft>) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
      browser.close();
    };
    const expose = () => {
      if (finished || browser.isDestroyed() || visible) return;
      visible = true;
      clearTimeout(deadline);
      browser.show();
      browser.focus();
    };
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
    const read = async (manual = false) => {
      if (reading || finished || browser.isDestroyed() || browser.webContents.isLoadingMainFrame())
        return;
      reading = true;
      let needsInteraction = false;
      try {
        if (cagematchURL(browser.webContents.getURL()) !== sourceUrl)
          throw new Error('Return to the requested match page before importing its details.');
        // Fixed read-only extraction; remote content never receives app APIs or credentials.
        const page = (await browser.webContents.executeJavaScript(
          `(() => ({
          html: document.documentElement.outerHTML,
          needsInteraction: [...document.querySelectorAll('iframe[src*="captcha"], iframe[src*="challenges.cloudflare.com"], .g-recaptcha, .h-captcha')]
            .some(element => element.getClientRects().length > 0)
        }))()`,
          false,
        )) as { html: unknown; needsInteraction: boolean };
        needsInteraction = page.needsInteraction;
        if (typeof page.html !== 'string' || Buffer.byteLength(page.html) > 2_000_000)
          throw new Error('This page is too large to import.');
        const result = readCagematchPage(page.html, sourceUrl);
        onPage?.(page.html);
        partial = result;
        if (manual || (result.wrestlers && result.event && result.date)) complete(result);
      } catch (error) {
        if (manual && !browser.isDestroyed())
          await dialog.showMessageBox(browser, {
            type: 'info',
            title: 'Match details not ready',
            message: error instanceof Error ? error.message : 'Could not read the match.',
            detail:
              'Wait until the match details appear. They will be imported automatically. You can also cancel and enter them manually.',
          });
      } finally {
        reading = false;
        if (needsInteraction && !finished) expose();
      }
    };
    browser.setMenu(
      Menu.buildFromTemplate([
        {
          label: 'Import match details',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => void read(true),
        },
        { label: 'Reload page', role: 'reload' },
        { label: 'Cancel import', click: () => browser.close() },
      ]),
    );
    browser.once('closed', () => {
      cleanup();
      if (!finished) {
        finished = true;
        reject(new Error('Browser lookup cancelled. You can retry or enter the details manually.'));
      }
    });
    browser.webContents.on('did-finish-load', () => void read());
    polling = setInterval(() => void read(), 400);
    deadline = setTimeout(() => {
      // Missing optional fields should not force the user to operate a browser.
      if (partial) complete(partial);
      else expose();
    }, 12000);
    void browser.loadURL(sourceUrl).catch((error) => {
      if (finished || browser.isDestroyed() || /ERR_ABORTED/.test(String(error))) return;
      finished = true;
      cleanup();
      reject(new Error(cagematchConnectionError(error)));
      browser.close();
    });
  });
}
