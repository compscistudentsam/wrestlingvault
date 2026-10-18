export class CagematchBrowserRequired extends Error {}
const hosts = new Set(['www.cagematch.net', 'cagematch.net']);
export function isCagematchAddress(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' && hosts.has(u.hostname) && !u.username && !u.password && !u.port
    );
  } catch {
    return false;
  }
}
/** Follow ordinary site redirects without permitting arbitrary hosts or HTTPS downgrades. */
export async function requestCagematch(url: string, options: RequestInit, get: typeof fetch) {
  let current = url;
  const visited = new Set<string>();
  for (let hop = 0; hop <= 3; hop++) {
    if (!isCagematchAddress(current))
      throw new Error('CAGEMATCH redirected outside its approved HTTPS addresses.');
    if (visited.has(current))
      throw new CagematchBrowserRequired(
        'CAGEMATCH repeated a redirect. Continue in the in-app browser, then choose Import match details.',
      );
    visited.add(current);
    const response = await get(current, { ...options, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location)
      throw new CagematchBrowserRequired(
        'CAGEMATCH returned a redirect without a destination. Continue in the in-app browser.',
      );
    const next = new URL(location, current).href;
    if (!isCagematchAddress(next))
      throw new Error('CAGEMATCH redirected outside its approved HTTPS addresses.');
    if (hop === 3)
      throw new CagematchBrowserRequired(
        'CAGEMATCH repeated redirects. Continue in the in-app browser, then choose Import match details.',
      );
    current = next;
  }
  throw new Error('CAGEMATCH redirect limit reached.');
}
export function cagematchConnectionError(error: unknown) {
  const e = error as { code?: unknown; cause?: { code?: unknown }; message?: unknown };
  const candidate = e?.cause?.code ?? e?.code;
  const nativeCode =
    typeof e?.message === 'string' ? e.message.match(/\bnet::(ERR_[A-Z_]+)\b/)?.[1] : null;
  const code =
    typeof candidate === 'string' && /^[A-Z_0-9]{2,60}$/.test(candidate) ? candidate : nativeCode;
  if (error instanceof Error && /^CAGEMATCH (redirected|returned)/.test(error.message))
    return error.message;
  if (code && /CERT|SSL|TLS|VERIFY/.test(code))
    return `CAGEMATCH's secure connection could not be verified (${code}). Check your computer's date and HTTPS/proxy settings.`;
  if (code && /TIMEDOUT|TIMEOUT|ABORT/.test(code))
    return `CAGEMATCH did not respond in time (${code}). Please try again later.`;
  return `Could not connect to CAGEMATCH${code ? ` (${code})` : ''}. Check your connection and system proxy settings, or open the match in your browser.`;
}
