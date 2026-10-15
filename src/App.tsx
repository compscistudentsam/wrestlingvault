import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Compass,
  ExternalLink,
  Folder,
  Grid2X2,
  Info,
  LockKeyhole,
  Search,
  Settings2,
  Star,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { Artwork } from './components/Artwork';
import { Library, type LibraryView } from './components/Library';
import {
  defaultFilters,
  filterMatches,
  formatDate,
  formatRating,
  getCollections,
  getSource,
  matches,
  type Filters,
  type Match,
} from './data/catalogue';
import { validateExternalURL } from './shared/security';
import './shared/api';

const futureNavigation = [
  { id: 'promotions', name: 'Promotions', icon: Trophy, phase: 3 },
  { id: 'wrestlers', name: 'Wrestlers', icon: UsersRound, phase: 3 },
  { id: 'timeline', name: 'Timeline', icon: CalendarDays, phase: 3 },
  { id: 'statistics', name: 'Statistics', icon: ChartNoAxesCombined, phase: 5 },
  { id: 'watchlist', name: 'My Watchlist', icon: Bookmark, phase: 4 },
];
const collections = getCollections(matches);
const promotionNames = [
  ...new Set(
    matches.flatMap((match) => (match.promotion === 'WWF' ? 'WWE' : match.promotion).split(' / ')),
  ),
].sort();

