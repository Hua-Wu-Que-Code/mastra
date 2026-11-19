import { Memory } from '@mastra/memory';
import type { MemoryConfigInternal } from '@mastra/core/memory';

/** Expose native history browsing without re-enabling observation-based context compaction. */
export class HistoryMemory extends Memory {
  override listTools(config?: MemoryConfigInternal) {
    const tools = super.listTools(config);
    if (config?.lastMessages === false) return tools;
    const browsing = super.listTools({ ...config, observationalMemory: { retrieval: { scope: 'resource' } } });
    if (browsing.recall) tools.recall = browsing.recall;
    return tools;
  }
}
