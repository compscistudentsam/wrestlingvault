import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { findVideos, inside } from '../../electron/videos';
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
it('finds ordered video parts only in the selected match directory and excludes escaping symlinks', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-video-')));
  temporary.push(root);
  const id = 'omega-okada-dominion-2018';
  await mkdir(path.join(root, id));
  await writeFile(path.join(root, id, 'part10.mp4'), 'test');
  await writeFile(path.join(root, id, 'part2.webm'), 'test');
  await writeFile(path.join(root, id, 'notes.txt'), 'test');
  await symlink(path.join(root, id, 'part10.mp4'), path.join(root, id, 'link.mp4'));
  expect((await findVideos(root, id)).map((file) => file.name)).toEqual([
    'part2.webm',
    'part10.mp4',
  ]);
  expect(await findVideos(root, 'omega-okada-wk11-2017')).toEqual([]);
  await expect(findVideos(root, '../../etc')).rejects.toThrow('Unknown match');
});
it('does not consider sibling directories or the root itself inside the selected folder', () => {
  expect(inside('/videos', '/videos-other/secret.mp4')).toBe(false);
  expect(inside('/videos', '/videos')).toBe(false);
  expect(inside('/videos', '/videos/match/video.mp4')).toBe(true);
});

it('keeps previous video folder names working and prefers an exact match ID over a title alias', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-video-')));
  temporary.push(root);
  const legacy = 'Bryan Danielson vs. Will Ospreay';
  const id = 'danielson-ospreay-dynasty-2024';
  await mkdir(path.join(root, legacy));
  await writeFile(path.join(root, legacy, 'legacy.mp4'), 'test');
  expect((await findVideos(root, id)).map((file) => file.name)).toEqual(['legacy.mp4']);
  await mkdir(path.join(root, id));
  await writeFile(path.join(root, id, 'correct.mp4'), 'test');
  expect((await findVideos(root, id)).map((file) => file.name)).toEqual(['correct.mp4']);
});
