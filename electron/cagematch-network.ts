import { net, type Session } from 'electron';
import { isCagematchAddress } from './cagematch-request';

/** Chromium transport with explicit redirects, OS proxy support and bounded bodies. */
export function cagematchNetwork(browsing: Session): typeof fetch {
  return ((input: RequestInfo | URL, options: RequestInit = {}) =>
    new Promise<Response>((resolve, reject) => {
      const url = String(input);
      if (
        !isCagematchAddress(url) ||
        options.body ||
        (options.method && options.method !== 'GET')
      ) {
        reject(new Error('Only approved CAGEMATCH GET requests are supported.'));
        return;
      }
      const request = net.request({
        url,
        session: browsing,
        method: 'GET',
        redirect: 'manual',
        useSessionCookies: true,
      });
      let settled = false;
      const finish = (error?: Error, response?: Response) => {
        if (settled) return;
        settled = true;
        options.signal?.removeEventListener('abort', abort);
        if (error) reject(error);
        else resolve(response!);
      };
      const abort = () => {
        finish(new Error('net::ERR_TIMED_OUT'));
        request.abort();
      };
      if (options.signal?.aborted) {
        abort();
        return;
      }
      options.signal?.addEventListener('abort', abort, { once: true });
      new Headers(options.headers).forEach((value, key) => request.setHeader(key, value));
      const responseHeaders = (headers: Record<string, string | string[] | undefined>) => {
        const result = new Headers();
        for (const [name, values] of Object.entries(headers)) {
          if (values === undefined) continue;
          for (const value of Array.isArray(values) ? values : [values]) result.append(name, value);
        }
        return result;
      };
      request.on('redirect', (status, _method, location, headers) => {
        const result = responseHeaders(headers);
        result.set('location', location);
        finish(undefined, new Response(null, { status, headers: result }));
        request.abort();
      });
      request.on('response', (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        if (Number(response.headers['content-length']) > 2_000_000) {
          finish(new Error('CAGEMATCH response is too large.'));
          request.abort();
          return;
        }
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            finish(new Error('CAGEMATCH response is too large.'));
            request.abort();
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.on('error', (error: Error) => finish(error));
        response.on('end', () => {
          try {
            finish(
              undefined,
              new Response(
                [204, 205, 304].includes(response.statusCode)
                  ? null
                  : new Uint8Array(Buffer.concat(chunks)),
                { status: response.statusCode, headers: responseHeaders(response.headers) },
              ),
            );
          } catch (error) {
            finish(error instanceof Error ? error : new Error('Invalid CAGEMATCH response.'));
          }
        });
      });
      request.on('error', (error) => finish(error));
      request.end();
    })) as typeof fetch;
}
