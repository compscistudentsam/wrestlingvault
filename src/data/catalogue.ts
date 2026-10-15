import records from './matches.json';

export type Match = (typeof records)[number];
export const matches: readonly Match[] = records;
export const sources = {
  iwnerd: {
    name: 'IWNerd · Dave Meltzer five-star match list',
    url: 'https://www.iwnerd.com/dave-meltzer-5-star-matches-list/',
  },
  wrestlepurists: {
    name: 'WrestlePurists · Dave Meltzer match ratings database',
    url: 'https://wrestlepurists.com/dave-meltzer-match-ratings-database/',
  },
} as const;
export const getSource = (match: Match) => sources[match.sourceId as keyof typeof sources];
export const formatRating = (rating: number) =>
  Number.isInteger(rating) ? rating.toFixed(1) : String(rating);
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
export const yearOf = (match: Match) => Number(match.date.slice(0, 4));
