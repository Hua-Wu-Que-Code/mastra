import { useServerPreference } from '@mastra/playground-ui/hooks/use-server-preference';
import { threadPreferencesSchema } from '../context/thread-preferences';
import { resolveChatSettings } from '../utils/chat-settings';
export { defaultSettings } from '../utils/chat-settings';
import { useAccount } from '@/domains/account/account-context';
import type { AgentSettingsType as AgentSettings } from '@/types';

export interface AgentSettingsStateProps {
  agentId: string;
  defaultSettings?: AgentSettings;
}

export function useAgentSettingsState({ agentId, defaultSettings }: AgentSettingsStateProps) {
  const account = useAccount();
  const { value: preferences, setValue: setPreferences } = useServerPreference({
    kind: 'agent',
    id: agentId,
    accountId: account?.user.id,
    defaultValue: {},
    schema: threadPreferencesSchema,
  });
  return {
    settings: resolveChatSettings(
      defaultSettings,
      preferences.modelSettings ? { modelSettings: preferences.modelSettings } : undefined,
    ),
    setSettings: (settings: AgentSettings) => setPreferences({ modelSettings: settings.modelSettings }),
    resetAll: () => setPreferences({}),
  };
}
