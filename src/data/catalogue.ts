import records from './matches.json';

export type Match = (typeof records)[number];
export const matches: readonly Match[] = records;
export const getSource = (match: Match) => ({
  name: 'CAGEMATCH · supplied snapshot',
  url: match.sourceUrl,
});
export const formatRating = (rating: number | null) =>
  rating === null ? 'Unrated' : Number.isInteger(rating) ? rating.toFixed(1) : String(rating);
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
export const yearOf = (match: Match) => Number(match.date.slice(0, 4));
