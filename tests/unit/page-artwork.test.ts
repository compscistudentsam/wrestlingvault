import { describe, expect, it } from 'vitest';
import { pageArtwork } from '../../electron/page-artwork';

describe('page artwork discovery', () => {
  const source = 'https://www.cagematch.net/?id=111&nr=6651';
  it('finds approved artwork and the linked event while skipping icons and external addresses', () => {
    const result = pageArtwork(
      `<meta property="og:image" content="/posters/match.jpg">
      <div class="Content"><img src="/flags/uk.png"><img src="https://other.example/photo.jpg">
      <img data-src="/posters/event.webp"><img src="/posters/match.jpg"></div>
      <div class="InformationBoxRow"><div class="InformationBoxTitle">Event:</div>
      <a href="?id=1&amp;nr=123">Event card</a></div>`,
      source,
    );
    expect(result.images).toEqual([
      'https://www.cagematch.net/posters/match.jpg',
      'https://www.cagematch.net/posters/event.webp',
    ]);
    expect(result.eventUrl).toBe('https://www.cagematch.net/?id=1&nr=123');
  });
  it('does not follow unrelated links or insecure artwork URLs', () => {
    expect(
      pageArtwork(
        '<meta property="og:image" content="http://www.cagematch.net/a.jpg"><a href="?id=1&nr=5">Unrelated</a>',
        source,
      ),
    ).toEqual({ images: [], eventUrl: null });
  });
});
