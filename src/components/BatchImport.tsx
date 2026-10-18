import { useEffect, useRef, useState } from 'react';
import type { BatchState } from '../shared/batch-import';
import { userError } from '../shared/errors';

export function BatchImport() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [urls, setUrls] = useState('');
  const [state, setState] = useState<BatchState>({
    running: false,
    stopping: false,
    items: [],
  });
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    let current = true;
    const refresh = async () => {
      if (!window.vault?.getBatchImport) return;
      try {
        const value = await window.vault.getBatchImport();
        if (current) setState(value);
      } catch (error) {
        if (current) setError(userError(error));
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 1000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);
  const begin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStarting(true);
    try {
      if (!window.vault?.startBatchImport)
        throw new Error('Open the desktop app to import a batch.');
      setState(await window.vault.startBatchImport(urls));
    } catch (error) {
      setError(userError(error));
    } finally {
      setStarting(false);
    }
  };
  const stop = async () => {
    try {
      if (window.vault) setState(await window.vault.stopBatchImport());
    } catch (error) {
      setError(userError(error));
    }
  };
  const imported = state.items.filter((item) => item.status === 'imported').length;
  const failed = state.items.filter((item) => item.status === 'failed').length;
  const skipped = state.items.filter((item) => item.status === 'skipped').length;
  const cancelled = state.items.filter((item) => item.status === 'cancelled').length;
  const remaining = state.items.filter(
    (item) => item.status === 'queued' || item.status === 'importing',
  ).length;
  return (
    <>
      <button className="toolbar-button" onClick={() => dialog.current?.showModal()}>
        {state.running
          ? `Batch upload (${state.items.length - remaining}/${state.items.length})`
          : 'Batch upload'}
      </button>
      <dialog className="add-match-dialog" ref={dialog} aria-labelledby="batch-import-title">
        <div className="import-heading">
          <div>
            <h2 id="batch-import-title">Batch upload</h2>
            <p>Paste CAGEMATCH match links. Entries are saved automatically without review.</p>
          </div>
          <button className="button" type="button" onClick={() => dialog.current?.close()}>
            Close batch upload
          </button>
        </div>
        <form onSubmit={(event) => void begin(event)}>
          <label>
            CAGEMATCH match URLs
            <textarea
              rows={7}
              required
              maxLength={25000}
              disabled={state.running || starting}
              value={urls}
              onChange={(event) => setUrls(event.target.value)}
              placeholder={
                'https://www.cagematch.net/?id=111&nr=…\nhttps://www.cagematch.net/?id=111&nr=…'
              }
            />
          </label>
          <p className="import-note">
            Up to 50 URLs, one per line. Uses your video folder’s images directory. Duplicates are
            skipped; incomplete details or unavailable artwork are reported as failures. Keep the
            app open until finished. You can close this dialog and keep browsing.
          </p>
          <div className="import-actions">
            <button className="button" disabled={state.running || starting} type="submit">
              {starting ? 'Starting…' : 'Import all'}
            </button>
            {state.running && (
              <button
                className="button"
                type="button"
                disabled={state.stopping}
                onClick={() => void stop()}
              >
                {state.stopping ? 'Stopping after current match…' : 'Stop after current match'}
              </button>
            )}
          </div>
        </form>
        {error && (
          <p className="import-error" role="alert">
            {error}
          </p>
        )}
        {state.items.length > 0 && (
          <>
            <p className="import-notice" role="status">
              {state.running ? 'Importing batch' : 'Batch finished'}: {imported} imported ·{' '}
              {skipped} skipped · {failed} failed
              {state.running
                ? ` · ${remaining} remaining`
                : cancelled
                  ? ` · ${cancelled} cancelled`
                  : ''}
            </p>
            <ol className="batch-results">
              {state.items.map((item, index) => (
                <li key={index}>
                  <strong>{item.title ?? item.url}</strong>
                  <span>
                    {item.status}
                    {item.message ? ` — ${item.message}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </dialog>
    </>
  );
}
