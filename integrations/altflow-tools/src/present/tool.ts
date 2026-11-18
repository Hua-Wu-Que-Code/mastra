import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v4';
import { toolIdentity } from '../policy';
import type { DeliveryService } from './service';

const inputSchema = z
  .object({
    files: z
      .array(z.object({ path: z.string().min(1).max(2048), description: z.string().max(1000).optional() }).strict())
      .min(1)
      .max(8),
  })
  .strict();
export function createPresentTool(options: { service: DeliveryService }) {
  return createTool({
    id: 'present',
    description:
      'Present up to 8 existing files from your private workspace as downloadable deliverables. Write files first. This references current files without copying them; deleted files become unavailable.',
    inputSchema,
    outputSchema: z.object({
      files: z.array(
        z.object({
          path: z.string(),
          name: z.string(),
          size: z.number(),
          mimeType: z.string(),
          downloadUrl: z.string(),
          description: z.string().optional(),
        }),
      ),
    }),
    execute: async (input, context) => ({
      files: await options.service.present(toolIdentity(context), inputSchema.parse(input).files),
    }),
  });
}
