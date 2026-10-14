import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bookmark, MoveUpRight, Star } from 'lucide-react';
import { Artwork } from './Artwork';
import { formatRating, yearOf, type Match } from '../data/catalogue';

export function Hero({
  records,
  onOpen,
  reducedMotion,
}: {
  records: readonly Match[];
  onOpen: (id: string) => void;
  reducedMotion: boolean;
}) {
  const [index, setIndex] = useState(0);
  const match = records[index];
  if (!match) return null;
  const move = (step: number) =>
    setIndex((current) => (current + step + records.length) % records.length);
  return (
    <section className="hero" aria-label="Featured matches" aria-roledescription="carousel">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="hero-scene"
          key={match.id}
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reducedMotion ? 1 : 0 }}
          transition={{ duration: 0.24 }}
        >
          <Artwork match={match} hero />
          <div className="hero-shade" />
          <div className="hero-content" aria-live="polite" aria-atomic="true">
            <div className="feature-label">
              <span />
              THE VAULT SPOTLIGHT
              <span className="feature-edition">VOL. {String(index + 1).padStart(2, '0')}</span>
            </div>
            <p className="hero-eyebrow">{match.eyebrow}</p>
            <h2 className="hero-title">
              {match.wrestlers[0]}
              <span className="hero-vs">versus</span>
              {match.wrestlers[1]}
            </h2>
            <div className="hero-meta">
              <span className="hero-promotion">{match.promotion}</span>
              <span>{match.event.replace(' in Osaka-jo Hall', '')}</span>
              <span className="dot" />
              <span>{yearOf(match)}</span>
            </div>
            <p className="hero-description">{match.description}</p>
            <div className="hero-actions">
              <button className="button button-gold" onClick={() => onOpen(match.id)}>
                Explore the match <MoveUpRight size={17} />
              </button>
              <button
                className="button button-glass"
                disabled
                title="Personal watchlists arrive in Phase 4"
              >
                <Bookmark size={16} /> Watchlist <span className="soon-tag">SOON</span>
              </button>
            </div>
          </div>
          <div className="hero-score">
            <span className="score-stars" aria-hidden="true">
              ★★★★★
            </span>
            <span className="hero-score-value">
              {formatRating(match.rating)}
              <Star size={21} fill="currentColor" />
            </span>
            <span>MELTZER RATING</span>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="hero-bottom">
        <span className="hero-art-note">
          <span className="tiny-square" />
          ORIGINAL ARENA ART · SAMPLE COLLECTION
        </span>
        <div className="hero-pagination">
          <span>
            {String(index + 1).padStart(2, '0')}{' '}
            <span className="muted">/ {String(records.length).padStart(2, '0')}</span>
          </span>
          <div className="hero-dots">
            {records.map((record, i) => (
              <button
                key={record.id}
                aria-label={`Feature ${record.title}`}
                aria-current={i === index ? 'true' : undefined}
                className={i === index ? 'active' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            className="hero-arrow"
            aria-label="Previous featured match"
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button className="hero-arrow" aria-label="Next featured match" onClick={() => move(1)}>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
