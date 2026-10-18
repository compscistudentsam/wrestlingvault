export async function readLimited(response: Response, max: number) {
  if (Number(response.headers.get('content-length')) > max)
    throw new Error('Download is too large.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new Error('Download is too large.');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  return Buffer.concat(chunks);
}
export class GitHubError extends Error {
  constructor(public status: number) {
    super(
      status === 401 || status === 403
        ? 'GitHub refused access. Reconnect with a token that has Contents: Read and write for this repository.'
        : status === 404
          ? 'GitHub repository or branch was not found. Check your token has access.'
          : status === 409 || status === 422
            ? 'The repository changed during sync. Retrying will merge the latest additions.'
            : `GitHub sync failed (${status}). Retry when you are online.`,
    );
  }
}
