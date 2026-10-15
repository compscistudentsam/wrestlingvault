import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scanVideoFolder } from '../../electron/video-index';
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
it('matches flat filenames using event/year clues, ignores ambiguous rematches and keeps parts ordered', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-flat-')));
  temporary.push(root);
  for (const name of [
    'Okada Omega Dominion 2018 part2.mp4',
    'Okada Omega Dominion 2018 part10.mp4',
    'Okada Omega WrestleKingdom11 2017.webm',
    'Okada Omega.mp4',
    'Okada Omega 2017.mp4',
    'Ospreay Takagi 2021 part2.mp4',
    'notes.txt',
    'Ospreay Omega WrestleKingdom17.mp4',
    'Will Ospreay Bryan Danielson Dynasty 2024.mp4',
  ])
    await writeFile(path.join(root, name), 'test');
  await symlink(
    path.join(root, 'Okada Omega Dominion 2018 part2.mp4'),
    path.join(root, 'omega-okada-dominion-2017.mp4'),
  );
  const index = await scanVideoFolder(root);
  expect(index.get('omega-okada-dominion-2018')?.map((file) => file.name)).toEqual([
    'Okada Omega Dominion 2018 part2.mp4',
    'Okada Omega Dominion 2018 part10.mp4',
  ]);
  expect(index.get('omega-okada-wk11-2017')).toHaveLength(1);
  expect(index.get('omega-okada-dominion-2017')).toHaveLength(0);
  expect(index.get('omega-okada-g1-2017')).toHaveLength(0);
  expect(index.get('danielson-ospreay-dynasty-2024')).toHaveLength(1);
  expect([...index.values()].flat()).toHaveLength(5);
  expect(
    [...index.values()].flat().some((file) => file.name === 'Ospreay Omega WrestleKingdom17.mp4'),
  ).toBe(true);
});
it('supports exact IDs, nested existing folders and refuses symbolic-link directories outside the root', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-flat-')));
  temporary.push(root);
  const outside = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-outside-')));
  temporary.push(outside);
  await writeFile(path.join(root, 'omega-okada-dominion-2018.mp4'), 'test');
  await mkdir(path.join(root, 'danielson-ospreay-dynasty-2024'));
  await writeFile(path.join(root, 'danielson-ospreay-dynasty-2024', 'match.mp4'), 'test');
  await writeFile(path.join(outside, 'omega-okada-wk11-2017.mp4'), 'test');
  await symlink(outside, path.join(root, 'outside'));
  const index = await scanVideoFolder(root);
  expect(index.get('omega-okada-dominion-2018')).toHaveLength(1);
  expect(index.get('danielson-ospreay-dynasty-2024')).toHaveLength(1);
  expect(index.get('omega-okada-wk11-2017')).toHaveLength(0);
});

it('matches the new library participant names while keeping prior shared-match identifiers', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-library-')));
  temporary.push(root);
  await writeFile(
    path.join(root, 'Cash Wheeler Dax Harwood vs Jay Briscoe Mark Briscoe Final Battle 2022.mp4'),
    'test',
  );
  await writeFile(
    path.join(root, 'Kenta Kobashi vs Mitsuharu Misawa Navigate For Evolution 2003.mp4'),
    'test',
  );
  const index = await scanVideoFolder(root);
  expect(index.get('ftr-briscoes-final-battle-2022-12-10')).toHaveLength(1);
  expect(index.get('cagematch-2510')).toHaveLength(1);
});
