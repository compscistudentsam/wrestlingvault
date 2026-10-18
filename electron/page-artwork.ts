import { load } from 'cheerio';
import { isCagematchAddress } from './cagematch-request';

export function pageArtwork(html: string, source: string) {
  const $ = load(html);
  const images: string[] = [];
  const add = (value?: string) => {
    if (!value || /logo|icon|flag|avatar|advert/i.test(value)) return;
    try {
      const url = new URL(value, source).href;
      if (isCagematchAddress(url) && !images.includes(url)) images.push(url);
    } catch {
      /* Ignore malformed page URLs. */
    }
  };
  $('meta[property="og:image"]').each((_, el) => add($(el).attr('content')));
  $('.InformationBox img, .ImageBox img, .Image img, .Content img').each((_, el) => {
    const image = $(el);
    if (/logo|icon|flag|avatar|banner|advert/i.test(image.attr('src') ?? '')) return;
    add(image.attr('data-src') ?? image.attr('src'));
  });
  const event = $('.InformationBoxRow')
    .filter(
      (_, el) => $(el).find('.InformationBoxTitle').text().trim().replace(':', '') === 'Event',
    )
    .find('a')
    .first()
    .attr('href');
  let eventUrl: string | null = null;
  try {
    const url = new URL(event ?? '', source);
    if (event && isCagematchAddress(url.href) && url.searchParams.get('id') === '1')
      eventUrl = url.href;
  } catch {
    /* No linked event. */
  }
  return { images: images.slice(0, 12), eventUrl };
}
