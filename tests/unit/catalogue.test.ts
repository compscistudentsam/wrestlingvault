import { describe, expect, it } from 'vitest';
import {
  defaultFilters,
  filterMatches,
  formatDate,
  formatRating,
  getCollections,
  getSource,
  matches,
} from '../../src/data/catalogue';

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
  it('combines promotion, era, rating and tokenized text filters', () => {
    const result = filterMatches(matches, {
      ...defaultFilters,
      query: '  OMEGA   dominion ',
      promotion: 'NJPW',
      era: '2010',
      rating: '6.5',
    });
    expect(result.map((match) => match.id)).toEqual(['omega-okada-dominion-2018']);
  });
  it('includes WWF in the WWE family while preserving recorded identity', () => {
    const result = filterMatches(matches, { ...defaultFilters, promotion: 'WWE', era: '1990' });
    expect(result).toHaveLength(2);
    expect(result.every((match) => match.promotion === 'WWF')).toBe(true);
    expect(filterMatches(matches, { ...defaultFilters, query: 'wwe 1994' })[0].id).toBe(
      'hart-hart-summerslam-1994',
    );
  });
  it('includes co-promoted matches in both promotion filters', () => {
    expect(
      filterMatches(matches, { ...defaultFilters, promotion: 'AEW' }).map((m) => m.id),
    ).toContain('ospreay-omega-forbidden-door-2023');
    expect(
      filterMatches(matches, { ...defaultFilters, promotion: 'NJPW' }).map((m) => m.id),
    ).toContain('ospreay-omega-forbidden-door-2023');
  });
  it('sorts a new array without mutating the original sample order', () => {
    const original = matches.map((match) => match.id);
    expect(filterMatches(matches, { ...defaultFilters, sort: 'oldest' })[0].date).toBe(
      '1989-04-02',
    );
    expect(filterMatches(matches, { ...defaultFilters, sort: 'newest' })[0].date).toBe(
      '2024-04-21',
    );
    expect(filterMatches(matches, defaultFilters)[0].rating).toBe(7);
    expect(matches.map((match) => match.id)).toEqual(original);
  });
  it('handles empty results and derives only nonempty collections', () => {
    expect(filterMatches(matches, { ...defaultFilters, query: 'no such match' })).toEqual([]);
    expect(getCollections([])).toEqual([]);
    const one = getCollections([matches[1]]);
    expect(one.map((collection) => collection.id)).toEqual(['greatest', 'wwe']);
  });
  it('explore actions reproduce the collection membership and order', () => {
    for (const collection of getCollections(matches)) {
      expect(
        filterMatches(matches, { ...defaultFilters, ...collection.filter }).map(
          (match) => match.id,
        ),
      ).toEqual(collection.records.map((match) => match.id));
    }
  });
  it('formats quarter-star ratings without clipping and dates without timezone drift', () => {
    expect(formatRating(7)).toBe('7.0');
    expect(formatRating(6.25)).toBe('6.25');
    expect(formatRating(5.75)).toBe('5.75');
    expect(formatDate('2018-06-09')).toBe('9 June 2018');
  });
});
