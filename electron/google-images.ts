import { load } from 'cheerio';
import { isIP } from 'node:net';

/** Reject local services before any remote page can supply a download address. */
export function publicImageURL(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes('.') ||
      host.endsWith('.local') ||
      host.endsWith('.localhost') ||
      host.endsWith('.internal') ||
      host.endsWith('.test') ||
      isIP(host) ||
      host.includes(':')
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function googleImageSearch(
  wrestlers: string[],
  event: string,
  date: string,
  kind: 'poster' | 'graphic' | 'photo' = 'poster',
) {
  const query =
    kind === 'poster'
      ? [event, date.slice(0, 4), 'wrestling event poster'].join(' ')
      : [
          ...wrestlers,
          event,
          date.slice(0, 4),
          kind === 'graphic' ? 'match graphic' : 'match photo',
        ].join(' ');
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('tbm', 'isch');
  url.searchParams.set('q', query);
  return url.href;
}
export function googleImageCandidates(html: string) {
  const $ = load(html);
  const images: string[] = [];
  const add = (value: string | undefined) => {
    if (!value || /logo|favicon|avatar|encrypted-tbn|gstatic\.com/i.test(value)) return;
    const url = publicImageURL(value);
    if (url && !images.includes(url)) images.push(url);
  };
  $('a[href]').each((_, el) => {
    try {
      const url = new URL($(el).attr('href')!, 'https://www.google.com');
      add(url.searchParams.get('imgurl') ?? undefined);
    } catch {
      /* Ignore invalid result links. */
    }
  });
  // Google's rendered result data contains original URL/width/height tuples.
  $('script').each((_, el) => {
    const script = $(el).html() ?? '';
    for (const match of script.matchAll(
      /\[\s*("https?:(?:\\.|[^"\\\n])*")\s*,\s*(\d+)\s*,\s*(\d+)/g,
    )) {
      if (Number(match[2]) < 300 || Number(match[3]) < 300) continue;
      try {
        add(JSON.parse(match[1]) as string);
      } catch {
        /* Ignore invalid JSON strings. */
      }
    }
  });
  return images.slice(0, 8);
}
