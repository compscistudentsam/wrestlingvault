import { useState } from 'react';
import { formatRating, yearOf, type Match } from '../data/catalogue';

/** Bundled match sleeves using the supplied photos, graphics and event posters. */
export function Artwork({ match, eager = false }: { match: Match; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = Boolean(match.image);
  return (
    <div
      className={`artwork artwork-${match.accent}${photo && !failed ? ' artwork-photo artwork-collection' : ''}`}
      data-fallback={failed}
      aria-hidden="true"
    >
      {!failed && (
        <img
          src={`./art/${match.image}`}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <div className="cover-lines" />
      <div className="cover-top">
        <span>{match.promotion}</span>
        <span>{match.rating === null ? 'UNRATED' : 'WON STARS'}</span>
      </div>
      <div className="cover-event">{match.event.replace(' in Osaka-jo Hall', '')}</div>
      <div
        className={`poster-type${match.shortNames.length > 2 ? ' poster-three-way' : ''}${match.shortNames.some((name) => name.length > 20) ? ' poster-team' : ''}`}
      >
        {match.shortNames.map((name, index) => (
          <span className="poster-side" key={`${name}-${index}`}>
            {index > 0 && <span className="poster-versus">VS</span>}
            <span>{name}</span>
          </span>
        ))}
      </div>
      <div className="cover-bottom">
        <span>{yearOf(match)}</span>
        <span>{match.rating === null ? 'Unrated' : `★ ${formatRating(match.rating)}`}</span>
      </div>
      <div className="cover-spine" />
    </div>
  );
}
