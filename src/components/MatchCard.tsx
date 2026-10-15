import { ArrowUpRight } from 'lucide-react';
import { Artwork } from './Artwork';
import { yearOf, type Match } from '../data/catalogue';

export function MatchCard({ match, onOpen }: { match: Match; onOpen: (id: string) => void }) {
  return (
    <article className="match-card">
      <button
        className="card-link"
        onClick={() => onOpen(match.id)}
        aria-label={`View ${match.title}, ${match.event}, ${yearOf(match)}`}
      >
        <div className="card-visual">
          <Artwork match={match} />
          <span className="card-open">
            <ArrowUpRight size={20} />
          </span>
        </div>
        <div className="card-info">
          <h3>{match.title}</h3>
          <p>
            {match.event} · {yearOf(match)}
          </p>
        </div>
      </button>
    </article>
  );
}
