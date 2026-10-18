import { useEffect, useRef, useState } from 'react';
import type { LibrarySnapshot, LibraryStatus, ChosenArtwork, MatchDraft } from '../shared/imports';
import { userError } from '../shared/errors';
import { parseMatchPageText } from '../shared/cagematch-text';
import { cagematchURL, repository } from '../shared/imports';

const empty = {
  wrestlers: '',
  event: '',
  promotion: '',
  date: '',
  rating: '',
  cagematchScore: '',
  matchDuration: '',
};
export function AddMatch({
  status,
  onSnapshot,
  onAdded,
}: {
  status: LibraryStatus;
  onSnapshot: (snapshot: LibrarySnapshot) => void;
  onAdded: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState(empty);
  const [image, setImage] = useState<ChosenArtwork | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [token, setToken] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pageText, setPageText] = useState('');
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const close = () => {
    if (busy) return;
    setOpen(false);
    setToken('');
  };
  const desktop = () => {
    if (!window.vault?.addMatch)
      throw new Error('Open the desktop app to add matches and connect GitHub.');
    return window.vault;
  };
  const message = userError;
  const applyDetails = (found: Partial<MatchDraft>) => {
    setFields((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(found)
          .filter(([key]) => key !== 'sourceUrl')
          .map(([key, value]) => [
            key,
            key === 'wrestlers'
              ? (value as string[]).join('\n')
              : value === null
                ? ''
                : String(value),
          ]),
      ),
    }));
  };
  const readPastedText = () => {
    setError('');
    try {
      applyDetails(parseMatchPageText(pageText, url));
      setReview(true);
      setPasteOpen(false);
      setPageText('');
      setNotice(
        'Details read from your pasted text. Review them and fill in anything missing before adding the match.',
      );
    } catch (error) {
      setError(message(error));
    }
  };
  const openMatchPage = async () => {
    setError('');
    try {
      await desktop().openExternal(cagematchURL(url));
    } catch (error) {
      setError(message(error));
    }
  };
  const beginReview = async (manual = false) => {
    setError('');
    setNotice('');
    let source: string;
    try {
      source = cagematchURL(url);
      setUrl(source);
    } catch (e) {
      setError(message(e));
      return;
    }
    if (manual) {
      setReview(true);
      return;
    }
    setBusy('lookup');
    try {
      const found = await desktop().lookupMatch(source);
      applyDetails(found);
      setNotice(
        'Review the retrieved details and fill in anything missing. Ratings are separate; leave unknown values blank.',
      );
    } catch (e) {
      setNotice(message(e));
    } finally {
      setReview(true);
      setBusy('');
    }
  };
  const chooseImage = async () => {
    setBusy('image');
    setError('');
    try {
      const chosen = await desktop().chooseMatchArtwork();
      if (chosen) setImage(chosen);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!image) {
      setError('Choose an image for this match.');
      return;
    }
    setBusy('save');
    try {
      const draft: MatchDraft = {
        sourceUrl: cagematchURL(url),
        wrestlers: fields.wrestlers
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        event: fields.event,
        promotion: fields.promotion,
        date: fields.date,
        rating: fields.rating === '' ? null : Number(fields.rating),
        cagematchScore: fields.cagematchScore === '' ? null : Number(fields.cagematchScore),
        matchDuration: fields.matchDuration || null,
      };
      const snapshot = await desktop().addMatch(draft, image.token);
      onSnapshot(snapshot);
      const added = snapshot.records.find((m) => m.sourceUrl === draft.sourceUrl);
      if (added) onAdded(added.id);
      setOpen(false);
      setToken('');
      setReview(false);
      setFields(empty);
      setUrl('');
      setImage(null);
      setPageText('');
      setPasteOpen(false);
      setNotice('');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  };
  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('github');
    setError('');
    try {
      onSnapshot(await desktop().connectGitHub(token));
      setToken('');
      setNotice('GitHub connected. Pending matches will upload in the background.');
    } catch (e) {
      setError(message(e));
    } finally {
      setToken('');
      setBusy('');
    }
  };
  const sync = async () => {
    setBusy('sync');
    setError('');
    try {
      onSnapshot(await desktop().syncLibrary());
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  };
  const disconnect = async () => {
    setBusy('github');
    setError('');
    try {
      onSnapshot(await desktop().disconnectGitHub());
      setToken('');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy('');
    }
  };
  const state = status.syncing
    ? 'Syncing…'
    : status.error
      ? 'Sync needs attention'
      : status.pending
        ? `${status.pending} queued`
        : status.connected
          ? 'Synced'
          : 'Connect GitHub';
  return (
    <>
      <button className="toolbar-button" onClick={() => setOpen(true)}>
        Add match
      </button>
      <button
        className="toolbar-button library-sync-status"
        onClick={() => setOpen(true)}
        title={status.error || 'Library sync and GitHub connection'}
      >
        {state}
      </button>
      <dialog
        className="add-match-dialog"
        ref={dialog}
        aria-labelledby="add-match-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          setOpen(false);
          setToken('');
        }}
      >
        <div className="import-heading">
          <div>
            <h2 id="add-match-title">Add your own match</h2>
            <p>CAGEMATCH details, your artwork, your vault.</p>
          </div>
          <button
            type="button"
            className="button"
            aria-label="Close add match"
            disabled={Boolean(busy)}
            onClick={close}
          >
            Close
          </button>
        </div>
        <form onSubmit={submit}>
          <fieldset disabled={Boolean(busy)}>
            <label>
              CAGEMATCH match link
              <input
                type="url"
                required
                value={url}
                placeholder="https://www.cagematch.net/?id=111&nr=…"
                onChange={(event) => {
                  setUrl(event.target.value);
                  setReview(false);
                  setNotice('');
                }}
              />
            </label>
            <div className="import-actions">
              <button type="button" className="button" onClick={() => void beginReview()}>
                {busy === 'lookup' ? 'Looking up…' : 'Look up match'}
              </button>
              <button type="button" className="button" onClick={() => void beginReview(true)}>
                Enter details manually
              </button>
            </div>
            <div className="import-actions">
              <button type="button" className="button" onClick={() => void openMatchPage()}>
                Open CAGEMATCH in browser
              </button>
              <button
                type="button"
                className="button"
                aria-expanded={pasteOpen}
                onClick={() => setPasteOpen((value) => !value)}
              >
                Paste page text
              </button>
            </div>
            {pasteOpen && (
              <div className="import-paste">
                <p>
                  Once the match details are visible in your browser, press Ctrl+A, then Ctrl+C.
                  Paste the copied text below.
                </p>
                <label>
                  Copied CAGEMATCH page text
                  <textarea
                    rows={6}
                    maxLength={200000}
                    value={pageText}
                    onChange={(event) => setPageText(event.target.value)}
                  />
                </label>
                <button type="button" className="button" onClick={readPastedText}>
                  Fill details from text
                </button>
              </div>
            )}
            {notice && (
              <p className="import-notice" role="status">
                {notice}
              </p>
            )}
            {review && (
              <>
                <label>
                  Opponents or teams{' '}
                  <small>One opponent or team per line; use &amp; within a team.</small>
                  <textarea
                    required
                    rows={3}
                    value={fields.wrestlers}
                    onChange={(event) => setFields({ ...fields, wrestlers: event.target.value })}
                  />
                </label>
                <div className="import-fields">
                  <label>
                    Event
                    <input
                      required
                      maxLength={200}
                      value={fields.event}
                      onChange={(event) => setFields({ ...fields, event: event.target.value })}
                    />
                  </label>
                  <label>
                    Company
                    <input
                      required
                      maxLength={100}
                      value={fields.promotion}
                      onChange={(event) => setFields({ ...fields, promotion: event.target.value })}
                    />
                  </label>
                  <label>
                    Date
                    <input
                      required
                      type="date"
                      value={fields.date}
                      onChange={(event) => setFields({ ...fields, date: event.target.value })}
                    />
                  </label>
                  <label>
                    Match length <small>Minutes:seconds; optional</small>
                    <input
                      placeholder="46:45"
                      pattern="[0-9]{1,3}:[0-5][0-9]"
                      value={fields.matchDuration}
                      onChange={(event) =>
                        setFields({ ...fields, matchDuration: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    WON stars <small>Optional; leave unrated if unknown</small>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.25}
                      value={fields.rating}
                      onChange={(event) => setFields({ ...fields, rating: event.target.value })}
                    />
                  </label>
                  <label>
                    CAGEMATCH score <small>Out of 10; optional</small>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.01}
                      value={fields.cagematchScore}
                      onChange={(event) =>
                        setFields({ ...fields, cagematchScore: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="import-artwork">
                  {image && <img src={image.preview} alt="Chosen match artwork" />}
                  <div>
                    <button type="button" className="button" onClick={() => void chooseImage()}>
                      {image ? 'Change artwork' : 'Choose artwork'}
                    </button>
                    <p>
                      {image
                        ? `${image.name} · ${image.width} × ${image.height}`
                        : 'PNG, JPEG or WebP, up to 8 MB. The full image is preserved.'}
                    </p>
                  </div>
                </div>
                <p className="import-note">
                  Add match saves a local copy and queues the details and image for upload to your
                  GitHub library. New matches appear after the existing ranked collection.
                </p>
                <button className="import-save" type="submit">
                  {busy === 'save' ? 'Saving…' : 'Add match'}
                </button>
              </>
            )}
          </fieldset>
        </form>
        {error && (
          <p role="alert" className="import-error">
            {error}
          </p>
        )}
        <section className="import-sync" aria-label="Library sync">
          <p role="status">
            {status.syncing
              ? 'Syncing library…'
              : status.pending
                ? `${status.pending} match${status.pending === 1 ? '' : 'es'} waiting to upload.`
                : status.lastSyncedAt
                  ? 'Library is up to date.'
                  : 'Your library is saved on this computer.'}
          </p>
          {status.error && <p className="import-error">{status.error}</p>}
          {!status.connected && status.pending > 0 && (
            <p>Connect GitHub to upload queued matches. You can keep browsing them offline.</p>
          )}
          <button
            type="button"
            className="button"
            disabled={Boolean(busy) || status.syncing}
            onClick={() => void sync()}
          >
            Sync now / retry
          </button>
          <details>
            <summary>
              GitHub connection · {status.connected ? 'Connected' : 'Not connected'}
            </summary>
            <p>
              Repository: {repository.owner}/{repository.name}
              <br />
              Branch: {repository.branch}
            </p>
            {status.connected ? (
              <button
                className="button"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void disconnect()}
              >
                Disconnect GitHub
              </button>
            ) : (
              <>
                <p>
                  Create a fine-grained token for this repository with{' '}
                  <strong>Contents: Read and write</strong>. It is encrypted using your computer’s
                  secure storage.
                </p>
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (window.vault) {
                      event.preventDefault();
                      void window.vault
                        .openExternal(event.currentTarget.href)
                        .catch(() => setError('Could not open GitHub in your browser.'));
                    }
                  }}
                >
                  Create token on GitHub ↗
                </a>
                <form onSubmit={connect}>
                  <label>
                    GitHub token
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      spellCheck={false}
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      disabled={Boolean(busy)}
                    />
                  </label>
                  <button className="button" type="submit" disabled={Boolean(busy)}>
                    Connect GitHub
                  </button>
                </form>
              </>
            )}
          </details>
        </section>
      </dialog>
    </>
  );
}
