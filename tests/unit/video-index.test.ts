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

it('recognises distinctive nicknames, alternate ring names, teams and event abbreviations', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-nicknames-')));
  temporary.push(root);
  const examples = [
    ['Rainmaker vs The Cleaner WK11 2017.mp4', 'omega-okada-wk11-2017'],
    ['American Dragon vs Aerial Assassin Dynasty 2024.mp4', 'danielson-ospreay-dynasty-2024'],
    ['Daniel Bryan vs ZSJ WrestleDream 2023.mp4', 'danielson-sabre-jr-wrestledream-2023-10-01'],
    ['FTR vs Briscoe Brothers Final Battle 2022.mp4', 'ftr-briscoes-final-battle-2022-12-10'],
    ['Young Bucks vs Lucha Bros All Out 2021.mp4', 'young-bucks-lucha-brothers-all-out-2021-09-05'],
    ['HBK vs Deadman WM25 2009.mp4', 'cagematch-3546'],
    ['Gunther vs Ilja Dragunov TakeOver 36 2021.mp4', 'cagematch-39292'],
  ];
  for (const [name] of examples) await writeFile(path.join(root, name), 'test');
  const index = await scanVideoFolder(root);
  for (const [name, id] of examples)
    expect(index.get(id)?.map((file) => file.name)).toContain(name);
  expect([...index.values()].flat()).toHaveLength(examples.length);
});

it('does not guess ambiguous nicknames or rematches without sufficient event clues', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'vault-ambiguous-aliases-')));
  temporary.push(root);
  for (const name of [
    'Rainmaker vs Cleaner.mp4',
    'Rainmaker Cleaner 2017.mp4',
    'Dragon vs Ospreay Dynasty 2024.mp4',
    'HBK Deadman.mp4',
    'Rainmaker Cleaner WK11 2018.mp4',
  ])
    await writeFile(path.join(root, name), 'test');
  expect([...(await scanVideoFolder(root)).values()].flat()).toHaveLength(0);
});
