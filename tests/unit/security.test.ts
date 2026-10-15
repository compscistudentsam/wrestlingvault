import { describe, expect, it } from 'vitest';
import { isTrustedRendererURL, validateExternalURL } from '../../src/shared/security';

describe('external URL boundary', () => {
  it('accepts only HTTPS references on exact approved hosts', () => {
    expect(
      validateExternalURL('https://www.iwnerd.com/dave-meltzer-5-star-matches-list/'),
    ).toContain('iwnerd.com');
    expect(
      validateExternalURL('https://wrestlepurists.com/dave-meltzer-match-ratings-database/'),
    ).toContain('wrestlepurists.com');
  });
  it('allows the supplied collection rating reference', () => {
    expect(
      validateExternalURL(
        'https://en.wikipedia.org/wiki/List_of_professional_wrestling_matches_rated_5_or_more_stars_by_Dave_Meltzer',
      ),
    ).toContain('en.wikipedia.org');
  });
  it.each([
    undefined,
    {},
    17,
    'javascript:alert(1)',
    'file:///etc/passwd',
    'http://www.iwnerd.com/',
    'https://iwnerd.com.attacker.example/',
    'https://user:password@iwnerd.com/',
    'https://iwnerd.com:444/',
    'https://example.com',
    'https://en.wikipedia.org.attacker.example/',
    'data:text/html,<script>alert(1)</script>',
    'https://iwnerd.com/' + 'a'.repeat(2048),
  ])('rejects invalid or unexpected input %#', (value) => {
    expect(() => validateExternalURL(value)).toThrow();
  });
});

describe('trusted renderer boundary', () => {
  it('allows local hash navigation without allowing other files or query payloads', () => {
    const trusted = 'file:///C:/app/dist/index.html';
    expect(isTrustedRendererURL(`${trusted}#/match/test`, trusted)).toBe(true);
    expect(isTrustedRendererURL('file:///C:/app/dist/other.html', trusted)).toBe(false);
    expect(isTrustedRendererURL(`${trusted}?other=true`, trusted)).toBe(false);
  });
  it('rejects development-server lookalikes, frames on other paths, and remote origins', () => {
    const trusted = 'http://127.0.0.1:5173/';
    expect(isTrustedRendererURL(`${trusted}#/discover`, trusted)).toBe(true);
    expect(isTrustedRendererURL('http://127.0.0.1:5173/evil', trusted)).toBe(false);
    expect(isTrustedRendererURL('https://127.0.0.1:5173/', trusted)).toBe(false);
    expect(isTrustedRendererURL('http://localhost:5173/', trusted)).toBe(false);
    expect(isTrustedRendererURL('not a URL', trusted)).toBe(false);
  });
});
