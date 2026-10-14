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
export const promotionFamily = (match: Match) =>
  match.promotion === 'WWF' ? 'WWE' : match.promotion;

export interface Filters {
  query: string;
  promotion: string;
  era: string;
  rating: string;
  sort: string;
}
export const defaultFilters: Filters = {
  query: '',
  promotion: 'all',
  era: 'all',
  rating: 'all',
  sort: 'rating',
};
const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function filterMatches(records: readonly Match[], filters: Filters): Match[] {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean);
  return records
    .filter((match) => {
      const haystack = normalize(
        [
          match.title,
          ...match.wrestlers,
          match.event,
          match.promotion,
          promotionFamily(match),
          match.date.slice(0, 4),
        ].join(' '),
      );
      return (
        words.every((word) => haystack.includes(word)) &&
        (filters.promotion === 'all' ||
          promotionFamily(match).split(' / ').includes(filters.promotion)) &&
        (filters.era === 'all' ||
          (filters.era === 'before-2000'
            ? yearOf(match) < 2000
            : Math.floor(yearOf(match) / 10) * 10 === Number(filters.era))) &&
        (filters.rating === 'all' || match.rating >= Number(filters.rating))
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'newest') return b.date.localeCompare(a.date);
      if (filters.sort === 'oldest') return a.date.localeCompare(b.date);
      if (filters.sort === 'title')
        return a.title.localeCompare(b.title) || a.date.localeCompare(b.date);
      return b.rating - a.rating || b.date.localeCompare(a.date);
    });
}

export function getCollections(records: readonly Match[]) {
  const ordered = filterMatches(records, defaultFilters);
  return [
    {
      id: 'greatest',
      title: 'Greatness, without a ceiling.',
      subtitle: 'The highest-rated encounters in this sample collection.',
      label: 'THE ESSENTIALS',
      records: ordered,
      filter: {},
    },
    {
      id: 'wwe',
      title: 'Larger than life.',
      subtitle: 'Unforgettable chapters from WWF and WWE.',
      label: 'UNDER THE BRIGHTEST LIGHTS',
      records: ordered.filter((m) => promotionFamily(m) === 'WWE'),
      filter: { promotion: 'WWE' },
    },
    {
      id: 'origins',
      title: 'Before the modern era.',
      subtitle: 'The foundations of an enduring art form.',
      label: 'FROM THE ARCHIVE',
      records: ordered.filter((m) => yearOf(m) < 2000),
      filter: { era: 'before-2000' },
    },
    {
      id: 'six-stars',
      title: 'Six stars. And then some.',
      subtitle: 'For the nights that broke the scale.',
      label: 'BEYOND EXTRAORDINARY',
      records: ordered.filter((m) => m.rating >= 6),
      filter: { rating: '6' },
    },
    {
      id: 'japan',
      title: 'The fighting spirit of Japan.',
      subtitle: 'Tokyo Dome nights. Osaka epics. A different kind of greatness.',
      label: 'NEW JAPAN PRO WRESTLING',
      records: ordered.filter((m) => m.promotion.includes('NJPW')),
      filter: { promotion: 'NJPW' },
    },
  ].filter((collection) => collection.records.length > 0);
}
