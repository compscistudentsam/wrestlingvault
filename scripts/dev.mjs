import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildElectron } from './build-electron.mjs';

await buildElectron();
const server = await createServer();
await server.listen();
server.printUrls();
const electron = createRequire(import.meta.url)('electron');
// Linux uses Chromium's user-namespace sandbox instead of a root-owned SUID helper.
// This keeps Chromium sandboxing enabled and leaves Windows' sandbox defaults intact.
const child = spawn(
  electron,
  ['.', ...(process.platform === 'linux' ? ['--disable-setuid-sandbox'] : [])],
  {
    stdio: 'inherit',
    env: { ...process.env, WV_DEV_SERVER_URL: 'http://127.0.0.1:5173/' },
  },
);
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child.kill();
  await server.close();
  process.exit(code);
}
child.on('error', (error) => {
  console.error(error);
  void stop(1);
});
child.on('exit', (code) => void stop(code ?? 1));
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
