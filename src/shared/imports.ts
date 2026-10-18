import { normalizePromotion } from './promotions';
import type { Match } from '../data/catalogue';

export const repository = {
  owner: 'compscistudentsam',
  name: 'wrestlingvault',
  branch: 'feature/phase-1-ui',
};
export type MatchDraft = {
  sourceUrl: string;
  wrestlers: string[];
  event: string;
  promotion: string;
  date: string;
  rating: number | null;
  cagematchScore: number | null;
  matchDuration: string | null;
};
export type LibraryStatus = {
  connected: boolean;
  pending: number;
  syncing: boolean;
  error: string;
  lastSyncedAt: string | null;
};
export type LibrarySnapshot = { records: Match[]; status: LibraryStatus };
export type ChosenArtwork = {
  token: string;
  preview: string;
  name: string;
  width: number;
  height: number;
};

export function cagematchURL(value: unknown) {
  if (typeof value !== 'string' || value.length > 500)
    throw new Error('Paste a CAGEMATCH match link.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Paste a valid CAGEMATCH match link.');
  }
  const nr = url.searchParams.get('nr');
  if (
    url.protocol !== 'https:' ||
    !['www.cagematch.net', 'cagematch.net'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.searchParams.get('id') !== '111' ||
    !nr ||
    !/^[1-9]\d{0,8}$/.test(nr)
  ) {
    throw new Error(
      'Use a CAGEMATCH match link (id=111&nr=…), rather than an event or wrestler page.',
    );
  }
  return `https://www.cagematch.net/?id=111&nr=${nr}`;
}
function text(value: unknown, name: string, max = 200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > max ||
    /[\x00-\x1f]/.test(value)
  )
    throw new Error(`Enter a valid ${name}.`);
  return value.trim();
}
function optionalNumber(value: unknown, max: number, name: string) {
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max)
    throw new Error(`Enter a valid ${name}.`);
  return value;
}
export function validateDraft(value: unknown): MatchDraft {
  if (!value || typeof value !== 'object') throw new Error('Invalid match details.');
  const d = value as Record<string, unknown>;
  if (!Array.isArray(d.wrestlers) || d.wrestlers.length < 2 || d.wrestlers.length > 8)
    throw new Error('Enter between two and eight opponents or teams.');
  const wrestlers = d.wrestlers.map((v) => text(v, 'wrestler or team', 150));
  if (new Set(wrestlers.map((v) => v.toLowerCase())).size !== wrestlers.length)
    throw new Error('Each opponent or team must be different.');
  const date = text(d.date, 'date', 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error('Enter a real date in YYYY-MM-DD format.');
  const rating = optionalNumber(d.rating, 10, 'WON star rating');
  if (rating !== null && rating * 4 !== Math.round(rating * 4))
    throw new Error('WON stars use quarter-star increments.');
  let matchDuration: string | null = null;
  if (d.matchDuration !== null && d.matchDuration !== '') {
    matchDuration = text(d.matchDuration, 'match length', 8);
    if (!/^\d{1,3}:[0-5]\d$/.test(matchDuration))
      throw new Error('Use minutes:seconds for match length.');
  }
  return {
    sourceUrl: cagematchURL(d.sourceUrl),
    wrestlers,
    event: text(d.event, 'event'),
    promotion: normalizePromotion(text(d.promotion, 'company', 100)),
    date,
    rating,
    cagematchScore: optionalNumber(d.cagematchScore, 10, 'CAGEMATCH score'),
    matchDuration,
  };
}
