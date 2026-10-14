import { build } from 'esbuild';
export async function buildElectron() {
  await build({
    entryPoints: ['electron/main.ts', 'electron/preload.ts'],
    outdir: 'dist-electron',
    outExtension: { '.js': '.cjs' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    target: 'node22',
    sourcemap: true,
  });
}
if (process.argv[1]?.endsWith('build-electron.mjs')) await buildElectron();
