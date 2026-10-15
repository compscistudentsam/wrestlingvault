import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Artwork } from './components/Artwork';
import { CoverFlow } from './components/CoverFlow';
import { formatDate, getSource, matches, type Match } from './data/catalogue';
import { validateExternalURL } from './shared/security';
import './shared/api';

export function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(2) || 'library');
  const [selectedId, setSelectedId] = useState(
    () => matches.find((match) => route === `match/${match.id}`)?.id ?? matches[0].id,
  );
  const main = useRef<HTMLElement>(null);
  const selected = matches.find((match) => match.id === selectedId) ?? matches[0];
  const detail = route.startsWith('match/')
    ? matches.find((match) => match.id === route.slice(6))
    : undefined;
  const isLibrary = ['library', 'discover', 'matches'].includes(route);
  const navigate = (next: string) => {
    window.location.hash = `/${next}`;
  };
  useEffect(() => {
    const update = () => setRoute(window.location.hash.slice(2) || 'library');
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.location.hash = '/library';
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
    main.current?.focus({ preventScroll: true });
    main.current?.scrollTo({ top: 0 });
  }, [route, detail?.title]);
  return (
    <div className="app-shell">
      <header className="topbar">
        <img src="./vault.svg" alt="" />
        <span>
          WRESTLING <strong>VAULT</strong>
          <span className="gold">.</span>
        </span>
      </header>
      <main ref={main} tabIndex={-1} aria-label={isLibrary ? 'Match library' : 'Match details'}>
        {isLibrary ? (
          <CoverFlow
            records={matches}
            selected={selected}
            onSelect={setSelectedId}
            onOpen={(id) => {
              setSelectedId(id);
              navigate(`match/${id}`);
            }}
          />
        ) : detail ? (
          <MatchDetails key={detail.id} match={detail} onBack={() => navigate('library')} />
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

function MatchDetails({ match, onBack }: { match: Match; onBack: () => void }) {
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
      <div className="detail-cover">
        <Artwork match={match} eager />
      </div>
      <h1>{match.title}</h1>
      <p className="detail-event">
        {match.event} · {formatDate(match.date)}
      </p>
      <div className="source-box">
        <span>Sample · Verification pending</span>
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
    </div>
  );
}
