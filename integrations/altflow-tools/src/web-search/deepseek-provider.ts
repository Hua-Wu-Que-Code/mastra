import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod/v4';
import { searchEndpoint, searchPost } from './http';
import type { WebSearchProvider } from './provider';

// Response mapping follows DeepSeek Harness web/web-deepseek-api (MIT; see notices).
const responseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
      summary: z.string().nullish(),
      date: z.string().nullish(),
    }),
  ),
});

export function createDeepSeekSearchProvider(options: { apiKey: string; baseURL?: string }): WebSearchProvider {
  const url = searchEndpoint(options.baseURL ?? 'https://api.deepseek.com/v1/tools/search');
  const starts: number[] = [];
  return {
    async search(query, { signal }) {
      // Shared by all queries/calls using this provider: DeepSeek permits 5 starts per second.
      for (;;) {
        signal.throwIfAborted();
        const now = performance.now();
        while (starts.length && starts[0]! <= now - 1000) starts.shift();
        if (starts.length < 5) {
          starts.push(now);
          break;
        }
        await delay(Math.max(1, starts[0]! + 1001 - now), undefined, { signal });
      }
      const data = responseSchema.parse(
        await searchPost(
          url,
          options.apiKey,
          { query, count: 10, need_content: false, ori_question: query.slice(0, 128) },
          signal,
        ),
      );
      return {
        results: data.results.map(item => ({
          title: item.title,
          url: item.url,
          snippet: item.summary || item.snippet,
          ...(item.date ? { publishedAt: item.date } : {}),
        })),
      };
    },
  };
}
