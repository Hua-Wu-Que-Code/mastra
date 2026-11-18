import { z } from 'zod/v4';
import { searchEndpoint, searchPost } from './http';
import type { WebSearchProvider } from './provider';

const responseSchema = z.object({
  answer: z.string().nullish(),
  results: z.array(
    z.object({ title: z.string(), url: z.string(), content: z.string(), published_date: z.string().nullish() }),
  ),
});

/** Uses Tavily's HTTP contract so aborts cancel the underlying request. */
export function createTavilyProvider(options: { apiKey: string; baseURL?: string }): WebSearchProvider {
  const url = searchEndpoint(options.baseURL ?? 'https://api.tavily.com/search');
  return {
    async search(query, { signal }) {
      const data = responseSchema.parse(
        await searchPost(
          url,
          options.apiKey,
          {
            query,
            search_depth: 'basic',
            max_results: 10,
            include_answer: false,
          },
          signal,
        ),
      );
      return {
        ...(data.answer ? { answer: data.answer } : {}),
        results: data.results.map(item => ({
          title: item.title,
          url: item.url,
          snippet: item.content,
          ...(item.published_date ? { publishedAt: item.published_date } : {}),
        })),
      };
    },
  };
}
