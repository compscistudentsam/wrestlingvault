import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import type { Session } from 'electron';
import { publicImageURL } from './google-images';

export function publicAddress(address: string) {
  if (isIP(address) === 6)
    return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function downloadImage(session: Session, initial: string) {
  let url = initial;
  const signal = AbortSignal.timeout(12000);
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!publicImageURL(url)) throw new Error('Invalid image address.');
    const addresses = await lookup(new URL(url).hostname, { all: true });
    if (!addresses.length || addresses.some((entry) => !publicAddress(entry.address)))
      throw new Error('Image address is not public.');
    const response = await session.fetch(url, { redirect: 'manual', credentials: 'omit', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Invalid image redirect.');
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok || !response.body) throw new Error('Could not download image.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        if (size > 8_388_608) throw new Error('Image exceeds 8 MB.');
        chunks.push(next.value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Too many image redirects.');
}
