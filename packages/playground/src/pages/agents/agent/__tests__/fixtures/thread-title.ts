import type { GetMemoryConfigResponse } from '@mastra/client-js';
import type { DataChunkType } from '@mastra/core/stream';

export const titleMemoryConfig: GetMemoryConfigResponse = {
  config: { generateTitle: { instructions: 'Use a short title', minMessages: 2 } },
};

export const generatedTitleChunk: DataChunkType = {
  type: 'data-thread-title',
  data: { threadId: 'thread-1', title: 'Carbonara tips' },
  transient: true,
};
