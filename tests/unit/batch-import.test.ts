import { expect, it, vi } from 'vitest';
import { CagematchRateLimitError } from '../../electron/cagematch-request';
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
it('starts each subsequent lookup as soon as the previous entry is saved, without a timer', async () => {
  const order: string[] = [];
  const { importer } = setup({
    lookup: async (source) => {
      order.push(`lookup ${source}`);
      return details;
    },
    save: async (draft) => {
      order.push(`save ${draft.sourceUrl}`);
    },
  });
  importer.start(`${url(1)}\n${url(2)}`);
  await importer.settled();
  expect(order).toEqual([
    `lookup ${url(1)}`,
    `save ${url(1)}`,
    `lookup ${url(2)}`,
    `save ${url(2)}`,
  ]);
});
it('stops on an actual CAGEMATCH rate-limit response instead of repeatedly requesting more pages', async () => {
  const lookup = vi.fn(async () => {
    throw new CagematchRateLimitError('HTTP 429');
  });
  const { importer, save } = setup({ lookup });
  importer.start(`${url(1)}\n${url(2)}`);
  const result = await importer.settled();
  expect(result.items.map((item) => item.status)).toEqual(['failed', 'cancelled']);
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
});
it('never silently saves incomplete metadata', async () => {
  const { importer, save } = setup({ lookup: async () => ({ event: 'Incomplete' }) });
  importer.start(url(1));
  expect((await importer.settled()).items[0].status).toBe('failed');
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
