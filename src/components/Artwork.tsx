import { useState } from 'react';
import { formatRating, yearOf, type Match } from '../data/catalogue';

/** Bundled match sleeves with user-supplied photography where available. */
export function Artwork({ match, eager = false }: { match: Match; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = match.id === 'omega-okada-dominion-2018';
  return (
    <div
      className={`artwork artwork-${match.accent}${photo && !failed ? ' artwork-photo' : ''}`}
      data-fallback={failed}
      aria-hidden="true"
    >
      {!failed && (
        <img
          src={photo ? './art/omega-okada-dominion-2018.jpg' : `./art/${match.art}.svg`}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <div className="cover-lines" />
      <div className="cover-top">
        <span>{match.promotion}</span>
        <span>★★★★★</span>
      </div>
      <div className="cover-event">{match.event.replace(' in Osaka-jo Hall', '')}</div>
      <div className="poster-type">
        <span>{match.shortNames[0]}</span>
        <span className="poster-versus">VS</span>
        <span>{match.shortNames[1]}</span>
      </div>
      <div className="cover-bottom">
        <span>{yearOf(match)}</span>
        <span>★ {formatRating(match.rating)}</span>
      </div>
      <div className="cover-spine" />
    </div>
  );
}
