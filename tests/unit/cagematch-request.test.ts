import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  requestCagematch,
  isCagematchAddress,
  cagematchConnectionError,
} from '../../electron/cagematch-request';
import { lookupCagematch, readCagematchPage } from '../../electron/cagematch';
const url = 'https://www.cagematch.net/?id=111&nr=6651';
const html = readFileSync('tests/fixtures/cagematch/6651.html', 'utf8');
it('follows only bounded CAGEMATCH HTTPS redirects and returns parsed fixture fields', async () => {
  const request = vi.fn(async (input: RequestInfo | URL) => {
    const address = String(input);
    if (address.endsWith('/robots.txt'))
      return new Response(null, { status: 301, headers: { location: '/robots-current.txt' } });
    if (address.endsWith('/robots-current.txt'))
      return new Response('User-agent: *\nCrawl-delay: 527');
    if (address === url)
      return new Response(null, { status: 302, headers: { location: '/?id=111&nr=6651&page=2' } });
    return new Response(html);
  }) as typeof fetch;
  const found = await lookupCagematch(url, request);
  expect(found.draft).toMatchObject({
    wrestlers: ['Johnny Mundo', 'Prince Puma'],
    date: '2015-04-11',
    promotion: 'Lucha Underground',
    event: 'Lucha Underground #1.32 - All Night Long',
    cagematchScore: 9.31,
  });
  expect(found.draft.rating).toBeUndefined();
  expect(vi.mocked(request).mock.calls).toHaveLength(4);
  for (const [, options] of vi.mocked(request).mock.calls) expect(options?.redirect).toBe('manual');
});
it('rejects off-site redirects, credentials, HTTPS downgrades and redirect loops', async () => {
  for (const location of [
    'https://evil.example/',
    'http://www.cagematch.net/',
    'https://user:secret@www.cagematch.net/',
  ]) {
    const request = vi.fn(
      async () => new Response(null, { status: 302, headers: { location } }),
    ) as typeof fetch;
    await expect(requestCagematch(url, {}, request)).rejects.toThrow('approved HTTPS');
    expect(request).toHaveBeenCalledTimes(1);
  }
  const loop = vi.fn(
    async () => new Response(null, { status: 302, headers: { location: url } }),
  ) as typeof fetch;
  await expect(requestCagematch(url, {}, loop)).rejects.toThrow('repeated redirect');
  expect(loop).toHaveBeenCalledTimes(4);
  expect(isCagematchAddress('https://www.cagematch.net.attacker.example/')).toBe(false);
});
it('keeps diagnostic codes while hiding arbitrary network messages and secrets', () => {
  expect(
    cagematchConnectionError({ message: 'fetch failed', cause: { code: 'ENOTFOUND' } }),
  ).toContain('ENOTFOUND');
  expect(cagematchConnectionError(new Error('net::ERR_PROXY_CONNECTION_FAILED'))).toContain(
    'ERR_PROXY_CONNECTION_FAILED',
  );
  expect(cagematchConnectionError({ cause: { code: 'CERT_HAS_EXPIRED' } })).toContain(
    'secure connection',
  );
  expect(
    cagematchConnectionError(new Error('Authorization: secret https://user:password@proxy')),
  ).not.toMatch(/secret|password/);
});
it('does not misclassify a readable match as a challenge because of comment wording', () => {
  expect(readCagematchPage(html, url).event).toBe('Lucha Underground #1.32 - All Night Long');
});

it('recognises an access-check error response but does not bypass HTTP rate limits', async () => {
  for (const status of [403, 503, 429]) {
    const request = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/robots.txt')
        ? new Response('User-agent: *\nCrawl-delay: 527')
        : new Response(
            '<body>Javascript is required. Please enable javascript before you are allowed to see this page.</body>',
            { status },
          ),
    ) as typeof fetch;
    await expect(lookupCagematch(url, request)).rejects.toThrow(
      status === 429 ? 'HTTP 429' : 'browser access check',
    );
  }
});
