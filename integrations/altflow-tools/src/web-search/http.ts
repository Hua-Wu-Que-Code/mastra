import { AltflowToolError } from '../policy';

export function searchEndpoint(baseURL: string): URL {
  const url = new URL(baseURL);
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
  ) {
    throw new AltflowToolError('INVALID_SEARCH_ENDPOINT', 'Search endpoints require HTTPS.');
  }
  return url;
}

export async function searchPost(url: URL, apiKey: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new AltflowToolError(`SEARCH_HTTP_${response.status}`, 'The search provider rejected the request.');
  // Bound the transport as well as the final model output.
  const reader = response.body?.getReader();
  if (!reader) throw new AltflowToolError('INVALID_SEARCH_RESPONSE', 'The search provider returned no body.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000)
        throw new AltflowToolError('SEARCH_RESPONSE_TOO_LARGE', 'The search response exceeded its size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
