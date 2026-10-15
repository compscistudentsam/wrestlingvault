import { afterEach, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { videoResponse } from '../../electron/video-response';
const temporary: string[] = [];
const bytes = Buffer.from(Array.from({ length: 1024 }, (_, i) => i % 251));
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vault-range-'));
  temporary.push(root);
  const file = path.join(root, 'match.mp4');
  await writeFile(file, bytes);
  return file;
}
const request = (range?: string, method = 'GET') =>
  new Request('vault-video://local/test', { method, headers: range ? { Range: range } : {} });
it('streams the full authorized file with an accurate MIME type and content length', async () => {
  const response = await videoResponse(await fixture(), request());
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('video/mp4');
  expect(response.headers.get('accept-ranges')).toBe('bytes');
  expect(response.headers.get('content-length')).toBe('1024');
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
});
it.each([
  ['bytes=100-199', 100, 199],
  ['bytes=900-', 900, 1023],
  ['bytes=-32', 992, 1023],
  ['bytes=1000-9999', 1000, 1023],
])('serves precise seekable ranges for %s', async (range, start, end) => {
  const response = await videoResponse(await fixture(), request(range));
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe(`bytes ${start}-${end}/1024`);
  expect(response.headers.get('content-length')).toBe(String(end - start + 1));
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes.subarray(start, end + 1));
});
it.each(['bytes=1024-', 'bytes=200-100', 'bytes=-0', 'bytes=0-1,5-8', 'bytes=-', 'invalid'])(
  'rejects unsatisfiable or invalid range %s',
  async (range) => {
    const response = await videoResponse(await fixture(), request(range));
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */1024');
    expect(await response.text()).toBe('');
  },
);
it('answers metadata requests without streaming and rejects writes', async () => {
  const file = await fixture();
  const head = await videoResponse(file, request(undefined, 'HEAD'));
  expect(head.status).toBe(200);
  expect(head.headers.get('content-length')).toBe('1024');
  expect(await head.text()).toBe('');
  expect((await videoResponse(file, request(undefined, 'POST'))).status).toBe(405);
});
