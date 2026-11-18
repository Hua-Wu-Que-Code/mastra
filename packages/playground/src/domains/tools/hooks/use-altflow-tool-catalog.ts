import { MastraClientError } from '@mastra/client-js';
import { useMastraClient } from '@mastra/react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

export const toolCatalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.string(),
  status: z.enum(['available', 'unconfigured', 'conditional']),
  reason: z.string().optional(),
  agents: z.array(z.string()),
  runtime: z.boolean(),
});
const catalogSchema = z.object({ entries: z.array(toolCatalogEntrySchema) });
export type ToolCatalogEntry = z.infer<typeof toolCatalogEntrySchema>;

export function useAltflowToolCatalog() {
  const client = useMastraClient();
  return useQuery({
    queryKey: ['altflow-tool-catalog', client.options.baseUrl],
    queryFn: async ({ signal }) => {
      // Application routes live outside the configurable Mastra API prefix, like /storage.
      const fetcher = client.options.fetch ?? fetch;
      const response = await fetcher(`${client.options.baseUrl.replace(/\/$/, '')}/altflow/tools/catalog`, {
        credentials: 'include',
        cache: 'no-store',
        redirect: 'error',
        signal,
        headers: client.options.headers,
      });
      // Standard Mastra deployments do not have this optional capability.
      if (response.status === 404) return null;
      if (!response.ok)
        throw new MastraClientError(
          response.status,
          response.statusText,
          `Tool catalog request failed (${response.status})`,
        );
      return catalogSchema.parse(await response.json()).entries;
    },
    retry: false,
  });
}
