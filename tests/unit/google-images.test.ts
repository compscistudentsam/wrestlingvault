import { describe, it, expect } from 'vitest';
import {
  googleImageCandidates,
  googleImageSearch,
  publicImageURL,
} from '../../electron/google-images';
import { publicAddress } from '../../electron/image-download';

describe('Google image discovery', () => {
  it('builds poster searches from event/year and uses participants for graphic/photo fallback', () => {
    expect(
      new URL(googleImageSearch(['A', 'B'], 'Event', '2025-01-01')).searchParams.get('q'),
    ).toBe('Event 2025 wrestling event poster');
    expect(
      new URL(googleImageSearch(['A', 'B'], 'Event', '2025-01-01', 'graphic')).searchParams.get(
        'q',
      ),
    ).toBe('A B Event 2025 match graphic');
    expect(
      new URL(googleImageSearch(['A', 'B'], 'Event', '2025-01-01', 'photo')).searchParams.get('q'),
    ).toBe('A B Event 2025 match photo');
  });
  it('reads original result links and rendered image data, excluding thumbnails and unsafe sources', () => {
    const html = `<a href="/imgres?imgurl=https%3A%2F%2Fart.example.com%2Fposter.jpg">Poster</a>
      <script>data = [["https://art.example.com/graphic.jpg",800,600],["https://encrypted-tbn0.gstatic.com/a",400,400],["https://art.example.com/tiny.jpg",50,40],["http://localhost/private",800,800]];</script>`;
    expect(googleImageCandidates(html)).toEqual([
      'https://art.example.com/poster.jpg',
      'https://art.example.com/graphic.jpg',
    ]);
  });
  it('blocks local destinations, credentials and insecure downloads', () => {
    for (const value of [
      'http://example.com/a',
      'https://127.0.0.1/a',
      'https://[::1]/a',
      'https://user:password@example.com/a',
      'https://server.local/a',
      'https://localhost/a',
    ])
      expect(publicImageURL(value)).toBeNull();
    for (const address of [
      '127.0.0.1',
      '10.1.1.1',
      '192.168.1.1',
      '169.254.169.254',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
    ])
      expect(publicAddress(address)).toBe(false);
    expect(publicAddress('8.8.8.8')).toBe(true);
    expect(publicAddress('2606:4700:4700::1111')).toBe(true);
  });
});
