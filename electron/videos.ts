import { readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { matches } from '../src/data/catalogue';

export const videoExtensions = new Set(['.mp4', '.m4v', '.webm', '.mkv', '.mov']);
export function inside(root: string, file: string) {
  const relative = path.relative(root, file);
  return (
    relative !== '' &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== '..' &&
    !path.isAbsolute(relative)
  );
}
export function folderName(match: (typeof matches)[number]) {
  return `${match.title} - ${match.event} - ${match.date}`
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[. ]+$/, '');
}
export async function findVideos(root: string, id: unknown) {
  const match = matches.find((item) => item.id === id);
  if (!match) throw new Error('Unknown match.');
  const entries = await readdir(root, { withFileTypes: true });
  // IDs are unambiguous, including repeated opponents at different events.
  const names = [
    match.id,
    folderName(match),
    `${match.title} - ${match.event}`,
    ...match.videoFolderAliases,
    match.title,
  ];
  const folder = names
    .map((name) =>
      entries.find(
        (entry) => entry.isDirectory() && name.toLowerCase() === entry.name.toLowerCase(),
      ),
    )
    .find(Boolean);
  if (!folder) return [];
  const directory = await realpath(path.join(root, folder.name));
  if (!inside(root, directory)) return [];
  const files = await readdir(directory, { withFileTypes: true });
  const result: { name: string; path: string }[] = [];
  for (const file of files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )) {
    if (!file.isFile() || !videoExtensions.has(path.extname(file.name).toLowerCase())) continue;
    const resolved = await realpath(path.join(directory, file.name));
    if (inside(root, resolved)) result.push({ name: file.name, path: resolved });
  }
  return result;
}
