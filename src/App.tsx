import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ExternalLink,
  Shuffle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  GalleryHorizontal,
  LayoutGrid,
} from 'lucide-react';
import { Artwork } from './components/Artwork';
import { libraryMatches } from './shared/library-matches';
import { BatchImport } from './components/BatchImport';
import { AddMatch } from './components/AddMatch';
import type { LibrarySnapshot, LibraryStatus } from './shared/imports';
import { CoverFlow } from './components/CoverFlow';
import { formatDate, formatRating, getSource, type Match } from './data/catalogue';
import { validateExternalURL } from './shared/security';
import { playTick } from './lib/sounds';
import './shared/api';

export function App() {
  const [customMatches, setCustomMatches] = useState<Match[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>({
    connected: false,
    pending: 0,
    syncing: false,
    error: '',
    lastSyncedAt: null,
  });
  const applyLibrary = useCallback((snapshot: LibrarySnapshot) => {
    setCustomMatches((previous) =>
      JSON.stringify(previous) === JSON.stringify(snapshot.records) ? previous : snapshot.records,
    );
    setLibraryStatus(snapshot.status);
  }, []);
  const matches = useMemo(() => libraryMatches(customMatches), [customMatches]);
  const companies = useMemo(
    () =>
      [
        ...new Set(
          matches.flatMap((match) => match.promotion.split('/').map((company) => company.trim())),
        ),
      ].sort(),
    [matches],
  );
  useEffect(() => {
    if (!window.vault?.getLibrary) return;
    let current = true;
    const refresh = async () => {
      try {
        const snapshot = await window.vault!.getLibrary();
        if (current) applyLibrary(snapshot);
      } catch {
        if (current)
          setLibraryStatus((previous) => ({
            ...previous,
            error: 'Could not read the saved library. Retry from Add match.',
          }));
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 2000);
    return () => {
      current = false;
      clearInterval(interval);
    };
  }, [applyLibrary]);
  const [folder, setFolder] = useState<string | null>(null);
  const [folderError, setFolderError] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [folderRevision, setFolderRevision] = useState(0);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [downloadMode, setDownloadMode] = useState(false);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const [layout, setLayout] = useState<'covers' | 'grid'>('covers');
  const [rating, setRating] = useState('all');
  const [company, setCompany] = useState('All companies');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestion, setSuggestion] = useState(0);
  const [route, setRoute] = useState(() => window.location.hash.slice(2) || 'library');
  const [selectedId, setSelectedId] = useState(
    () => matches.find((match) => route === `match/${match.id}`)?.id ?? matches[0].id,
  );
  const visible = useMemo(
    () =>
      matches.filter(
        (match) =>
          (company === 'All companies' ||
            match.promotion.split('/').some((item) => item.trim() === company)) &&
          (rating === 'all' ||
            (rating === 'unrated' ? match.rating === null : match.rating === Number(rating))),
      ),
    [company, rating, matches],
  );
  const selected = visible.find((match) => match.id === selectedId) ?? visible[0] ?? matches[0];
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const suggestions = words.length
    ? visible
        .filter((match) =>
          words.every((word) =>
            `${match.title} ${match.event} ${match.date} ${match.promotion}`
              .toLowerCase()
              .includes(word),
          ),
        )
        .slice(0, 8)
    : [];
  const main = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const running = useRef(false);
  const sequence = useRef(0);
  const [shuffling, setShuffling] = useState(false);
  const [flip, setFlip] = useState<{ match: Match; sequence: number; duration: number } | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState('');
  const reducedMotion = useReducedMotion();
  const detail = route.startsWith('match/')
    ? matches.find((match) => match.id === route.slice(6))
    : undefined;
  const isLibrary = ['library', 'discover', 'matches'].includes(route);
  const navigate = (next: string) => {
    window.location.hash = `/${next}`;
  };
  const stopRandom = useCallback(() => {
    clearTimeout(timer.current);
    running.current = false;
    setShuffling(false);
    setFlip(null);
  }, []);
  const refreshAvailability = async () => {
    if (!window.vault?.getVideoAvailability) return;
    setScanning(true);
    try {
      setDownloaded(new Set(await window.vault.getVideoAvailability()));
      setFolderRevision((value) => value + 1);
    } catch {
      setFolderError('Could not scan the video folder. Choose it again to retry.');
    } finally {
      setScanning(false);
    }
  };
  const chooseFolder = async (restore = false) => {
    if (!window.vault?.chooseVideoFolder) {
      setFolderError('Open the desktop app to choose a local video folder.');
      return;
    }
    setChoosing(true);
    setFolderError('');
    try {
      const choice = restore
        ? await (window.vault.getSavedVideoFolder?.() ?? Promise.resolve(null))
        : null;
      const selected = choice ?? (await window.vault.chooseVideoFolder());
      if (selected) {
        setFolder(selected.name);
        setFolderRevision((value) => value + 1);
        await refreshAvailability();
      }
    } catch {
      setFolderError('Could not read that folder. Please choose it again.');
    } finally {
      setChoosing(false);
    }
  };
  useEffect(() => {
    if (!folder || !customMatches.length || !window.vault?.getVideoAvailability) return;
    let current = true;
    void window.vault
      .getVideoAvailability()
      .then((ids) => {
        if (current) setDownloaded(new Set(ids));
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [customMatches, folder]);
  const startupPrompted = useRef(false);
  useEffect(() => {
    if (!startupPrompted.current) {
      startupPrompted.current = true;
      if (window.vault?.chooseVideoFolder) void chooseFolder(true);
    }
  }, []);
  const selectCover = (id: string) => {
    playTick(soundRef.current);
    setSelectedId(id);
  };
  const browseTo = (target: Match, random = false) => {
    if (running.current) return;
    setSearchOpen(false);
    if (reducedMotion || (target.id === selected.id && !random)) {
      selectCover(target.id);
      setAnnouncement(`Selected ${target.title}, ${target.event}`);
      return;
    }
    let cursor = visible.findIndex((match) => match.id === selected.id);
    const end = visible.findIndex((match) => match.id === target.id);
    const forward = (end - cursor + visible.length) % visible.length;
    const direction = random || forward <= visible.length / 2 ? 1 : -1;
    const steps = random
      ? visible.length + forward
      : direction === 1
        ? forward
        : visible.length - forward;
    const total = random ? 4500 : Math.min(1800, 400 + steps * 65);
    let step = 0;
    const startedAt = performance.now();
    running.current = true;
    setShuffling(true);
    const finish = () => {
      setSelectedId(target.id);
      stopRandom();
      playTick(soundRef.current);
      setAnnouncement(`Selected ${target.title}, ${target.event}`);
    };
    const advance = () => {
      if (performance.now() - startedAt >= total) {
        finish();
        return;
      }
      const previous = visible[cursor];
      cursor = (cursor + direction + visible.length) % visible.length;
      const duration = Math.round(
        (total / Math.max(steps, 1)) * (0.6 + 1.6 * (step / Math.max(steps - 1, 1)) ** 3),
      );
      setSelectedId(visible[cursor].id);
      setFlip({ match: previous, sequence: ++sequence.current, duration });
      playTick(soundRef.current, true);
      step++;
      timer.current = setTimeout(() => (step < steps ? advance() : finish()), duration);
    };
    advance();
  };
  const randomMatch = () => {
    const choices = visible.filter((match) => !downloadMode || downloaded.has(match.id));
    if (choices.length) browseTo(choices[Math.floor(Math.random() * choices.length)], true);
  };
  useEffect(() => {
    stopRandom();
    return () => clearTimeout(timer.current);
  }, [route, company, rating, stopRandom]);
  useEffect(() => {
    if (reducedMotion && running.current) stopRandom();
  }, [reducedMotion, stopRandom]);
  useEffect(() => {
    const update = () => setRoute(window.location.hash.slice(2) || 'library');
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target instanceof HTMLInputElement)) {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
          return;
        }
        window.location.hash = '/library';
      }
    };
    window.addEventListener('hashchange', update);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => {
    document.title = `${detail?.title ?? 'Library'} · Wrestling Vault`;
    if (detail) setSelectedId(detail.id);
    main.current?.focus({ preventScroll: true });
    if (!isLibrary || layout === 'covers') main.current?.scrollTo({ top: 0 });
  }, [route, detail?.title]);
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="./vault.svg" alt="" />
          <span className="brand-name">
            WRESTLING <strong>VAULT</strong>
            <span className="gold">.</span>
          </span>
          <button
            className="sound-button"
            aria-label={sound ? 'Mute sounds' : 'Enable sounds'}
            title={sound ? 'Mute browsing sounds' : 'Enable browsing sounds'}
            aria-pressed={!sound}
            onClick={() => setSound((value) => !value)}
          >
            {sound ? (
              <Volume2 size={18} aria-hidden="true" />
            ) : (
              <VolumeX size={18} aria-hidden="true" />
            )}
          </button>
        </div>
        {isLibrary && (
          <button
            className="random-button"
            disabled={
              shuffling ||
              !visible.length ||
              (downloadMode && !visible.some((match) => downloaded.has(match.id)))
            }
            aria-busy={shuffling}
            onClick={randomMatch}
          >
            <Shuffle size={15} /> Random
          </button>
        )}
        {isLibrary && (
          <div className="library-tools">
            <div className="view-switch" role="group" aria-label="Library layout">
              <button
                aria-label="Cover view"
                title="Cover view"
                aria-pressed={layout === 'covers'}
                disabled={shuffling}
                onClick={() => setLayout('covers')}
              >
                <GalleryHorizontal size={18} aria-hidden="true" />
              </button>
              <button
                aria-label="Grid view"
                title="Grid view"
                aria-pressed={layout === 'grid'}
                disabled={shuffling}
                onClick={() => setLayout('grid')}
              >
                <LayoutGrid size={18} aria-hidden="true" />
              </button>
            </div>
            <form
              className="match-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                if (suggestions[suggestion]) browseTo(suggestions[suggestion]);
              }}
            >
              <input
                aria-label="Search matches"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen && Boolean(query.trim())}
                aria-controls="match-suggestions"
                aria-activedescendant={
                  searchOpen && suggestions[suggestion]
                    ? `suggestion-${suggestions[suggestion].id}`
                    : undefined
                }
                placeholder="Search matches…"
                value={query}
                disabled={shuffling}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSuggestion(0);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setSearchOpen(false);
                  }
                  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                    event.preventDefault();
                    setSearchOpen(true);
                    setSuggestion((value) =>
                      suggestions.length
                        ? (value + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
                          suggestions.length
                        : 0,
                    );
                  }
                }}
              />
              {searchOpen && query.trim() && (
                <ul id="match-suggestions" role="listbox" aria-label="Match suggestions">
                  {suggestions.length ? (
                    suggestions.map((match, index) => (
                      <li
                        id={`suggestion-${match.id}`}
                        key={match.id}
                        role="option"
                        aria-selected={index === suggestion}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setSuggestion(index)}
                        onClick={() => browseTo(match)}
                      >
                        <strong>{match.title}</strong>
                        <span>
                          {match.event} · {match.date.slice(0, 4)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="no-results">No matches found in {company.toLowerCase()}.</li>
                  )}
                </ul>
              )}
            </form>
          </div>
        )}
        <span className="sr-only" role="status">
          {announcement}
        </span>
      </header>
      <div className="library-toolbar">
        {isLibrary && (
          <>
            <label className="company-filter">
              <span className="sr-only">Company</span>
              <select
                aria-label="Company"
                value={company}
                disabled={shuffling}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setQuery('');
                  setSearchOpen(false);
                }}
              >
                <option>All companies</option>
                {companies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="company-filter">
              <span className="sr-only">Star rating</span>
              <select
                aria-label="Star rating"
                value={rating}
                disabled={shuffling}
                onChange={(event) => {
                  setRating(event.target.value);
                  setQuery('');
                  setSearchOpen(false);
                }}
              >
                <option value="all">All star ratings</option>
                {[
                  ...new Set(
                    matches.flatMap((match) => (match.rating === null ? [] : [match.rating])),
                  ),
                ]
                  .sort((a, b) => b - a)
                  .map((value) => (
                    <option key={value} value={value}>
                      {formatRating(value)} stars
                    </option>
                  ))}
                <option value="unrated">Unrated</option>
              </select>
            </label>
            <button
              className="toolbar-button"
              aria-pressed={downloadMode}
              disabled={!folder || scanning || choosing || shuffling}
              onClick={() => setDownloadMode((value) => !value)}
            >
              Downloaded only
            </button>
          </>
        )}
        {isLibrary && (
          <AddMatch
            status={libraryStatus}
            onSnapshot={applyLibrary}
            onAdded={(id) => {
              stopRandom();
              setSelectedId(id);
              setCompany('All companies');
              setRating('all');
              setQuery('');
              setSearchOpen(false);
              setAnnouncement('Match added locally and queued for GitHub sync.');
              if (folder) void refreshAvailability();
            }}
          />
        )}
        {isLibrary && <BatchImport />}
        <button
          className="folder-button"
          disabled={choosing || scanning}
          onClick={() => void chooseFolder()}
        >
          {choosing || scanning
            ? 'Scanning videos…'
            : folder
              ? `Video folder: ${folder}`
              : 'Choose video folder'}
        </button>
        {folder && (
          <button
            className="toolbar-button"
            disabled={scanning || choosing}
            onClick={() => void refreshAvailability()}
          >
            Rescan videos
          </button>
        )}
      </div>
      {folderError && (
        <p className="folder-error" role="alert">
          {folderError}
        </p>
      )}
      <main ref={main} tabIndex={-1} aria-label={isLibrary ? 'Match library' : 'Match details'}>
        {isLibrary ? (
          visible.length ? (
            <CoverFlow
              layout={layout}
              records={visible}
              selected={selected}
              downloaded={downloaded}
              highlightDownloads={downloadMode}
              shuffling={shuffling}
              flip={flip}
              onSelect={selectCover}
              onOpen={(id) => {
                playTick(soundRef.current);
                setSelectedId(id);
                navigate(`match/${id}`);
              }}
            />
          ) : (
            <div className="empty-state">
              <h1>No matches match these filters</h1>
              <button
                className="button"
                onClick={() => {
                  setCompany('All companies');
                  setRating('all');
                  setQuery('');
                }}
              >
                Reset filters
              </button>
            </div>
          )
        ) : detail ? (
          <MatchDetails
            key={`${detail.id}-${folderRevision}`}
            match={detail}
            folder={folder}
            onChooseFolder={() => void chooseFolder()}
            onBack={() => navigate('library')}
            editor={
              <AddMatch
                entry={detail}
                status={libraryStatus}
                onSnapshot={applyLibrary}
                onAdded={() => {
                  setSelectedId(detail.id);
                  setCompany('All companies');
                  setRating('all');
                }}
              />
            }
          />
        ) : (
          <div className="empty-state">
            <h1>Match not found</h1>
            <button className="button" onClick={() => navigate('library')}>
              Back to covers
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function MatchDetails({
  match,
  folder,
  onChooseFolder,
  onBack,
  editor,
}: {
  match: Match;
  folder: string | null;
  onChooseFolder: () => void;
  onBack: () => void;
  editor: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      clearTimeout(tapTimer.current);
    };
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await playerRef.current?.requestFullscreen();
    } catch {
      setSeekNotice('Could not enter fullscreen. Please try again.');
    }
  };
  const tapVideo = (event: React.MouseEvent) => {
    if (event.detail > 1) return;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => void togglePlayback(), 250);
  };
  const doubleTapVideo = (seconds: number) => {
    clearTimeout(tapTimer.current);
    seek(seconds);
  };
  const [seekNotice, setSeekNotice] = useState('');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const updateMedia = () => {
    const video = videoRef.current;
    if (!video) return;
    const end = Number.isFinite(video.duration)
      ? video.duration
      : video.seekable.length
        ? video.seekable.end(video.seekable.length - 1)
        : 0;
    setDuration(end);
    setPosition(video.currentTime);
  };
  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) video.pause();
    else
      try {
        await video.play();
      } catch {
        setPlaybackError('Could not start playback. Try another supported video file.');
      }
  };
  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const end = Number.isFinite(video.duration)
      ? video.duration
      : video.seekable.length
        ? video.seekable.end(video.seekable.length - 1)
        : 0;
    if (!end) {
      setSeekNotice('Waiting for video information…');
      return false;
    }
    const target = Math.max(0, Math.min(end, time));
    try {
      video.currentTime = target;
      setPosition(target);
      return true;
    } catch {
      setSeekNotice('This video cannot seek yet. Wait for it to load, then retry.');
      return false;
    }
  };
  const timestamp = (time: number) => {
    const total = Math.max(0, Math.floor(time));
    return `${Math.floor(total / 3600) ? `${Math.floor(total / 3600)}:` : ''}${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (seekTo(video.currentTime + seconds))
      setSeekNotice(seconds > 0 ? 'Forward 10 seconds' : 'Back 10 seconds');
  };
  const [videos, setVideos] = useState<{ name: string; url: string }[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState('');
  const [lookupError, setLookupError] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true);
    const load = async () => {
      try {
        const found =
          folder && window.vault?.getMatchVideos ? await window.vault.getMatchVideos(match.id) : [];
        if (current) setVideos(found);
      } catch {
        if (current) setLookupError('Could not read your video folder. Choose it again to retry.');
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [folder, match.id]);
  const [error, setError] = useState('');
  const source = getSource(match);
  const openReference = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!window.vault) return;
    event.preventDefault();
    try {
      await window.vault.openExternal(validateExternalURL(source.url));
    } catch {
      setError('Could not open the reference.');
    }
  };
  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to covers
      </button>
      {loading ? (
        <p role="status">Looking for videos…</p>
      ) : videos.length ? (
        <div
          className="video-player"
          ref={playerRef}
          tabIndex={0}
          aria-label="Video player"
          onKeyDown={(event) => {
            if (
              event.target instanceof HTMLSelectElement ||
              event.target instanceof HTMLInputElement
            )
              return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              seek(event.key === 'ArrowLeft' ? -10 : 10);
            } else if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
              event.preventDefault();
              void togglePlayback();
            }
          }}
        >
          <div className="video-screen">
            <video
              ref={videoRef}
              onLoadedMetadata={updateMedia}
              onDurationChange={updateMedia}
              onProgress={updateMedia}
              onTimeUpdate={updateMedia}
              onSeeked={updateMedia}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              key={videos[active].url}
              src={videos[active].url}
              controls
              autoPlay
              muted
              playsInline
              aria-label={`${match.title} video`}
              onError={() =>
                setPlaybackError(
                  'This video could not be played. Try an MP4 with H.264 video and AAC audio, or a WebM file.',
                )
              }
            />
            <div
              className="skip-zone skip-zone-left"
              role="presentation"
              onMouseDown={(event) => event.currentTarget.parentElement?.parentElement?.focus()}
              onClick={tapVideo}
              onDoubleClick={() => doubleTapVideo(-10)}
            />
            <div
              className="skip-zone skip-zone-right"
              role="presentation"
              onMouseDown={(event) => event.currentTarget.parentElement?.parentElement?.focus()}
              onClick={tapVideo}
              onDoubleClick={() => doubleTapVideo(10)}
            />
          </div>
          <div className="playback-timeline">
            <span>{timestamp(position)}</span>
            <input
              type="range"
              aria-label="Video position"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(position, duration || 1)}
              disabled={!duration}
              aria-valuetext={`${timestamp(position)} of ${timestamp(duration)}`}
              onChange={(event) => seekTo(Number(event.target.value))}
            />
            <span>{timestamp(duration)}</span>
          </div>
          <div className="seek-controls">
            <button
              className="button playback-toggle"
              onClick={() => void togglePlayback()}
              aria-label={playing ? 'Pause video' : 'Play video'}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button className="button" onClick={() => seek(-10)} aria-label="Back 10 seconds">
              ← 10s
            </button>
            <span role="status" className="seek-notice">
              {seekNotice || 'Arrow keys or double-click the left/right side to skip'}
            </span>
            <button className="button" onClick={() => seek(10)} aria-label="Forward 10 seconds">
              10s →
            </button>
            <button
              className="button fullscreen-toggle"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {fullscreen ? (
                <Minimize size={18} aria-hidden="true" />
              ) : (
                <Maximize size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {videos.length > 1 && (
            <label>
              Video{' '}
              <select
                value={active}
                onChange={(event) => {
                  clearTimeout(tapTimer.current);
                  setActive(Number(event.target.value));
                  setDuration(0);
                  setPosition(0);
                  setPlaying(false);
                  setSeekNotice('');
                  setPlaybackError('');
                }}
              >
                {videos.map((video, index) => (
                  <option key={video.url} value={index}>
                    {video.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {playbackError && <p role="alert">{playbackError}</p>}
        </div>
      ) : (
        <>
          <div className="detail-cover">
            <Artwork match={match} eager />
          </div>
          <div className="video-empty">
            <p>
              {lookupError ||
                (folder
                  ? 'No video found for this match.'
                  : 'Choose your video folder to play this match.')}
            </p>
            <p>
              Place the video directly in your chosen folder. Include wrestler names or known
              nicknames, the event and year in its filename, or use <code>{match.id}.mp4</code>. No
              subfolders are required.
            </p>
            <a
              className="download-search"
              href={`https://www.google.com/search?q=${encodeURIComponent(`${match.title}, ${match.event}, ${match.date.slice(0, 4)}, watch online`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={async (event) => {
                if (!window.vault) return;
                event.preventDefault();
                try {
                  await window.vault.openExternal(validateExternalURL(event.currentTarget.href));
                } catch {
                  setError('Could not open the search.');
                }
              }}
            >
              Search Google for this match online <ExternalLink size={12} />
            </a>
            <button className="button" onClick={onChooseFolder}>
              Choose video folder
            </button>
          </div>
        </>
      )}
      <h1>{match.title}</h1>
      <p className="detail-event">
        {match.event} · {formatDate(match.date)}
      </p>
      <div className="source-box">
        <span>
          {match.cagematchScore === null
            ? 'CAGEMATCH score not supplied'
            : `CAGEMATCH ${match.cagematchScore.toFixed(2)} / 10`}{' '}
          ·{' '}
          {match.sourceStatus === 'user-reviewed'
            ? 'User-reviewed details'
            : match.sourceStatus === 'auto-imported'
              ? 'Automatically imported details'
              : 'Verification pending'}
        </span>
        <a
          href={validateExternalURL(source.url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => void openReference(event)}
        >
          Rating source <ExternalLink size={11} />
        </a>
      </div>
      {error && <p role="alert">{error}</p>}
      {editor}
    </div>
  );
}
