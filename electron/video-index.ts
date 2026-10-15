import { readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { matches, type Match } from '../src/data/catalogue';
import { inside, videoExtensions } from './videos';
export type IndexedVideo = { name: string; path: string };
export type VideoIndex = Map<string, IndexedVideo[]>;
const normalized = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
function score(label: string, match: Match) {
  const text = ` ${normalized(label)} `;
  const compact = text.replaceAll(' ', '');
  if (compact.includes(normalized(match.id).replaceAll(' ', ''))) return 10000;
  const sideGroups = match.shortNames.map((side) =>
    normalized(side)
      .split(' ')
      .filter((word) => !['jr'].includes(word)),
  );
  if (!sideGroups.every((words) => words.every((word) => text.includes(` ${word} `)))) return 0;
  const date = match.date;
  const dateMatch = compact.includes(date.replaceAll('-', ''));
  const years: string[] = text.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  if (years.length && !years.includes(date.slice(0, 4))) return 0;
  const eventWords = normalized(match.event)
    .split(' ')
    .filter((word) => !['in', 'the', 'of', 'night', 'final', 'hall', 'jo'].includes(word));
  const eventClue = eventWords.some((word) => /[a-z]/.test(word) && text.includes(` ${word} `));
  const eventHits = eventWords.filter((word) => text.includes(` ${word} `)).length;
  const eventKey = normalized(match.event.replace(/ in .*/i, '').replace(/ night.*/i, ''));
  const completeEvent = eventKey.length > 6 && compact.includes(eventKey.replaceAll(' ', ''));
  // Repeated opponents require a complete event name or a year plus event clues.
  const repeated =
    matches.filter(
      (other) => [...other.shortNames].sort().join('|') === [...match.shortNames].sort().join('|'),
    ).length > 1;
  if (!dateMatch && repeated && !completeEvent && (!years.length || !eventClue)) return 0;
  return (
    20 +
    (dateMatch ? 500 : 0) +
    (completeEvent ? 150 : 0) +
    (years.length ? 100 : 0) +
    eventHits * 10
  );
}
export async function scanVideoFolder(root: string): Promise<VideoIndex> {
  const index: VideoIndex = new Map(matches.map((match) => [match.id, []]));
  const walk = async (directory: string, depth: number) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory() && depth < 8) {
        try {
          await walk(candidate, depth + 1);
        } catch (error) {
          if (!['EACCES', 'EPERM', 'ENOENT'].includes((error as NodeJS.ErrnoException).code ?? ''))
            throw error;
        }
        continue;
      }
      if (!entry.isFile() || !videoExtensions.has(path.extname(entry.name).toLowerCase())) continue;
      const resolved = await realpath(candidate).catch(() => null);
      if (!resolved || !inside(root, resolved)) continue;
      const relative = path.relative(root, candidate);
      const label = relative.slice(0, -path.extname(relative).length);
      // Preserve explicit legacy folder matching before fuzzy filename identification.
      const parent = path.basename(path.dirname(candidate));
      const legacy = matches.filter(
        (match) =>
          match.id.toLowerCase() === parent.toLowerCase() ||
          match.videoFolderAliases.some((alias) => alias.toLowerCase() === parent.toLowerCase()),
      );
      let winner: Match | undefined;
      if (legacy.length === 1) winner = legacy[0];
      else {
        const ranked = matches
          .map((match) => ({ match, score: score(label, match) }))
          .sort((a, b) => b.score - a.score);
        if (ranked[0].score > 0 && ranked[0].score > ranked[1].score) winner = ranked[0].match;
      }
      if (winner) index.get(winner.id)!.push({ name: entry.name, path: resolved });
    }
  };
  await walk(root, 0);
  for (const files of index.values())
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return index;
}
