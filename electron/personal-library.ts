import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { matches as bundled, type Match } from '../src/data/catalogue';
import {
  repository,
  cagematchURL,
  validateDraft,
  type LibrarySnapshot,
  type MatchDraft,
} from '../src/shared/imports';
import { recordFromDraft, parseManifest, mergeRecords } from './import-records';
import { lookupCagematch, CagematchBrowserRequired } from './cagematch';
import { readLimited, GitHubError } from './library-http';

const manifestPath = 'library/matches.json';
const repoPath = `/repos/${repository.owner}/${repository.name}`;
const branchPath = repository.branch.split('/').map(encodeURIComponent).join('/');
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
type State = {
  version: 1;
  records: Match[];
  pending: string[];
  lastSyncedAt: string | null;
  nextLookup: number;
};
type Dependencies = {
  root: string;
  request?: typeof fetch;
  lookupRequest?: typeof fetch;
  browserLookup?: (url: string) => Promise<Partial<MatchDraft>>;
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  inspectImage: (bytes: Buffer) => { width: number; height: number; extension: string };
};
export class PersonalLibrary {
  private state: State = {
    version: 1,
    records: [],
    pending: [],
    lastSyncedAt: null,
    nextLookup: 0,
  };
  private token: string | null = null;
  private error = '';
  private syncing = false;
  private work: Promise<unknown> = Promise.resolve();
  private syncWork: Promise<LibrarySnapshot> | null = null;
  constructor(private dependencies: Dependencies) {}
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.work.then(operation);
    this.work = result.catch(() => {});
    return result;
  }
  async init() {
    await mkdir(path.join(this.dependencies.root, 'art'), { recursive: true });
    try {
      const raw = JSON.parse(
        await readFile(path.join(this.dependencies.root, 'state.json'), 'utf8'),
      );
      const records = parseManifest(raw);
      if (
        !Array.isArray(raw.pending) ||
        raw.pending.some(
          (id: unknown) => typeof id !== 'string' || !records.some((m) => m.id === id),
        )
      )
        throw new Error('Invalid upload queue.');
      this.state = {
        version: 1,
        records,
        pending: [...new Set<string>(raw.pending)],
        lastSyncedAt: typeof raw.lastSyncedAt === 'string' ? raw.lastSyncedAt : null,
        nextLookup:
          typeof raw.nextLookup === 'number' && Number.isFinite(raw.nextLookup)
            ? raw.nextLookup
            : 0,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error(
          'Could not read your saved library. The existing files have been kept; restore state.json from a backup before adding matches.',
        );
    }
    try {
      this.token = await this.dependencies.getToken();
    } catch {
      this.error = 'Reconnect GitHub: the saved credential could not be unlocked on this computer.';
    }
  }
  snapshot(): LibrarySnapshot {
    return {
      records: structuredClone(this.state.records),
      status: {
        connected: Boolean(this.token),
        pending: this.state.pending.length,
        syncing: this.syncing,
        error: this.error,
        lastSyncedAt: this.state.lastSyncedAt,
      },
    };
  }
  allMatches() {
    return [...bundled, ...this.state.records];
  }
  imageFile(name: string) {
    return this.state.records.some((m) => m.image === `custom/${name}`)
      ? path.join(this.dependencies.root, 'art', name)
      : null;
  }
  private async save() {
    const destination = path.join(this.dependencies.root, 'state.json');
    await writeFile(`${destination}.tmp`, JSON.stringify(this.state, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(`${destination}.tmp`, destination);
  }
  async add(input: unknown, bytes: Buffer) {
    const draft = validateDraft(input);
    return this.serial(async () => {
      if (this.allMatches().some((m) => cagematchURL(m.sourceUrl) === draft.sourceUrl))
        throw new Error('This CAGEMATCH match is already in your library.');
      if (this.state.records.length >= 500)
        throw new Error('Your custom library has reached 500 matches.');
      const image = this.dependencies.inspectImage(bytes);
      const record = recordFromDraft(
        draft,
        image.width,
        image.height,
        image.extension,
        hash(bytes),
        this.allMatches().length + 1,
      );
      await writeFile(
        path.join(this.dependencies.root, 'art', path.basename(record.image)),
        bytes,
        { mode: 0o600 },
      );
      const previous = structuredClone(this.state);
      this.state.records.push(record);
      this.state.pending.push(record.id);
      try {
        await this.save();
      } catch (error) {
        this.state = previous;
        throw error;
      }
      return this.snapshot();
    });
  }
  async lookupInBrowser(source: unknown) {
    const url = cagematchURL(source);
    if (this.allMatches().some((m) => cagematchURL(m.sourceUrl) === url))
      throw new Error('This match is already in your library.');
    if (!this.dependencies.browserLookup)
      throw new Error('In-app browser lookup is available in the desktop app.');
    // Explicit human browsing is separate from the rate-limited background crawler.
    return this.serial(() => this.dependencies.browserLookup!(url));
  }
  async lookup(source: unknown) {
    const url = cagematchURL(source);
    if (this.allMatches().some((m) => cagematchURL(m.sourceUrl) === url))
      throw new Error('This match is already in your library.');
    return this.serial(async () => {
      if (Date.now() < this.state.nextLookup)
        throw new Error(
          'CAGEMATCH lookups are rate-limited. Enter the details manually, or try again in a few minutes.',
        );
      this.state.nextLookup = Date.now() + 527_000;
      await this.save();
      try {
        const result = await lookupCagematch(
          url,
          this.dependencies.lookupRequest ?? this.dependencies.request,
        );
        this.state.nextLookup = Date.now() + result.delay * 1000;
        await this.save();
        return result.draft;
      } catch (error) {
        if (error instanceof CagematchBrowserRequired && this.dependencies.browserLookup)
          return this.dependencies.browserLookup(url);
        throw new Error(
          error instanceof Error
            ? error.message
            : 'CAGEMATCH lookup failed. Open the page in your browser and paste its text, or enter the details manually.',
        );
      }
    });
  }
  private async github(
    endpoint: string,
    method = 'GET',
    data?: unknown,
    token = this.token,
  ): Promise<any> {
    let response: Response;
    try {
      response = await (this.dependencies.request ?? fetch)(
        `https://api.github.com${repoPath}${endpoint}`,
        {
          method,
          redirect: 'error',
          signal: AbortSignal.timeout(20000),
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'WrestlingVault',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(data ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(data ? { body: JSON.stringify(data) } : {}),
        },
      );
    } catch {
      throw new Error(
        'GitHub could not be reached. Your matches are saved locally; retry when you are online.',
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new GitHubError(response.status);
    }
    return JSON.parse((await readLimited(response, 16_000_000)).toString('utf8'));
  }
  async connect(value: unknown) {
    if (typeof value !== 'string' || value.length < 20 || value.length > 300 || /\s/.test(value))
      throw new Error('Paste a valid GitHub fine-grained access token.');
    return this.serial(async () => {
      const repo = await this.github('', 'GET', undefined, value);
      if (repo.permissions?.push !== true)
        throw new Error(
          'This token needs access to this repository with Contents: Read and write.',
        );
      await this.github(`/git/ref/heads/${branchPath}`, 'GET', undefined, value);
      await this.dependencies.setToken(value);
      this.token = value;
      this.error = '';
      return this.snapshot();
    });
  }
  async disconnect() {
    return this.serial(async () => {
      await this.dependencies.clearToken();
      this.token = null;
      this.error = '';
      return this.snapshot();
    });
  }
  private async remote(head: string) {
    const result = await this.github(`/contents/${manifestPath}?ref=${encodeURIComponent(head)}`);
    if (result.encoding !== 'base64' || typeof result.content !== 'string' || result.size > 900_000)
      throw new Error('Invalid remote library.');
    return parseManifest(JSON.parse(Buffer.from(result.content, 'base64').toString('utf8')));
  }
  private async cacheImages(records: Match[]) {
    for (const record of records) {
      const file = path.join(this.dependencies.root, 'art', path.basename(record.image));
      try {
        if (hash(await readFile(file)) === record.artworkHash) continue;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      let result = await this.github(
        `/contents/library/art/${encodeURIComponent(path.basename(record.image))}?ref=${encodeURIComponent(this.headForImages)}`,
      );
      // GitHub's Contents endpoint omits base64 data for images over 1 MB.
      if (
        result.encoding === 'none' &&
        typeof result.sha === 'string' &&
        /^[a-f0-9]{40}$/.test(result.sha) &&
        result.size <= 8_388_608
      ) {
        result = await this.github(`/git/blobs/${result.sha}`);
      }
      if (
        result.encoding !== 'base64' ||
        typeof result.content !== 'string' ||
        result.size > 8_388_608
      )
        throw new Error('Remote artwork is invalid or too large.');
      const bytes = Buffer.from(result.content, 'base64');
      const image = this.dependencies.inspectImage(bytes);
      if (
        hash(bytes) !== record.artworkHash ||
        image.width !== record.imageWidth ||
        image.height !== record.imageHeight ||
        !record.image.endsWith(`.${image.extension}`)
      )
        throw new Error('Artwork verification failed; the cached library has been kept.');
      await writeFile(`${file}.tmp`, bytes, { mode: 0o600 });
      await rename(`${file}.tmp`, file);
    }
  }
  private headForImages = '';
  sync(): Promise<LibrarySnapshot> {
    if (this.syncWork) return this.syncWork;
    this.syncing = true;
    this.syncWork = this.serial(async () => {
      try {
        this.error = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          const ref = await this.github(`/git/ref/heads/${branchPath}`);
          const head = ref.object?.sha;
          if (typeof head !== 'string' || !/^[a-f0-9]{40}$/.test(head))
            throw new Error('Invalid repository head.');
          const remote = await this.remote(head);
          this.headForImages = head;
          await this.cacheImages(remote);
          const pending = this.state.records.filter((m) => this.state.pending.includes(m.id));
          const merged = mergeRecords(remote, pending);
          if (pending.length && this.token) {
            try {
              const commit = await this.github(`/git/commits/${head}`);
              const tree: {
                path: string;
                mode: string;
                type: string;
                sha?: string;
                content?: string;
              }[] = [];
              for (const record of pending.filter(
                (m) => !remote.some((r) => r.sourceUrl === m.sourceUrl),
              )) {
                const bytes = await readFile(
                  path.join(this.dependencies.root, 'art', path.basename(record.image)),
                );
                if (hash(bytes) !== record.artworkHash)
                  throw new Error(
                    'Local artwork changed. Restore the saved image before retrying.',
                  );
                const blob = await this.github('/git/blobs', 'POST', {
                  encoding: 'base64',
                  content: bytes.toString('base64'),
                });
                tree.push({
                  path: `library/art/${path.basename(record.image)}`,
                  mode: '100644',
                  type: 'blob',
                  sha: blob.sha,
                });
              }
              const content = JSON.stringify({ version: 1, records: merged }, null, 2) + '\n';
              if (Buffer.byteLength(content) > 900_000)
                throw new Error('The repository library is too large to sync.');
              tree.push({ path: manifestPath, mode: '100644', type: 'blob', content });
              const nextTree = await this.github('/git/trees', 'POST', {
                base_tree: commit.tree.sha,
                tree,
              });
              const nextCommit = await this.github('/git/commits', 'POST', {
                message: `Add ${pending.length} match${pending.length === 1 ? '' : 'es'} to Wrestling Vault`,
                tree: nextTree.sha,
                parents: [head],
              });
              await this.github(`/git/refs/heads/${branchPath}`, 'PATCH', {
                sha: nextCommit.sha,
                force: false,
              });
            } catch (error) {
              if (error instanceof GitHubError && [409, 422].includes(error.status) && attempt < 2)
                continue;
              throw error;
            }
          }
          const previous = structuredClone(this.state);
          this.state.records = merged;
          if (this.token) this.state.pending = [];
          this.state.lastSyncedAt = new Date().toISOString();
          try {
            await this.save();
          } catch (error) {
            this.state = previous;
            throw error;
          }
          break;
        }
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : 'Library sync failed. Your local additions have been kept.';
      } finally {
        this.syncing = false;
      }
      return this.snapshot();
    }).finally(() => {
      this.syncWork = null;
    });
    return this.syncWork;
  }
}
