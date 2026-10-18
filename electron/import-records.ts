import { matches as bundled, type Match } from '../src/data/catalogue';
import { cagematchURL, validateDraft, type MatchDraft } from '../src/shared/imports';

export const customImage = /^custom\/(cagematch-user-[1-9]\d{0,8})\.(png|jpg|webp)$/;
export function recordFromDraft(
  draft: MatchDraft,
  width: number,
  height: number,
  extension: string,
  hash: string,
  rank: number,
): Match {
  const d = validateDraft(draft);
  const id = `cagematch-user-${new URL(d.sourceUrl).searchParams.get('nr')}`;
  if (
    !['png', 'jpg', 'webp'].includes(extension) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 20000 ||
    height > 20000 ||
    !/^[a-f0-9]{64}$/.test(hash)
  )
    throw new Error('Invalid artwork. Choose a PNG, JPEG or WebP image.');
  const shortNames = d.wrestlers.map((side) =>
    side
      .split(/\s*&\s*/)
      .map((name) => name.split(/\s+/).at(-1)!)
      .join(' / ')
      .toUpperCase(),
  );
  return {
    ...bundled[0],
    ...d,
    id,
    rank,
    title: d.wrestlers.join(' vs. '),
    image: `custom/${id}.${extension}`,
    imageWidth: width,
    imageHeight: height,
    artworkHash: hash,
    imageType: 'User-supplied artwork',
    shortNames,
    videoNameGroups: [shortNames],
    videoFolderAliases: [],
    sourceStatus: 'user-reviewed',
    accent: 'amber',
    description: '',
    matchType: d.wrestlers.length === 2 ? 'Singles / tag' : 'Multi-way',
    championship: null,
    stipulation: null,
    venue: null,
    matchDuration: d.matchDuration,
    durationSource: null,
  };
}
export function parseManifest(value: unknown): Match[] {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { version?: unknown }).version !== 1 ||
    !Array.isArray((value as { records?: unknown }).records)
  )
    throw new Error('Unrecognised library format.');
  const entries = (value as { records: unknown[] }).records;
  if (entries.length > 500) throw new Error('The custom library exceeds 500 matches.');
  const result: Match[] = [];
  const urls = new Set(bundled.map((m) => cagematchURL(m.sourceUrl)));
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid library record.');
    const m = raw as Match;
    const image = typeof m.image === 'string' ? m.image.match(customImage) : null;
    if (!image) throw new Error('Invalid library artwork path.');
    const record = recordFromDraft(
      m,
      m.imageWidth,
      m.imageHeight,
      image[2],
      m.artworkHash ?? '',
      bundled.length + result.length + 1,
    );
    if (m.id !== record.id || image[1] !== record.id || urls.has(record.sourceUrl))
      throw new Error('Duplicate or invalid CAGEMATCH record.');
    urls.add(record.sourceUrl);
    result.push(record);
  }
  return result;
}
export function mergeRecords(remote: Match[], pending: Match[]) {
  const records = [...remote];
  for (const m of pending) {
    const existing = records.find((other) => other.sourceUrl === m.sourceUrl);
    if (
      existing &&
      (existing.artworkHash !== m.artworkHash ||
        JSON.stringify(validateDraft(existing)) !== JSON.stringify(validateDraft(m)))
    )
      throw new Error(
        `This match was also added on GitHub: ${m.title}. Your local copy is kept; resolve the duplicate in the repository before retrying.`,
      );
    if (!existing) records.push(m);
  }
  return parseManifest({ version: 1, records });
}
