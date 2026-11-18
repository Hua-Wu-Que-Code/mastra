import type { MemoryConfigInternal } from '@mastra/core/memory';
import { useServerPreference } from '@mastra/playground-ui/hooks/use-server-preference';
import { z } from 'zod/v4';
import { useAccount } from '@/domains/account/account-context';

export const agentMemoryPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  workingMemory: z.boolean().optional(),
  observationalMemory: z.boolean().optional(),
  lastMessages: z.union([z.literal('auto'), z.number().int().min(0).max(10000)]).optional(),
});
export type AgentMemoryPreferences = z.infer<typeof agentMemoryPreferencesSchema>;

// Legacy per-feature fields remain readable so existing master choices survive migration.
/** One account-scoped switch; enabled requests use the complete server memory policy. */
export function useAgentMemoryPreferences(agentId: string) {
  const account = useAccount();
  const preference = useServerPreference({
    kind: 'memory',
    id: agentId,
    accountId: account?.user.id,
    legacyKey: account ? `mastra-memory-preferences-${account.user.id}-${agentId}` : undefined,
    defaultValue: {},
    schema: agentMemoryPreferencesSchema.pick({ enabled: true }),
  });
  return [preference.value, preference.setValue, preference] as const;
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
  // Retired per-feature overrides must not silently disable memory after their controls are removed.
  return undefined;
}
