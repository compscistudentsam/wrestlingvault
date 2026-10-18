/** Electron decorates invoke rejections with an internal channel name. Keep UI messages human. */
export function userError(error: unknown) {
  const message = error instanceof Error ? error.message : 'The request failed. Please try again.';
  return message.replace(/^Error invoking remote method '[^']+':\s*/, '').replace(/^Error:\s*/, '');
}
