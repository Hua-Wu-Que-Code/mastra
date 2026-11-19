import type { MemoryConfigInternal } from '@mastra/core/memory';

/** Load the full transcript so ContextCompaction owns the provider's history budget. */
export const CONTEXT_MEMORY_OPTIONS = {
  lastMessages: Number.MAX_SAFE_INTEGER,
  observationalMemory: false,
} satisfies Pick<MemoryConfigInternal, 'lastMessages' | 'observationalMemory'>;
