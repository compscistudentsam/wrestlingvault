import { cagematchURL, validateDraft, type MatchDraft } from '../src/shared/imports';
import type { BatchState } from '../src/shared/batch-import';
import { CagematchRateLimitError } from './cagematch-request';
import { userError } from '../src/shared/errors';

type Dependencies = {
  exists: (url: string) => boolean;
  lookup: (url: string) => Promise<Partial<MatchDraft>>;
  artwork: (draft: MatchDraft) => Promise<Buffer | null>;
  save: (draft: MatchDraft, image: Buffer) => Promise<unknown>;
  sync: () => void;
};
export class BatchImporter {
  private state: BatchState = { running: false, stopping: false, items: [] };
  private work: Promise<void> = Promise.resolve();
  constructor(private dependencies: Dependencies) {}
  snapshot(): BatchState {
    return structuredClone(this.state);
  }
  start(input: unknown) {
    if (this.state.running) throw new Error('A batch import is already running.');
    if (typeof input !== 'string' || input.length > 25000)
      throw new Error('Paste up to 50 CAGEMATCH match links.');
    const values = input.trim().split(/\s+/).filter(Boolean);
    if (!values.length || values.length > 50)
      throw new Error('Paste between 1 and 50 match links, one per line.');
    const seen = new Set<string>();
    const items: BatchState['items'] = values.map((value) => {
      try {
        const url = cagematchURL(value);
        if (seen.has(url))
          return { url, status: 'skipped', message: 'Duplicate link in this batch.' };
        seen.add(url);
        return { url, status: 'queued' };
      } catch (error) {
        return { url: value.slice(0, 500), status: 'failed', message: userError(error) };
      }
    });
    this.state = { running: true, stopping: false, items };
    this.work = this.run();
    return this.snapshot();
  }
  stop() {
    this.state.stopping = this.state.running;
    return this.snapshot();
  }
  async settled() {
    await this.work;
    return this.snapshot();
  }
  private async run() {
    try {
      for (const item of this.state.items) {
        if (item.status !== 'queued') continue;
        if (this.state.stopping) break;
        if (this.dependencies.exists(item.url)) {
          item.status = 'skipped';
          item.message = 'Already in your vault.';
          continue;
        }
        item.status = 'importing';
        try {
          const found = await this.dependencies.lookup(item.url);
          const draft = validateDraft({
            ...found,
            sourceUrl: item.url,
            rating: found.rating ?? null,
            cagematchScore: found.cagematchScore ?? null,
            matchDuration: found.matchDuration ?? null,
          });
          item.title = draft.wrestlers.join(' vs. ');
          const artwork = await this.dependencies.artwork(draft);
          if (!artwork) throw new Error('No suitable artwork found. This entry was not added.');
          await this.dependencies.save(draft, artwork);
          item.status = 'imported';
          this.dependencies.sync();
        } catch (error) {
          item.status = 'failed';
          item.message = userError(error);
          if (error instanceof CagematchRateLimitError) this.state.stopping = true;
        }
      }
    } catch (error) {
      for (const item of this.state.items)
        if (item.status === 'queued' || item.status === 'importing') {
          item.status = 'failed';
          item.message = userError(error);
        }
    } finally {
      for (const item of this.state.items) if (item.status === 'queued') item.status = 'cancelled';
      this.state.running = false;
    }
  }
}
