import type { MemoryConfigInternal } from '@mastra/core/memory';
import { useLocalStorageState } from '@mastra/playground-ui/hooks/use-local-storage-state';
import { z } from 'zod/v4';
import { useAccount } from '@/domains/account/account-context';

export const agentMemoryPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  workingMemory: z.boolean().optional(),
  observationalMemory: z.boolean().optional(),
  lastMessages: z.union([z.literal('auto'), z.number().int().min(0).max(10000)]).optional(),
});
export type AgentMemoryPreferences = z.infer<typeof agentMemoryPreferencesSchema>;

/** Agent-local choices; omitting a field preserves the server's memory configuration. */
export function useAgentMemoryPreferences(agentId: string) {
  const account = useAccount();
  return useLocalStorageState({
    initialKey: `mastra-memory-preferences-${account?.user.id ?? 'local'}-${agentId}`,
    defaultValue: {},
    schema: agentMemoryPreferencesSchema,
  });
}

export function resolveMemoryOptions(preferences: AgentMemoryPreferences): MemoryConfigInternal | undefined {
  if (preferences.enabled === false) {
    return {
      lastMessages: false,
      semanticRecall: false,
      workingMemory: { enabled: false },
      observationalMemory: false,
    };
  }
  const options: MemoryConfigInternal = {};
  if (preferences.workingMemory !== undefined) options.workingMemory = { enabled: preferences.workingMemory };
  if (preferences.observationalMemory !== undefined) options.observationalMemory = preferences.observationalMemory;
  if (typeof preferences.lastMessages === 'number') options.lastMessages = preferences.lastMessages || false;
  return Object.keys(options).length ? options : undefined;
}
