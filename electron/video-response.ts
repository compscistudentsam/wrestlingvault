import { open } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

/** Serve only a main-process-authorized file. Explicit byte ranges make local seeking reliable. */
export async function videoResponse(file: string, request: Request): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const handle = await open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) {
      await handle.close();
      return new Response(null, { status: 404 });
    }
    const size = stat.size;
    const types: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
    };
    const headers = new Headers({
      'Content-Type': types[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    });
    let start = 0;
    let end = size - 1;
    const range = request.headers.get('range');
    if (range) {
      const parsed = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      let valid = Boolean(parsed && (parsed[1] || parsed[2]) && size > 0);
      if (parsed && valid) {
        if (!parsed[1]) {
          const suffix = Number(parsed[2]);
          valid = Number.isSafeInteger(suffix) && suffix > 0;
          start = Math.max(0, size - suffix);
        } else {
          start = Number(parsed[1]);
          end = parsed[2] ? Math.min(Number(parsed[2]), size - 1) : size - 1;
        }
        valid =
          valid &&
          Number.isSafeInteger(start) &&
          Number.isSafeInteger(end) &&
          start >= 0 &&
          start < size &&
          end >= start;
      }
      if (!valid) {
        await handle.close();
        headers.set('Content-Range', `bytes */${size}`);
        headers.set('Content-Length', '0');
        return new Response(null, { status: 416, headers });
      }
      headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    headers.set('Content-Length', String(Math.max(0, end - start + 1)));
    const status = range ? 206 : 200;
    if (request.method === 'HEAD' || size === 0) {
      await handle.close();
      return new Response(null, { status, headers });
    }
    const stream = handle.createReadStream({ start, end, autoClose: true });
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers });
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}
