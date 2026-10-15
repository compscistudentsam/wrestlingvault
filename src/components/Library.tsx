import { useEffect, useRef } from 'react';
import { ArrowUpRight, GalleryHorizontalEnd, Grid2X2, Search, Star, X } from 'lucide-react';
import { CoverFlow } from './CoverFlow';
import { MatchCard } from './MatchCard';
import {
  defaultFilters,
  filterMatches,
  formatRating,
  matches,
  yearOf,
  type Filters,
} from '../data/catalogue';

export type LibraryView = 'covers' | 'grid';
const promotions = [
  ...new Set(
    matches.flatMap((match) => (match.promotion === 'WWF' ? 'WWE' : match.promotion).split(' / ')),
  ),
].sort();
const decades = [...new Set(matches.map((match) => Math.floor(yearOf(match) / 10) * 10))].sort();

export function Library({
  filters,
  setFilters,
  selectedId,
  onSelect,
  view,
  setView,
  onOpen,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  selectedId: string;
  onSelect: (id: string) => void;
  view: LibraryView;
  setView: (view: LibraryView) => void;
  onOpen: (id: string) => void;
}) {
  const results = filterMatches(matches, filters);
  const selected = results.find((match) => match.id === selectedId) ?? results[0];
  const selectedRow = useRef<HTMLTableRowElement>(null);
  // Remember the visible selection if filtering removes the previously selected match.
  useEffect(() => {
    if (selected && selected.id !== selectedId) onSelect(selected.id);
  }, [selected, selectedId, onSelect]);
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selected?.id, view]);
  const filtered =
    filters.query ||
    filters.promotion !== 'all' ||
    filters.era !== 'all' ||
    filters.rating !== 'all';
  const set = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div className={`library library-${view}`}>
      <div className="library-toolbar">
        <div className="library-heading">
          <h1>
            {filters.promotion === 'all'
              ? 'All matches'
              : filters.promotion === 'WWE'
                ? 'WWE / WWF'
                : filters.promotion}
          </h1>
          <span aria-live="polite">{results.length}</span>
        </div>
        <div className="view-switch" aria-label="Library view">
          <button
            aria-label="Cover flow view"
            aria-pressed={view === 'covers'}
            onClick={() => setView('covers')}
          >
            <GalleryHorizontalEnd size={16} />
            <span>Covers</span>
          </button>
          <button
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <Grid2X2 size={16} />
            <span>Grid</span>
          </button>
        </div>
      </div>
      <div className="filter-bar">
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
        <select
          aria-label="Filter by decade"
          value={filters.era}
          onChange={(event) => set('era', event.target.value)}
        >
          <option value="all">All years</option>
          <option value="before-2000">Before 2000</option>
          {decades.map((decade) => (
            <option key={decade} value={decade}>
              {decade}s
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by minimum rating"
          value={filters.rating}
          onChange={(event) => set('rating', event.target.value)}
        >
          <option value="all">All ratings</option>
          <option value="5.5">5.5+ stars</option>
          <option value="6">6+ stars</option>
          <option value="7">7+ stars</option>
        </select>
        {filtered && (
          <button className="reset-button" onClick={() => setFilters(defaultFilters)}>
            <X size={13} /> Reset
          </button>
        )}
        <select
          className="sort-select"
          aria-label="Sort matches"
          value={filters.sort}
          onChange={(event) => set('sort', event.target.value)}
        >
          <option value="rating">Highest rated</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Match title</option>
        </select>
      </div>
      {!selected ? (
        <div className="empty-state">
          <Search size={28} />
          <h2>No matches found</h2>
          <button className="button button-gold" onClick={() => setFilters(defaultFilters)}>
            Clear search and filters
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid-scroll">
          <div className="match-grid">
            {results.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onOpen={(id) => {
                  onSelect(id);
                  onOpen(id);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <CoverFlow records={results} selected={selected} onSelect={onSelect} onOpen={onOpen} />
          <div className="match-list" tabIndex={0} aria-label="Match list">
            <table>
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  <th>Match</th>
                  <th className="event-cell">Event</th>
                  <th className="promotion-cell">Promotion</th>
                  <th className="year-cell">Year</th>
                  <th className="rating-cell">Rating</th>
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((match, index) => (
                  <tr
                    key={match.id}
                    className={selected.id === match.id ? 'selected-row' : ''}
                    ref={selected.id === match.id ? selectedRow : undefined}
                    onClick={() => onSelect(match.id)}
                    onDoubleClick={() => onOpen(match.id)}
                  >
                    <td className="row-number">{String(index + 1).padStart(2, '0')}</td>
                    <td>
                      <button
                        className="row-title"
                        aria-label={`Select ${match.title}, ${match.event}`}
                        aria-pressed={selected.id === match.id}
                        onClick={() => onSelect(match.id)}
                      >
                        {match.title}
                      </button>
                    </td>
                    <td className="event-cell">{match.event}</td>
                    <td className="promotion-cell">{match.promotion}</td>
                    <td className="year-cell">{yearOf(match)}</td>
                    <td className="rating-cell">
                      <Star size={10} fill="currentColor" /> {formatRating(match.rating)}
                    </td>
                    <td>
                      <button
                        className="row-open icon-button"
                        aria-label={`View ${match.title}, ${match.event}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(match.id);
                          onOpen(match.id);
                        }}
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
