import { useEffect, useRef, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Star } from 'lucide-react';
import { Artwork } from './Artwork';
import { formatRating, yearOf, type Match } from '../data/catalogue';

export function CoverFlow({
  layout = 'covers',
  records,
  selected,
  downloaded = new Set<string>(),
  highlightDownloads = false,
  onSelect,
  onOpen,
  shuffling = false,
  flip = null,
}: {
  layout?: 'covers' | 'grid';
  downloaded?: Set<string>;
  highlightDownloads?: boolean;
  records: readonly Match[];
  selected: Match;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  shuffling?: boolean;
  flip?: { match: Match; sequence: number; duration: number } | null;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const grid = layout === 'grid';
  useEffect(() => {
    if (grid) {
      stage.current
        ?.querySelector('.is-selected')
        ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    } else {
      stage.current?.closest('main')?.scrollTo({ top: 0 });
    }
  }, [grid, selected.id, records]);
  const index = records.findIndex((record) => record.id === selected.id);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const lastWheel = useRef(-Infinity);
  const move = (step: number) =>
    onSelect(records[(index + step + records.length) % records.length].id);
  return (
    <section
      className={`cover-browser${grid ? ' grid-browser' : ''} ${shuffling ? 'is-shuffling' : ''}`}
      aria-label="Match covers"
      aria-roledescription={grid ? undefined : 'carousel'}
      style={flip ? ({ '--flip-duration': `${flip.duration}ms` } as CSSProperties) : undefined}
    >
      <div
        key={layout}
        ref={stage}
        className="cover-stage"
        tabIndex={0}
        aria-label={
          grid
            ? 'Browse match grid with arrow keys'
            : 'Browse match covers with Left and Right arrow keys'
        }
        onKeyDown={(event) => {
          if (shuffling) return;
          if (
            [
              'ArrowLeft',
              'ArrowRight',
              'Home',
              'End',
              ...(grid ? ['ArrowUp', 'ArrowDown'] : []),
            ].includes(event.key)
          ) {
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            if (event.key === 'Home') onSelect(records[0].id);
            else if (event.key === 'End') onSelect(records[records.length - 1].id);
            else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              const columns = getComputedStyle(event.currentTarget).gridTemplateColumns.split(
                ' ',
              ).length;
              move(event.key === 'ArrowDown' ? columns : -columns);
            } else move(event.key === 'ArrowRight' ? 1 : -1);
          } else if (event.key === 'Enter' && event.target === event.currentTarget) {
            onOpen(selected.id);
          }
        }}
        onWheel={(event) => {
          if (shuffling || grid) return;
          // Only horizontal gestures browse sleeves; vertical scrolling remains native.
          const delta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.shiftKey
                ? event.deltaY
                : 0;
          if (Math.abs(delta) > 12 && performance.now() - lastWheel.current > 240) {
            lastWheel.current = performance.now();
            move(delta > 0 ? 1 : -1);
          }
        }}
        onTouchStart={(event) => {
          if (shuffling || grid) return;
          touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          swiped.current = false;
        }}
        onTouchEnd={(event) => {
          if (shuffling || grid) return;
          if (!touchStart.current) return;
          const x = event.changedTouches[0].clientX - touchStart.current.x;
          const y = event.changedTouches[0].clientY - touchStart.current.y;
          if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y)) {
            swiped.current = true;
            move(x < 0 ? 1 : -1);
          }
          touchStart.current = null;
        }}
        onClickCapture={(event) => {
          if (swiped.current) {
            event.stopPropagation();
            swiped.current = false;
          }
        }}
      >
        {!grid && <div className={`stage-glow artwork-${selected.accent}`} />}
        {records.map((match, i) => {
          let offset = i - index;
          if (offset > records.length / 2) offset -= records.length;
          if (offset < -records.length / 2) offset += records.length;
          const active = offset === 0;
          const hidden = !grid && Math.abs(offset) > 3;
          if (hidden) return null;
          return (
            <button
              key={match.id}
              className={`flow-cover ${active ? 'is-selected' : ''}${highlightDownloads && !downloaded.has(match.id) ? ' is-unavailable' : ''}`}
              data-downloaded={downloaded.has(match.id)}
              style={
                {
                  '--offset': offset,
                  '--side': Math.sign(offset),
                  '--depth': Math.abs(offset),
                  zIndex: 10 - Math.abs(offset),
                } as CSSProperties
              }
              aria-label={`${grid || active ? 'Open' : 'Select'} ${match.title}, ${match.event}, ${yearOf(match)}`}
              aria-current={active ? 'true' : undefined}
              aria-hidden={hidden || undefined}
              tabIndex={hidden ? -1 : 0}
              disabled={shuffling}
              data-hidden={hidden}
              onClick={() => (grid || active ? onOpen(match.id) : onSelect(match.id))}
            >
              <Artwork key={match.id} match={match} eager={Math.abs(offset) < 2} />
              {grid && active && flip && (
                <div className="page-flip" key={flip.sequence} aria-hidden="true">
                  <Artwork match={flip.match} eager />
                </div>
              )}
              <span className="cover-open">
                <ArrowUpRight size={18} /> Open match
              </span>
            </button>
          );
        })}
        {!grid && flip && (
          <div className="page-flip" key={flip.sequence} aria-hidden="true">
            <Artwork match={flip.match} eager />
          </div>
        )}
      </div>
      <div className="selection-bar">
        <button
          className="icon-button"
          aria-label="Previous match"
          disabled={shuffling || records.length < 2}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          className="selection-caption"
          aria-live={shuffling ? 'off' : 'polite'}
          aria-atomic="true"
        >
          <h2>{selected.title}</h2>
          <p>
            {selected.event} <span>·</span> {yearOf(selected)} <span>·</span>{' '}
            <span className="gold">
              {selected.rating !== null && <Star size={11} fill="currentColor" />}{' '}
              {formatRating(selected.rating)}
            </span>
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Next match"
          disabled={shuffling || records.length < 2}
          onClick={() => move(1)}
        >
          <ChevronRight size={20} />
        </button>
        <span className="selection-count">
          {String(index + 1).padStart(2, '0')} / {String(records.length).padStart(2, '0')}
        </span>
      </div>
    </section>
  );
}
