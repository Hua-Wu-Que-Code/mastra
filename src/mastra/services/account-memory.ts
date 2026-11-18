import type { MastraMemory } from '@mastra/core/memory';
import type { AccountPreferences } from './account-preferences';

export function accountMemory(preferences: AccountPreferences, enabled: MastraMemory, disabled: MastraMemory) {
  return async ({ user }: { user?: { id: string } | null }) => {
    if (!user?.id) return enabled;
    const saved = await preferences.read(user.id, '', { kind: 'memory', id: 'creator-agent' });
    return saved.value.enabled === false ? disabled : enabled;
  };
}