function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(2) || 'discover');
  useEffect(() => {
    const update = () => setRoute(window.location.hash.slice(2) || 'discover');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return [
    route,
    (next: string) => {
      window.location.hash = `/${next}`;
    },
  ] as const;
}

export function App() {
  const [route, navigate] = useRoute();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedId, setSelectedId] = useState(matches[0].id);
  const [view, setView] = useState<LibraryView>('covers');
  const [reduceMotion, setReduceMotion] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reduceMotion || !!systemReducedMotion;
  const search = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLElement>(null);
  const returnRoute = useRef('discover');
  const deferredQuery = useDeferredValue(filters.query);
  const isLibrary = route === 'discover' || route === 'matches';
  const detail = route.startsWith('match/')
    ? matches.find((match) => match.id === route.slice(6))
    : undefined;
  const future = futureNavigation.find((item) => item.id === route);
  const title =
    detail?.title ??
    (isLibrary
      ? 'Library'
      : route === 'settings'
        ? 'Settings'
        : (future?.name ?? 'Page not found'));
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);
  useEffect(() => {
    main.current?.scrollTo({ top: 0, behavior: 'instant' });
    if (document.activeElement !== search.current) main.current?.focus({ preventScroll: true });
    document.title = `${title} · Wrestling Vault`;
  }, [route, title]);
  const openMatch = (id: string) => {
    returnRoute.current = isLibrary ? route : 'discover';
    setSelectedId(id);
    navigate(`match/${id}`);
  };
  const browse = (values: Partial<Filters> = {}) => {
    setFilters({ ...defaultFilters, ...values });
    navigate('matches');
  };
  const updateQuery = (query: string) => {
    setFilters((current) => ({ ...current, query }));
    if (!isLibrary) navigate('matches');
  };
  const showLibrary = (target: string) => {
    setFilters(defaultFilters);
    setView(target === 'discover' ? 'covers' : 'grid');
    navigate(target);
  };
  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <div className={`app-shell ${reducedMotion ? 'reduce-motion' : ''}`}>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(event) => {
            event.preventDefault();
            main.current?.focus();
          }}
        >
          Skip to main content
        </a>
        <header className="topbar">
          <button
            className="brand"
            onClick={() => showLibrary('discover')}
            aria-label="Wrestling Vault home"
          >
            <img src="./vault.svg" alt="" />
            <span>
              WRESTLING <strong>VAULT</strong>
              <span className="gold">.</span>
            </span>
          </button>
          <div className="global-search">
            <Search size={15} />
            <input
              ref={search}
              type="search"
              aria-label="Search the match archive"
              placeholder="Search matches…"
              value={filters.query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  updateQuery('');
                  search.current?.blur();
                }
              }}
            />
            <kbd>Ctrl K</kbd>
          </div>
          <button
            className="icon-button topbar-info"
            onClick={() => navigate('settings')}
            aria-label="About Wrestling Vault"
          >
            <Info size={17} />
          </button>
        </header>
        <aside className="sidebar">
          <nav aria-label="Main navigation">
            <p className="nav-label">LIBRARY</p>
            <button
              className={`nav-item ${route === 'discover' ? 'active' : ''}`}
              aria-label="Discover"
              aria-current={route === 'discover' ? 'page' : undefined}
              onClick={() => showLibrary('discover')}
            >
              <Compass size={16} />
              <span>Discover</span>
            </button>
            <button
              className={`nav-item ${route === 'matches' ? 'active' : ''}`}
              aria-label="All Matches"
              aria-current={route === 'matches' ? 'page' : undefined}
              onClick={() => showLibrary('matches')}
            >
              <Grid2X2 size={16} />
              <span>All matches</span>
              <small>{matches.length}</small>
            </button>
            <div className="sidebar-collections">
              <p className="nav-label">COLLECTIONS</p>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  className="nav-item collection-link"
                  onClick={() => {
                    setView('covers');
                    browse(collection.filter);
                  }}
                >
                  <Folder size={14} />
                  <span>{collection.title}</span>
                  <small>{collection.records.length}</small>
                </button>
              ))}
              <p className="nav-label">PROMOTIONS</p>
              {promotionNames.map((promotion) => (
                <button
                  key={promotion}
                  className={`nav-item promotion-link ${isLibrary && filters.promotion === promotion ? 'active' : ''}`}
                  aria-pressed={isLibrary && filters.promotion === promotion}
                  onClick={() => browse({ promotion })}
                >
                  <span className="promotion-dot" />
                  <span>{promotion === 'WWE' ? 'WWE / WWF' : promotion}</span>
                  <small>{filterMatches(matches, { ...defaultFilters, promotion }).length}</small>
                </button>
              ))}
            </div>
            <details className="more-nav">
              <summary aria-label="More navigation">
                <ChevronRight size={13} />
                <span>More</span>
              </summary>
              {futureNavigation.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${route === item.id ? 'active' : ''}`}
                  aria-label={item.name}
                  aria-current={route === item.id ? 'page' : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={15} />
                  <span>{item.name}</span>
                  <LockKeyhole size={10} />
                </button>
              ))}
            </details>
            <button
              className={`nav-item settings-link ${route === 'settings' ? 'active' : ''}`}
              aria-label="Settings"
              aria-current={route === 'settings' ? 'page' : undefined}
              onClick={() => navigate('settings')}
            >
              <Settings2 size={16} />
              <span>Settings</span>
            </button>
          </nav>
          <div className="sidebar-status">
            <span className="status-dot" />
            <span>Local library</span>
          </div>
        </aside>
        <main
          id="main-content"
          className={`main-content ${isLibrary ? 'library-content' : 'page-content'}`}
          ref={main}
          tabIndex={-1}
          aria-label={title}
        >
          {isLibrary ? (
            <Library
              filters={{ ...filters, query: deferredQuery }}
              setFilters={setFilters}
              selectedId={selectedId}
              onSelect={setSelectedId}
              view={view}
              setView={setView}
              onOpen={openMatch}
            />
          ) : detail ? (
            <MatchDetails
              key={detail.id}
              match={detail}
              onBack={() => navigate(returnRoute.current)}
            />
          ) : route === 'settings' ? (
            <Settings
              reduceMotion={reduceMotion}
              setReduceMotion={setReduceMotion}
              systemReducedMotion={!!systemReducedMotion}
            />
          ) : future ? (
            <div className="empty-state">
              <LockKeyhole size={27} />
              <h1>{future.name}</h1>
              <p>Available in Phase {future.phase}. Unavailable in this prototype.</p>
              <button className="button button-gold" onClick={() => navigate('discover')}>
                Back to library
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <Compass size={30} />
              <h1>Match not found</h1>
              <button className="button button-gold" onClick={() => navigate('discover')}>
                Back to library
              </button>
            </div>
          )}
        </main>
        <footer className="statusbar">
          <span>
            {matches.length} samples <span className="status-divider">·</span> Verification pending
          </span>
          <button onClick={() => navigate('settings')}>
            Original cover art <ArrowUpRight size={11} />
          </button>
        </footer>
      </div>
    </MotionConfig>
  );
}

function MatchDetails({ match, onBack }: { match: Match; onBack: () => void }) {
  const [error, setError] = useState('');
  const source = getSource(match);
  const openReference = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!window.vault) return;
    event.preventDefault();
    try {
      await window.vault.openExternal(validateExternalURL(source.url));
    } catch {
      setError('Could not open the reference. Try again from your system browser.');
    }
  };
  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={15} /> Back to collection
      </button>
      <div className="detail-layout">
        <div className="detail-cover">
          <Artwork match={match} eager />
        </div>
        <div className="detail-info">
          <div className="detail-kicker">
            <span>{match.promotion}</span>
            <span className="detail-rating">
              <Star size={14} fill="currentColor" /> {formatRating(match.rating)}{' '}
              <small>Meltzer</small>
            </span>
          </div>
          <h1>{match.title}</h1>
          <p className="detail-event">{match.event}</p>
          <dl className="detail-facts">
            <div>
              <dt>Date</dt>
              <dd>{formatDate(match.date)}</dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{match.venue}</dd>
            </div>
            <div>
              <dt>Match</dt>
              <dd>
                {match.matchType}
                {match.stipulation ? ` · ${match.stipulation}` : ''}
              </dd>
            </div>
            {match.championship && (
              <div>
                <dt>Title</dt>
                <dd>{match.championship}</dd>
              </div>
            )}
          </dl>
          <p className="synopsis">{match.description}</p>
          <div className="detail-actions">
            <button className="button button-muted" disabled title="Watchlists arrive in Phase 4">
              <Bookmark size={15} /> Add to Watchlist <LockKeyhole size={12} />
            </button>
            <span>Unavailable in this prototype</span>
          </div>
          <div className="source-box">
            <p>Sample record · Source verification pending</p>
            <a
              href={validateExternalURL(source.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => void openReference(event)}
            >
              {source.name}
              <ExternalLink size={12} />
            </a>
            {error && <p role="alert">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({
  reduceMotion,
  setReduceMotion,
  systemReducedMotion,
}: {
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
  systemReducedMotion: boolean;
}) {
  const [version, setVersion] = useState('0.1.0');
  useEffect(() => {
    let active = true;
    void window.vault
      ?.getVersion()
      .then((value) => {
        if (active) setVersion(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <section className="settings-panel">
        <h2>Appearance</h2>
        <label className="toggle-row">
          <span>
            <strong>Reduce motion</strong>
            <small>This session</small>
          </span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(event) => setReduceMotion(event.target.checked)}
          />
        </label>
        <p>
          System motion preferences are respected
          {systemReducedMotion ? ' and currently active' : ''}.
        </p>
      </section>
      <section className="settings-panel">
        <h2>Keyboard</h2>
        <dl className="keyboard-list">
          <div>
            <dt>Search</dt>
            <dd>
              <kbd>Ctrl K</kbd>
            </dd>
          </div>
          <div>
            <dt>Browse covers</dt>
            <dd>
              <kbd>←</kbd> <kbd>→</kbd>
            </dd>
          </div>
          <div>
            <dt>First / last cover</dt>
            <dd>
              <kbd>Home</kbd> <kbd>End</kbd>
            </dd>
          </div>
          <div>
            <dt>Open focused cover</dt>
            <dd>
              <kbd>Enter</kbd>
            </dd>
          </div>
        </dl>
      </section>
      <section className="settings-panel">
        <h2>About & credits</h2>
        <p>Wrestling Vault {version} · Phase 1 prototype.</p>
        <p>
          {matches.length} sample matches. Rating references are linked, with verification pending.
          Scores are attributed to Dave Meltzer and reflect subjective assessments.
        </p>
        <p>
          Original illustrated cover art, not match photography. Fonts: Inter (SIL OFL). Icons:
          Lucide (ISC). Sources: IWNerd and WrestlePurists.
        </p>
        <p>
          Sample records, art and fonts work offline. Watchlists, imports and persistent personal
          data are unavailable in this prototype.
        </p>
      </section>
    </div>
  );
}
