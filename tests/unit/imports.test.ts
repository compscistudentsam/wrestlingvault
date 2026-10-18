import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PersonalLibrary } from '../../electron/personal-library';
import { recordFromDraft, parseManifest } from '../../electron/import-records';
import { parseCagematch, crawlPolicy, lookupCagematch } from '../../electron/cagematch';
import { cagematchURL, validateDraft, type MatchDraft } from '../../src/shared/imports';
import { matches } from '../../src/data/catalogue';
import { scanVideoFolder } from '../../electron/video-index';
import { readLimited } from '../../electron/library-http';
const draft: MatchDraft = {
  sourceUrl: 'https://www.cagematch.net/?id=111&nr=99999999',
  wrestlers: ['Test Wrestler', 'Other Wrestler'],
  event: 'Test Event',
  promotion: 'Test Company',
  date: '2025-04-27',
  rating: null,
  cagematchScore: null,
  matchDuration: '25:10',
};
const bytes = Buffer.from('test artwork');
const digest = createHash('sha256').update(bytes).digest('hex');
const record = () => recordFromDraft(draft, 480, 679, 'jpg', digest, 101);
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  vi.restoreAllMocks();
});
async function create(request: typeof fetch, existingToken: string | null = null, root?: string) {
  root ??= await mkdtemp(path.join(tmpdir(), 'vault-import-'));
  if (!dirs.includes(root)) dirs.push(root);
  let token = existingToken;
  const store = new PersonalLibrary({
    root,
    request,
    inspectImage: () => ({ width: 480, height: 679, extension: 'jpg' }),
    getToken: async () => token,
    setToken: async (value) => {
      token = value;
    },
    clearToken: async () => {
      token = null;
    },
  });
  await store.init();
  return { store, root };
}
const offline = vi.fn(async () => {
  throw new Error('offline');
}) as typeof fetch;
function server(initial: ReturnType<typeof record>[] = [], conflict = false) {
  let remote = initial;
  let treeEntries: any[] = [];
  let patches = 0;
  const sha = 'a'.repeat(40);
  const request = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    const endpoint = String(url).replace(
      'https://api.github.com/repos/compscistudentsam/wrestlingvault',
      '',
    );
    const data = options?.body ? JSON.parse(String(options.body)) : undefined;
    let result: unknown;
    if (endpoint === '') result = { permissions: { push: true } };
    else if (endpoint.startsWith('/git/ref/heads/')) result = { object: { sha } };
    else if (endpoint.startsWith('/contents/library/matches.json'))
      result = {
        encoding: 'base64',
        content: Buffer.from(JSON.stringify({ version: 1, records: remote })).toString('base64'),
        size: 100,
      };
    else if (endpoint.startsWith('/contents/library/art/'))
      result = { encoding: 'base64', content: bytes.toString('base64'), size: bytes.length };
    else if (endpoint.startsWith('/git/commits/') && options?.method === 'GET')
      result = { tree: { sha } };
    else if (endpoint === '/git/blobs') result = { sha };
    else if (endpoint === '/git/trees') {
      treeEntries = data.tree;
      result = { sha };
    } else if (endpoint === '/git/commits') result = { sha };
    else if (endpoint.startsWith('/git/refs/heads/')) {
      patches++;
      expect(data.force).toBe(false);
      if (conflict && patches === 1) return new Response('{}', { status: 422 });
      remote = JSON.parse(
        treeEntries.find((e: any) => e.path === 'library/matches.json').content,
      ).records;
      result = {};
    } else throw new Error(`Unexpected endpoint ${endpoint}`);
    return Response.json(result);
  }) as typeof fetch;
  return { request, remote: () => remote, tree: () => treeEntries, patches: () => patches };
}
it('canonicalises match links and rejects event pages, attacker hosts and invalid fields', () => {
  expect(cagematchURL('https://cagematch.net/?id=111&nr=123&page=2')).toBe(
    'https://www.cagematch.net/?id=111&nr=123',
  );
  for (const url of [
    'http://www.cagematch.net/?id=111&nr=1',
    'https://www.cagematch.net.evil/?id=111&nr=1',
    'https://www.cagematch.net/?id=1&nr=123',
    'https://user@www.cagematch.net/?id=111&nr=123',
    'file:///tmp/test',
  ])
    expect(() => cagematchURL(url)).toThrow();
  expect(() => validateDraft({ ...draft, date: '2025-02-30' })).toThrow();
  expect(() => validateDraft({ ...draft, rating: 4.3 })).toThrow();
  expect(() => validateDraft({ ...draft, wrestlers: ['Same', 'Same'] })).toThrow();
  expect(() => validateDraft({ ...draft, matchDuration: '12:99' })).toThrow();
  expect(validateDraft(draft).rating).toBeNull();
});
it('parses labelled CAGEMATCH fields without confusing user scores and WON stars or executing HTML', () => {
  const html =
    `<title>A Wrestler vs. B Wrestler « Matches « CAGEMATCH</title><script>throw Error('not executed')</script>` +
    [
      ['Date', '27.04.2025'],
      ['Event', 'Grand Event'],
      ['Promotion', 'NJPW'],
      ['Rating', '9.75'],
      ['Time', '25:10'],
    ]
      .map(
        ([k, v]) =>
          `<div class="InformationBoxRow"><div class="InformationBoxTitle">${k}:</div><div class="InformationBoxContents">${v}</div></div>`,
      )
      .join('');
  const found = parseCagematch(html, draft.sourceUrl);
  expect(found).toMatchObject({
    wrestlers: ['A Wrestler', 'B Wrestler'],
    date: '2025-04-27',
    event: 'Grand Event',
    promotion: 'NJPW',
    cagematchScore: 9.75,
    matchDuration: '25:10',
  });
  expect(found.rating).toBeUndefined();
});
it('honours crawler restrictions and never follows arbitrary match URLs', async () => {
  expect(crawlPolicy('User-agent: *\nCrawl-delay: 600\nDisallow: /forbidden')).toEqual({
    delay: 600,
    disallow: ['/forbidden'],
  });
  const get = vi.fn(async () => new Response('User-agent: *\nDisallow: /')) as typeof fetch;
  await expect(lookupCagematch(draft.sourceUrl, get)).rejects.toThrow('does not allow');
  expect(get).toHaveBeenCalledTimes(1);
  await expect(lookupCagematch('https://evil.example', get)).rejects.toThrow();
  expect(get).toHaveBeenCalledTimes(1);
});
it('preserves queued matches across offline sync and application restart, without storing credentials in the manifest', async () => {
  const { store, root } = await create(offline);
  await store.add(draft, bytes);
  await store.sync();
  expect(store.snapshot().status).toMatchObject({ pending: 1, connected: false });
  expect(store.snapshot().status.error).toContain('saved locally');
  const restarted = await create(offline, null, root);
  expect(restarted.store.snapshot().records[0].id).toBe(record().id);
  expect(restarted.store.snapshot().status.pending).toBe(1);
  const saved = await readFile(path.join(root, 'state.json'), 'utf8');
  expect(saved).not.toMatch(/Authorization|github_pat|access_token/);
  await expect(store.add(draft, bytes)).rejects.toThrow('already');
});
it('creates one atomic repository commit, preserves the base tree, and retries a competing branch update', async () => {
  const api = server([], true);
  const token = 'github_pat_not_a_real_test_credential';
  const { store } = await create(api.request, token);
  await store.add(draft, bytes);
  await store.sync();
  expect(api.patches()).toBe(2);
  expect(store.snapshot().status.pending).toBe(0);
  expect(api.remote()).toHaveLength(1);
  expect(api.tree().map((e) => e.path)).toEqual([
    `library/art/${record().id}.jpg`,
    'library/matches.json',
  ]);
  for (const [url, opts] of vi.mocked(api.request).mock.calls) {
    expect(String(url)).toMatch(
      /^https:\/\/api.github.com\/repos\/compscistudentsam\/wrestlingvault/,
    );
    expect(opts?.redirect).toBe('error');
    expect(JSON.stringify(opts?.body ?? '')).not.toContain(token);
  }
  const treeCall = vi
    .mocked(api.request)
    .mock.calls.find(([url]) => String(url).endsWith('/git/trees'))!;
  expect(JSON.parse(String(treeCall[1]?.body)).base_tree).toBe('a'.repeat(40));
});
it('downloads a verified addition for a second laptop and supports local video matching', async () => {
  const api = server([record()]);
  const { store, root } = await create(api.request);
  await store.sync();
  expect(store.snapshot().records).toHaveLength(1);
  expect(store.snapshot().status.error).toBe('');
  expect(await readFile(path.join(root, 'art', `${record().id}.jpg`))).toEqual(bytes);
  await writeFile(path.join(root, `${record().id}.mp4`), 'video');
  const index = await scanVideoFolder(root, store.allMatches());
  expect(index.get(record().id)).toHaveLength(1);
});
it('retains a queued addition on authentication failure or conflicting remote details', async () => {
  const api = server([{ ...record(), event: 'Changed on another computer' }]);
  const { store } = await create(api.request, 'token');
  await store.add(draft, bytes);
  await store.sync();
  expect(store.snapshot().status.pending).toBe(1);
  expect(store.snapshot().records[0].event).toBe(draft.event);
  expect(store.snapshot().status.error).toContain('also added');
  const denied = await create(
    vi.fn(async () => new Response('{}', { status: 401 })) as typeof fetch,
    'expired',
  );
  await denied.store.add(draft, bytes);
  await denied.store.sync();
  expect(denied.store.snapshot().status.pending).toBe(1);
  expect(denied.store.snapshot().status.error).toContain('Reconnect');
});
it('rejects tampered manifests, duplicate bundled matches, oversized responses and corrupted saved state', async () => {
  expect(() =>
    parseManifest({ version: 1, records: [{ ...record(), image: '../../secret' }] }),
  ).toThrow();
  expect(() => parseManifest({ version: 1, records: [record(), record()] })).toThrow();
  expect(() =>
    parseManifest({ version: 1, records: [{ ...record(), sourceUrl: matches[0].sourceUrl }] }),
  ).toThrow();
  await expect(readLimited(new Response('too big'), 3)).rejects.toThrow('too large');
  const { root } = await create(offline);
  await writeFile(path.join(root, 'state.json'), 'broken');
  await expect(create(offline, null, root)).rejects.toThrow('existing files have been kept');
  expect(await readFile(path.join(root, 'state.json'), 'utf8')).toBe('broken');
});
it('requires writable repository access before saving a GitHub credential', async () => {
  const api = vi.fn(async () => Response.json({ permissions: { push: false } })) as typeof fetch;
  const { store } = await create(api);
  await expect(store.connect('github_pat_example_not_real')).rejects.toThrow('Contents');
  expect(store.snapshot().status.connected).toBe(false);
});

