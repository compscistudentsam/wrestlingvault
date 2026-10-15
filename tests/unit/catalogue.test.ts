import { describe, expect, it } from 'vitest';
import { formatDate, formatRating, getSource, matches } from '../../src/data/catalogue';

describe('sample catalogue', () => {
  it('contains unique, well-formed qualifying sample records with provenance links', () => {
    expect(matches.length).toBe(12);
    expect(new Set(matches.map((match) => match.id)).size).toBe(matches.length);
    for (const match of matches) {
      expect(match.rating).toBeGreaterThanOrEqual(5);
      expect(match.rating * 4).toBe(Math.round(match.rating * 4));
      expect(new Date(match.date).toISOString().slice(0, 10)).toBe(match.date);
      expect(match.wrestlers.length).toBeGreaterThanOrEqual(2);
      expect(getSource(match).url).toMatch(/^https:/);
      expect(match.sourceStatus).toBe('reference-linked');
    }
  });
  it('formats quarter-star ratings without clipping and dates without timezone drift', () => {
    expect(formatRating(7)).toBe('7.0');
    expect(formatRating(6.25)).toBe('6.25');
    expect(formatRating(5.75)).toBe('5.75');
    expect(formatDate('2018-06-09')).toBe('9 June 2018');
  });
});
