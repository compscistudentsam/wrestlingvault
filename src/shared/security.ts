const allowedHosts = new Set([
  'www.iwnerd.com',
  'iwnerd.com',
  'wrestlepurists.com',
  'en.wikipedia.org',
  'www.google.com',
  'www.cagematch.net',
  'github.com',
]);

/** Only the sample dataset's public reference sites are available to the renderer. */
export function validateExternalURL(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid reference URL.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid reference URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !allowedHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error('This reference destination is not allowed.');
  }
  if (
    url.hostname === 'www.google.com' &&
    (url.pathname !== '/search' || !url.searchParams.get('q'))
  )
    throw new Error('Only Google search links are allowed.');
  if (
    url.hostname === 'github.com' &&
    (url.pathname !== '/settings/personal-access-tokens/new' || url.search || url.hash)
  )
    throw new Error('Only the GitHub token setup page is allowed.');
  return url.href;
}

export function isTrustedRendererURL(value: string, appURL: string): boolean {
  try {
    const candidate = new URL(value);
    const trusted = new URL(appURL);
    candidate.hash = '';
    trusted.hash = '';
    return candidate.href === trusted.href;
  } catch {
    return false;
  }
}