it('uses Git blob downloads for artwork larger than the Contents API inline limit', async () => {
  const api = server([record()]);
  const request = vi.fn(async (url: RequestInfo | URL, opts?: RequestInit) => {
    if (String(url).includes('/contents/library/art/'))
      return Response.json({ encoding: 'none', sha: 'b'.repeat(40), size: 2_000_000 });
    if (String(url).includes('/git/blobs/'))
      return Response.json({
        encoding: 'base64',
        content: bytes.toString('base64'),
        size: bytes.length,
      });
    return api.request(url, opts);
  }) as typeof fetch;
  const { store } = await create(request);
  await store.sync();
  expect(store.snapshot().status.error).toBe('');
  expect(store.snapshot().records).toHaveLength(1);
  expect(vi.mocked(request).mock.calls.some(([url]) => String(url).includes('/git/blobs/'))).toBe(
    true,
  );
});

it('keeps the cached catalogue when downloaded artwork fails its checksum', async () => {
  const api = server([record()]);
  const request = vi.fn(async (url: RequestInfo | URL, opts?: RequestInit) =>
    String(url).includes('/contents/library/art/')
      ? Response.json({
          encoding: 'base64',
          content: Buffer.from('tampered').toString('base64'),
          size: 8,
        })
      : api.request(url, opts),
  ) as typeof fetch;
  const { store } = await create(request);
  await store.sync();
  expect(store.snapshot().records).toHaveLength(0);
  expect(store.snapshot().status.error).toContain('verification failed');
});

it('does not erase cached matches when the remote manifest is missing or inaccessible', async () => {
  const api = server([record()]);
  let missing = false;
  const request = vi.fn(async (url: RequestInfo | URL, opts?: RequestInit) =>
    missing && String(url).includes('/contents/library/matches.json')
      ? new Response('{}', { status: 404 })
      : api.request(url, opts),
  ) as typeof fetch;
  const { store } = await create(request);
  await store.sync();
  expect(store.snapshot().records).toHaveLength(1);
  missing = true;
  await store.sync();
  expect(store.snapshot().records).toHaveLength(1);
  expect(store.snapshot().status.error).toContain('not found');
});

it('identifies a CAGEMATCH browser access check instead of returning empty metadata', async () => {
  const request = vi.fn(async (url: RequestInfo | URL) =>
    String(url).endsWith('/robots.txt')
      ? new Response('User-agent: *\nCrawl-delay: 527')
      : new Response(
          '<html><body>Javascript is required. Please enable javascript before you are allowed to see this page.</body></html>',
        ),
  ) as typeof fetch;
  await expect(lookupCagematch(draft.sourceUrl, request)).rejects.toThrow('browser access check');
});
