import type { MemoryConfigInternal } from '@mastra/core/memory';
import { HistoryMemory } from './history-memory';

/** A persisted opt-out must also apply to direct API calls and override caller-supplied recall options. */
export class DisabledRecallMemory extends HistoryMemory {
  override getMergedThreadConfig(config?: MemoryConfigInternal): MemoryConfigInternal {
    return {
      ...super.getMergedThreadConfig(config),
      lastMessages: false,
      semanticRecall: false,
      workingMemory: { enabled: false },
      observationalMemory: false,
    };
  }
}
