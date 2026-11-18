import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v4';
import { toolIdentity } from '../policy';
import type { SessionSearchService } from './service';

const inputSchema = z
  .object({ query: z.string().trim().min(1).max(500), limit: z.number().int().min(1).max(20).default(10) })
  .strict();
export function createSessionSearchTool(options: { service: SessionSearchService }) {
  return createTool({
    id: 'session_search',
    description:
      'Find literal text in your saved conversations, including older conversations without observation indexes. Searches user/assistant text, not reasoning or tool payloads. Returns one recent matching message per thread. Use recall to read an authorized conversation after finding its threadId.',
    inputSchema,
    outputSchema: z.object({
      results: z.array(
        z.object({
          threadId: z.string(),
          title: z.string(),
          messageId: z.string(),
          snippet: z.string(),
          createdAt: z.string(),
        }),
      ),
      truncated: z.boolean(),
    }),
    execute: async (input, context) => {
      const identity = toolIdentity(context);
      return options.service.search({
        ...inputSchema.parse(input),
        resourceId: identity.resourceId,
        signal: context?.abortSignal,
      });
    },
  });
}
