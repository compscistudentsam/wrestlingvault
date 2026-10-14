import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MoveUpRight } from 'lucide-react';
import { MatchCard } from './MatchCard';
import type { Match } from '../data/catalogue';

interface Props {
  title: string;
  subtitle: string;
  label: string;
  records: readonly Match[];
  onOpen: (id: string) => void;
  onBrowse: () => void;
  ranked?: boolean;
  reducedMotion: boolean;
}
export function Carousel({
  title,
  subtitle,
  label,
  records,
  onOpen,
  onBrowse,
  ranked = false,
  reducedMotion,
}: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ start: true, end: false });
  const update = useCallback(() => {
    const element = rail.current;
    if (element)
      setPosition({
        start: element.scrollLeft < 4,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
      });
  }, []);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [update, records]);
  const scroll = (direction: number) => {
    const element = rail.current;
    if (element)
      element.scrollBy({
        left: direction * (element.clientWidth * 0.8),
        behavior: reducedMotion ? 'instant' : 'smooth',
      });
  };
  if (!records.length) return null;
  return (
    <section className="collection" aria-label={title}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{label}</p>
          <h2>{title}</h2>
          <p className="section-description">{subtitle}</p>
        </div>
        <div className="collection-controls">
          <button className="text-button" onClick={onBrowse}>
            Explore collection <MoveUpRight size={13} />
          </button>
          <div className="arrow-pair">
            <button
              className="icon-button"
              aria-label={`Scroll ${title} left`}
              disabled={position.start}
              onClick={() => scroll(-1)}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={`Scroll ${title} right`}
              disabled={position.end}
              onClick={() => scroll(1)}
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </div>
      <div
        className="carousel"
        ref={rail}
        onScroll={update}
        tabIndex={0}
        aria-label={`${title} match carousel`}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            ['ArrowLeft', 'ArrowRight'].includes(event.key)
          ) {
            event.preventDefault();
            scroll(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        {records.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            onOpen={onOpen}
            rank={ranked ? i + 1 : undefined}
          />
        ))}
      </div>
    </section>
  );
}
