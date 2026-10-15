import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import provenance from '../../src/data/cover-provenance.json';
import { describe, expect, it } from 'vitest';
import { formatDate, formatRating, getSource, matches } from '../../src/data/catalogue';

describe('supplied top 50 catalogue', () => {
  it('contains unique, well-formed qualifying sample records with provenance links', () => {
    expect(matches.length).toBe(50);
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

it('preserves the supplied rank, metadata and exact image mapping for every card', () => {
  expect(provenance).toHaveLength(50);
  for (const [index, match] of matches.entries()) {
    const original = provenance[index];
    expect(match.rank).toBe(index + 1);
    expect(match.id).toBe(original.matchId);
    expect(match.title).toBe(original.match);
    expect(match.date).toBe(original.date);
    expect(match.rating).toBe(Number(original.rating));
    expect(match.event).toBe(original.event);
    expect(`public/art/${match.image}`).toBe(original.bundledImage);
    const bytes = readFileSync(original.bundledImage);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(original.sha256);
    if (index > 0) expect(match.rating).toBeLessThanOrEqual(matches[index - 1].rating);
  }
  expect(matches[0].id).toBe('omega-okada-dominion-2018');
  expect(matches[3].id).toBe('omega-okada-dominion-2017');
  expect(matches[6].id).toBe('omega-okada-wk11-2017');
  expect(matches[7].id).toBe('omega-okada-g1-2017');
  expect(matches[49].shortNames).toHaveLength(3);
});
