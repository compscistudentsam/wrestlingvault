import { BrowserWindow, type Session } from 'electron';
import { googleImageCandidates } from './google-images';

export function googleBrowserURL(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      ['www.google.com', 'consent.google.com', 'accounts.google.com'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
/** Read rendered Google results without giving the page access to application APIs. */
export function searchGoogleImages(
  parent: BrowserWindow,
  session: Session,
  searchUrl: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const browser = new BrowserWindow({
      parent,
      show: false,
      width: 1100,
      height: 800,
      title: 'Google Images — complete any consent or verification to find artwork',
      webPreferences: {
        session,
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        webviewTag: false,
      },
    });
    browser.setMenu(null);
    browser.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    browser.webContents.on('will-navigate', (event, url) => {
      if (!googleBrowserURL(url)) event.preventDefault();
    });
    browser.webContents.on('will-redirect', (event, url) => {
      if (!googleBrowserURL(url)) event.preventDefault();
    });
    browser.webContents.on('will-attach-webview', (event) => event.preventDefault());
    let done = false;
    let reading = false;
    let needsInteraction = false;
    const finish = (images: string[], error?: Error) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(deadline);
      clearTimeout(expiry);
      if (error) reject(error);
      else resolve(images);
      if (!browser.isDestroyed()) browser.close();
    };
    const read = async () => {
      if (done || reading || browser.isDestroyed() || browser.webContents.isLoadingMainFrame())
        return;
      reading = true;
      try {
        if (!googleBrowserURL(browser.webContents.getURL())) return;
        const html: unknown = await browser.webContents.executeJavaScript(
          'document.documentElement.outerHTML',
          false,
        );
        if (typeof html !== 'string' || Buffer.byteLength(html) > 8_000_000) return;
        const images = googleImageCandidates(html);
        if (images.length) finish(images);
        else if (
          /consent\.google\.com|\/sorry\//.test(browser.webContents.getURL()) ||
          /class=["'][^"']*(?:g-recaptcha|h-captcha)/.test(html)
        ) {
          needsInteraction = true;
          browser.show();
        }
      } catch {
        /* A navigation may destroy the previous document. */
      } finally {
        reading = false;
      }
    };
    const poll = setInterval(() => void read(), 700);
    const deadline = setTimeout(() => {
      if (!done && !browser.isDestroyed()) {
        if (needsInteraction) browser.show();
        else finish([]);
      }
    }, 12000);
    const expiry = setTimeout(
      () =>
        finish(
          [],
          new Error('Google Images did not provide readable results. Choose artwork manually.'),
        ),
      120000,
    );
    browser.on('closed', () =>
      finish([], new Error('Google image search cancelled. Choose artwork manually or retry.')),
    );
    browser.webContents.on('did-finish-load', () => void read());
    void browser.loadURL(searchUrl).catch((error) => {
      if (!/ERR_ABORTED/.test(String(error)))
        finish([], new Error('Could not reach Google Images. Choose artwork manually.'));
    });
  });
}
