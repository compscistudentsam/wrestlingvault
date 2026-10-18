import { load } from 'cheerio';
import { cagematchURL, type MatchDraft } from '../src/shared/imports';
import { readLimited } from './library-http';

export function parseCagematch(html: string, sourceUrl: string): Partial<MatchDraft> {
  const $ = load(html);
  const rows = new Map<string, string>();
  $('.InformationBoxRow').each((_, el) => {
    const key = $(el).find('.InformationBoxTitle').text().trim().replace(/:$/, '').toLowerCase();
    const value = $(el).find('.InformationBoxContents').text().replace(/\s+/g, ' ').trim();
    if (key && value) rows.set(key, value);
  });
  const result: Partial<MatchDraft> = { sourceUrl: cagematchURL(sourceUrl) };
  const heading = ($('h1.TextHeader').first().text() || $('title').text().split('«')[0]).trim();
  const title = rows.get('match') || heading;
  if (/\s+vs\.?\s+/i.test(title)) {
    const names = title.split(/\s+vs\.?\s+/i).map((v) => v.trim());
    if (names.length >= 2 && names.length <= 8 && names.every((v) => v.length <= 150))
      result.wrestlers = names;
  }
  const date = rows.get('date')?.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (date) result.date = `${date[3]}-${date[2]}-${date[1]}`;
  if (rows.has('event')) result.event = rows.get('event');
  if (rows.has('promotion')) result.promotion = rows.get('promotion');
  const duration = (rows.get('time') || rows.get('match length') || '').match(/^\d{1,3}:[0-5]\d$/);
  if (duration) result.matchDuration = duration[0];
  const won = rows.get('wrestling observer rating') || rows.get('won rating');
  if (won && /^\d+(?:\.\d+)?$/.test(won) && Number(won) <= 10) result.rating = Number(won);
  // Never treat the site's user rating as WON stars.
  const score = rows.get('rating');
  if (score && /^\d+(?:\.\d+)?$/.test(score) && Number(score) <= 10)
    result.cagematchScore = Number(score);
  return result;
}
export function crawlPolicy(robots: string) {
  let applies = false;
  let inRules = false;
  let delay = 527;
  const disallow: string[] = [];
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    const at = line.indexOf(':');
    if (at < 0) continue;
    const key = line.slice(0, at).trim().toLowerCase(),
      value = line.slice(at + 1).trim();
    if (key === 'user-agent') {
      if (inRules) {
        applies = false;
        inRules = false;
      }
      applies ||= value === '*' || value.toLowerCase() === 'wrestlingvault';
    } else {
      inRules = true;
      if (!applies) continue;
      if (key === 'disallow' && value) disallow.push(value);
      if (key === 'crawl-delay' && /^\d+(\.\d+)?$/.test(value))
        delay = Math.max(delay, Number(value));
    }
  }
  return { delay, disallow };
}
export async function lookupCagematch(source: string, get: typeof fetch = fetch) {
  const sourceUrl = cagematchURL(source);
  const options = {
    redirect: 'error' as const,
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'WrestlingVault/0.1 (personal match lookup)' },
  };
  const robots = await get('https://www.cagematch.net/robots.txt', options);
  if (!robots.ok)
    throw new Error('CAGEMATCH lookup is unavailable. Please enter the details manually.');
  const policy = crawlPolicy((await readLimited(robots, 100_000)).toString('utf8'));
  const target = new URL(sourceUrl);
  if (
    policy.disallow.some((rule) => {
      const pattern = rule
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return new RegExp(`^${pattern.replace(/\\\$$/, '$')}`).test(target.pathname + target.search);
    })
  )
    throw new Error(
      'CAGEMATCH does not allow automated lookup here. Enter the match details manually.',
    );
  const response = await get(sourceUrl, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok)
    throw new Error('CAGEMATCH could not be read. You can still enter the match details manually.');
  const bytes = await readLimited(response, 2_000_000);
  const charset = response.headers.get('content-type')?.includes('iso-8859-1')
    ? 'windows-1252'
    : 'utf-8';
  return {
    draft: parseCagematch(new TextDecoder(charset).decode(bytes), sourceUrl),
    delay: policy.delay,
  };
}
