import { ArrowUpRight, Bookmark, Star } from 'lucide-react';
import { Artwork } from './Artwork';
import { formatRating, yearOf, type Match } from '../data/catalogue';

export function MatchCard({
  match,
  onOpen,
  rank,
}: {
  match: Match;
  onOpen: (id: string) => void;
  rank?: number;
}) {
  return (
    <article className="match-card">
      <button
        className="card-link"
        onClick={() => onOpen(match.id)}
        aria-label={`View ${match.title}, ${match.event}, ${yearOf(match)}`}
      >
        <div className="card-visual">
          <Artwork key={match.id} match={match} />
          <span className="promotion-pill">{match.promotion}</span>
          <span className="rating-badge">
            <Star size={12} fill="currentColor" />
            {formatRating(match.rating)}
          </span>
          <span className="card-art-caption">ORIGINAL VAULT ARTWORK</span>
          <span className="card-open">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="card-info">
          {rank !== undefined && <span className="card-rank">{String(rank).padStart(2, '0')}</span>}
          <div>
            <h3>{match.title}</h3>
            <p>{match.event}</p>
            <span className="card-year">
              {yearOf(match)}
              <span className="dot" />
              {match.matchType}
            </span>
          </div>
        </div>
      </button>
      <button
        className="card-bookmark"
        disabled
        aria-label="Watchlist unavailable until Phase 4"
        title="Personal watchlists arrive in Phase 4"
      >
        <Bookmark size={16} />
      </button>
    </article>
  );
}
