import { useLocalStorageState } from '@mastra/playground-ui/hooks/use-local-storage-state';
import { threadPreferencesSchema, serializeThreadPreferences } from '../context/thread-preferences';
import { resolveChatSettings } from '../utils/chat-settings';
export { defaultSettings } from '../utils/chat-settings';
import type { AgentSettingsType as AgentSettings } from '@/types';

export interface AgentSettingsStateProps {
  agentId: string;
  defaultSettings?: AgentSettings;
}

export function useAgentSettingsState({ agentId, defaultSettings }: AgentSettingsStateProps) {
  const [preferences, setPreferences] = useLocalStorageState({
    initialKey: `mastra-agent-store-${agentId}`,
    defaultValue: {},
    schema: threadPreferencesSchema,
    serialize: serializeThreadPreferences,
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
