import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  Film,
  Globe2,
  Grid2X2,
  Info,
  Layers3,
  LockKeyhole,
  MapPin,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react';
import { Carousel } from './components/Carousel';
import { Hero } from './components/Hero';
import { Artwork } from './components/Artwork';
import { MatchCard } from './components/MatchCard';
import {
  defaultFilters,
  filterMatches,
  formatDate,
  formatRating,
  getCollections,
  getSource,
  matches,
  yearOf,
  type Filters,
  type Match,
} from './data/catalogue';
import { validateExternalURL } from './shared/security';
import './shared/api';

const navigation = [
  { id: 'discover', name: 'Discover', icon: Compass },
  { id: 'matches', name: 'All Matches', icon: Grid2X2 },
  { id: 'promotions', name: 'Promotions', icon: Trophy, phase: 3 },
  { id: 'wrestlers', name: 'Wrestlers', icon: UsersRound, phase: 3 },
  { id: 'timeline', name: 'Timeline', icon: CalendarDays, phase: 3 },
  { id: 'statistics', name: 'Statistics', icon: ChartNoAxesCombined, phase: 5 },
  { id: 'watchlist', name: 'My Watchlist', icon: Bookmark, phase: 4 },
  { id: 'settings', name: 'Settings', icon: Settings2 },
];

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
  const [reduceMotion, setReduceMotion] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reduceMotion || !!systemReducedMotion;
  const search = useRef<HTMLInputElement>(null);
  const scrollContainer = useRef<HTMLElement>(null);
  const returnRoute = useRef('discover');
  const deferredQuery = useDeferredValue(filters.query);
  const detail = route.startsWith('match/')
    ? matches.find((match) => match.id === route.slice(6))
    : undefined;
  const selected = navigation.find((item) => item.id === route);
  const pageTitle = route.startsWith('match/')
    ? 'Match details'
    : (selected?.name ?? 'Page not found');
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
    scrollContainer.current?.scrollTo({ top: 0, behavior: 'instant' });
    if (document.activeElement !== search.current)
      scrollContainer.current?.focus({ preventScroll: true });
    document.title = `${detail?.title ?? pageTitle} · Wrestling Vault`;
  }, [route, detail?.title, pageTitle]);
  const openMatch = (id: string) => {
    returnRoute.current = route;
    navigate(`match/${id}`);
  };
  const browse = (values: Partial<Filters> = {}) => {
    setFilters({ ...defaultFilters, ...values });
    navigate('matches');
  };
  const updateQuery = (query: string) => {
    setFilters((current) => ({ ...current, query }));
    if (route !== 'matches') navigate('matches');
  };

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <div className={`app-shell ${reducedMotion ? 'reduce-motion' : ''}`}>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(event) => {
            event.preventDefault();
            scrollContainer.current?.focus();
          }}
        >
          Skip to main content
        </a>
        <aside className="sidebar">
          <button
            className="brand"
            onClick={() => navigate('discover')}
            aria-label="Wrestling Vault home"
          >
            <img src="./vault.svg" alt="" />
            <span>
              WRESTLING
              <strong>
                VAULT<span className="brand-period">.</span>
              </strong>
            </span>
          </button>
          <p className="nav-label">EXPLORE THE ARCHIVE</p>
          <nav aria-label="Main navigation">
            {navigation.slice(0, 6).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${route === item.id ? 'active' : ''}`}
                aria-current={route === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={18} strokeWidth={1.6} />
                <span>{item.name}</span>
                {item.phase && (
                  <LockKeyhole
                    size={11}
                    className="nav-lock"
                    aria-label={`Available in Phase ${item.phase}`}
                  />
                )}
              </button>
            ))}
            <div className="nav-divider" />
            <p className="nav-label">YOUR CORNER</p>
            {navigation.slice(6).map((item) => (
              <button
                key={item.id}
                className={`nav-item ${route === item.id ? 'active' : ''}`}
                aria-current={route === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={18} strokeWidth={1.6} />
                <span>{item.name}</span>
                {item.phase && (
                  <LockKeyhole
                    size={11}
                    className="nav-lock"
                    aria-label={`Available in Phase ${item.phase}`}
                  />
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="vault-note">
              <div className="little-stars">★★★★★</div>
              <p>
                The matches.
                <br />
                The moments.
                <br />
                <strong>The masterpieces.</strong>
              </p>
              <span>A LOVE LETTER TO THE RING</span>
            </div>
            <div className="prototype-status">
              <span className="status-dot" />
              <span>
                PHASE 01 <span className="muted">/</span> DESIGN PREVIEW
              </span>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <span>THE ARCHIVE</span>
              <ChevronRight size={12} />
              <strong>{pageTitle}</strong>
            </div>
            <div className="global-search">
              <Search size={16} />
              <input
                ref={search}
                type="search"
                aria-label="Search the match archive"
                placeholder="Find a match, wrestler, moment…"
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
              className="topbar-info icon-button"
              onClick={() => navigate('settings')}
              aria-label="About this prototype"
            >
              <CircleHelp size={19} />
            </button>
            <span className="profile-mark" aria-label="Local archive, no account required">
              WV
            </span>
          </header>
          <main
            id="main-content"
            className="main-content"
            tabIndex={-1}
            ref={scrollContainer}
            aria-label={pageTitle}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={route}
                initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: reducedMotion ? 1 : 0 }}
                transition={{ duration: 0.16 }}
              >
                {route === 'discover' ? (
                  <>
                    <div className="page-intro">
                      <div>
                        <div className="eyebrow">THE PURSUIT OF PERFECTION</div>
                        <h1>
                          Welcome to the Vault<span className="gold">.</span>
                        </h1>
                        <p>Extraordinary matches. Unforgettable stories. All in one place.</p>
                      </div>
                      <span className="collection-chip">
                        <span className="status-dot" />
                        {matches.length} MATCHES TO DISCOVER
                      </span>
                    </div>
                    <Hero
                      records={matches.slice(0, 3)}
                      onOpen={openMatch}
                      reducedMotion={reducedMotion}
                    />
                    <div className="archive-strip">
                      <span>
                        <Star size={14} fill="currentColor" />
                        FIVE STARS IS JUST THE BEGINNING
                      </span>
                      <span className="strip-line" />
                      <span>1989 — 2024</span>
                      <span className="strip-dot" />A SMALL SELECTION. A LASTING IMPRESSION.
                    </div>
                    {getCollections(matches).map((collection, index) => (
                      <Carousel
                        key={collection.id}
                        {...collection}
                        ranked={index === 0}
                        onOpen={openMatch}
                        onBrowse={() => browse(collection.filter)}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </>
                ) : route === 'matches' ? (
                  <AllMatches
                    filters={{ ...filters, query: deferredQuery }}
                    setFilters={setFilters}
                    onOpen={openMatch}
                  />
                ) : detail ? (
                  <MatchDetails
                    match={detail}
                    onBack={() =>
                      navigate(
                        returnRoute.current.startsWith('match/') ? 'discover' : returnRoute.current,
                      )
                    }
                  />
                ) : route === 'settings' ? (
                  <Settings
                    reduceMotion={reduceMotion}
                    setReduceMotion={setReduceMotion}
                    systemReducedMotion={!!systemReducedMotion}
                  />
                ) : selected?.phase ? (
                  <ComingSoon
                    name={selected.name}
                    phase={selected.phase}
                    onDiscover={() => navigate('discover')}
                  />
                ) : (
                  <div className="empty-state">
                    <Compass size={36} />
                    <h1>This page isn’t in the archive.</h1>
                    <p>The address may be incomplete, or this sample match may not exist.</p>
                    <button className="button button-gold" onClick={() => navigate('discover')}>
                      Back to Discover
                    </button>
                  </div>
                )}
                <footer className="footer">
                  <span className="footer-brand">
                    WRESTLING VAULT<span className="gold">.</span>
                  </span>
                  <p>
                    {matches.length} sample records · Reference verification pending · Not a
                    complete historical archive
                  </p>
                  <button onClick={() => navigate('settings')}>
                    Sources &amp; credits <ArrowUpRight size={12} />
                  </button>
                </footer>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}

function AllMatches({
  filters,
  setFilters,
  onOpen,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onOpen: (id: string) => void;
}) {
  const results = filterMatches(matches, filters);
  const filtered =
    filters.query ||
    filters.promotion !== 'all' ||
    filters.era !== 'all' ||
    filters.rating !== 'all';
  const set = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const promotions = [
    ...new Set(
      matches.flatMap((match) =>
        (match.promotion === 'WWF' ? 'WWE' : match.promotion).split(' / '),
      ),
    ),
  ].sort();
  const decades = [...new Set(matches.map((match) => Math.floor(yearOf(match) / 10) * 10))].sort();
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">EVERY MATCH TELLS A STORY</div>
          <h1>
            The collection<span className="gold">.</span>
          </h1>
          <p>Find your next unforgettable match.</p>
        </div>
        <span className="collection-chip">
          <Layers3 size={14} />
          PHASE 1 SAMPLE ARCHIVE
        </span>
      </div>
      <div className="filter-bar">
        <div className="filter-title">
          <SlidersHorizontal size={17} />
          Refine your view
        </div>
        <label>
          Promotion
          <select
            aria-label="Filter by promotion"
            value={filters.promotion}
            onChange={(event) => set('promotion', event.target.value)}
          >
            <option value="all">All promotions</option>
            {promotions.map((promotion) => (
              <option key={promotion} value={promotion}>
                {promotion === 'WWE' ? 'WWE / WWF' : promotion}
              </option>
            ))}
          </select>
        </label>
        <label>
          Era
          <select
            aria-label="Filter by decade"
            value={filters.era}
            onChange={(event) => set('era', event.target.value)}
          >
            <option value="all">All decades</option>
            <option value="before-2000">Before 2000</option>
            {decades.map((decade) => (
              <option key={decade} value={decade}>
                {decade}s
              </option>
            ))}
          </select>
        </label>
        <label>
          Meltzer rating
          <select
            aria-label="Filter by minimum rating"
            value={filters.rating}
            onChange={(event) => set('rating', event.target.value)}
          >
            <option value="all">All ratings</option>
            <option value="5.5">5.5 stars &amp; above</option>
            <option value="6">6 stars &amp; above</option>
            <option value="7">7 stars &amp; above</option>
          </select>
        </label>
        {filtered && (
          <button className="reset-button" onClick={() => setFilters(defaultFilters)}>
            <X size={14} />
            Reset filters
          </button>
        )}
      </div>
      <div className="results-heading">
        <p aria-live="polite">
          <strong>{results.length}</strong> {results.length === 1 ? 'match' : 'matches'}
          {filters.query && (
            <>
              {' '}
              for <strong>“{filters.query}”</strong>
            </>
          )}
        </p>
        <label>
          Sort by
          <select
            aria-label="Sort matches"
            value={filters.sort}
            onChange={(event) => set('sort', event.target.value)}
          >
            <option value="rating">Highest rated</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Match title</option>
          </select>
        </label>
      </div>
      {results.length ? (
        <div className="match-grid">
          {results.map((match) => (
            <MatchCard key={match.id} match={match} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={34} />
          <h2>No matches in this corner.</h2>
          <p>
            Try another wrestler, a broader era, or clear your filters.
            <br />
            This prototype contains just {matches.length} sample records.
          </p>
          <button className="button button-gold" onClick={() => setFilters(defaultFilters)}>
            Clear search and filters <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
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
      setError('The reference could not be opened. Please try again from your system browser.');
    }
  };
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to collection
      </button>
      <section className="detail-hero">
        <Artwork key={match.id} match={match} hero />
        <div className="hero-shade" />
        <div className="detail-heading">
          <p className="eyebrow">
            {match.promotion} <span className="muted">/</span> {yearOf(match)}{' '}
            <span className="muted">/</span> THE VAULT COLLECTION
          </p>
          <h1>
            {match.wrestlers[0]}
            <span>vs.</span>
            {match.wrestlers[1]}
          </h1>
          <p>{match.event}</p>
          <div className="detail-meta">
            <span>
              <CalendarDays size={14} />
              {formatDate(match.date)}
            </span>
            <span>
              <MapPin size={14} />
              {match.venue}
            </span>
          </div>
        </div>
        <div className="detail-rating">
          <Star size={21} fill="currentColor" />
          <strong>{formatRating(match.rating)}</strong>
          <span>
            DAVE MELTZER
            <br />
            STAR RATING
          </span>
        </div>
      </section>
      <div className="detail-columns">
        <div className="detail-main">
          <p className="eyebrow">THE STORY. WITHOUT THE SPOILERS.</p>
          <h2>A moment worth revisiting.</h2>
          <p className="synopsis">{match.description}</p>
          <div className="detail-facts">
            <div>
              <span>THE STAGE</span>
              <strong>{match.event}</strong>
            </div>
            <div>
              <span>THE FORMAT</span>
              <strong>
                {match.matchType}
                {match.stipulation ? ` · ${match.stipulation}` : ''}
              </strong>
            </div>
            <div>
              <span>ON THE LINE</span>
              <strong>{match.championship ?? 'No championship listed'}</strong>
            </div>
            <div>
              <span>THE COMPETITORS</span>
              <strong>{match.wrestlers.join(' / ')}</strong>
            </div>
          </div>
          <div className="source-box">
            <ShieldCheck size={20} />
            <div>
              <h3>About this record</h3>
              <p>
                A small historical sample, with a linked secondary rating reference. Live source
                verification is pending; this record is not presented as a verified archive entry.
                The rating is attributed to Dave Meltzer, not a community score.
              </p>
              <a
                href={validateExternalURL(source.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => void openReference(event)}
              >
                {source.name}
                <ExternalLink size={13} />
              </a>
              {error && <p role="alert">{error}</p>}
            </div>
          </div>
        </div>
        <aside className="personal-panel">
          <Bookmark size={22} className="gold" />
          <h2>Make it part of your story.</h2>
          <p>Your own corner of wrestling history. Personal collections arrive in Phase 4.</p>
          <button className="button button-panel" disabled>
            <Bookmark size={16} />
            Add to Watchlist
            <LockKeyhole size={13} />
          </button>
          <button className="button button-panel" disabled>
            <Check size={16} />
            Mark as Watched
            <LockKeyhole size={13} />
          </button>
          <p className="availability-note">
            Watchlists, favourites, personal ratings and notes are unavailable in this prototype.
          </p>
          <div className="watch-note">
            <Film size={17} />
            <span>
              No verified watch link is available for this sample. Wrestling Vault does not host
              match video.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

function ComingSoon({
  name,
  phase,
  onDiscover,
}: {
  name: string;
  phase: number;
  onDiscover: () => void;
}) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-symbol">
        <LockKeyhole size={30} strokeWidth={1.2} />
      </div>
      <p className="eyebrow">THE NEXT CHAPTER · PHASE {String(phase).padStart(2, '0')}</p>
      <h1>
        {name}
        <span className="gold">.</span>
      </h1>
      <p>
        This part of the Vault is still on the horizon.
        <br />
        For now, explore the visual prototype and its sample collection.
      </p>
      <span className="coming-soon-label">UNAVAILABLE IN PHASE 1</span>
      <button className="button button-gold" onClick={onDiscover}>
        Discover the collection
        <ArrowRight size={16} />
      </button>
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
    <>
      <div className="page-intro">
        <div>
          <p className="eyebrow">BEHIND THE VAULT</p>
          <h1>
            The finer details<span className="gold">.</span>
          </h1>
          <p>A thoughtfully built home for the art of professional wrestling.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="settings-panel">
          <Sparkles size={21} className="gold" />
          <h2>Designed for your comfort.</h2>
          <label className="toggle-row">
            <span>
              <strong>Reduce motion</strong>
              <small>Keep transitions instant for this session.</small>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            <span className="toggle-track" />
          </label>
          <p>
            System reduced-motion preferences are always respected
            {systemReducedMotion ? ' and are currently active' : ''}. Use Tab to navigate and Ctrl +
            K to search. This preview uses the dark theme throughout.
          </p>
        </section>
        <section className="settings-panel">
          <Info size={21} className="gold" />
          <h2>A first look, not the full archive.</h2>
          <p>Wrestling Vault {version} · Phase 1 visual foundation.</p>
          <p>
            {matches.length} sample records spanning 1989–2024. Reference links are supplied, but
            source verification remains pending. No historical completeness or independent
            re-verification is claimed.
          </p>
          <p>
            All listed scores are attributed to Dave Meltzer. Wrestling ratings are subjective and
            do not represent an objective measure of quality.
          </p>
        </section>
        <section className="settings-panel">
          <Globe2 size={21} className="gold" />
          <h2>Built to live offline.</h2>
          <p>
            Sample records, fonts and artwork are bundled locally. Exploring the prototype requires
            no account, backend or AI API. Opening a source reference requires an internet
            connection.
          </p>
          <p>
            Database import, backups and personal data are unavailable in Phase 1. SQLite and data
            migration work begins only after design approval.
          </p>
        </section>
        <section className="settings-panel">
          <Layers3 size={21} className="gold" />
          <h2>Original art. Honest attribution.</h2>
          <p>
            The arena illustrations are original vector artwork created for Wrestling Vault. They
            are atmospheric representations, not photographs of the featured matches.
          </p>
          <p>
            Typography: Inter (SIL Open Font License). Icons: Lucide (ISC licence). Source
            references: IWNerd and WrestlePurists. Full dependency licences and data-review notes
            are documented in the repository.
          </p>
        </section>
      </div>
    </>
  );
}
