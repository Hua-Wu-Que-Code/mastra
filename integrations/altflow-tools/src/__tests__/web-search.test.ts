import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createDeepSeekSearchProvider } from '../web-search/deepseek-provider';
import { createTavilyProvider } from '../web-search/tavily-provider';
import { createWebSearchTool, webSearchInputSchema } from '../web-search/tool';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>(r => server.close(() => r()));
  }
});
async function serverFor(handler: Parameters<typeof createServer>[0]) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/search`;
}

describe('web_search over real HTTP', () => {
  it('bounds concurrency, deduplicates URLs in query order, truncates sources and reports partial failure', async () => {
    let active = 0,
      peak = 0,
      requests = 0;
    const baseURL = await serverFor(async (req, res) => {
      requests++;
      active++;
      peak = Math.max(peak, active);
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const { query, search_depth } = JSON.parse(Buffer.concat(chunks).toString());
      expect(search_depth).toBe('basic');
      expect(req.headers.authorization).toBe('Bearer search-test-key');
      await new Promise(r => setTimeout(r, 10));
      active--;
      if (query === 'failed') {
        res.writeHead(503).end('{}');
        return;
      }
      res.end(
        JSON.stringify({
          results: [
            { title: query, url: 'https://example.com/common#fragment', content: 'x'.repeat(1000) },
            ...Array.from({ length: 12 }, (_, n) => ({
              title: `${query}-${n}`,
              url: `https://example.com/${query}/${n}`,
              content: 'source',
            })),
          ],
        }),
      );
    });
    const tool = createWebSearchTool({ provider: createTavilyProvider({ apiKey: 'search-test-key', baseURL }) });
    const result = await tool.execute!({ queries: ['first', 'second', 'failed', 'fourth', 'first'] }, {});
    expect(requests).toBe(4);
    expect(peak).toBe(3);
    expect(result).toMatchObject({ truncated: true, failures: [{ query: 'failed', code: 'SEARCH_HTTP_503' }] });
    if (!('results' in result)) throw new Error('Expected search output');
    expect(result.results).toHaveLength(10);
    expect(result.results[0]).toMatchObject({
      title: 'first',
      url: 'https://example.com/common',
      snippet: 'x'.repeat(800),
    });
  });
  it('distinguishes zero results from all requests failing', async () => {
    const baseURL = await serverFor(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (JSON.parse(Buffer.concat(chunks).toString()).query === 'empty') res.end('{"results":[]}');
      else res.writeHead(401).end('{}');
    });
    const tool = createWebSearchTool({ provider: createTavilyProvider({ apiKey: 'test', baseURL }) });
    expect(await tool.execute!({ queries: ['empty'] }, {})).toMatchObject({ results: [], truncated: false });
    await expect(tool.execute!({ queries: ['failed'] }, {})).rejects.toMatchObject({ code: 'SEARCH_ALL_FAILED' });
  });
  it('cancels the actual network request and does not follow credential redirects', async () => {
    let requests = 0;
    const baseURL = await serverFor((req, res) => {
      requests++;
      if (req.url === '/search') {
        res.writeHead(302, { Location: '/credential-leak' }).end();
      }
    });
    const redirect = createWebSearchTool({
      provider: createTavilyProvider({ apiKey: 'test', baseURL }),
      timeoutMs: 100,
    });
    await expect(redirect.execute!({ queries: ['redirect'] }, {})).rejects.toMatchObject({ code: 'SEARCH_ALL_FAILED' });
    expect(requests).toBe(1);
    const hanging = await serverFor(() => {});
    const controller = new AbortController();
    const tool = createWebSearchTool({ provider: createTavilyProvider({ apiKey: 'test', baseURL: hanging }) });
    const call = tool.execute!({ queries: ['cancel'] }, { abortSignal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    await expect(call).rejects.toMatchObject({ code: 'SEARCH_ABORTED' });
  });
  it('maps the DeepSeek response without changing model input', async () => {
    const baseURL = await serverFor((_req, res) =>
      res.end(
        JSON.stringify({
          results: [
            { title: 'DeepSeek', url: 'https://example.com', snippet: 'short', summary: 'detail', date: '2026-11-18' },
          ],
        }),
      ),
    );
    const tool = createWebSearchTool({
      provider: createDeepSeekSearchProvider({ apiKey: 'separate-search-key', baseURL }),
    });
    expect(await tool.execute!({ queries: ['topic'] }, {})).toMatchObject({
      results: [{ snippet: 'detail', publishedAt: '2026-11-18' }],
    });
    expect(webSearchInputSchema.safeParse({ queries: [' '], resourceId: 'other' }).success).toBe(false);
    expect(webSearchInputSchema.safeParse({ queries: Array(11).fill('x') }).success).toBe(false);
  });
});
