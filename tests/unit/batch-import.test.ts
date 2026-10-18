import { expect, it, vi } from 'vitest';
import { BatchImporter } from '../../electron/batch-import';
import type { MatchDraft } from '../../src/shared/imports';
const url = (id: number) => `https://www.cagematch.net/?id=111&nr=${id}`;
const details = {
  wrestlers: ['A Wrestler', 'B Wrestler'],
  event: 'Test Event',
  promotion: 'All Elite Wrestling',
  date: '2025-01-01',
};
function setup(overrides: Partial<ConstructorParameters<typeof BatchImporter>[0]> = {}) {
  const save = vi.fn(async (_draft: MatchDraft, _bytes: Buffer) => {});
  const lookup = vi.fn(async () => details);
  const artwork = vi.fn(async () => Buffer.from('image'));
  const sync = vi.fn();
  const importer = new BatchImporter({
    exists: () => false,
    lookup,
    artwork,
    save,
    sync,
    cooldown: () => 0,
    ...overrides,
  });
  return { importer, save, lookup, artwork, sync };
}
it('automatically saves valid matches, skips duplicate/existing links and continues past individual failures', async () => {
  const { importer, save, lookup, sync } = setup({
    exists: (source) => source === url(4),
    artwork: async (draft) => (draft.sourceUrl === url(2) ? null : Buffer.from('image')),
  });
  importer.start(
    [url(1), url(2), url(3), url(1), url(4), 'https://www.cagematch.net/?id=1&nr=5'].join('\n'),
  );
  const result = await importer.settled();
  expect(result.items.map((item) => item.status)).toEqual([
    'imported',
    'failed',
    'imported',
    'skipped',
    'skipped',
    'failed',
  ]);
  expect(result.running).toBe(false);
  expect(lookup).toHaveBeenCalledTimes(3);
  expect(save).toHaveBeenCalledTimes(2);
  expect(sync).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[0][0]).toMatchObject({
    promotion: 'AEW',
    sourceUrl: url(1),
    rating: null,
    cagematchScore: null,
    matchDuration: null,
  });
  expect(result.items[1].message).toContain('No suitable artwork');
});
it('finishes the current match on stop, cancels the remainder, and prevents concurrent batches', async () => {
  let release!: (value: typeof details) => void;
  const { importer, save } = setup({
    lookup: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  importer.start(`${url(1)}\n${url(2)}`);
  expect(importer.snapshot().items[0].status).toBe('importing');
  expect(() => importer.start(url(3))).toThrow('already running');
  importer.stop();
  release(details);
  const result = await importer.settled();
  expect(result.items.map((item) => item.status)).toEqual(['imported', 'cancelled']);
  expect(save).toHaveBeenCalledTimes(1);
});
it('shows the site cooldown and can cancel while waiting without issuing a request', async () => {
  let release!: () => void;
  const nextAt = Date.now() + 527000;
  const { importer, lookup } = setup({
    cooldown: () => nextAt,
    wait: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  importer.start(url(1));
  expect(importer.snapshot().nextAt).toBe(nextAt);
  expect(lookup).not.toHaveBeenCalled();
  importer.stop();
  release();
  expect((await importer.settled()).items[0].status).toBe('cancelled');
});
it('waits out a cooldown before importing and never silently saves incomplete metadata', async () => {
  let cooldown = Date.now() + 10000;
  const wait = vi.fn(async () => {
    cooldown = 0;
  });
  const { importer, save } = setup({
    cooldown: () => cooldown,
    wait,
    lookup: async () => ({ event: 'Incomplete' }),
  });
  importer.start(url(1));
  const result = await importer.settled();
  expect(wait).toHaveBeenCalledTimes(1);
  expect(result.items[0].status).toBe('failed');
  expect(save).not.toHaveBeenCalled();
});
it('bounds batch input and sanitizes invocation errors in per-entry results', async () => {
  const { importer } = setup({
    lookup: async () => {
      throw new Error(
        "Error invoking remote method 'vault:lookup-match': Error: Failed fixture lookup",
      );
    },
  });
  expect(() => importer.start('')).toThrow('between 1 and 50');
  expect(() =>
    importer.start(Array.from({ length: 51 }, (_, index) => url(index + 1)).join('\n')),
  ).toThrow('between 1 and 50');
  importer.start(url(1));
  expect((await importer.settled()).items[0].message).toBe('Failed fixture lookup');
});
