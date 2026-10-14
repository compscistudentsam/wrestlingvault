import { useState } from 'react';
import type { Match } from '../data/catalogue';

/** Bundled, original artwork only. Remote image loading is intentionally unavailable. */
export function Artwork({ match, hero = false }: { match: Match; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`artwork artwork-${match.accent} ${hero ? 'artwork-hero' : ''}`}
      data-fallback={failed}
      aria-hidden="true"
    >
      {!failed && (
        <img
          src={`./art/${match.art}.svg`}
          alt=""
          loading={hero ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <div className="artwork-grain" />
      {!hero && (
        <div className="poster-type">
          <span>{match.shortNames[0]}</span>
          <span className="poster-versus">— VS —</span>
          <span>{match.shortNames[1]}</span>
        </div>
      )}
      {hero && (
        <div className="hero-ghost-type" aria-hidden="true">
          THE ART
          <br />
          OF GREATNESS.
        </div>
      )}
    </div>
  );
}
